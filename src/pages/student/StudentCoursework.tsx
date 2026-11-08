import {Link,useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import CourseworkFiles from '@/components/assessment/CourseworkFiles';
import SubmittedResponse from '@/components/assessment/SubmittedResponse';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,ClipboardCheck,Clock,ShieldCheck,RotateCcw} from 'lucide-react';
import {COURSEWORK_STAGES,COURSEWORK_PRIORITY,courseworkQueueState,formatPakistanAcademicDate,type CourseworkView} from '@/lib/assessment/courseworkQueue';
import {courseworkReceipt,definiteCourseworkRejection,type ReviewedCoursework} from '@/lib/assessment/courseworkSubmission';
import {canUseActiveRole} from '@/lib/roleMembership';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel} from '@/components/ui/alert-dialog';
type Module={id:string;title:string;programme_id:string};
type Brief={id:string;module_id:string;title:string;assessment_type:string;
 teaching_summary:string;learning_outcomes:string;student_expectations:string;required_evidence:string;
 due_at:string;submission_cutoff:string;max_attempts:number;penalty_points_per_resubmission:number;
 policy_reference:string;rubric_version:string};
type Criterion={id:string;brief_id:string;criterion_code:string;learning_outcome:string;criterion_description:string;scoring_guidance:string;max_points:number;display_order:number};
type Attempt={id:string;brief_id:string;attempt_no:number;status:string;submitted_at:string;resubmission_guidance:string|null;guidance_at:string|null};
type Released={attempt_id:string;brief_id:string;student_id:string;final_score:number;raw_score:number;penalty_points:number;published_feedback:string;released_at:string};
type Amendment={attempt_id:string;original_final_score:number;corrected_final_score:number;corrected_raw_score:number;corrected_feedback:string;recorded_at:string};
export default function StudentCoursework(){
 const {user,loading}=useAuth();const [params]=useSearchParams();
 return <CourseworkWorkspace moduleId={params.get('module')||undefined} key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}:${loading}`}/>;
}
function CourseworkWorkspace({moduleId}:{moduleId?:string}){
 const {user,loading:authLoading}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const permitted=!authLoading&&!!uid&&!!tenant&&!!user&&canUseActiveRole(user,['student']);
 const [modules,setModules]=useState<Module[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [results,setResults]=useState<Released[]>([]),[amendments,setAmendments]=useState<Amendment[]>([]);
 const generation=useRef(0);
 const [search,setSearch]=useState(''),[view,setView]=useState<CourseworkView>('all'),[page,setPage]=useState(0);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [attachmentIds,setAttachmentIds]=useState<Record<string,string[]>>({});
 const [fileBusy,setFileBusy]=useState<Record<string,boolean>>({});
 const requestIds=useRef<Record<string,string>>({});
 const [confirmation,setConfirmation]=useState<ReviewedCoursework|null>(null),[confirmationError,setConfirmationError]=useState('');
 const [uncertain,setUncertain]=useState<Record<string,ReviewedCoursework>>({});
 const uncertainRef=useRef<Record<string,ReviewedCoursework>>({});
 const [receipt,setReceipt]=useState<{reviewed:ReviewedCoursework;attemptId:string}|null>(null);
 const [confirmedBriefs,setConfirmedBriefs]=useState<Record<string,boolean>>({});
 const [recoveryMessage,setRecoveryMessage]=useState<Record<string,string>>({});
 const mounted=useRef(true),operation=useRef<symbol|null>(null);
 const opener=useRef<HTMLButtonElement|null>(null),keepEditing=useRef<HTMLButtonElement|null>(null),receiptHeading=useRef<HTMLHeadingElement|null>(null);
 const focusReceipt=useRef(false);
 const scope=`${uid}:${tenant}:${user?.role}:${user?.roles?.join(',')}:${moduleId||''}`;
 const currentScope=useRef(scope);currentScope.current=scope;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;operation.current=null;};},[]);
 useEffect(()=>{operation.current=null;setBusy('');setConfirmation(null);setConfirmationError('');setReceipt(null);},[scope]);
 const rememberUncertain=(reviewed:ReviewedCoursework)=>{uncertainRef.current={...uncertainRef.current,[reviewed.briefId]:reviewed};setUncertain(uncertainRef.current);};
 const forgetUncertain=(briefId:string)=>{const next={...uncertainRef.current};delete next[briefId];uncertainRef.current=next;setUncertain(next);};
 const load=useCallback(async()=>{
  const token=++generation.current,current=()=>token===generation.current;
  setLoading(true);setError('');setModules([]);setBriefs([]);setCriteria([]);setAttempts([]);setResults([]);setAmendments([]);setPage(0);
  try{
   if(!permitted)throw Error('Assigned student and authorised centre required');
   const enrolments=await pagedRows<{programme_id:string}>(()=>db.from('student_enrolments').select('id,programme_id')
    .eq('student_id',uid).eq('tenant_id',tenant).eq('status','active'),current);
   const mods=await rowsByIds<Module>(enrolments.map(e=>e.programme_id),ids=>()=>{
    let q=db.from('modules').select('id,title,programme_id').eq('tenant_id',tenant).in('programme_id',ids);
    if(moduleId)q=q.eq('id',moduleId);return q;
   },current);
   const bs=await rowsByIds<Brief>(mods.map(m=>m.id),ids=>()=>db.from('unipathway_assessment_briefs')
    .select('id,module_id,title,assessment_type,teaching_summary,learning_outcomes,student_expectations,required_evidence,due_at,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference,rubric_version')
    .eq('tenant_id',tenant).eq('status','published').in('module_id',ids),current);
   const ids=bs.map(b=>b.id);
   const [as,rs,cs,ams]=await Promise.all([
    rowsByIds<Attempt>(ids,batch=>()=>db.from('unipathway_assessment_attempts')
     .select('id,brief_id,attempt_no,status,submitted_at,resubmission_guidance,guidance_at')
     .eq('student_id',uid).eq('tenant_id',tenant).in('brief_id',batch),current),
    rowsByIds<Released>(ids,batch=>()=>db.from('unipathway_assessment_released_results')
     .select('attempt_id,brief_id,student_id,final_score,raw_score,penalty_points,published_feedback,released_at')
     .eq('student_id',uid).eq('tenant_id',tenant).in('brief_id',batch),current,'attempt_id'),
    rowsByIds<Criterion>(ids,batch=>()=>db.from('unipathway_assessment_criteria')
     .select('id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order')
     .in('brief_id',batch),current),
    rowsByIds<Amendment>(ids,batch=>()=>db.from('unipathway_assessment_grade_amendments')
     .select('attempt_id,original_final_score,corrected_raw_score,corrected_final_score,corrected_feedback,recorded_at')
     .eq('student_id',uid).eq('tenant_id',tenant).in('brief_id',batch),current,'attempt_id')
   ]);
   if(current()){setModules(mods);setBriefs(bs.sort((a,b)=>a.due_at.localeCompare(b.due_at)||a.id.localeCompare(b.id)));setCriteria(cs.sort((a,b)=>a.display_order-b.display_order));setAttempts(as);setResults(rs);setAmendments(ams);}
  }catch{if(current())setError('Unable to verify enrolled coursework');}
  finally{if(current())setLoading(false);}
 },[uid,tenant,moduleId,permitted]);
 const invalidate=useCallback(()=>{generation.current++;},[]);
 useEffect(()=>{void load();return invalidate;},[load,invalidate]);
 const refreshCurrent=useRef(load);refreshCurrent.current=load;
 const grouped=useMemo(()=>{
  const map=new Map<string,Attempt[]>();
  attempts.forEach(a=>{const list=map.get(a.brief_id)||[];list.push(a);map.set(a.brief_id,list)});
  for(const a of map.values())a.sort((x,y)=>y.attempt_no-x.attempt_no);
  return map;
 },[attempts]);
 const now=Date.now();
 const releasedBriefIds=new Set(results.map(r=>r.brief_id));
 const queue=new Map(briefs.map(b=>[b.id,courseworkQueueState(b,grouped.get(b.id)||[],releasedBriefIds.has(b.id),now)]));
 const counts:Record<CourseworkView,number>={all:briefs.length,action:0,review:0,released:0,closed:0};
 for(const item of queue.values())counts[item.stage]++;
 const term=search.trim().toLowerCase();
 const visible=briefs.filter(b=>(!moduleId||b.module_id===moduleId)
   &&(view==='all'||queue.get(b.id)?.stage===view)
   &&(!term||[b.title,b.assessment_type,modules.find(m=>m.id===b.module_id)?.title||''].join(' ').toLowerCase().includes(term)))
  .sort((a,b)=>(COURSEWORK_PRIORITY[queue.get(a.id)!.stage]-COURSEWORK_PRIORITY[queue.get(b.id)!.stage])
    ||a.due_at.localeCompare(b.due_at)||a.id.localeCompare(b.id));
 const reviewSubmission=(b:Brief,button:HTMLButtonElement)=>{
  if(!permitted||operation.current||busy)return;
  opener.current=button;focusReceipt.current=false;setConfirmationError('');
  const previous=uncertainRef.current[b.id];
  if(previous){setConfirmation(previous);return;}
  if(fileBusy[b.id]!==false){toast.error('Wait for attachments to load or finish uploading.');return;}
  const list=grouped.get(b.id)||[],latest=list[0];
  const allowed=courseworkQueueState(b,list,releasedBriefIds.has(b.id),Date.now()).maySubmit;
  if(!allowed){toast.error('Submission requires an open window and a marker-issued resubmission instruction.');return;}
  const rawDraft=drafts[b.id]||'',work=rawDraft.trim();
  if(work.length<30||work.length>50000){toast.error('Provide between 30 and 50,000 characters of original evidence.');return;}
  requestIds.current[b.id] ||= crypto.randomUUID();
  setConfirmation({briefId:b.id,title:b.title,rawDraft,evidence:work,uploadIds:[...(attachmentIds[b.id]||[])].sort(),requestId:requestIds.current[b.id],attemptNo:(latest?.attempt_no||0)+1});
 };
 const confirmReceipt=(reviewed:ReviewedCoursework,attemptId:string)=>{
  focusReceipt.current=true;
  setConfirmedBriefs(previous=>({...previous,[reviewed.briefId]:true}));
  setReceipt({reviewed,attemptId});forgetUncertain(reviewed.briefId);setConfirmation(null);setConfirmationError('');
  setDrafts(previous=>previous[reviewed.briefId]===reviewed.rawDraft?{...previous,[reviewed.briefId]:''}:previous);
  delete requestIds.current[reviewed.briefId];
 };
 const submit=async()=>{
  const reviewed=confirmation;
  if(!reviewed||!permitted||operation.current)return;
  const priorUncertainty=!!uncertainRef.current[reviewed.briefId];
  const brief=briefs.find(b=>b.id===reviewed.briefId);
  if(!brief||loading||error){setConfirmationError('Coursework must be verified before submitting. Close this review and refresh assignments.');return;}
  if(!priorUncertainty&&(!courseworkQueueState(brief,grouped.get(brief.id)||[],releasedBriefIds.has(brief.id),Date.now()).maySubmit||fileBusy[brief.id]!==false)){
   setConfirmationError('The submission window or attachments have changed. Keep editing, then check the current assignment before submitting.');return;
  }
  const token=Symbol('submission'),startedScope=scope;operation.current=token;
  const current=()=>mounted.current&&currentScope.current===startedScope&&operation.current===token;
  setBusy(reviewed.briefId);setConfirmationError('');rememberUncertain(reviewed);
  try{
   const response=await db.rpc('submit_unipathway_coursework',{p_brief:reviewed.briefId,p_evidence:reviewed.evidence,p_uploads:reviewed.uploadIds,p_request:reviewed.requestId});
   if(!current())return;
   if(response.error){
    if(!priorUncertainty&&definiteCourseworkRejection(response.error)){
     forgetUncertain(reviewed.briefId);setConfirmationError('Submission was not accepted. Your draft is still here. Keep editing to check the submission window and finish any attachments, then review it again.');return;
    }
    throw response.error;
   }
   const attemptId=courseworkReceipt(response.data);
   if(!attemptId)throw Error('Missing submission receipt');
   confirmReceipt(reviewed,attemptId);await refreshCurrent.current();
  }catch{
   if(current())setConfirmationError('Submission could not be confirmed. Your reviewed text and attachments are kept for a safe retry. Later draft edits are not included in that retry.');
  }finally{if(current()){operation.current=null;setBusy('');}}
 };
 const checkReceipt=async(reviewed:ReviewedCoursework)=>{
  if(!permitted||operation.current)return;
  const token=Symbol('receipt'),startedScope=scope;operation.current=token;
  const current=()=>mounted.current&&currentScope.current===startedScope&&operation.current===token;
  setBusy(reviewed.briefId);setRecoveryMessage(previous=>({...previous,[reviewed.briefId]:''}));
  try{
   const response=await db.from('unipathway_assessment_attempts').select('id,brief_id,submission_request_id')
    .eq('tenant_id',tenant).eq('student_id',uid).eq('brief_id',reviewed.briefId).eq('submission_request_id',reviewed.requestId).maybeSingle();
   if(!current())return;
   if(response.error)throw response.error;
   const row=response.data,attemptId=courseworkReceipt(row?.id);
   if(row&&(!attemptId||row.brief_id!==reviewed.briefId||row.submission_request_id!==reviewed.requestId))throw Error('Receipt mismatch');
   if(attemptId){confirmReceipt(reviewed,attemptId);await refreshCurrent.current();}
   else setRecoveryMessage(previous=>({...previous,[reviewed.briefId]:'No receipt is visible yet. This does not confirm that the earlier request failed. Retry the reviewed submission, or contact your centre if the connection problem continues.'}));
  }catch{if(current())setRecoveryMessage(previous=>({...previous,[reviewed.briefId]:'Submission status could not be verified. Your reviewed version is still kept for retry; no new submission has been sent.'}));}
  finally{if(current()){operation.current=null;setBusy('');}}
 };
 const hasUnsentLaterEdits=(briefId:string)=>!!confirmedBriefs[briefId]&&!!drafts[briefId]&&(!uncertain[briefId]||drafts[briefId]!==uncertain[briefId].rawDraft);
 if(!permitted)return <DashboardLayout title="Assignments" subtitle="Your tasks, submissions and released feedback">{authLoading?<p role="status">Checking your student access…</p>:<p role="alert">An active, verified Student role and assigned centre are required to open coursework.</p>}</DashboardLayout>;
 return <DashboardLayout title="Assignments" subtitle="Your tasks, submissions and released feedback">
  <ModuleJourney moduleId={moduleId}/>
  {receipt&&<section role="status" aria-label="Submission receipt" className="mb-5 space-y-3 rounded-xl border border-success/40 bg-card p-5"><h2 ref={receiptHeading} tabIndex={-1} className="text-lg font-semibold">Submission confirmed</h2><p><strong>{receipt.reviewed.title}</strong> · attempt {receipt.reviewed.attemptNo}</p><p className="text-sm">Your reviewed evidence was received. Results become available after independent marking and approval.</p><p className="break-all text-xs text-muted-foreground">Submission reference: {receipt.attemptId}</p>{hasUnsentLaterEdits(receipt.reviewed.briefId)&&<UnsentLaterEdits value={drafts[receipt.reviewed.briefId]}/>}</section>}
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Fair marking and protected student evidence</h2>
   <p className="mt-2 text-sm text-muted-foreground">Review the teaching notes and exact learning outcomes before submitting. Your work goes to an independent marker; Omniqora may offer a private draft, but a separate IQA must approve release. No provisional mark is visible to you.</p>
  </section>
  {loading&&<p role="status">Checking your active enrolled assignments and released feedback…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">Assignments could not be loaded. Please retry or contact your centre.</p>}
  <section className="mb-5 space-y-3 rounded-xl border bg-card p-4" aria-label="Coursework work queue">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Your coursework queue</h2><p className="text-sm text-muted-foreground">Find work needing attention, check marking progress and read released feedback.</p></div><Button variant="outline" className="min-h-11" disabled={loading||!!busy} onClick={()=>void load()}>Refresh assignments</Button></div>
   <div role="group" aria-label="Coursework status" className="flex flex-wrap gap-2">{COURSEWORK_STAGES.map(tab=><button type="button" key={tab.value} aria-pressed={view===tab.value} disabled={loading||!!error} onClick={()=>{setView(tab.value);setPage(0);}} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring '+(view===tab.value?'bg-primary text-primary-foreground':'bg-background text-foreground hover:bg-accent')}>{tab.label} ({counts[tab.value]})</button>)}</div>
   <label className="block text-sm font-semibold">Search coursework<input type="search" className="mt-1 min-h-11 w-full max-w-xl rounded-lg border bg-background px-3 py-2 font-normal" maxLength={120} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Assessment, module or type"/></label>
   {!loading&&!error&&<p role="status" aria-live="polite" className="text-sm text-muted-foreground">{visible.length} of {briefs.length} published assignments match. Times below use Pakistan time (PKT).</p>}
   {(search||view!=='all')&&<Button variant="ghost" className="min-h-11" onClick={()=>{setSearch('');setView('all');setPage(0);}}>Clear coursework filters</Button>}
  </section>
  {!loading&&!error&&!visible.length&&<p className="rounded-xl border bg-card p-6 text-sm">{search||view!=='all'?'No coursework matches these filters. Clear the filters to see every published assignment.':'Your lecturers have not published coursework under your currently enrolled modules yet.'}</p>}
  {!loading&&!error&&<div className="space-y-5">{visible.slice(page*10,page*10+10).map(b=>{
   const list=grouped.get(b.id)||[],latest=list[0],released=results.filter(r=>r.brief_id===b.id);
   const state=queue.get(b.id)!;
   const maySubmit=state.maySubmit;
   const cutoff=Date.parse(b.submission_cutoff);
   const within=Number.isFinite(cutoff)&&Date.now()<=cutoff;
   const rubric=criteria.filter(c=>c.brief_id===b.id);
   return <article key={b.id} className="rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div className="min-w-0"><p className="text-xs font-semibold uppercase text-success">{modules.find(m=>m.id===b.module_id)?.title||'My module'} · {b.assessment_type}</p>
      <h2 className="mt-2 break-words text-xl font-bold">{b.title}</h2>
     </div><span className="rounded-lg border px-3 py-2 text-xs font-semibold text-foreground">{state.stage==='action'?'Ready for submission':state.stage==='review'?'Awaiting independent review':state.stage==='released'?'Approved feedback available':'Submission window closed'}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="size-4"/>Due {formatPakistanAcademicDate(b.due_at)}</span>
      <span>Final cutoff {formatPakistanAcademicDate(b.submission_cutoff)}</span><span>Attempts: {list.length}/{b.max_attempts}</span></div>
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,max(18rem,calc(50%_-_0.375rem))),1fr))] gap-3">
     {([
      ['Lessons covered / lecturer progress',b.teaching_summary],
      ['Learning outcomes',b.learning_outcomes],
      ['What your coursework must demonstrate',b.student_expectations],
      ['Required evidence and deliverables',b.required_evidence]
     ] as const).map(([heading,text])=><section key={heading} className="rounded-lg bg-secondary/40 p-3"><h3 className="text-sm font-semibold">{heading}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></section>)}
    </div>
    <h3 className="mt-5 flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4"/>Published marking criteria ({rubric.length})</h3>
    <div className="mt-2 space-y-2">{rubric.map(c=><div key={c.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{c.criterion_code} — {c.max_points} rubric points</p>
     <p className="mt-1">{c.learning_outcome}</p><p className="mt-1 text-muted-foreground">{c.criterion_description}</p><p className="mt-1 text-xs text-muted-foreground">Marker standard: {c.scoring_guidance}</p></div>)}</div>
    <div className="mt-4 rounded-lg border border-warning/40 p-3 text-sm"><strong>Resubmission rule:</strong> Up to {b.max_attempts} attempt(s); {b.penalty_points_per_resubmission} internal percentage points deducted per permitted resubmission, only where permitted under the published {b.policy_reference} policy. No resubmissions after {formatPakistanAcademicDate(b.submission_cutoff)}.</div>
    {uncertain[b.id]&&<section aria-label={`Unconfirmed submission for ${b.title}`} className="mt-4 space-y-3 rounded-lg border border-warning/50 p-4"><h3 className="font-semibold">Submission not confirmed</h3><p className="text-sm">The reviewed version is kept for a safe retry. You may keep editing your text, but later edits are not part of that retry. Attachment changes pause until the earlier submission is confirmed.</p><div className="flex flex-wrap gap-2"><Button disabled={!!busy} onClick={event=>reviewSubmission(b,event.currentTarget)}>Retry reviewed submission</Button><Button variant="outline" disabled={!!busy} onClick={()=>void checkReceipt(uncertain[b.id])}>Check submission status</Button></div>{recoveryMessage[b.id]&&<p role="alert" className="text-sm">{recoveryMessage[b.id]}</p>}</section>}
    {maySubmit&&<CourseworkFiles key={`${b.id}:${list.length}`} briefId={b.id} disabled={!!busy||!!uncertain[b.id]} onFiles={ids=>setAttachmentIds(old=>({...old,[b.id]:ids}))} onBusy={value=>setFileBusy(old=>({...old,[b.id]:value}))}/>}
    {list.map(a=><section key={a.id} className="mt-3 rounded-lg bg-secondary/30 p-3">
     <p className="font-semibold text-sm">Attempt {a.attempt_no} — {a.status}</p><CourseworkFiles attemptId={a.id}/><SubmittedResponse key={`${uid}:${tenant}:${a.id}`} attempt={a.id} student={uid!} tenant={tenant!}/>
     <p className="mt-1 text-xs text-muted-foreground">Submitted {formatPakistanAcademicDate(a.submitted_at)}</p>
     {a.resubmission_guidance&&<p className="mt-2 whitespace-pre-wrap rounded-lg border border-primary/25 bg-card p-3 text-sm"><RotateCcw className="mr-1 inline size-4"/><strong>Independent marker's improvement plan:</strong> {a.resubmission_guidance}</p>}
     {released.find(r=>r.attempt_id===a.id)&&<ReleasedFeedback result={released.find(r=>r.attempt_id===a.id)!} amendment={amendments.find(r=>r.attempt_id===a.id)}/>}
    </section>)}
    {!maySubmit&&receipt?.reviewed.briefId!==b.id&&hasUnsentLaterEdits(b.id)&&<div className="mt-4"><UnsentLaterEdits value={drafts[b.id]}/></div>}
    {maySubmit?<div className="mt-5"><label className="text-sm font-semibold">{latest?'Revised work responding to marker guidance':'Your original submitted evidence'}
      <Textarea rows={7} className="mt-2" maxLength={50000} value={drafts[b.id]||''} onChange={e=>setDrafts(p=>({...p,[b.id]:e.target.value}))}
       placeholder="Include your own coursework response, reasoning, calculations, source references or practical observations…"/></label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{(drafts[b.id]||'').length}/50000 characters</span>
       {!uncertain[b.id]&&<Button disabled={!!busy||fileBusy[b.id]!==false||(drafts[b.id]||'').trim().length<30} onClick={event=>reviewSubmission(b,event.currentTarget)}><BookOpen className="mr-1 size-4"/>{latest?'Submit revised work':'Submit coursework'}</Button>}</div>
     </div>:<p className="mt-4 text-xs text-muted-foreground">{within?'Awaiting independent marking, IQA approval or an authorised revision request.':'The submission window is closed.'}</p>}
   </article>;
  })}</div>}
  {!loading&&!error&&visible.length>10&&<nav aria-label="Coursework pages" className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous coursework</Button><span>Page {page+1} of {Math.ceil(visible.length/10)} · {visible.length} assessments</span><Button variant="outline" disabled={(page+1)*10>=visible.length} onClick={()=>setPage(p=>p+1)}>Next coursework</Button></nav>}
  <AlertDialog open={!!confirmation} onOpenChange={open=>{if(!open&&!operation.current){setConfirmation(null);setConfirmationError('');}}}>
   <AlertDialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto [overflow-wrap:anywhere] motion-reduce:animate-none" onOpenAutoFocus={event=>{event.preventDefault();keepEditing.current?.focus();}} onCloseAutoFocus={event=>{event.preventDefault();if(mounted.current){if(focusReceipt.current)receiptHeading.current?.focus();else opener.current?.focus();}}} onEscapeKeyDown={event=>{if(operation.current)event.preventDefault();}}>
    <AlertDialogHeader><AlertDialogTitle>{confirmation?`Submit ${confirmation.title}?`:'Review coursework submission'}</AlertDialogTitle><AlertDialogDescription>{confirmation&&uncertain[confirmation.briefId]?'Retry the same reviewed evidence. Later edits in your coursework draft are not included.':'Review this attempt before sending it for independent human assessment. Submitted evidence cannot be edited.'}</AlertDialogDescription></AlertDialogHeader>
    {confirmation&&<div className="min-w-0 space-y-3 text-sm"><p>Attempt {confirmation.attemptNo} · {confirmation.evidence.length.toLocaleString()} characters · {confirmation.uploadIds.length} attachment{confirmation.uploadIds.length===1?'':'s'}</p><details className="rounded-lg border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Review submitted text</summary><p className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap break-words">{confirmation.evidence}</p></details><p>Only independently marked and approved results will be released to your account.</p></div>}
    {confirmationError&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm">{confirmationError}</p>}
    {busy&&<p role="status" className="text-sm">Confirming submission…</p>}
    <AlertDialogFooter className="gap-2 sm:flex-wrap sm:space-x-0"><AlertDialogCancel ref={keepEditing} disabled={!!busy}>Keep editing</AlertDialogCancel><Button disabled={!!busy||loading||!!error} onClick={()=>void submit()}>{busy?'Confirming submission…':confirmation&&uncertain[confirmation.briefId]?'Retry same submission':'Confirm submission'}</Button></AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 </DashboardLayout>;
}

function UnsentLaterEdits({value}:{value:string}){
 return <details className="rounded-lg border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Unsent later edits</summary><p className="mt-2 text-sm">These later edits were not part of the confirmed submission. Keep a copy if you need to discuss them with your marker.</p><Textarea className="mt-3" aria-label="Unsent later edits" readOnly value={value}/></details>;
}

function ReleasedFeedback({result,amendment}:{result:Released;amendment?:Amendment}) {
 return <div className="mt-2 rounded-lg border bg-card p-3 text-sm">
  <p className="font-bold">Approved score: {amendment?.corrected_final_score??result.final_score}/100{amendment?' — independently amended':''}</p>
  <p className="mt-1 text-xs text-muted-foreground">Human-reviewed raw score: {amendment?.corrected_raw_score??result.raw_score}; permitted resubmission penalty: {result.penalty_points} points.</p>
  <p className="mt-2 whitespace-pre-wrap">{amendment?.corrected_feedback??result.published_feedback}</p>
  {amendment&&<p className="mt-2 text-xs">Original released score: {amendment.original_final_score}/100. Amended {formatPakistanAcademicDate(amendment.recorded_at)}. <Link className="underline" to="/student/appeals">Read independent appeal decision</Link></p>}
 </div>;
}
