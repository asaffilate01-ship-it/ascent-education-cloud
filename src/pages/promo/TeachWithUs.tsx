import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import PublicHero from '@/components/PublicHero';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import TurnstileChallenge from '@/components/enquiry/TurnstileChallenge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {supabase} from '@/integrations/supabase/client';
import {PUBLIC_MESSAGE_ROUTING_ENABLED,verifyPublicMessageReceipt,publicMessageStatus} from '@/lib/publicMessageDelivery';
import {waRecruitmentUrl} from '@/lib/publicContact';

const empty={name:'',email:'',phone:'',role:'Tutor',mode:'Online',subjects:'',qualifications:'',availability:'',message:''};
const selectClass='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2';
export default function TeachWithUs(){
 const [draft,setDraft]=useState(empty);
 const [privacy,setPrivacy]=useState(false),[captcha,setCaptcha]=useState(''),[revision,setRevision]=useState(0);
 const [attempt,setAttempt]=useState<{id:string;retry:boolean}|null>(null);
 const [busy,setBusy]=useState(false),[status,setStatus]=useState<{kind:'error'|'recorded';text:string}|null>(null);
 const lock=useRef(false),alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 function field(key:keyof typeof empty,value:string){setDraft(old=>({...old,[key]:value}));}
 async function submit(event:FormEvent){
  event.preventDefault();
  if(!PUBLIC_MESSAGE_ROUTING_ENABLED||!privacy||!captcha||lock.current||attempt?.retry===false)return;
  lock.current=true;setBusy(true);setStatus(null);
  try{
   const command=attempt??{id:crypto.randomUUID(),retry:true};setAttempt(command);
   const {data,error}=await supabase.functions.invoke('unipathway-public-message',{body:{...draft,tenant_slug:'unipathway',channel:'recruitment',request_id:command.id,privacy_acknowledged:true,captcha_token:captcha}});
   if(!alive.current)return;
   if(error)throw Error();
   const receipt=verifyPublicMessageReceipt(data,command.id,'recruitment');
   setStatus({kind:'recorded',text:publicMessageStatus(receipt,'recruitment')});
   if(receipt.complete){setDraft(empty);setAttempt(null);setPrivacy(false);}
   else setAttempt({...command,retry:receipt.retryAvailable});
  }catch{if(alive.current)setStatus({kind:'error',text:'Your message could not be confirmed. Keep the reference and retry the same request after another security check, or email jobs@unipathway.pk.'});}
  finally{lock.current=false;if(alive.current){setBusy(false);setCaptcha('');setRevision(n=>n+1);}}
 }
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/teach-with-us" title="Teach with UniPathway | Tutor and Lecturer Enquiries" description="Express your interest in part-time online, hybrid and in-class tuition and teaching opportunities at UniPathway in Pakistan."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8">
   <PublicHero topic="careers"><p className="text-label text-success">Teaching and tutoring</p><h1 className="mt-3 text-3xl font-bold sm:text-5xl">Teach with UniPathway.</h1><p className="mt-4 text-muted-foreground">We welcome expressions of interest from qualified part-time tutors and lecturers for online, hybrid and in-class teaching in Jhelum. All appointments depend on verified qualifications, safeguarding, references and agreed teaching arrangements.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><a href="#teaching-enquiry">Express teaching interest</a></Button><Button asChild variant="outline"><a href="mailto:jobs@unipathway.pk">Email recruitment</a></Button></div></PublicHero>
   <section className="grid gap-3 sm:grid-cols-3" aria-label="Teaching delivery modes">{[['Online','Teach learners across Pakistan using approved online learning tools.'],['Hybrid','Combine remote teaching with agreed sessions at our Jhelum centre.'],['In-class (Jhelum)','Deliver scheduled face-to-face tuition and practical learning.']].map(([title,copy])=><article key={title} className="rounded-xl border bg-card p-4"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{copy}</p></article>)}</section>
   <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" aria-labelledby="teaching-enquiry-title" id="teaching-enquiry">
    <aside className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Recruitment enquiries</h2><p className="text-sm text-muted-foreground">Tell us your subject areas, qualifications, teaching experience and availability. We will review your enquiry, not automatically create an account or offer employment.</p><a className="inline-flex min-h-11 items-center break-all text-sm font-medium underline" href="mailto:jobs@unipathway.pk">jobs@unipathway.pk</a>{waRecruitmentUrl&&<a className="block min-h-11 break-words text-sm font-medium underline" href={waRecruitmentUrl} target="_blank" rel="noopener noreferrer">WhatsApp: +92 309 073 7000</a>}<Link to="/contact" className="inline-flex min-h-11 items-center text-sm underline">Looking for a course instead? Contact admissions</Link></aside>
    <form className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:p-6" onSubmit={submit} aria-busy={busy}><h2 id="teaching-enquiry-title" className="text-xl font-semibold">Tutor and lecturer expression of interest</h2>
     {!PUBLIC_MESSAGE_ROUTING_ENABLED&&<p role="status" className="rounded-lg border p-3 text-sm">The secure online recruitment form is being activated. Please email <a href="mailto:jobs@unipathway.pk" className="font-semibold underline">jobs@unipathway.pk</a> with your subjects and preferred delivery mode.</p>}
     {status&&<p role={status.kind==='error'?'alert':'status'} className="rounded-lg border p-3 text-sm">{status.text}</p>}
     {attempt&&<p className="break-all rounded-lg border p-3 text-xs">Request reference: {attempt.id}. Original details remain locked until the result is reconciled.</p>}
     <fieldset disabled={busy||!!attempt||!PUBLIC_MESSAGE_ROUTING_ENABLED} className="min-w-0 grid gap-4 sm:grid-cols-2"><legend className="sr-only">Teaching enquiry details</legend>
      <label className="block min-w-0 text-sm font-medium">Full name<Input className="mt-1 min-h-11" required minLength={2} maxLength={200} autoComplete="name" value={draft.name} onChange={e=>field('name',e.target.value)}/></label>
      <label className="block min-w-0 text-sm font-medium">Personal email<Input className="mt-1 min-h-11" required type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={e=>field('email',e.target.value)}/></label>
      <label className="block min-w-0 text-sm font-medium">Phone / WhatsApp<Input className="mt-1 min-h-11" type="tel" maxLength={35} autoComplete="tel" value={draft.phone} onChange={e=>field('phone',e.target.value)}/></label>
      <label className="block min-w-0 text-sm font-medium">Teaching role<select className={selectClass} value={draft.role} onChange={e=>field('role',e.target.value)}>{['Tutor','Lecturer','Both / flexible'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="block min-w-0 text-sm font-medium">Preferred teaching mode<select className={selectClass} value={draft.mode} onChange={e=>field('mode',e.target.value)}>{['Online','Hybrid','In-class (Jhelum)','Flexible'].map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="block min-w-0 text-sm font-medium">Subjects / levels<Input className="mt-1 min-h-11" required minLength={2} maxLength={200} value={draft.subjects} onChange={e=>field('subjects',e.target.value)} placeholder="e.g. Mathematics, ACCA, IELTS"/></label>
      <label className="block min-w-0 text-sm font-medium">Relevant qualifications<Input className="mt-1 min-h-11" required minLength={2} maxLength={300} value={draft.qualifications} onChange={e=>field('qualifications',e.target.value)}/></label>
      <label className="block min-w-0 text-sm font-medium">Part-time availability<Input className="mt-1 min-h-11" required minLength={2} maxLength={240} value={draft.availability} onChange={e=>field('availability',e.target.value)} placeholder="Days and preferred times (PKT)"/></label>
      <label className="block min-w-0 text-sm font-medium sm:col-span-2">Teaching experience and message<textarea className={selectClass} required minLength={10} maxLength={5000} rows={5} value={draft.message} onChange={e=>field('message',e.target.value)}/></label>
     </fieldset>
     <p className="text-xs leading-relaxed text-muted-foreground">Do not submit CVs, CNICs, bank details, passwords or student records in this form. The recruitment team will request any necessary documents through an approved process.</p>
     {PUBLIC_MESSAGE_ROUTING_ENABLED&&<><label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" required checked={privacy} disabled={busy} onChange={e=>setPrivacy(e.target.checked)} className="mt-1 size-4 shrink-0"/><span>I have read the <Link to="/privacy" className="font-semibold underline">privacy notice</Link> and understand that my details will be used to respond to my recruitment enquiry.</span></label><TurnstileChallenge onToken={setCaptcha} resetSignal={revision}/>{!import.meta.env.VITE_TURNSTILE_SITE_KEY&&<p role="status" className="text-sm">Security verification is not configured. Use the recruitment email above.</p>}<Button className="min-h-11 w-full sm:w-auto" type="submit" disabled={busy||!privacy||!captcha||attempt?.retry===false}>{busy?'Recording enquiry…':attempt?'Retry same enquiry':'Send teaching enquiry'}</Button></>}
    </form>
   </section>
  </main><PublicFooter/>
 </div>;
}
