import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {useCallback,useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {ClipboardCheck,ShieldCheck,FileCheck} from 'lucide-react';
type Allocation={attempt_id:string;qa_reviewer_id:string;marker_id:string};
type Attempt={evidence_text:string;id:string;brief_id:string;student_id:string;status:string;attempt_no:number;submitted_at:string};
type Brief={id:string;title:string;lecturer_id:string;policy_reference:string;penalty_points_per_resubmission:number};
type Mark={attempt_id:string;marker_id:string;revision:number;criteria_scores:Array<{code:string;points:number;reason:string;evidence:string;missing:string}>;raw_score:number;penalty_points:number;adjusted_score:number;feedback:string};
type Decision={attempt_id:string;reviewer_id:string;mark_revision:number;decision:string;rationale:string};
type Result={attempt_id:string;released_at:string};
export default function QualityAssessmentApproval(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [queue,setQueue]=useState<Attempt[]>([]);
 const [briefs,setBriefs]=useState<Brief[]>([]);
 const [allocations,setAllocations]=useState<Allocation[]>([]);
 const [marks,setMarks]=useState<Mark[]>([]);
 const [decisions,setDecisions]=useState<Decision[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [selected,setSelected]=useState('');const [rationale,setRationale]=useState('');
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('Verified assigned IQA role and centre are required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const allocationsRes=await db.from('unipathway_assessment_allocations')
    .select('attempt_id,qa_reviewer_id,marker_id').eq('tenant_id',tenant).eq('qa_reviewer_id',uid).limit(300);
   if(allocationsRes.error)throw Error(allocationsRes.error.message);
   const a=(allocationsRes.data||[]) as Allocation[];setAllocations(a);
   const ids=a.map(x=>x.attempt_id);
   if(!ids.length){setQueue([]);setMarks([]);setBriefs([]);setDecisions([]);setResults([]);return;}
   const [at,m,d,r]=await Promise.all([
    db.from('unipathway_assessment_attempts').select('id,brief_id,student_id,status,attempt_no,submitted_at,evidence_text')
     .eq('tenant_id',tenant).in('id',ids).order('submitted_at',{ascending:false}),
    db.from('unipathway_assessment_human_marks')
     .select('attempt_id,marker_id,revision,criteria_scores,raw_score,penalty_points,adjusted_score,feedback')
     .eq('tenant_id',tenant).in('attempt_id',ids),
    db.from('unipathway_assessment_quality_decisions')
     .select('attempt_id,reviewer_id,mark_revision,decision,rationale').eq('tenant_id',tenant).in('attempt_id',ids),
    db.from('unipathway_assessment_released_results').select('attempt_id,released_at').eq('tenant_id',tenant).in('attempt_id',ids)
   ]);
   const bad=[at,m,d,r].find(x=>x.error);if(bad)throw Error(bad.error.message);
   const attempts=(at.data||[]) as Attempt[];setQueue(attempts);setMarks((m.data||[]) as Mark[]);
   setDecisions((d.data||[]) as Decision[]);setResults((r.data||[]) as Result[]);
   if(!attempts.length){setBriefs([]);return;}
   const b=await db.from('unipathway_assessment_briefs')
    .select('id,title,lecturer_id,policy_reference,penalty_points_per_resubmission')
    .in('id',[...new Set(attempts.map(x=>x.brief_id))]);
   if(b.error)throw Error(b.error.message);
   setBriefs((b.data||[]) as Brief[]);
  }catch(e){setError(e instanceof Error?e.message:'QA assessment queue unavailable');setQueue([]);}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const attempt=queue.find(x=>x.id===selected);
 const mark=marks.find(m=>m.attempt_id===selected);
 const brief=briefs.find(b=>b.id===attempt?.brief_id);
 const assigned=allocations.find(a=>a.attempt_id===selected);
 const reviewed=mark&&decisions.find(d=>d.attempt_id===selected&&d.mark_revision===mark.revision);
 const released=results.some(r=>r.attempt_id===selected);
 const decide=async(approve:boolean)=>{
  if(!attempt||!mark||busy||attempt.status!=='human_marked'||rationale.trim().length<25)return;
  if(!window.confirm(approve?'Approve this independently marked grade for separate release?':'Reject this mark and require a revised independent marker decision?'))return;
  setBusy('decision');
  const {error:e}=await db.rpc('decide_unipathway_quality_mark',{
   p_attempt:attempt.id,p_approve:approve,p_rationale:rationale.trim()
  });setBusy('');
  if(e){toast.error('Quality decision not saved: '+e.message);return;}
  toast.success(approve?'Mark approved by assigned IQA; separate release required.':'Mark returned to independent assessor with an audit decision.');
  setRationale('');await load();
 };
 const release=async()=>{
  if(!attempt||!mark||attempt.status!=='qa_approved'||!reviewed||reviewed.decision!=='approved'||busy)return;
  if(!window.confirm('Release this verified final grade and feedback to the student? This cannot be undone through the dashboard.'))return;
  setBusy('release');
  const {error:e}=await db.rpc('release_unipathway_assessment_mark',{p_attempt:attempt.id});
  setBusy('');
  if(e){toast.error('Final mark release blocked: '+e.message);return;}
  toast.success('Approved result released to the authorised student only.');await load();
 };
 return <DashboardLayout title="Independent QA / IQA Verification" subtitle="Compare the human rubric score and evidence, document the QA decision, then separately release">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>No mark is final without human QA</h2>
   <p className="mt-2 text-sm text-muted-foreground">The assigned independent assessor's individual marks and evidence must be checked against the published criteria. This reviewer is a different user from the marker and teaching lecturer. AI remains advisory; an IQA must record reasons and explicitly release the approved revision.</p>
  </section>
  {loading&&<p role="status">Verifying your own QA allocations…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}</p>}
  {!loading&&!error&&<div className="grid gap-5 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,1.7fr)]">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">My independent QA queue ({queue.length})</h2>
    <div className="mt-3 space-y-2">{queue.map(a=><button key={a.id} onClick={()=>{setSelected(a.id);setRationale('');}}
     className={`w-full rounded-lg border p-3 text-left text-sm ${selected===a.id?'border-primary bg-primary/5':''}`}>
      <p className="font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Coursework'}</p>
      <p className="mt-1 text-xs text-muted-foreground">Attempt {a.attempt_no} · {a.status} · ref {a.id.slice(0,8)}</p>
     </button>)}</div>
    {!queue.length&&<p className="mt-3 text-sm text-muted-foreground">No allocated QA work is available.</p>}
   </section>
   <section className="space-y-4">{!attempt||!brief?<p className="rounded-xl border p-6 text-sm text-muted-foreground">Select independently marked work to view the review record and approval controls.</p>:<>
     <div className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">{brief.title}</h2>
      <p className="mt-2 text-xs text-muted-foreground">Teaching lecturer: {brief.lecturer_id.slice(0,8)} · marker: {assigned?.marker_id.slice(0,8)} · reviewer: {uid?.slice(0,8)} · policy: {brief.policy_reference}</p>
      {!mark?<p className="mt-3 text-sm text-muted-foreground">The independent assessor has not submitted a human mark for this attempt.</p>:<>
       <h3 className="mt-4 font-semibold">Marker revision {mark.revision}</h3>
       <div className="mt-2 grid gap-2 sm:grid-cols-3"><p className="rounded-lg bg-secondary p-3 text-sm">Raw <strong>{mark.raw_score}/100</strong></p>
        <p className="rounded-lg bg-secondary p-3 text-sm">Approved policy penalty <strong>{mark.penalty_points}</strong></p>
        <p className="rounded-lg bg-secondary p-3 text-sm">Proposed final <strong>{mark.adjusted_score}/100</strong></p></div>
       <div className="mt-3 space-y-2">{mark.criteria_scores.map(c=><div key={c.code} className="rounded-lg border p-3 text-sm">
        <p className="font-semibold">{c.code} — {c.points} points</p>
        <p className="mt-2"><strong>Evidence:</strong> {c.evidence}</p>
        <p className="mt-2"><strong>Reason:</strong> {c.reason}</p>
        <p className="mt-2"><strong>Missing or complete:</strong> {c.missing}</p>
       </div>)}</div>
       <p className="mt-4 whitespace-pre-wrap rounded-lg border bg-secondary/30 p-3 text-sm"><strong>Student-facing feedback on release:</strong> {mark.feedback}</p>
       {reviewed&&<p className="mt-3 rounded-lg border p-3 text-sm">Previous decision for this mark revision: <strong>{reviewed.decision}</strong>. {reviewed.rationale}</p>}
      </>}
     </div>
      {attempt&&<><section className="my-4 rounded-lg border p-4"><h3 className="font-semibold">Student evidence</h3><p className="mt-2 whitespace-pre-wrap text-sm">{attempt.evidence_text}</p></section><CourseworkFiles attemptId={attempt.id}/></>}
     {attempt.status==='human_marked'&&mark&&!reviewed&&<section className="rounded-xl border bg-card p-5">
      <h2 className="flex gap-2 font-semibold"><ClipboardCheck className="size-5"/>Record the independent verification decision</h2>
      <label className="mt-3 block text-sm font-semibold">QA rationale and evidence<Textarea className="mt-1" rows={4} maxLength={4000} value={rationale} onChange={e=>setRationale(e.target.value)}
       placeholder="Explain how your verification confirms or challenges the criterion marks and feedback"/></label>
      <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!!busy||rationale.trim().length<25} onClick={()=>decide(true)}><FileCheck className="mr-1 size-4"/>Approve mark</Button>
       <Button variant="outline" disabled={!!busy||rationale.trim().length<25} onClick={()=>decide(false)}>Return to marker for correction</Button></div>
     </section>}
     {attempt.status==='qa_approved'&&mark&&!released&&
      <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Final IQA release</h2>
       <p className="mt-2 text-sm text-muted-foreground">A separate confirmation will release this approved mark and feedback only to the submitting student. Results must remain private until this point.</p>
       <Button className="mt-3" disabled={!!busy} onClick={release}>Release approved result to student</Button>
      </section>}
     {released&&<p className="rounded-lg border border-success/40 bg-success/5 p-4 text-sm font-semibold">This revision has been released to its authorised student.</p>}
    </>}</section>
  </div>}
 </DashboardLayout>;
}
