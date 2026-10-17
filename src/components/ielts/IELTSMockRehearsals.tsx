import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {CalendarDays,ClipboardCheck,RefreshCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';

const db:SupabaseClient=supabase;
type PracticeType='short_practice'|'full_rehearsal';
type Mode='academic'|'general';
type Row={
 id:string;tenant_id:string;student_id:string;track:Mode;rehearsal_type:PracticeType;
 delivery:'centre'|'online';scheduled_at:string;status:'scheduled'|'in_progress'|'reviewed'|'cancelled';
 listening_questions:number|null;listening_correct:number|null;
 reading_questions:number|null;reading_correct:number|null;
 writing_observations:string|null;speaking_observations:string|null;tutor_next_steps:string|null;
 assessed_at:string|null;
};
type Profile={user_id:string;full_name:string};
const fields=['listening_questions','listening_correct','reading_questions','reading_correct'] as const;
type ScoreField=typeof fields[number];
const isCount=(n:number,min:number,max:number)=>Number.isInteger(n)&&n>=min&&n<=max;

export default function IELTSMockRehearsals({track}:{track?:Mode}){
 const {user}=useAuth();
 const tenant=user?.tenantId;
 const staff=user?.roles.some(x=>['lecturer','programme_leader','exams_officer','centre_director','superadmin'].includes(x))??false;
 const scheduler=user?.roles.some(x=>['exams_officer','centre_director','superadmin'].includes(x))??false;
 const [rows,setRows]=useState<Row[]>([]);
 const [students,setStudents]=useState<Profile[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<Row|null>(null);
 const [form,setForm]=useState({
  student_id:'',rehearsal_type:'short_practice' as PracticeType,track:track||'academic' as Mode,
  delivery:'online' as 'centre'|'online',scheduled_at:''
 });
 const [assessment,setAssessment]=useState({
  listening_questions:'',listening_correct:'',reading_questions:'',reading_correct:'',
  writing_observations:'',speaking_observations:'',tutor_next_steps:''
 });
 const reload=useCallback(async()=>{
  if(!tenant||!user){setLoading(false);return;}
  setLoading(true);setError('');
  try{
   let q=db.from('ielts_mock_rehearsals')
    .select('id,tenant_id,student_id,track,rehearsal_type,delivery,scheduled_at,status,listening_questions,listening_correct,reading_questions,reading_correct,writing_observations,speaking_observations,tutor_next_steps,assessed_at')
    .eq('tenant_id',tenant).order('scheduled_at',{ascending:false}).limit(100);
   if(!staff)q=q.eq('student_id',user.id);
   const [r,p]=await Promise.all([
    q,
    staff?db.from('profiles').select('user_id,full_name').eq('tenant_id',tenant).order('full_name').limit(300):Promise.resolve({data:[],error:null})
   ]);
   if(r.error||p.error)throw r.error||p.error;
   setRows((r.data||[]) as Row[]);
   setStudents((p.data||[]) as Profile[]);
  }catch{setError('Mock rehearsal records could not be loaded. Confirm centre permissions and database migration.');}
  finally{setLoading(false);}
 },[tenant,user?.id,staff]);
 useEffect(()=>{void reload();},[reload]);
 const byStudent=useMemo(()=>new Map(students.map(p=>[p.user_id,p.full_name])),[students]);
 async function schedule(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!scheduler||!tenant||busy)return;
  if(!form.student_id||!form.scheduled_at)return setError('Choose a student and schedule date.');
  const dt=new Date(form.scheduled_at);
  if(Number.isNaN(dt.getTime()))return setError('Invalid date.');
  setBusy(true);setError('');
  try{
   const result=await db.from('ielts_mock_rehearsals').insert({
    tenant_id:tenant,student_id:form.student_id,rehearsal_type:form.rehearsal_type,track:form.track,
    delivery:form.delivery,scheduled_at:dt.toISOString()
   });
   if(result.error)throw result.error;
   setForm(s=>({...s,student_id:'',scheduled_at:''}));await reload();
  }catch(e){setError(e instanceof Error?e.message:'Unable to schedule mock. The selected account must be a student.');}
  finally{setBusy(false);}
 }
 async function start(row:Row){
  if(!staff||!tenant||busy)return;
  setBusy(true);setError('');
  try{
   const r=await db.from('ielts_mock_rehearsals').update({status:'in_progress'}).eq('id',row.id).eq('tenant_id',tenant);
   if(r.error)throw r.error;
   await reload();
  }catch(e){setError(e instanceof Error?e.message:'Could not start the mock.');}
  finally{setBusy(false);}
 }
 function choose(row:Row){
  setSelected(row);setError('');
  setAssessment({
   listening_questions:row.listening_questions?.toString()||'',listening_correct:row.listening_correct?.toString()||'',
   reading_questions:row.reading_questions?.toString()||'',reading_correct:row.reading_correct?.toString()||'',
   writing_observations:row.writing_observations||'',speaking_observations:row.speaking_observations||'',tutor_next_steps:row.tutor_next_steps||''
  });
 }
 async function review(){
  if(!selected||!staff||!tenant||busy)return;
  const n=Object.fromEntries(fields.map(f=>[f,Number(assessment[f])])) as Record<ScoreField,number>;
  for(const pair of [['listening_questions','listening_correct'],['reading_questions','reading_correct']] as const){
   if(!isCount(n[pair[0]],1,40)||!isCount(n[pair[1]],0,n[pair[0]]))
    return setError('Raw correct-answer count must be between zero and the recorded number of questions (1–40).');
  }
  if(selected.rehearsal_type==='full_rehearsal' && (n.listening_questions!==40||n.reading_questions!==40
    ||assessment.writing_observations.trim().length<10||assessment.speaking_observations.trim().length<10)){
    return setError('A full rehearsal requires 40-question Listening and Reading papers, plus observed Writing and Speaking feedback. Use short practice otherwise.');
  }
  if(assessment.tutor_next_steps.trim().length<10)return setError('Provide actionable tutor recommendations.');
  setBusy(true);setError('');
  try{
   const r=await db.from('ielts_mock_rehearsals').update({
    status:'reviewed',...n,
    writing_observations:assessment.writing_observations.trim()||null,
    speaking_observations:assessment.speaking_observations.trim()||null,
    tutor_next_steps:assessment.tutor_next_steps.trim()
   }).eq('tenant_id',tenant).eq('id',selected.id);
   if(r.error)throw r.error;
   setSelected(null);await reload();
  }catch(e){setError(e instanceof Error?e.message:'Could not save the human assessment.');}
  finally{setBusy(false);}
 }
 return <section className="surface-card p-5 space-y-5" aria-label="IELTS mock rehearsal scheduler and progress">
  <div className="flex justify-between items-start gap-3 flex-wrap">
   <div><h2 className="font-semibold flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary"/>IELTS mock rehearsal centre</h2>
    <p className="text-sm text-muted-foreground mt-1">Tutor-led practice scheduling and recorded raw results. Full rehearsal means four skills were actually attempted, including 40 Listening and 40 Reading questions. None of these are official IELTS exams or scores.</p></div>
   <Button size="sm" variant="outline" disabled={loading||busy} onClick={()=>void reload()}><RefreshCcw className="w-4 h-4 mr-1"/>Refresh</Button>
  </div>
  {scheduler&&<form onSubmit={e=>void schedule(e)} className="rounded-xl bg-secondary/40 p-4 space-y-3">
    <p className="font-semibold text-sm">Schedule a preparation rehearsal</p>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="text-xs font-semibold">Registered student
      <select className="bg-background border rounded-md p-2 w-full mt-1" required value={form.student_id}
       onChange={e=>setForm(v=>({...v,student_id:e.target.value}))}>
       <option value="">Choose registered learner</option>
       {students.map(s=><option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
      </select></label>
     <label className="text-xs font-semibold">Academic / General Training
      <select className="bg-background border rounded-md p-2 w-full mt-1" value={form.track} onChange={e=>setForm(v=>({...v,track:e.target.value as Mode}))}>
       <option value="academic">Academic</option><option value="general">General Training</option>
      </select></label>
     <label className="text-xs font-semibold">Rehearsal format
      <select className="bg-background border rounded-md p-2 w-full mt-1" value={form.rehearsal_type} onChange={e=>setForm(v=>({...v,rehearsal_type:e.target.value as PracticeType}))}>
       <option value="short_practice">Short original practice</option><option value="full_rehearsal">Full-length supervised rehearsal</option>
      </select></label>
     <label className="text-xs font-semibold">Delivery mode
      <select className="bg-background border rounded-md p-2 w-full mt-1" value={form.delivery} onChange={e=>setForm(v=>({...v,delivery:e.target.value as 'centre'|'online'}))}>
       <option value="online">Live online</option><option value="centre">In centre</option>
      </select></label>
     <label className="text-xs font-semibold">Date and time
       <Input className="mt-1" required type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(v=>({...v,scheduled_at:e.target.value}))}/>
     </label>
    </div>
    <Button type="submit" disabled={busy}><CalendarDays className="w-4 h-4 mr-2"/>Schedule mock rehearsal</Button>
   </form>}
  {error&&<p className="text-sm text-destructive" role="alert">{error}</p>}
  {loading?<p role="status" className="text-sm">Loading mock schedules…</p>:
   rows.length?<div className="space-y-2">{rows.map(r=><div key={r.id} className="rounded-xl border p-3 space-y-2">
     <div className="flex justify-between gap-3 flex-wrap">
      <div><p className="font-semibold text-sm">{staff?byStudent.get(r.student_id)||'Student '+r.student_id.slice(0,8):'My preparation session'}</p>
       <p className="text-xs text-muted-foreground">{r.rehearsal_type==='full_rehearsal'?'Full supervised rehearsal':'Short original practice'} · {r.track} · {r.delivery} · {new Date(r.scheduled_at).toLocaleString()}</p>
      </div>
      <span className="rounded-full px-3 py-1 text-xs bg-secondary self-start">{r.status.replace('_',' ')}</span>
     </div>
     {r.status==='reviewed'&&<div className="text-sm space-y-2">
      <p>Listening: {r.listening_correct}/{r.listening_questions} · Reading: {r.reading_correct}/{r.reading_questions} — raw practice counts only</p>
      {r.writing_observations&&<p><strong>Writing:</strong> {r.writing_observations}</p>}
      {r.speaking_observations&&<p><strong>Speaking:</strong> {r.speaking_observations}</p>}
      <p><strong>Next practice steps:</strong> {r.tutor_next_steps}</p>
     </div>}
     {staff&&r.status==='scheduled'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void start(r)}>Start rehearsal</Button>}
     {staff&&r.status==='in_progress'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>choose(r)}>Record supervised result</Button>}
   </div>)}</div>:
   <p className="text-sm text-muted-foreground">No mock rehearsals have been scheduled for these students.</p>}
  {selected&&<div className="rounded-xl border p-4 space-y-3">
    <h3 className="font-semibold">Record actual observed practice — {selected.rehearsal_type.replace('_',' ')}</h3>
    <div className="grid gap-3 sm:grid-cols-4">
     {fields.map(field=><label className="text-xs font-semibold" key={field}>{field.replace('_',' ')}
      <Input type="number" min="0" max="40" step="1" className="mt-1" value={assessment[field]}
       onChange={e=>setAssessment(v=>({...v,[field]:e.target.value}))}/>
     </label>)}
    </div>
    {(['writing_observations','speaking_observations','tutor_next_steps'] as const).map(field=><label key={field} className="text-sm font-semibold block">{field.replace(/_/g,' ')}
       <Textarea rows={3} maxLength={5000} className="mt-1" value={assessment[field]}
        onChange={e=>setAssessment(v=>({...v,[field]:e.target.value}))}/>
     </label>)}
    <div className="flex gap-2 flex-wrap">
     <Button disabled={busy} onClick={()=>void review()}>Save human review</Button>
     <Button variant="outline" disabled={busy} onClick={()=>setSelected(null)}>Cancel</Button>
    </div>
  </div>}
  <p className="text-xs text-muted-foreground">A valid official IELTS result is issued by authorised test providers only. UniPathway preparation scores do not establish university eligibility.</p>
 </section>;
}
