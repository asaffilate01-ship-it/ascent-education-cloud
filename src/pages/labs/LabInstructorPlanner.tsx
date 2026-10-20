import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,CalendarClock,Cloud,GraduationCap,HelpCircle,Layers,ShieldCheck,Users} from 'lucide-react';
type Module={id:string;title:string;lecturer_id:string|null;tenant_id:string};
type Template={id:string;module_id:string;title:string;provider:string;access_mode:string;published:boolean;active:boolean;duration_minutes:number};
type Run={id:string;template_id:string;cohort_reference:string;status:string;starts_at:string|null;max_concurrent:number;live_class_session_id:string|null};
type Session={id:string;module_id:string|null;title:string};
type Request={id:string;student_id:string;template_id:string;class_run_id:string|null;mode:string;status:string;requested_at:string};
type Practice={id:string;student_id:string;template_id:string;task_id:string;notes:string;status:string;updated_at:string};
type Help={id:string;student_id:string;launch_request_id:string;message:string;status:string;requested_at:string;response:string|null};
const providerOptions=['aws_academy','aws_managed','unipathway_container','github_codespaces','jupyter','azure','managed_lab'] as const;

export default function LabInstructorPlanner(){
 const {user}=useAuth();
 const [tenant,setTenant]=useState(user?.tenantId||'');
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
 const isManager=!!user?.roles.some(r=>['programme_leader','centre_director','superadmin'].includes(r));
 const userId=user?.id;
 useEffect(()=>{
  if(user?.tenantId){setTenant(user.tenantId);return;}
  if(user?.roles.includes('superadmin'))void db.from('tenants').select('id').eq('slug','unipathway').maybeSingle()
   .then(({data})=>setTenant(data?.id||''));
 },[user?.id,user?.tenantId]);
 const load=useCallback(async()=>{
  if(!userId||!tenant){setLoading(false);setError('A verified centre tenant is required.');return;}
  setLoading(true);setError('');
  try{
   const m=await db.from('modules').select('id,title,lecturer_id,tenant_id').eq('tenant_id',tenant).order('title');
   if(m.error)throw Error(m.error.message);
   const allowed=((m.data||[]) as Module[]).filter(row=>isManager||row.lecturer_id===userId);
   const ids=allowed.map(x=>x.id);setModules(allowed);
   if(!ids.length){setTemplates([]);setRuns([]);setClasses([]);setRequests([]);setEvidence([]);setHelp([]);return;}
   const [t,s]=await Promise.all([
    db.from('lab_templates').select('id,module_id,title,provider,access_mode,published,active,duration_minutes')
     .eq('tenant_id',tenant).in('module_id',ids).order('title').limit(200),
    db.from('live_class_sessions').select('id,module_id,title').eq('tenant_id',tenant).in('module_id',ids).limit(200),
   ]);
   if(t.error||s.error)throw Error(t.error?.message||s.error?.message||'Lab service unavailable');
   const templateRows=(t.data||[]) as Template[],tids=templateRows.map(x=>x.id);
   setTemplates(templateRows);setClasses((s.data||[]) as Session[]);
   if(!tids.length){setRuns([]);setRequests([]);setEvidence([]);setHelp([]);return;}
   const [r,q,n,h]=await Promise.all([
    db.from('lab_class_runs').select('id,template_id,cohort_reference,status,starts_at,max_concurrent,live_class_session_id')
     .eq('tenant_id',tenant).in('template_id',tids).order('created_at',{ascending:false}).limit(200),
    db.from('unipathway_lab_launch_requests').select('id,student_id,template_id,class_run_id,mode,status,requested_at')
     .eq('tenant_id',tenant).in('template_id',tids).order('requested_at',{ascending:false}).limit(250),
    db.from('unipathway_lab_task_notes').select('id,student_id,template_id,task_id,notes,status,updated_at')
     .eq('tenant_id',tenant).in('template_id',tids).eq('status','submitted').order('updated_at',{ascending:false}).limit(150),
    db.from('unipathway_lab_support_requests').select('id,student_id,launch_request_id,message,status,requested_at,response')
     .eq('tenant_id',tenant).in('status',['waiting','claimed']).order('requested_at').limit(150),
   ]);
   const fail=[r,q,n,h].find(x=>x.error);if(fail)throw Error(fail.error.message);
   const req=(q.data||[]) as Request[],owned=new Set(req.map(x=>x.id));
   setRuns((r.data||[]) as Run[]);setRequests(req);setEvidence((n.data||[]) as Practice[]);
   setHelp(((h.data||[]) as Help[]).filter(x=>owned.has(x.launch_request_id)));
  }catch(e){setError(e instanceof Error?e.message:'Lab planner not available');}
  finally{setLoading(false);}
 },[userId,tenant,isManager]);
 useEffect(()=>{void load();},[load]);
 const createTemplate=async()=>{
  const assigned=modules.some(x=>x.id===moduleId);
  if(!userId||!tenant||!assigned||!title.trim())return toast.error('Choose your assigned module and a lab title');
  if(provider==='aws_managed'&&(!Number(estimatedCost)||Number(estimatedCost)<=0)){toast.error('Enter a reviewed positive estimate for managed AWS labs');return;}
  if(Number(estimatedCost)<0||Number(estimatedCost)>500){toast.error('Lab estimate must be between £0 and £500');return;}
  setBusy('template');
  const {error:e}=await db.from('lab_templates').insert({
   tenant_id:tenant,module_id:moduleId,title:title.trim(),provider,
   access_mode:mode,published:false,active:true,created_by:userId,
   duration_minutes:duration,max_attempts:3,estimated_cost_gbp:Math.max(0,Number(estimatedCost)||0)
  });
  setBusy('');
  if(e)return toast.error('Lab draft rejected: '+e.message);
  toast.success('Lab created as a private draft. Add tasks and publish when approved.');
  setTitle('');setEstimatedCost('');await load();
 };
 const addTask=async(t:Template)=>{
  const name=taskTitles[t.id]?.trim(),instructions=taskInstructions[t.id]?.trim();
  if(!name||!instructions||!tenant)return toast.error('Provide a task title and instructions');
  setBusy(t.id);
  const {data:existing,error:countError}=await db.from('lab_tasks')
    .select('sequence_no').eq('template_id',t.id).order('sequence_no',{ascending:false}).limit(1);
  if(countError){setBusy('');return toast.error(countError.message);}
  const next=(existing?.[0]?.sequence_no||0)+1;
  const {error:e}=await db.from('lab_tasks').insert({tenant_id:tenant,template_id:t.id,sequence_no:next,
   title:name,instructions,verification_type:'manual',points:0});
  setBusy('');
  if(e)return toast.error(e.message);
  setTaskTitles(p=>({...p,[t.id]:''}));setTaskInstructions(p=>({...p,[t.id]:''}));
  toast.success('Guided exercise added.');await load();
 };
 const publish=async(t:Template)=>{
  if(!window.confirm('Publish this lab syllabus and practice notes to actively enrolled students? AWS workspace provisioning will remain gated separately.'))return;
  setBusy(t.id);
  const {error:e}=await db.from('lab_templates').update({published:true}).eq('id',t.id);
  setBusy('');
  if(e)return toast.error('Cannot publish: '+e.message);
  toast.success('Lab syllabus published to enrolled students.');await load();
 };
 const schedule=async()=>{
  const template=templates.find(t=>t.id===runTemplate);
  if(!template||!cohort.trim()||!runStart||!runEnd||!userId||!tenant)return toast.error('Complete the lab, cohort and time selections');
  if(new Date(runEnd).getTime()<=new Date(runStart).getTime())return toast.error('Class end must be later than start');
  if(linkedClass&&!classes.some(s=>s.id===linkedClass&&s.module_id===template.module_id))return toast.error('Teams class must belong to the same module');
  setBusy('run');
  const {error:e}=await db.from('lab_class_runs').insert({
    tenant_id:tenant,template_id:template.id,cohort_reference:cohort.trim(),
    live_class_session_id:linkedClass||null,lead_instructor_id:userId,
    starts_at:new Date(runStart).toISOString(),ends_at:new Date(runEnd).toISOString(),
    max_concurrent:runConcurrent,status:'scheduled'
  });
  setBusy('');
  if(e)return toast.error('Class lab not scheduled: '+e.message);
  toast.success('Class lab scheduled. Invite learners before they can request their workspace.');await load();
 };
 const invite=async(run:Run)=>{
  if(!window.confirm('Invite actively enrolled students to this module lab? This creates LMS invitations, not Microsoft or AWS credentials.'))return;
  setBusy(run.id);
  const {data,error:e}=await db.rpc('invite_enrolled_unipathway_lab_run',{p_run:run.id});
  setBusy('');
  if(e)return toast.error('Invitations not created: '+e.message);
  toast.success(String(data||0)+' enrolled students invited to this lab.');
 };
 const review=async(note:Practice)=>{
  const value=answers[note.id]?.trim();
  if(!value)return toast.error('Write feedback first');
  setBusy(note.id);
  const {error:e}=await db.rpc('review_unipathway_lab_practice_note',{p_note:note.id,p_feedback:value});
  setBusy('');
  if(e)return toast.error('Feedback not saved: '+e.message);
  toast.success('Practice evidence reviewed (no grade released).');await load();
 };
 const reply=async(h:Help)=>{
  const value=answers[h.id]?.trim();
  if(!value)return toast.error('Write guidance first');
  setBusy(h.id);
  const {error:e}=await db.rpc('answer_unipathway_lab_support',{p_support:h.id,p_response:value});
  setBusy('');
  if(e)return toast.error('Help reply rejected: '+e.message);
  toast.success('Reply saved for student.');await load();
 };
 const active=useMemo(()=>requests.filter(r=>['awaiting_provider','provisioning','ready','active','paused'].includes(r.status)).length,[requests]);
 return <DashboardLayout title="Practical Lab Planner" subtitle="Build coding/cloud exercises for self-study, Teams teaching and classroom cohorts">
  <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Academic access first, cloud costs second</h2>
   <p className="mt-2 text-sm text-muted-foreground">Lecturers prepare modules and exercises, schedule lab classes, invite eligible students and support independent practice. A lab request remains pending until the institution configures a verified provider with isolation, cost controls and automatic shutdown. No AWS VM is launched from this page.</p>
   <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
    <Link to="/lecturer/materials" className="underline"><BookOpen className="mr-1 inline size-4"/>Upload teaching notes</Link>
    <Link to="/lecturer/classroom" className="underline"><GraduationCap className="mr-1 inline size-4"/>Teams classroom & whiteboard</Link>
    <Link to="/coding" className="underline">Browser coding practice (demo)</Link>
   </div>
  </div>
  {loading&&<p role="status">Loading assigned modules and labs…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-5">{error}. Verify staging schema and authorised centre roles.</p>}
  {!loading&&!error&&<div className="space-y-7">
   <div className="grid gap-3 sm:grid-cols-3">
    <div className="rounded-xl border bg-card p-4"><Layers className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">My module labs</p><p className="text-2xl font-bold">{templates.length}</p></div>
    <div className="rounded-xl border bg-card p-4"><CalendarClock className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">Class lab sessions</p><p className="text-2xl font-bold">{runs.length}</p></div>
    <div className="rounded-xl border bg-card p-4"><Cloud className="size-5 text-success"/><p className="mt-2 text-sm text-muted-foreground">Active or pending lab requests</p><p className="text-2xl font-bold">{active}</p></div>
   </div>
   <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Create course-linked lab</h2>
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
    {templates.map(t=><article key={t.id} className="rounded-xl border bg-card p-5">
     <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{t.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{modules.find(m=>m.id===t.module_id)?.title} · {t.provider} · {t.access_mode} · {t.published?'Published syllabus':'Private draft'} · {t.duration_minutes} minutes</p></div>
      {!t.published&&<Button size="sm" variant="outline" disabled={!!busy} onClick={()=>publish(t)}>Publish syllabus</Button>}
     </div>
     <div className="mt-3 grid gap-2 md:grid-cols-[minmax(14rem,1fr)_2fr_auto]">
      <label className="text-sm font-medium">New exercise title<Input className="mt-1" value={taskTitles[t.id]||''} maxLength={140} onChange={e=>setTaskTitles(p=>({...p,[t.id]:e.target.value}))}/></label>
      <label className="text-sm font-medium">Student instructions<Input className="mt-1" value={taskInstructions[t.id]||''} maxLength={3000} onChange={e=>setTaskInstructions(p=>({...p,[t.id]:e.target.value}))}/></label>
      <Button className="self-end" disabled={!!busy||!taskTitles[t.id]?.trim()||!taskInstructions[t.id]?.trim()} onClick={()=>addTask(t)}>Add task</Button>
     </div>
    </article>)}
   </section>
   <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-bold">Schedule in-centre or online Teams practical</h2>
    <p className="mt-2 text-sm text-muted-foreground">A 120-student class may be invited as one cohort while only 25 cloud workspaces run concurrently. This protects spending and allows staggered practical groups. An optional Teams class links verbal teaching to the same LMS exercises.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm font-medium">Lab syllabus<select className="mt-1 w-full rounded-md border bg-background p-2" value={runTemplate} onChange={e=>{setRunTemplate(e.target.value);setLinkedClass('');}}>
      <option value="">Choose lab</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
     <label className="text-sm font-medium">Cohort / lecture group<Input className="mt-1" maxLength={100} value={cohort} onChange={e=>setCohort(e.target.value)}/></label>
     <label className="text-sm font-medium">Start<Input type="datetime-local" className="mt-1" value={runStart} onChange={e=>setRunStart(e.target.value)}/></label>
     <label className="text-sm font-medium">End<Input type="datetime-local" className="mt-1" value={runEnd} onChange={e=>setRunEnd(e.target.value)}/></label>
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
     <Button size="sm" variant="outline" disabled={!!busy} onClick={()=>invite(r)}><Users className="mr-1 size-4"/>Invite all enrolled learners</Button></div>)}
    {runs.length===0&&<p className="text-sm text-muted-foreground">No practical class runs have been scheduled.</p>}
   </section>
   <section className="grid gap-5 lg:grid-cols-2">
    <div className="rounded-xl border bg-card p-5"><h2 className="flex gap-2 font-semibold"><BookOpen className="size-5"/>Practical evidence awaiting tutor review ({evidence.length})</h2>
     {evidence.length===0&&<p className="mt-3 text-sm text-muted-foreground">No student notes have been submitted.</p>}
     <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">{evidence.map(n=><div key={n.id} className="rounded-lg border p-3">
      <p className="text-xs font-semibold">Student reference {n.student_id.slice(0,8)} · {templates.find(t=>t.id===n.template_id)?.title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{n.notes}</p>
      <Textarea rows={2} className="mt-3" value={answers[n.id]||''} maxLength={2000}
       placeholder="Constructive feedback (not a final grade)…" onChange={e=>setAnswers(p=>({...p,[n.id]:e.target.value}))}/>
      <Button size="sm" className="mt-2" disabled={!!busy||!answers[n.id]?.trim()} onClick={()=>review(n)}>Save feedback</Button>
     </div>)}</div>
    </div>
    <div className="rounded-xl border bg-card p-5"><h2 className="flex gap-2 font-semibold"><HelpCircle className="size-5"/>Lab help queue ({help.length})</h2>
     {help.length===0&&<p className="mt-3 text-sm text-muted-foreground">No pending lab requests for help.</p>}
     <div className="mt-3 max-h-[32rem] space-y-3 overflow-y-auto">{help.map(h=><div key={h.id} className="rounded-lg border p-3">
      <p className="text-xs font-semibold">Student {h.student_id.slice(0,8)} · {new Date(h.requested_at).toLocaleString()}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{h.message}</p>
      <Textarea rows={2} className="mt-3" value={answers[h.id]||''} maxLength={2000}
       placeholder="Guidance for the learner…" onChange={e=>setAnswers(p=>({...p,[h.id]:e.target.value}))}/>
      <Button size="sm" className="mt-2" disabled={!!busy||!answers[h.id]?.trim()} onClick={()=>reply(h)}>Reply & resolve</Button>
     </div>)}</div>
    </div>
   </section>
  </div>}
 </DashboardLayout>;
}
