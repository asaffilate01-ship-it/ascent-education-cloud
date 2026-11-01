import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import AddStaffModal from '@/components/modals/AddStaffModal';
import {
 STAFF_CAPABILITIES,STAFF_DEFAULTS,effectiveStaffPermissions,parseCapabilityOverrides,
 staffRoleValid,UNIPATHWAY_SIGN_IN,type StaffRole,type StaffCapability,type CapabilityEffect
} from '@/lib/staffPermissionProfiles';
type Person={id:string;name:string|null;email:string|null;role:StaffRole};
type Access={userId:string;centreId:string;role:StaffRole;overrides:Partial<Record<StaffCapability,CapabilityEffect>>;revision:number};
const enabled=import.meta.env.VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED==='true';
const inviteEnabled=import.meta.env.VITE_UNIPATHWAY_STAFF_INVITES_ENABLED==='true';

export default function StaffAccessManager(){
 const {user}=useAuth();
 return <Workspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function Workspace(){
 const {user}=useAuth();
 const manager=!!user?.id&&['centre_director','superadmin'].includes(user.role)&&user.roles?.includes(user.role);
 const platform=user?.role==='superadmin';
 const [centres,setCentres]=useState<{id:string;name:string}[]>([]);
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const [directory,setDirectory]=useState<Person[]>([]),[selection,setSelection]=useState('');
 const [current,setCurrent]=useState<Access|null>(null);
 const [overrides,setOverrides]=useState<Partial<Record<StaffCapability,CapabilityEffect>>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 const [revision,setRevision]=useState(0),[openInvite,setOpenInvite]=useState(false);
 useEffect(()=>{
  let active=true;setTenant(user?.tenantId||'');setCentres([]);
  if(!enabled||!manager||!platform)return()=>{active=false;};
  void(async()=>{
   try{const {data,error:e}=await supabase.from('tenants').select('id,name').order('name').limit(100);
    if(e||!Array.isArray(data))throw Error('Could not verify platform centres');
    if(active)setCentres(data);
   }catch{if(active)setError('The centre list cannot be verified.');}
  })();
  return()=>{active=false;};
 },[enabled,manager,platform,user?.tenantId]);
 const reload=useCallback(async(active:()=>boolean)=>{
  setDirectory([]);setSelection('');setCurrent(null);setOverrides({});setNote('');setError('');setLoading(true);
  if(!enabled||!manager||!tenant){setLoading(false);return;}
  try{
   const {data,error:e}=await (supabase.rpc as any)('get_unipathway_staff_directory_for_manager',{p_tenant:tenant});
   if(e||!Array.isArray(data)||data.some((x:Person)=>!x.id||!staffRoleValid(x.role)))throw Error('Centre directory could not be verified');
   if(active())setDirectory(data as Person[]);
  }catch{if(active())setError('Authorised office-staff records are unavailable. No permission changes are possible.');}
  finally{if(active())setLoading(false);}
 },[enabled,manager,tenant]);
 useEffect(()=>{let active=true;void reload(()=>active);return()=>{active=false;};},[reload,revision]);
 async function choose(key:string){
  if(!key||!manager||!enabled||busy)return;
  setSelection(key);setCurrent(null);setOverrides({});setError('');setNote('');setLoading(true);
  const person=directory.find(x=>x.id+':'+x.role===key);
  if(!person){setLoading(false);return;}
  try{
   const {data,error:e}=await (supabase.rpc as any)('get_unipathway_staff_access',{p_target:person.id,p_role:person.role});
   if(e||!data||data.userId!==person.id||data.role!==person.role||data.centreId!==tenant||
     !Number.isInteger(data.revision))throw Error('Personal access profile could not be verified');
   const parsed=parseCapabilityOverrides(data.overrides||{});
   setCurrent(data as Access);setOverrides(parsed);
  }catch{setError('Personal permission record could not be verified. Refresh before changing access.');}
  finally{setLoading(false);}
 }
 const person=directory.find(x=>x.id+':'+x.role===selection);
 const choices=person&&current&&staffRoleValid(person.role)?effectiveStaffPermissions(person.role,overrides):[];
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!manager||!enabled||busy||!current||!person||person.id===user?.id)return;
  setBusy(true);setError('');setNote('');
  try{
   const safe=parseCapabilityOverrides(overrides);
   const {data,error:e}=await (supabase.rpc as any)('set_unipathway_staff_access',{
    p_target:person.id,p_role:person.role,p_expected_revision:current.revision,p_overrides:safe
   });
   if(e||!data||data.userId!==person.id||data.centreId!==tenant||
     data.role!==person.role||data.revision!==current.revision+1)throw Error('The server did not confirm permission changes. Refresh and verify before retrying.');
   setCurrent(data as Access);setNote('Personal permissions updated in the verified centre audit. The user may need to refresh their session.');setOverrides(safe);
  }catch(err){setError(err instanceof Error?err.message:'Permission changes were not confirmed.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Office roles & personal permissions" subtitle="Centre director approval, least-privilege defaults, per-person overrides">
  <div className="space-y-5">
   {!manager?<p role="alert" className="rounded-xl border p-5">Only an active Centre Director or Platform Owner can review individual permission changes.</p>:
    !enabled?<section role="status" className="rounded-xl border bg-card p-6 space-y-3">
     <h2 className="text-lg font-semibold">Office access activation pending</h2>
     <p className="text-sm text-muted-foreground">Per-person capability changes require the reviewed UniPathway role enum, centre-isolated access tables and audit RPCs. Checkboxes cannot grant access until those changes are applied and tested with real centre accounts. No staff records have been changed.</p>
     <p className="text-sm">Staff sign in at <a className="underline" href={UNIPATHWAY_SIGN_IN}>unipathway.pk/login</a>. Existing development email addresses are not automatically renamed.</p>
     <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm" to={platform?'/landlord/centres':'/director/staff'}>Return to staff management</Link>
    </section>:<>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Centre and staff identity</h2>
     <p className="text-sm text-muted-foreground">The Platform Owner may select a centre. Centre directors cannot access other centres. All edits require an already verified office-role membership, server-side centre match and an optimistic revision check.</p>
     {platform&&<label className="block max-w-md text-sm">Centre
      <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={tenant}
       onChange={e=>{setTenant(e.target.value);setSelection('');}}>
       <option value="">Choose a centre</option>{centres.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>}
     {tenant&&<div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={()=>setRevision(v=>v+1)} disabled={busy||loading}>Recheck staff directory</Button>
      <Button disabled={!inviteEnabled} onClick={()=>setOpenInvite(true)}>Invite staff with a role</Button>
     </div>}
     {!inviteEnabled&&<p role="status" className="text-sm text-muted-foreground">Invitations are not enabled until the independent server invitation and email-delivery checks pass.</p>}
    </section>
    {loading&&<p role="status">Verifying authorised centre staff and permissions…</p>}
    {error&&<p role="alert" className="rounded-lg border border-destructive p-3">{error}</p>}
    {!loading&&tenant&&<section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Office administrator, HR and secretary accounts</h2>
     <label className="block max-w-xl text-sm font-medium">Select an account and role
      <select value={selection} onChange={e=>void choose(e.target.value)}
       className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3">
       <option value="">Choose existing staff account</option>
       {directory.map(p=><option key={p.id+':'+p.role} value={p.id+':'+p.role}>{p.name||p.email||p.id} · {p.role}</option>)}
      </select>
     </label>
     {!directory.length&&<p className="text-sm text-muted-foreground">No verified office-role memberships were returned in this centre. Invitations must complete before a permission profile can be edited.</p>}
     {current&&person&&<form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border p-4">
       <h3 className="font-semibold">{person.name||person.email} · {person.role}</h3>
       <p className="mt-2 text-sm text-muted-foreground">Revision {current.revision} · {choices.length} currently enabled capabilities. Changes are approved only if the server returns the next revision.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
       {STAFF_CAPABILITIES.map(cap=><fieldset key={cap.key} className="rounded-lg border p-4">
        <legend className="text-sm font-semibold">{cap.label}</legend>
        <p className="mb-3 text-xs text-muted-foreground">{cap.description}</p>
        <p className="mb-2 text-xs">Role default: {STAFF_DEFAULTS[person.role].includes(cap.key)?'Allowed':'Not granted'} · Effective: {choices.includes(cap.key)?'Allowed':'Denied'}</p>
        <label className="block text-xs font-medium">Personal override
         <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3"
          value={overrides[cap.key]||'default'} onChange={e=>{
           const value=e.target.value;
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
      <p className="text-xs text-muted-foreground">The override list never includes superadmin, director, awarding/certification, KYC, grades, payment, IAM, AWS or student identity privileges. Additional protected workflows require separate server RLS approval.</p>
      <Button type="submit" disabled={busy||person.id===user?.id}>{busy?'Confirming…':'Apply and audit personal permissions'}</Button>
     </form>}
    </section>}
    {note&&<p role="status" className="rounded-lg border p-3">{note}</p>}
    {tenant&&inviteEnabled&&<AddStaffModal open={openInvite} onOpenChange={setOpenInvite}
     onStaffAdded={()=>setRevision(v=>v+1)} tenantId={tenant}/>}
   </>}
  </div>
 </DashboardLayout>;
}
