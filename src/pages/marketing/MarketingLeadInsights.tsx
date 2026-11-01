import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {BarChart3,ShieldCheck,Users} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';

export default function MarketingLeadInsights(){
 const {user}=useAuth();
 return <Insights key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function Insights(){
 const {user}=useAuth();
 const permitted=!!user?.id&&!!user.tenantId&&user.roles?.includes(user.role)&&['marketing_officer','centre_director','superadmin'].includes(user.role);
 const [search,setSearch]=useState('');
 const query=useSupabaseQuery('applications',{
  enabled:permitted,
  select:'id,tenant_id,stage,source,created_at,programme_name',
  filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],
  orderBy:{column:'created_at',ascending:false},
 });
 const rows=useMemo(()=>query.data.filter(x=>x.tenant_id===user?.tenantId),[query.data,user?.tenantId]);
 const sources=useMemo(()=>{
  const totals=new Map<string,{total:number,applications:number,enrolled:number}>();
  for(const row of rows){
   const name=row.source?.trim()||'Unattributed';
   const count=totals.get(name)||{total:0,applications:0,enrolled:0};count.total++;
   if(!['lead','contacted','qualified','lost'].includes(row.stage))count.applications++;
   if(row.stage==='enrolled')count.enrolled++;
   totals.set(name,count);
  }
  return [...totals.entries()].sort((a,b)=>b[1].total-a[1].total||a[0].localeCompare(b[0]));
 },[rows]);
 const matched=sources.filter(([name])=>name.toLowerCase().includes(search.trim().toLowerCase()));
 return <DashboardLayout title="Marketing lead insights" subtitle="Centre-only recruitment sources and funnel totals, without applicant identities">
  {!permitted?<p role="alert" className="rounded-xl border p-5">An active Marketing Officer or authorised centre leadership role and a centre assignment are required.</p>:
  query.loading?<p role="status">Loading approved centre marketing totals…</p>:
  query.error?<section role="alert" className="rounded-xl border p-5 space-y-3"><p>Marketing source counts are unavailable. No zero figures are assumed.</p><Button variant="outline" onClick={()=>void query.refetch()}>Retry lead totals</Button></section>:
  <div className="space-y-5">
   <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {[
     {label:'Recorded enquiries',value:rows.length,Icon:Users},
     {label:'Tracked sources',value:sources.length,Icon:BarChart3},
     {label:'Recorded enrolments',value:rows.filter(r=>r.stage==='enrolled').length,Icon:ShieldCheck},
    ].map(({label,value,Icon})=><article className="rounded-xl border bg-card p-4" key={label}>
     <p className="flex gap-2 items-center text-sm text-muted-foreground"><Icon className="size-4"/>{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>)}
   </section>
   <section className="rounded-xl border bg-card p-5 space-y-3">
    <h2 className="font-semibold">Lead acquisition sources</h2>
    <p className="text-sm text-muted-foreground">Aggregate records only. This dashboard cannot view applicant phone numbers, private documents, payment methods or eligibility decisions. Admissions handles personal follow-up and enrolment.</p>
    <label className="block max-w-md text-sm font-medium">Find a campaign or source
     <Input type="search" className="mt-1" value={search} onChange={e=>setSearch(e.target.value)} maxLength={120} placeholder="Website, Instagram, agent referral…"/>
    </label>
    {!matched.length?<p className="text-sm text-muted-foreground">No source totals match this search.</p>:
    <div className="grid gap-3 md:grid-cols-2">{matched.map(([name,counts])=><article key={name} className="rounded-lg border p-4">
     <h3 className="text-sm font-semibold">{name}</h3>
     <p className="mt-2 text-sm">Enquiries: {counts.total} · Applications: {counts.applications} · Recorded enrolments: {counts.enrolled}</p>
    </article>)}</div>}
   </section>
   <nav aria-label="Marketing workflows" className="flex flex-wrap gap-3">
    <Button asChild variant="outline"><Link to="/marketing">Marketing dashboard</Link></Button>
    <Button asChild><Link to="/marketing/email-campaigns">Prepare campaign draft</Link></Button>
   </nav>
   <p className="text-xs text-muted-foreground">Source analytics are not independently validated attribution. Sending campaigns requires separate consent, unsubscribes, verified provider delivery and approval of any student personal data processing.</p>
  </div>}
 </DashboardLayout>;
}
