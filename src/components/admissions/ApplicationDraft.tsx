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
const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export default function ApplicationDraft({kind}:{kind:Kind}) {
 const {user}=useAuth();
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [ready,setReady]=useState(false);
 const [saving,setSaving]=useState(false);
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
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
 async function save(){
  if(!id||!tenant||!ready||saving)return;
  setSaving(true);
  try{
   const {error}=await (supabase.from as any)('onboarding_application_drafts').upsert({user_id:id,tenant_id:tenant,kind,answers,updated_at:new Date().toISOString()},{onConflict:'user_id,tenant_id,kind'});
   if(error)throw error;
   toast.success('Application draft saved. Verification and approval are separate.');
  }catch{toast.error('Unable to save application. Please try again.');}finally{setSaving(false);}
 }
 return <section className="surface-card p-5 mb-6 space-y-4">
  <h2 className="text-lg font-semibold">{kind==='lecturer'?'Part-time teaching application':'Student application'}</h2>
  <p className="text-sm text-muted-foreground">Save your details securely. Upload identity and qualification evidence separately below. Do not enter passwords, CNIC numbers or biometric information in these fields.</p>
  {kind==='lecturer'&&<p className="text-sm font-medium">All appointments are part-time, including online and classroom teaching.</p>}
  {!tenant?<p>A centre-linked account is required.</p>:failed?<div role="alert">Unable to load your application. <Button onClick={()=>setRetry(v=>v+1)}>Retry</Button></div>:!ready?<p role="status">Loading application…</p>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();void save();}}>
   <div className="grid gap-4 md:grid-cols-2">{fields[kind].map(field=><label key={field} className="text-sm font-medium space-y-1 block">{field}<textarea rows={2} maxLength={1000} className="w-full rounded-md border bg-background p-2" value={answers[field]||''} onChange={e=>setAnswers(a=>({...a,[field]:e.target.value}))}/></label>)}</div>
   <fieldset className="space-y-2"><legend className="font-semibold">Weekly availability (include time zone)</legend><div className="grid gap-3 sm:grid-cols-2">{days.map(day=><label key={day} className="text-sm block">{day}<input maxLength={150} className="w-full rounded-md border bg-background p-2" placeholder="09:00–12:00 or unavailable" value={answers[day]||''} onChange={e=>setAnswers(a=>({...a,[day]:e.target.value}))}/></label>)}</div></fieldset>
   <Button type="submit" disabled={saving}>{saving?'Saving…':'Save application draft'}</Button>
  </form>}
 </section>;
}
