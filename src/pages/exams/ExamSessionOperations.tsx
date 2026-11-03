import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {db} from '@/lib/db';
import {examEventChecks} from '@/lib/exams/examReadiness';
import type {ExamCalendarEvent} from '@/lib/exams/examReadiness';
import {
 EXAM_OPERATIONS_ENABLED,EXAM_WRITES_ENABLED,EXAM_APPROVALS_ENABLED,
 examOperationsScope,verifyExamPlans,verifyExamReceipt,validExamDraft,planMatchesCalendar,
 type ExamPlan,type ExamDraft,
} from '@/lib/exams/examOperations';

type PlanState={key:string;rows:ExamPlan[];loading:boolean;error:string};
export default function ExamSessionOperations(){
 const {user}=useAuth();
 return <ExamOperationsWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function ExamOperationsWorkspace(){
 const {user}=useAuth();
 const tenant=examOperationsScope(user);
 const enabled=EXAM_OPERATIONS_ENABLED&&!!tenant;
 const [revision,setRevision]=useState(0);
 const [selected,setSelected]=useState('');
 const [state,setState]=useState<PlanState>({key:'',rows:[],loading:false,error:''});
 const key=[user?.id,tenant,user?.role,user?.roles?.join(','),revision].join(':');
 const events=useSupabaseQuery('academic_events',{
  enabled,filters:[{column:'tenant_id',operator:'eq',value:tenant||''},{column:'event_type',operator:'eq',value:'exam'}],
  orderBy:{column:'start_date',ascending:true},
 });
 useEffect(()=>{
  let active=true;
  if(!enabled||!tenant){setState({key,rows:[],loading:false,error:''});return()=>{active=false;};}
  setState({key,rows:[],loading:true,error:''});
  void (async()=>{
   const rows:ExamPlan[]=[];
   for(let page=0;page<10;page++){
    const {data,error}=await db.rpc('get_unipathway_exam_session_plans',{p_tenant:tenant,p_offset:page*100,p_limit:100});
    if(!active)return;
    if(error)throw error;
    const batch=verifyExamPlans(data,tenant);
    rows.push(...batch);
    if(batch.length<100){
     if(new Set(rows.map(x=>x.event_id)).size!==rows.length)throw Error('Repeated exam-plan record');
     if(active)setState({key,rows,loading:false,error:''});
     return;
    }
   }
   throw Error('Exam plan snapshot exceeded the verified page limit');
  })().catch(()=>{if(active)setState({key,rows:[],loading:false,error:'The secure exam-plan service could not be verified. No partial plans are shown.'});});
  return()=>{active=false;};
 },[enabled,key,tenant]);
 const plans=state.key===key?state:{key,rows:[],loading:enabled,error:''};
 const validEvents=(enabled?events.data:[]).filter(event=>event.tenant_id===tenant&&event.event_type==='exam');
 const exam=validEvents.find(event=>event.id===selected)||null;
 const plan=exam?plans.rows.find(p=>p.event_id===exam.id)||null:null;
 const refresh=()=>{setRevision(n=>n+1);void events.refetch();};
 const officer=user?.role==='exams_officer';
 const director=user?.role==='centre_director';
 return <DashboardLayout title="Examination operations" subtitle="Internal candidate/room planning, invigilation readiness and independent approval">
  {!tenant?<p role="alert" className="rounded-xl border p-5">A verified active Exams Officer or Centre Director role with an assigned centre is required. No exam records have been requested.</p>:
  !enabled?<section role="status" className="rounded-xl border bg-card p-5 space-y-3">
   <h2 className="font-semibold">Exam operations backend not activated</h2>
   <p className="text-sm text-muted-foreground">The planning service remains disabled until the correct UniPathway database, two-centre RLS, invited exam staff and separate approval RPCs are verified. No candidates, exam plans or private records have been requested.</p>
   <p className="text-sm text-muted-foreground">The existing exam calendar is read-only. Live official exam entry, identity verification, seating allocations and awarding-body results are separate services.</p>
   <Link className="underline font-medium" to={director?'/director/schedule':'/exams/schedule'}>View recorded academic calendar</Link>
  </section>:<>
   <section className="mb-5 rounded-xl border bg-primary/5 p-5 space-y-2">
    <h2 className="font-semibold">Internal preparation, not official examination entry</h2>
    <p className="text-sm text-muted-foreground">Candidate figures are planning totals, not verified individual registrations. A checked process means the centre reviewed its procedure, not that every candidate passed a check. Only a different Centre Director can approve a submitted internal plan.</p>
    <Button variant="outline" size="sm" onClick={refresh} disabled={events.loading||plans.loading}>Refresh authorised records</Button>
   </section>
   {(events.loading||plans.loading)&&<p role="status">Verifying your centre's exam calendar and internal plans…</p>}
   {events.error||plans.error?<div role="alert" className="rounded-xl border p-5"><p>Exam records could not be completely verified; no partial plans or candidate counts are displayed.</p><Button className="mt-3" variant="outline" onClick={refresh}>Retry verification</Button></div>:
   !events.loading&&!plans.loading&&<>
    <div className="grid gap-4 lg:grid-cols-[minmax(15rem,0.95fr)_minmax(18rem,1.5fr)]">
     <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Centre exam sessions ({validEvents.length})</h2>
      <p className="mt-1 text-xs text-muted-foreground">Select an event to inspect its recorded internal readiness and approval status.</p>
      <div className="mt-4 space-y-2">
       {!validEvents.length&&<p>No recorded exam sessions are available for this centre.</p>}
       {validEvents.map(event=>{
        const current=plans.rows.find(p=>p.event_id===event.id);
        const mismatch=current&&!planMatchesCalendar(current,event);
        return <button type="button" key={event.id} onClick={()=>setSelected(event.id)}
         aria-pressed={selected===event.id} className={`w-full rounded-lg border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected===event.id?'border-primary bg-primary/5':'hover:bg-accent'}`}>
         <span className="block font-medium">{event.title}</span>
         <span className="mt-1 block text-xs text-muted-foreground">{new Date(event.start_date).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} · {event.location||'Venue missing'}</span>
         <span className="mt-1 block text-xs">{mismatch?'Calendar changed — review again':current?current.status.replaceAll('_',' '):'No internal plan recorded'}</span>
        </button>;
       })}
      </div>
     </section>
     <section className="rounded-xl border bg-card p-5">
      {!exam?<p className="text-sm text-muted-foreground">Choose a centre exam session to review room capacity, planning counts, invigilator coverage and approval.</p>:
       <div className="space-y-4">
        <div><h2 className="text-lg font-semibold">{exam.title}</h2><p className="text-sm text-muted-foreground">Venue: {exam.location||'Not assigned'} · Session reference {exam.id.slice(0,8)}</p></div>
        {examEventChecks(exam,validEvents).map(issue=><p key={issue} role="alert" className="text-sm text-destructive">Calendar requires review: {issue}</p>)}
        {plan&&!planMatchesCalendar(plan,exam)&&<p role="alert" className="rounded-lg border p-3 text-sm">This exam's recorded venue or time changed after the internal plan was saved. An Exams Officer must review and submit a new revision before approval.</p>}
        {plan&&<div className="grid grid-cols-2 gap-3 text-sm">
         <div className="rounded-lg border p-3"><p className="text-muted-foreground">Planned candidates</p><p className="font-semibold">{plan.planned_candidates}</p></div>
         <div className="rounded-lg border p-3"><p className="text-muted-foreground">Recorded room capacity</p><p className="font-semibold">{plan.room_capacity}</p></div>
         <div className="rounded-lg border p-3"><p className="text-muted-foreground">Planned invigilators</p><p className="font-semibold">{plan.planned_invigilators}</p></div>
         <div className="rounded-lg border p-3"><p className="text-muted-foreground">Internal status</p><p className="font-semibold capitalize">{plan.status.replaceAll('_',' ')} · v{plan.revision}</p></div>
        </div>}
        {officer&&EXAM_WRITES_ENABLED&&plan?.status!=='internally_approved'&&
         <PlanEditor key={`${tenant}:${exam.id}:${plan?.revision||0}`} tenant={tenant!} event={exam} plan={plan} refresh={refresh}/>}
        {officer&&!EXAM_WRITES_ENABLED&&<p role="status" className="rounded-lg border p-3 text-sm">Internal plan writes are not enabled; no submit action is available.</p>}
        {director&&plan?.status==='submitted'&&EXAM_APPROVALS_ENABLED&&
         <PlanApproval key={`${tenant}:${exam.id}:${plan.revision}`} tenant={tenant!} plan={plan} event={exam} refresh={refresh}/>}
        {director&&!EXAM_APPROVALS_ENABLED&&<p role="status" className="rounded-lg border p-3 text-sm">Director plan approval is disabled until the verified staging workflow is activated.</p>}
        {!plan&&director&&<p className="text-sm text-muted-foreground">No submitted internal plan for approval. Ask the Exams Officer to prepare this session.</p>}
       </div>}
     </section>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">Official awarding-body entries, candidate identity records, personal seat assignments, exam incidents and final results are not created by this internal planning workspace.</p>
   </>}
  </>}
 </DashboardLayout>;
}
function PlanEditor({tenant,event,plan,refresh}:{tenant:string;event:ExamCalendarEvent;plan:ExamPlan|null;refresh:()=>void}){
 const [form,setForm]=useState<ExamDraft>(()=>({
  capacity:plan?.room_capacity||20,candidates:plan?.planned_candidates||0,
  invigilators:plan?.planned_invigilators||0,
  seating:plan?.seating_process_checked||false,entries:plan?.entry_list_process_checked||false,
  identity:plan?.identity_process_checked||false,emergency:plan?.emergency_process_checked||false
 }));
 const [attempt,setAttempt]=useState<{id:string;submit:boolean;payload:ExamDraft}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const change=(patch:Partial<ExamDraft>)=>setForm(previous=>({...previous,...patch}));
 const blocked=busy||!!attempt;
 const run=async(submit:boolean)=>{
  if(busy||plan?.status==='internally_approved'||!planMatchesCalendar(plan||{
   tenant_id:tenant,event_id:event.id,event_start:event.start_date||'',
   event_end:event.end_date||'',event_location:event.location||''
  } as ExamPlan,event)||!validExamDraft(form,submit))return;
  const previous=plan?.revision||0;
  const request=attempt||{id:crypto.randomUUID(),submit,payload:{...form}};
  setAttempt(request);setBusy(true);setError('');setMessage('');
  try{
   const {data,error:reason}=await db.rpc('unipathway_save_exam_session_plan',{
    p_tenant:tenant,p_event:event.id,p_capacity:request.payload.capacity,
    p_candidates:request.payload.candidates,p_invigilators:request.payload.invigilators,
    p_seating:request.payload.seating,p_entries:request.payload.entries,
    p_identity:request.payload.identity,p_emergency:request.payload.emergency,
    p_submit:request.submit,p_expected_revision:previous,p_request_id:request.id
   });
   if(reason)throw reason;
   verifyExamReceipt(data,tenant,event.id,request.submit?'submitted':'draft',previous);
   setAttempt(null);setMessage('The database confirmed the current plan revision. Refreshing the authorised register.');refresh();
  }catch{
   setError('This action could not be confirmed. Recheck the register before initiating a new request. Retrying uses the same request identifier and frozen values.');
  }finally{setBusy(false);}
 };
 const checkboxes=[
  ['seating','Room and seating process reviewed (not individual seat assignments)'],
  ['entries','Entry list procedure reviewed (not verified candidate admissions)'],
  ['identity','In-person identity-check procedure reviewed'],
  ['emergency','Safety, access and emergency procedure reviewed']
 ] as const;
 const validCalendar=!!(event.location&&event.end_date&&Date.parse(event.end_date)>Date.parse(event.start_date||'')&&!event.all_day);
 return <section className="space-y-4 rounded-xl border bg-background p-4">
  <h3 className="font-semibold">Exams Officer — internal session preparation</h3>
  {!validCalendar&&<p role="alert">The calendar must have a valid dated session, venue and end time before an internal plan can be saved.</p>}
  <div className="grid gap-3 sm:grid-cols-3">
   {([
    ['capacity','Room seats recorded',1,2000],
    ['candidates','Candidates planned',0,2000],
    ['invigilators','Invigilators planned',0,100]
   ] as const).map(([field,label,min,max])=><label key={field} className="text-sm font-medium">{label}<Input type="number" min={min} max={max} value={form[field]} disabled={blocked} onChange={e=>change({[field]:Number(e.target.value)})} /></label>)}
  </div>
  <div className="space-y-3">{checkboxes.map(([field,label])=><label key={field} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form[field]} disabled={blocked} onChange={e=>change({[field]:e.target.checked})}/>{label}</label>)}</div>
  <p className="text-xs text-muted-foreground">Save draft for internal planning. Submission requires all procedures checked, positive candidate/room numbers and at least one planned invigilator. Centre Director approval is independent and does not certify an awarding-body exam.</p>
  <div className="flex flex-wrap gap-2">
   <Button disabled={busy||!validCalendar||(!attempt&&!validExamDraft(form,false))} onClick={()=>void run(attempt?.submit||false)}>{busy?'Sending…':attempt? 'Retry same request':'Save internal draft'}</Button>
   {!attempt&&<Button variant="outline" disabled={busy||!validCalendar||!validExamDraft(form,true)} onClick={()=>void run(true)}>Submit for Centre Director review</Button>}
  </div>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {message&&<p role="status" className="text-sm">{message}</p>}
  {attempt&&!busy&&<p className="text-xs text-muted-foreground">Before abandoning this attempt, confirm the centre register and use a fresh revision. This page will not silently repeat a failed write.</p>}
 </section>;
}
function PlanApproval({tenant,event,plan,refresh}:{tenant:string;event:ExamCalendarEvent;plan:ExamPlan;refresh:()=>void}){
 const [request,setRequest]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const eligible=plan.status==='submitted'&&planMatchesCalendar(plan,event);
 const approve=async()=>{
  if(!eligible||busy)return;
  if(!request&&!window.confirm('Approve only the INTERNAL examination preparation, not official entry, invigilator identity or awarding-body results?'))return;
  const id=request||crypto.randomUUID();setRequest(id);setBusy(true);setError('');setMessage('');
  try{
   const {data,error:reason}=await db.rpc('unipathway_approve_exam_session_plan',{
    p_tenant:tenant,p_event:event.id,p_expected_revision:plan.revision,p_request_id:id
   });
   if(reason)throw reason;
   verifyExamReceipt(data,tenant,event.id,'internally_approved',plan.revision);
   setRequest(null);setMessage('The centre database confirmed a separate director approval.');refresh();
  }catch{
   setError('Approval could not be verified. Confirm the latest revision and reviewer separation; retrying this request will keep the same identifier.');
  }finally{setBusy(false);}
 };
 return <section className="space-y-3 rounded-xl border bg-background p-4">
  <h3 className="font-semibold">Centre Director — separate internal approval</h3>
  <p className="text-sm text-muted-foreground">Approve only after checking capacity, candidate planning, invigilation and all four process attestations. The server prevents self-approval and stale revision approval.</p>
  {!eligible&&<p role="alert">The submitted exam plan no longer matches the current calendar.</p>}
  <Button disabled={!eligible||busy} onClick={()=>void approve()}>{busy?'Verifying…':request?'Retry same approval':'Approve internal plan'}</Button>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {message&&<p role="status" className="text-sm">{message}</p>}
 </section>;
}
