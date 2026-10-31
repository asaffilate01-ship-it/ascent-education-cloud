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
 const {user}=useAuth();const [params]=useSearchParams();
 return <CourseworkWorkspace moduleId={params.get('module')||undefined} key={`${user?.id}:${user?.tenantId}:${user?.role}`}/>;
}
function CourseworkWorkspace({moduleId}:{moduleId?:string}){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
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
 const [requestIds]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{
  const token=++generation.current,current=()=>token===generation.current;
  setLoading(true);setError('');setModules([]);setBriefs([]);setCriteria([]);setAttempts([]);setResults([]);setAmendments([]);setPage(0);
  try{
   if(!uid||!tenant)throw Error('Assigned student and authorised centre required');
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
 },[uid,tenant,moduleId]);
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
 const submit=async(b:Brief)=>{
  if(busy||fileBusy[b.id]!==false){toast.error('Wait for attachments to load or finish uploading.');return;}
  const list=grouped.get(b.id)||[],latest=list[0];
  const allowed=courseworkQueueState(b,list,releasedBriefIds.has(b.id),Date.now()).maySubmit;
  if(!allowed){toast.error('Submission requires an open window and a marker-issued resubmission instruction.');return;}
  const work=(drafts[b.id]||'').trim();
  if(work.length<30||work.length>50000){toast.error('Provide between 30 and 50,000 characters of original evidence.');return;}
  if(!window.confirm('Submit this attempt for independent human assessment? You cannot edit it after submission.'))return;
  setBusy(b.id);
  try {
   requestIds[b.id] ||= crypto.randomUUID();
   const {error:e}=await db.rpc('submit_unipathway_coursework',{p_brief:b.id,p_evidence:work,p_uploads:attachmentIds[b.id]||[],p_request:requestIds[b.id]});
   if(e)throw e;
   toast.success('Assignment submitted. You can read your result after marking and approval.');
   setDrafts(p=>({...p,[b.id]:''}));delete requestIds[b.id];await refreshCurrent.current();
  } catch {toast.error('Submission could not be confirmed. Your draft is still here. Refresh assignments to check whether it arrived before trying again.');}
  finally {setBusy('');}
 };
 return <DashboardLayout title="Assignments" subtitle="Your tasks, submissions and released feedback">
  <ModuleJourney moduleId={moduleId}/>
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
    <div className="mt-4 grid gap-3 md:grid-cols-2">
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
    {maySubmit&&<CourseworkFiles key={`${b.id}:${list.length}`} briefId={b.id} disabled={!!busy} onFiles={ids=>setAttachmentIds(old=>({...old,[b.id]:ids}))} onBusy={value=>setFileBusy(old=>({...old,[b.id]:value}))}/>}
    {list.map(a=><section key={a.id} className="mt-3 rounded-lg bg-secondary/30 p-3">
     <p className="font-semibold text-sm">Attempt {a.attempt_no} — {a.status}</p><CourseworkFiles attemptId={a.id}/><SubmittedResponse key={`${uid}:${tenant}:${a.id}`} attempt={a.id} student={uid!} tenant={tenant!}/>
     <p className="mt-1 text-xs text-muted-foreground">Submitted {formatPakistanAcademicDate(a.submitted_at)}</p>
     {a.resubmission_guidance&&<p className="mt-2 whitespace-pre-wrap rounded-lg border border-primary/25 bg-card p-3 text-sm"><RotateCcw className="mr-1 inline size-4"/><strong>Independent marker's improvement plan:</strong> {a.resubmission_guidance}</p>}
     {released.find(r=>r.attempt_id===a.id)&&<ReleasedFeedback result={released.find(r=>r.attempt_id===a.id)!} amendment={amendments.find(r=>r.attempt_id===a.id)}/>}
    </section>)}
    {maySubmit?<div className="mt-5"><label className="text-sm font-semibold">{latest?'Revised work responding to marker guidance':'Your original submitted evidence'}
      <Textarea rows={7} className="mt-2" maxLength={50000} value={drafts[b.id]||''} onChange={e=>setDrafts(p=>({...p,[b.id]:e.target.value}))}
       placeholder="Include your own coursework response, reasoning, calculations, source references or practical observations…"/></label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{(drafts[b.id]||'').length}/50000 characters</span>
       <Button disabled={!!busy||fileBusy[b.id]!==false||(drafts[b.id]||'').trim().length<30} onClick={()=>submit(b)}><BookOpen className="mr-1 size-4"/>{latest?'Submit revised work':'Submit coursework'}</Button></div>
     </div>:<p className="mt-4 text-xs text-muted-foreground">{within?'Awaiting independent marking, IQA approval or an authorised revision request.':'The submission window is closed.'}</p>}
   </article>;
  })}</div>}
  {!loading&&!error&&visible.length>10&&<nav aria-label="Coursework pages" className="mt-4 flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous coursework</Button><span>Page {page+1} of {Math.ceil(visible.length/10)} · {visible.length} assessments</span><Button variant="outline" disabled={(page+1)*10>=visible.length} onClick={()=>setPage(p=>p+1)}>Next coursework</Button></nav>}
 </DashboardLayout>;
}

function ReleasedFeedback({result,amendment}:{result:Released;amendment?:Amendment}) {
 return <div className="mt-2 rounded-lg border bg-card p-3 text-sm">
  <p className="font-bold">Approved score: {amendment?.corrected_final_score??result.final_score}/100{amendment?' — independently amended':''}</p>
  <p className="mt-1 text-xs text-muted-foreground">Human-reviewed raw score: {amendment?.corrected_raw_score??result.raw_score}; permitted resubmission penalty: {result.penalty_points} points.</p>
  <p className="mt-2 whitespace-pre-wrap">{amendment?.corrected_feedback??result.published_feedback}</p>
  {amendment&&<p className="mt-2 text-xs">Original released score: {amendment.original_final_score}/100. Amended {formatPakistanAcademicDate(amendment.recorded_at)}. <Link className="underline" to="/student/appeals">Read independent appeal decision</Link></p>}
 </div>;
}
