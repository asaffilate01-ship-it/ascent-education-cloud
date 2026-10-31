import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {ActionButton} from '@/components/portfolio-ui';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {TASK_ROLES,pakistanDay,sortTasks,taskOverdue,type StaffTask} from '@/lib/staffTasks';
export default function StaffTaskBoard(){const {user}=useAuth();return user&&TASK_ROLES.includes(user.role)?<Board key={`${user.id}:${user.tenantId}:${user.role}`}/>:null;}
function Board(){
 const {user}=useAuth(),cache=useQueryClient();const [filter,setFilter]=useState('active'),[search,setSearch]=useState(''),[editing,setEditing]=useState<StaffTask|null|undefined>(),[error,setError]=useState('');
 const key=['staff-followups',user?.id,user?.tenantId,user?.role,filter];
 const tasks=useQuery({queryKey:key,enabled:!!user?.tenantId,queryFn:async()=>{let q=db.from('unipathway_staff_tasks').select('*').eq('tenant_id',user!.tenantId);if(filter==='active')q=q.in('status',['open','in_progress','blocked']);if(filter==='mine')q=q.eq('assigned_to',user!.id);const r=await q.order('due_on').limit(250);if(r.error)throw r.error;return sortTasks(r.data);}});
 const directory=useQuery({queryKey:['task-assignees',user?.id,user?.tenantId,user?.role],enabled:!!user?.tenantId,queryFn:async()=>{const r=await db.rpc('unipathway_task_assignees');if(r.error)throw r.error;return r.data as {user_id:string;full_name:string}[];}});
 const people=new Map(directory.data?.map(p=>[p.user_id,p.full_name]));
 // Search is deliberately limited to the centre- and role-scoped rows already returned by the server.
 // Never imply this client-side search covers records outside the 250-row query window.
 const term=search.trim().toLocaleLowerCase();
 const visible=(tasks.isError?[]:tasks.data||[]).filter(t=>{
  const inView=filter==='all'||(filter==='mine'?t.assigned_to===user?.id:!['done','cancelled'].includes(t.status));
  const fields=[t.title,t.detail,t.status.replace(/_/g,' '),t.priority,people.get(t.assigned_to)||''];
  return inView&&(!term||fields.some(value=>value.toLocaleLowerCase().includes(term)));
 });
 return <section aria-labelledby="followup-title" className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 id="followup-title" className="text-xl font-semibold">Follow-up tasks</h2><p className="text-sm text-muted-foreground">Named owners, due dates and clear outcomes. Deadlines use Pakistan dates.</p></div><Button disabled={editing!==undefined} onClick={()=>setEditing(null)}>New task</Button></div>
 {editing!==undefined&&<Editor key={editing?.id||'new'} task={editing} people={directory.data||[]} onClose={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);setError('');void cache.invalidateQueries({queryKey:key});}}/>}
 <div className="flex flex-wrap items-end justify-between gap-3"><label className="text-sm">Show <select className="ml-2 min-h-11 rounded-lg border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">Active tasks</option><option value="mine">Assigned to me</option><option value="all">All visible tasks</option></select></label><ActionButton tone="secondary" density="comfortable" pending={tasks.isFetching||directory.isFetching} pendingLabel="Refreshing…" onClick={()=>{void tasks.refetch();void directory.refetch();}}>Refresh queues</ActionButton></div>
 <label className="block max-w-xl space-y-1 text-sm font-medium">Search loaded tasks<Input aria-label="Search loaded tasks" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Task, status or owner" className="min-h-11" /></label>
 {!tasks.isLoading&&!tasks.isError&&<p role="status" className="text-xs text-muted-foreground">{visible.length} of {tasks.data?.length||0} loaded tasks match. Search covers only this loaded view (up to 250 tasks).</p>
 {(tasks.isError||directory.isError||error)&&<p role="alert">{error||'Some task data could not be loaded. Refresh to try again.'}</p>}
 {tasks.isLoading?<p role="status">Loading follow-up tasks…</p>:!tasks.isError&&!visible.length?<p>No tasks match this view.</p>:<ul className="divide-y">{visible.map(t=><li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="break-words font-semibold">{t.title}</h3><p className="text-sm text-muted-foreground">{people.get(t.assigned_to)||'Assigned staff member'} · Due {t.due_on} · {t.status.replace(/_/g,' ')}</p>{taskOverdue(t)&&<p className="text-sm font-semibold text-destructive">Overdue — follow up with the owner</p>}{t.priority==='high'&&<p className="text-sm">High priority</p>}</div><Button variant="outline" disabled={editing!==undefined} onClick={()=>setEditing(t)}>Review<span className="sr-only"> {t.title}</span></Button></li>)}</ul>}
 {(tasks.data?.length||0)>=250&&<p className="text-sm">Showing the first 250 visible tasks by deadline.</p>}
 </section>;
}
function Editor({task,people,onClose,onSaved}:{task:StaffTask|null;people:{user_id:string;full_name:string}[];onClose:()=>void;onSaved:()=>void}){
 const {user}=useAuth();const [id]=useState(()=>crypto.randomUUID());
 const [form,setForm]=useState({title:task?.title||'',detail:task?.detail||'',assigned_to:task?.assigned_to||user!.id,due_on:task?.due_on||pakistanDay(),priority:task?.priority||'normal',status:task?.status||'open',outcome:task?.outcome||''});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const mayAssign=!task||task.created_by===user!.id||['superadmin','centre_director'].includes(user!.role);
 const history=useQuery({queryKey:['task-history',task?.id,task?.version,user?.id],enabled:!!task,queryFn:async()=>{const r=await db.from('unipathway_task_history').select('id,version,created_at,snapshot').eq('task_id',task!.id).order('version',{ascending:false}).limit(20);if(r.error)throw r.error;return r.data as {id:string;version:number;created_at:string;snapshot:StaffTask}[];}});
 async function save(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage('');
  try{if(['blocked','done','cancelled'].includes(form.status)&&form.outcome.trim().length<5)throw Error('Record the outcome or blocker in at least 5 characters.');
   const q=task?db.from('unipathway_staff_tasks').update(form).eq('id',task.id).eq('version',task.version):db.from('unipathway_staff_tasks').insert({...form,id,tenant_id:user!.tenantId,created_by:user!.id});
   const r=await q.select('id').single();if(r.error)throw Error(task?'This task could not be saved, or another person changed it. Close and refresh before trying again.':'Task creation was not confirmed. Close and refresh to check whether it saved before starting another task.');onSaved();
  }catch(e){setMessage(e instanceof Error?e.message:'Task could not be saved.');}finally{setBusy(false);}
 }
 return <form onSubmit={save} className="rounded-xl border bg-card p-4 sm:p-5"><h3 className="mb-4 text-lg font-semibold">{task?'Review task':'Create follow-up'}</h3><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><legend className="sr-only">Follow-up details</legend>
 <label className="sm:col-span-2">Task<Input required minLength={3} maxLength={200} disabled={!mayAssign} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
 <label>Owner<select required disabled={!mayAssign} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3" value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}>{!people.some(p=>p.user_id===form.assigned_to)&&<option value={form.assigned_to}>Current owner</option>}{people.map(p=><option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}</select></label>
 <label>Due date<Input required type="date" disabled={!mayAssign} value={form.due_on} onChange={e=>setForm({...form,due_on:e.target.value})}/></label>
 <label>Priority<select disabled={!mayAssign} className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value as 'normal'|'high'})}><option value="normal">Normal</option><option value="high">High</option></select></label>
 <label>Status<select className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3" value={form.status} onChange={e=>setForm({...form,status:e.target.value as StaffTask['status']})}>{['open','in_progress','blocked','done','cancelled'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></label>
 <label className="sm:col-span-2">Instructions<Textarea maxLength={2000} disabled={!mayAssign} value={form.detail} onChange={e=>setForm({...form,detail:e.target.value})}/></label>
 <label className="sm:col-span-2">Outcome or blocker<Textarea maxLength={2000} value={form.outcome} onChange={e=>setForm({...form,outcome:e.target.value})}/></label>
 </fieldset><p className="mt-3 text-sm text-muted-foreground">Visible to the creator, owner and centre managers. Reference the approved record; do not paste identity documents or sensitive case details.</p>
 {message&&<p role="alert" className="mt-3">{message}</p>}<div className="mt-4 flex gap-3"><Button disabled={busy}>{busy?'Saving…':'Save task'}</Button><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Close</Button></div>
 {task&&<details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Recent changes</summary>{history.isError?<p role="alert">History failed to load.</p>:history.isLoading?<p role="status">Loading history…</p>:<ol className="mt-2 space-y-2">{history.data?.map(h=><li key={h.id} className="text-sm">Version {h.version} · {h.snapshot.status.replace(/_/g,' ')} · Due {h.snapshot.due_on}<p className="text-muted-foreground">{new Date(h.created_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} PKT · {h.snapshot.outcome||'No outcome recorded'}</p></li>)}</ol>}</details>}
 </form>;
}
