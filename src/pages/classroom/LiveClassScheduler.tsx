import {useState,useEffect,useRef} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {pakistanClassTime} from '@/lib/classroomExperience';
type Class={id:string;module_id:string;organiser_user_id:string;title:string;starts_at:string;ends_at:string;status:string;teams_sync_status:string;join_url:string|null};
type Job={session_id:string;status:string;revision:number;error_code:string|null};
const localTime=(value:string)=>{const d=new Date(value);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
export default function LiveClassScheduler(){const {user}=useAuth();return <Scheduler key={`${user?.id}:${user?.tenantId}`}/>;}
function Scheduler(){
 const {user}=useAuth(),cache=useQueryClient();const [params,setParams]=useSearchParams();const module=params.get('module')||'';
 const pendingEdit=useRef<Class|null>(null);const [editRevision,setEditRevision]=useState(0);
 const [editing,setEditing]=useState<Class|null>(null),[id,setId]=useState<string>(crypto.randomUUID()),[title,setTitle]=useState(''),[organiser,setOrganiser]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[students,setStudents]=useState<string[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const key=['calendar-scheduler',user?.id,user?.tenantId];
 const state=useQuery({queryKey:key,enabled:!!user?.tenantId,refetchInterval:30000,queryFn:async()=>{
  const [m,s,j,i]=await Promise.all([
   db.from('modules').select('id,title').eq('tenant_id',user!.tenantId),
   db.from('live_class_sessions').select('id,module_id,organiser_user_id,title,starts_at,ends_at,status,teams_sync_status,join_url').eq('tenant_id',user!.tenantId).order('starts_at',{ascending:false}).limit(200),
   db.from('uni_calendar_jobs').select('session_id,status,revision,error_code').eq('tenant_id',user!.tenantId),
   db.from('live_class_invitations').select('session_id,user_id,status').eq('tenant_id',user!.tenantId).in('status',['invited','accepted'])]);
  if([m,s,j,i].some(r=>r.error))throw Error('Scheduling could not be loaded. Check the classroom database deployment and your module assignment.');
  return {modules:m.data as {id:string;title:string}[],classes:s.data as Class[],jobs:j.data as Job[],invites:i.data as {session_id:string;user_id:string}[]};
 }});
 const candidates=useQuery({queryKey:[...key,'candidates',module],enabled:!!module,queryFn:async()=>{const r=await db.rpc('uni_calendar_candidates',{p_module:module});if(r.error)throw Error('Assigned module and enabled Microsoft organiser required.');return r.data as {students:{id:string;name:string}[];organisers:{id:string;name:string}[]};}});
 function reset(){setEditing(null);setId(crypto.randomUUID());setTitle('');setOrganiser('');setStart('');setEnd('');setStudents([]);}
 useEffect(()=>{if(pendingEdit.current?.module_id===module){const c=pendingEdit.current;pendingEdit.current=null;loadEdit(c);}else reset();},[module]);
 function loadEdit(c:Class){setEditing(c);setEditRevision(state.data!.jobs.find(j=>j.session_id===c.id)?.revision||0);setId(c.id);setTitle(c.title);setOrganiser(c.organiser_user_id);setStart(localTime(c.starts_at));setEnd(localTime(c.ends_at));setStudents(state.data!.invites.filter(i=>i.session_id===c.id).map(i=>i.user_id));}
 function edit(c:Class){if(c.module_id!==module){pendingEdit.current=c;setParams({module:c.module_id});}else loadEdit(c);}
 async function save(cancel=false){if(busy)return;setBusy(true);setMessage('');try{
  if(!module||!organiser||!title.trim()||!start||!end)throw Error('Complete the module, organiser, title and dates.');
  const r=await db.rpc('save_uni_calendar_class',{p_id:id,p_module:module,p_organiser:organiser,p_title:title,p_start:new Date(start).toISOString(),p_end:new Date(end).toISOString(),p_students:students,p_revision:editing?editRevision:0,p_cancel:cancel});
  if(r.error)throw Error(r.error.message);reset();setMessage(cancel?'Cancellation queued. Microsoft confirmation will appear below.':'Class saved and Microsoft invitation delivery queued.');await cache.invalidateQueries({queryKey:key});
 }catch(e){setMessage(e instanceof Error?e.message:'Class could not be saved.');}finally{setBusy(false);}}
 async function cancelClass(session:string){if(!window.confirm('Cancel this class now and queue Microsoft cancellation notices?'))return;setBusy(true);try{const r=await db.rpc('cancel_uni_calendar_class',{p_session:session});if(r.error)throw r.error;reset();setMessage('Class cancelled in UniPathway. Microsoft cancellation is pending confirmation.');await state.refetch();}catch{setMessage('Cancellation could not be saved. Refresh and retry.');}finally{setBusy(false);}}
 async function review(session:string){setBusy(true);try{const r=await db.rpc('review_uni_calendar_delivery',{p_session:session});if(r.error)throw r.error;setMessage('Provider verification queued. An uncertain creation will not be sent again automatically.');await state.refetch();}catch{setMessage('Verification could not be queued. Refresh and retry.');}finally{setBusy(false);}}
 return <DashboardLayout title="Schedule a live class" subtitle="Choose the class and learners; track Microsoft invitation delivery here">
 <Link className="underline" to={`/lecturer/classroom${module?`?module=${module}`:''}`}>View classroom</Link>
 {state.isLoading?<p role="status">Loading your teaching modules…</p>:state.isError?<p role="alert">{state.error.message} <Button variant="outline" onClick={()=>state.refetch()}>Retry</Button></p>:<div className="mt-5 space-y-6">
 <section className="rounded-xl border bg-card p-5 space-y-4"><h2 className="text-xl font-bold">{editing?'Update class':'New class'}</h2>
 <label className="block">Module<select className="mt-1 min-h-11 w-full rounded border bg-background p-2" value={module} disabled={busy} onChange={e=>setParams({module:e.target.value})}><option value="">Choose a module</option>{state.data?.modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
 {module&&<><p className="text-sm text-muted-foreground">Invitations use verified @unipathway.pk Microsoft accounts. The calendar worker, Graph consent and Teams licences must be connected before delivery.</p>
 {candidates.isError&&<p role="alert">{candidates.error.message}</p>}
 {!candidates.isLoading&&candidates.data?.organisers.length===0&&<p role="alert">No enabled Microsoft organiser is connected. Complete account activation in Teams setup.</p>}
 <fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Class details</legend>
 <label className="block">Class title<Input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
 <label className="block">Meeting organiser<select disabled={!!editing} value={organiser} onChange={e=>setOrganiser(e.target.value)} className="mt-1 min-h-11 w-full rounded border bg-background p-2"><option value="">Choose connected organiser</option>{candidates.data?.organisers.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 <div className="grid gap-4 sm:grid-cols-2"><label>Starts<Input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Ends<Input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><p className="text-sm text-muted-foreground">Enter times in your device timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Classroom listings show Pakistan time.</p>
 <fieldset className="rounded-lg border p-3"><legend>Invited learners ({students.length})</legend><Button type="button" variant="ghost" onClick={()=>setStudents(candidates.data!.students.map(s=>s.id))}>Select all enrolled learners</Button><div className="max-h-64 overflow-auto">{candidates.data?.students.map(s=><label key={s.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={students.includes(s.id)} onChange={e=>setStudents(v=>e.target.checked?[...v,s.id]:v.filter(x=>x!==s.id))}/>{s.name}</label>)}</div>{!candidates.data?.students.length&&<p>No active learners are enrolled in this programme.</p>}</fieldset>
 <div className="flex flex-wrap gap-3"><Button disabled={!organiser||!title||!start||!end||!candidates.data?.organisers.some(o=>o.id===organiser)} onClick={()=>void save()}>{busy?'Saving…':editing?'Queue calendar update':'Schedule and invite'}</Button>{editing&&<><Button variant="outline" onClick={reset}>New class</Button><Button variant="outline" onClick={()=>void cancelClass(id)}>Cancel class</Button></>}</div></fieldset></>}
 </section>
 <p role="status">{message}</p>
 <section className="space-y-3"><h2 className="text-xl font-bold">Classes and delivery status</h2>{state.data?.classes.filter(c=>!module||c.module_id===module).map(c=>{const j=state.data.jobs.find(j=>j.session_id===c.id);return <article key={c.id} className="rounded-xl border bg-card p-4"><h3 className="font-semibold">{c.title}</h3><p className="my-2 text-sm">{pakistanClassTime(c.starts_at)} · {c.status} · {j?.status?.replace(/_/g,' ')||'Existing manual meeting'}</p>{j?.error_code&&<p className="text-sm" role="alert">Delivery needs attention: {j.error_code.replace(/_/g,' ')}. No delivery success has been assumed.</p>}<div className="mt-3 flex gap-3">{j&&<Button variant="outline" disabled={busy||['processing','needs_review'].includes(j.status)||c.status==='cancelled'} onClick={()=>edit(c)}>Edit class / invitees</Button>}{j&&c.status!=='cancelled'&&<Button variant="outline" disabled={busy} onClick={()=>void cancelClass(c.id)}>Cancel class</Button>}{j?.status==='needs_review'&&<Button variant="outline" disabled={busy} onClick={()=>void review(c.id)}>Verify provider status</Button>}</div></article>;})}{state.data?.classes.length===0&&<p>No live classes have been scheduled.</p>}</section>
 </div>}</DashboardLayout>;
}
