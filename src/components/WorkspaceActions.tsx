import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Action={id:string;title:string;detail:string;to:string;due?:string};
export default function WorkspaceActions(){
 const {user}=useAuth();
 const supported=!!user&&['admissions_admin','centre_director','finance_officer','agent','lecturer'].includes(user.role);
 const result=useQuery({queryKey:['workspace-actions',user?.id,user?.tenantId,user?.role],enabled:supported&&!!user?.tenantId,queryFn:async()=>{
  const actions:Action[]=[];const errors:string[]=[];
  async function source(name:string,load:()=>Promise<Action[]>){try{actions.push(...await load());}catch{errors.push(name);}}
  if(['admissions_admin','centre_director','agent'].includes(user!.role))await source('Admissions',async()=>{
   let q=db.from('applications').select('id,student_name,stage,created_at').eq('tenant_id',user!.tenantId).in('stage',['lead','applied','under_review','conditional_offer','unconditional_offer','deposit_paid']).order('created_at').limit(30);
   if(user!.role==='agent')q=q.eq('agent_id',user!.id);
   const r=await q;if(r.error)throw r.error;
   return r.data.map((a:any)=>({id:`application:${a.id}`,title:a.student_name,detail:a.stage==='unconditional_offer'||a.stage==='deposit_paid'?'Ready for academic enrolment review':`Application: ${a.stage.replaceAll('_',' ')}`,to:user!.role==='agent'?'/agent/applications':user!.role==='centre_director'?'/director/admissions':'/admissions'}));
  });
  if(['finance_officer','centre_director'].includes(user!.role))await source('Finance',async()=>{
   const r=await db.from('invoices').select('id,student_name,due_date,amount,paid,status').eq('tenant_id',user!.tenantId).in('status',['pending','partial','overdue']).order('due_date').limit(30);if(r.error)throw r.error;
   return r.data.filter((i:any)=>Number(i.amount)>Number(i.paid)).map((i:any)=>({id:`invoice:${i.id}`,title:i.student_name,detail:'Outstanding invoice — review payer and funding agreement',due:i.due_date,to:user!.role==='centre_director'?'/director/finance':'/finance/invoices'}));
  });
  if(user!.role==='lecturer')await source('Teaching',async()=>{
   const r=await db.from('modules').select('id,title,code').eq('tenant_id',user!.tenantId).eq('lecturer_id',user!.id).order('title').limit(30);if(r.error)throw r.error;
   return r.data.map((m:any)=>({id:`module:${m.id}`,title:m.title,detail:`${m.code||'Module'} · prepare lessons, register and follow up`,to:`/lecturer/module?module=${m.id}`}));
  });
  return {actions:actions.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')),errors};
 }});
 if(!supported)return null;
 return <section aria-labelledby="workspace-actions" className="rounded-xl border p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="workspace-actions" className="text-lg font-semibold">Work needing attention</h2><p className="text-sm text-muted-foreground">Review your current queues before opening specialist tools.</p></div><Button variant="outline" disabled={result.isFetching} onClick={()=>result.refetch()}>Refresh</Button></div>
 {result.isLoading&&<p role="status" className="mt-4">Checking your work queues…</p>}
 {result.isError&&<p role="alert">Work queues could not be loaded. Retry with Refresh.</p>}
 {result.data?.errors.map(e=><p role="alert" key={e} className="mt-3 text-sm">{e} could not be checked. Refresh or open that service below.</p>)}
 {result.data&&!result.data.actions.length&&!result.data.errors.length&&<p className="mt-4">Nothing is waiting in these queues.</p>}
 <ul className="mt-4 divide-y">{result.data?.actions.slice(0,12).map(a=><li key={a.id}><Link to={a.to} className="flex min-h-16 flex-wrap items-center justify-between gap-2 rounded-lg py-3 focus-visible:ring-2 focus-visible:ring-ring"><span><span className="block font-semibold">{a.title}</span><span className="text-sm text-muted-foreground">{a.detail}</span></span>{a.due&&<span className="text-sm">Due {new Date(`${a.due}T12:00:00+05:00`).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Karachi'})}</span>}</Link></li>)}</ul>
 {!!result.data?.actions.length&&<p className="mt-3 text-xs text-muted-foreground">Showing up to 12 priority items. Open the relevant service for the full queue. An unpaid sponsor invoice does not by itself change student access.</p>}
 </section>;
}
