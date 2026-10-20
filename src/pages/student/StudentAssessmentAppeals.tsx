import {useCallback,useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Link} from 'react-router-dom';
import {toast} from 'sonner';
import {ClipboardCheck,ShieldCheck,ExternalLink} from 'lucide-react';
type Result={attempt_id:string;brief_id:string;final_score:number;released_at:string};
type Policy={brief_id:string;window_days:number;policy_reference:string;approved_at:string};
type Brief={id:string;title:string;module_id:string};
type Appeal={id:string;attempt_id:string;brief_id:string;grounds:string;status:string;details:string;requested_at:string};
type Outcome={appeal_id:string;final_outcome:string;final_reasoning:string;decided_at:string};
type Amendment={attempt_id:string;original_final_score:number;corrected_final_score:number;corrected_feedback:string;recorded_at:string};
const reasons=[
 {value:'rubric_application',label:'Published rubric or marking criterion was applied incorrectly'},
 {value:'procedural_error',label:'Assessment, independence or moderation procedure was not followed'},
 {value:'clerical_error',label:'Arithmetic, transcription or administrative error'}
];
export default function StudentAssessmentAppeals(){
 const {user}=useAuth();
 const [results,setResults]=useState<Result[]>([]);
 const [policies,setPolicies]=useState<Policy[]>([]);
 const [briefs,setBriefs]=useState<Brief[]>([]);
 const [appeals,setAppeals]=useState<Appeal[]>([]);
 const [outcomes,setOutcomes]=useState<Outcome[]>([]);
 const [amendments,setAmendments]=useState<Amendment[]>([]);
 const [grounds,setGrounds]=useState<Record<string,string>>({});
 const [explanations,setExplanations]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const uid=user?.id,tenant=user?.tenantId;
 const load=useCallback(async()=>{
  if(!uid||!tenant){setLoading(false);setError('Authorised student and centre assignment are required.');return;}
  setLoading(true);setError('');
  try{
   const [r,p,a,o,m]=await Promise.all([
    db.from('unipathway_assessment_released_results')
     .select('attempt_id,brief_id,final_score,released_at').eq('student_id',uid).eq('tenant_id',tenant).order('released_at',{ascending:false}).limit(200),
    db.from('unipathway_assessment_appeal_policies').select('brief_id,window_days,policy_reference,approved_at').eq('tenant_id',tenant),
    db.from('unipathway_assessment_appeals')
     .select('id,attempt_id,brief_id,grounds,status,details,requested_at').eq('tenant_id',tenant).eq('student_id',uid),
    db.from('unipathway_assessment_appeal_outcomes')
     .select('appeal_id,final_outcome,final_reasoning,decided_at').eq('tenant_id',tenant),
    db.from('unipathway_assessment_grade_amendments')
     .select('attempt_id,original_final_score,corrected_final_score,corrected_feedback,recorded_at').eq('tenant_id',tenant).eq('student_id',uid),
   ]);
   const bad=[r,p,a,o,m].find(x=>x.error);
   if(bad)throw Error(bad.error.message);
   const releases=(r.data||[]) as Result[];
   setResults(releases);setPolicies((p.data||[]) as Policy[]);
   const ownAppeals=(a.data||[]) as Appeal[];
   const ownIDs=new Set(ownAppeals.map(x=>x.id));
   setAppeals(ownAppeals);
   setOutcomes(((o.data||[]) as Outcome[]).filter(x=>ownIDs.has(x.appeal_id)));
   setAmendments((m.data||[]) as Amendment[]);
   if(releases.length){
    const names=await db.from('unipathway_assessment_briefs').select('id,title,module_id').in('id',[...new Set(releases.map(x=>x.brief_id))]);
    if(names.error)throw Error(names.error.message);
    setBriefs((names.data||[]) as Brief[]);
   }else setBriefs([]);
  }catch(e){setError(e instanceof Error?e.message:'Approved appeal records cannot be loaded');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const submit=async(r:Result)=>{
  const reason=grounds[r.attempt_id]||'rubric_application';
  const explanation=(explanations[r.attempt_id]||'').trim();
  if(explanation.length<50||explanation.length>10000){toast.error('Explain the factual appeal grounds in at least 50 characters.');return;}
  if(!window.confirm('Request a formal independent human review? Your current approved result stays unchanged until a separate decision is authorised.'))return;
  setBusy(r.attempt_id);
  const {error:e}=await db.rpc('request_unipathway_grade_appeal',{
   p_attempt:r.attempt_id,p_grounds:reason,p_details:explanation
  });
  setBusy('');
  if(e){toast.error('Appeal request denied: '+e.message);return;}
  toast.success('Appeal submitted for independent allocation. No mark has changed.');await load();
 };
 const sorted=useMemo(()=>[...results].sort((a,b)=>b.released_at.localeCompare(a.released_at)),[results]);
 return <DashboardLayout title="My Coursework Appeals" subtitle="Fair, private appeals with independent review, centre approval and recorded history">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>You can challenge procedural or rubric errors</h2>
   <p className="mt-2 text-sm text-muted-foreground">Appeal deadlines depend on your centre-approved qualification policy. Your original released mark is preserved. A different IQA reviewer checks the evidence, and a separate centre director must authorise any correction. An appeal does not guarantee a higher grade or affect the official external examination body's own appeals procedure.</p>
   <Button className="mt-3" asChild variant="outline" size="sm"><Link to="/student/grades">My approved results <ExternalLink className="ml-1 size-3"/></Link></Button>
  </section>
  {loading&&<p role="status">Verifying released results and authorised appeal windows…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. Contact the centre for its approved offline appeals channel.</p>}
  {!loading&&!error&&!sorted.length&&<p className="rounded-xl border p-6 text-sm">There are no released coursework results eligible for an online appeal. Contact academic support for general concerns.</p>}
  {!loading&&!error&&<div className="space-y-4">{sorted.map(r=>{
   const p=policies.find(x=>x.brief_id===r.brief_id);
   const appeal=appeals.find(x=>x.attempt_id===r.attempt_id);
   const outcome=outcomes.find(x=>x.appeal_id===appeal?.id);
   const amendment=amendments.find(x=>x.attempt_id===r.attempt_id);
   const deadline=p?new Date(new Date(r.released_at).getTime()+p.window_days*86400000):null;
   const canRequest=!!p&&!!deadline&&Date.now()<=deadline.getTime()&&!appeal;
   return <article key={r.attempt_id} className="rounded-xl border bg-card p-5">
    <h2 className="font-bold">{briefs.find(b=>b.id===r.brief_id)?.title||'Approved coursework'}</h2>
    <p className="mt-2 text-sm">Current approved internal result: <strong>{amendment?.corrected_final_score??r.final_score}/100</strong>{amendment?' (formally amended)':''}</p>
    <p className="mt-1 text-xs text-muted-foreground">Released {new Date(r.released_at).toLocaleString()} · ref {r.attempt_id.slice(0,8)}</p>
    {!p&&<p className="mt-3 text-sm text-muted-foreground">Online appeals are not configured for this brief. Contact centre administration for the qualification's approved process.</p>}
    {p&&<p className="mt-3 text-sm"><ClipboardCheck className="mr-1 inline size-4"/>Published appeal policy: {p.policy_reference} · window: {p.window_days} day(s) from result release · indicative cutoff: {deadline?.toLocaleString()}</p>}
    {appeal&&<section className="mt-4 rounded-lg border bg-secondary/30 p-4">
     <p className="text-sm font-semibold">Appeal status: {appeal.status.replace(/_/g,' ')}</p>
     <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(appeal.requested_at).toLocaleString()}</p>
     <p className="mt-2 whitespace-pre-wrap text-sm">{appeal.details}</p>
     {outcome&&<div className="mt-3 border-t pt-3">
      <p className="font-semibold text-sm">Signed decision: {outcome.final_outcome}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{outcome.final_reasoning}</p>
      <p className="mt-1 text-xs text-muted-foreground">{new Date(outcome.decided_at).toLocaleString()}</p>
     </div>}
     {amendment&&<div className="mt-3 rounded-lg border bg-card p-3 text-sm">
      <strong>Original {amendment.original_final_score}/100 → amended {amendment.corrected_final_score}/100</strong>
      <p className="mt-2 whitespace-pre-wrap">{amendment.corrected_feedback}</p>
     </div>}
    </section>}
    {canRequest&&<section className="mt-4 space-y-3 rounded-lg border p-4">
     <h3 className="font-semibold">Request an independent review</h3>
     <label className="block text-sm font-medium">Appeal grounds<select aria-label="Appeal grounds" className="mt-1 w-full rounded-md border bg-background p-2" value={grounds[r.attempt_id]||'rubric_application'} onChange={e=>setGrounds(prev=>({...prev,[r.attempt_id]:e.target.value}))}>{reasons.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
     <label className="block text-sm font-medium">Your specific evidence and reason
      <Textarea className="mt-1" rows={5} maxLength={10000} value={explanations[r.attempt_id]||''}
       placeholder="Identify which published criterion or procedure you believe was applied incorrectly and explain why."
       onChange={e=>setExplanations(prev=>({...prev,[r.attempt_id]:e.target.value}))}/></label>
     <Button disabled={!!busy||(explanations[r.attempt_id]||'').trim().length<50} onClick={()=>void submit(r)}>Submit independent appeal</Button>
    </section>}
    {p&&!appeal&&!canRequest&&<p className="mt-3 text-sm text-muted-foreground">The online appeal window for this result has closed. Contact the centre if there are exceptional circumstances.</p>}
   </article>;
  })}</div>}
 </DashboardLayout>;
}
