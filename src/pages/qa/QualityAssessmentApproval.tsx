import CentreFeedbackLibrary from '@/components/assessment/CentreFeedbackLibrary';
import {allocatedAssessmentRows,assessmentRowsByIds} from '@/lib/assessment/queueRows';
import MarkHistory from '@/components/assessment/MarkHistory';
import EvidenceReview from '@/components/assessment/EvidenceReview';
import {Input} from '@/components/ui/input';
import {useSearchParams} from 'react-router-dom';
import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {useCallback,useEffect,useRef,useState} from 'react';
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
type Criterion={id:string;brief_id:string;criterion_code:string;learning_outcome:string;criterion_description:string;scoring_guidance:string;max_points:number};
type Result={attempt_id:string;released_at:string};
export default function QualityAssessmentApproval(){const {user}=useAuth();return <QualityWorkspace key={`${user?.id}:${user?.tenantId}`}/>;}
function QualityWorkspace(){
 const [params,setParams]=useSearchParams();
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [queue,setQueue]=useState<Attempt[]>([]);
 const [briefs,setBriefs]=useState<Brief[]>([]);
 const [allocations,setAllocations]=useState<Allocation[]>([]);
 const [marks,setMarks]=useState<Mark[]>([]);
 const [decisions,setDecisions]=useState<Decision[]>([]);
 const [results,setResults]=useState<Result[]>([]);
 const [selected,setSelected]=useState(params.get('attempt')||'');const [rationale,setRationale]=useState('');
 const [criteria,setCriteria]=useState<Criterion[]>([]),[checked,setChecked]=useState<string[]>([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('action');
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState('');
 const generation=useRef(0);const [page,setPage]=useState(0);
 useEffect(()=>setPage(0),[search,filter]);
 const load=useCallback(async()=>{
  const token=++generation.current,currentRequest=()=>token===generation.current;
  if(!uid||!tenant){setError('Verified assigned IQA role and centre are required.');setLoading(false);return;}
  setLoading(true);setError('');setPage(0);
  try{
   const allocationsRes=await allocatedAssessmentRows('unipathway_assessment_allocations','attempt_id,qa_reviewer_id,marker_id',tenant,'qa_reviewer_id',uid,currentRequest);
   if(allocationsRes.error)throw Error(allocationsRes.error.message);
   const a=(allocationsRes.data||[]) as Allocation[];setAllocations(a);
   const ids=a.map(x=>x.attempt_id);
   if(!ids.length){setQueue([]);setMarks([]);setBriefs([]);setDecisions([]);setResults([]);return;}
   const [at,m,d,r]=await Promise.all([
    assessmentRowsByIds('unipathway_assessment_attempts','id,brief_id,student_id,status,attempt_no,submitted_at,evidence_text',tenant,'id',ids,currentRequest),
    assessmentRowsByIds('unipathway_assessment_human_marks','attempt_id,marker_id,revision,criteria_scores,raw_score,penalty_points,adjusted_score,feedback',tenant,'attempt_id',ids,currentRequest,'attempt_id'),
    assessmentRowsByIds('unipathway_assessment_quality_decisions','attempt_id,reviewer_id,mark_revision,decision,rationale',tenant,'attempt_id',ids,currentRequest),
    assessmentRowsByIds('unipathway_assessment_released_results','attempt_id,released_at',tenant,'attempt_id',ids,currentRequest,'attempt_id')
   ]);
   const bad=[at,m,d,r].find(x=>x.error);if(bad)throw Error(bad.error.message);
   const attempts=((at.data||[]) as Attempt[]).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)||a.id.localeCompare(b.id));setQueue(attempts);setMarks((m.data||[]) as Mark[]);
   setDecisions((d.data||[]) as Decision[]);setResults((r.data||[]) as Result[]);
   if(!attempts.length){setBriefs([]);return;}
   const idsBriefs=[...new Set(attempts.map(x=>x.brief_id))];
   const b=await assessmentRowsByIds('unipathway_assessment_briefs','id,title,lecturer_id,policy_reference,penalty_points_per_resubmission',tenant,'id',idsBriefs,currentRequest);
   const c=await assessmentRowsByIds('unipathway_assessment_criteria','id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points',tenant,'brief_id',idsBriefs,currentRequest);
   if(c.error)throw Error(c.error.message);setCriteria(c.data||[]);
   setBriefs((b.data||[]) as Brief[]);
  }catch(e){if(!currentRequest())return;setError(e instanceof Error?e.message:'QA assessment queue unavailable');setQueue([]);}
  finally{if(currentRequest())setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const attempt=queue.find(x=>x.id===selected);
 const mark=marks.find(m=>m.attempt_id===selected);
 const brief=briefs.find(b=>b.id===attempt?.brief_id);
 const assigned=allocations.find(a=>a.attempt_id===selected);
 const reviewed=mark&&decisions.find(d=>d.attempt_id===selected&&d.mark_revision===mark.revision);
 const rubric=criteria.filter(c=>c.brief_id===attempt?.brief_id);
 const complete=rubric.length>0&&rubric.length===mark?.criteria_scores.length&&rubric.every(c=>checked.includes(c.criterion_code)&&mark.criteria_scores.some(m=>m.code===c.criterion_code));
 useEffect(()=>{setChecked([]);setRationale('');},[selected,mark?.revision]);
 useEffect(()=>{if(!rationale)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[rationale]);
 const released=results.some(r=>r.attempt_id===selected);
 const decide=async(approve:boolean)=>{
  if(!attempt||!mark||busy||attempt.status!=='human_marked'||rationale.trim().length<25||(approve&&!complete))return;
  if(!window.confirm(approve?'Approve this independently marked grade for separate release?':'Reject this mark and require a revised independent marker decision?'))return;
  setBusy('decision');
  const {error:e}=await db.rpc('review_uni_mark_revision',{
   p_attempt:attempt.id,p_revision:mark.revision,p_action:approve?'approve':'return',p_rationale:rationale.trim()
  });setBusy('');
  if(e){toast.error('Quality decision not saved: '+e.message);return;}
  toast.success(approve?'Mark approved by assigned IQA; separate release required.':'Mark returned to independent assessor with an audit decision.');
  setRationale('');await load();
 };
 const release=async()=>{
  if(!attempt||!mark||attempt.status!=='qa_approved'||!reviewed||reviewed.decision!=='approved'||busy)return;
  if(!window.confirm('Release this verified final grade and feedback to the student? This cannot be undone through the dashboard.'))return;
  setBusy('release');
  const {error:e}=await db.rpc('review_uni_mark_revision',{p_attempt:attempt.id,p_revision:mark.revision,p_action:'release',p_rationale:''});
  setBusy('');
  if(e){toast.error('Final mark release blocked: '+e.message);return;}
  toast.success('Approved result released to the authorised student only.');await load();
 };
 const actionable=queue.filter(a=>['human_marked','qa_approved'].includes(a.status));
 const visible=queue.filter(a=>(filter==='all'||(filter==='review'?a.status==='human_marked':filter==='release'?a.status==='qa_approved':['human_marked','qa_approved'].includes(a.status)))&&`${briefs.find(b=>b.id===a.brief_id)?.title||''} ${a.id}`.toLowerCase().includes(search.toLowerCase()));
 function select(id:string){if(busy||id===selected)return;if(rationale&&!window.confirm('Discard your unsent QA rationale and review another attempt?'))return;setSelected(id);setParams(p=>{p.set('attempt',id);return p;},{replace:true});setRationale('');setChecked([]);}
 return <DashboardLayout title="Independent QA / IQA Verification" subtitle="Compare the human rubric score and evidence, document the QA decision, then separately release">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>No mark is final without human QA</h2>
   <p className="mt-2 text-sm text-muted-foreground">The assigned independent assessor's individual marks and evidence must be checked against the published criteria. This reviewer is a different user from the marker and teaching lecturer. AI remains advisory; an IQA must record reasons and explicitly release the approved revision.</p>
  </section>
  <CentreFeedbackLibrary disabled={!!busy}/>
  {loading&&<p role="status">Verifying your own QA allocations…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}</p>}
  {!loading&&!error&&<div className="grid gap-5 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,1.7fr)]">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Your QA queue ({actionable.length} need action)</h2>
    <label className="mt-3 block text-sm">Find an assessment<Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Title or attempt reference"/></label>
    <label className="mt-3 block text-sm">Review stage<select className="mt-1 h-10 w-full rounded border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="action">Needs action</option><option value="review">Awaiting review</option><option value="release">Awaiting release</option><option value="all">All allocated work</option></select></label>
    <p className="mt-2 text-sm text-muted-foreground">{visible.length} matching</p><Button className="mt-2" size="sm" variant="outline" disabled={!!busy} onClick={()=>{if(rationale&&!window.confirm('Discard unsent rationale and reload the latest review?'))return;setRationale('');setChecked([]);void load();}}>Refresh review</Button>
    <div className="mt-3 space-y-2">{visible.slice(page*25,page*25+25).map(a=><button key={a.id} disabled={!!busy} aria-pressed={selected===a.id} onClick={()=>select(a.id)}
     className={`w-full rounded-lg border p-3 text-left text-sm ${selected===a.id?'border-primary bg-primary/5':''}`}>
      <p className="font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Coursework'}</p>
      <p className="mt-1 text-xs text-muted-foreground">Attempt {a.attempt_no} · {a.status} · ref {a.id.slice(0,8)}</p>
     </button>)}</div>
    {visible.length>25&&<nav aria-label="IQA queue pages" className="mt-4 flex flex-wrap items-center gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous submissions</Button><span className="text-sm">Page {page+1} of {Math.ceil(visible.length/25)}</span><Button variant="outline" disabled={(page+1)*25>=visible.length} onClick={()=>setPage(p=>p+1)}>Next submissions</Button></nav>}
    {!!queue.length&&!visible.length&&<p className="mt-3 text-sm text-muted-foreground">No work matches this view. Change the search or review stage.</p>}
    {!queue.length&&<p className="mt-3 text-sm text-muted-foreground">No allocated QA work is available.</p>}
   </section>
   <section className="min-w-0 space-y-4">{!attempt||!brief?<p className="rounded-xl border p-6 text-sm text-muted-foreground">Select independently marked work to view the review record and approval controls.</p>:<>
     <div className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">{brief.title}</h2>
      <p className="mt-2 text-xs text-muted-foreground">Teaching lecturer: {brief.lecturer_id.slice(0,8)} · marker: {assigned?.marker_id.slice(0,8)} · reviewer: {uid?.slice(0,8)} · policy: {brief.policy_reference}</p>
      {!mark?<p className="mt-3 text-sm text-muted-foreground">The independent assessor has not submitted a human mark for this attempt.</p>:<>
       <h3 className="mt-4 font-semibold">Marker revision {mark.revision}</h3>
       <div className="mt-2 grid gap-2 sm:grid-cols-3"><p className="rounded-lg bg-secondary p-3 text-sm">Raw <strong>{mark.raw_score}/100</strong></p>
        <p className="rounded-lg bg-secondary p-3 text-sm">Approved policy penalty <strong>{mark.penalty_points}</strong></p>
        <p className="rounded-lg bg-secondary p-3 text-sm">Proposed final <strong>{mark.adjusted_score}/100</strong></p></div>
       <div className="mt-3 space-y-2">{mark.criteria_scores.map(c=><div key={c.code} className="rounded-lg border p-3 text-sm">
        <p className="font-semibold">{c.code} — {c.points} / {rubric.find(r=>r.criterion_code===c.code)?.max_points??'?'} points</p>
        {(()=>{const r=rubric.find(r=>r.criterion_code===c.code);return r?<div className="mt-2 border-l-2 border-primary/30 pl-3"><p><strong>Published outcome:</strong> {r.learning_outcome}</p><p className="mt-1">{r.criterion_description}</p><p className="mt-1 text-muted-foreground"><strong>Scoring guidance:</strong> {r.scoring_guidance}</p></div>:<p role="alert" className="mt-2 text-destructive">Published criterion unavailable. Approval is blocked.</p>;})()}
        <p className="mt-2 whitespace-pre-wrap break-words"><strong>Evidence:</strong> {c.evidence}</p>
        <p className="mt-2"><strong>Reason:</strong> {c.reason}</p>
        <p className="mt-2"><strong>Missing or complete:</strong> {c.missing}</p>
        {attempt.status==='human_marked'&&<label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1 size-4" disabled={!!busy} checked={checked.includes(c.code)} onChange={e=>setChecked(p=>e.target.checked?[...p,c.code]:p.filter(x=>x!==c.code))}/><span>I checked {c.code} against the rubric and submitted evidence</span></label>}
       </div>)}</div>
       <p className="mt-4 whitespace-pre-wrap rounded-lg border bg-secondary/30 p-3 text-sm"><strong>Student-facing feedback on release:</strong> {mark.feedback}</p>
       {reviewed&&<p className="mt-3 rounded-lg border p-3 text-sm">Previous decision for this mark revision: <strong>{reviewed.decision}</strong>. {reviewed.rationale}</p>}
      </>}
     </div>
      {attempt&&<div className="rounded-xl border bg-card p-5"><EvidenceReview key={attempt.id} text={attempt.evidence_text} criteria={rubric}/><CourseworkFiles attemptId={attempt.id}/><MarkHistory attemptId={attempt.id}/></div>}
     {attempt.status==='human_marked'&&mark&&!reviewed&&<section className="rounded-xl border bg-card p-5">
      <h2 className="flex gap-2 font-semibold"><ClipboardCheck className="size-5"/>Record the independent verification decision</h2>
      <p role="status" className="mt-2 text-sm text-muted-foreground">{checked.length} of {rubric.length} published criteria checked. Approval requires every criterion; returning a mark requires your explanation.</p><label className="mt-3 block text-sm font-semibold">QA rationale and evidence<Textarea className="mt-1" disabled={!!busy} rows={4} maxLength={4000} value={rationale} onChange={e=>setRationale(e.target.value)}
       placeholder="Explain how your verification confirms or challenges the criterion marks and feedback"/></label>
      <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!!busy||!complete||rationale.trim().length<25} onClick={()=>decide(true)}><FileCheck className="mr-1 size-4"/>Approve mark</Button>
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
