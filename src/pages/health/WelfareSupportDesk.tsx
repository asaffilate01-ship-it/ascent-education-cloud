import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {CRISIS_NOTICE,WELLBEING_CATEGORIES,WELLBEING_ENABLED} from '@/lib/wellbeingRequests';

type CaseRow={id:string;category:string;urgency:string;status:string;message:string;anonymous:boolean;
 student_id:string|null;created_at:string;updated_at:string;reviewed_by:string|null;revision:number};
const statuses=['new','reviewing','follow_up','closed'] as const;
export default function WelfareSupportDesk(){
 const {user}=useAuth();
 return <WelfareQueue key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function WelfareQueue(){
 const {user}=useAuth();
 const authorised=!!user?.id&&!!user.tenantId&&user.role==='welfare_officer'&&user.roles?.includes('welfare_officer');
 const [cases,setCases]=useState<CaseRow[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [filter,setFilter]=useState('open'),[selected,setSelected]=useState(''),[refresh,setRefresh]=useState(0);
 const [action,setAction]=useState('reviewing'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [reply,setReply]=useState(''),[replyNonce,setReplyNonce]=useState(()=>crypto.randomUUID());
 useEffect(()=>{
  let active=true;setCases([]);setSelected('');setError('');setNotice('');
  if(!authorised||!WELLBEING_ENABLED)return()=>{active=false;};
  setLoading(true);
  void(async()=>{
   try{
    const {data,error:e}=await (supabase.rpc as any)('get_unipathway_welfare_queue');
    if(e||!Array.isArray(data))throw Error('The welfare queue is not available to this role and centre.');
    const clean=data.filter((row:CaseRow)=>row&&typeof row.id==='string'&&typeof row.message==='string'&&typeof row.status==='string');
    if(active)setCases(clean);
   }catch{if(active)setError('Confidential wellbeing cases could not be verified. No partial case data is displayed.');}
   finally{if(active)setLoading(false);}
  })();return()=>{active=false;};
 },[authorised,refresh]);
 const visible=cases.filter(c=>filter==='all'||(filter==='open'?c.status!=='closed':c.status===filter))
  .sort((a,b)=>Number(b.urgency==='soon')-Number(a.urgency==='soon')||b.created_at.localeCompare(a.created_at));
 const record=visible.find(c=>c.id===selected);
 async function update(){
  if(!record||busy||!authorised||!statuses.includes(action as typeof statuses[number])||note.trim().length<12)return;
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error:e}=await (supabase.rpc as any)('review_unipathway_welfare_request',{
    p_request:record.id,p_status:action,p_internal_note:note.trim(),p_expected_revision:record.revision,
   });
   if(e||!data||data.id!==record.id||data.status!==action)throw Error('The Welfare team could not confirm that review. No change can be assumed.');
   setNotice('The private case status and staff review were recorded.');
   setNote('');setRefresh(n=>n+1);
  }catch{setError('Case review was not confirmed. Reload the queue and check the current status before retrying.');}
  finally{setBusy(false);}
 }
 async function sendPrivateReply(){
  if(!record||record.anonymous||!record.student_id||busy||reply.trim().length<15||!authorised)return;
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error:e}=await (supabase.rpc as any)('respond_to_unipathway_welfare_request',{
    p_request:record.id,p_message:reply.trim(),p_nonce:replyNonce,
   });
   if(e||!data||data.requestId!==record.id||data.status!=='recorded')
    throw Error('The response was not confirmed.');
   setNotice('A private reply was saved for the linked student portal. No email delivery or emergency notification is implied.');
   setReply('');setReplyNonce(crypto.randomUUID());setRefresh(v=>v+1);
  }catch{setError('The private response was not confirmed. Use the same request to retry, or refresh the case.');}
  finally{setBusy(false);}
 }
 return <DashboardLayout title="Student wellbeing & counselling" subtitle="Restricted welfare triage — confidential cases and unidentifiable reports">
  <div className="space-y-5">
   <section className="rounded-xl border bg-card p-5 space-y-2">
    <h2 className="font-semibold">Human-led support and safeguarding</h2>
    <p className="text-sm">{CRISIS_NOTICE}</p>
    <p className="text-sm text-muted-foreground">This queue is not a clinical record or an emergency monitoring system. Escalation, counselling appointments, professional referrals and safeguarding decisions require the centre's approved human policies. Never put clinical details in a general staff notification.</p>
   </section>
   {!authorised?<p role="alert" className="rounded-xl border p-5">Only the active Welfare Officer role with a verified centre assignment can review these sensitive requests. Director and platform roles do not automatically reveal private conversations.</p>:
    !WELLBEING_ENABLED?<p role="status" className="rounded-xl border p-5">The confidential support service is staged but not activated on this backend. Staff must verify restricted policies, case handling, qualified support coverage and escalation before enabling it.</p>:<>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Welfare workload">
     {[['Open requests',cases.filter(c=>c.status!=='closed').length],['New',cases.filter(c=>c.status==='new').length],['Requested prompt attention',cases.filter(c=>c.urgency==='soon'&&c.status!=='closed').length]].map(([label,value])=><article key={label} className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></article>)}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="font-semibold">Restricted case queue</h2>
      <Button variant="outline" disabled={loading||busy} onClick={()=>setRefresh(x=>x+1)}>Refresh verified cases</Button>
     </div>
     <label className="block max-w-xs text-sm font-medium">Show requests
      <select className="mt-1 w-full min-h-11 rounded-md border bg-background px-3" value={filter} onChange={e=>{setFilter(e.target.value);setSelected('');}}>
       <option value="open">Open cases</option><option value="new">New</option>
       <option value="reviewing">Under review</option><option value="follow_up">Follow-up required</option>
       <option value="closed">Closed</option><option value="all">All authorised cases</option>
      </select>
     </label>
     {loading&&<p role="status">Verifying confidential welfare cases…</p>}
     {error&&<p role="alert">{error}</p>}
     {notice&&<p role="status">{notice}</p>}
     {!loading&&!error&&!visible.length&&<p className="text-sm text-muted-foreground">No verified cases match this view.</p>}
     {!loading&&!error&&<div className="grid gap-3 lg:grid-cols-2">{visible.slice(0,100).map(c=><button type="button" key={c.id}
      aria-pressed={selected===c.id} onClick={()=>{setSelected(c.id);setNote('');setReply('');setReplyNonce(crypto.randomUUID());setAction('reviewing');}}
      className="rounded-lg border p-4 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <span className="font-semibold text-sm">{WELLBEING_CATEGORIES.find(x=>x.value===c.category)?.label||'Other support'}</span>
      <span className="block mt-2 text-xs text-muted-foreground">{c.anonymous?'Anonymous — no student identity':'Confidential student request'} · {c.urgency==='soon'?'Prompt review requested':'Routine'} · {c.status}</span>
      <span className="block mt-1 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
     </button>)}</div>}
     {visible.length>100&&<p className="text-sm">Showing first 100 of {visible.length} cases. Review older cases in the authorised case archive.</p>}
    </section>
    {record&&<section className="rounded-xl border bg-card p-5 space-y-4" aria-label="Selected private welfare request">
     <h2 className="font-semibold">Private case review</h2>
     <p className="text-sm">{record.anonymous?'This message has no student account link. Do not infer identity or claim that the sender can receive a reply.':'Identified student request. Contact must take place through the centre’s authorised private welfare process.'}</p>
     <p className="rounded-lg border p-4 text-sm whitespace-pre-wrap break-words">{record.message}</p>
     <p className="text-xs text-muted-foreground">Status: {record.status} · Case reference {record.id.slice(0,8)}</p>
     <label className="block max-w-sm text-sm font-medium">Review outcome
      <select value={action} onChange={e=>setAction(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border bg-background px-3">
       {statuses.filter(s=>s!=='new').map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
      </select>
     </label>
     <label className="block text-sm font-medium">Internal professional action or referral note
      <Textarea rows={4} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} className="mt-2" placeholder="Record who will review, the agreed support next step and the evidence reference. Do not include irrelevant clinical details."/>
     </label>
     <Button disabled={busy||note.trim().length<12} onClick={()=>void update()}>{busy?'Saving review…':'Record staff review'}</Button>
     {!record.anonymous&&!!record.student_id&&record.status!=='closed'&&<div className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">Send a confidential student-portal response</h3>
      <p className="text-sm text-muted-foreground">Only the original student can read this response after authenticating. This does not send email, SMS or an emergency alert. Do not include unnecessary medical details.</p>
      <label className="block text-sm font-medium">Support guidance, agreed next step or counselling referral
       <Textarea rows={4} maxLength={2500} className="mt-2" value={reply} onChange={e=>setReply(e.target.value)}
        placeholder="Explain the support available and how the student can arrange a private appointment or further help."/>
      </label>
      <Button disabled={busy||reply.trim().length<15} onClick={()=>void sendPrivateReply()}>Save confidential reply for student</Button>
     </div>}
     {record.anonymous&&<p role="status" className="rounded-md border p-3 text-sm">One-way anonymous report: no linked student ID, inbox or reply channel exists. Follow the appropriate safeguarding process without trying to infer the sender's identity.</p>}
    </section>}
   </>}
   <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm" to="/health">Return to health records</Link>
  </div>
 </DashboardLayout>;
}
