import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {toast} from 'sonner';
import {BookOpen,Cloud,Clock,Code2,ExternalLink,GraduationCap,HardDrive,HelpCircle,Layers,ShieldCheck} from 'lucide-react';

type Module={id:string;title:string;programme_id:string};
type Template={id:string;module_id:string;tenant_id:string;title:string;provider:string;
 duration_minutes:number;max_attempts:number;access_mode:string;learning_outcomes:string|null;
 preparation_notes:string|null;estimated_cost_gbp:number;published:boolean};
type Run={id:string;template_id:string;cohort_reference:string;starts_at:string|null;ends_at:string|null;
 status:string;live_class_session_id:string|null;max_concurrent:number};
type Invite={class_run_id:string;status:string};
type Request={id:string;template_id:string;class_run_id:string|null;status:string;mode:string;
 requested_at:string;expires_at:string|null;estimated_cost_gbp:number};
type Task={id:string;template_id:string;sequence_no:number;title:string;instructions:string|null;verification_type:string};
type Note={id:string;task_id:string;notes:string;status:string;reviewer_feedback:string|null};
type HelpReply={id:string;launch_request_id:string;message:string;status:string;requested_at:string;response:string|null};
const providers:Record<string,string>={
 aws_academy:'AWS Academy Learner Lab',aws_managed:'AWS managed sandbox',
 unipathway_container:'UniPathway coding container',github_codespaces:'GitHub Codespaces',
 jupyter:'Jupyter notebook',azure:'Azure lab',managed_lab:'Specialist managed lab',
};
const blockedStates=new Set(['awaiting_provider','provisioning','ready','active','paused']);
export default function LabLearningHub(){
 const {user}=useAuth();
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
 const load=useCallback(async()=>{
  if(!userId||!tenant){setError('Your account is not assigned to an approved UniPathway centre.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const enrol=await db.from('student_enrolments').select('programme_id')
    .eq('student_id',userId).eq('tenant_id',tenant).eq('status','active');
   if(enrol.error)throw new Error(enrol.error.message);
   const programmes=[...new Set<string>((enrol.data||[]).map((r:{programme_id:string})=>r.programme_id))];
   if(!programmes.length){
    setModules([]);setTemplates([]);setTasks([]);setRuns([]);setRequests([]);setNotes([]);setSupport([]);setInvites([]);
    setLoading(false);return;
   }
   const mod=await db.from('modules').select('id,title,programme_id').eq('tenant_id',tenant).in('programme_id',programmes);
   if(mod.error)throw new Error(mod.error.message);
   const m=(mod.data||[]) as Module[],ids=m.map(x=>x.id);
   if(!ids.length){setModules(m);setTemplates([]);setLoading(false);return;}
   const [t,request,inv]=await Promise.all([
    db.from('lab_templates').select('id,module_id,tenant_id,title,provider,duration_minutes,max_attempts,access_mode,learning_outcomes,preparation_notes,estimated_cost_gbp,published')
     .eq('tenant_id',tenant).eq('active',true).eq('published',true).in('module_id',ids).order('title'),
    db.from('unipathway_lab_launch_requests').select('id,template_id,class_run_id,status,mode,requested_at,expires_at,estimated_cost_gbp')
     .eq('student_id',userId).eq('tenant_id',tenant).order('requested_at',{ascending:false}).limit(150),
    db.from('unipathway_lab_run_invitations').select('class_run_id,status').eq('student_id',userId).eq('tenant_id',tenant).in('status',['invited','accepted']),
   ]);
   const failure=[t,request,inv].find(x=>x.error);if(failure)throw new Error(failure.error.message);
   const list=(t.data||[]) as Template[],allInvites=(inv.data||[]) as Invite[];
   const labIds=list.map(x=>x.id),runIds=allInvites.map(x=>x.class_run_id);
   const [taskRows,runsRows,noteRows,helpRows]=await Promise.all([
    labIds.length?db.from('lab_tasks').select('id,template_id,sequence_no,title,instructions,verification_type').in('template_id',labIds).order('sequence_no'):
       Promise.resolve({data:[],error:null}),
    runIds.length?db.from('lab_class_runs').select('id,template_id,cohort_reference,starts_at,ends_at,status,live_class_session_id,max_concurrent')
       .eq('tenant_id',tenant).in('id',runIds):Promise.resolve({data:[],error:null}),
    db.from('unipathway_lab_task_notes').select('id,task_id,notes,status,reviewer_feedback')
      .eq('student_id',userId).eq('tenant_id',tenant).limit(300),
    db.from('unipathway_lab_support_requests').select('id,launch_request_id,message,status,requested_at,response')
      .eq('student_id',userId).eq('tenant_id',tenant).order('requested_at',{ascending:false}).limit(100),
   ]);
   const fail=[taskRows,runsRows,noteRows,helpRows].find(x=>x.error);if(fail)throw new Error(fail.error.message);
   setModules(m);setTemplates(list);setRequests((request.data||[]) as Request[]);
   setInvites(allInvites);setTasks((taskRows.data||[]) as Task[]);
   setRuns((runsRows.data||[]) as Run[]);setNotes((noteRows.data||[]) as Note[]);
   setSupport((helpRows.data||[]) as HelpReply[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load lab catalogue or permissions');setTemplates([]);}
  finally{setLoading(false);}
 },[userId,tenant]);
 useEffect(()=>{void load();},[load]);
 const canRequest=useCallback((template:Template,mode:'class'|'self_study',runId:string|null)=>{
  const active=requests.some(r=>r.template_id===template.id&&blockedStates.has(r.status));
  const attempts=requests.filter(r=>r.template_id===template.id&&!['failed','cancelled'].includes(r.status)).length;
  const modeAllowed=mode==='self_study'?['self_study','both'].includes(template.access_mode):
    ['class_only','both'].includes(template.access_mode)&&!!runId;
  return !active&&modeAllowed&&attempts<template.max_attempts;
 },[requests]);
 const requestLab=async(t:Template,mode:'class'|'self_study',runId:string|null)=>{
  if(!canRequest(t,mode,runId)||busy)return;
  setBusy(t.id);
  const {error:e}=await db.rpc('request_unipathway_lms_lab',{
   p_template:t.id,p_mode:mode,p_class_run:runId
  });setBusy('');
  if(e){toast.error('Lab request blocked: '+e.message);return;}
  toast.success('Lab request queued for authorised provider provisioning. No AWS machine has started yet.');
  await load();
 };
 const saveNote=async(task:Task,submit:boolean)=>{
  if(busy)return;
  const note=notes.find(x=>x.task_id===task.id);
  const value=drafts[task.id]??note?.notes??'';
  if(value.length>3000){toast.error('Keep the note under 3000 characters');return;}
  if(submit&&!value.trim()){toast.error('Write your practice evidence before submission.');return;}
  setBusy(task.id);
  const {error:e}=await db.rpc('save_unipathway_lab_practice_note',{
   p_task:task.id,p_notes:value,p_submit:submit
  });
  setBusy('');
  if(e){toast.error('Unable to save practice evidence: '+e.message);return;}
  toast.success(submit?'Practice note submitted for tutor review':'Independent study notes saved');
  await load();
 };
 const requestHelp=async(request:Request)=>{
  const value=(helpText[request.id]||'').trim();
  if(value.length<4||busy)return;
  setBusy(request.id);
  const {error:e}=await db.rpc('request_unipathway_lab_support',{p_request:request.id,p_message:value});
  setBusy('');
  if(e){toast.error('Help request not saved: '+e.message);return;}
  setHelpText(p=>({...p,[request.id]:''}));
  toast.success('Tutor help request saved to the practical lab queue');
  await load();
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
    <Link className="inline-flex items-center gap-1 font-semibold underline" to="/coding"><Code2 className="size-4"/>Browser coding practice</Link>
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
  {error&&<div role="alert" className="rounded-xl border border-destructive p-5"><p>We could not load your labs. Retry, or contact your course team if this continues.</p><Button className="mt-3" variant="outline" onClick={()=>void load()}>Retry</Button></div>}
  {!loading&&!error&&visibleTemplates.length===0&&<p className="rounded-xl border bg-card p-6">No published practical labs are assigned to your enrolled modules yet. Course reading materials and the basic coding practice remain separately available.</p>}
  {!loading&&!error&&<div className="space-y-6">{visibleTemplates.map(t=>{
   const module=modules.find(m=>m.id===t.module_id);
   const current=requests.find(r=>r.template_id===t.id&&blockedStates.has(r.status));
   const classRuns=availableRuns.filter(r=>r.template_id===t.id&&['scheduled','active'].includes(r.status));
   const steps=tasks.filter(x=>x.template_id===t.id);
   return <section key={t.id} className="rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><p className="text-xs font-semibold uppercase tracking-wide text-success">{module?.title||'My module'} · {providers[t.provider]||t.provider}</p>
      <h2 className="mt-2 text-xl font-bold">{t.title}</h2>
      {t.learning_outcomes&&<p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.learning_outcomes}</p>}
      {t.preparation_notes&&<p className="mt-2 whitespace-pre-wrap text-sm"><strong>Before the lab:</strong> {t.preparation_notes}</p>}
     </div><div className="flex flex-wrap gap-2">
      <Badge variant="outline"><Clock className="mr-1 inline size-3"/>{t.duration_minutes} min / attempt</Badge>
      <Badge variant="outline">{t.access_mode.replace(/_/g,' ')}</Badge></div>
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
         disabled={sent} onChange={e=>setDrafts(p=>({...p,[step.id]:e.target.value}))}
         placeholder="Document the steps you completed, code changes, observations, or questions…"/>
       </label>
       <div className="mt-2 flex flex-wrap items-center gap-2">
        {sent?<span className="text-xs font-semibold text-success">{note?.status} — awaiting or received tutor review</span>:<>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={()=>saveNote(step,false)}>Save notes</Button>
          <Button size="sm" disabled={!!busy} onClick={()=>saveNote(step,true)}>Submit practice evidence</Button>
         </>}
       </div>
       {note?.reviewer_feedback&&<p className="mt-2 rounded-lg bg-secondary p-3 text-sm"><strong>Lecturer feedback:</strong> {note.reviewer_feedback}</p>}
      </article>;
     })}</div>}
    {current&&<div className="mt-4 border-t pt-4"><h3 className="flex items-center gap-2 font-semibold"><HelpCircle className="size-4"/>Ask your lab tutor</h3>
     <div className="mt-3 flex flex-wrap items-end gap-2"><Textarea aria-label="Question for your lab tutor" className="min-w-0 w-full sm:flex-1" rows={2} maxLength={1600}
      placeholder="Describe the task, error or problem you're facing…" value={helpText[current.id]||''}
      onChange={e=>setHelpText(p=>({...p,[current.id]:e.target.value}))}/>
      <Button variant="outline" disabled={!!busy||(helpText[current.id]||'').trim().length<4} onClick={()=>requestHelp(current)}>Request help</Button></div>
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
