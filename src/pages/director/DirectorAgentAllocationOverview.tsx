import {useState} from 'react';
import {Link} from 'react-router-dom';
import {BriefcaseBusiness,ClipboardList,ShieldCheck,Users} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';

/**
 * Director-only high-level agent allocation view.
 * Do not reuse an agent's own dashboard, which must always bind to agent_id.
 * No applicant contact fields, invoices or unverified commission totals.
 */
export default function DirectorAgentAllocationOverview(){
 const {user}=useAuth();
 return <Overview key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function Overview(){
 const {user}=useAuth();
 const verified=!!user?.id&&!!user.tenantId&&['centre_director','superadmin'].includes(user.role)&&user.roles?.includes(user.role);
 const [search,setSearch]=useState('');
 const {data,loading,error,refetch}=useSupabaseQuery('applications',{
  enabled:verified,
  select:'id,tenant_id,agent_id,stage',
  filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],
  orderBy:{column:'id',ascending:true},
 });
 const rows=data.filter(a=>a.tenant_id===user?.tenantId);
 const assigned=rows.filter(a=>!!a.agent_id);
 const counts=new Map<string,{total:number,enrolled:number,open:number}>();
 for(const row of assigned){
  const id=row.agent_id!;
  const previous=counts.get(id)||{total:0,enrolled:0,open:0};
  previous.total++;
  if(row.stage==='enrolled')previous.enrolled++;
  if(row.stage!=='enrolled'&&row.stage!=='lost')previous.open++;
  counts.set(id,previous);
 }
 const list=[...counts.entries()].sort((a,b)=>b[1].total-a[1].total||a[0].localeCompare(b[0]))
  .filter(([id])=>id.toLowerCase().includes(search.trim().toLowerCase()));
 return <DashboardLayout title="Centre agent allocation" subtitle="Recruitment workload overview, without impersonating an agent">
  {!verified?<p role="alert" className="rounded-xl border p-5">An active Centre Director or Platform Owner role and an explicit centre assignment are required. Select the appropriate centre before reviewing agents.</p>:
   loading?<p role="status">Checking centre-assigned agent workloads…</p>:
   error?<section role="alert" className="rounded-xl border p-5 space-y-3"><p>Agent allocations could not be verified. No totals are available.</p><Button variant="outline" onClick={()=>void refetch()}>Retry centre allocations</Button></section>:<div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Centre recruitment allocation">
     {[
      ['Recorded agents',counts.size,Users],
      ['Assigned applications',assigned.length,ClipboardList],
      ['Unassigned applications',rows.length-assigned.length,BriefcaseBusiness],
      ['Recorded enrolments',assigned.filter(a=>a.stage==='enrolled').length,ShieldCheck],
     ].map(([label,value,Icon])=><article key={label as string} className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4"/><p className="text-sm">{label as string}</p></div>
      <p className="mt-2 text-2xl font-semibold">{value as number}</p>
     </article>)}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Agent workload by recorded assignment</h2>
     <p className="text-sm text-muted-foreground">These are application records attributed to an agent identifier, not verified staff appointments, contractual commission entitlements or paid settlements. Access to applicant details remains in the authorised admissions workflow.</p>
     <label className="block max-w-sm text-sm font-medium">Find an agent reference
      <Input className="mt-1" type="search" maxLength={120} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search assigned account reference"/>
     </label>
     {!list.length?<p className="text-sm text-muted-foreground">No recorded agent allocations match this centre and search.</p>:
      <div className="grid gap-3 sm:grid-cols-2">{list.slice(0,100).map(([id,stats])=><article className="rounded-lg border p-4" key={id}>
       <h3 className="font-semibold text-sm">Agent reference {id.slice(0,8)}</h3>
       <p className="mt-2 text-sm">Applications: {stats.total} · Open: {stats.open} · Recorded enrolments: {stats.enrolled}</p>
      </article>)}</div>}
     {list.length>100&&<p className="text-sm">Showing 100 of {list.length} matching agent references. Narrow your search for another account.</p>}
    </section>
    <nav aria-label="Agent management handoffs" className="flex flex-wrap gap-3">
     <Button asChild><Link to="/director/admissions">Review applicant pipeline</Link></Button>
     <Button asChild variant="outline"><Link to="/director/staff">Review staff memberships</Link></Button>
    </nav>
    <p className="text-xs text-muted-foreground">Source only: the database must independently apply centre RLS. A verified agent agreement, signed referral attribution and finance reconciliation service are required before commission records may be displayed.</p>
   </div>}
 </DashboardLayout>;
}
