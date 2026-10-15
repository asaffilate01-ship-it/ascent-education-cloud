import ApplicationHandover from '@/components/progression/ApplicationHandover';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {workflowRows} from '@/lib/workflowRows';
import {compareSupportTasks,isOpenTask,taskDueGroup,type SupportTask} from '@/lib/supportDesk';
import SupportTaskEditor from '@/components/progression/SupportTaskEditor';
import SupportTasks from '@/components/progression/SupportTasks';
import ReferralHistory from '@/components/progression/ReferralHistory';
type Application={id:string;student_id:string;programme:string;destination_country:string;intake:string|null;status:string};
export default function SupportDesk(){
 const {user}=useAuth();const allowed=user?.roles.some(r=>['superadmin','centre_director','admissions_admin'].includes(r));
 return <DashboardLayout title="Application Support Desk" subtitle="Deadlines and handover work across your centre">{!allowed?<p role="alert">Admissions or centre management access is required.</p>:!user?.tenantId?<p role="alert">A centre assignment is required.</p>:<Workspace key={`${user.tenantId}-${user.id}`} tenant={user.tenantId} userId={user.id}/>}</DashboardLayout>;
}
function Workspace({tenant,userId}:{tenant:string;userId:string}){
 const [tasks,setTasks]=useState<SupportTask[]>([]),[applications,setApplications]=useState<Application[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[status,setStatus]=useState('open'),[due,setDue]=useState('all'),[category,setCategory]=useState('all'),[mine,setMine]=useState(false),[page,setPage]=useState(0),[application,setApplication]=useState('');
 const [now,setNow]=useState(Date.now());const generation=useRef(0);const planRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(application)planRef.current?.focus();},[application]);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);setError('');setTasks([]);setApplications([]);
  const current=()=>token===generation.current;
  const results=await Promise.all([
   workflowRows(supabase,'international_support_tasks',tenant,current),
   workflowRows(supabase,'international_university_applications',tenant,current,'id,student_id,programme,destination_country,intake,status'),
  ]);
  if(!current())return;
  if(results.some(r=>r.error))setError('The support desk could not be loaded completely. Check access and migrations, then retry.');
  else{setTasks(results[0].data as SupportTask[]);setApplications(results[1].data as Application[]);setNow(Date.now());}
  setLoading(false);
 },[tenant]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>setPage(0),[query,status,due,category,mine]);
 const cases=useMemo(()=>new Map(applications.map(a=>[a.id,a])),[applications]);
 const filtered=useMemo(()=>tasks.filter(task=>{
  const a=cases.get(task.application_id);const term=query.trim().toLowerCase();
  return (status==='all'||(status==='open'?isOpenTask(task):task.status===status))&&
   (due==='all'||taskDueGroup(task,now)===due)&&(category==='all'||task.task_type===category)&&(!mine||task.owner_id===userId)&&
   [task.title,task.task_type,task.id,task.application_id,a?.programme,a?.destination_country,a?.student_id].some(v=>v?.toLowerCase().includes(term));
 }).sort(compareSupportTasks),[tasks,cases,query,status,due,category,mine,userId,now]);
 const last=Math.max(0,Math.ceil(filtered.length/20)-1),currentPage=Math.min(page,last);
 if(loading)return <p role="status">Loading support desk…</p>;
 if(error)return <div className="space-y-3"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry support desk</Button></div>;
 return <div className="space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">{[['Open tasks',tasks.filter(isOpenTask).length],['Overdue',tasks.filter(t=>taskDueGroup(t,now)==='overdue').length],['Due in next 7 days',tasks.filter(t=>taskDueGroup(t,now)==='week').length]].map(([label,count])=><div key={label} className="surface-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{count}</p></div>)}</div>
  <p className="text-sm text-muted-foreground">Totals cover the loaded centre snapshot. Deadlines use your local time. Refresh to include other staff changes.</p>
  <ApplicationHandover applications={applications} tasks={tasks} now={now} onOpen={id=>{setApplication(id);planRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'});planRef.current?.focus();}}/>
  <div className="surface-card p-4 grid gap-3 md:grid-cols-3">
   <label>Search support tasks<Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Task, programme, country, case or learner ID"/></label>
   <label>Status<select className="w-full border rounded p-2" value={status} onChange={e=>setStatus(e.target.value)}>{['open','all','pending','in_progress','completed','cancelled'].map(s=><option value={s} key={s}>{s.replace(/_/g,' ')}</option>)}</select></label>
   <label>Deadline<select className="w-full border rounded p-2" value={due} onChange={e=>setDue(e.target.value)}><option value="all">Any deadline</option><option value="overdue">Overdue</option><option value="week">Next 7 days</option><option value="undated">No deadline</option></select></label>
   <label>Category<select className="w-full border rounded p-2" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{[...new Set(tasks.map(t=>t.task_type))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="flex items-center gap-2"><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/>Created by me</label>
   <div className="flex gap-2"><Button variant="outline" onClick={()=>{setQuery('');setStatus('open');setDue('all');setCategory('all');setMine(false);}}>Reset filters</Button><Button variant="outline" onClick={()=>void load()}>Refresh desk</Button></div>
  </div>
  <p role="status">{filtered.length} matching tasks · page {currentPage+1} of {last+1}</p>
  {!filtered.length&&<p>No tasks match these filters.</p>}
  {filtered.slice(currentPage*20,currentPage*20+20).map(task=>{const a=cases.get(task.application_id);return <article key={`${task.id}-${task.updated_at}`} className="surface-card p-5 space-y-3">
   <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{task.title}</h2><span>{task.status.replace(/_/g,' ')}</span></div>
   <p>{a?`${a.programme} · ${a.destination_country} · ${a.intake||'Intake to be confirmed'}`:'Application details unavailable'}</p>
   <p className="text-xs break-all">Case: {task.application_id}{a&&` · Learner: ${a.student_id}`}</p>
   <p className="text-sm">{task.due_at?`Due: ${new Date(task.due_at).toLocaleString()}`:'No deadline'}{taskDueGroup(task,now)==='overdue'?' · Overdue':''} · {task.task_type}</p>
   {task.notes&&<p className="text-sm whitespace-pre-wrap">{task.notes}</p>}
   <SupportTaskEditor task={task} onSaved={()=>void load()}/><ReferralHistory tenant={tenant} referral={task.id} entityTable="international_support_tasks"/>
  </article>;})}
  <div className="flex gap-2"><Button variant="outline" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous tasks</Button><Button variant="outline" disabled={currentPage===last} onClick={()=>setPage(currentPage+1)}>Next tasks</Button></div>
  <section ref={planRef} tabIndex={-1} aria-label="Selected application support plan" className="surface-card p-4 space-y-3"><h2 className="font-semibold">Open an application’s support plan</h2><label>Application<select className="w-full border rounded p-2" value={application} onChange={e=>setApplication(e.target.value)}><option value="">Choose application</option>{applications.map(a=><option key={a.id} value={a.id}>{a.programme} · {a.destination_country} · {a.id.slice(0,8)} · {a.status}</option>)}</select></label>{application&&cases.has(application)&&<SupportTasks key={application} tenant={tenant} application={application} onChanged={()=>void load()}/>}</section>
 </div>;
}
