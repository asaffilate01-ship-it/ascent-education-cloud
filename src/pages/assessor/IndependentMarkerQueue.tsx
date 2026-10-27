import {allocatedAssessmentRows,assessmentRowsByIds} from '@/lib/assessment/queueRows';
import MarkHistory from '@/components/assessment/MarkHistory';
import FeedbackLibrary from '@/components/assessment/FeedbackLibrary';
import EvidenceReview from '@/components/assessment/EvidenceReview';
import {criterionComplete,feedbackPrompts,appendFeedback} from '@/lib/assessment/marking';
import {useSearchParams} from 'react-router-dom';
import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
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
 const {user}=useAuth();
 return <MarkerWorkspace key={`${user?.id}:${user?.tenantId}`}/>;
}
function MarkerWorkspace(){
 const [params,setParams]=useSearchParams();
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [attempts,setAttempts]=useState<Attempt[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);const [drafts,setDrafts]=useState<AIDraft[]>([]);
 const [selected,setSelected]=useState(params.get('attempt')||'');const [scores,setScores]=useState<Record<string,MarkCriterion>>({});
 const [feedback,setFeedback]=useState('');const [guidance,setGuidance]=useState('');
 const [draftRevision,setDraftRevision]=useState(0),[draftReady,setDraftReady]=useState(''),[draftError,setDraftError]=useState(''),[draftReload,setDraftReload]=useState(0),[savedAt,setSavedAt]=useState('');
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('action'),[dirty,setDirty]=useState(false);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');const [error,setError]=useState('');
 const generation=useRef(0);const [page,setPage]=useState(0);
 useEffect(()=>setPage(0),[query,filter]);
 const load=useCallback(async()=>{
  const token=++generation.current,currentRequest=()=>token===generation.current;
  if(!uid||!tenant){setError('Allocated independent assessor credentials are required.');setLoading(false);return;}
  setLoading(true);setError('');setPage(0);
  try{
   const a=await allocatedAssessmentRows('unipathway_assessment_allocations','attempt_id,marker_id',tenant,'marker_id',uid,currentRequest);
   if(a.error)throw Error(a.error.message);
   const ids=((a.data||[]) as Allocation[]).map(x=>x.attempt_id);
   if(!ids.length){setAttempts([]);setBriefs([]);setCriteria([]);setDrafts([]);return;}
   const [at,ai]=await Promise.all([
    assessmentRowsByIds('unipathway_assessment_attempts','id,brief_id,student_id,attempt_no,evidence_text,status,submitted_at,resubmission_guidance',tenant,'id',ids,currentRequest),
    assessmentRowsByIds('unipathway_assessment_ai_drafts','id,attempt_id,criteria_results,suggested_raw_score,strengths,missing_work,feedback,created_at',tenant,'attempt_id',ids,currentRequest)
   ]);
   if(at.error||ai.error)throw Error(at.error?.message||ai.error?.message);
   const list=((at.data||[]) as Attempt[]).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)||a.id.localeCompare(b.id)),briefIds=[...new Set(list.map(x=>x.brief_id))];
   setAttempts(list);setDrafts(((ai.data||[]) as AIDraft[]).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
   if(!briefIds.length){setBriefs([]);setCriteria([]);return;}
   const [b,c]=await Promise.all([
    assessmentRowsByIds('unipathway_assessment_briefs','id,title,lecturer_id,learning_outcomes,teaching_summary,student_expectations,required_evidence,policy_reference,max_attempts,submission_cutoff',tenant,'id',briefIds,currentRequest),
    assessmentRowsByIds('unipathway_assessment_criteria','id,brief_id,criterion_code,criterion_description,learning_outcome,scoring_guidance,max_points,display_order',tenant,'brief_id',briefIds,currentRequest)
   ]);
   if(b.error||c.error)throw Error(b.error?.message||c.error?.message);
   setBriefs((b.data||[]) as Brief[]);setCriteria(((c.data||[]) as Criterion[]).sort((a,b)=>a.display_order-b.display_order));
  }catch(e){if(!currentRequest())return;setAttempts([]);setBriefs([]);setCriteria([]);setDrafts([]);setError(e instanceof Error?e.message:'Unable to load independent assessor queue');}
  finally{if(currentRequest())setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 const current=attempts.find(a=>a.id===selected);
 const brief=briefs.find(b=>b.id===current?.brief_id);
 useEffect(()=>{let active=true;setDraftReady('');setDraftError('');setSavedAt('');setDraftRevision(0);
  if(!current?.id)return;
  setScores({});setFeedback('');setGuidance('');setDirty(false);
  void Promise.resolve(db.from('uni_marking_drafts').select('criteria,feedback,guidance,revision,updated_at').eq('attempt_id',current.id).eq('marker_id',uid).eq('tenant_id',tenant).limit(1)).then(r=>{
   if(!active)return;if(r.error)throw r.error;const draft=r.data?.[0];
   if(draft){setScores(draft.criteria||{});setFeedback(draft.feedback||'');setGuidance(draft.guidance||'');setDraftRevision(draft.revision);setSavedAt(draft.updated_at);}
   setDraftReady(current.id);
  }).catch(()=>{if(active)setDraftError('Saved draft could not be checked. Retry before editing to avoid overwriting existing work.');});
  return()=>{active=false;};
 },[current?.id,uid,tenant,draftReload]);
 async function saveDraft(){if(!current||draftReady!==current.id||busy)return;setBusy('draft');setDraftError('');
  try{const r=await db.rpc('save_uni_marking_draft',{p_attempt:current.id,p_revision:draftRevision,p_criteria:scores,p_feedback:feedback,p_guidance:guidance});
   if(r.error)throw r.error;const row=Array.isArray(r.data)?r.data[0]:r.data;if(!row?.revision)throw Error('Save receipt unavailable. Reload the saved draft to check its status.');
   setDraftRevision(row.revision);setSavedAt(row.updated_at);setDirty(false);toast.success('Private draft saved. No mark submitted.');
  }catch(e){setDraftError((e as {message?:string})?.message||'Draft save was not confirmed. Your edits remain here.');}finally{setBusy('');}
 }

 const rubric=useMemo(()=>criteria.filter(c=>c.brief_id===current?.brief_id),[criteria,current?.brief_id]);
 const ai=drafts.find(d=>d.attempt_id===selected);
 const eligible=current&&['submitted','qa_rejected'].includes(current.status);
 const select=(id:string)=>{
  if(busy||id===selected)return;
  if(dirty&&!window.confirm('Discard your unsent marking edits and open another submission?'))return;
  const a=attempts.find(x=>x.id===id);
  const relevant=criteria.filter(c=>c.brief_id===a?.brief_id);
  setDirty(false);setSelected(id);setParams(p=>{p.set('attempt',id);return p;},{replace:true});setScores(empty(relevant));setFeedback('');setGuidance('');
 };
 const change=(code:string,key:keyof MarkCriterion,value:string|number)=>{
  setDirty(true);setScores(p=>({...p,[code]:{...(p[code]||{code,points:0,reason:'',evidence:'',missing:''}),[key]:value}}));
 };
 const populate=()=>{
  if(!ai){toast.error('No AI report available. Use manual scoring.');return;}
  if(!window.confirm('Populate editable fields from Omniqora suggestions? You must verify all cited evidence and personally justify each decision.'))return;
  const next:Record<string,MarkCriterion>={};
  rubric.forEach(c=>{const d=(ai.criteria_results||[]).find(x=>x.criterion_code===c.criterion_code);
   next[c.criterion_code]={code:c.criterion_code,points:Number(d?.suggested_points)||0,
    reason:d?.rationale||'',evidence:d?.evidence_quote||'No supporting excerpt',
    missing:d?.missing_evidence||'None identified'};});
  setDirty(true);setScores(next);setFeedback(ai.feedback||'');
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
  if(all.length<2||all.some((s,i)=>!criterionComplete(s,Number(rubric[i].max_points)))
   ||feedback.trim().length<40){toast.error('Verify every criterion: evidence, missing work, score, reasoning and written feedback.');return;}
  if(/\[[^\]]+\]/.test(feedback)){toast.error('Replace bracketed feedback prompts with individual feedback before submitting.');return;}
  if(!window.confirm('Submit your independent marking decision to IQA for separate verification? Nothing will be released to the student yet.'))return;
  setBusy('mark');
  const {error:e}=await db.rpc('record_unipathway_human_mark',{
    p_attempt:current.id,p_criteria:all,p_feedback:feedback.trim()
  });setBusy('');
  if(e){toast.error('Human mark not accepted: '+e.message);return;}
  toast.success('Mark saved privately for independent IQA review.');setDirty(false);setSelected('');setParams(p=>{p.delete('attempt');return p;},{replace:true});await load();
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
  toast.success('Individual guidance sent for a permitted resubmission, no score released.');setDirty(false);setSelected('');setParams(p=>{p.delete('attempt');return p;},{replace:true});await load();
 };
 const actionable=attempts.filter(a=>['submitted','qa_rejected'].includes(a.status));
 const visible=attempts.filter(a=>(filter==='all'||['submitted','qa_rejected'].includes(a.status))&&`${briefs.find(b=>b.id===a.brief_id)?.title||''} ${a.id}`.toLowerCase().includes(query.toLowerCase()));
 const completed=rubric.filter(c=>criterionComplete(scores[c.criterion_code],Number(c.max_points))).length;
 return <DashboardLayout title="Independent Marker Workspace" subtitle="Mark curriculum evidence separately from the lecturer, using Omniqora only as a private assistant">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>AI suggestions are not grades</h2>
   <p className="mt-2 text-sm text-muted-foreground">You—not the teaching lecturer or AI—must score every criterion and cite actual submitted evidence. Document missing outcomes and your own reasoning. A separate IQA must approve or reject the marked submission before the student sees any score. Where the approved policy permits, request revisions before the final cutoff.</p>
  </section>
  {loading&&<p role="status">Loading only your allocated assessments…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. Try reloading. If this continues, contact your centre administrator.</p>}
  {!loading&&!error&&<div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,1.8fr)]">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Your marking queue ({actionable.length} need action)</h2>
    <label className="mt-3 block text-sm">Find an assessment<Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title or anonymised reference"/></label>
    <label className="mt-3 block text-sm">Show<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="action">Needs marking</option><option value="all">All allocated submissions</option></select></label>
    <p className="mt-2 text-sm text-muted-foreground">{visible.length} matching · newest received first</p>
    <div className="mt-3 space-y-2">{visible.slice(page*25,page*25+25).map(a=><button key={a.id} disabled={!!busy} aria-pressed={selected===a.id} onClick={()=>select(a.id)} className={`w-full rounded-lg border p-3 text-left ${selected===a.id?'border-primary bg-primary/5':''}`}>
     <p className="text-sm font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Assessment'}</p>
     <p className="mt-1 text-xs text-muted-foreground">Anonymised ref {a.id.slice(0,8)} · attempt {a.attempt_no} · {a.status}</p>
    </button>)}</div>
    {visible.length>25&&<nav aria-label="Marking queue pages" className="mt-4 flex flex-wrap items-center gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous submissions</Button><span className="text-sm">Page {page+1} of {Math.ceil(visible.length/25)}</span><Button variant="outline" disabled={(page+1)*25>=visible.length} onClick={()=>setPage(p=>p+1)}>Next submissions</Button></nav>}
    {!!attempts.length&&!visible.length&&<p className="mt-3 text-sm text-muted-foreground">No submissions match this view. Change your search or show all allocated work.</p>}
    {!attempts.length&&<p className="mt-3 text-sm text-muted-foreground">No student work has been assigned to you. Programme management allocates each independent marker explicitly.</p>}
   </section>
   <section className="min-w-0 space-y-4">
    {!current||!brief?<div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Select an authorised submission to review its lecturer brief, published rubric, student work and advisory AI drafts.</div>:<>
     <div className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">{brief.title}</h2><p className="mt-1 text-xs text-muted-foreground">Attempt {current.attempt_no} · {current.status} · received {new Date(current.submitted_at).toLocaleString()}</p>
      {([
       ['Lesson and lecturer progress',brief.teaching_summary],
       ['Learning outcomes',brief.learning_outcomes],
       ['Expected coursework',brief.student_expectations],
       ['Required student evidence',brief.required_evidence]
      ] as const).map(([name,text])=><details key={name} className="mt-3 rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">{name}</summary><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></details>)}
      <EvidenceReview key={current.id} text={current.evidence_text} criteria={rubric} onCite={eligible&&!busy&&draftReady===current.id?(code,citation)=>{if(scores[code]?.evidence&&!window.confirm('Replace the existing evidence citation for this criterion?'))return;change(code,'evidence',citation);}:undefined}/>
      <CourseworkFiles attemptId={current.id}/><MarkHistory attemptId={current.id}/>

     </div>
     <div className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold"><Sparkles className="mr-1 inline size-4"/>Omniqora Intelligence — optional draft</h2>
      {!ai&&current.status==='submitted'&&<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void runAI()}>Analyse criteria</Button>}
     </div>
     {ai?<><p className="mt-2 text-sm text-muted-foreground">Model suggestion: {ai.suggested_raw_score}/100 internal rubric points — NOT approved.</p>
      <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Gaps:</strong> {ai.missing_work}</p>
      {eligible&&draftReady===current.id&&<Button className="mt-3" size="sm" variant="outline" disabled={!!busy} onClick={populate}>Copy draft into editable fields for human verification</Button>}</>:<p className="mt-2 text-sm text-muted-foreground">No authorised AI draft. You may mark entirely without AI or return to this later.</p>}
     </div>
     {eligible&&<div className="rounded-xl border bg-card p-4"><p role="status" className="text-sm">{draftReady!==current.id?'Checking your saved draft…':savedAt?`Draft revision ${draftRevision} saved ${new Date(savedAt).toLocaleString()}`:'No saved draft yet.'}</p>
      {draftError&&<p role="alert" className="my-2 text-sm text-destructive">{draftError}</p>}
      <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={!!busy||draftReady!==current.id||!dirty} onClick={()=>void saveDraft()}>{busy==='draft'?'Saving…':'Save private draft'}</Button>
      <Button variant="ghost" disabled={!!busy} onClick={()=>{if(!dirty||window.confirm('Discard unsaved edits and reload your latest saved draft?'))setDraftReload(x=>x+1);}}>Reload saved draft</Button></div><p className="mt-2 text-xs text-muted-foreground">Save before leaving this page. Drafts do not submit a mark or notify the learner.</p></div>}
     {eligible&&draftReady===current.id&&<section className="rounded-xl border bg-card p-5"><h2 className="font-semibold"><ClipboardCheck className="mr-1 inline size-4"/>Independent criterion-by-criterion human assessment</h2>
      <p role="status" className="mt-2 text-sm text-muted-foreground">{completed} of {rubric.length} criteria complete · {dirty?'Unsaved edits — save your draft before leaving':'No unsaved edits'}</p><div className="mt-3 space-y-4">{rubric.map(c=>{const v=scores[c.criterion_code];
       return <fieldset disabled={!!busy} key={c.id} className="rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold">{c.criterion_code} — maximum {c.max_points} points</legend>
        <p className="text-sm">{c.learning_outcome}</p>
        <p className="mt-1 text-sm text-muted-foreground">{c.criterion_description}</p>
        <p className="mt-2 text-xs text-muted-foreground">Standard: {c.scoring_guidance}</p>
        <label className="mt-3 block text-sm font-semibold">Awarded points (not a final student grade)<Input className="mt-1" type="number" min={0} max={c.max_points} step="0.5" value={v?.points??0} onChange={e=>change(c.criterion_code,'points',Number(e.target.value))}/></label>
        <label className="mt-2 block text-sm font-semibold">Evidence location or quoted excerpt<Textarea className="mt-1" value={v?.evidence||''} maxLength={900} onChange={e=>change(c.criterion_code,'evidence',e.target.value)}/></label>
        <label className="mt-2 block text-sm font-semibold">Reason for your mark<Textarea className="mt-1" value={v?.reason||''} maxLength={2000} rows={2} onChange={e=>change(c.criterion_code,'reason',e.target.value)}/></label>
        <label className="mt-2 block text-sm font-semibold">What is missing, or what evidence is fully met?<Textarea className="mt-1" value={v?.missing||''} maxLength={2000} rows={2} onChange={e=>change(c.criterion_code,'missing',e.target.value)}/></label>
       </fieldset>;
      })}</div>
      <p className="mt-3 text-sm font-semibold">Raw rubric total: {rubric.reduce((sum,c)=>sum+Number(scores[c.criterion_code]?.points||0),0)}/100 before any policy-defined resubmission penalty.</p>
      <label className="mt-3 block text-sm font-semibold">Individual written feedback<Textarea className="mt-1" disabled={!!busy} maxLength={6000} rows={4} value={feedback} onChange={e=>{setDirty(true);setFeedback(e.target.value);}} placeholder="Summarise strengths, missed criteria, improvements and how to prepare for the next assessment"/></label>
      <FeedbackLibrary disabled={!!busy} onInsert={text=>{const next=appendFeedback(feedback,text);if(next===null){toast.error('Feedback is limited to 6,000 characters.');return;}setFeedback(next);setDirty(true);}}/>
      <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Feedback prompts</summary><p className="my-2 text-sm text-muted-foreground">Insert a starting point, then replace every bracketed instruction with feedback specific to this submission. Prompts never set scores.</p><div className="flex flex-wrap gap-2">{feedbackPrompts.map(p=><Button key={p.id} size="sm" variant="outline" disabled={!!busy} onClick={()=>{const next=appendFeedback(feedback,p.text);if(next===null){toast.error('Feedback is limited to 6,000 characters. Shorten it before adding a prompt.');return;}setFeedback(next);setDirty(true);}}>{p.label}</Button>)}</div></details>
      <Button className="mt-3 w-full sm:w-auto" disabled={!!busy||!rubric.length||completed!==rubric.length||feedback.trim().length<40} onClick={()=>void mark()}>Send independent human mark to IQA</Button>
     </section>}
     {draftReady===current.id&&current.status==='submitted'&&current.attempt_no<brief.max_attempts&&Date.now()<=new Date(brief.submission_cutoff).getTime()&&
      <section className="rounded-xl border bg-card p-5"><h2 className="flex gap-2 font-semibold"><RotateCcw className="size-5"/>Return for resubmission instead</h2>
       <p className="mt-2 text-xs text-muted-foreground">Allowed by {brief.policy_reference}. Provide precise reasons and improvement instructions. Remaining time: until {new Date(brief.submission_cutoff).toLocaleString()}.</p>
       <Textarea disabled={!!busy} aria-label="Resubmission guidance" rows={4} className="mt-3" maxLength={6000} value={guidance} onChange={e=>{setDirty(true);setGuidance(e.target.value);}} placeholder="Explain which learning outcomes are not evidenced, what work needs adding, and how to correct it."/>
       <Button className="mt-3" variant="outline" disabled={!!busy||guidance.trim().length<50} onClick={()=>void resubmit()}>Request permitted revision</Button>
      </section>}
     {!eligible&&<p className="rounded-lg border bg-secondary p-4 text-sm">Marking is no longer available in this attempt state. IQA approval or a separate review is required.</p>}
    </>}
   </section>
  </div>}
 </DashboardLayout>;
}
