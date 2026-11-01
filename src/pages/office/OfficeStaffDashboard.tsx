import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {STAFF_ROLES,STAFF_CAPABILITIES,staffRoleValid,UNIPATHWAY_SIGN_IN,type StaffCapability} from '@/lib/staffPermissionProfiles';
import AddStaffModal from '@/components/modals/AddStaffModal';

type OfficePerson={id:string;name:string|null;email:string|null;role:string};
type OfficeTask={id:string;title:string;status:string;priority:string;dueOn:string|null};
type OfficeSchedule={id:string;day:number;start:string;end:string;room:string|null;module:string};
type OfficeData={
 centreId:string;role:string;capabilities:string[];revision:number;
 overrides:Record<string,string>;tasks:OfficeTask[];staff:OfficePerson[];
 schedule:OfficeSchedule[];leaveSummary:{pending?:number;approved?:number;rejected?:number};
 invitationGateway:string;labProvider:string;
};
const enabled=import.meta.env.VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED==='true';
const inviteEnabled=import.meta.env.VITE_UNIPATHWAY_STAFF_INVITES_ENABLED==='true';
function validSnapshot(v:unknown,centre:string,role:string):v is OfficeData{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const row=v as Partial<OfficeData>;
 return row.centreId===centre&&row.role===role&&Array.isArray(row.capabilities)&&
  row.capabilities.every(c=>STAFF_CAPABILITIES.some(x=>x.key===c))&&
  Array.isArray(row.tasks)&&Array.isArray(row.staff)&&Array.isArray(row.schedule)&&
  row.leaveSummary!==null&&typeof row.leaveSummary==='object';
}
export default function OfficeStaffDashboard(){
 const {user}=useAuth();
 return <StaffWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function StaffWorkspace(){
 const {user}=useAuth();
 const role=user?.role||'',tenant=user?.tenantId||'';
 const authorised=!!user?.id&&!!tenant&&staffRoleValid(role)&&user.roles?.includes(role as any);
 const [data,setData]=useState<OfficeData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [revision,setRevision]=useState(0),[inviteOpen,setInviteOpen]=useState(false);
 const load=useCallback(async(active:()=>boolean)=>{
  setData(null);setLoading(true);setError('');
  if(!authorised||!enabled){setLoading(false);return;}
  try{
   const result=await (supabase.rpc as any)('get_my_unipathway_office_workspace',{p_role:role});
   if(result.error||!validSnapshot(result.data,tenant,role))throw Error('The server did not confirm this centre and active staff role.');
   if(active())setData(result.data);
  }catch{if(active())setError('Your assigned role, centre and personal permissions could not be verified. Protected data is unavailable.');}
  finally{if(active())setLoading(false);}
 },[authorised,tenant,role]);
 useEffect(()=>{let active=true;void load(()=>active);return()=>{active=false;};},[load,revision]);
 const allowed=(c:StaffCapability)=>!!data?.capabilities.includes(c);
 return <DashboardLayout title="Office, HR & administration" subtitle="Centre-scoped workspaces with independently verified personal permissions">
  <div className="space-y-5">
   {!authorised?<section role="alert" className="rounded-xl border bg-card p-5">A verified active Office Administrator, HR Officer or Secretary role and centre membership are required.</section>:
    !enabled?<section role="status" className="rounded-xl border bg-card p-6 space-y-3">
     <h2 className="text-lg font-semibold">General staff activation pending</h2>
     <p className="text-sm text-muted-foreground">The office roles and personal-permission service are built but not installed and tested in this UniPathway database. No access to confidential records is granted by this screen until a server-authorised role and centre match.</p>
     <p className="text-sm">All staff sign in at <a className="underline" href={UNIPATHWAY_SIGN_IN}>unipathway.pk/login</a>. Invited email addresses are separate from the website domain and must be changed through a verified account update.</p>
    </section>:<>
    <section className="rounded-xl border bg-card p-5 space-y-2">
     <h2 className="text-lg font-semibold">My approved workspace</h2>
     <p className="text-sm text-muted-foreground">Only capabilities returned for your verified role and centre are displayed. Managers can explicitly allow or deny a subset; confidential KYC, student grades, safeguarding, passwords, payroll details and certification decisions are not part of this dashboard.</p>
     <Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Recheck live permissions</Button>
    </section>
    {loading&&<p role="status">Verifying your office permissions…</p>}
    {error&&<p role="alert">{error}</p>}
    {data&&<div className="space-y-5">
     <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Approved work areas">
      {STAFF_CAPABILITIES.filter(c=>allowed(c.key)).map(cap=><article key={cap.key} className="rounded-xl border bg-card p-5">
       <h2 className="font-semibold">{cap.label}</h2><p className="mt-2 text-sm text-muted-foreground">{cap.description}</p>
       {cap.key==='invite_limited_staff'&&<Button className="mt-3" disabled={!inviteEnabled||role!=='office_admin'} onClick={()=>setInviteOpen(true)}>Invite permitted office staff</Button>}
      </article>)}
      {!data.capabilities.length&&<p className="rounded-xl border p-4 text-sm">Your manager has restricted all office capabilities. Contact your Centre Director to review access.</p>}
     </section>
     {allowed('invite_limited_staff')&&!inviteEnabled&&<p role="status" className="rounded-xl border p-4 text-sm">Staff invitations are not activated on this backend. No accounts can be created from this screen until the invitation RPC and email delivery are verified.</p>}
     {allowed('view_own_tasks')&&<section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">My assigned office tasks ({data.tasks.length})</h2>
      {data.tasks.map(t=><article key={t.id} className="rounded-lg border p-3">
       <p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.status} · {t.priority} · {t.dueOn||'No due date recorded'}</p>
      </article>)}
      {!data.tasks.length&&<p className="text-sm text-muted-foreground">No assigned tasks were returned by the authenticated centre service.</p>}
     </section>}
     {allowed('staff_directory')&&<section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Centre staff directory</h2>
      <p className="text-xs text-muted-foreground">Limited staff identity fields only; never use this list for payroll or identity verification.</p>
      <div className="grid gap-2 sm:grid-cols-2">{data.staff.map(s=><article key={s.id+':'+s.role} className="rounded-lg border p-3">
       <p className="text-sm font-semibold">{s.name||'Staff account'}</p>
       <p className="break-all text-xs text-muted-foreground">{s.role} · {s.email||'Email not recorded'}</p>
      </article>)}</div>
      {!data.staff.length&&<p className="text-sm text-muted-foreground">No verified staff entries found.</p>}
     </section>}
     {allowed('view_schedule')&&<section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">Published classroom plan (Pakistan local time)</h2>
      <p className="text-xs text-muted-foreground">A scheduled lecture is not a created Teams meeting or confirmed attendance.</p>
      {data.schedule.map(s=><article key={s.id} className="rounded-lg border p-3">
       <p className="font-medium text-sm">{s.module}</p><p className="text-xs text-muted-foreground">Day {s.day} · {s.start}–{s.end} · {s.room||'Room not assigned'}</p>
      </article>)}
      {!data.schedule.length&&<p className="text-sm text-muted-foreground">No scheduled classes were returned for this centre.</p>}
     </section>}
     {allowed('view_leave_summary')&&<section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="font-semibold">HR leave summary</h2>
      <p className="text-sm text-muted-foreground">Aggregate status only. No personal leave reasons, medical records or employment decisions are disclosed.</p>
      <p className="text-sm">Pending: {data.leaveSummary.pending??0} · Approved: {data.leaveSummary.approved??0} · Rejected: {data.leaveSummary.rejected??0}</p>
     </section>}
     {allowed('prepare_compliance')&&<section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Prepare teaching and compliance evidence</h2>
      <p className="mt-2 text-sm text-muted-foreground">Assist your director with checklists and source references. You cannot mark an external board approved, issue qualifications or certify staff.</p>
      <Link className="mt-3 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm hover:bg-accent" to="/office/compliance-preparation">View preparation guidance</Link>
     </section>}
     <p className="text-xs text-muted-foreground">Personal permission revision: {data.revision}. A change becomes effective only after the server confirms it; menu visibility is not a substitute for row-level security.</p>
    </div>}
    <AddStaffModal open={inviteOpen} onOpenChange={setInviteOpen} onStaffAdded={()=>setRevision(v=>v+1)}/>
   </>}
  </div>
 </DashboardLayout>;
}
