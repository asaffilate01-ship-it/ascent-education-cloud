import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {
 ANONYMOUS_EXPLANATION,CONFIDENTIAL_EXPLANATION,CRISIS_NOTICE,
 WELLBEING_CATEGORIES,WELLBEING_ENABLED,WELLBEING_ANONYMOUS_ENABLED,
 validateWellbeingRequest,type WellbeingPrivacy,
} from '@/lib/wellbeingRequests';

type MyRequest={id:string;category:string;status:string;created_at:string};
type WelfareReply={id:string;message:string;created_at:string};
// Reuse the existing global TurnstileAPI contract shared with the platform.

const categoryLabel=(value:string)=>WELLBEING_CATEGORIES.find(c=>c.value===value)?.label||'Wellbeing support';
export default function StudentWellbeing({anonymousOnly=false}:{anonymousOnly?:boolean}){
 const {user}=useAuth();
 return <WellbeingWorkspace key={[user?.id,user?.tenantId,user?.role,anonymousOnly].join(':')} anonymousOnly={anonymousOnly}/>;
}
function WellbeingWorkspace({anonymousOnly}:{anonymousOnly:boolean}){
 const {user}=useAuth();
 const student=!!user?.id&&!!user?.tenantId&&user.role==='student'&&user.roles?.includes('student');
 const [privacy,setPrivacy]=useState<WellbeingPrivacy>(anonymousOnly?'anonymous':'confidential');
 const [category,setCategory]=useState(''),[urgency,setUrgency]=useState('routine'),[details,setDetails]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const [records,setRecords]=useState<MyRequest[]>([]),[loadError,setLoadError]=useState(''),[refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState(''),[replies,setReplies]=useState<WelfareReply[]>([]),[replyError,setReplyError]=useState('');
 const [captcha,setCaptcha]=useState(''),[captchaError,setCaptchaError]=useState('');
 const captchaNode=useRef<HTMLDivElement>(null);
 const anonActive=WELLBEING_ANONYMOUS_ENABLED&&!!import.meta.env.VITE_UNIPATHWAY_TURNSTILE_SITE_KEY;
 const canSend=privacy==='anonymous'?anonActive:WELLBEING_ENABLED&&student;
 useEffect(()=>{
  let active=true;setRecords([]);setLoadError('');
  if(anonymousOnly||!student||!WELLBEING_ENABLED)return()=>{active=false;};
  void(async()=>{
   try{
    const {data,error:e}=await (supabase.rpc as any)('my_unipathway_welfare_requests');
    if(e||!Array.isArray(data))throw Error('Could not verify your private requests.');
    if(active)setRecords(data.filter((r:MyRequest)=>typeof r.id==='string'&&typeof r.status==='string'));
   }catch{if(active)setLoadError('Your support request history is currently unavailable. Please retry if needed.');}
  })();
  return()=>{active=false;};
 },[student,anonymousOnly,refresh]);
 useEffect(()=>{
  let active=true;setReplies([]);setReplyError('');
  if(!selected||!student||!WELLBEING_ENABLED)return()=>{active=false;};
  void(async()=>{
   try{
    const r=await (supabase.rpc as any)('my_unipathway_welfare_replies',{p_request:selected});
    if(r.error||!Array.isArray(r.data))throw Error('Private replies unavailable');
    if(active)setReplies(r.data.filter((x:WelfareReply)=>typeof x.id==='string'&&typeof x.message==='string'));
   }catch{if(active)setReplyError('Your private replies cannot be verified. Retry or contact the Welfare team directly.');}
  })();
  return()=>{active=false;};
 },[selected,student,refresh]);
 useEffect(()=>{
  if(privacy!=='anonymous'||!anonActive||!captchaNode.current)return;
  let active=true;let widget:string|undefined;const target=captchaNode.current;
  const draw=()=>{
   if(!active||!window.turnstile||widget!==undefined)return;
   widget=window.turnstile.render(target,{sitekey:String(import.meta.env.VITE_UNIPATHWAY_TURNSTILE_SITE_KEY),action:'student-wellbeing',
    callback:(token)=>{if(active){setCaptcha(token);setCaptchaError('');}},
    'expired-callback':()=>{if(active)setCaptcha('');},
    'error-callback':()=>{if(active){setCaptcha('');setCaptchaError('Human verification is unavailable. Please use a confidential request or contact the centre.');}},
   });
  };
  if(window.turnstile)draw();
  else{
   const script=document.createElement('script');
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
   script.async=true;script.onload=draw;
   document.head.appendChild(script);
   return()=>{active=false;if(widget!==undefined)window.turnstile?.remove(widget);script.remove();};
  }
  return()=>{active=false;if(widget!==undefined)window.turnstile?.remove(widget);};
 },[privacy,anonActive]);
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(busy||!canSend)return;
  const invalid=validateWellbeingRequest(category,details,urgency);
  if(invalid){setError(invalid);return;}
  setBusy(true);setError('');setSuccess('');
  try{
   if(privacy==='confidential'){
    if(!student)throw Error('A verified student login is required for confidential support.');
    const {data,error:e}=await (supabase.rpc as any)('submit_my_unipathway_welfare_request',{
     p_category:category,p_message:details.trim(),p_urgency:urgency,
    });
    if(e||!data||typeof data.id!=='string')throw Error('The centre did not confirm your request. Please check your private request list before retrying.');
    setSuccess('Your confidential request was recorded for the authorised Welfare team. This is not a live chat or emergency response.');
    setRefresh(x=>x+1);
   }else{
    if(!captcha)throw Error('Complete the anti-abuse verification before sending anonymously.');
    // Deliberately do not send a Supabase Auth JWT, student ID or browser session.
    // The separate backend is disabled until Turnstile, centre routing and staff
    // coverage have been independently activated.
    const base=String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
    const key=String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'');
    const response=await fetch(`${base}/functions/v1/unipathway-anonymous-welfare`,{
     method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',
     headers:{'content-type':'application/json',apikey:key},
     body:JSON.stringify({category,message:details.trim(),urgency,turnstileToken:captcha}),
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||result?.status!=='accepted')throw Error('Anonymous delivery was not confirmed. Please do not assume anyone received it. Try the centre’s other support channels.');
    setSuccess('Your anonymous message was accepted. It was not linked to your student account, and there is no reply or tracking facility. Please contact a person directly if you need a response.');
    setCaptcha('');
   }
   setDetails('');setCategory('');setUrgency('routine');
  }catch(e){setError(e instanceof Error?e.message:'Your message could not be confirmed.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Wellbeing, counselling and student help" subtitle="Private support for study, mental health, safety and personal difficulties">
  <div className="mx-auto max-w-4xl space-y-5">
   <section className="rounded-xl border bg-card p-5 space-y-2" aria-label="Urgent wellbeing guidance">
    <h2 className="font-semibold">Help is available beyond UniPathway</h2>
    <p className="text-sm">{CRISIS_NOTICE}</p>
    <p className="text-sm text-muted-foreground">You can also approach a trusted lecturer, centre administrator, qualified counsellor or health professional directly. Requesting help does not affect your academic marks.</p>
   </section>
   <section className="rounded-xl border bg-card p-5 space-y-4">
    <h2 className="text-lg font-semibold">Ask for support</h2>
    <p className="text-sm text-muted-foreground">You can ask about emotional wellbeing, stress, bullying, study difficulties, learning adjustments, money, housing, relationships or other challenges. A trained person should review requests; no AI makes counselling or safeguarding decisions.</p>
    {!anonymousOnly&&<fieldset className="space-y-2">
     <legend className="text-sm font-semibold">How would you like to make this request?</legend>
     <label className="flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm"><input type="radio" name="request-privacy" checked={privacy==='confidential'} onChange={()=>{setPrivacy('confidential');setError('');setSuccess('');}}/> Confidential: allow the Welfare team to contact me</label>
     <label className="flex min-h-11 items-start gap-3 rounded-lg border p-3 text-sm"><input type="radio" name="request-privacy" checked={privacy==='anonymous'} onChange={()=>{setPrivacy('anonymous');setError('');setSuccess('');}}/> Anonymous: do not include my student identity; I do not expect a reply</label>
    </fieldset>}
    <p className="rounded-lg border p-3 text-sm" role="note">{privacy==='anonymous'?ANONYMOUS_EXPLANATION:CONFIDENTIAL_EXPLANATION}</p>
    {!canSend?<p role="status" className="rounded-lg border p-3 text-sm">{privacy==='anonymous'?'Anonymous requests are not yet activated. The anti-abuse protection, anonymous server and staff review process must be verified before any messages can be accepted.':'Confidential support requests are not yet activated in the UniPathway database. Please contact your centre directly while setup is completed.'}</p>:<form onSubmit={submit} className="space-y-4">
     <label className="block text-sm font-medium">What do you need help with?
      <select required className="mt-2 block min-h-11 w-full rounded-lg border bg-background px-3" value={category} onChange={e=>setCategory(e.target.value)}>
       <option value="">Choose a support area</option>
       {WELLBEING_CATEGORIES.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}
      </select>
     </label>
     <fieldset className="space-y-2"><legend className="text-sm font-semibold">How soon would you like your message reviewed?</legend>
      <label className="mr-5 inline-flex min-h-11 items-center gap-2 text-sm"><input type="radio" checked={urgency==='routine'} onChange={()=>setUrgency('routine')}/> Routine</label>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="radio" checked={urgency==='soon'} onChange={()=>setUrgency('soon')}/> As soon as staff are available</label>
     </fieldset>
     <label className="block text-sm font-medium">What would you like the Welfare team to know?
      <Textarea className="mt-2" value={details} onChange={e=>setDetails(e.target.value)} minLength={10} maxLength={3000} rows={5} placeholder="Describe the support you are looking for. Share only what you feel comfortable sharing." required/>
     </label>
     {privacy==='anonymous'&&<div className="space-y-2"><p className="text-sm">Complete human verification to send without logging in.</p><div ref={captchaNode}/>{captchaError&&<p role="alert">{captchaError}</p>}</div>}
     <Button type="submit" disabled={busy||(privacy==='anonymous'&&!captcha)}>{busy?'Checking delivery…':privacy==='anonymous'?'Send anonymous request':'Submit confidential request'}</Button>
    </form>}
    {error&&<p role="alert" className="rounded-lg border border-destructive p-3">{error}</p>}
    {success&&<p role="status" className="rounded-lg border p-3">{success}</p>}
   </section>
   {!anonymousOnly&&student&&<section className="rounded-xl border bg-card p-5 space-y-3">
    <h2 className="font-semibold">My confidential requests</h2>
    <p className="text-xs text-muted-foreground">This list contains only requests made with your identified student account. Anonymous messages never appear here.</p>
    <Button size="sm" variant="outline" onClick={()=>setRefresh(x=>x+1)} disabled={!WELLBEING_ENABLED}>Refresh private requests</Button>
    {loadError&&<p role="alert">{loadError}</p>}
    {!loadError&&!records.length&&<p className="text-sm text-muted-foreground">No confidential requests have been returned for your account.</p>}
    {records.map(record=><article key={record.id} className="rounded-lg border p-3 space-y-2">
     <p className="font-medium text-sm">{categoryLabel(record.category)}</p>
     <p className="text-xs text-muted-foreground">Status: {record.status} · Received {new Date(record.created_at).toLocaleDateString()}</p>
     <Button size="sm" variant="outline" aria-pressed={selected===record.id} onClick={()=>setSelected(prev=>prev===record.id?'':record.id)}>{selected===record.id?'Hide private responses':'Read private Welfare responses'}</Button>
     {selected===record.id&&<div className="rounded-lg border p-3 space-y-2">
      <h3 className="text-sm font-semibold">Messages from your authorised Welfare team</h3>
      {replyError&&<p role="alert">{replyError}</p>}
      {!replyError&&!replies.length&&<p className="text-sm text-muted-foreground">No private responses have been recorded yet. This is not an urgent chat service.</p>}
      {replies.map(reply=><article key={reply.id} className="rounded-md bg-secondary/30 p-3">
       <p className="whitespace-pre-wrap break-words text-sm">{reply.message}</p>
       <p className="mt-2 text-xs text-muted-foreground">{new Date(reply.created_at).toLocaleString()}</p>
      </article>)}
     </div>}
    </article>)}
   </section>}
   <nav className="flex flex-wrap gap-3">
    {!anonymousOnly&&<Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm" to="/student/support">General student messages</Link>}
    {anonymousOnly&&<Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm" to="/login">Student sign-in for confidential support</Link>}
   </nav>
  </div>
 </DashboardLayout>;
}
