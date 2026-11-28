import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useTechLabModuleIds} from '@/components/labs/TechLabAccessGate';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {toast} from 'sonner';
import {readLabPages,readLabIdBatches,verifyLabRows,verifyLabRequestHistory,labAttemptSummary,labReceiptId,blockedLabRequestStates} from '@/lib/practicalLabScope';
import {BookOpen,Cloud,Clock,Code2,ExternalLink,GraduationCap,HardDrive,HelpCircle,Layers,ShieldCheck} from 'lucide-react';

type Module={id:string;tenant_id:string;title:string;programme_id:string};
type Template={id:string;module_id:string;tenant_id:string;title:string;provider:string;
 duration_minutes:number;max_attempts:number;access_mode:string;learning_outcomes:string|null;
 preparation_notes:string|null;estimated_cost_gbp:number;published:boolean;active:boolean};
type Run={id:string;tenant_id:string;template_id:string;cohort_reference:string;starts_at:string|null;ends_at:string|null;
 status:string;live_class_session_id:string|null;max_concurrent:number};
type Invite={class_run_id:string;tenant_id:string;student_id:string;status:string};
type Request={id:string;tenant_id:string;student_id:string;template_id:string;class_run_id:string|null;status:string;mode:string;
 requested_at:string;expires_at:string|null;estimated_cost_gbp:number};
