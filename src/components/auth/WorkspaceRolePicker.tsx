import {useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowRight,Search,ShieldCheck} from 'lucide-react';
import {ROLE_HOME,ROLE_LABELS,useAuth} from '@/contexts/AuthContext';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {matchesLocalSearch} from '@/lib/localSearch';
import {workspaceRoleFamilies,rolesInWorkspaceFamily} from '@/lib/workspaceRoleCatalog';
import type {UserRole} from '@/types/platform';
import BrandLogo from '@/components/BrandLogo';
import {Button} from '@/components/ui/button';

export const roleDescriptions:Record<UserRole,string>={
 superadmin:'Platform administration, centres and release evidence',
 centre_director:'Centre operations, admissions and academic oversight',
 admissions_admin:'Enquiries, applications and enrolment',
 office_admin:'Office administration and student services',
 hr_officer:'Staff records, recruitment and HR',
 secretary:'Office coordination and administration',
 lecturer:'Classes, materials and teaching activities',
 assessor:'Independent marking and feedback',
 programme_leader:'Curriculum, delivery and assessment allocations',
 iqa_officer:'Internal quality assurance and evidence review',
 awarding_body_eqa:'External quality assurance and awarding-body review',
 welfare_officer:'Learner support and safeguarding',
 security_officer:'Access, visitors, CCTV and recorded safety operations',
 exams_officer:'Exam timetables, session plans and candidate workflows',
 finance_officer:'Invoices, payment evidence and remuneration review',
 marketing_officer:'Campaigns and lead management',
 agent:'Applicant referrals and progression',
 student:'Learning, classes, coursework and progress',
 parent_guardian:'Authorised shared learner information',
 university_partner:'University progression and referrals',
 employer_partner:'Employer training and learner progression',
};
export function verifiedWorkspaceChoices(roles:readonly UserRole[]|undefined){
 return KNOWN_UNIPATHWAY_ROLES.filter(role=>roles?.includes(role));
}
export default function WorkspaceRolePicker(){
 const {user,loading,setRole,logout}=useAuth();
 const navigate=useNavigate();const [params]=useSearchParams();
 const roles=verifiedWorkspaceChoices(user?.roles);
 const identity=user?.id||'';
 return <Picker key={JSON.stringify([identity,user?.tenantId,roles])} roles={roles} activeRole={user?.role} loading={!!loading} hint={params.get('role')} onRole={setRole} onLogout={logout} navigate={navigate}/>;
}
function Picker({roles,activeRole,loading,hint,onRole,onLogout,navigate}:{roles:UserRole[];activeRole?:UserRole;loading:boolean;hint:string|null;onRole:(r:UserRole)=>void;onLogout:()=>Promise<void>;navigate:ReturnType<typeof useNavigate>}){
 const [search,setSearch]=useState(''),[family,setFamily]=useState('all');
 const [requested,setRequested]=useState<UserRole|null>(null);
 const [selected,setSelected]=useState<UserRole|null>(()=>roles.find(r=>r===hint)||null);
 const [signingOut,setSigningOut]=useState(false),[error,setError]=useState('');
 const selectedRole=selected&&roles.includes(selected)?selected:null;
 const filtered=rolesInWorkspaceFamily(roles,family).filter(role=>matchesLocalSearch(ROLE_LABELS[role]+' '+roleDescriptions[role],search));
 useEffect(()=>{
  if(loading||signingOut||!activeRole||!roles.includes(activeRole))return;
  const next=requested||(roles.length===1?roles[0]:null);
  if(next&&roles.includes(next)&&next===activeRole)navigate(ROLE_HOME[next],{replace:true});
 },[activeRole,loading,requested,roles,navigate,signingOut]);
 function open(){
  if(loading||signingOut||requested||!selectedRole||!roles.includes(selectedRole))return;
  setError('');setRequested(selectedRole);try{onRole(selectedRole);}catch{setRequested(null);setError('The selected role could not be opened. Please retry.');}
 }
 return <main className="min-h-dvh bg-secondary/30 px-4 py-8 sm:px-8 lg:py-12">
  <div className="mx-auto max-w-5xl space-y-5">
   <header className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex rounded-xl bg-white p-3 shadow-sm"><BrandLogo className="h-9 max-w-full sm:h-11"/></span><Button variant="outline" disabled={signingOut||!!requested} onClick={()=>{setSigningOut(true);setError('');void onLogout().then(()=>navigate('/',{replace:true})).catch(()=>{setError('Sign-out could not be confirmed. Please retry.');setSigningOut(false);});}}>Sign out</Button></header>
   <section className="rounded-2xl border bg-card p-4 sm:p-6">
    <p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-5" aria-hidden="true"/> Verified workspace access</p>
    <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Choose your workspace</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Select the role you want to use. Only roles verified for this account appear here. This changes the active dashboard, not server permissions.</p>
    {error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {loading?<p role="status" className="mt-4">Verifying assigned access…</p>:!activeRole||!roles.includes(activeRole)?<p role="alert" className="mt-4">No verified workspace is available. Contact the authorised administrator.</p>:<>
     {roles.length>1&&<label className="mt-5 block max-w-xl text-sm font-medium">Find a role<span className="relative mt-1 block"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground"/><input type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)} className="min-h-11 w-full rounded-lg border bg-background pl-9 pr-3" placeholder="Student, finance, lecturer…"/></span></label>}
     {hint&&!roles.some(role=>role===hint)&&<p role="status" className="mt-3 rounded-lg border p-3 text-sm">The requested role is not assigned to this account. Choose an available workspace.</p>}
     <p className="mt-3 text-sm font-medium">Current workspace: {ROLE_LABELS[activeRole]}</p>
     {roles.length>1&&<label className="mt-3 block max-w-xl text-sm font-medium">Workspace area<select value={family} disabled={!!requested||signingOut} onChange={e=>setFamily(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2"><option value="all">All assigned workspaces</option>{workspaceRoleFamilies.filter(group=>rolesInWorkspaceFamily(roles,group.id).length>0).map(group=><option key={group.id} value={group.id}>{group.label}</option>)}</select></label>}
     <p role="status" aria-label="Assigned role results" className="mt-3 text-sm text-muted-foreground">{filtered.length} of {roles.length} assigned roles</p>
     <fieldset className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" disabled={!!requested||signingOut}><legend className="sr-only">Select a verified role</legend>{filtered.map(role=><label key={role} className={'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-ring '+(selectedRole===role?'border-primary bg-primary/5':'bg-background hover:bg-accent/40')}><input type="radio" name="workspace-role" value={role} checked={selectedRole===role} onChange={()=>setSelected(role)} className="mt-1 size-4 shrink-0 accent-primary"/><span className="min-w-0"><span className="block font-semibold">{ROLE_LABELS[role]}</span><span className="mt-1 block text-sm text-muted-foreground">{roleDescriptions[role]}</span></span></label>)}</fieldset>
     {!filtered.length&&<p className="mt-3 text-sm">No assigned roles match your search.</p>}
     <div className="mt-5 flex flex-wrap items-center gap-3"><Button className="min-h-11" disabled={!selectedRole||!!requested||signingOut} onClick={open}>{requested?'Opening workspace…':'Open selected workspace'}<ArrowRight className="ml-2 size-4" aria-hidden="true"/></Button>{(search||family!=='all')&&<Button variant="outline" disabled={!!requested||signingOut} onClick={()=>{setSearch('');setFamily('all');}}>Clear filters</Button>}</div>
    </>}
   </section>
   <Link to="/" className="inline-flex min-h-11 items-center text-sm underline">Back to UniPathway</Link>
  </div>
 </main>;
}
