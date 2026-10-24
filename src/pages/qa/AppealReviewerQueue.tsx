import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {useCallback,useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {ClipboardCheck,ShieldCheck} from 'lucide-react';
type Appeal={id:string;attempt_id:string;brief_id:string;grounds:string;details:string;status:string;requested_at:string};
type Brief={id:string;title:string;teaching_summary:string;learning_outcomes:string;student_expectations:string;required_evidence:string;policy_reference:string};
type Attempt={id:string;evidence_text:string;attempt_no:number;submitted_at:string};
type Result={attempt_id:string;raw_score:number;penalty_points:number;final_score:number;published_feedback:string};
type Criterion={brief_id:string;criterion_code:string;max_points:number;criterion_description:string;scoring_guidance:string};
type Mark={attempt_id:string;criteria_scores:Array<{code:string;points:number;reason:string;evidence:string;missing:string}>;raw_score:number;feedback:string};
export default function AppealReviewerQueue(){
 const {user}=useAuth(),uid=user?.id,tenant=user?.tenantId;
 const [cases,setCases]=useState<Appeal[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [attempts,setAttempts]=useState<Attempt[]>([]);const [results,setResults]=useState<Result[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);const [marks,setMarks]=useState<Mark[]>([]);
 const [selected,setSelected]=useState('');const [recommendation,setRecommendation]=useState('confirm');
 const [rawScore,setRawScore]=useState('');const [rationale,setRationale]=useState('');const [feedback,setFeedback]=useState('');
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('A separately allocated IQA account and centre are required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const c=await db.from('unipathway_assessment_appeals').select('id,attempt_id,brief_id,grounds,details,status,requested_at')
    .eq('tenant_id',tenant).eq('reviewer_id',uid).order('requested_at',{ascending:false}).limit(200);
   if(c.error)throw Error(c.error.message);
   const items=(c.data||[]) as Appeal[];setCases(items);
   if(!items.length){setBriefs([]);setAttempts([]);setResults([]);setCriteria([]);setMarks([]);return;}
   const attemptIds=items.map(x=>x.attempt_id),briefIds=[...new Set(items.map(x=>x.brief_id))];
   const [b,a,r,k,m]=await Promise.all([
    db.from('unipathway_assessment_briefs').select('id,title,teaching_summary,learning_outcomes,student_expectations,required_evidence,policy_reference').in('id',briefIds),
    db.from('unipathway_assessment_attempts').select('id,evidence_text,attempt_no,submitted_at').in('id',attemptIds),
    db.from('unipathway_assessment_released_results').select('attempt_id,raw_score,penalty_points,final_score,published_feedback').in('attempt_id',attemptIds),
    db.from('unipathway_assessment_criteria').select('brief_id,criterion_code,max_points,criterion_description,scoring_guidance').in('brief_id',briefIds).order('display_order'),
    db.from('unipathway_assessment_human_marks').select('attempt_id,criteria_scores,raw_score,feedback').in('attempt_id',attemptIds),
   ]);
   const problem=[b,a,r,k,m].find(x=>x.error);if(problem)throw Error(problem.error.message);
   setBriefs((b.data||[]) as Brief[]);setAttempts((a.data||[]) as Attempt[]);
   setResults((r.data||[]) as Result[]);setCriteria((k.data||[]) as Criterion[]);setMarks((m.data||[]) as Mark[]);
  }catch(e){setError(e instanceof Error?e.message:'Independent appeal evidence not available');setCases([]);}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const chosen=cases.find(x=>x.id===selected);
 const brief=briefs.find(x=>x.id===chosen?.brief_id);
 const attempt=attempts.find(x=>x.id===chosen?.attempt_id);
 const original=results.find(x=>x.attempt_id===chosen?.attempt_id);
 const human=marks.find(x=>x.attempt_id===chosen?.attempt_id);
 const submit=async()=>{
  if(!chosen||chosen.status!=='under_review'||busy)return;
  const corrected=recommendation==='correct';
  const raw=corrected?Number(rawScore):null;
  if(rationale.trim().length<70||(corrected&&(!rawScore||!Number.isFinite(raw)||raw<0||raw>100||feedback.trim().length<40))){
   toast.error('Provide a full evidence-led review and valid proposed marks and feedback when requesting a correction.');return;
  }
  if(!window.confirm('Submit this independent appeal recommendation? It will not change the student grade unless another authorised person signs it.'))return;
  setBusy(true);
  const {error:e}=await db.rpc('record_unipathway_appeal_review',{
   p_appeal:chosen.id,p_recommendation:recommendation,
   p_raw_score:raw,p_reasoning:rationale.trim(),p_feedback:corrected?feedback.trim():null
  });
  setBusy(false);
  if(e){toast.error('Appeal review was not accepted: '+e.message);return;}
  toast.success('Independent reviewer recommendation saved for separate centre-director approval.');
  setSelected('');setRationale('');setRawScore('');setFeedback('');await load();
 };
 return <DashboardLayout title="Independent Appeal Review" subtitle="Review only separately allocated student appeals and published assessment evidence">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>A second examiner, not the original lecturer or marker</h2>
   <p className="mt-2 text-sm text-muted-foreground">Review original student work, frozen marking rubric, independent assessor criteria and the approved result. Recommend whether to confirm or correct a clerical/procedural/rubric error. This stage cannot alter a released grade: a different centre director must sign off any correction.</p>
  </section>
  {loading&&<p role="status">Checking your explicitly assigned appeals…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. Your original-assessment data access is restricted to this appeal assignment.</p>}
  {!loading&&!error&&<div className="grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,1.7fr)]">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">My appeal cases ({cases.length})</h2>
    <div className="mt-3 space-y-2">{cases.map(a=><button key={a.id} className={`w-full rounded-lg border p-3 text-left text-sm ${a.id===selected?'border-primary bg-primary/5':''}`} onClick={()=>{setSelected(a.id);setRationale('');setFeedback('');setRawScore('');setRecommendation('confirm');}}>
     <p className="font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Review case'}</p>
     <p className="mt-1 text-xs text-muted-foreground">{a.grounds.replace(/_/g,' ')} · {a.status} · {a.id.slice(0,8)}</p>
    </button>)}</div>
    {!cases.length&&<p className="mt-3 text-sm text-muted-foreground">No separate appeal assignments are allocated to you.</p>}
   </section>
   <section className="space-y-4">
    {!chosen?<p className="rounded-xl border p-5 text-sm text-muted-foreground">Choose an assigned appeal to inspect its original assessment evidence.</p>:<>
     <article className="rounded-xl border bg-card p-5"><h2 className="font-semibold">{brief?.title||'Appeal submission'}</h2>
      <p className="mt-2 text-sm"><strong>Grounds:</strong> {chosen.grounds.replace(/_/g,' ')}</p>
      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary p-3 text-sm">{chosen.details}</p>
      <h3 className="mt-4 font-semibold">Published learning outcomes and teaching brief</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm">{brief?.learning_outcomes}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{brief?.teaching_summary}</p>
      <p className="mt-2 text-xs text-muted-foreground">Policy: {brief?.policy_reference}</p>
      <h3 className="mt-4 font-semibold">Original submitted work</h3>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border p-3 font-sans text-sm">{attempt?.evidence_text||'Not available'}</pre>{attempt?.id&&<CourseworkFiles attemptId={attempt?.id}/>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
       <p className="rounded-lg bg-secondary p-3 text-sm">Original approved final: <strong>{original?.final_score??'—'}/100</strong></p>
       <p className="rounded-lg bg-secondary p-3 text-sm">Raw: <strong>{original?.raw_score??'—'}</strong> · penalty {original?.penalty_points??'—'}</p>
      </div>
      <h3 className="mt-4 font-semibold">Original independent criterion marks</h3>
      {(human?.criteria_scores||[]).map(k=><div key={k.code} className="mt-2 rounded-lg border p-3 text-sm">
       <p className="font-semibold">{k.code} · {k.points} points</p>
       <p className="mt-2"><strong>Marker reason:</strong> {k.reason}</p>
       <p className="mt-2"><strong>Evidence:</strong> {k.evidence}</p>
       <p className="mt-2"><strong>Gaps:</strong> {k.missing}</p>
      </div>)}
      <h3 className="mt-4 font-semibold">Frozen rubric</h3>
      {criteria.filter(c=>c.brief_id===chosen.brief_id).map(c=><p key={c.criterion_code} className="mt-2 text-sm">{c.criterion_code}: {c.criterion_description} (maximum {c.max_points})</p>)}
     </article>
     {chosen.status==='under_review'&&<section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold"><ClipboardCheck className="mr-1 inline size-4"/>Independent reviewer recommendation</h2>
      <label className="mt-3 block text-sm font-semibold">Conclusion<select className="mt-1 w-full rounded-md border bg-background p-2" value={recommendation} onChange={e=>setRecommendation(e.target.value)}>
       <option value="confirm">Confirm original result</option>
       <option value="correct">Recommend a corrected raw mark, subject to director sign-off</option>
      </select></label>
      {recommendation==='correct'&&<>
       <label className="mt-3 block text-sm font-semibold">Corrected raw rubric score (0–100), before the existing penalty<Input className="mt-1" type="number" min="0" max="100" step="0.5" value={rawScore} onChange={e=>setRawScore(e.target.value)}/></label>
       <label className="mt-3 block text-sm font-semibold">Updated student-facing feedback<textarea className="mt-1 w-full rounded-md border bg-background p-3 text-sm" rows={4} maxLength={6000} value={feedback} onChange={e=>setFeedback(e.target.value)}/></label>
      </>}
      <label className="mt-3 block text-sm font-semibold">Independent evidence-based reasoning<textarea className="mt-1 w-full rounded-md border bg-background p-3 text-sm" rows={5} maxLength={6000} value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Refer to each disputed criterion, original evidence and approved policy." /></label>
      <Button className="mt-3" disabled={busy||rationale.trim().length<70} onClick={()=>void submit()}>Submit recommendation for director sign-off</Button>
     </section>}
     {chosen.status!=='under_review'&&<p className="rounded-lg border p-4 text-sm text-muted-foreground">This appeal is no longer in your editable independent-review stage.</p>}
    </>}
   </section>
  </div>}
 </DashboardLayout>;
}
