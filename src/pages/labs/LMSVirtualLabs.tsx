import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,Cloud,Code2,Clock,ExternalLink,HelpCircle,LockKeyhole,
 GraduationCap,Monitor,Play,Plus,RefreshCcw,ShieldCheck,Users} from 'lucide-react';

type Mode='online'|'in_centre'|'self_study';
type Offering={id:string;template_id:string;module_id:string;tenant_id:string;title:string;description:string;
 modes:Mode[];published:boolean;launch_enabled:boolean;session_minutes:number;max_active_learners:number};
type Template={id:string;module_id:string;provider:string;title:string;duration_minutes:number;active:boolean};
type Module={id:string;programme_id:string;title:string;lecturer_id:string|null;tenant_id:string};
type Run={id:string;template_id:string;cohort_reference:string;starts_at:string|null;ends_at:string|null;
 max_concurrent:number;status:string;lead_instructor_id:string;tenant_id:string};
type Session={id:string;student_id:string;template_id:string;offering_id:string|null;class_run_id:string|null;
 launch_mode:Mode|null;status:string;created_at:string;expires_at:string|null;minutes_used:number;tenant_id:string};
type Task={id:string;template_id:string;title:string;instructions:string|null;sequence_no:number;points:number};
type Help={id:string;session_id:string;student_id:string;message:string|null;status:string;claimed_by:string|null};
type TaskProgress={id:string;session_id:string;task_id:string;status:string;verification_result:Record<string,unknown>};
type LabResults={url:string;sessionId:string;validitySeconds:number;status:string};
const modes:Mode[]=['self_study','online','in_centre'];
const providerName=(p:string)=>({
 aws_managed:'AWS virtual desktop (managed)',
 aws_academy:'AWS Academy Learner Lab (institutional invite)',
 github_codespaces:'GitHub Codespaces',
 unipathway_container:'UniPathway isolated coding container',
 jupyter:'Jupyter/Python notebook',
 azure:'Azure cloud lab',managed_lab:'Managed specialist lab'
}[p]||p);
export default function LMSVirtualLabs(){
 const {user}=useAuth();
 return <LMSVirtualLabsContent key={JSON.stringify([user?.id,user?.tenantId,user?.role,[...(user?.roles||[])].sort()])}/>;
}
function LMSVirtualLabsContent(){
 const {user}=useAuth();const [params]=useSearchParams();
 const readGeneration=useRef(0),gatewayGeneration=useRef(0);
 useEffect(()=>()=>{readGeneration.current++;gatewayGeneration.current++;},[]);
 const staff=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 const centreManager=!!user?.roles.some(r=>['centre_director','superadmin'].includes(r));
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [awsReady,setAwsReady]=useState(false);const [gatewayNote,setGatewayNote]=useState('');
 const [offerings,setOfferings]=useState<Offering[]>([]);const [templates,setTemplates]=useState<Template[]>([]);
 const [modules,setModules]=useState<Module[]>([]);const [runs,setRuns]=useState<Run[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);const [tasks,setTasks]=useState<Task[]>([]);
 const [helpRequests,setHelpRequests]=useState<Help[]>([]);const [progress,setProgress]=useState<TaskProgress[]>([]);
 const [invites,setInvites]=useState<{run_id:string;student_id:string;status:string}[]>([]);
 const [selectedId,setSelectedId]=useState('');const [mode,setMode]=useState<Mode>('self_study');
 const [classRun,setClassRun]=useState('');const [launch,setLaunch]=useState<LabResults|null>(null);
 const [busy,setBusy]=useState(false);const [helpText,setHelpText]=useState('');
 const [taskNotes,setTaskNotes]=useState<Record<string,string>>({});
 const [search,setSearch]=useState('');const searchInput=useRef<HTMLInputElement>(null);
 const [newTitle,setNewTitle]=useState('');const [newModule,setNewModule]=useState('');
 const [newProvider,setNewProvider]=useState('aws_managed');const [courseDuration,setCourseDuration]=useState(90);
 const [runName,setRunName]=useState('');const [runStart,setRunStart]=useState('');const [runEnd,setRunEnd]=useState('');
 const [taskTitle,setTaskTitle]=useState('');const [taskInstructions,setTaskInstructions]=useState('');
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 useEffect(()=>{
  if(user?.tenantId){setTenant(user.tenantId);return;}
  let active=true;
  if(user?.roles.includes('superadmin'))void db.from('tenants').select('id')
   .eq('slug','unipathway').maybeSingle().then(({data,error:e})=>{
    if(active&&!e&&data?.id)setTenant(data.id);
   });
  return()=>{active=false;};
 },[user?.id,user?.tenantId,user?.roles]);

 const reload=useCallback(async()=>{
  const generation=++readGeneration.current;
  const current=()=>readGeneration.current===generation;
  if(!user?.id||!tenant){setError('An approved centre assignment is required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const req=[
    db.from('lms_lab_offerings').select('id,tenant_id,module_id,template_id,title,description,modes,published,launch_enabled,session_minutes,max_active_learners').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(250),
    db.from('lab_templates').select('id,module_id,provider,title,duration_minutes,active').eq('tenant_id',tenant).limit(250),
    db.from('modules').select('id,programme_id,title,lecturer_id,tenant_id').eq('tenant_id',tenant).limit(300),
    db.from('lab_class_runs').select('id,template_id,cohort_reference,starts_at,ends_at,max_concurrent,status,lead_instructor_id,tenant_id').eq('tenant_id',tenant).limit(300),
    db.from('lab_sessions').select('id,student_id,template_id,offering_id,class_run_id,launch_mode,status,created_at,expires_at,minutes_used,tenant_id').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(300),
    db.from('lab_tasks').select('id,template_id,title,instructions,sequence_no,points').eq('tenant_id',tenant).order('sequence_no').limit(500),
    db.from('lab_help_requests').select('id,session_id,student_id,message,status,claimed_by').eq('tenant_id',tenant)
      .in('status',['waiting','claimed','assisting']).limit(200),
    db.from('lab_task_progress').select('id,session_id,task_id,status,verification_result').eq('tenant_id',tenant).limit(400),
    db.from('lms_lab_class_invitations').select('run_id,student_id,status').eq('tenant_id',tenant).limit(700),
   ];
   const responses=await Promise.all(req);
   if(!current())return;
   const rejected=responses.find(x=>x.error);
   if(rejected)throw Error(rejected.error.message);
   const [o,t,m,r,s,ta,h,p,i]=responses;
   setOfferings((o.data||[]) as Offering[]);
   setTemplates((t.data||[]) as Template[]);
   setModules((m.data||[]) as Module[]);
   setRuns((r.data||[]) as Run[]);
   setSessions((s.data||[]) as Session[]);
   setTasks((ta.data||[]) as Task[]);
   setHelpRequests((h.data||[]) as Help[]);
   setProgress((p.data||[]) as TaskProgress[]);
   setInvites((i.data||[]) as {run_id:string;student_id:string;status:string}[]);
  }catch(e){if(current())setError(e instanceof Error?e.message:'LMS labs could not be loaded');}
  finally{if(current())setLoading(false);}
 },[tenant,user?.id]);
 useEffect(()=>{void reload();},[reload]);
 const checkGateway=useCallback(async()=>{
  const generation=++gatewayGeneration.current;
  setAwsReady(false);setGatewayNote('Checking AWS provider configuration…');
  if(!user?.id)return;
  try{
   const {data,error:e}=await supabase.functions.invoke('unipathway-aws-lab-gateway',{body:{action:'readiness'}});
   if(gatewayGeneration.current!==generation)return;
   setAwsReady(!e&&data?.aws_managed_configured===true);
   setGatewayNote(e?'AWS lab connector is unavailable.':String(data?.note||'AWS provider verification pending.'));
  }catch{if(gatewayGeneration.current===generation){setAwsReady(false);setGatewayNote('AWS provider connector is unavailable.');}}
 },[user?.id]);
 useEffect(()=>{void checkGateway();},[checkGateway]);
 const refreshLabs=()=>{void reload();void checkGateway();};
 const eligibleModules=useMemo(()=>staff&&!centreManager&&!user?.roles.includes('programme_leader')?
  modules.filter(m=>m.lecturer_id===user?.id):modules,[staff,centreManager,modules,user?.id,user?.roles]);
 const allowedModules=useMemo(()=>new Set(eligibleModules.map(m=>m.id)),[eligibleModules]);
 const visibleOfferings=useMemo(()=>offerings.filter(o=>allowedModules.has(o.module_id)&&
  (staff||o.published)&&(!params.get('module')||params.get('module')===o.module_id)),[offerings,staff,params,allowedModules]);
 const query=search.trim().toLocaleLowerCase();
 const matchingOfferings=visibleOfferings.filter(o=>[o.title,o.description,modules.find(m=>m.id===o.module_id)?.title,providerName(templates.find(t=>t.id===o.template_id)?.provider||'')].join(' ').toLocaleLowerCase().includes(query));
 const selected=matchingOfferings.find(x=>x.id===selectedId)||matchingOfferings[0]||null;
 useEffect(()=>{setLaunch(null);setClassRun('');setMode('self_study');setHelpText('');},[selected?.id]);
 const template=templates.find(x=>x.id===selected?.template_id);
 const activeRuns=runs.filter(r=>r.template_id===template?.id&&['scheduled','active'].includes(r.status)&&
  (staff||invites.some(i=>i.run_id===r.id&&i.student_id===user?.id&&i.status==='invited')));
 const ownSessions=sessions.filter(s=>staff?s.offering_id===selected?.id:s.student_id===user?.id&&s.offering_id===selected?.id);
 const ownSession=ownSessions.find(s=>['provisioning','ready','active','paused'].includes(s.status)&&(!s.expires_at||new Date(s.expires_at)>new Date()))||null;
 const availableTasks=tasks.filter(t=>t.template_id===selected?.template_id);
 const sessionProgress=progress.filter(p=>p.session_id===ownSession?.id);
 const myHelp=helpRequests.filter(h=>staff?ownSessions.some(s=>s.id===h.session_id):h.student_id===user?.id&&h.session_id===ownSession?.id);
 const managedProvider=template?.provider==='aws_managed';
 const providerReady=!!selected?.launch_enabled && !!selected?.published && managedProvider && awsReady;
 const possibleMode=selected?.modes?.includes(mode)?mode:(selected?.modes?.[0]||'self_study');
 const call=async(action:'request_and_launch'|'launch_existing',args:Record<string,unknown>)=>{
  setBusy(true);setLaunch(null);
  try{
   const {data,error:e}=await supabase.functions.invoke('unipathway-aws-lab-gateway',{body:{action,...args}});
   if(e||data?.error||!data?.url){toast.error('Cloud workspace could not be opened. Please retry or contact your instructor.');return;}
   if(typeof data.url!=='string'||!data.url.startsWith('https://')){toast.error('AWS returned an invalid launch URL');return;}
   setLaunch({url:data.url,status:String(data.status),sessionId:String(data.sessionId),validitySeconds:Number(data.validitySeconds)||60});
   toast.success('Short-lived AWS workspace link ready. Open within 60 seconds.');
   void reload();
  }catch{toast.error('Cloud workspace request failed. Please check your connection and retry.');}
  finally{setBusy(false);}
 };
 const request=()=>{
  if(!selected||!providerReady||!user?.id)return;
  if(possibleMode!=='self_study'&&!classRun){toast.error('Choose an available lecturer-led practical first');return;}
  void call('request_and_launch',{offeringId:selected.id,mode:possibleMode,
   classRunId:possibleMode==='self_study'?null:classRun});
 };
 const askHelp=async()=>{
  if(!ownSession||!helpText.trim())return;
  setBusy(true);
  const {error:e}=await db.rpc('request_unipathway_lab_help',{p_session:ownSession.id,p_message:helpText});
  setBusy(false);
  if(e){toast.error(e.message);return;}
  setHelpText('');toast.success('Private instructor help request recorded');void reload();
 };
 const submitTask=async(taskId:string)=>{
  if(!ownSession)return;
  const noteKey=`${ownSession.id}:${taskId}`;const taskNote=taskNotes[noteKey]||'';
  if(taskNote.trim().length<5)return;
  setBusy(true);
  try{
   const {error:e}=await db.rpc('submit_unipathway_lab_task',{p_session:ownSession.id,p_task:taskId,p_note:taskNote});
   if(e){toast.error('Your evidence note could not be saved. Please retry.');return;}
   setTaskNotes(notes=>{const next={...notes};if(next[noteKey]===taskNote)delete next[noteKey];return next;});
   toast.success('Evidence noted for tutor review, not graded automatically.');void reload();
  }catch{toast.error('Your evidence note could not be saved. Check your connection and retry.');}
  finally{setBusy(false);}
 };
 const claimHelp=async(id:string,resolve:boolean)=>{
  setBusy(true);const {error:e}=await db.rpc('claim_unipathway_lab_help',{p_request:id,p_resolved:resolve});
  setBusy(false);if(e){toast.error(e.message);return;}void reload();
 };
 const review=async(p:TaskProgress,approved:boolean)=>{
  const feedback=reviewNotes[p.id]||'';
  setBusy(true);
  try{
   const {error:e}=await db.rpc('review_unipathway_lab_task',{
    p_session:p.session_id,p_task:p.task_id,p_approved:approved,p_feedback:feedback});
   if(e){toast.error('The review could not be saved. Please retry.');return;}
   setReviewNotes(notes=>{const next={...notes};if(next[p.id]===feedback)delete next[p.id];return next;});void reload();
  }catch{toast.error('The review could not be saved. Check your connection and retry.');}
  finally{setBusy(false);}
 };
 const createCourse=async()=>{
  const m=eligibleModules.find(m=>m.id===newModule);
  if(!m||!user||!newTitle.trim()){toast.error('Select an assigned course module and title');return;}
  setBusy(true);
  const {data:t,error:e}=await db.from('lab_templates').insert({
   tenant_id:tenant,module_id:m.id,title:newTitle.trim(),
   provider:newProvider,duration_minutes:courseDuration,max_attempts:8,
   environment_reference:null,active:true,created_by:user.id,published:false,access_mode:'both'
  }).select('id').single();
  if(e||!t){setBusy(false);toast.error('Lab template could not be saved: '+(e?.message||'Denied'));return;}
  const {error:offerError}=await db.from('lms_lab_offerings').insert({
   tenant_id:tenant,module_id:m.id,template_id:t.id,title:newTitle.trim(),
   description:'Tutor-led and independent practical work for enrolled learners',
   modes:['online','in_centre','self_study'],session_minutes:courseDuration,
   max_active_learners:100,self_study_attempts:8,created_by:user.id,published:false,launch_enabled:false
  });
  setBusy(false);
  if(offerError){toast.error('Template saved, but lab offering failed: '+offerError.message);return;}
  setNewTitle('');toast.success('Draft LMS lab added. Director must approve AWS activation.');void reload();
 };
 const publish=async(offering:Offering)=>{
  setBusy(true);
  const {error:e}=await db.from('lms_lab_offerings').update({published:true}).eq('id',offering.id);
  setBusy(false);if(e){toast.error(e.message);return;}
  toast.success('Lab syllabus published to enrolled students. AWS activation is separate.');void reload();
 };
 const activate=async(offering:Offering)=>{
  if(!centreManager||!awsReady){toast.error('AWS gateway must be configured before activation');return;}
  if(!window.confirm('Activate only after verifying provider credentials, budget guardrails, IAM scope, fleet capacity and staging RLS tests?'))return;
  setBusy(true);
  const {error:e}=await db.from('lms_lab_offerings').update({launch_enabled:true}).eq('id',offering.id);
  setBusy(false);if(e){toast.error(e.message);return;}
  toast.success('Lab launch configuration enabled; test student access in staging.');void reload();
 };
 const createRun=async()=>{
  if(!user?.id||!selected||!runName.trim()||!runStart||!runEnd)return;
  if(new Date(runEnd)<=new Date(runStart)){toast.error('Practical must end after it starts');return;}
  setBusy(true);
  const {error:e}=await db.from('lab_class_runs').insert({
   tenant_id:tenant,template_id:selected.template_id,lead_instructor_id:user.id,
   cohort_reference:runName.trim(),starts_at:new Date(runStart).toISOString(),
   ends_at:new Date(runEnd).toISOString(),max_concurrent:selected.max_active_learners,
   status:'scheduled'
  });
  setBusy(false);if(e){toast.error(e.message);return;}setRunName('');toast.success('Lab practical scheduled. Link this exercise from your Teams lesson plan.');void reload();
 };
 const inviteClass=async(run:Run)=>{
  if(!staff)return;
  if(!window.confirm('Invite all actively enrolled students, up to the AWS lab run capacity? Invites are access records, not evidence of a provider workspace or sent email.'))return;
  setBusy(true);
  const {data,error:e}=await db.rpc('invite_enrolled_unipathway_lab_class',{p_run:run.id});
  setBusy(false);
  if(e){toast.error('Cohort invitation denied: '+e.message);return;}
  toast.success(String(data||0)+' new students invited to this lab run.');void reload();
 };
 const addTask=async()=>{
  if(!selected||!taskTitle.trim())return;
  setBusy(true);
  const {error:e}=await db.from('lab_tasks').insert({
   tenant_id:tenant,template_id:selected.template_id,title:taskTitle.trim(),
   instructions:taskInstructions.trim().slice(0,3000),sequence_no:availableTasks.length+1,verification_type:'manual',points:0
  });
  setBusy(false);if(e){toast.error(e.message);return;}setTaskTitle('');setTaskInstructions('');void reload();
 };
 return <DashboardLayout title="UniPathway Tech & AWS Virtual Labs" subtitle="Course-linked cloud coding, practical tasks, Teams classes and supervised independent learning">
  <div className="min-w-0 break-words [&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal">
  <section className="mb-5 rounded-xl border bg-primary/5 p-5">
   <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="size-5"/>One secure lab workspace for every learning mode</h2>
   <p className="mt-2 text-sm text-muted-foreground">Enrolled students access practical exercises from their LMS course on a centre laptop, from live Teams lessons, or independently at home. Labs are private by module, session and student. AWS streaming links expire after 60 seconds; budgets and provider capacity must be independently configured before launch.</p>
   <div className="mt-3 flex flex-wrap gap-4 text-sm">
    <Link className="font-semibold underline" to={staff?'/lecturer/classroom':'/student/classroom'}>Live teaching rooms</Link>
    <Link className="font-semibold underline" to={staff?'/lecturer/teaching':'/student/courses'}>Course modules and homework</Link>
    <Link className="font-semibold underline" to={staff?'/lecturer/gradebook':'/student/assignments'}>Assignments and assessments</Link>
   </div>
  </section>
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
   <p className="text-sm"><strong>AWS managed lab:</strong> {awsReady?'Server configuration detected (fleet, cost and identity checks still required).':'Not activated — students cannot start paid cloud workspaces.'}</p>
   <Button size="sm" variant="outline" onClick={refreshLabs}><RefreshCcw className="mr-1 size-4"/>Refresh labs</Button>
   {gatewayNote&&<p className="w-full text-xs text-muted-foreground">{gatewayNote}</p>}
  </div>
  {loading&&<p role="status">Loading your authorised lab catalogue…</p>}
  {error&&<section role="alert" className="space-y-3 rounded-xl border border-destructive p-5">
   <h2 className="font-semibold">Your labs are temporarily unavailable</h2>
   <p className="text-sm">{/schema cache|does not exist|could not find the table/i.test(error)?'The lab service is awaiting a system update. Your course access has not been changed.':error.includes('centre assignment')?'Your account needs an approved centre assignment. Please contact your programme team.':'We could not verify your lab records. Check your connection and try again, or contact your programme team.'}</p>
   <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={loading} onClick={refreshLabs}>Retry lab catalogue</Button><Button variant="outline" asChild><Link to={staff?'/lecturer/teaching':'/student/courses'}>Back to course modules</Link></Button>{!staff&&<Button variant="outline" asChild><Link to="/student/support">Contact learning support</Link></Button>}</div>
   {staff&&<details className="text-sm"><summary className="cursor-pointer font-semibold">Technical details for your administrator</summary><p className="mt-2 break-words">{error}</p><p className="mt-2">Check deployed classroom and lab migrations, centre assignment, role permissions and active course enrolment.</p></details>}
  </section>}
  {!loading&&!error&&<div className="space-y-6">
   {staff&&<section className="rounded-xl border bg-card p-5">
    <h2 className="flex items-center gap-2 font-bold"><Plus className="size-5"/>Create practical course lab (draft)</h2>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
     <label className="text-sm font-medium">Assigned module<select aria-label="Assigned course module" className="mt-1 w-full rounded-md border bg-background p-2" value={newModule} onChange={e=>setNewModule(e.target.value)}><option value="">Choose module</option>{eligibleModules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Lab name<Input className="mt-1" value={newTitle} maxLength={180} onChange={e=>setNewTitle(e.target.value)} placeholder="e.g. Cloud networking practical"/></label>
     <label className="text-sm font-medium">Lab environment<select aria-label="Lab environment" className="mt-1 w-full rounded-md border bg-background p-2" value={newProvider} onChange={e=>setNewProvider(e.target.value)}>
      {['aws_managed','aws_academy','github_codespaces','unipathway_container','jupyter'].map(p=><option value={p} key={p}>{providerName(p)}</option>)}</select></label>
     <label className="text-sm font-medium">Minutes per attempt<select aria-label="Minutes per lab attempt" className="mt-1 w-full rounded-md border bg-background p-2" value={courseDuration} onChange={e=>setCourseDuration(Number(e.target.value))}>
      {[30,45,60,90,120,180,240].map(n=><option value={n} key={n}>{n} minutes</option>)}</select></label>
    </div>
    <Button className="mt-3" disabled={busy||!newModule||!newTitle.trim()} onClick={()=>void createCourse()}>Save draft lab</Button>
    <p className="mt-2 text-xs text-muted-foreground">A draft offers content only. AWS provider configuration, verified funding and director approval are separate; this does not create an AWS VM.</p>
   </section>}
   <section className="grid gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)]">
    <aside className="min-w-0 rounded-xl border bg-card p-4">
     <h2 className="font-bold">My learning labs ({visibleOfferings.length})</h2>
     <label className="mt-3 block text-sm font-medium">Find a lab, module or provider<Input ref={searchInput} className="mt-1" value={search} maxLength={160} disabled={busy} onChange={e=>setSearch(e.target.value)}/></label>
     <p role="status" className="mt-2 text-xs text-muted-foreground">{matchingOfferings.length} of {visibleOfferings.length} labs shown</p>
     {query&&matchingOfferings.length===0&&<div className="mt-3 space-y-2"><p className="text-sm">No course labs match your search.</p><Button variant="outline" onClick={()=>{setSearch('');searchInput.current?.focus();}}>Clear lab search</Button></div>}
     {visibleOfferings.length===0&&<p className="mt-3 text-sm text-muted-foreground">No practical labs have been published for your enrolled courses. Your lecturer can prepare labs for the next intake.</p>}
     <div className="mt-3 space-y-2">{matchingOfferings.map(o=>{
      const provider=templates.find(t=>t.id===o.template_id)?.provider||'not configured';
      return <button key={o.id} type="button" disabled={busy} onClick={()=>{setSelectedId(o.id);setLaunch(null);setClassRun('');setMode('self_study');}}
        aria-pressed={selected?.id===o.id} className={'w-full rounded-lg border p-3 text-left text-sm '+(selected?.id===o.id?'border-primary bg-primary/5':'hover:bg-secondary/50')}>
        <span className="font-semibold">{o.title}</span><span className="mt-1 block text-xs text-muted-foreground">{providerName(provider)}</span>
        <span className="mt-1 block text-xs">{o.session_minutes} min · {o.published?'Published':'Draft'} · {o.launch_enabled?'Launch approved':'Access pending'}</span>
       </button>;
     })}</div>
    </aside>
    <div className="min-w-0 space-y-5">
     {selected&&<section className="rounded-xl border bg-card p-5">
      <h2 className="text-xl font-bold">{selected.title}</h2><p className="mt-2 text-sm text-muted-foreground">{selected.description||'Tutor-led learning, course exercises and self-study practicals.'}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
       <span className="rounded-lg bg-secondary p-3"><Cloud className="mb-1 size-5"/> {providerName(template?.provider||'')}</span>
       <span className="rounded-lg bg-secondary p-3"><Clock className="mb-1 size-5"/> {selected.session_minutes} minute session</span>
       <span className="rounded-lg bg-secondary p-3"><Users className="mb-1 size-5"/> Up to {selected.max_active_learners} simultaneous lab attempts</span>
      </div>
      {!staff&&<div className="mt-5 space-y-3 border-t pt-4">
       <h3 className="font-semibold">Start your practical learning</h3>
       <label className="block text-sm font-medium">Learning mode<select aria-label="Learning mode" className="mt-1 w-full rounded-md border bg-background p-2" value={possibleMode} onChange={e=>{setMode(e.target.value as Mode);setClassRun('');}}>
        {selected.modes.map(m=><option key={m} value={m}>{m==='self_study'?'Independent self-study':m==='online'?'Live online classroom':'In-centre practical class'}</option>)}
       </select></label>
       {possibleMode!=='self_study'&&<label className="block text-sm font-medium">Scheduled practical<select aria-label="Scheduled practical" className="mt-1 w-full rounded-md border bg-background p-2" value={classRun} onChange={e=>setClassRun(e.target.value)}>
        <option value="">Choose authorised lab run</option>{activeRuns.map(r=><option key={r.id} value={r.id}>{r.cohort_reference} — {r.starts_at?new Date(r.starts_at).toLocaleString():'Not scheduled'}</option>)}</select></label>}
       {!providerReady&&<p role="status" className="rounded-lg border bg-secondary p-3 text-sm">
        {managedProvider?'AWS managed virtual labs are awaiting centre activation and verified credentials.':
         'This course uses a partner/provider lab, so a verified invitation or supported provider launch is required. No live environment is connected here yet.'}</p>}
       <Button disabled={busy||!providerReady||(possibleMode!=='self_study'&&!classRun)} onClick={request}>
        <Play className="mr-2 size-4"/>Request secure cloud workspace
       </Button>
       {launch&&<div role="status" className="rounded-lg border border-primary bg-primary/5 p-4">
        <p className="text-sm font-semibold">AWS issued a 60-second access link. Opening it is required to actually join; issuing it is not proof of connection.</p>
        <a href={launch.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open AWS virtual lab <ExternalLink className="size-4"/></a>
        <p className="mt-2 text-xs text-muted-foreground">If expired, request a fresh link below.</p>
       </div>}
       {ownSession&&<div className="mt-3 rounded-lg border p-3">
        <p className="font-semibold text-sm">Latest lab attempt: {ownSession.status}</p>
        <p className="mt-1 text-xs text-muted-foreground">{ownSession.launch_mode} · expires {ownSession.expires_at?new Date(ownSession.expires_at).toLocaleString():'Not supplied'} · {ownSession.minutes_used||0} verified minutes recorded (provider telemetry pending).</p>
        <Button className="mt-2" variant="outline" size="sm" disabled={busy||!providerReady} onClick={()=>void call('launch_existing',{sessionId:ownSession.id})}>
         Get a fresh 60-second launch link
        </Button>
       </div>}
      </div>}
      {staff&&<div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
       {!selected.published&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void publish(selected)}>Publish syllabus</Button>}
       {centreManager&&selected.published&&managedProvider&&!selected.launch_enabled&&<Button size="sm" variant="outline" disabled={busy||!awsReady} onClick={()=>void activate(selected)}>Approve managed AWS launch</Button>}
       <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold" to="/lecturer/classroom"><Monitor className="size-4"/>Open live Teams class</Link>
      </div>}
     </section>}
     {selected&&<section className="rounded-xl border bg-card p-5">
      <h3 className="flex items-center gap-2 font-semibold"><Code2 className="size-5"/>Lab instructions and exercises</h3>
      {availableTasks.length===0&&<p className="mt-2 text-sm text-muted-foreground">Your lecturer has not yet published practical tasks for this lab.</p>}
      {staff&&<div className="mt-3 space-y-2 rounded-lg bg-secondary/30 p-3">
       <label className="block text-sm font-medium">New practical step<Input value={taskTitle} maxLength={150} onChange={e=>setTaskTitle(e.target.value)} placeholder="e.g. Configure a private VPC"/></label>
       <label className="block text-sm font-medium">Instructions<Textarea rows={2} value={taskInstructions} maxLength={3000} onChange={e=>setTaskInstructions(e.target.value)}/></label>
       <Button size="sm" disabled={busy||!taskTitle.trim()} onClick={()=>void addTask()}>Add course exercise</Button>
      </div>}
      <div className="mt-3 space-y-3">{availableTasks.map(t=>{
       const mark=sessionProgress.find(p=>p.task_id===t.id);
       return <article key={t.id} className="rounded-lg border p-3">
        <h4 className="font-semibold text-sm">{t.sequence_no}. {t.title}</h4>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.instructions||'See tutor instructions for this practical.'}</p>
        {!staff&&<div className="mt-3 space-y-2">
         <p className="text-xs">Progress: {mark?.status||'Not started'}. Student notes require human checking and never create final grades automatically.</p>
         {ownSession&&<><label className="block text-xs font-medium">Work completed / evidence reference<Textarea rows={2} value={taskNotes[`${ownSession.id}:${t.id}`]||''} maxLength={1200} onChange={e=>setTaskNotes(notes=>({...notes,[`${ownSession.id}:${t.id}`]:e.target.value}))} placeholder="Describe the steps and evidence for tutor review"/></label>
          <Button size="sm" variant="outline" disabled={busy||(taskNotes[`${ownSession.id}:${t.id}`]||'').trim().length<5} onClick={()=>void submitTask(t.id)}>Submit practical evidence note</Button></>}
        </div>}
       </article>;
      })}</div>
     </section>}
     {selected&&staff&&<section className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">Schedule a lecturer-led lab</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
       <label className="text-sm">Class/cohort reference<Input className="mt-1" value={runName} onChange={e=>setRunName(e.target.value)} placeholder="Computer Science / Week 2"/></label>
       <label className="text-sm">Start time<Input className="mt-1" type="datetime-local" value={runStart} onChange={e=>setRunStart(e.target.value)}/></label>
       <label className="text-sm">End time<Input className="mt-1" type="datetime-local" value={runEnd} onChange={e=>setRunEnd(e.target.value)}/></label>
      </div>
      <Button className="mt-3" disabled={busy||!selected.published||!runName||!runStart||!runEnd} onClick={()=>void createRun()}>Schedule lab practical</Button>
      <p className="mt-2 text-xs text-muted-foreground">This creates a timetable and quota, not paid AWS capacity. For 100+ learners, pre-size your AWS fleet and test connection throughput; pair the lab with a Teams lecture.</p>
      <div className="mt-3 space-y-2">{activeRuns.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
       <div><p className="text-sm font-semibold">{r.cohort_reference}</p><p className="text-xs text-muted-foreground">Seats: {r.max_concurrent} · invited: {invites.filter(i=>i.run_id===r.id&&i.status==='invited').length}</p></div>
       <Button size="sm" variant="outline" disabled={busy} onClick={()=>void inviteClass(r)}>Invite all enrolled learners</Button>
      </div>)}</div>
     </section>}
     {selected&&!staff&&ownSession&&<section className="rounded-xl border bg-card p-5">
      <h3 className="flex gap-2 font-semibold"><HelpCircle className="size-5"/>Ask your practical instructor for help</h3>
      <label className="mt-3 block text-sm font-medium">Describe the issue<Textarea rows={3} value={helpText} maxLength={800} onChange={e=>setHelpText(e.target.value)} placeholder="Which step failed? What error did you see?"/></label>
      <Button className="mt-3" disabled={busy||helpText.trim().length<3} onClick={()=>void askHelp()}>Send private help request</Button>
      {myHelp.map(h=><p key={h.id} className="mt-2 text-xs text-muted-foreground">Request {h.status}: {h.message}</p>)}
     </section>}
     {selected&&staff&&<section className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">Instructor monitoring and help requests</h3>
      <p className="mt-2 text-sm text-muted-foreground">Learner sessions visible here are restricted to modules assigned to you or centre management. Observe/control needs explicit consent and a separately verified provider capability.</p>
      {ownSessions.length===0&&<p className="mt-3 text-sm">No allocated student lab attempts yet.</p>}
      <div className="mt-3 space-y-2">{ownSessions.map(s=><div key={s.id} className="rounded-lg border p-3 text-xs">
       <p className="font-semibold">Learner {s.student_id.slice(0,8)} · {s.status} · {s.launch_mode} · {s.minutes_used} recorded minutes</p>
       {progress.filter(p=>p.session_id===s.id&&p.status==='pending_review').map(p=><div key={p.id} className="mt-2 rounded-md bg-secondary p-3">
        <p>Pending tutor evidence: {tasks.find(t=>t.id===p.task_id)?.title||'Task'}</p>
        <p className="mt-1 whitespace-pre-wrap">{String(p.verification_result?.student_note||'No note')}</p>
        <label className="mt-2 block">Review feedback<Input className="mt-1" maxLength={1200} value={reviewNotes[p.id]||''} onChange={e=>setReviewNotes(notes=>({...notes,[p.id]:e.target.value}))}/></label>
        <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={()=>void review(p,true)}>Verify completed</Button>
         <Button size="sm" variant="outline" disabled={busy} onClick={()=>void review(p,false)}>Request revision</Button></div>
       </div>)}
       {myHelp.filter(h=>h.session_id===s.id).map(h=><div key={h.id} className="mt-2 rounded-md border p-2">
        <p>Help {h.status}: {h.message}</p><div className="mt-2 flex gap-2">
        {h.status==='waiting'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void claimHelp(h.id,false)}>Claim help</Button>}
        {h.status==='claimed'&&h.claimed_by===user?.id&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void claimHelp(h.id,true)}>Mark resolved</Button>}
        </div></div>)}
      </div>)}</div>
     </section>}
    </div>
   </section>
  </div>}
  <footer className="mt-6 rounded-lg border p-4 text-xs text-muted-foreground">
   <p><strong>Security and cost:</strong> AWS labs are separate cloud resources, not automatically included in a Teams licence. Course approval, budget alerts/actions, per-user attempt limits, concurrency quotas, restricted AWS IAM permissions and fleet idle timeouts must be verified. AWS Academy Learner Lab access is provided by an authorised AWS Academy educator; it cannot be assumed from this LMS integration.</p>
  </footer>
  </div>
 </DashboardLayout>;
}
