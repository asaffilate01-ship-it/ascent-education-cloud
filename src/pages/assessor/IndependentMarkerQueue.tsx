import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {useCallback,useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {ClipboardCheck,FileText,ShieldCheck,Sparkles,RotateCcw} from 'lucide-react';
type Allocation={attempt_id:string;marker_id:string};
type Attempt={id:string;brief_id:string;student_id:string;attempt_no:number;evidence_text:string;status:string;submitted_at:string;resubmission_guidance:string|null};
type Brief={id:string;title:string;lecturer_id:string;learning_outcomes:string;teaching_summary:string;student_expectations:string;required_evidence:string;policy_reference:string;max_attempts:number;submission_cutoff:string};
type Criterion={id:string;brief_id:string;criterion_code:string;criterion_description:string;learning_outcome:string;scoring_guidance:string;max_points:number;display_order:number};
type DraftCriterion={criterion_code:string;suggested_points:number;evidence_quote:string;missing_evidence:string;rationale:string;feedback:string};
type AIDraft={id:string;attempt_id:string;criteria_results:DraftCriterion[];suggested_raw_score:number;strengths:string;missing_work:string;feedback:string;created_at:string};
type MarkCriterion={code:string;points:number;reason:string;evidence:string;missing:string};
const empty=(criteria:Criterion[])=>Object.fromEntries(criteria.map(c=>[c.criterion_code,{
 code:c.criterion_code,points:0,reason:'',evidence:'',missing:''
}])) as Record<string,MarkCriterion>;
export default function IndependentMarkerQueue(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [attempts,setAttempts]=useState<Attempt[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);const [drafts,setDrafts]=useState<AIDraft[]>([]);
 const [selected,setSelected]=useState('');const [scores,setScores]=useState<Record<string,MarkCriterion>>({});
 const [feedback,setFeedback]=useState('');const [guidance,setGuidance]=useState('');
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('Allocated independent assessor credentials are required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const a=await db.from('unipathway_assessment_allocations').select('attempt_id,marker_id')
    .eq('marker_id',uid).eq('tenant_id',tenant).limit(300);
   if(a.error)throw Error(a.error.message);
   const ids=((a.data||[]) as Allocation[]).map(x=>x.attempt_id);
   if(!ids.length){setAttempts([]);setBriefs([]);setCriteria([]);setDrafts([]);return;}
   const [at,ai]=await Promise.all([
    db.from('unipathway_assessment_attempts').select('id,brief_id,student_id,attempt_no,evidence_text,status,submitted_at,resubmission_guidance')
     .eq('tenant_id',tenant).in('id',ids).order('submitted_at',{ascending:false}),
    db.from('unipathway_assessment_ai_drafts').select('id,attempt_id,criteria_results,suggested_raw_score,strengths,missing_work,feedback,created_at')
     .eq('tenant_id',tenant).in('attempt_id',ids).order('created_at',{ascending:false}).limit(300)
   ]);
   if(at.error||ai.error)throw Error(at.error?.message||ai.error?.message);
   const list=(at.data||[]) as Attempt[],briefIds=[...new Set(list.map(x=>x.brief_id))];
   setAttempts(list);setDrafts((ai.data||[]) as AIDraft[]);
   if(!briefIds.length){setBriefs([]);setCriteria([]);return;}
   const [b,c]=await Promise.all([
    db.from('unipathway_assessment_briefs')
     .select('id,title,lecturer_id,learning_outcomes,teaching_summary,student_expectations,required_evidence,policy_reference,max_attempts,submission_cutoff')
     .in('id',briefIds),
    db.from('unipathway_assessment_criteria')
     .select('id,brief_id,criterion_code,criterion_description,learning_outcome,scoring_guidance,max_points,display_order')
     .in('brief_id',briefIds).order('display_order')
   ]);
   if(b.error||c.error)throw Error(b.error?.message||c.error?.message);
   setBriefs((b.data||[]) as Brief[]);setCriteria((c.data||[]) as Criterion[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load independent assessor queue');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const current=attempts.find(a=>a.id===selected);
 const brief=briefs.find(b=>b.id===current?.brief_id);
 const rubric=useMemo(()=>criteria.filter(c=>c.brief_id===current?.brief_id),[criteria,current?.brief_id]);
 const ai=drafts.find(d=>d.attempt_id===selected);
 const eligible=current&&['submitted','qa_rejected'].includes(current.status);
 const select=(id:string)=>{
  const a=attempts.find(x=>x.id===id);
  const relevant=criteria.filter(c=>c.brief_id===a?.brief_id);
  setSelected(id);setScores(empty(relevant));setFeedback('');setGuidance('');
 };
 const change=(code:string,key:keyof MarkCriterion,value:string|number)=>{
  setScores(p=>({...p,[code]:{...(p[code]||{code,points:0,reason:'',evidence:'',missing:''}),[key]:value}}));
 };
 const populate=()=>{
  if(!ai){toast.error('No AI report available. Use manual scoring.');return;}
  if(!window.confirm('Populate editable fields from Omniqora suggestions? You must verify all cited evidence and personally justify each decision.'))return;
  const next:Record<string,MarkCriterion>={};
  rubric.forEach(c=>{const d=(ai.criteria_results||[]).find(x=>x.criterion_code===c.criterion_code);
   next[c.criterion_code]={code:c.criterion_code,points:Number(d?.suggested_points)||0,
    reason:d?.rationale||'',evidence:d?.evidence_quote||'No supporting excerpt',
    missing:d?.missing_evidence||'None identified'};});
  setScores(next);setFeedback(ai.feedback||'');
 };
 const runAI=async()=>{
  if(!current||current.status!=='submitted'||busy)return;
  setBusy('ai');const {data,error:e}=await supabase.functions.invoke('omniqora-assessment-advisory',{body:{attemptId:current.id}});
  setBusy('');
  if(e||data?.error){toast.error(data?.error||e?.message||'AI is unavailable, human marking remains possible');return;}
  toast.success('Private AI criterion draft ready; human verification is required.');await load();
 };
 const mark=async()=>{
  if(!current||!eligible||busy)return;
  const all=rubric.map(c=>scores[c.criterion_code]);
  if(all.length<2||all.some((s,i)=>!s||!Number.isFinite(s.points)||s.points<0||s.points>Number(rubric[i].max_points)
   ||s.reason.trim().length<20||s.evidence.trim().length<3||s.missing.trim().length<3)
   ||feedback.trim().length<40){toast.error('Verify every criterion: evidence, missing work, score, reasoning and written feedback.');return;}
  if(!window.confirm('Submit your independent marking decision to IQA for separate verification? Nothing will be released to the student yet.'))return;
  setBusy('mark');
  const {error:e}=await db.rpc('record_unipathway_human_mark',{
    p_attempt:current.id,p_criteria:all,p_feedback:feedback.trim()
  });setBusy('');
  if(e){toast.error('Human mark not accepted: '+e.message);return;}
  toast.success('Mark saved privately for independent IQA review.');setSelected('');await load();
 };
 const resubmit=async()=>{
  if(!current||!brief||current.status!=='submitted'||busy)return;
  if(guidance.trim().length<50||current.attempt_no>=brief.max_attempts||Date.now()>new Date(brief.submission_cutoff).getTime()){
   toast.error('Resubmission requires actionable guidance, remaining attempts and an open cutoff.');return;}
  setBusy('resubmit');
  const {error:e}=await db.rpc('request_unipathway_assessment_resubmission',{
   p_attempt:current.id,p_guidance:guidance.trim()
  });setBusy('');
  if(e){toast.error(e.message);return;}
  toast.success('Individual guidance sent for a permitted resubmission, no score released.');setSelected('');await load();
 };
 return <DashboardLayout title="Independent Marker Workspace" subtitle="Mark curriculum evidence separately from the lecturer, using Omniqora only as a private assistant">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>AI suggestions are not grades</h2>
   <p className="mt-2 text-sm text-muted-foreground">You—not the teaching lecturer or AI—must score every criterion and cite actual submitted evidence. Document missing outcomes and your own reasoning. A separate IQA must approve or reject the marked submission before the student sees any score. Where the approved policy permits, request revisions before the final cutoff.</p>
  </section>
  {loading&&<p role="status">Loading only your allocated assessments…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. RLS and assessment functions must be deployed and validated on staging.</p>}
  {!loading&&!error&&<div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,1.8fr)]">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Assigned submissions ({attempts.length})</h2>
    <div className="mt-3 space-y-2">{attempts.map(a=><button key={a.id} onClick={()=>select(a.id)} className={`w-full rounded-lg border p-3 text-left ${selected===a.id?'border-primary bg-primary/5':''}`}>
     <p className="text-sm font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Assessment'}</p>
     <p className="mt-1 text-xs text-muted-foreground">Anonymised ref {a.id.slice(0,8)} · attempt {a.attempt_no} · {a.status}</p>
    </button>)}</div>
    {!attempts.length&&<p className="mt-3 text-sm text-muted-foreground">No student work has been assigned to you. Programme management allocates each independent marker explicitly.</p>}
   </section>
   <section className="space-y-4">
    {!current||!brief?<div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Select an authorised submission to review its lecturer brief, published rubric, student work and advisory AI drafts.</div>:<>
     <div className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">{brief.title}</h2><p className="mt-1 text-xs text-muted-foreground">Attempt {current.attempt_no} · {current.status} · received {new Date(current.submitted_at).toLocaleString()}</p>
      {([
       ['Lesson and lecturer progress',brief.teaching_summary],
       ['Learning outcomes',brief.learning_outcomes],
       ['Expected coursework',brief.student_expectations],
       ['Required student evidence',brief.required_evidence]
      ] as const).map(([name,text])=><details key={name} className="mt-3 rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">{name}</summary><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></details>)}
      <h3 className="mt-4 font-semibold">Submitted evidence</h3><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-secondary/30 p-3 text-sm font-sans">{current.evidence_text}</pre>{current.id&&<CourseworkFiles attemptId={current.id}/>}
     </div>
     <div className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold"><Sparkles className="mr-1 inline size-4"/>Omniqora Intelligence — optional draft</h2>
      {!ai&&current.status==='submitted'&&<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void runAI()}>Analyse criteria</Button>}
     </div>
     {ai?<><p className="mt-2 text-sm text-muted-foreground">Model suggestion: {ai.suggested_raw_score}/100 internal rubric points — NOT approved.</p>
      <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Gaps:</strong> {ai.missing_work}</p>
      {eligible&&<Button className="mt-3" size="sm" variant="outline" onClick={populate}>Copy draft into editable fields for human verification</Button>}</>:<p className="mt-2 text-sm text-muted-foreground">No authorised AI draft. You may mark entirely without AI or return to this later.</p>}
     </div>
     {eligible&&<section className="rounded-xl border bg-card p-5"><h2 className="font-semibold"><ClipboardCheck className="mr-1 inline size-4"/>Independent criterion-by-criterion human assessment</h2>
      <div className="mt-3 space-y-4">{rubric.map(c=>{const v=scores[c.criterion_code];
       return <fieldset key={c.id} className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold">{c.criterion_code} — maximum {c.max_points} points</legend>
        <p className="text-sm">{c.learning_outcome}</p>
        <p className="mt-1 text-sm text-muted-foreground">{c.criterion_description}</p>
        <p className="mt-2 text-xs text-muted-foreground">Standard: {c.scoring_guidance}</p>
        <label className="mt-3 block text-sm font-semibold">Awarded points (not a final student grade)<Input className="mt-1" type="number" min={0} max={c.max_points} step="0.5" value={v?.points??0} onChange={e=>change(c.criterion_code,'points',Number(e.target.value))}/></label>
        <label className="mt-2 block text-sm font-semibold">Evidence location or quoted excerpt<Input className="mt-1" value={v?.evidence||''} maxLength={900} onChange={e=>change(c.criterion_code,'evidence',e.target.value)}/></label>
        <label className="mt-2 block text-sm font-semibold">Reason for your mark<Textarea className="mt-1" value={v?.reason||''} maxLength={2000} rows={2} onChange={e=>change(c.criterion_code,'reason',e.target.value)}/></label>
        <label className="mt-2 block text-sm font-semibold">What is missing, or what evidence is fully met?<Textarea className="mt-1" value={v?.missing||''} maxLength={2000} rows={2} onChange={e=>change(c.criterion_code,'missing',e.target.value)}/></label>
       </fieldset>;
      })}</div>
      <p className="mt-3 text-sm font-semibold">Raw rubric total: {rubric.reduce((sum,c)=>sum+Number(scores[c.criterion_code]?.points||0),0)}/100 before any policy-defined resubmission penalty.</p>
      <label className="mt-3 block text-sm font-semibold">Individual written feedback<Textarea className="mt-1" maxLength={6000} rows={4} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Summarise strengths, missed criteria, improvements and how to prepare for the next assessment"/></label>
      <Button className="mt-3" disabled={!!busy||!rubric.length} onClick={()=>void mark()}>Send independent human mark to IQA</Button>
     </section>}
     {current.status==='submitted'&&current.attempt_no<brief.max_attempts&&Date.now()<=new Date(brief.submission_cutoff).getTime()&&
      <section className="rounded-xl border bg-card p-5"><h2 className="flex gap-2 font-semibold"><RotateCcw className="size-5"/>Return for resubmission instead</h2>
       <p className="mt-2 text-xs text-muted-foreground">Allowed by {brief.policy_reference}. Provide precise reasons and improvement instructions. Remaining time: until {new Date(brief.submission_cutoff).toLocaleString()}.</p>
       <Textarea rows={4} className="mt-3" maxLength={6000} value={guidance} onChange={e=>setGuidance(e.target.value)} placeholder="Explain which learning outcomes are not evidenced, what work needs adding, and how to correct it."/>
       <Button className="mt-3" variant="outline" disabled={!!busy||guidance.trim().length<50} onClick={()=>void resubmit()}>Request permitted revision</Button>
      </section>}
     {!eligible&&<p className="rounded-lg border bg-secondary p-4 text-sm">Marking is no longer available in this attempt state. IQA approval or a separate review is required.</p>}
    </>}
   </section>
  </div>}
 </DashboardLayout>;
}
