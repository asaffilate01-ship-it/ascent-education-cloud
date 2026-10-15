import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {toast} from 'sonner';
import type {EducationTables} from '@/integrations/supabase/education-types';
type Task=EducationTables['international_support_tasks']['Row'];
const states=['pending','in_progress','completed','cancelled'];
export default function SupportTasks({tenant,application,student=false}:{tenant:string;application:string;student?:boolean}){
 const {user}=useAuth();const canEdit=!student&&user?.roles.some(r=>['centre_director','superadmin','admissions_admin'].includes(r));
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Task[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const generation=useRef(0),mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const load=useCallback(async()=>{
  if(!mounted.current)return;const token=++generation.current;setLoading(true);setError('');setRows([]);
  try{
   const tasks:Task[]=[];
   for(let offset=0;;offset+=100){
    const result=await supabase.from('international_support_tasks').select('*').eq('tenant_id',tenant).eq('application_id',application).order('created_at',{ascending:true}).order('id').range(offset,offset+99);
    if(token!==generation.current)return;if(result.error)throw result.error;
    tasks.push(...(result.data||[]));if((result.data||[]).length<100)break;
   }
   setRows(tasks);
  }catch{if(token===generation.current)setError('Support tasks could not be loaded. Check access and migrations, then retry.');}
  finally{if(token===generation.current)setLoading(false);}
 },[tenant,application]);
 useEffect(()=>{if(open)void load();return()=>{generation.current++;};},[open,load]);
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!canEdit||busy||!user)return;const form=e.currentTarget,f=new FormData(form);setBusy(true);
  try{
   const due=String(f.get('due')||'');
   const result=await supabase.from('international_support_tasks').insert({tenant_id:tenant,application_id:application,owner_id:user.id,title:String(f.get('title')).trim(),task_type:String(f.get('type')),notes:String(f.get('notes')||'').trim()||null,due_at:due?new Date(due).toISOString():null});
   if(result.error)throw result.error;if(!mounted.current)return;form.reset();toast.success('Support task created');await load();
  }catch{if(mounted.current)toast.error('Task could not be saved. Check access and retry.');}finally{if(mounted.current)setBusy(false);}
 }
 async function update(task:Task,status:string){
  if(!canEdit||busy)return;setBusy(true);
  try{
   const result=await supabase.from('international_support_tasks').update({status}).eq('id',task.id).eq('tenant_id',tenant).eq('application_id',application).eq('updated_at',task.updated_at).select('id').maybeSingle();
   if(result.error)throw result.error;if(!mounted.current)return;
   if(!result.data)toast.error('The task changed or access was removed. Refresh and review before retrying.');else toast.success('Task updated');await load();
  }catch{if(mounted.current)toast.error('Task update failed. Refresh and retry.');}finally{if(mounted.current)setBusy(false);}
 }
 return <section className="space-y-3 border rounded p-3"><Button type="button" variant="outline" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide support tasks':'View support tasks'}</Button>{open&&<>
  <h3 className="font-semibold">Application support and handover</h3>
  <p className="text-sm text-muted-foreground">Tasks coordinate institutional support. Completion does not confirm provider approval, a visa, payment or a booking.</p>
  {loading?<p role="status">Loading support tasks…</p>:error?<div><p role="alert">{error}</p><Button type="button" onClick={()=>void load()}>Retry tasks</Button></div>:<>
   <p className="text-sm">{rows.filter(t=>t.status==='completed').length} completed · {rows.filter(t=>['pending','in_progress'].includes(t.status)).length} open · {rows.filter(t=>['pending','in_progress'].includes(t.status)&&t.due_at&&Date.parse(t.due_at)<Date.now()).length} overdue</p>
   {rows.length===0&&<p>No support tasks have been recorded for this application.</p>}
   <ul className="space-y-3">{rows.map(t=><li key={t.id} className="border rounded p-3 space-y-2"><p className="font-medium">{t.title}</p><p className="text-sm">{t.task_type} · {t.status.replace(/_/g,' ')}</p>{t.due_at&&<p className="text-sm">Due: <time dateTime={t.due_at}>{new Date(t.due_at).toLocaleString()}</time>{['pending','in_progress'].includes(t.status)&&Date.parse(t.due_at)<Date.now()?' · Overdue':''}</p>}{t.notes&&<p className="text-sm whitespace-pre-wrap">{t.notes}</p>}{t.completed_at&&<p className="text-sm">Completed: {new Date(t.completed_at).toLocaleString()}</p>}{canEdit&&<div className="flex flex-wrap gap-2">{states.filter(s=>s!==t.status).map(s=><Button key={s} type="button" variant="outline" disabled={busy} onClick={()=>void update(t,s)}>{s==='pending'?'Reopen':s==='in_progress'?'Start':s==='completed'?'Complete':'Cancel'}</Button>)}</div>}</li>)}</ul>
   {canEdit&&<form onSubmit={create} className="grid gap-3 md:grid-cols-2"><h4 className="font-medium md:col-span-2">Add support task</h4><label>Task title<Input name="title" required maxLength={200}/></label><label>Category<select name="type" className="w-full border rounded p-2">{['documents','offer_conditions','accommodation','predeparture','arrival','ongoing_support'].map(t=><option key={t}>{t}</option>)}</select></label><label>Due date and time (your local time)<Input name="due" type="datetime-local"/></label><label>Learner-visible instructions<textarea name="notes" maxLength={2000} className="w-full border rounded p-2" placeholder="Use institutional channels. Do not include passwords or private staff notes."/></label><Button disabled={busy}>Add support task</Button></form>}
   <Button type="button" variant="outline" disabled={busy} onClick={()=>void load()}>Refresh tasks</Button>
  </>}
 </>}</section>;
}
