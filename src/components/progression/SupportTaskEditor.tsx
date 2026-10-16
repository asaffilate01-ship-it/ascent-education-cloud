import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {localDateTime,supportDueValue,type SupportTask} from '@/lib/supportDesk';
export default function SupportTaskEditor({task,onSaved}:{task:SupportTask;onSaved:()=>void}){
 const {user}=useAuth();const allowed=user?.tenantId===task.tenant_id&&user.roles.some(r=>['centre_director','superadmin','admissions_admin'].includes(r));
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 if(!allowed)return null;
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!allowed)return;const f=new FormData(e.currentTarget);setBusy(true);setError('');
  try{
   const title=String(f.get('title')||'').trim();if(!title)throw new Error('Enter a task title.');
   const values={title,notes:String(f.get('notes')||'').trim()||null,due_at:supportDueValue(String(f.get('due')||''),task.due_at),status:String(f.get('status'))};
   const result=await supabase.from('international_support_tasks').update(values).eq('id',task.id).eq('tenant_id',task.tenant_id).eq('application_id',task.application_id).eq('updated_at',task.updated_at).select('id').maybeSingle();
   if(!alive.current)return;
   if(result.error)throw new Error('Task could not be updated. Check access and retry.');
   if(!result.data)throw new Error('This task changed or access was removed. Close the editor and refresh before retrying. Your unsaved text is still shown.');
   setOpen(false);onSaved();
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Task could not be updated.');}finally{if(alive.current)setBusy(false);}
 }
 return <div className="space-y-3"><Button type="button" variant="outline" aria-expanded={open} disabled={busy} onClick={()=>{setOpen(!open);setError('');}}>{open?'Close editor':'Edit task'}</Button>{open&&<form onSubmit={save} className="grid gap-3 md:grid-cols-2 rounded border p-3">
  <p className="text-sm md:col-span-2">Instructions are visible to the learner. Keep private staff notes and secrets out of this task.</p>
  {error&&<p role="alert" className="md:col-span-2 text-destructive">{error}</p>}
  <label>Task title<Input name="title" required maxLength={200} defaultValue={task.title} disabled={busy}/></label>
  <label>Task status<select name="status" defaultValue={task.status} disabled={busy} className="w-full border rounded p-2">{['pending','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></label>
  <label>Deadline (your local time)<Input name="due" type="datetime-local" defaultValue={localDateTime(task.due_at)} disabled={busy}/></label>
  <label>Learner-visible instructions<textarea name="notes" maxLength={2000} defaultValue={task.notes||''} disabled={busy} className="w-full border rounded p-2"/></label>
  <Button disabled={busy}>{busy?'Saving…':'Save task changes'}</Button>
 </form>}</div>;
}
