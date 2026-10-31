import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import {Users,Shield,Search,BookOpen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useAuth,ROLE_LABELS} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import AddStaffModal from '@/components/modals/AddStaffModal';
import type {UserRole} from '@/types/platform';

type StaffMember={id:string;name:string;email:string;roleLabels:string;roles:UserRole[];tenantId:string|null;moduleCount:number};
const staffRoles=new Set<UserRole>([
 'centre_director','admissions_admin','lecturer','assessor','programme_leader','iqa_officer',
 'welfare_officer','security_officer','exams_officer','finance_officer','marketing_officer',
 'superadmin',
]);
export default function StaffManagement(){
 const {user}=useAuth();
 return <ScopedStaffDirectory key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function ScopedStaffDirectory(){
 const {user}=useAuth();
 const platform=user?.role==='superadmin';
 const scoped=!!user?.tenantId&&['centre_director','programme_leader'].includes(user.role);
 const allowed=!!user&&(platform||scoped);
 const canInvite=!!user&&['superadmin','centre_director'].includes(user.role);
 const [search,setSearch]=useState(''),[page,setPage]=useState(0),[addOpen,setAddOpen]=useState(false);
 const scope=user?.tenantId?[{column:'tenant_id',operator:'eq' as const,value:user.tenantId}]:[];
 // Platform-wide enumeration is only used for an active, verified superadmin.
 const profileQuery=useSupabaseQuery('profiles',{
  enabled:allowed,filters:platform?[]:scope,orderBy:{column:'full_name',ascending:true},
 });
 const ids=[...new Set(profileQuery.data.map(p=>p.user_id))];
 const roleQuery=useSupabaseQuery('user_roles',{
  enabled:allowed&&!profileQuery.loading&&!profileQuery.error&&ids.length>0,
  filters:[{column:'user_id',operator:'in',value:ids}],
 });
 const moduleQuery=useSupabaseQuery('modules',{enabled:allowed,filters:platform?[]:scope});
 const loading=profileQuery.loading||roleQuery.loading||moduleQuery.loading;
 const error=profileQuery.error||roleQuery.error||moduleQuery.error;
 const staff=useMemo(()=>{
  const profiles=profileQuery.data.filter(p=>platform||p.tenant_id===user?.tenantId);
  const byId=new Map(profiles.map(p=>[p.user_id,p]));
  const roles=new Map<string,Set<UserRole>>();
  for(const row of roleQuery.data){
   const profile=byId.get(row.user_id);
   if(!profile||!staffRoles.has(row.role))continue;
   // Legacy null-tenant memberships must still belong to an authorised profile.
   if(row.tenant_id&&row.tenant_id!==profile.tenant_id)continue;
   if(!roles.has(row.user_id))roles.set(row.user_id,new Set());
   roles.get(row.user_id)!.add(row.role);
  }
  const assigned=new Map<string,number>();
  for(const mod of moduleQuery.data){
   if(!mod.lecturer_id)continue;
   assigned.set(mod.lecturer_id,(assigned.get(mod.lecturer_id)||0)+1);
  }
  return profiles.filter(p=>roles.has(p.user_id)).map(p=>{
   const memberships=[...(roles.get(p.user_id)||[])];
   return {id:p.user_id,name:p.full_name||'Staff member',email:p.email||'',
    roles:memberships,roleLabels:memberships.map(r=>ROLE_LABELS[r]).join(', '),
    tenantId:p.tenant_id,moduleCount:assigned.get(p.user_id)||0} satisfies StaffMember;
  }).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 },[profileQuery.data,roleQuery.data,moduleQuery.data,platform,user?.tenantId]);
 const term=search.trim().toLocaleLowerCase();
 const filtered=staff.filter(s=>[s.name,s.email,s.roleLabels,s.tenantId||''].some(value=>value.toLocaleLowerCase().includes(term)));
 const pages=Math.max(1,Math.ceil(filtered.length/20)),current=Math.min(page,pages-1);
 const columns=[
  {key:'name',label:'Staff member',render:(s:StaffMember)=><div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>},
  {key:'roles',label:'Verified role memberships',render:(s:StaffMember)=><span className="text-sm">{s.roleLabels}</span>},
  {key:'modules',label:'Assigned modules',render:(s:StaffMember)=><span>{s.moduleCount}</span>},
  {key:'centre',label:'Centre',render:(s:StaffMember)=><span className="text-xs">{s.tenantId||'Global / legacy membership'}</span>},
 ];
 if(!allowed)return <DashboardLayout title="Staff directory"><p role="alert">A verified centre leadership or superadmin role is required to view staff. Centre leadership must have an assigned centre.</p></DashboardLayout>;
 if(error)return <DashboardLayout title="Staff directory"><div role="alert" className="space-y-3 rounded-lg border border-destructive p-4"><p>Staff memberships could not be verified. No partial staff list is shown.</p><Button variant="outline" onClick={()=>{void profileQuery.refetch();void roleQuery.refetch();void moduleQuery.refetch();}}>Retry staff directory</Button></div></DashboardLayout>;
 if(loading)return <DashboardLayout title="Staff directory"><p role="status">Verifying centre staff and assigned roles…</p></DashboardLayout>;
 return <DashboardLayout title="Staff directory" subtitle={platform?'Authorised platform staff memberships':'Authorised staff belonging to this centre'}
  actions={canInvite?<Button className="min-h-11" onClick={()=>setAddOpen(true)}>Invite or add staff</Button>:undefined}>
  {canInvite&&<AddStaffModal open={addOpen} onOpenChange={setAddOpen}
   onStaffAdded={()=>{void profileQuery.refetch();void roleQuery.refetch();void moduleQuery.refetch();}}/>}
  <section className="mb-5 rounded-lg border bg-card p-4">
   <h2 className="flex items-center gap-2 font-semibold"><Shield className="size-4"/>Role records, not employment status</h2>
   <p className="mt-2 text-sm text-muted-foreground">This list shows authorised account memberships, not verified employment, DBS clearance, active payroll or awarding-body accreditation. Roles are issued only through server-authorised workflows.</p>
   {platform&&!user?.tenantId&&<p className="mt-2 text-xs text-muted-foreground">Platform owner view spans centres, subject to backend RLS. Open an individual centre to review its staff.</p>}
  </section>
  <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
   <StatCard label="Staff accounts" value={staff.length} icon={Users}/>
   <StatCard label="Lecturer accounts" value={staff.filter(s=>s.roles.includes('lecturer')).length} icon={BookOpen}/>
   <StatCard label="Role types recorded" value={new Set(staff.flatMap(s=>s.roles)).size} icon={Shield}/>
  </div>
  <label className="mb-4 block max-w-xl text-sm font-semibold">Find staff or role
   <span className="relative mt-2 block"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
    <input aria-label="Find staff or role" type="search" maxLength={120} value={search}
     onChange={e=>{setSearch(e.target.value);setPage(0);}}
     className="min-h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"
     placeholder="Name, role or assigned centre"/>
   </span>
  </label>
  <p role="status" className="mb-3 text-sm text-muted-foreground">{filtered.length} of {staff.length} authorised staff accounts match.</p>
  <DataTable data={filtered.slice(current*20,current*20+20)} columns={columns}
   emptyTitle="No staff memberships found" emptyDescription="No authorised staff records match the current centre and filters."/>
  {filtered.length>20&&<nav aria-label="Staff directory pages" className="mt-4 flex flex-wrap items-center gap-3">
   <Button variant="outline" disabled={current===0} onClick={()=>setPage(current-1)}>Previous staff</Button>
   <span>Page {current+1} of {pages}</span>
   <Button variant="outline" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next staff</Button>
  </nav>}
  {user?.role==='programme_leader'&&<p className="mt-5 text-sm text-muted-foreground">Staff invitations require a centre director. Review teaching allocations in <Link to="/programme/modules" className="underline">programme modules</Link>.</p>}
 </DashboardLayout>;
}