type Task={id:string;tenant_id:string;template_id:string;sequence_no:number;title:string;instructions:string|null;verification_type:string};
type Note={id:string;tenant_id:string;student_id:string;template_id:string;task_id:string;notes:string;status:string;reviewer_feedback:string|null};
type HelpReply={id:string;tenant_id:string;student_id:string;launch_request_id:string;message:string;status:string;requested_at:string;response:string|null};
const providers:Record<string,string>={
 aws_academy:'AWS Academy Learner Lab',aws_managed:'AWS managed sandbox',
 unipathway_container:'UniPathway coding container',github_codespaces:'GitHub Codespaces',
 jupyter:'Jupyter notebook',azure:'Azure lab',managed_lab:'Specialist managed lab',
};
const blockedStates=blockedLabRequestStates;
export default function LabLearningHub(){
 const {user}=useAuth();const ids=useTechLabModuleIds();
 return <ScopedLabHub key={JSON.stringify([user?.id,user?.tenantId,user?.role,user?.roles,[...ids].sort()])}/>;
}
function ScopedLabHub(){
 const {user}=useAuth();
 const approvedTechModules=useTechLabModuleIds();
 const [params,setParams]=useSearchParams();
 const selectedModule=params.get('module')||'';
 const [modules,setModules]=useState<Module[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [requests,setRequests]=useState<Request[]>([]);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [notes,setNotes]=useState<Note[]>([]);
 const [support,setSupport]=useState<HelpReply[]>([]);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [helpText,setHelpText]=useState<Record<string,string>>({});
 const [invites,setInvites]=useState<Invite[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const tenant=user?.tenantId;
 const userId=user?.id;
 const authorised=!!userId&&!!tenant&&user?.role==='student'&&user.roles?.includes('student')===true;
 const generation=useRef(0),mounted=useRef(true),writeLock=useRef(false);
 const [needsRefresh,setNeedsRefresh]=useState(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const load=useCallback(async()=>{
  const token=++generation.current;
  const current=()=>mounted.current&&generation.current===token;
  if(!current())return null;
  setLoading(true);setError('');
  setModules([]);setTemplates([]);setTasks([]);setRuns([]);setRequests([]);setNotes([]);setSupport([]);setInvites([]);
  try{
   if(!authorised||!userId||!tenant)throw Error('Verified student and centre required');
   const enrol=verifyLabRows<{id:string;tenant_id:string;student_id:string;programme_id:string;status:string}>(await readLabPages(()=>db.from('student_enrolments').select('id,tenant_id,student_id,programme_id,status').eq('student_id',userId).eq('tenant_id',tenant).eq('status','active'),current),tenant,userId);
   if(enrol.some(row=>row.status!=='active'))throw Error('Unverified enrolment');
   const programmes=[...new Set(enrol.map(row=>row.programme_id))];
   const allModules=verifyLabRows<Module>(await readLabIdBatches(programmes,ids=>db.from('modules').select('id,title,programme_id,tenant_id').eq('tenant_id',tenant).in('programme_id',ids),current),tenant);
   if(allModules.some(row=>!programmes.includes(row.programme_id)||typeof row.title!=='string'))throw Error('Unverified module membership');
   const m=allModules.filter(row=>approvedTechModules.includes(row.id));
   const ids=m.map(row=>row.id);
   const [rawTemplates,rawRequests,rawInvites]=await Promise.all([
    readLabIdBatches(ids,group=>db.from('lab_templates').select('id,module_id,tenant_id,title,provider,duration_minutes,max_attempts,access_mode,learning_outcomes,preparation_notes,estimated_cost_gbp,published,active').eq('tenant_id',tenant).eq('active',true).eq('published',true).in('module_id',group),current),
    ids.length?readLabPages(()=>db.from('unipathway_lab_launch_requests').select('id,tenant_id,student_id,template_id,class_run_id,status,mode,requested_at,expires_at,estimated_cost_gbp').eq('student_id',userId).eq('tenant_id',tenant),current):Promise.resolve([]),
    ids.length?readLabPages(()=>db.from('unipathway_lab_run_invitations').select('class_run_id,tenant_id,student_id,status').eq('student_id',userId).eq('tenant_id',tenant).in('status',['invited','accepted']),current,'class_run_id'):Promise.resolve([]),
   ]);
   const list=verifyLabRows<Template>(rawTemplates,tenant);
   if(list.some(t=>!ids.includes(t.module_id)||t.published!==true||t.active!==true||typeof t.title!=='string'||typeof t.provider!=='string'||!['self_study','class_only','both'].includes(t.access_mode)||!Number.isInteger(t.max_attempts)||t.max_attempts<1))throw Error('Unverified lab template');
   const allRequests=verifyLabRequestHistory<Request>(rawRequests,tenant,userId);
   const allInvites=verifyLabRows<Invite>(rawInvites,tenant,userId,'class_run_id');
   if(allInvites.some(row=>!['invited','accepted'].includes(row.status)))throw Error('Unverified invitation');
   const labIds=list.map(t=>t.id),runIds=allInvites.map(row=>row.class_run_id);
   const visibleRequests=allRequests.filter(row=>labIds.includes(row.template_id));
   const [rawTasks,rawRuns,rawNotes,rawHelp]=await Promise.all([
    readLabIdBatches(labIds,group=>db.from('lab_tasks').select('id,tenant_id,template_id,sequence_no,title,instructions,verification_type').eq('tenant_id',tenant).in('template_id',group),current),
    readLabIdBatches(runIds,group=>db.from('lab_class_runs').select('id,tenant_id,template_id,cohort_reference,starts_at,ends_at,status,live_class_session_id,max_concurrent').eq('tenant_id',tenant).in('id',group),current),
    readLabIdBatches(labIds,group=>db.from('unipathway_lab_task_notes').select('id,tenant_id,student_id,template_id,task_id,notes,status,reviewer_feedback').eq('student_id',userId).eq('tenant_id',tenant).in('template_id',group),current),
    readLabIdBatches(visibleRequests.map(row=>row.id),group=>db.from('unipathway_lab_support_requests').select('id,tenant_id,student_id,launch_request_id,message,status,requested_at,response').eq('student_id',userId).eq('tenant_id',tenant).in('launch_request_id',group),current),
   ]);
   const allTasks=verifyLabRows<Task>(rawTasks,tenant);
   if(allTasks.some(task=>!labIds.includes(task.template_id)||!Number.isSafeInteger(task.sequence_no)||typeof task.title!=='string'))throw Error('Unverified lab tasks');
   const allRuns=verifyLabRows<Run>(rawRuns,tenant);
   if(allRuns.some(run=>!runIds.includes(run.id)))throw Error('Unverified class lab');
   const allNotes=verifyLabRows<Note>(rawNotes,tenant,userId);
   const notesByTask=new Set<string>();
   for(const note of allNotes){
    if(!allTasks.some(task=>task.id===note.task_id&&task.template_id===note.template_id)||notesByTask.has(note.task_id)||!['draft','submitted','reviewed'].includes(note.status))throw Error('Unverified practice evidence');
    notesByTask.add(note.task_id);
   }
   const allHelp=verifyLabRows<HelpReply>(rawHelp,tenant,userId);
   if(allHelp.some(reply=>!visibleRequests.some(req=>req.id===reply.launch_request_id)||typeof reply.message!=='string'||typeof reply.requested_at!=='string'))throw Error('Unverified lab support');
   if(!current())return null;
   list.sort((a,b)=>a.title.localeCompare(b.title));allTasks.sort((a,b)=>a.sequence_no-b.sequence_no||a.id.localeCompare(b.id));allHelp.sort((a,b)=>b.requested_at.localeCompare(a.requested_at));
   setModules(m);setTemplates(list);setRequests(visibleRequests);
   setInvites(allInvites);setTasks(allTasks);
   setRuns(allRuns.filter(row=>labIds.includes(row.template_id)));setNotes(allNotes);setSupport(allHelp);
   setNeedsRefresh(false);
   return {requests:visibleRequests,notes:allNotes,support:allHelp};
  }catch{if(current())setError('Lab records or permissions could not be verified.');return null;}
  finally{if(current())setLoading(false);}
 },[authorised,userId,tenant,approvedTechModules.join(',')]);
 useEffect(()=>{void load();},[load]);
 const canRequest=useCallback((template:Template,mode:'class'|'self_study',runId:string|null)=>{
  const attempts=labAttemptSummary(requests,template.id);
  const modeAllowed=mode==='self_study'?['self_study','both'].includes(template.access_mode):
    ['class_only','both'].includes(template.access_mode)&&!!runId&&runs.some(row=>row.id===runId&&row.template_id===template.id&&['scheduled','active'].includes(row.status))&&invites.some(row=>row.class_run_id===runId);
  return authorised&&!loading&&!error&&!needsRefresh&&!attempts.active&&modeAllowed&&attempts.used<template.max_attempts;
 },[authorised,loading,error,needsRefresh,requests,runs,invites]);
 async function write(id:string,operation:()=>PromiseLike<{data:unknown;error:unknown}>,verify:(receipt:string,snapshot:NonNullable<Awaited<ReturnType<typeof load>>>)=>boolean,success:string,after?:()=>void){
  if(!authorised||loading||error||needsRefresh||writeLock.current||!mounted.current)return;
  writeLock.current=true;setBusy(id);
  try{
   const result=await operation();
   if(!mounted.current)return;
   if(result.error||!labReceiptId(result.data))throw Error('Unconfirmed lab write');
   const snapshot=await load();
   if(!mounted.current)return;
   if(!snapshot||!verify(result.data,snapshot))throw Error('Unconfirmed lab receipt');
   after?.();toast.success(success);
  }catch{
   if(mounted.current){setNeedsRefresh(true);toast.error('The request could not be confirmed. Your draft is retained. Refresh labs and replies before retrying.');}
  }finally{writeLock.current=false;if(mounted.current)setBusy('');}
 }
 const requestLab=async(t:Template,mode:'class'|'self_study',runId:string|null)=>{
  if(!templates.some(row=>row.id===t.id)||!canRequest(t,mode,runId))return;
  await write(t.id,()=>db.rpc('request_unipathway_lms_lab',{p_template:t.id,p_mode:mode,p_class_run:runId}),
   (id,snapshot)=>snapshot.requests.some(row=>row.id===id&&row.template_id===t.id&&row.mode===mode&&row.class_run_id===runId),
   'Lab request recorded in UniPathway. No AWS machine has started yet.');
 };
 const saveNote=async(task:Task,submit:boolean)=>{
  if(!tasks.some(row=>row.id===task.id))return;
  const note=notes.find(x=>x.task_id===task.id);
  if(note&&['submitted','reviewed'].includes(note.status))return;
  const value=drafts[task.id]??note?.notes??'';
  if(value.length>3000){toast.error('Keep the note under 3000 characters');return;}
  if(submit&&!value.trim()){toast.error('Write your practice evidence before submission.');return;}
  await write(task.id,()=>db.rpc('save_unipathway_lab_practice_note',{p_task:task.id,p_notes:value,p_submit:submit}),
   (id,snapshot)=>snapshot.notes.some(row=>row.id===id&&row.task_id===task.id&&row.notes===value&&(submit?['submitted','reviewed'].includes(row.status):row.status==='draft')),
   submit?'Practice note submitted for tutor review':'Independent study notes saved',
   ()=>setDrafts(previous=>{const next={...previous};if(next[task.id]===value)delete next[task.id];return next;}));
 };
 const requestHelp=async(request:Request)=>{
  const value=(helpText[request.id]||'').trim();
  if(!requests.some(row=>row.id===request.id&&blockedStates.has(row.status))||value.length<4||value.length>1600)return;
  await write(request.id,()=>db.rpc('request_unipathway_lab_support',{p_request:request.id,p_message:value}),
   (id,snapshot)=>snapshot.support.some(row=>row.id===id&&row.launch_request_id===request.id&&row.message===value),
   'Tutor help request saved to the practical lab queue',
   ()=>setHelpText(previous=>{const next={...previous};if(next[request.id]?.trim()===value)delete next[request.id];return next;}));
 };
 const visibleTemplates=selectedModule?templates.filter(t=>t.module_id===selectedModule):templates;
 const availableRuns=useMemo(()=>runs.filter(r=>invites.some(i=>i.class_run_id===r.id)),[runs,invites]);
 return <DashboardLayout title="My practical labs" subtitle="Cloud, programming, coding and data labs inside your UniPathway course">
  <div className="mb-5 rounded-xl border bg-primary/5 p-5">
   <h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Labs belong to your enrolled modules</h2>
   <p className="mt-2 text-sm text-muted-foreground">Use the same LMS account for in-centre practicals, live Teams classes and independent study. Lecturer invitations govern class sessions; published self-study exercises remain accessible while enrolled. Cloud workspace requests enter a capacity- and budget-controlled queue, and do not launch AWS until provider integration is approved.</p>
   <div className="mt-3 flex flex-wrap gap-3 text-sm">
    <Link className="inline-flex items-center gap-1 font-semibold underline" to="/student/materials"><BookOpen className="size-4"/>Course notes & slides</Link>
    <Link className="inline-flex items-center gap-1 font-semibold underline" to="/student/classroom"><GraduationCap className="size-4"/>Live classes</Link>
    <Link className="inline-flex items-center gap-1 font-semibold underline" to="/labs/tech"><Code2 className="size-4"/>Tech Lab (marked exercises & live classes)</Link>
    <Link className="inline-flex items-center gap-1 font-semibold underline" to="/coding"><Code2 className="size-4"/>Free coding sandbox</Link>
   </div>
  </div>
  <div className="mb-4 flex flex-wrap items-end gap-3">
   <label className="min-w-0 flex-1 text-sm font-medium">Course module
    <select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={selectedModule}
     onChange={e=>setParams(previous=>{const next=new URLSearchParams(previous);if(e.target.value)next.set('module',e.target.value);else next.delete('module');return next;})}>
     <option value="">All my modules</option>
     {selectedModule&&!modules.some(m=>m.id===selectedModule)&&<option value={selectedModule}>Selected module unavailable</option>}
     {modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}
    </select>
   </label>
   <Button variant="outline" disabled={loading||!!busy} onClick={()=>void load()}>Refresh labs and replies</Button>
  </div>
  {modules.some(m=>m.id===selectedModule)&&<ModuleJourney moduleId={selectedModule}/>}
  {loading&&<p role="status">Checking your enrolled modules and lab permissions…</p>}
  {error&&<div role="alert" className="rounded-xl border border-destructive p-5"><p>We could not load your labs. Retry, or contact your course team if this continues.</p><Button className="mt-3" variant="outline" disabled={!!busy} onClick={()=>void load()}>Retry</Button></div>}
  {needsRefresh&&<p role="alert" className="mb-4 rounded-lg border p-3 text-sm">A previous lab action was not confirmed. Refresh the catalogue and recorded replies before making another request.</p>}
  {!loading&&!error&&visibleTemplates.length===0&&<p className="rounded-xl border bg-card p-6">No published practical labs are assigned to your enrolled modules yet. Use the <Link className="font-semibold underline" to="/labs/tech">Tech Lab</Link> for marked AI, coding, web, SQL, data and cyber exercises, on your own or in your teacher’s live session.</p>}
  {!loading&&!error&&<div className="space-y-6">{visibleTemplates.map(t=>{
   const module=modules.find(m=>m.id===t.module_id);
   const current=requests.find(r=>r.template_id===t.id&&blockedStates.has(r.status));
   const classRuns=availableRuns.filter(r=>r.template_id===t.id&&['scheduled','active'].includes(r.status));
   const steps=tasks.filter(x=>x.template_id===t.id);
   return <section key={t.id} className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><p className="text-xs font-semibold uppercase tracking-wide text-success">{module?.title||'My module'} · {Object.prototype.hasOwnProperty.call(providers,t.provider)?providers[t.provider]:t.provider}</p>
      <h2 className="mt-2 text-xl font-bold">{t.title}</h2>
      {t.learning_outcomes&&<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.learning_outcomes}</p>}
      {t.preparation_notes&&<p className="mt-2 whitespace-pre-wrap text-sm"><strong>Before the lab:</strong> {t.preparation_notes}</p>}
     </div><div className="flex flex-wrap gap-2">
      <Badge variant="outline"><Clock className="mr-1 inline size-3"/>{t.duration_minutes} min / attempt</Badge>
      <Badge variant="outline">{t.access_mode.replace(/_/g,' ')}</Badge><Badge variant="outline">{labAttemptSummary(requests,t.id).used} / {t.max_attempts} recorded attempts</Badge></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
     {['self_study','both'].includes(t.access_mode)&&<Button size="sm" variant="outline" disabled={!canRequest(t,'self_study',null)||!!busy} onClick={()=>requestLab(t,'self_study',null)}><Cloud className="mr-1 size-4"/>Request self-study workspace</Button>}
     {classRuns.map(run=><Button key={run.id} size="sm" disabled={!canRequest(t,'class',run.id)||!!busy} onClick={()=>requestLab(t,'class',run.id)}><Layers className="mr-1 size-4"/>Join approved class lab ({run.cohort_reference})</Button>)}
     {current&&<span role="status" className="inline-flex items-center text-sm font-semibold">Workspace request: {current.status.replace(/_/g,' ')} — provider access pending</span>}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">An LMS request is not an active AWS session. AWS Academy access requires its separate approved student invitation; managed AWS launches require verified accounts, IAM restrictions, time and budget limits. No virtual machine identifiers or secret keys are exposed.</p>
    {steps.length>0&&<div className="mt-5 space-y-3 border-t pt-4"><h3 className="font-semibold">Guided exercises and independent practice</h3>
     {steps.map(step=>{const note=notes.find(n=>n.task_id===step.id);const sent=['submitted','reviewed'].includes(note?.status||'');
      return <article key={step.id} className="rounded-lg border p-4"><p className="font-semibold text-sm">{step.sequence_no}. {step.title}</p>
       {step.instructions&&<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{step.instructions}</p>}
       <label className="mt-3 block text-sm font-medium">Your practice notes / evidence
        <Textarea className="mt-1" rows={3} value={drafts[step.id]??note?.notes??''} maxLength={3000}
         disabled={sent||!!busy||needsRefresh} onChange={e=>setDrafts(p=>({...p,[step.id]:e.target.value}))}
         placeholder="Document the steps you completed, code changes, observations, or questions…"/>
       </label>
       <div className="mt-2 flex flex-wrap items-center gap-2">
        {sent?<span className="text-xs font-semibold text-success">{note?.status} — awaiting or received tutor review</span>:<>
          <Button size="sm" variant="outline" disabled={!!busy||needsRefresh} onClick={()=>saveNote(step,false)}>Save notes</Button>
          <Button size="sm" disabled={!!busy||needsRefresh} onClick={()=>saveNote(step,true)}>Submit practice evidence</Button>
         </>}
       </div>
       {note?.reviewer_feedback&&<p className="mt-2 rounded-lg bg-secondary p-3 text-sm"><strong>Lecturer feedback:</strong> {note.reviewer_feedback}</p>}
      </article>;
     })}</div>}
    {current&&<div className="mt-4 border-t pt-4"><h3 className="flex items-center gap-2 font-semibold"><HelpCircle className="size-4"/>Ask your lab tutor</h3>
     <div className="mt-3 flex flex-wrap items-end gap-2"><Textarea aria-label="Question for your lab tutor" className="min-w-0 w-full sm:flex-1" rows={2} maxLength={1600}
      placeholder="Describe the task, error or problem you're facing…" value={helpText[current.id]||''}
      disabled={!!busy||needsRefresh} onChange={e=>setHelpText(p=>({...p,[current.id]:e.target.value}))}/>
      <Button variant="outline" disabled={!!busy||needsRefresh||(helpText[current.id]||'').trim().length<4} onClick={()=>requestHelp(current)}>Request help</Button></div>
     <div className="mt-3 space-y-2">{support.filter(x=>x.launch_request_id===current.id).map(h=><div key={h.id} className="rounded-lg border p-3 text-sm">
      <p className="whitespace-pre-wrap">{h.message}</p><p className="mt-1 text-xs text-muted-foreground">{h.status} · {new Date(h.requested_at).toLocaleString()}</p>
      {h.response&&<p className="mt-2 whitespace-pre-wrap border-l-2 border-primary pl-3"><strong>Tutor:</strong> {h.response}</p>}
     </div>)}</div>
    </div>}
   </section>;
  })}</div>}
  <div className="mt-6 rounded-xl border p-4"><h3 className="flex items-center gap-2 font-semibold"><HardDrive className="size-5"/>Your computer, cloud and lab data</h3>
   <p className="mt-2 text-sm text-muted-foreground">Practice notes are saved to your LMS. Cloud lab workspaces must have separate verified persistence, backups, idle shutdown and expiry policies. Deleting a cloud workspace is not the same as submitting your coursework.</p>
   <a href="https://aws.amazon.com/training/awsacademy/" className="mt-3 inline-flex gap-1 text-sm font-semibold underline" target="_blank" rel="noopener noreferrer">Learn about AWS Academy eligibility <ExternalLink className="size-4"/></a>
  </div>
 </DashboardLayout>;
}
