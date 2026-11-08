import CentreFeedbackLibrary from '@/components/assessment/CentreFeedbackLibrary';
import {prepareDraftRestore} from '@/lib/assessment/draftRestore';
import PrivateDraftHistory,{type PrivateDraftSnapshot} from '@/components/assessment/PrivateDraftHistory';
import {confirmedDraftReceipt} from '@/lib/assessment/draftReceipt';
import {confirmedMarkReceipt} from '@/lib/assessment/markReceipt';
import {canUseActiveRole} from '@/lib/roleMembership';
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
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {toast} from 'sonner';
import {ClipboardCheck,ShieldCheck,Sparkles,RotateCcw} from 'lucide-react';

type Allocation={attempt_id:string;marker_id:string};
type Attempt={id:string;brief_id:string;student_id:string;attempt_no:number;evidence_text:string;status:string;submitted_at:string;resubmission_guidance:string|null};
type Brief={id:string;title:string;lecturer_id:string;learning_outcomes:string;teaching_summary:string;student_expectations:string;required_evidence:string;policy_reference:string;max_attempts:number;submission_cutoff:string};
type Criterion={id:string;brief_id:string;criterion_code:string;criterion_description:string;learning_outcome:string;scoring_guidance:string;max_points:number;display_order:number};
type DraftCriterion={criterion_code:string;suggested_points:number;evidence_quote:string;missing_evidence:string;rationale:string;feedback:string};
type AIDraft={id:string;attempt_id:string;criteria_results:DraftCriterion[];suggested_raw_score:number;strengths:string;missing_work:string;feedback:string;created_at:string};
type MarkCriterion={code:string;points:number;reason:string;evidence:string;missing:string};
type Context={scope:string;attempt:string;generation:number};
type Action=Context&{kind:'draft'|'mark'|'resubmit'|'ai'|'status'};
type MarkReview={context:Context;attempt:Attempt;title:string;marker:string;tenant:string;criteria:MarkCriterion[];scores:Record<string,MarkCriterion>;feedback:string;guidance:string;dirty:boolean};
type UnconfirmedMark={review:MarkReview;message:string};
const attemptStatuses=['submitted','resubmission_requested','human_marked','qa_rejected','qa_approved','released'];
const markingOpen=(status:string)=>['submitted','qa_rejected'].includes(status);
const copyScores=(scores:Record<string,MarkCriterion>)=>Object.fromEntries(Object.entries(scores).map(([code,value])=>[code,{...value}]));
const errorMessage=(error:unknown,fallback:string)=>typeof (error as {message?:unknown})?.message==='string'?(error as {message:string}).message:fallback;

export default function IndependentMarkerQueue(){
 const {user,loading}=useAuth();
 const roles=Array.isArray(user?.roles)?[...user.roles].sort().join(','):'';
 const permitted=!loading&&!!user?.id&&!!user.tenantId&&canUseActiveRole(user,['assessor','programme_leader','centre_director','superadmin']);
 const scope=[user?.id,user?.tenantId,user?.role,roles,Boolean(loading)].join(':');
 const latestScope=useRef(scope);latestScope.current=scope;
 return <MarkerWorkspace key={scope} scope={scope} latestScope={latestScope} permitted={permitted}/>;
}

