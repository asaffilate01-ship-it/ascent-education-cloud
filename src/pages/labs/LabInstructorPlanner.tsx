import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {readLabPages,readLabIdBatches,verifyLabRows,labReceiptId} from '@/lib/practicalLabScope';
import {instructorLabAccess,instructorLabCost,instructorLabWindow,instructorFeedbackConfirmed} from '@/lib/instructorLabOperations';
import {matchesLocalSearch} from '@/lib/localSearch';
import {BookOpen,CalendarClock,Cloud,GraduationCap,HelpCircle,Layers,ShieldCheck,Users} from 'lucide-react';
type Module={id:string;title:string;lecturer_id:string|null;tenant_id:string};
type Template={id:string;tenant_id:string;module_id:string;title:string;provider:string;access_mode:string;published:boolean;active:boolean;duration_minutes:number};
type Run={id:string;tenant_id:string;template_id:string;cohort_reference:string;status:string;starts_at:string|null;max_concurrent:number;live_class_session_id:string|null};
type Session={id:string;tenant_id:string;module_id:string|null;title:string};
type Request={id:string;tenant_id:string;student_id:string;template_id:string;class_run_id:string|null;mode:string;status:string;requested_at:string};
type Practice={id:string;tenant_id:string;student_id:string;template_id:string;task_id:string;notes:string;status:string;updated_at:string};
type Help={id:string;tenant_id:string;student_id:string;launch_request_id:string;message:string;status:string;requested_at:string;response:string|null};
const providerOptions=['aws_academy','aws_managed','unipathway_container','github_codespaces','jupyter','azure','managed_lab'] as const;

