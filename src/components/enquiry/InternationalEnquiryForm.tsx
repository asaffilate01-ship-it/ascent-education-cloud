import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TurnstileChallenge from '@/components/enquiry/TurnstileChallenge';

const destinations=['UK','USA','Canada','Australia','Germany','Pakistan'];
type Kind='ielts'|'university';
type Form={
 name:string;email:string;phone:string;student_origin:'current_student'|'external_student';
 destination:string;test_type:'academic'|'general'|'unsure';
 prior_qualification:'OTHM'|'Qualifi'|'Direct entry'|'Unsure';
 message:string;consent:boolean;
};
const initial:Form={
 name:'',email:'',phone:'',student_origin:'external_student',destination:'UK',
 test_type:'unsure',prior_qualification:'Unsure',message:'',consent:false,
};

export default function InternationalEnquiryForm({kind,defaultDestination,defaultUniversity,defaultQualification}:{kind:Kind;defaultDestination?:string;defaultUniversity?:string;defaultQualification?:'OTHM'|'Qualifi'}){
 const [form,setForm]=useState<Form>(initial);
 useEffect(()=>{if(defaultDestination && destinations.includes(defaultDestination))setForm(prev=>({...prev,destination:defaultDestination}));},[defaultDestination]);
 useEffect(()=>{if(defaultQualification)setForm(prev=>({...prev,prior_qualification:defaultQualification}));},[defaultQualification]);
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [error,setError]=useState('');
 const [captchaToken,setCaptchaToken]=useState('');
 const [captchaRefresh,setCaptchaRefresh]=useState(0);
 const update=<K extends keyof Form>(key:K,value:Form[K])=>setForm(prev=>({...prev,[key]:value}));
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setError('');
  if(!form.consent)return setError('Please read and acknowledge the privacy notice.');
  if(!captchaToken)return setError('Complete the security verification first.');
  if(form.name.trim().length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())){
    return setError('Please enter your name and a valid email address.');
  }
  setBusy(true);
  try{
    const result=await supabase.functions.invoke('unipathway-public-enquiry',{
      body:{
        kind,tenant_slug:'unipathway',name:form.name.trim(),email:form.email.trim(),
        phone:form.phone.trim(),student_origin:form.student_origin,
        destination:form.destination,test_type:form.test_type,
        prior_qualification:form.prior_qualification,message:(defaultUniversity ? `University of interest: ${defaultUniversity}.\n` : '')+form.message.trim(),consent:form.consent,
        captcha_token:captchaToken,
      }
    });
    if(result.error||!result.data?.ok)throw new Error(result.data?.error||'Enquiry service unavailable. Please try again.');
    setSent(true);
  }catch(e){setError(e instanceof Error?e.message:'Could not send your enquiry; please retry.');}
  finally{setCaptchaToken('');setCaptchaRefresh(n=>n+1);setBusy(false);}
 }
 const university=kind==='university';
 return <section id={university?'progression-enquiry':'ielts-enquiry'} className="surface-card p-5 sm:p-7 space-y-4 scroll-mt-12" aria-label={university?'University admissions enquiry':'IELTS preparation enquiry'}>
  {sent?<div className="py-8 text-center space-y-3" role="status">
    <CheckCircle2 className="w-12 h-12 text-success mx-auto"/>
    <h3 className="font-bold text-xl">Enquiry received</h3>
    <p className="text-sm text-muted-foreground">Your enquiry has been saved for the UniPathway admissions team. A counsellor can discuss the next steps; no booking or university admission has been confirmed.</p>
    <Button type="button" variant="outline" onClick={()=>{setForm(initial);setSent(false);setError('');setCaptchaToken('');setCaptchaRefresh(n=>n+1);}}>Send another enquiry</Button>
  </div>:<>
    <div>
      <p className="text-xs uppercase font-bold tracking-widest text-primary">Speak to our admissions team</p>
      <h3 className="text-2xl font-semibold mt-2">{university?'Explore university progression':'Enquire about IELTS preparation'}</h3>
      <p className="text-sm text-muted-foreground mt-1">Available to current UniPathway learners and applicants from outside the college in Pakistan. Sending an enquiry does not commit you to a course or paid service.</p>
      {university && defaultUniversity && <p className="mt-2 text-sm font-semibold text-success">Requesting a progression review for {defaultUniversity}.</p>}
    </div>
    <form onSubmit={e=>void submit(e)} className="grid md:grid-cols-2 gap-4">
      <label className="text-sm font-semibold">Full name *
        <Input className="mt-1" autoComplete="name" required maxLength={200} value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Your name"/>
      </label>
      <label className="text-sm font-semibold">Email address *
        <Input className="mt-1" autoComplete="email" type="email" required maxLength={254} value={form.email} onChange={e=>update('email',e.target.value)} placeholder="you@example.com"/>
      </label>
      <label className="text-sm font-semibold">Phone / WhatsApp (optional)
        <Input className="mt-1" autoComplete="tel" type="tel" maxLength={35} value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="+92 …"/>
      </label>
      <label className="text-sm font-semibold">Your learner status
        <select className="mt-1 block w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.student_origin} onChange={e=>update('student_origin',e.target.value as Form['student_origin'])}>
          <option value="external_student">New / external student</option>
          <option value="current_student">Current UniPathway student</option>
        </select>
      </label>
      {university?<><label className="text-sm font-semibold">Destination country
        <select className="mt-1 block w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.destination} onChange={e=>update('destination',e.target.value)}>
          {destinations.map(country=><option value={country} key={country}>{country}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Current or intended qualification
        <select className="mt-1 block w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.prior_qualification} onChange={e=>update('prior_qualification',e.target.value as Form['prior_qualification'])}>
          {['OTHM','Qualifi','Direct entry','Unsure'].map(x=><option key={x} value={x}>{x}</option>)}
        </select>
      </label></>:<label className="text-sm font-semibold">IELTS test type
        <select className="mt-1 block w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.test_type} onChange={e=>update('test_type',e.target.value as Form['test_type'])}>
          <option value="unsure">I need guidance</option><option value="academic">Academic</option><option value="general">General Training</option>
        </select>
      </label>}
      <label className="text-sm font-semibold md:col-span-2">What would you like help with?
        <Textarea rows={3} className="mt-1" maxLength={1800} value={form.message} onChange={e=>update('message',e.target.value)} placeholder={university?'Tell us your qualifications, subject or intended intake.':'Tell us your English level, goals or preferred class schedule.'}/>
      </label>
      <label className="md:col-span-2 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 accent-primary" required checked={form.consent} onChange={e=>update('consent',e.target.checked)}/>
        <span>I have read the <Link to="/privacy" className="underline text-primary">Privacy Policy</Link> and agree to UniPathway using these details to respond to my enquiry. I understand the service cannot guarantee an IELTS band score, a university place or a visa.</span>
      </label>
      <TurnstileChallenge onToken={setCaptchaToken} resetSignal={captchaRefresh}/>
      {error&&<p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
      <div className="md:col-span-2"><Button type="submit" disabled={busy||!captchaToken}>{busy?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<Send className="w-4 h-4 mr-2"/>} {busy?'Sending…':'Request counselling'}</Button></div>
    </form>
  </>}
 </section>;
}
