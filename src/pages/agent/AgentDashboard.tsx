import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Search,Users,UserCheck,ShieldCheck,ClipboardList} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DashboardSkeleton} from '@/components/ui/Skeletons';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';

const stages=[
 {key:'lead',label:'New leads'},
 {key:'contacted',label:'Contacted'},
 {key:'qualified',label:'Qualified'},
 {key:'applied',label:'Applied'},
 {key:'under_review',label:'Under review'},
 {key:'enrolled',label:'Enrolled'},
] as const;

export default function AgentDashboard(){
 const {user}=useAuth();
 return <AgentWorkspace key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function AgentWorkspace(){
 const {user}=useAuth();
 const verified=!!user?.id&&!!user.tenantId&&user.role==='agent'&&user.roles?.includes('agent');
 const [query,setQuery]=useState(''),[selected,setSelected]=useState('');
 // An agent must never read an entire centre's applications or invoices.
 // Both identity/centre and agent ownership require independent database RLS.
 const {data:applications,loading,error,refetch}=useSupabaseQuery('applications',{
  enabled:verified,
  filters:[
   {column:'tenant_id',operator:'eq',value:user?.tenantId||''},
   {column:'agent_id',operator:'eq',value:user?.id||''},
  ],
  orderBy:{column:'updated_at',ascending:false},
 });
 const mine=verified?applications.filter(a=>a.tenant_id===user!.tenantId&&a.agent_id===user!.id):[];
 const normalise=(value:string|null|undefined)=>(value||'').toLowerCase();
 const filtered=mine.filter(a=>[a.student_name,a.email,a.programme_name,a.phone].some(value=>normalise(value).includes(query.toLowerCase().trim())));
 const current=filtered.find(a=>a.id===selected);
 const enrolled=mine.filter(a=>a.stage==='enrolled').length;
 const pending=mine.filter(a=>a.stage!=='enrolled'&&a.stage!=='lost').length;
 return <DashboardLayout title="Agent recruitment" subtitle="Only applications explicitly assigned to you within your verified centre"
  actions={verified?<Button asChild variant="outline"><Link to="/agent/resources">Agent guidance</Link></Button>:undefined}>
  {!verified?<p role="alert" className="rounded-xl border bg-card p-5">Select an active, verified Agent role with a centre assignment. Director or platform access alone cannot impersonate an agent.</p>:
   loading?<DashboardSkeleton/>:
   error?<section role="alert" className="rounded-xl border bg-card p-5 space-y-3">
    <p>The server could not confirm your assigned applications. No partial pipeline or financial totals are shown.</p>
    <Button variant="outline" onClick={()=>void refetch()}>Retry secure pipeline</Button>
   </section>:<div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Assigned application summary">
     <StatCard label="Assigned enquiries" value={mine.length} icon={Users}/>
     <StatCard label="Open cases" value={pending} icon={ClipboardList}/>
     <StatCard label="Recorded enrolments" value={enrolled} icon={UserCheck}/>
    </section>
    <section className="rounded-xl border bg-card p-4 space-y-3">
     <h2 className="font-semibold">Find an assigned learner</h2>
     <div className="relative max-w-lg"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
      <Input aria-label="Search your assigned applications" className="pl-9" type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected('');}} placeholder="Name, programme, email or telephone"/>
     </div>
     <p className="text-sm text-muted-foreground">{filtered.length} assigned applications match. New referrals must be entered through an independently authorised admissions workflow; the agent account cannot issue an offer, change enrolment or invent a payment.</p>
    </section>
    <section aria-label="Agent application pipeline">
     <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{stages.map(stage=>{
      const rows=filtered.filter(a=>a.stage===stage.key);
      return <article key={stage.key} className="rounded-xl border bg-card p-4">
       <h3 className="flex justify-between gap-2 font-semibold text-sm"><span>{stage.label}</span><span>{rows.length}</span></h3>
       <div className="mt-3 space-y-2">{rows.slice(0,25).map(a=><button key={a.id} type="button" aria-pressed={selected===a.id}
        className="w-full rounded-lg border p-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={()=>setSelected(prev=>prev===a.id?'':a.id)}>
        <span className="block font-medium text-sm">{a.student_name}</span>
        <span className="block text-xs text-muted-foreground">{a.programme_name||'Programme to be confirmed'}</span>
       </button>)}
       {!rows.length&&<p className="text-xs text-muted-foreground">No assigned enquiries at this stage.</p>}
       {rows.length>25&&<p className="text-xs text-muted-foreground">Showing first 25 of {rows.length} matching cases. Narrow your search to find another learner.</p>}
       </div>
      </article>;
     })}</div>
     {filtered.some(a=>!stages.some(stage=>stage.key===a.stage))&&<p className="mt-3 rounded-lg border p-3 text-sm">Some applications are deferred, lost or in a specialist review state. Search by the learner name to locate them in the full centre admissions process.</p>}
    </section>
    {current&&<section aria-label="Selected assigned application" className="rounded-xl border bg-card p-5 space-y-2">
     <h2 className="font-semibold">{current.student_name}</h2>
     <p className="text-sm">Programme: {current.programme_name||'Not confirmed'}</p>
     <p className="text-sm">Stage: <StatusBadge status={current.stage}/></p>
     {current.email&&<p className="text-sm">Email: <a className="underline break-all" href={`mailto:${current.email}`}>{current.email}</a></p>}
     {current.phone&&<p className="text-sm">Telephone: {current.phone}</p>}
     <p className="text-xs text-muted-foreground">Read-only assigned contact. Academic offer, KYC, fees and enrolment are handled through approved centre workflows.</p>
    </section>}
    <section className="rounded-xl border bg-card p-5 space-y-2">
     <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Commission reconciliation not activated</h2>
     <p className="text-sm text-muted-foreground">Agent-specific approved agreements, earned commissions, outstanding claims and paid settlements require a separate verified agent-to-payment ledger. They cannot be calculated from centre-wide invoice records. No commission amounts are displayed until that server-authorised service is available.</p>
    </section>
   </div>}
 </DashboardLayout>;
}