export default function LabInstructorPlanner(){
 const {user}=useAuth();
 return <ScopedPlanner key={JSON.stringify([user?.id,user?.tenantId,user?.role,user?.roles])}/>;
}
function ScopedPlanner(){
 const {user}=useAuth();
 const tenant=user?.tenantId;
 const [modules,setModules]=useState<Module[]>([]);
 const [templates,setTemplates]=useState<Template[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [classes,setClasses]=useState<Session[]>([]);
 const [requests,setRequests]=useState<Request[]>([]);
 const [evidence,setEvidence]=useState<Practice[]>([]);
 const [help,setHelp]=useState<Help[]>([]);
 const [taskTitles,setTaskTitles]=useState<Record<string,string>>({});
 const [taskInstructions,setTaskInstructions]=useState<Record<string,string>>({});
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [title,setTitle]=useState('');const [moduleId,setModuleId]=useState('');
 const [provider,setProvider]=useState<(typeof providerOptions)[number]>('unipathway_container');
 const [mode,setMode]=useState('both');
 const [duration,setDuration]=useState(90);
 const [estimatedCost,setEstimatedCost]=useState('');
 const [runTemplate,setRunTemplate]=useState('');
 const [cohort,setCohort]=useState('');
 const [runStart,setRunStart]=useState('');const [runEnd,setRunEnd]=useState('');
 const [runConcurrent,setRunConcurrent]=useState(25);
 const [linkedClass,setLinkedClass]=useState('');
 const [busy,setBusy]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const {authorised,manager:isManager}=instructorLabAccess(user);
 const userId=user?.id;
 const mounted=useRef(true),generation=useRef(0),lock=useRef(false);
 const [uncertain,setUncertain]=useState(false),[search,setSearch]=useState(''),[queueFilter,setQueueFilter]=useState('all');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 const load=useCallback(async()=>{
  const token=++generation.current,current=()=>mounted.current&&generation.current===token;
  setLoading(true);setError('');
  setModules([]);setTemplates([]);setRuns([]);setClasses([]);setRequests([]);setEvidence([]);setHelp([]);
  try{
   if(!authorised||!userId||!tenant)throw Error('A verified active teaching role and centre are required.');
   const all=verifyLabRows<Module>(await readLabPages(()=>{let q=db.from('modules').select('id,title,lecturer_id,tenant_id').eq('tenant_id',tenant);return isManager?q:q.eq('lecturer_id',userId);},current),tenant);
   if(all.some(m=>typeof m.title!=='string'||(!isManager&&m.lecturer_id!==userId)))throw Error('Module scope could not be verified');
   const allowed=all.sort((a,b)=>a.title.localeCompare(b.title)),ids=allowed.map(m=>m.id);
   const [rawTemplates,rawClasses]=await Promise.all([
    readLabIdBatches(ids,group=>db.from('lab_templates').select('id,tenant_id,module_id,title,provider,access_mode,published,active,duration_minutes').eq('tenant_id',tenant).in('module_id',group),current),
    readLabIdBatches(ids,group=>db.from('live_class_sessions').select('id,tenant_id,module_id,title').eq('tenant_id',tenant).in('module_id',group),current),
   ]);
   const list=verifyLabRows<Template>(rawTemplates,tenant),sessions=verifyLabRows<Session>(rawClasses,tenant);
   if(list.some(t=>!ids.includes(t.module_id)||typeof t.title!=='string'||typeof t.published!=='boolean'||typeof t.active!=='boolean')||sessions.some(c=>!c.module_id||!ids.includes(c.module_id)||typeof c.title!=='string'))throw Error('Unverified teaching catalogue');
   const tids=list.map(t=>t.id);
   const [rawRuns,rawRequests,rawNotes]=await Promise.all([
    readLabIdBatches(tids,group=>db.from('lab_class_runs').select('id,tenant_id,template_id,cohort_reference,status,starts_at,max_concurrent,live_class_session_id').eq('tenant_id',tenant).in('template_id',group),current),
    readLabIdBatches(tids,group=>db.from('unipathway_lab_launch_requests').select('id,tenant_id,student_id,template_id,class_run_id,mode,status,requested_at').eq('tenant_id',tenant).in('template_id',group),current),
    readLabIdBatches(tids,group=>db.from('unipathway_lab_task_notes').select('id,tenant_id,student_id,template_id,task_id,notes,status,updated_at').eq('tenant_id',tenant).in('template_id',group).eq('status','submitted'),current),
   ]);
   const runRows=verifyLabRows<Run>(rawRuns,tenant),req=verifyLabRows<Request>(rawRequests,tenant),notes=verifyLabRows<Practice>(rawNotes,tenant);
   if(runRows.some(r=>!tids.includes(r.template_id)||typeof r.cohort_reference!=='string')||
    req.some(r=>!tids.includes(r.template_id)||typeof r.student_id!=='string'||!r.student_id)||
    notes.some(n=>!tids.includes(n.template_id)||n.status!=='submitted'||typeof n.student_id!=='string'||!n.student_id||typeof n.notes!=='string'||typeof n.updated_at!=='string'))throw Error('Unverified lab activity');
   const byRequest=new Map(req.map(r=>[r.id,r]));
   const rawHelp=await readLabIdBatches(req.map(r=>r.id),group=>db.from('unipathway_lab_support_requests').select('id,tenant_id,student_id,launch_request_id,message,status,requested_at,response').eq('tenant_id',tenant).in('launch_request_id',group).in('status',['waiting','claimed']),current);
   const helpRows=verifyLabRows<Help>(rawHelp,tenant);
   if(helpRows.some(h=>byRequest.get(h.launch_request_id)?.student_id!==h.student_id||!['waiting','claimed'].includes(h.status)||typeof h.message!=='string'||typeof h.requested_at!=='string'))throw Error('Unverified support queue');
   if(!current())return false;
   setModules(allowed);setTemplates(list.sort((a,b)=>a.title.localeCompare(b.title)));setClasses(sessions);
   setRuns(runRows);setRequests(req);setEvidence(notes.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)));setHelp(helpRows.sort((a,b)=>a.requested_at.localeCompare(b.requested_at)));
   setUncertain(false);return true;
  }catch{if(current())setError('Assigned lab records could not be verified.');return false;}
  finally{if(current())setLoading(false);}
 },[authorised,userId,tenant,isManager]);
 useEffect(()=>{void load();},[load]);
 const writeAllowed=()=>authorised&&!!tenant&&!!userId&&!loading&&!error&&!uncertain&&!lock.current&&mounted.current;
 async function write(key:string,operation:()=>Promise<void>,message:string|(()=>string),clear?:()=>void){
  if(!writeAllowed())return;
  lock.current=true;setBusy(key);
  try{
   await operation();
   if(!mounted.current)return;
   if(!await load())throw Error('Refresh not confirmed');
   if(!mounted.current)return;
   clear?.();toast.success(typeof message==='function'?message():message);
  }catch{
   if(mounted.current){setUncertain(true);toast.error('The action could not be confirmed. Your entries are retained. Refresh records before retrying.');}
  }finally{lock.current=false;if(mounted.current)setBusy('');}
 }
 const createTemplate=async()=>{
  if(!modules.some(m=>m.id===moduleId)||!title.trim()||title.trim().length>160||!tenant||!userId||!providerOptions.includes(provider)||!['both','class_only','self_study'].includes(mode)||![30,45,60,90,120,180,240].includes(duration))return toast.error('Choose an assigned module and valid lab details.');
  const cost=instructorLabCost(estimatedCost,provider);
  if(cost===null)return toast.error('Use a finite estimate between £0 and £500; managed AWS requires a positive estimate.');
  const label=title.trim();
  await write('template',async()=>{
   const {data,error}=await db.from('lab_templates').insert({tenant_id:tenant,module_id:moduleId,title:label,provider,access_mode:mode,published:false,active:true,created_by:userId,duration_minutes:duration,max_attempts:3,estimated_cost_gbp:cost}).select('id,tenant_id,module_id,title,published,created_by').single();
   if(error||!labReceiptId(data?.id)||data.tenant_id!==tenant||data.module_id!==moduleId||data.title!==label||data.published!==false||data.created_by!==userId)throw Error('Unverified template');
  },'Lab created as a private draft. Add tasks and publish when approved.',()=>{setTitle('');setEstimatedCost('');});
 };
 const addTask=async(t:Template)=>{
  const name=taskTitles[t.id]?.trim(),instructions=taskInstructions[t.id]?.trim();
  if(!templates.some(row=>row.id===t.id)||!name||name.length>140||!instructions||instructions.length>3000||!tenant)return toast.error('Provide a valid task title and instructions.');
  await write(t.id,async()=>{
   const {data:existing,error}=await db.from('lab_tasks').select('id,tenant_id,template_id,sequence_no').eq('tenant_id',tenant).eq('template_id',t.id).order('sequence_no',{ascending:false}).limit(1);
   if(error||!Array.isArray(existing)||existing.length>1||existing.some(row=>row.tenant_id!==tenant||row.template_id!==t.id||!Number.isSafeInteger(row.sequence_no)||row.sequence_no<0))throw Error('Task order unavailable');
   const next=(existing[0]?.sequence_no||0)+1;
   const result=await db.from('lab_tasks').insert({tenant_id:tenant,template_id:t.id,sequence_no:next,title:name,instructions,verification_type:'manual',points:0}).select('id,tenant_id,template_id,title,sequence_no').single();
   const row=result.data;
   if(result.error||!labReceiptId(row?.id)||row.tenant_id!==tenant||row.template_id!==t.id||row.title!==name||row.sequence_no!==next)throw Error('Task receipt unverified');
  },'Guided exercise added.',()=>{setTaskTitles(p=>({...p,[t.id]:''}));setTaskInstructions(p=>({...p,[t.id]:''}));});
 };
 const publish=async(t:Template)=>{
  if(!writeAllowed()||!templates.some(row=>row.id===t.id&&!row.published&&row.active))return;
  if(!window.confirm('Publish this lab syllabus and practice notes to actively enrolled students? AWS workspace provisioning will remain gated separately.'))return;
  await write(t.id,async()=>{
   const {data,error}=await db.from('lab_templates').update({published:true}).eq('tenant_id',tenant).eq('id',t.id).eq('published',false).select('id,tenant_id,published').single();
   if(error||data?.id!==t.id||data.tenant_id!==tenant||data.published!==true)throw Error('Publication not confirmed');
  },'Lab syllabus published to enrolled students.');
 };
 const schedule=async()=>{
  const template=templates.find(t=>t.id===runTemplate&&t.active&&['both','class_only'].includes(t.access_mode)),window=instructorLabWindow(runStart,runEnd);
  if(!template||!cohort.trim()||cohort.trim().length>100||!window||!userId||!tenant||![10,20,25,50,100,150].includes(runConcurrent))return toast.error('Choose a valid lab, cohort, capacity and start/end time.');
  if(linkedClass&&!classes.some(c=>c.id===linkedClass&&c.module_id===template.module_id))return toast.error('Teams class must belong to the same module');
  await write('run',async()=>{
   const {data,error}=await db.from('lab_class_runs').insert({tenant_id:tenant,template_id:template.id,cohort_reference:cohort.trim(),live_class_session_id:linkedClass||null,lead_instructor_id:userId,starts_at:window.start,ends_at:window.end,max_concurrent:runConcurrent,status:'scheduled'}).select('id,tenant_id,template_id,lead_instructor_id,status').single();
   if(error||!labReceiptId(data?.id)||data.tenant_id!==tenant||data.template_id!==template.id||data.lead_instructor_id!==userId||data.status!=='scheduled')throw Error('Unverified class run');
  },'Class lab scheduled. Invite learners before they can request their workspace.',()=>{setCohort('');setRunStart('');setRunEnd('');});
 };
 const invite=async(run:Run)=>{
  if(!writeAllowed()||!runs.some(r=>r.id===run.id&&['scheduled','active'].includes(r.status)))return;
  if(!window.confirm('Invite actively enrolled students to this module lab? This creates LMS invitations, not Microsoft or AWS credentials.'))return;
  let invited=0;
  await write(run.id,async()=>{
   const {data,error}=await db.rpc('invite_enrolled_unipathway_lab_run',{p_run:run.id});
   if(error||!Number.isSafeInteger(data)||data<0||data>1000)throw Error('Unverified invitation count');
   invited=data;
  },()=>invited+' new LMS invitations recorded by the server. No provider credentials or email delivery confirmed.');
 };
 const review=async(note:Practice)=>{
  const value=answers[note.id]?.trim();
  if(!value||value.length<2||value.length>2000||!evidence.some(n=>n.id===note.id)||!tenant||!userId)return toast.error('Write 2–2000 characters of feedback.');
  await write(note.id,async()=>{
   const result=await db.rpc('review_unipathway_lab_practice_note',{p_note:note.id,p_feedback:value});
   if(result.error||!mounted.current)throw Error('Review unconfirmed');
   const {data,error}=await db.from('unipathway_lab_task_notes').select('id,tenant_id,student_id,template_id,status,reviewer_id,reviewer_feedback').eq('tenant_id',tenant).eq('id',note.id).single();
   if(error||!instructorFeedbackConfirmed(data,{id:note.id,tenant,student:note.student_id,referenceKey:'template_id',reference:note.template_id,status:'reviewed',authorKey:'reviewer_id',author:userId,textKey:'reviewer_feedback',text:value}))throw Error('Review receipt unverified');
  },'Practice evidence reviewed (no grade released).',()=>setAnswers(p=>({...p,[note.id]:''})));
 };
 const reply=async(h:Help)=>{
  const value=answers[h.id]?.trim();
  if(!value||value.length<2||value.length>2000||!help.some(row=>row.id===h.id)||!tenant||!userId)return toast.error('Write 2–2000 characters of guidance.');
  await write(h.id,async()=>{
   const result=await db.rpc('answer_unipathway_lab_support',{p_support:h.id,p_response:value});
   if(result.error||!mounted.current)throw Error('Reply unconfirmed');
   const {data,error}=await db.from('unipathway_lab_support_requests').select('id,tenant_id,student_id,launch_request_id,status,assigned_lecturer_id,response').eq('tenant_id',tenant).eq('id',h.id).single();
   if(error||!instructorFeedbackConfirmed(data,{id:h.id,tenant,student:h.student_id,referenceKey:'launch_request_id',reference:h.launch_request_id,status:'resolved',authorKey:'assigned_lecturer_id',author:userId,textKey:'response',text:value}))throw Error('Reply receipt unverified');
  },'Reply saved for student.',()=>setAnswers(p=>({...p,[h.id]:''})));
 };
 const matchingTemplate=(id:string)=>{const t=templates.find(row=>row.id===id);return t?[t.title,modules.find(m=>m.id===t.module_id)?.title||''].join(' '):'';};
 const visibleEvidence=evidence.filter(n=>matchesLocalSearch([n.student_id,matchingTemplate(n.template_id),n.notes].join(' '),search));
 const visibleHelp=help.filter(h=>matchesLocalSearch([h.student_id,matchingTemplate(requests.find(r=>r.id===h.launch_request_id)?.template_id||''),h.message].join(' '),search));
 const active=useMemo(()=>requests.filter(r=>['awaiting_provider','provisioning','ready','active','paused'].includes(r.status)).length,[requests]);
 return <DashboardLayout title="Practical Lab Planner" subtitle="Build coding/cloud exercises for self-study, Teams teaching and classroom cohorts">
  <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Academic access first, cloud costs second</h2>
   <p className="mt-2 text-sm text-muted-foreground">Lecturers prepare modules and exercises, schedule lab classes, invite eligible students and support independent practice. A lab request remains pending until the institution configures a verified provider with isolation, cost controls and automatic shutdown. No AWS VM is launched from this page.</p>
   <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
    <Link to="/lecturer/materials" className="underline"><BookOpen className="mr-1 inline size-4"/>Upload teaching notes</Link>
    <Link to="/lecturer/classroom" className="underline"><GraduationCap className="mr-1 inline size-4"/>Teams classroom & whiteboard</Link>
    <Link to="/labs/teach" className="underline">Run a live tech or language lab</Link>
    <Link to="/labs/tech" className="underline">Browse Tech Lab exercises</Link>
   </div>
  </div>
  <div className="mb-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!!busy||loading} onClick={()=>void load()}>Refresh assigned lab records</Button>{uncertain&&<p role="alert" className="text-sm">A previous action was not confirmed. Refresh before retrying.</p>}</div>
  {loading&&<p role="status">Loading assigned modules and labs…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-5">{error} Check your active role and assigned centre, then retry.</p>}
  {!loading&&!error&&<fieldset disabled={!!busy||uncertain} className="min-w-0 space-y-7">
   <div className="grid gap-3 sm:grid-cols-3">
    <div className="rounded-xl border bg-card p-4"><Layers className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">My module labs</p><p className="text-2xl font-bold">{templates.length}</p></div>
    <div className="rounded-xl border bg-card p-4"><CalendarClock className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">Class lab sessions</p><p className="text-2xl font-bold">{runs.length}</p></div>
    <div className="rounded-xl border bg-card p-4"><Cloud className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">Active or pending lab requests</p><p className="text-2xl font-bold">{active}</p></div>
   </div>
   <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]"><h2 className="text-lg font-semibold">Create course-linked lab</h2>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm font-medium">Assigned module<select className="mt-1 w-full rounded-md border bg-background p-2" value={moduleId} onChange={e=>setModuleId(e.target.value)}>
      <option value="">Choose module</option>{modules.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Lab title<Input className="mt-1" maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. AWS VPC security group practical"/></label>
     <label className="text-sm font-medium">Learning environment<select className="mt-1 w-full rounded-md border bg-background p-2" value={provider} onChange={e=>setProvider(e.target.value as typeof provider)}>
      {providerOptions.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}</select></label>
     <label className="text-sm font-medium">Access mode<select className="mt-1 w-full rounded-md border bg-background p-2" value={mode} onChange={e=>setMode(e.target.value)}>
      <option value="both">Classroom + independent study</option><option value="class_only">Teacher-led class only</option><option value="self_study">Self-study only</option></select></label>
     <label className="text-sm font-medium">Time per attempt<select className="mt-1 w-full rounded-md border bg-background p-2" value={duration} onChange={e=>setDuration(Number(e.target.value))}>
      {[30,45,60,90,120,180,240].map(m=><option key={m} value={m}>{m} minutes</option>)}</select></label>
     <label className="text-sm font-medium">Planned maximum cost per attempt (GBP)<Input className="mt-1" type="number" min="0" max="500" step="0.01" value={estimatedCost}
      placeholder="Must be reviewed for AWS" onChange={e=>setEstimatedCost(e.target.value)}/></label>
    </div>
    <Button className="mt-3" disabled={!!busy||!moduleId||!title.trim()} onClick={()=>createTemplate()}>Create unpublished lab</Button>
   </section>
   <section className="space-y-3"><h2 className="text-xl font-bold">Course lab templates and exercises</h2>
    {templates.length===0&&<p className="rounded-xl border p-4 text-sm">No lab syllabus created for your modules yet.</p>}
    {templates.map(t=><article key={t.id} className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]">
     <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{t.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{modules.find(m=>m.id===t.module_id)?.title} · {t.provider} · {t.access_mode} · {t.published?'Published syllabus':'Private draft'} · {t.duration_minutes} minutes</p></div>
      {!t.published&&t.active&&<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>publish(t)}>Publish syllabus</Button>}
     </div>
     <div className="mt-3 grid gap-2 md:grid-cols-[minmax(14rem,1fr)_2fr_auto]">
      <label className="text-sm font-medium">New exercise title<Input className="mt-1" value={taskTitles[t.id]||''} maxLength={140} onChange={e=>setTaskTitles(p=>({...p,[t.id]:e.target.value}))}/></label>
      <label className="text-sm font-medium">Student instructions<Input className="mt-1" value={taskInstructions[t.id]||''} maxLength={3000} onChange={e=>setTaskInstructions(p=>({...p,[t.id]:e.target.value}))}/></label>
      <Button className="self-end" disabled={!!busy||!taskTitles[t.id]?.trim()||!taskInstructions[t.id]?.trim()} onClick={()=>addTask(t)}>Add task</Button>
     </div>
    </article>)}
   </section>
   <section className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]"><h2 className="text-lg font-bold">Schedule in-centre or online Teams practical</h2>
    <p className="mt-2 text-sm text-muted-foreground">A 120-student class may be invited as one cohort while only 25 cloud workspaces run concurrently. This protects spending and allows staggered practical groups. An optional Teams class links verbal teaching to the same LMS exercises.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm font-medium">Lab syllabus<select className="mt-1 w-full rounded-md border bg-background p-2" value={runTemplate} onChange={e=>{setRunTemplate(e.target.value);setLinkedClass('');}}>
      <option value="">Choose lab</option>{templates.filter(t=>t.active&&['both','class_only'].includes(t.access_mode)).map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
     <label className="text-sm font-medium">Cohort / lecture group<Input className="mt-1" maxLength={100} value={cohort} onChange={e=>setCohort(e.target.value)}/></label>
     <label className="text-sm font-medium">Start (device local time)<Input type="datetime-local" className="mt-1" value={runStart} onChange={e=>setRunStart(e.target.value)}/></label>
     <label className="text-sm font-medium">End (device local time)<Input type="datetime-local" className="mt-1" value={runEnd} onChange={e=>setRunEnd(e.target.value)}/></label>
     <label className="text-sm font-medium">Concurrent workspaces (not total students)<select className="mt-1 w-full rounded-md border bg-background p-2" value={runConcurrent} onChange={e=>setRunConcurrent(Number(e.target.value))}>
      {[10,20,25,50,100,150].map(n=><option key={n} value={n}>{n} concurrent labs</option>)}</select></label>
     <label className="text-sm font-medium">Link Microsoft Teams class (optional)<select className="mt-1 w-full rounded-md border bg-background p-2" value={linkedClass} onChange={e=>setLinkedClass(e.target.value)}>
      <option value="">No linked Teams class</option>{classes.filter(c=>c.module_id===templates.find(t=>t.id===runTemplate)?.module_id).map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    </div>
    <Button className="mt-3" disabled={!!busy||!runTemplate||!runStart||!runEnd||!cohort.trim()} onClick={()=>schedule()}><CalendarClock className="mr-1 size-4"/>Schedule lab group</Button>
   </section>
   <section className="space-y-3"><h2 className="text-xl font-bold">Lab cohorts and invitations</h2>
    {runs.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
     <div><p className="font-semibold">{r.cohort_reference}</p>
      <p className="mt-1 text-xs text-muted-foreground">{templates.find(t=>t.id===r.template_id)?.title||'Module lab'} · {r.status} · {r.max_concurrent} simultaneous workspaces · {r.live_class_session_id?'Teams-linked':'Independent class session'}</p></div>
     <Button size="sm" variant="outline" disabled={!!busy||!['scheduled','active'].includes(r.status)} onClick={()=>invite(r)}><Users className="mr-1 size-4"/>Invite all enrolled learners</Button></div>)}
    {runs.length===0&&<p className="text-sm text-muted-foreground">No practical class runs have been scheduled.</p>}
   </section>
   <section className="rounded-xl border bg-card p-3 sm:p-4 space-y-3"><h2 className="font-semibold">Find evidence and support requests</h2><div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-[1_1_14rem] text-sm font-medium">Search learner reference, lab or notes<Input className="mt-1" type="search" maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="text-sm font-medium">Review queue<select className="mt-1 block min-h-11 rounded-md border bg-background px-3" value={queueFilter} onChange={e=>setQueueFilter(e.target.value)}><option value="all">Both queues</option><option value="evidence">Practice evidence</option><option value="help">Tutor help</option></select></label>{(search||queueFilter!=='all')&&<Button variant="outline" onClick={()=>{setSearch('');setQueueFilter('all');}}>Clear filters</Button>}</div><p role="status" className="text-sm text-muted-foreground">{visibleEvidence.length} of {evidence.length} evidence notes · {visibleHelp.length} of {help.length} support requests match.</p></section>
   <section className="grid gap-5 lg:grid-cols-2">
    <div hidden={queueFilter==='help'} className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]"><h2 className="flex gap-2 font-semibold"><BookOpen className="size-5"/>Practical evidence awaiting tutor review ({evidence.length})</h2>
     {evidence.length===0&&<p className="mt-3 text-sm text-muted-foreground">No student notes have been submitted.</p>}{evidence.length>0&&!visibleEvidence.length&&<p className="mt-3 text-sm">No evidence matches your search.</p>}
     <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">{visibleEvidence.map(n=><div key={n.id} className="rounded-lg border p-3">
      <p className="text-xs font-semibold">Student reference {n.student_id.slice(0,8)} · {templates.find(t=>t.id===n.template_id)?.title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{n.notes}</p>
      <Textarea rows={2} className="mt-3" value={answers[n.id]||''} maxLength={2000}
       aria-label={'Feedback for evidence '+n.id} placeholder="Constructive feedback (not a final grade)…" onChange={e=>setAnswers(p=>({...p,[n.id]:e.target.value}))}/>
      <Button size="sm" className="mt-2" disabled={!!busy||!answers[n.id]?.trim()} onClick={()=>review(n)}>Save feedback</Button>
     </div>)}</div>
    </div>
    <div hidden={queueFilter==='evidence'} className="min-w-0 rounded-xl border bg-card p-3 sm:p-5 [overflow-wrap:anywhere]"><h2 className="flex gap-2 font-semibold"><HelpCircle className="size-5"/>Lab help queue ({help.length})</h2>
     {help.length===0&&<p className="mt-3 text-sm text-muted-foreground">No pending lab requests for help.</p>}{help.length>0&&!visibleHelp.length&&<p className="mt-3 text-sm">No support requests match your search.</p>}
     <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">{visibleHelp.map(h=><div key={h.id} className="rounded-lg border p-3">
      <p className="text-xs font-semibold">Student {h.student_id.slice(0,8)} · {new Date(h.requested_at).toLocaleString()}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{h.message}</p>
      <Textarea rows={2} className="mt-3" value={answers[h.id]||''} maxLength={2000}
       aria-label={'Guidance for support '+h.id} placeholder="Guidance for the learner…" onChange={e=>setAnswers(p=>({...p,[h.id]:e.target.value}))}/>
      <Button size="sm" className="mt-2" disabled={!!busy||!answers[h.id]?.trim()} onClick={()=>reply(h)}>Reply & resolve</Button>
     </div>)}</div>
    </div>
   </section>
  </fieldset>}
 </DashboardLayout>;
}