function MarkerWorkspace({scope,latestScope,permitted}:{scope:string;latestScope:{current:string};permitted:boolean}){
 const [params,setParams]=useSearchParams();
 const {user,loading:authLoading}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const selected=params.get('attempt')||'';
 const selection=useRef({id:selected,generation:0});
 if(selection.current.id!==selected)selection.current={id:selected,generation:selection.current.generation+1};
 const context:Context={scope,attempt:selected,generation:selection.current.generation};
 const mounted=useRef(true),generation=useRef(0),draftGeneration=useRef(0);
 const operation=useRef<Action|null>(null),reviewRef=useRef<MarkReview|null>(null);
 const uncertainMarks=useRef(new Map<string,UnconfirmedMark>());
 const draftReadyRef=useRef(''),draftUncertainRef=useRef(false);
 const markButton=useRef<HTMLButtonElement>(null),statusButton=useRef<HTMLButtonElement>(null);
 const [attempts,setAttempts]=useState<Attempt[]>([]),[briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]),[drafts,setDrafts]=useState<AIDraft[]>([]);
 const [scores,setScores]=useState<Record<string,MarkCriterion>>({});
 const [feedback,setFeedback]=useState(''),[guidance,setGuidance]=useState('');
 const [draftRevision,setDraftRevision]=useState(0),[draftReady,setDraftReady]=useState(''),[draftError,setDraftError]=useState('');
 const [draftReload,setDraftReload]=useState(0),[savedAt,setSavedAt]=useState(''),[draftUncertain,setDraftUncertain]=useState(false);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('action'),[dirty,setDirty]=useState(false),[page,setPage]=useState(0);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const [review,setReview]=useState<MarkReview|null>(null);
 const [confirmation,setConfirmation]=useState<{review:MarkReview;score:number}|null>(null);
 const [actionError,setActionError]=useState<{attempt:string;message:string}|null>(null);
 const [statusMessage,setStatusMessage]=useState<{attempt:string;message:string}|null>(null);
 const pendingMark=uncertainMarks.current.get(selected);
 const current=attempts.find(a=>a.id===selected),brief=briefs.find(b=>b.id===current?.brief_id);
 const rubric=useMemo(()=>criteria.filter(c=>c.brief_id===current?.brief_id),[criteria,current?.brief_id]);
 const ai=drafts.find(d=>d.attempt_id===selected);
 const eligible=!!current&&markingOpen(current.status);
 const currentContext=useCallback((target:Context)=>permitted&&mounted.current&&latestScope.current===target.scope&&target.scope===scope
  &&selection.current.id===target.attempt&&selection.current.generation===target.generation,[latestScope,scope,permitted]);
 const active=(token:Action)=>operation.current===token&&currentContext(token);
 const acquire=(kind:Action['kind'],target:Context=context)=>{
  if(!permitted||authLoading||!uid||!tenant||!target.attempt||!currentContext(target)||operation.current)return null;
  const token:Action={...target,kind};operation.current=token;setBusy(kind);setActionError(null);return token;
 };
 const finish=(token:Action)=>{
  if(operation.current!==token)return;operation.current=null;
  if(currentContext(token))setBusy('');
 };
 const changeSelection=(id:string)=>setParams(previous=>{const next=new URLSearchParams(previous);if(id)next.set('attempt',id);else next.delete('attempt');return next;},{replace:true});
 const canEdit=()=>currentContext(context)&&eligible&&draftReadyRef.current===selected&&!operation.current&&!reviewRef.current&&!uncertainMarks.current.has(selected);
 const closeReview=()=>{
  if(operation.current)return;
  reviewRef.current=null;setReview(null);
 };

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const uncertainCount=uncertainMarks.current.size;
 useEffect(()=>{
  if(!dirty&&!uncertainCount)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty,uncertainCount]);
 useEffect(()=>setPage(0),[query,filter]);
 useEffect(()=>{
  if(operation.current&&!currentContext(operation.current)){operation.current=null;setBusy('');}
  if(reviewRef.current&&!currentContext(reviewRef.current.context)){reviewRef.current=null;setReview(null);}
  if(selected)setConfirmation(null);
 },[selected,currentContext]);

 const load=useCallback(async()=>{
  const token=++generation.current;
  const currentRequest=()=>mounted.current&&latestScope.current===scope&&token===generation.current;
  if(authLoading){setLoading(true);return;}
  if(!permitted||!uid||!tenant){setError('A verified active assessment role and centre are required to open this workspace');setLoading(false);return;}
  setLoading(true);setError('');setPage(0);
  try{
   const allocations=await allocatedAssessmentRows('unipathway_assessment_allocations','attempt_id,marker_id',tenant,'marker_id',uid,currentRequest);
   if(!currentRequest())return;if(allocations.error)throw Error(allocations.error.message);
   const ids=((allocations.data||[]) as Allocation[]).map(row=>row.attempt_id);
   if(!ids.length){setAttempts([]);setBriefs([]);setCriteria([]);setDrafts([]);return;}
   const [at,advisory]=await Promise.all([
    assessmentRowsByIds('unipathway_assessment_attempts','id,brief_id,student_id,attempt_no,evidence_text,status,submitted_at,resubmission_guidance',tenant,'id',ids,currentRequest),
    assessmentRowsByIds('unipathway_assessment_ai_drafts','id,attempt_id,criteria_results,suggested_raw_score,strengths,missing_work,feedback,created_at',tenant,'attempt_id',ids,currentRequest)
   ]);
   if(!currentRequest())return;if(at.error||advisory.error)throw Error(at.error?.message||advisory.error?.message);
   const list=((at.data||[]) as Attempt[]).sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)||a.id.localeCompare(b.id));
   const briefIds=[...new Set(list.map(row=>row.brief_id))];
   if(!briefIds.length){setAttempts(list);setBriefs([]);setCriteria([]);setDrafts([]);return;}
   const [b,c]=await Promise.all([
    assessmentRowsByIds('unipathway_assessment_briefs','id,title,lecturer_id,learning_outcomes,teaching_summary,student_expectations,required_evidence,policy_reference,max_attempts,submission_cutoff',tenant,'id',briefIds,currentRequest),
    assessmentRowsByIds('unipathway_assessment_criteria','id,brief_id,criterion_code,criterion_description,learning_outcome,scoring_guidance,max_points,display_order',tenant,'brief_id',briefIds,currentRequest)
   ]);
   if(!currentRequest())return;if(b.error||c.error)throw Error(b.error?.message||c.error?.message);
   setAttempts(list);setDrafts(((advisory.data||[]) as AIDraft[]).sort((a,b)=>b.created_at.localeCompare(a.created_at)));
   setBriefs((b.data||[]) as Brief[]);setCriteria(((c.data||[]) as Criterion[]).sort((a,b)=>a.display_order-b.display_order));
  }catch(cause){
   if(!currentRequest())return;
   setAttempts([]);setBriefs([]);setCriteria([]);setDrafts([]);setError(errorMessage(cause,'Unable to load independent assessor queue'));
  }finally{if(currentRequest())setLoading(false);}
 },[uid,tenant,authLoading,scope,latestScope,permitted]);
 useEffect(()=>{void load();const counter=generation;return()=>{counter.current++;};},[load]);

 useEffect(()=>{
  const target:Context={scope,attempt:selected,generation:selection.current.generation};
  const request=++draftGeneration.current;
  let requestActive=true;
  const currentRequest=()=>requestActive&&request===draftGeneration.current&&currentContext(target);
  draftReadyRef.current='';draftUncertainRef.current=false;
  setDraftReady('');setDraftError('');setSavedAt('');setDraftRevision(0);setDraftUncertain(false);
  if(!current?.id||!uid||!tenant||authLoading||!permitted)return;
  const retained=uncertainMarks.current.get(current.id)?.review;
  setScores(retained?copyScores(retained.scores):{});setFeedback(retained?.feedback||'');setGuidance(retained?.guidance||'');setDirty(retained?.dirty||false);
  void Promise.resolve(db.from('uni_marking_drafts').select('criteria,feedback,guidance,revision,updated_at')
   .eq('attempt_id',current.id).eq('marker_id',uid).eq('tenant_id',tenant).limit(1)).then(result=>{
    if(!currentRequest())return;if(result.error)throw result.error;const draft=result.data?.[0];
    if(draft){
     if(!retained){setScores(draft.criteria||{});setFeedback(draft.feedback||'');setGuidance(draft.guidance||'');}
     setDraftRevision(draft.revision);setSavedAt(draft.updated_at);
    }
    draftReadyRef.current=target.attempt;setDraftReady(target.attempt);
   }).catch(()=>{if(currentRequest())setDraftError('Saved draft could not be checked. Retry before editing to avoid overwriting existing work.');});
  return()=>{requestActive=false;};
 },[current?.id,selected,uid,tenant,authLoading,draftReload,currentContext,scope,permitted]);

 async function saveDraft(){
  if(!current||!canEdit()||draftUncertainRef.current)return;
  const token=acquire('draft');if(!token)return;
  const expected={attempt:current.id,owner:uid,tenant,revision:draftRevision,criteria:copyScores(scores),feedback,guidance};
  setDraftError('');
  try{
   const result=await db.rpc('save_uni_marking_draft',{p_attempt:expected.attempt,p_revision:expected.revision,p_criteria:expected.criteria,p_feedback:expected.feedback,p_guidance:expected.guidance});
   if(!active(token))return;
   if(result?.error)throw result.error;const row=Array.isArray(result?.data)&&result.data.length===1?result.data[0]:result?.data;
   if(!confirmedDraftReceipt(row,expected))throw Error('Save receipt did not match this draft.');
   setDraftRevision(row.revision);setSavedAt(row.updated_at);setDirty(false);toast.success('Private draft saved. No mark submitted.');
  }catch(cause){
   if(active(token)){draftUncertainRef.current=true;setDraftUncertain(true);setDraftError(errorMessage(cause,'Draft save was not confirmed.')+' Your edits remain here. Reload the saved draft to verify its latest state before saving again.');}
  }finally{finish(token);}
 }
 const reloadDraft=()=>{
  if(operation.current||reviewRef.current||uncertainMarks.current.has(selected)||!currentContext(context))return;
  if(dirty&&!window.confirm('Discard unsaved edits and reload your latest saved draft?'))return;
  draftReadyRef.current='';setDraftReload(value=>value+1);
 };
 const restoreDraft=(snapshot:PrivateDraftSnapshot)=>{
  if(!canEdit()||draftUncertainRef.current)return false;
  const content=prepareDraftRestore(snapshot,rubric);
  if(!content||!Number.isInteger(snapshot.revision)||snapshot.revision<1){toast.error('This saved revision does not match the current rubric or field limits. Your editor is unchanged.');return false;}
  const warning=dirty?'This replaces your unsaved edits. ':'This replaces the current editor fields. ';
  if(!window.confirm(warning+'Load private draft revision '+snapshot.revision+' for review? You must save separately to create a new revision. No mark will be submitted.'))return false;
  if(!canEdit())return false;
  setScores(content.criteria);setFeedback(content.feedback);setGuidance(content.guidance);setDirty(true);return true;
 };
 const select=(id:string)=>{
  if(operation.current||reviewRef.current||id===selected)return;
  if(uncertainMarks.current.has(selected)){
   if(!window.confirm('Keep this unconfirmed mark for a status check and open another submission? Its reviewed draft stays in this workspace.'))return;
  }else if(dirty&&!window.confirm('Discard your unsent marking edits and open another submission?'))return;
  changeSelection(id);
 };
 const change=(code:string,key:keyof MarkCriterion,value:string|number)=>{
  if(!canEdit())return;
  setDirty(true);setScores(previous=>({...previous,[code]:{...(previous[code]||{code,points:0,reason:'',evidence:'',missing:''}),[key]:value}}));
 };
 const insertFeedback=(text:string)=>{
  if(!canEdit())return false;
  const next=appendFeedback(feedback,text);if(next===null){toast.error('Feedback is limited to 6,000 characters.');return false;}
  setFeedback(next);setDirty(true);return true;
 };
 const populate=()=>{
  if(!canEdit())return;
  if(!ai){toast.error('No AI report available. Use manual scoring.');return;}
  if(!window.confirm('Populate editable fields from Omniqora suggestions? You must verify all cited evidence and personally justify each decision.'))return;
  if(!canEdit())return;
  const next:Record<string,MarkCriterion>={};
  rubric.forEach(criterion=>{const draft=(ai.criteria_results||[]).find(row=>row.criterion_code===criterion.criterion_code);
   next[criterion.criterion_code]={code:criterion.criterion_code,points:Number(draft?.suggested_points)||0,reason:draft?.rationale||'',
    evidence:draft?.evidence_quote||'No supporting excerpt',missing:draft?.missing_evidence||'None identified'};});
  setDirty(true);setScores(next);setFeedback(ai.feedback||'');
 };
 const runAI=async()=>{
  if(!current||current.status!=='submitted'||reviewRef.current||uncertainMarks.current.has(selected)||!tenant)return;
  const token=acquire('ai');if(!token)return;
  try{
   const result=await supabase.functions.invoke('omniqora-assessment-advisory',{body:{attemptId:token.attempt}});
   if(!active(token))return;
   if(result.error||result.data?.error)throw Error(result.data?.error||result.error?.message||'AI is unavailable, human marking remains possible');
   const refreshed=await assessmentRowsByIds('unipathway_assessment_ai_drafts','id,attempt_id,criteria_results,suggested_raw_score,strengths,missing_work,feedback,created_at',tenant,'attempt_id',[token.attempt],()=>active(token));
   if(!active(token))return;if(refreshed.error)throw refreshed.error;
   const verified=((refreshed.data||[]) as AIDraft[]).filter(row=>row.attempt_id===token.attempt);
   if(!verified.length)throw Error('No private AI draft could be verified. Human marking remains available.');
   setDrafts(previous=>[...previous.filter(row=>row.attempt_id!==token.attempt),...verified].sort((a,b)=>b.created_at.localeCompare(a.created_at)));
   toast.success('Private AI criterion draft ready; human verification is required.');
  }catch(cause){
   if(active(token)){const message=errorMessage(cause,'AI is unavailable, human marking remains possible');setActionError({attempt:token.attempt,message});toast.error(message);}
  }finally{finish(token);}
 };
 const mark=()=>{
  if(!current||!brief||!uid||!tenant||!canEdit())return;
  const all=rubric.map(criterion=>scores[criterion.criterion_code]);
  if(all.length<2||all.some((score,index)=>!criterionComplete(score,Number(rubric[index].max_points)))||feedback.trim().length<40){
   toast.error('Verify every criterion: evidence, missing work, score, reasoning and written feedback.');return;
  }
  if(/\[[^\]]+\]/.test(feedback)){toast.error('Replace bracketed feedback prompts with individual feedback before submitting.');return;}
  const reviewed:MarkReview={context:{...context},attempt:{...current},title:brief.title,marker:uid,tenant,
   criteria:all.map(score=>({...score})),scores:copyScores(scores),feedback,guidance,dirty};
  reviewRef.current=reviewed;setReview(reviewed);
 };
 const submitMark=async()=>{
  const reviewed=reviewRef.current;
  if(!reviewed||!currentContext(reviewed.context)||uncertainMarks.current.has(reviewed.attempt.id))return;
  const token=acquire('mark',reviewed.context);if(!token)return;
  uncertainMarks.current.set(token.attempt,{review:reviewed,message:'The submitted mark still needs a verified status check. Your reviewed draft is retained.'});
  try{
   const result=await db.rpc('record_unipathway_human_mark',{p_attempt:reviewed.attempt.id,p_criteria:reviewed.criteria,p_feedback:reviewed.feedback.trim()});
   if(!active(token))return;
   if(result?.error)throw result.error;
   if(!confirmedMarkReceipt(result?.data))throw Error('The response did not confirm a recorded private score.');
   uncertainMarks.current.delete(token.attempt);
   setAttempts(previous=>previous.map(attempt=>attempt.id===token.attempt?{...attempt,status:'human_marked'}:attempt));
   setConfirmation({review:reviewed,score:result.data});setDirty(false);
   reviewRef.current=null;setReview(null);changeSelection('');
   toast.success('Mark saved privately for independent IQA review.');
  }catch(cause){
   if(active(token)){
    uncertainMarks.current.set(token.attempt,{review:reviewed,message:errorMessage(cause,'The mark was not confirmed.')+' Your draft and selection remain here. Check marking status before submitting again.'});
    reviewRef.current=null;setReview(null);setStatusMessage(null);
    toast.error('Mark not confirmed. Check marking status before submitting again.');
   }
  }finally{finish(token);}
 };
 const checkMarkStatus=async()=>{
  const retained=uncertainMarks.current.get(selected);
  if(!retained||!current||!uid||!tenant||retained.review.context.scope!==scope||reviewRef.current)return;
  const token=acquire('status');if(!token)return;
  const target=retained.review.attempt;
  try{
   const allocation=await db.from('unipathway_assessment_allocations').select('attempt_id,marker_id,tenant_id')
    .eq('tenant_id',tenant).eq('marker_id',uid).eq('attempt_id',target.id).limit(2);
   if(!active(token))return;if(allocation?.error)throw allocation.error;
   const rows=allocation?.data;
   if(!Array.isArray(rows)||rows.length!==1||rows[0].attempt_id!==target.id||rows[0].marker_id!==uid||rows[0].tenant_id!==tenant)
    throw Error('Your current allocation could not be verified. Keep this draft and contact assessment management.');
   const result=await db.from('unipathway_assessment_attempts').select('id,tenant_id,brief_id,student_id,attempt_no,status')
    .eq('tenant_id',tenant).eq('id',target.id).limit(2);
   if(!active(token))return;if(result?.error)throw result.error;
   const records=result?.data,row=Array.isArray(records)&&records.length===1?records[0]:null;
   if(!row||row.id!==target.id||row.tenant_id!==tenant||row.brief_id!==target.brief_id||row.student_id!==target.student_id
    ||row.attempt_no!==target.attempt_no||!attemptStatuses.includes(row.status))
    throw Error('This submission status could not be verified against the reviewed attempt. Keep the draft and contact assessment management.');
   setAttempts(previous=>previous.map(attempt=>attempt.id===target.id?{...attempt,status:row.status}:attempt));
   if(markingOpen(row.status)){
    // Returning to a retained submission can have a failed draft lookup. Verify
    // its save revision before unlocking; never discard the reviewed wording.
    if(draftReadyRef.current!==target.id){
     draftGeneration.current++;
     const draftResult=await db.from('uni_marking_drafts').select('attempt_id,marker_id,tenant_id,revision,updated_at')
      .eq('attempt_id',target.id).eq('marker_id',uid).eq('tenant_id',tenant).limit(2);
     if(!active(token))return;if(draftResult?.error)throw draftResult.error;
     const savedRows=draftResult?.data,saved=Array.isArray(savedRows)&&savedRows.length===1?savedRows[0]:null;
     if(!Array.isArray(savedRows)||savedRows.length>1||(savedRows.length===1&&(!saved||typeof saved!=='object'||
      saved.attempt_id!==target.id||saved.marker_id!==uid||saved.tenant_id!==tenant||!Number.isInteger(saved.revision)||saved.revision<1
      ||typeof saved.updated_at!=='string'||!Number.isFinite(Date.parse(saved.updated_at)))))
      throw Error('The saved draft revision could not be verified. Check marking status again to retry without discarding your reviewed wording.');
     setDraftRevision(saved?.revision??0);setSavedAt(saved?.updated_at||'');setDraftError('');
     draftUncertainRef.current=false;setDraftUncertain(false);draftReadyRef.current=target.id;setDraftReady(target.id);
     setScores(copyScores(retained.review.scores));setFeedback(retained.review.feedback);setGuidance(retained.review.guidance);setDirty(retained.review.dirty);
    }
    uncertainMarks.current.delete(target.id);
    setStatusMessage({attempt:target.id,message:'Current status verified: '+row.status.replaceAll('_',' ')+'. Your retained draft is ready for another review. No mark was sent by this check.'});
   }else{
    uncertainMarks.current.set(target.id,{...retained,message:'Current status verified: '+row.status.replaceAll('_',' ')+'. Further marking is unavailable in this state. Review the marking history; the earlier response did not confirm this exact draft. No additional mark was sent.'});
    setStatusMessage(null);
   }
  }catch(cause){
   if(active(token))uncertainMarks.current.set(target.id,{...retained,message:errorMessage(cause,'Marking status could not be verified.')+' Your reviewed draft remains here; another mark is still blocked.'});
  }finally{finish(token);}
 };
 const resubmit=async()=>{
  if(!current||!brief||current.status!=='submitted'||!canEdit())return;
  if(guidance.trim().length<50||current.attempt_no>=brief.max_attempts||Date.now()>new Date(brief.submission_cutoff).getTime()){
   toast.error('Resubmission requires actionable guidance, remaining attempts and an open cutoff.');return;
  }
  const token=acquire('resubmit');if(!token)return;const reviewedGuidance=guidance.trim();
  try{
   const result=await db.rpc('request_unipathway_assessment_resubmission',{p_attempt:token.attempt,p_guidance:reviewedGuidance});
   if(!active(token))return;if(result?.error)throw result.error;
   if(!result||result.error!==null)throw Error('The resubmission response was not confirmed. Your guidance and selected submission remain here.');
   // This existing RPC returns void. An error-free response remains its contract.
   setAttempts(previous=>previous.map(attempt=>attempt.id===token.attempt?{...attempt,status:'resubmission_requested',resubmission_guidance:reviewedGuidance}:attempt));
   toast.success('Individual guidance sent for a permitted resubmission, no score released.');
   setDirty(false);changeSelection('');
  }catch(cause){
   if(active(token)){const message=errorMessage(cause,'Revision guidance could not be sent. Your draft is retained.');setActionError({attempt:token.attempt,message});toast.error(message);}
  }finally{finish(token);}
 };
 const actionable=attempts.filter(a=>['submitted','qa_rejected'].includes(a.status));
 const visible=attempts.filter(a=>(filter==='all'||['submitted','qa_rejected'].includes(a.status))&&`${briefs.find(b=>b.id===a.brief_id)?.title||''} ${a.id}`.toLowerCase().includes(query.toLowerCase()));
 const completed=rubric.filter(c=>criterionComplete(scores[c.criterion_code],Number(c.max_points))).length;
 const editingBlocked=!!busy||!!review||!!pendingMark;
 return <DashboardLayout title="Independent Marker Workspace" subtitle="Mark curriculum evidence separately from the lecturer, using Omniqora only as a private assistant"><div className="min-w-0 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:[overflow-wrap:anywhere]">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>AI suggestions are not grades</h2>
   <p className="mt-2 text-sm text-muted-foreground">You—not the teaching lecturer or AI—must score every criterion and cite actual submitted evidence. Document missing outcomes and your own reasoning. A separate IQA must approve or reject the marked submission before the student sees any score. Where the approved policy permits, request revisions before the final cutoff.</p>
  </section>
  {confirmation&&<section role="status" className="mb-5 min-w-0 rounded-xl border border-primary/30 bg-primary/5 p-4">
   <h2 className="font-semibold">Mark submitted for IQA review</h2>
   <p className="mt-2 font-medium">{confirmation.review.title}</p>
   <p className="mt-1 text-sm">Attempt {confirmation.review.attempt.attempt_no} · Submission reference: <span className="break-all">{confirmation.review.attempt.id}</span></p>
   <p className="mt-3 font-semibold">Recorded private score: {confirmation.score}/100</p>
   <p className="mt-2 text-sm text-muted-foreground">This score includes any policy-defined resubmission penalty. Independent IQA review and the separate release step are still required before the learner sees a result.</p>
  </section>}
  {loading&&<p role="status">{authLoading?'Checking assessment access…':'Loading only your allocated assessments…'}</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. Try reloading. If this continues, contact your centre administrator.</p>}
  {!loading&&!error&&<div className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,1.8fr)]">
   <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"><h2 className="font-semibold">Your marking queue ({actionable.length} need action)</h2>
    <label className="mt-3 block text-sm">Find an assessment<Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title or anonymised reference"/></label>
    <label className="mt-3 block text-sm">Show<select className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="action">Needs marking</option><option value="all">All allocated submissions</option></select></label>
    <p className="mt-2 text-sm text-muted-foreground">{visible.length} matching · newest received first</p>
    <div className="mt-3 space-y-2">{visible.slice(page*25,page*25+25).map(a=><button key={a.id} disabled={!!busy||!!review} aria-pressed={selected===a.id} onClick={()=>select(a.id)} className={`w-full rounded-lg border p-3 text-left ${selected===a.id?'border-primary bg-primary/5':''}`}>
     <p className="text-sm font-semibold">{briefs.find(b=>b.id===a.brief_id)?.title||'Assessment'}</p>
     <p className="mt-1 text-xs text-muted-foreground">Anonymised ref {a.id.slice(0,8)} · attempt {a.attempt_no} · {a.status}</p>
    </button>)}</div>
    {visible.length>25&&<nav aria-label="Marking queue pages" className="mt-4 flex flex-wrap items-center gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous submissions</Button><span className="text-sm">Page {page+1} of {Math.ceil(visible.length/25)}</span><Button variant="outline" disabled={(page+1)*25>=visible.length} onClick={()=>setPage(p=>p+1)}>Next submissions</Button></nav>}
    {!!attempts.length&&!visible.length&&<p className="mt-3 text-sm text-muted-foreground">No submissions match this view. Change your search or show all allocated work.</p>}
    {!attempts.length&&<p className="mt-3 text-sm text-muted-foreground">No student work has been assigned to you. Programme management allocates each independent marker explicitly.</p>}
   </section>
   <section className="min-w-0 space-y-4">
    {pendingMark&&busy!=='mark'&&<section aria-labelledby="mark-unconfirmed-title" className="min-w-0 rounded-xl border border-destructive/50 bg-card p-4">
     <h2 id="mark-unconfirmed-title" className="font-semibold">Mark not confirmed</h2>
     <p className="mt-2 text-sm">{pendingMark.review.title} · Attempt {pendingMark.review.attempt.attempt_no}</p>
     <p className="mt-1 text-sm">Submission reference: <span className="break-all">{pendingMark.review.attempt.id}</span></p>
     <p role="status" className="mt-3 text-sm">{pendingMark.message}</p>
     <Button ref={statusButton} className="mt-3 h-auto min-h-11 w-full py-2 sm:w-auto" variant="outline" disabled={!!busy||!!review} onClick={()=>void checkMarkStatus()}>{busy==='status'?'Checking marking status…':'Check marking status'}</Button>
     {!eligible&&<details className="mt-3 border-t pt-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Retained reviewed draft</summary>
      <p className="mt-2 whitespace-pre-wrap text-sm">{pendingMark.review.feedback}</p>
      {pendingMark.review.criteria.map(criterion=><div key={criterion.code} className="mt-3 border-t pt-3 text-sm"><h3 className="font-semibold">{criterion.code} · {criterion.points} proposed points</h3><p className="mt-1 whitespace-pre-wrap">Reason: {criterion.reason}</p><p className="mt-1 whitespace-pre-wrap">Evidence: {criterion.evidence}</p><p className="mt-1 whitespace-pre-wrap">Missing or met: {criterion.missing}</p></div>)}
     </details>}
    </section>}
    {actionError?.attempt===selected&&<p role="alert" className="rounded-lg border border-destructive p-4 text-sm">{actionError.message}</p>}
    {statusMessage?.attempt===selected&&<p role="status" className="rounded-lg border bg-primary/5 p-4 text-sm">{statusMessage.message}</p>}
    {!current||!brief?<div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Select an authorised submission to review its lecturer brief, published rubric, student work and advisory AI drafts.</div>:<>
     <div className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="font-bold">{brief.title}</h2><p className="mt-1 text-xs text-muted-foreground">Attempt {current.attempt_no} · {current.status} · received {new Date(current.submitted_at).toLocaleString()}</p>
      {([
       ['Lesson and lecturer progress',brief.teaching_summary],
       ['Learning outcomes',brief.learning_outcomes],
       ['Expected coursework',brief.student_expectations],
       ['Required student evidence',brief.required_evidence]
      ] as const).map(([name,text])=><details key={name} className="mt-3 rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">{name}</summary><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></details>)}
      <EvidenceReview key={current.id} text={current.evidence_text} criteria={rubric} onCite={eligible&&!editingBlocked&&draftReady===current.id?(code,citation)=>{if(!canEdit())return false;if(scores[code]?.evidence&&!window.confirm('Replace the existing evidence citation for this criterion?'))return false;if(!canEdit())return false;change(code,'evidence',citation);return true;}:undefined}/>
      <CourseworkFiles attemptId={current.id} criteria={rubric} onCite={eligible&&!editingBlocked&&draftReady===current.id?(code,citation)=>{if(!canEdit())return false;if(scores[code]?.evidence&&!window.confirm('Replace the existing evidence citation for this criterion?'))return false;if(!canEdit())return false;change(code,'evidence',citation);return true;}:undefined}/><MarkHistory attemptId={current.id}/>

     </div>
     <div className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold"><Sparkles className="mr-1 inline size-4"/>Omniqora Intelligence — optional draft</h2>
      {!ai&&current.status==='submitted'&&<Button size="sm" variant="outline" disabled={editingBlocked} onClick={()=>void runAI()}>Analyse criteria</Button>}
     </div>
     {ai?<><p className="mt-2 text-sm text-muted-foreground">Model suggestion: {ai.suggested_raw_score}/100 internal rubric points — NOT approved.</p>
      <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Gaps:</strong> {ai.missing_work}</p>
      {eligible&&draftReady===current.id&&<Button className="mt-3" size="sm" variant="outline" disabled={editingBlocked} onClick={populate}>Copy draft into editable fields for human verification</Button>}</>:<p className="mt-2 text-sm text-muted-foreground">No authorised AI draft. You may mark entirely without AI or return to this later.</p>}
     </div>
     {eligible&&<div className="rounded-xl border bg-card p-4"><p role="status" className="text-sm">{draftReady!==current.id?'Checking your saved draft…':savedAt?`Draft revision ${draftRevision} saved ${new Date(savedAt).toLocaleString()}`:'No saved draft yet.'}</p>
      {draftError&&<p role="alert" className="my-2 text-sm text-destructive">{draftError}</p>}
      <div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" disabled={editingBlocked||draftReady!==current.id||!dirty||draftUncertain} onClick={()=>void saveDraft()}>{busy==='draft'?'Saving…':'Save private draft'}</Button>
      <Button variant="ghost" disabled={editingBlocked} onClick={reloadDraft}>Reload saved draft</Button></div><p className="mt-2 text-xs text-muted-foreground">Save before leaving this page. Drafts do not submit a mark or notify the learner.</p></div>}
     <PrivateDraftHistory attemptId={current.id} savedRevision={draftRevision} onRestore={eligible&&draftReady===current.id&&!editingBlocked&&!draftUncertain?restoreDraft:undefined}/>
     {eligible&&draftReady===current.id&&<section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"><h2 className="font-semibold"><ClipboardCheck className="mr-1 inline size-4"/>Independent criterion-by-criterion human assessment</h2>
      <p role="status" className="mt-2 text-sm text-muted-foreground">{completed} of {rubric.length} criteria complete · {dirty?'Unsaved edits — save your draft before leaving':'No unsaved edits'}</p><div className="mt-3 space-y-4">{rubric.map(c=>{const v=scores[c.criterion_code];
       return <fieldset disabled={editingBlocked} key={c.id} className="min-w-0 rounded-lg border p-3 sm:p-4">
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
      <label className="mt-3 block text-sm font-semibold">Individual written feedback<Textarea className="mt-1" disabled={editingBlocked} maxLength={6000} rows={4} value={feedback} onChange={e=>{if(!canEdit())return;setDirty(true);setFeedback(e.target.value);}} placeholder="Summarise strengths, missed criteria, improvements and how to prepare for the next assessment"/></label>
      <CentreFeedbackLibrary key={current.id} disabled={editingBlocked} onInsert={insertFeedback}/>
      <FeedbackLibrary disabled={editingBlocked} onInsert={insertFeedback}/>
      <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Feedback prompts</summary><p className="my-2 text-sm text-muted-foreground">Insert a starting point, then replace every bracketed instruction with feedback specific to this submission. Prompts never set scores.</p><div className="flex flex-wrap gap-2">{feedbackPrompts.map(p=><Button key={p.id} size="sm" variant="outline" disabled={editingBlocked} onClick={()=>insertFeedback(p.text)}>{p.label}</Button>)}</div></details>
      <Button ref={markButton} className="mt-3 h-auto min-h-11 w-full py-2 sm:w-auto" disabled={editingBlocked||!rubric.length||completed!==rubric.length||feedback.trim().length<40} onClick={()=>void mark()}>Send independent human mark to IQA</Button>
     </section>}
     {draftReady===current.id&&current.status==='submitted'&&current.attempt_no<brief.max_attempts&&Date.now()<=new Date(brief.submission_cutoff).getTime()&&
      <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"><h2 className="flex gap-2 font-semibold"><RotateCcw className="size-5"/>Return for resubmission instead</h2>
       <p className="mt-2 text-xs text-muted-foreground">Allowed by {brief.policy_reference}. Provide precise reasons and improvement instructions. Remaining time: until {new Date(brief.submission_cutoff).toLocaleString()}.</p>
       <Textarea disabled={editingBlocked} aria-label="Resubmission guidance" rows={4} className="mt-3" maxLength={6000} value={guidance} onChange={e=>{if(!canEdit())return;setDirty(true);setGuidance(e.target.value);}} placeholder="Explain which learning outcomes are not evidenced, what work needs adding, and how to correct it."/>
       <Button className="mt-3 h-auto min-h-11 py-2" variant="outline" disabled={editingBlocked||guidance.trim().length<50} onClick={()=>void resubmit()}>Request permitted revision</Button>
      </section>}
     {!eligible&&<p className="rounded-lg border bg-secondary p-4 text-sm">Marking is no longer available in this attempt state. IQA approval or a separate review is required.</p>}
    </>}
   </section>
  </div>}
  <Dialog open={!!review} onOpenChange={open=>{if(!open)closeReview();}}>
   <DialogContent className="grid-cols-1 min-w-0 w-[calc(100vw_-_min(2rem,32px))] max-w-xl max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-xl px-[min(1rem,16px)] py-4 [overflow-wrap:anywhere] sm:p-6 [&>button:last-child]:grid [&>button:last-child]:place-items-center [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:right-1 [&>button:last-child]:top-1"
    aria-busy={busy==='mark'} onEscapeKeyDown={event=>{if(operation.current)event.preventDefault();}} onInteractOutside={event=>{if(operation.current)event.preventDefault();}}
    onCloseAutoFocus={event=>{event.preventDefault();(uncertainMarks.current.has(selected)?statusButton.current:markButton.current)?.focus();}}>
    <DialogHeader className="min-w-0 text-left"><DialogTitle className="pr-12 leading-snug">Review mark</DialogTitle><DialogDescription>Check the exact submission and your private marking decision before sending it to independent IQA review.</DialogDescription></DialogHeader>
    {review&&<>
     <section aria-label="Reviewed submission" className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <h2 className="font-semibold">{review.title}</h2><p className="mt-2 text-sm">Attempt {review.attempt.attempt_no}</p>
      <p className="mt-1 text-sm">Submission reference: <span className="break-all">{review.attempt.id}</span></p>
      <p className="mt-3 text-sm font-medium">Raw rubric total: {review.criteria.reduce((sum,criterion)=>sum+criterion.points,0)}/100 before any policy-defined resubmission penalty.</p>
     </section>
     <section className="min-w-0 space-y-3"><h2 className="font-semibold">Your criterion decisions</h2>{review.criteria.map(criterion=><details key={criterion.code} className="min-w-0 rounded-lg border p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{criterion.code} · {criterion.points} points</summary><dl className="mt-2 space-y-2 whitespace-pre-wrap text-sm"><dt className="font-semibold">Evidence</dt><dd>{criterion.evidence}</dd><dt className="font-semibold">Reasoning</dt><dd>{criterion.reason}</dd><dt className="font-semibold">Missing or met</dt><dd>{criterion.missing}</dd></dl></details>)}</section>
     <section className="min-w-0 rounded-lg border p-3"><h2 className="font-semibold">Individual written feedback</h2><p className="mt-2 whitespace-pre-wrap text-sm">{review.feedback.trim()}</p></section>
     <p className="text-sm text-muted-foreground">The learner will not receive a result from this action. IQA must review the mark before the separate release step.</p>
     {busy==='mark'&&<p role="status" className="text-sm">Sending the reviewed mark. Keep this page open while its receipt is checked…</p>}
     <div className="flex min-w-0 flex-wrap gap-2 [&_button]:h-auto [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:max-w-full [&_button]:flex-[1_1_12rem] [&_button]:whitespace-normal [&_button]:px-3 [&_button]:py-2">
      <Button variant="outline" disabled={!!busy} onClick={closeReview}>Keep editing</Button>
      <Button disabled={!!busy} onClick={()=>void submitMark()}>Submit mark for IQA</Button>
     </div>
    </>}
   </DialogContent>
  </Dialog>
 </div></DashboardLayout>;
}
