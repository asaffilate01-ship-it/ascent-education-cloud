import TeachingCompetencyStatus from '@/components/admissions/TeachingCompetencyStatus';
import ApplicationStatus from '@/components/admissions/ApplicationStatus';
import {db} from '@/lib/db';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {applicationSections,applicationDays,applicationValidation,applicationHasChanges,applicationSectionAnswers,competencyFields,competencyKey,hasCompetency,type ApplicationKind} from '@/lib/applicationSections';
const input='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base disabled:opacity-70';
const shortFields=new Set(['Full legal name','Email','Phone','WhatsApp','Guardian phone and WhatsApp','Guardian email','Date of birth / age','Current or last school / college','Current grade / year and board','Maximum weekly teaching hours','Expected hourly or session rate','Earliest start date']);
export default function ApplicationDraft({kind}:{kind:ApplicationKind}){
 const {user}=useAuth();
 return <DraftForm key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(','),kind].join(':')} kind={kind}/>;
}
function DraftForm({kind}:{kind:ApplicationKind}){
 const {user}=useAuth();
 const [savedAnswers,setSavedAnswers]=useState<Record<string,string>>({}),[answers,setAnswers]=useState<Record<string,string>>({});
 const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[statusRevision,setStatusRevision]=useState(0);
 const [step,setStep]=useState(0),[message,setMessage]=useState(''),[saveError,setSaveError]=useState('');
 const heading=useRef<HTMLHeadingElement>(null),alive=useRef(true),lock=useRef(false),focusNext=useRef(false);
 const id=user?.id,tenant=user?.tenantId;
 const sections=applicationSections[kind],section=sections[step];
 const dirty=applicationHasChanges(answers,savedAnswers);
 const update=(key:string,value:string)=>setAnswers(old=>({...old,[key]:value}));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(focusNext.current){heading.current?.focus();focusNext.current=false;}},[step]);
 useEffect(()=>{
  let active=true;setReady(false);setFailed(false);setAnswers({});setSavedAnswers({});
  if(!id||!tenant)return;
  void(async()=>{
   const {data,error}=await (supabase.from as any)('onboarding_application_drafts').select('answers').eq('user_id',id).eq('tenant_id',tenant).eq('kind',kind).maybeSingle();
   if(!active)return;
   if(error){setFailed(true);return;}
   const clean=Object.fromEntries(Object.entries(data?.answers||{}).filter(([,v])=>typeof v==='string')) as Record<string,string>;
   setAnswers(clean);setSavedAnswers(clean);setReady(true);
  })().catch(()=>{if(active)setFailed(true);});
  return()=>{active=false;};
 },[id,tenant,kind,retry]);
 function go(next:number){if(next===step){heading.current?.focus();return;}focusNext.current=true;setStep(next);}
 async function save(submit=false){
  if(!id||!tenant||!ready||lock.current)return;
  setMessage('');setSaveError('');
  if(submit){const validation=applicationValidation(kind,answers);if(validation){setSaveError(validation.message);go(sections.findIndex(s=>s.id===validation.section));return;}}
  lock.current=true;setSaving(true);
  try{
   const {error}=await (supabase.from as any)('onboarding_application_drafts').upsert({user_id:id,tenant_id:tenant,kind,answers,updated_at:new Date().toISOString()},{onConflict:'user_id,tenant_id,kind'});
   if(error)throw error;
   if(!alive.current)return;
   setSavedAnswers(answers);
   if(submit){
    const result=await db.rpc('record_onboarding_application_event',{p_user:id,p_kind:kind,p_snapshot:answers,p_action:'submitted',p_note:''});
    if(result.error)throw Error();
    if(alive.current){setMessage('Application submitted for screening.');toast.success('Application submitted for screening.');}
   }else{setMessage('Application draft saved.');toast.success('Application draft saved. Verification and approval are separate.');}
  }catch{if(alive.current)setSaveError('Unable to complete the requested action. Your draft may have been saved; please retry.');}
  finally{lock.current=false;if(alive.current){setSaving(false);setStatusRevision(v=>v+1);}}
 }
 const slots=Array.from({length:20},(_,i)=>i+1);
 const occupied=(slot:number)=>hasCompetency(answers,slot)||answers[competencyKey(slot,'added')]==='yes';
 const visibleSlots=slots.filter(slot=>slot===1||occupied(slot));
 return <section className="surface-card mb-6 min-w-0 space-y-4 p-3 sm:p-5">
  <div className="space-y-2"><h2 className="text-lg font-semibold">{kind==='lecturer'?'Part-time teaching application':'Student application'}</h2>
  <p className="text-sm leading-relaxed text-muted-foreground">Complete your details at your own pace. Upload identity and qualification evidence separately below. Do not enter passwords, CNIC numbers or biometric information in these fields.</p>
  {kind==='lecturer'&&<p className="text-sm font-medium">All appointments are part-time, including online and classroom teaching.</p>}</div>
  {id&&tenant&&ready&&<ApplicationStatus key={id+':'+tenant+':'+kind} userId={id} kind={kind} revision={statusRevision}/>}
  {kind==='lecturer'&&id&&tenant&&ready&&<TeachingCompetencyStatus tenantId={tenant} lecturerId={id} answers={savedAnswers} revision={statusRevision}/>}
  {!tenant?<p>A centre-linked account is required.</p>:failed?<div role="alert" className="space-y-2"><p>Unable to load your application.</p><Button type="button" onClick={()=>setRetry(v=>v+1)}>Retry</Button></div>:!ready?<p role="status">Loading application…</p>:<>
   <div className="flex flex-wrap justify-between gap-2 border-t pt-4 text-sm"><p className="font-semibold">Section {step+1} of {sections.length}</p><p className="text-muted-foreground">{dirty?'Unsaved changes':message||'No unsaved changes'}</p></div>
   <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary" style={{width:((step+1)/sections.length*100)+'%'}}/></div>
   <nav aria-label="Application sections" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{sections.map((s,i)=><button type="button" key={s.id} disabled={saving} onClick={()=>go(i)} aria-current={step===i?'step':undefined} className={'min-h-11 min-w-0 rounded-lg border px-3 py-2 text-left text-xs font-medium [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm '+(step===i?'border-primary bg-primary/10 text-foreground':'bg-card text-muted-foreground hover:bg-accent')}><span className="block">{i+1}. {s.title}</span></button>)}</nav>
   <form onSubmit={e=>{e.preventDefault();void save();}} className="space-y-4" aria-busy={saving}>
    <div className="rounded-xl border bg-card p-3 sm:p-5 space-y-4 min-w-0">
     <h3 ref={heading} tabIndex={-1} className="font-semibold text-lg focus:outline-none">{section.title}</h3><p className="text-sm text-muted-foreground">{section.description}</p>
     <fieldset disabled={saving} className="min-w-0 space-y-4">
      <legend className="sr-only">{section.title} fields</legend>
      {section.fields.length>0&&<div className="grid gap-4 md:grid-cols-2">{section.fields.map(field=><label key={field} className="min-w-0 block text-sm font-medium [overflow-wrap:anywhere]">{field}{(field==='Full legal name'||field==='Email')&&<span className="text-muted-foreground font-normal"> (required to submit)</span>}{shortFields.has(field)?<input className={input} maxLength={1000} inputMode={field.toLowerCase().includes('email')?'email':field.toLowerCase().includes('phone')||field.toLowerCase().includes('whatsapp')?'tel':'text'} value={answers[field]||''} onChange={e=>update(field,e.target.value)}/>:<textarea rows={3} maxLength={1000} className={input+' resize-y'} value={answers[field]||''} onChange={e=>update(field,e.target.value)}/>}</label>)}</div>}
      {section.id==='competencies'&&kind==='lecturer'&&<fieldset className="min-w-0 space-y-3"><legend className="font-semibold">Subject-by-subject teaching competencies</legend><p className="text-sm text-muted-foreground">Declarations are not approved teaching permissions. Include the examination board or qualification framework (e.g. Punjab Board, Cambridge, OTHM, ACCA).</p>
       {visibleSlots.map(slot=><div key={slot} className="grid gap-3 rounded-lg border p-3 md:grid-cols-2"><div className="flex flex-wrap justify-between items-center gap-2 md:col-span-2"><h4 className="font-medium">Subject {slot}</h4><Button type="button" className="min-h-11" variant="outline" onClick={()=>setAnswers(a=>Object.fromEntries(Object.entries(a).filter(([key])=>!key.startsWith('Competency '+slot+' — '))))}>Clear subject {slot}</Button></div>{competencyFields.map(field=>{const key=competencyKey(slot,field);return <label key={key} className="min-w-0 block text-sm"> {field}<input className={input} maxLength={200} value={answers[key]||''} onChange={e=>update(key,e.target.value)}/></label>;})}</div>)}
       <Button type="button" variant="outline" disabled={slots.slice(1).every(occupied)} onClick={()=>{const next=slots.slice(1).find(slot=>!occupied(slot));if(next)update(competencyKey(next,'added'),'yes');}}>Add another subject</Button></fieldset>}
      {section.id==='availability'&&<fieldset className="min-w-0 space-y-3"><legend className="font-semibold">Weekly availability (include time zone)</legend><label className="block text-sm">Availability timezone<select className={input} value={answers['Availability timezone']||''} onChange={e=>update('Availability timezone',e.target.value)}><option value="">Select timezone</option><option value="Asia/Karachi">Pakistan (PKT)</option><option value="other">Other — specify in daily notes</option></select></label><p className="text-xs text-muted-foreground">Use 24-hour ranges such as 09:00–12:00, 14:00–16:00 or unavailable. For other timezones, specify the zone in your daily notes.</p><div className="grid gap-3 sm:grid-cols-2">{applicationDays.map(day=><label className="block min-w-0 text-sm" key={day}>{day}<input className={input} maxLength={150} placeholder="09:00–12:00 or unavailable" value={answers[day]||''} onChange={e=>update(day,e.target.value)}/></label>)}</div></fieldset>}
      {section.id==='review'&&<div className="space-y-3">{sections.slice(0,-1).map((s,i)=>{const entries=applicationSectionAnswers(s,answers);return <section key={s.id} className="min-w-0 rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{s.title}</h4><Button type="button" variant="outline" onClick={()=>go(i)}>Edit {s.title}</Button></div>{entries.length?<dl className="mt-3 grid gap-3 md:grid-cols-2">{entries.map(([k,v])=><div key={k} className="min-w-0 [overflow-wrap:anywhere]"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-sm whitespace-pre-wrap">{v}</dd></div>)}</dl>:<p className="mt-2 text-sm text-muted-foreground">No details entered in this section.</p>}</section>;})}<p className="text-sm text-muted-foreground">Submitting requests screening only; it does not verify your documents or confirm an enrolment or appointment.</p></div>}
     </fieldset>
    </div>
    {saveError&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{saveError}</p>}
    {message&&!dirty&&<p role="status" className="text-sm font-medium">{message}</p>}
    <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-between">
     <div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" variant="outline" disabled={saving||step===0} onClick={()=>go(step-1)}>Previous</Button><Button type="submit" variant="outline" disabled={saving}>{saving?'Saving…':'Save draft'}</Button></div>
     {section.id==='review'?<Button type="button" disabled={saving} onClick={()=>void save(true)}>Submit for screening</Button>:<Button type="button" disabled={saving} onClick={()=>go(step+1)}>Continue to {sections[step+1].title}</Button>}
    </div>
   </form>
  </>}
 </section>;
}
