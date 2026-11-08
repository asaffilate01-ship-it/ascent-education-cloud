import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {
 AlertDialog,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,
 AlertDialogFooter,AlertDialogHeader,AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {useAuth} from '@/contexts/AuthContext';
import {canUseActiveRole} from '@/lib/roleMembership';
import {supabase} from '@/integrations/supabase/client';
import AddStaffModal from '@/components/modals/AddStaffModal';
import {
 CAPABILITY_KEYS,STAFF_CAPABILITIES,STAFF_DEFAULTS,effectiveStaffPermissions,parseCapabilityOverrides,
 staffRoleValid,UNIPATHWAY_SIGN_IN,type StaffRole,type StaffCapability,type CapabilityEffect
} from '@/lib/staffPermissionProfiles';

type Overrides=Partial<Record<StaffCapability,CapabilityEffect>>;
type Person={id:string;name:string|null;email:string|null;role:StaffRole};
type Centre={id:string;name:string};
type Access={userId:string;centreId:string;role:StaffRole;overrides:Overrides;revision:number};
type Review={person:Person;centreId:string;current:Access;overrides:Overrides};
type ReadState='idle'|'loading'|'ready'|'error';
type StaffRpcName='get_unipathway_staff_directory_for_manager'|'get_unipathway_staff_access'|'set_unipathway_staff_access';
const staffRpc=supabase.rpc.bind(supabase) as unknown as
 (name:StaffRpcName,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>;
const enabled=import.meta.env.VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED==='true';
const inviteEnabled=import.meta.env.VITE_UNIPATHWAY_STAFF_INVITES_ENABLED==='true';
const roleLabels:Record<StaffRole,string>={office_admin:'Office Administrator',hr_officer:'HR Officer',secretary:'Secretary'};
const personKey=(person:Person)=>person.id+':'+person.role;
const personName=(person:Person)=>person.name||person.email||person.id;
const sameOverrides=(left:Overrides,right:Overrides)=>CAPABILITY_KEYS.every(key=>left[key]===right[key]);
const matchesAccess=(access:Access|null,person:Person|undefined,tenant:string):access is Access=>
 !!access&&!!person&&access.userId===person.id&&access.role===person.role&&access.centreId===tenant;
function verifiedAccess(value:unknown,person:Person,tenant:string):Access{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid permission receipt');
 const data=value as Partial<Access>;
 if(data.userId!==person.id||data.role!==person.role||data.centreId!==tenant||
   typeof data.revision!=='number'||!Number.isSafeInteger(data.revision)||data.revision<0)
  throw Error('Permission identity or revision did not match');
 return {userId:person.id,centreId:tenant,role:person.role,revision:data.revision,
  overrides:parseCapabilityOverrides(data.overrides)};
}
function definiteRejection(error:unknown){
 const code=(error as {code?:unknown}|null)?.code;
 return typeof code==='string'&&['42501','22023','23502','23503','23505','23514'].includes(code);
}
const settingLabel=(value:CapabilityEffect|undefined)=>value==='allow'?'Extra permission':value==='deny'?'Less access':'Role default';
const actionClass='h-auto min-h-11 max-w-full whitespace-normal py-3 text-center';

export default function StaffAccessManager(){
 const {user,loading}=useAuth();
 const scope=[user?.id,user?.tenantId,user?.role,user?.roles?.join(','),!!loading].join(':');
 const currentScope=useRef(scope);currentScope.current=scope;
 return <Workspace key={scope} isScopeCurrent={()=>currentScope.current===scope}/>;
}
function Workspace({isScopeCurrent}:{isScopeCurrent:()=>boolean}){
 const {user,loading:authLoading}=useAuth();
 const manager=!authLoading&&!!user&&canUseActiveRole(user,['centre_director','superadmin']);
 const platform=user?.role==='superadmin';
 const [centres,setCentres]=useState<Centre[]>([]),[centreState,setCentreState]=useState<ReadState>('idle');
 const [centreRevision,setCentreRevision]=useState(0),[centreError,setCentreError]=useState('');
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const [directory,setDirectory]=useState<Person[]>([]),[directoryState,setDirectoryState]=useState<ReadState>('idle');
 const [directoryRevision,setDirectoryRevision]=useState(0),[directoryError,setDirectoryError]=useState('');
 const [selection,setSelection]=useState(''),[current,setCurrent]=useState<Access|null>(null);
 const [accessState,setAccessState]=useState<ReadState>('idle'),[accessError,setAccessError]=useState('');
 const [overrides,setOverrides]=useState<Overrides>({}),[needsRead,setNeedsRead]=useState(false),[draftKept,setDraftKept]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 const [review,setReview]=useState<Review|null>(null),[openInvite,setOpenInvite]=useState(false);
 const mounted=useRef(false),operation=useRef(false);
 const scopeLease=useRef(isScopeCurrent);scopeLease.current=isScopeCurrent;
 const scopeActive=useCallback(()=>mounted.current&&scopeLease.current(),[]);
 const centresGeneration=useRef(0),directoryGeneration=useRef(0),accessGeneration=useRef(0);
 const scope=useRef({tenant,selection,manager});
 scope.current={tenant,selection,manager};
 const reviewOpener=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{
  const centreReads=centresGeneration,directoryReads=directoryGeneration,accessReads=accessGeneration;
  mounted.current=true;
  return()=>{mounted.current=false;centreReads.current++;directoryReads.current++;accessReads.current++;};
 },[]);

 useEffect(()=>{
  const reads=centresGeneration;
  const token=++centresGeneration.current;
  const active=()=>scopeActive()&&token===centresGeneration.current&&scope.current.manager;
  setCentres([]);setCentreError('');setCentreState('idle');
  if(!enabled||!manager||!platform)return;
  setCentreState('loading');
  void(async()=>{
   try{
    const {data,error:e}=await supabase.from('tenants').select('id,name').order('name').order('id').limit(100);
    if(!active())return;
    if(e||!Array.isArray(data)||data.some(c=>!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string')||
      new Set(data.map(c=>c.id)).size!==data.length)throw Error('Invalid centre directory');
    setCentres(data);setCentreState('ready');
   }catch{
    if(active()){setCentreError('The centre list could not be verified. Retry before selecting a centre.');setCentreState('error');}
   }
  })();
  return()=>{reads.current++;};
 },[manager,platform,centreRevision,scopeActive]);
 const centreReady=!!tenant&&(!platform||(centreState==='ready'&&centres.some(c=>c.id===tenant)));
 useEffect(()=>{
  const directoryReads=directoryGeneration,accessReads=accessGeneration;
  const token=++directoryGeneration.current;
  accessGeneration.current++;scope.current.selection='';
  setDirectory([]);setDirectoryState('idle');setDirectoryError('');setSelection('');
  setCurrent(null);setOverrides({});setAccessState('idle');setAccessError('');
  setNeedsRead(false);setDraftKept(false);setError('');setNote('');setReview(null);setOpenInvite(false);
  if(!enabled||!manager||!centreReady)return;
  const active=()=>scopeActive()&&token===directoryGeneration.current&&scope.current.manager&&scope.current.tenant===tenant;
  setDirectoryState('loading');
  void(async()=>{
   try{
    const {data,error:e}=await staffRpc('get_unipathway_staff_directory_for_manager',{p_tenant:tenant});
    if(!active())return;
    if(e||!Array.isArray(data)||data.some((p:Person)=>!p||typeof p.id!=='string'||!p.id||!staffRoleValid(p.role)||
      (p.name!==null&&typeof p.name!=='string')||(p.email!==null&&typeof p.email!=='string'))||
      new Set(data.map(personKey)).size!==data.length)throw Error('Invalid staff directory');
    setDirectory(data);setDirectoryState('ready');
   }catch{
    if(active()){setDirectoryError('Authorised office-staff records are unavailable. No permission changes are possible.');setDirectoryState('error');}
   }
  })();
  return()=>{directoryReads.current++;accessReads.current++;};
 },[manager,tenant,centreReady,directoryRevision,scopeActive]);

 function clearSelection(){
  accessGeneration.current++;scope.current.selection='';
  setSelection('');setCurrent(null);setOverrides({});setAccessState('idle');setAccessError('');
  setNeedsRead(false);setDraftKept(false);setError('');setNote('');setReview(null);
 }
 function changeCentre(value:string){
  if(operation.current||review||!manager||!platform)return;
  if(value&&!centres.some(c=>c.id===value))return;
  directoryGeneration.current++;scope.current.tenant=value;clearSelection();
  setDirectory([]);setDirectoryState('idle');setTenant(value);setOpenInvite(false);
 }
 function refreshDirectory(){
  if(operation.current||review)return;
  directoryGeneration.current++;clearSelection();setDirectory([]);setDirectoryState('loading');
  setDirectoryRevision(value=>value+1);
 }
 async function readAccess(person:Person,preserveDraft=false){
  const key=personKey(person);
  if(operation.current||!scopeActive()||!manager||!enabled||!centreReady||directoryState!=='ready'||
    scope.current.tenant!==tenant||scope.current.selection!==key)return;
  const token=++accessGeneration.current,draft={...overrides};
  const active=()=>scopeActive()&&token===accessGeneration.current&&scope.current.manager&&
   scope.current.tenant===tenant&&scope.current.selection===key;
  setCurrent(null);setAccessState('loading');setAccessError('');setError('');setNote('');setReview(null);
  setNeedsRead(true);setDraftKept(preserveDraft);
  if(!preserveDraft)setOverrides({});
  try{
   const {data,error:e}=await staffRpc('get_unipathway_staff_access',{p_target:person.id,p_role:person.role});
   if(!active())return;
   if(e)throw e;
   const verified=verifiedAccess(data,person,tenant);
   setCurrent(verified);setOverrides(preserveDraft?draft:verified.overrides);setNeedsRead(false);setAccessState('ready');
   const retained=preserveDraft&&!sameOverrides(draft,verified.overrides);setDraftKept(retained);
   if(preserveDraft)setNote(retained?'Latest permissions verified. Your unsent draft is kept for review.':
    'Latest permissions verified. The reviewed permission values are already recorded.');
  }catch{
   if(active()){setAccessError('This staff member’s permission record could not be verified. Retry this record before changing access.');setAccessState('error');}
  }
 }
 function choose(value:string){
  if(operation.current||review||!manager||!enabled||directoryState!=='ready')return;
  clearSelection();
  if(!value)return;
  const target=directory.find(p=>personKey(p)===value);
  if(!target)return;
  scope.current.selection=value;setSelection(value);void readAccess(target);
 }
 const person=directory.find(p=>personKey(p)===selection);
 const verified=matchesAccess(current,person,tenant);
 const choices=verified&&person?effectiveStaffPermissions(person.role,overrides):[];
 const dirty=verified&&!sameOverrides(current.overrides,overrides);
 const centreName=centres.find(c=>c.id===tenant)?.name||tenant;
 function prepareReview(event:React.FormEvent){
  event.preventDefault();
  if(operation.current||review||!scopeActive()||!manager||!enabled||needsRead||accessState!=='ready'||
    !matchesAccess(current,person,tenant)||!person||person.id===user?.id||!dirty)return;
  setError('');setNote('');
  setReview({person:{...person},centreId:tenant,current:{...current,overrides:{...current.overrides}},
   overrides:parseCapabilityOverrides(overrides)});
 }
 async function applyReview(){
  if(operation.current||!review||!scopeActive()||!manager||!enabled||needsRead||accessState!=='ready'||
    !matchesAccess(current,person,tenant)||!person||person.id===user?.id||
    !matchesAccess(review.current,person,tenant)||review.centreId!==tenant||
    review.current.revision!==current.revision||!sameOverrides(review.overrides,overrides))return;
  const reviewed=review,target=review.person,token=accessGeneration.current;
  const active=()=>scopeActive()&&token===accessGeneration.current&&scope.current.manager&&
   scope.current.tenant===reviewed.centreId&&scope.current.selection===personKey(target);
  operation.current=true;setBusy(true);setError('');setNote('');
  try{
   const current=reviewed.current;
   const {data,error:e}=await staffRpc('set_unipathway_staff_access',{
    p_target:target.id,p_role:target.role,p_expected_revision:current.revision,p_overrides:reviewed.overrides
   });
   if(!active())return;
   if(e){
    setDraftKept(true);
    if(definiteRejection(e)){
     setError('The server rejected these permission changes. Your draft is kept. Check your access and review the changes before retrying.');
     return;
    }
    throw e;
   }
   const receipt=verifiedAccess(data,target,reviewed.centreId);
   if(receipt.revision!==current.revision+1||!sameOverrides(receipt.overrides,reviewed.overrides))
    throw Error('The returned permission changes did not match the review');
   setCurrent(receipt);setOverrides(receipt.overrides);setDraftKept(false);setNeedsRead(false);setReview(null);
   setNote('Personal permissions updated in the verified centre audit for '+personName(target)+'. The staff member may need to refresh their session.');
  }catch{
   if(active()){
    setNeedsRead(true);setDraftKept(true);
    setError('Permission changes could not be confirmed. Your draft is kept. Recheck this staff member before applying any changes again.');
   }
  }finally{
   operation.current=false;
   if(active())setBusy(false);
  }
 }
 const frozen=busy||!!review;
 return <DashboardLayout title="Office roles & personal permissions" subtitle="Centre director approval, least-privilege defaults, per-person overrides">
  <div className="min-w-0 space-y-5 text-sm [overflow-wrap:anywhere]">
   {authLoading?<p role="status">Verifying your active management role…</p>:
    !manager?<p role="alert" className="rounded-xl border p-5">Only an active, verified Centre Director or Platform Owner can review individual permission changes.</p>:
    !enabled?<section role="status" className="space-y-3 rounded-xl border bg-card p-6 max-sm:px-[16px]">
     <h2 className="text-lg font-semibold">Office access activation pending</h2>
     <p>Per-person capability changes require the reviewed UniPathway role enum, centre-isolated access tables and audit RPCs. Checkboxes cannot grant access until those changes are applied and tested with real centre accounts. No staff records have been changed.</p>
     <p>Staff sign in at <a className="underline" href={UNIPATHWAY_SIGN_IN}>unipathway.pk/login</a>. Existing development email addresses are not automatically renamed.</p>
     <Link className="inline-flex min-h-11 max-w-full items-center rounded-lg border px-4 py-3" to={platform?'/landlord/centres':'/director/staff'}>Return to staff management</Link>
    </section>:<>
     <section className="min-w-0 space-y-3 rounded-xl border bg-card p-5 max-sm:px-[16px]">
      <h2 className="text-lg font-semibold">Centre and staff identity</h2>
      <p className="text-muted-foreground">The Platform Owner may select a centre. Centre directors review their own centre. Each change is checked against the selected person, office role and last verified revision.</p>
      {platform&&<>
       <label className="block min-w-0 max-w-md font-medium">Centre
        <select className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3" value={tenant}
         disabled={frozen||centreState!=='ready'} onChange={e=>changeCentre(e.target.value)}>
         <option value="">Choose a centre</option>{centres.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
       </label>
       {centreState==='loading'&&<p role="status">Verifying available centres…</p>}
       {centreError&&<div role="alert" className="space-y-3"><p>{centreError}</p><Button className={actionClass} variant="outline" disabled={frozen} onClick={()=>setCentreRevision(value=>value+1)}>Retry centre list</Button></div>}
       {centreState==='ready'&&!centres.length&&<p>No authorised centres were returned.</p>}
       {centreState==='ready'&&centres.length===100&&<p className="text-muted-foreground">Showing the first 100 authorised centres by name.</p>}
       {centreState==='ready'&&tenant&&!centreReady&&<p role="alert">The selected centre is not in the verified list. Choose an available centre.</p>}
      </>}
      {!platform&&!tenant&&<p role="alert">An assigned centre is required to review staff permissions.</p>}
      {centreReady&&<div className="flex flex-wrap gap-3">
       <Button className={actionClass} variant="outline" onClick={refreshDirectory} disabled={frozen||directoryState==='loading'}>Recheck staff directory</Button>
       <Button className={actionClass} disabled={frozen||!inviteEnabled||directoryState!=='ready'} onClick={()=>setOpenInvite(true)}>Invite staff with a role</Button>
      </div>}
      {!inviteEnabled&&<p role="status" className="text-muted-foreground">Invitations are not enabled until the independent server invitation and email-delivery checks pass.</p>}
     </section>
     {directoryState==='loading'&&<p role="status">Verifying authorised centre staff…</p>}
     {directoryError&&<div role="alert" className="space-y-3 rounded-lg border border-destructive p-4 max-sm:px-[16px]"><p>{directoryError}</p><Button className={actionClass} variant="outline" disabled={frozen} onClick={refreshDirectory}>Retry staff directory</Button></div>}
     {centreReady&&directoryState==='ready'&&<section className="min-w-0 space-y-4 rounded-xl border bg-card p-5 max-sm:px-[16px]">
      <h2 id="staff-permission-heading" tabIndex={-1} className="text-lg font-semibold">Office administrator, HR and secretary accounts</h2>
      <label className="block min-w-0 max-w-xl font-medium">Select an account and role
       <select value={selection} disabled={frozen} onChange={e=>choose(e.target.value)}
        className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3">
        <option value="">Choose existing staff account</option>
        {directory.map(p=><option key={personKey(p)} value={personKey(p)}>{personName(p)} · {roleLabels[p.role]}</option>)}
       </select>
      </label>
      {!directory.length&&<p className="text-muted-foreground">No verified office-role memberships were returned in this centre. Invitations must complete before a permission profile can be edited.</p>}
      {person&&<p className="text-muted-foreground">Selected: <strong className="text-foreground">{personName(person)}</strong> · {roleLabels[person.role]} · Centre: {centreName}</p>}
      {accessState==='loading'&&<p role="status">Verifying this staff member’s permission record…</p>}
      {accessError&&<div role="alert" className="space-y-3 rounded-lg border border-destructive p-4 max-sm:px-[16px]">
       <p>{accessError}</p>{draftKept&&<p>Your unsent permission draft is kept while you retry this record.</p>}
       <Button className={actionClass} variant="outline" disabled={frozen||!person} onClick={()=>person&&void readAccess(person,draftKept)}>Retry permission record</Button>
      </div>}
      {error&&!review&&<div role="alert" className="space-y-3 rounded-lg border border-destructive p-4 max-sm:px-[16px]">
       <p>{error}</p>{needsRead&&person&&<Button className={actionClass} variant="outline" disabled={busy} onClick={()=>void readAccess(person,true)}>Recheck this staff member</Button>}
      </div>}
      {verified&&person&&<form onSubmit={prepareReview} className="min-w-0 space-y-4">
       <div className="space-y-2 rounded-lg border p-4 max-sm:px-[12px]">
        <h3 className="text-lg font-semibold">{personName(person)} · {roleLabels[person.role]}</h3>
        <p className="text-muted-foreground">Last verified revision {current.revision} · {effectiveStaffPermissions(person.role,current.overrides).length} saved capabilities. Your draft would enable {choices.length} capabilities.</p>
        {draftKept&&<p role="status">Your permission draft is retained for this person and role.</p>}
        {person.id===user?.id&&<p role="status">Ask another authorised manager to review your own permissions.</p>}
       </div>
       <fieldset disabled={frozen||needsRead||person.id===user?.id} className="min-w-0">
        <legend className="sr-only">Personal permission draft</legend>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
         {STAFF_CAPABILITIES.map(cap=><fieldset key={cap.key} className="min-w-0 rounded-lg border p-4 max-sm:px-[12px]">
          <legend className="max-w-full px-1 font-semibold">{cap.label}</legend>
          <p className="mb-3 text-muted-foreground">{cap.description}</p>
          <p className="mb-3">Role default: {STAFF_DEFAULTS[person.role].includes(cap.key)?'Allowed':'Not granted'} · Draft: {choices.includes(cap.key)?'Allowed':'Denied'}</p>
          <label className="block font-medium">Personal override
           <select aria-label={cap.label+' permission'} className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3"
            value={overrides[cap.key]||'default'} onChange={e=>{
             if(operation.current||review||needsRead)return;
             const value=e.target.value;setError('');setNote('');
             setOverrides(previous=>{const updated={...previous};if(value==='default')delete updated[cap.key];
              else updated[cap.key]=value as CapabilityEffect;return updated;});
            }}>
            <option value="default">Use role default</option>
            <option value="allow">Extra permission — allow</option>
            <option value="deny">Less access — deny</option>
           </select>
          </label>
         </fieldset>)}
        </div>
       </fieldset>
       <p className="text-muted-foreground">These choices do not include director, awarding, KYC, grades, payment, AWS or student identity privileges. Protected workflows keep their separate server permissions.</p>
       <Button ref={reviewOpener} className={actionClass} type="submit" disabled={frozen||needsRead||person.id===user?.id||!dirty}>Review permission changes</Button>
      </form>}
     </section>}
     {note&&<p role="status" className="rounded-lg border p-4">{note}</p>}
     {centreReady&&inviteEnabled&&<AddStaffModal open={openInvite} onOpenChange={setOpenInvite} onStaffAdded={refreshDirectory} tenantId={tenant}/>}
    </>}
   <AlertDialog open={!!review&&manager&&enabled} onOpenChange={open=>{if(!open&&!operation.current)setReview(null);}}>
    <AlertDialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] min-w-0 overflow-y-auto text-sm [overflow-wrap:anywhere] max-sm:w-[calc(100%_-_32px)] max-sm:px-[16px]" onCloseAutoFocus={event=>{
     event.preventDefault();
     if(reviewOpener.current?.isConnected&&!reviewOpener.current.disabled)reviewOpener.current.focus();
     else document.getElementById('staff-permission-heading')?.focus();
    }}>
     <AlertDialogHeader>
      <AlertDialogTitle>Apply permissions for {review?personName(review.person):'this staff member'}?</AlertDialogTitle>
      <AlertDialogDescription>Approve the reviewed changes for {review?roleLabels[review.person.role]:''} at {centreName}. They apply only to this person and role, using verified revision {review?.current.revision}.</AlertDialogDescription>
     </AlertDialogHeader>
     {review&&<ul aria-label="Reviewed permission changes" className="space-y-3">
      {STAFF_CAPABILITIES.filter(cap=>review.overrides[cap.key]!==review.current.overrides[cap.key]).map(cap=><li key={cap.key}>
       <strong>{cap.label}</strong><p>{settingLabel(review.current.overrides[cap.key])} → {settingLabel(review.overrides[cap.key])}</p>
      </li>)}
     </ul>}
     {error&&<div role="alert" className="space-y-3"><p>{error}</p>
      {needsRead&&person&&<Button className={actionClass} variant="outline" disabled={busy} onClick={()=>void readAccess(person,true)}>Recheck this staff member</Button>}
     </div>}
     <AlertDialogFooter className="gap-3 sm:space-x-0">
      <AlertDialogCancel className={actionClass} disabled={busy}>Keep editing</AlertDialogCancel>
      <Button className={actionClass} disabled={busy||needsRead} onClick={()=>void applyReview()}>{busy?'Confirming permission changes…':'Apply and audit permissions'}</Button>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 </DashboardLayout>;
}
