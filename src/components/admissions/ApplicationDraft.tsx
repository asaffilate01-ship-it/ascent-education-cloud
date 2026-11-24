import ApplicationStatus from '@/components/admissions/ApplicationStatus';
import {db} from '@/lib/db';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Kind = 'student' | 'lecturer';
const common = ['Full legal name','Email','Phone','WhatsApp','Location / address','Study or teaching mode (online / classroom / both)','Internet provision and reliability','Laptop or computer access','Classroom travel arrangements','Subjects and levels','Reference name and contact'];
const fields = {
 lecturer: [...common,'Education and qualifications','Teaching and industry experience','English fluency and other languages','Technology and teaching skills','Maximum level per subject','Maximum weekly teaching hours','Expected hourly or session rate','Other employment commitments','Earliest start date'],
 student: [...common,'Date of birth / age','Responsible parent or guardian (if applicable)','Guardian phone and WhatsApp','Guardian email','Current or last school / college','Current grade / year and board','Previous qualifications and results','Programme type (tuition, IELTS, ACCA, technology, levels 2–6, other)','Subject strengths','Subject weaknesses','Target results','Future study or career plans','Classroom laptop: own or centre provided','Emergency contact'],
};
const competencyFields=['Subject','Curriculum / awarding body','Maximum level / grade','Relevant qualification or experience'];
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default function ApplicationDraft({kind}:{kind:Kind}) {
 const {user}=useAuth();
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [ready,setReady]=useState(false);
 const [saving,setSaving]=useState(false);
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 const [statusRevision,setStatusRevision]=useState(0);
 const id=user?.id, tenant=user?.tenantId;
 useEffect(()=>{
  let active=true; setReady(false); setFailed(false); setAnswers({});
  if(!id||!tenant)return;
  void (async()=>{
   const {data,error}=await (supabase.from as any)('onboarding_application_drafts').select('answers').eq('user_id',id).eq('tenant_id',tenant).eq('kind',kind).maybeSingle();
   if(!active)return;
   if(error){setFailed(true);return;}
   setAnswers(data?.answers||{});setReady(true);
  })().catch(()=>{if(active)setFailed(true);});
  return ()=>{active=false;};
 },[id,tenant,kind,retry]);
 async function save(submit=false){
  if(!id||!tenant||!ready||saving)return;
  if(kind==='lecturer'&&Array.from({length:20},(_,i)=>i+1).some(i=>competencyFields.some(f=>answers['Competency '+i+' — '+f]?.trim())&&(!answers['Competency '+i+' — Subject']?.trim()||!answers['Competency '+i+' — Maximum level / grade']?.trim()))){toast.error('Enter both subject and maximum level for each teaching competency.');return;}
  if(submit&&(!answers['Full legal name']?.trim()||!answers['Email']?.trim())){toast.error('Name and email are required to submit.');return;}
  setSaving(true);
  try{
   const {error}=await (supabase.from as any)('onboarding_application_drafts').upsert({user_id:id,tenant_id:tenant,kind,answers,updated_at:new Date().toISOString()},{onConflict:'user_id,tenant_id,kind'});
   if(error)throw error;
   if(submit){const result=await db.rpc('record_onboarding_application_event',{p_user:id,p_kind:kind,p_snapshot:answers,p_action:'submitted',p_note:''});if(result.error)throw Error();toast.success('Application submitted for screening.');}else toast.success('Application draft saved. Verification and approval are separate.');
  }catch{toast.error('Unable to complete the requested action. Your draft may have been saved; please retry.');}finally{setSaving(false);setStatusRevision(v=>v+1);}
 }
 return <section className="surface-card p-5 mb-6 space-y-4">
  <h2 className="text-lg font-semibold">{kind==='lecturer'?'Part-time teaching application':'Student application'}</h2>
  <p className="text-sm text-muted-foreground">Save your details securely. Upload identity and qualification evidence separately below. Do not enter passwords, CNIC numbers or biometric information in these fields.</p>
  {kind==='lecturer'&&<p className="text-sm font-medium">All appointments are part-time, including online and classroom teaching.</p>}
  {id&&tenant&&ready&&<ApplicationStatus key={id+':'+tenant+':'+kind} userId={id} kind={kind} revision={statusRevision}/>}
  {!tenant?<p>A centre-linked account is required.</p>:failed?<div role="alert">Unable to load your application. <Button onClick={()=>setRetry(v=>v+1)}>Retry</Button></div>:!ready?<p role="status">Loading application…</p>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void save();}}>
   <div className="grid gap-4 md:grid-cols-2">{fields[kind].map(field=><label key={field} className="text-sm font-medium space-y-1 block">{field}<textarea rows={2} maxLength={1000} className="w-full rounded-md border bg-background p-2" value={answers[field]||''} onChange={e=>setAnswers(a=>({...a,[field]:e.target.value}))}/></label>)}</div>
   {kind==='lecturer'&&<fieldset className="space-y-3"><legend className="font-semibold">Subject-by-subject teaching competencies</legend><p className="text-sm text-muted-foreground">Declare the maximum level for each subject separately. These are self-reported, not approved teaching permissions. Include the examination board or qualification framework (e.g. Punjab Board, Cambridge, OTHM, ACCA).</p>{Array.from({length:20},(_,i)=>i).filter(i=>i===0||competencyFields.some(f=>answers['Competency '+(i+1)+' — '+f])||answers['Competency '+(i+1)+' — added']==='yes').map(i=><div key={i} className="rounded-lg border p-3 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2 flex justify-between items-center"><h3 className="font-medium">Subject {i+1}</h3><Button type="button" variant="outline" onClick={()=>setAnswers(a=>Object.fromEntries(Object.entries(a).filter(([key])=>!key.startsWith('Competency '+(i+1)+' — '))))}>Clear subject</Button></div>{competencyFields.map(f=>{const key='Competency '+(i+1)+' — '+f;return <label key={key} className="text-sm block">{f}<input maxLength={200} className="w-full rounded-md border bg-background p-2" value={answers[key]||''} onChange={e=>setAnswers(a=>({...a,[key]:e.target.value}))}/></label>;})}</div>)}<Button type="button" variant="outline" disabled={Array.from({length:19},(_,i)=>i+1).every(i=>competencyFields.some(f=>answers['Competency '+(i+1)+' — '+f])||answers['Competency '+(i+1)+' — added']==='yes')} onClick={()=>setAnswers(a=>{const next=Array.from({length:19},(_,i)=>i+1).find(i=>!competencyFields.some(f=>a['Competency '+(i+1)+' — '+f])&&a['Competency '+(i+1)+' — added']!=='yes');return next===undefined?a:{...a,['Competency '+(next+1)+' — added']:'yes'};})}>Add another subject</Button></fieldset>}
   <fieldset className="space-y-2"><legend className="font-semibold">Weekly availability (include time zone)</legend><div className="grid gap-3 sm:grid-cols-2">{days.map(day=><label key={day} className="text-sm block">{day}<input maxLength={150} className="w-full rounded-md border bg-background p-2" placeholder="09:00–12:00 or unavailable" value={answers[day]||''} onChange={e=>setAnswers(a=>({...a,[day]:e.target.value}))}/></label>)}</div></fieldset>
   <div className="flex flex-wrap gap-2"><Button type="submit" variant="outline" disabled={saving}>{saving?'Saving…':'Save application draft'}</Button><Button type="button" disabled={saving} onClick={()=>void save(true)}>Submit for screening</Button></div>
  </form>}
 </section>;
}
