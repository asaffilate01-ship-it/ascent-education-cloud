import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {db} from '@/lib/db';
import {examOperationsScope,planMatchesCalendar,verifyExamPlans,type ExamPlan} from '@/lib/exams/examOperations';
import {EXAM_ROSTER_ENABLED,EXAM_ROSTER_WRITES_ENABLED,
 verifyExamRoster,verifyRosterReceipt,rosterCanSubmit,validSeatCode,validStudentId,normaliseSeat,
 type ExamRoster,type RosterAction} from '@/lib/exams/examRoster';

type Snapshot<T>={key:string;data:T;loading:boolean;error:string};
const unloaded=<T,>(key:string,data:T):Snapshot<T>=>({key,data,loading:false,error:''});
export default function ExamCandidateRoster(){
 const {user}=useAuth();
 return <RosterWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(',')].join(':')}/>;
}
function RosterWorkspace(){
 const {user}=useAuth();
 const tenant=examOperationsScope(user);
 const enabled=EXAM_ROSTER_ENABLED&&!!tenant;
 const director=user?.role==='centre_director';
 const [selected,setSelected]=useState('');
 const [refreshKey,setRefreshKey]=useState(0);
 const [plansState,setPlansState]=useState<Snapshot<ExamPlan[]>>(()=>unloaded('',[]));
 const [rosterState,setRosterState]=useState<Snapshot<ExamRoster|null>>(()=>unloaded('',null));
 const planKey=[user?.id,tenant,user?.role,user?.roles?.join(','),refreshKey].join(':');
 const events=useSupabaseQuery('academic_events',{
  enabled,select:'id,title,tenant_id,event_type,start_date,end_date,location,all_day',
  filters:[{column:'tenant_id',operator:'eq',value:tenant||''},{column:'event_type',operator:'eq',value:'exam'}],
  orderBy:{column:'start_date',ascending:true},
 });
 const programmes=useSupabaseQuery('programmes',{
  enabled:enabled&&director,select:'id,title,tenant_id,status',
  filters:[{column:'tenant_id',operator:'eq',value:tenant||''},{column:'status',operator:'eq',value:'active'}],
  orderBy:{column:'title',ascending:true},
 });
 const refresh=()=>{setRefreshKey(n=>n+1);void events.refetch();if(director)void programmes.refetch();};
 useEffect(()=>{
  let active=true;
  if(!enabled||!tenant){setPlansState(unloaded(planKey,[]));return()=>{active=false;};}
  setPlansState({key:planKey,data:[],loading:true,error:''});
  void (async()=>{
   const rows:ExamPlan[]=[];
   for(let page=0;page<10;page++){
    const {data,error}=await db.rpc('get_unipathway_exam_session_plans',{
     p_tenant:tenant,p_offset:page*100,p_limit:100
    });
    if(!active)return;
    if(error)throw error;
    const batch=verifyExamPlans(data,tenant);
    rows.push(...batch);
    if(batch.length<100){
     if(new Set(rows.map(p=>p.event_id)).size!==rows.length)throw Error('Repeated exam plans');
     if(active)setPlansState({key:planKey,data:rows.filter(p=>p.status==='internally_approved'),loading:false,error:''});
     return;
    }
   }
   throw Error('Exam plan snapshot too large for a verified complete read');
  })().catch(()=>{if(active)setPlansState({key:planKey,data:[],loading:false,error:'Approved plans could not be completely verified.'});});
  return()=>{active=false;};
 },[enabled,tenant,planKey]);
 const plans=plansState.key===planKey?plansState:{key:planKey,data:[],loading:enabled,error:''};
 const selectedPlan=plans.data.find(p=>p.event_id===selected)||null;
 const event=events.data.find(e=>e.id===selected&&e.tenant_id===tenant&&e.event_type==='exam')||null;
 const matched=!!selectedPlan&&!!event&&planMatchesCalendar(selectedPlan,event);
 const rosterKey=[planKey,selected,matched].join(':');
 useEffect(()=>{
  let active=true;
  if(!enabled||!tenant||!matched||!selectedPlan){setRosterState(unloaded(rosterKey,null));return()=>{active=false;};}
  setRosterState({key:rosterKey,data:null,loading:true,error:''});
  void (async()=>{
   const {data,error}=await db.rpc('get_unipathway_exam_roster',{p_tenant:tenant,p_event:selected});
   if(!active)return;
   if(error)throw error;
   const roster=verifyExamRoster(data,tenant,selected,selectedPlan);
   if(active)setRosterState({key:rosterKey,data:roster,loading:false,error:''});
  })().catch(()=>{if(active)setRosterState({key:rosterKey,data:null,loading:false,error:'Roster access or private record completeness could not be verified.'});});
  return()=>{active=false;};
 },[enabled,tenant,selected,matched,selectedPlan?.revision,rosterKey]);
 const roster=rosterState.key===rosterKey?rosterState:{key:rosterKey,data:null,loading:enabled&&matched,error:''};
 const shown=events.data.filter(e=>e.tenant_id===tenant&&e.event_type==='exam'&&plans.data.some(p=>p.event_id===e.id));
 const problems=plans.error||events.error||(director&&programmes.error);
 return <DashboardLayout title="Exam candidates & provisional seating" subtitle="Programme-linked enrolment checks and independently reviewed internal seat assignments">
  {!tenant?<p role="alert" className="rounded-xl border p-5">A verified active Exams Officer or Centre Director membership at this centre is required.</p>:
  !enabled?<section role="status" className="rounded-xl border bg-card p-5 space-y-3">
   <h2 className="font-semibold">Candidate roster activation is disabled</h2>
   <p className="text-sm text-muted-foreground">This sensitive service remains off until the correct UniPathway staging project, F1/F2 database gates, student consent process, active enrolment records and signed-in two-centre security tests are verified. No learner records or provisional seats have been requested.</p>
   <p className="text-sm text-muted-foreground">Official awarding-body entry, invigilator appointment, identity checks and final exam results remain separate from internal seat planning.</p>
   <Link className="font-semibold underline" to={director?'/director/exam-plans':'/exams/session-plans'}>View approved internal session plans</Link>
  </section>:<>
   <section className="mb-5 rounded-xl border bg-primary/5 p-5">
    <h2 className="font-semibold">Internal preparation only</h2>
    <p className="mt-2 text-sm text-muted-foreground">Only approved internal exam sessions can be linked to active centre programmes. Each provisional seat is validated against that programme's current enrolments. An attestation is not proof of official board registration or a completed individual identity check.</p>
    <Button className="mt-3" variant="outline" size="sm" onClick={refresh} disabled={plans.loading||events.loading}>Refresh authorised register</Button>
   </section>
   {(plans.loading||events.loading||(director&&programmes.loading))&&<p role="status">Verifying centre exam sessions…</p>}
   {problems?<div role="alert" className="rounded-xl border p-5">Exam session records could not be fully verified. No provisional seat data is displayed.<Button className="mt-3" variant="outline" onClick={refresh}>Retry</Button></div>:
   !plans.loading&&!events.loading&&!(director&&programmes.loading)&&
   <div className="grid gap-4 lg:grid-cols-[minmax(14rem,.9fr)_minmax(20rem,1.6fr)]">
    <section className="rounded-xl border bg-card p-5 space-y-3">
     <h2 className="font-semibold">Approved internal sessions ({shown.length})</h2>
     {!shown.length&&<p className="text-sm text-muted-foreground">No approved internal exam plans are currently recorded. An Exams Officer and Centre Director must complete the earlier approval workflow first.</p>}
     {shown.map(e=>{
      const p=plans.data.find(x=>x.event_id===e.id)!;
      const current=planMatchesCalendar(p,e);
      return <button key={e.id} type="button" onClick={()=>setSelected(e.id)} aria-pressed={selected===e.id}
       className={`w-full rounded-xl border p-3 text-left hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected===e.id?'border-primary bg-primary/5':''}`}>
       <span className="block font-medium">{e.title}</span>
       <span className="mt-1 block text-xs text-muted-foreground">{e.location||'Venue missing'} · {new Date(e.start_date).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})}</span>
       <span className="mt-1 block text-xs">{current?`Maximum ${p.planned_candidates} provisional seats`:'Calendar changed — review required'}</span>
      </button>;
     })}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-4">
     {!selectedPlan||!event?<p className="text-sm text-muted-foreground">Select an internally approved exam session to review or prepare its programme-linked provisional seats.</p>:
      !matched?<p role="alert">The exam calendar no longer matches the independently approved session. Return to the Exams Officer planning workflow before making seat assignments.</p>:
      roster.loading?<p role="status">Checking the restricted provisional seat register…</p>:
      roster.error?<div role="alert">{roster.error}<Button className="mt-3" variant="outline" onClick={refresh}>Retry roster</Button></div>:
      roster.data&&<>
       <header className="space-y-1">
        <h2 className="text-lg font-semibold">{event.title}</h2>
        <p className="text-sm text-muted-foreground">{event.location} · Approved internal plan v{selectedPlan.revision}</p>
        <p className="text-sm font-medium">Roster: {roster.data.status.replace(/_/g,' ')} · Revision {roster.data.revision}</p>
       </header>
       <div className="grid grid-cols-3 gap-2 text-center">
        {[
         ['Seats assigned',roster.data.seats.length],
         ['Planned candidates',roster.data.planned_candidates],
         ['Room capacity',roster.data.room_capacity],
        ].map(([label,value])=><article key={label} className="rounded-xl border p-3">
         <p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p>
        </article>)}
       </div>
       <div className="rounded-lg border bg-background p-4">
        <h3 className="font-semibold">Programme assignment</h3>
        <p className="mt-1 text-sm text-muted-foreground">{roster.data.programme_id
         ?programmes.data.find(p=>p.id===roster.data?.programme_id)?.title||`Centre programme ref: ${roster.data.programme_id.slice(0,8)}`
         :'Centre Director must bind an active programme before candidate allocation.'}</p>
       </div>
       <section aria-label="Provisional seat references" className="space-y-3">
        <h3 className="font-semibold">Recorded provisional seats</h3>
        {!roster.data.seats.length&&<p className="text-sm text-muted-foreground">No students are assigned yet.</p>}
        <div className="grid gap-2 sm:grid-cols-2">{roster.data.seats.map(s=><article key={s.seat_label} className="rounded-lg border bg-background p-3">
         <p className="font-semibold">Seat {s.seat_label}</p><p className="text-sm text-muted-foreground">Masked learner {s.student_ref}</p>
         {user?.role==='exams_officer'&&EXAM_ROSTER_WRITES_ENABLED&&roster.data?.status==='draft'&&
          <RosterSeatRemoval key={s.seat_label+':'+roster.data.revision} tenant={tenant!} event={event.id} row={roster.data} seat={s.seat_label} refresh={refresh}/>}
        </article>)}</div>
        <p className="text-xs text-muted-foreground">Codes are placeholders, not a surveyed room floor plan or a released candidate seating list. Full learner identities and contact details are intentionally excluded from this view.</p>
       </section>
       {EXAM_ROSTER_WRITES_ENABLED?
        <RosterActions key={[event.id,roster.data.revision,user?.role].join(':')}
         tenant={tenant!} event={event.id} roster={roster.data} director={director}
         programmes={programmes.data.filter(p=>p.tenant_id===tenant&&p.status==='active').map(p=>({id:p.id,title:p.title}))}
         refresh={refresh}/>:
        <p role="status" className="rounded-lg border p-4 text-sm">Roster writes and approvals are not enabled. This is a restricted read-only view.</p>}
      </>}
    </section>
   </div>}
  </>}
 </DashboardLayout>;
}

type Pending={
 action:RosterAction;programme:string|null;student:string|null;seat:string|null;
 attested:boolean|null;revision:number;requestId:string;
};
function useRosterAction(tenant:string,event:string,revision:number,refresh:()=>void){
 const [pending,setPending]=useState<Pending|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const send=async(action:RosterAction,values?:Partial<Pick<Pending,'programme'|'student'|'seat'|'attested'>>)=>{
  if(busy||pending&&pending.action!==action)return;
  const req:Pending=pending||{
   action,programme:values?.programme||null,student:values?.student||null,
   seat:values?.seat||null,attested:values?.attested??null,
   revision,requestId:crypto.randomUUID()
  };
  setPending(req);setBusy(true);setError('');
  try{
   const {data,error:rpcError}=await db.rpc('mutate_unipathway_exam_roster',{
    p_tenant:tenant,p_event:event,p_action:req.action,p_programme:req.programme,
    p_student:req.student,p_seat:req.seat,p_attested:req.attested,
    p_expected_revision:req.revision,p_request_id:req.requestId
   });
   if(rpcError)throw rpcError;
   verifyRosterReceipt(data,tenant,event,req.action,req.revision);
   setPending(null);refresh();
  }catch{
   setError('The request outcome is unconfirmed. Reconcile the register before a new action. Retry preserves the same request ID and exact values.');
  }finally{setBusy(false);}
 };
 return {pending,busy,error,send};
}
function RosterSeatRemoval({tenant,event,row,seat,refresh}:{tenant:string;event:string;row:ExamRoster;seat:string;refresh:()=>void}){
 const a=useRosterAction(tenant,event,row.revision,refresh);
 return <div className="mt-2 space-y-2">
  <Button size="sm" variant="outline" disabled={a.busy} onClick={()=>{
   if(a.pending||window.confirm(`Remove provisional seat ${seat}? The student's enrolment will not be changed.`))
    void a.send('remove',{seat});
  }}>{a.busy?'Checking…':a.pending?'Retry same removal':'Remove seat'}</Button>
  {a.error&&<p role="alert" className="text-xs text-destructive">{a.error}</p>}
 </div>;
}
function RosterActions({tenant,event,roster,director,programmes,refresh}:{
 tenant:string;event:string;roster:ExamRoster;director:boolean;
 programmes:Array<{id:string;title:string}>;refresh:()=>void;
}){
 const [programme,setProgramme]=useState(roster.programme_id||'');
 const [student,setStudent]=useState('');
 const [seat,setSeat]=useState('');
 const [attested,setAttested]=useState(false);
 const a=useRosterAction(tenant,event,roster.revision,refresh);
 const canBind=director&&(roster.status==='unconfigured'||roster.status==='draft'&&!roster.seats.length);
 const canAssign=!director&&roster.status==='draft'&&roster.programme_id!==null;
 const canSubmit=!director&&rosterCanSubmit(roster);
 const canApprove=director&&roster.status==='submitted';
 const canWrite=!a.busy&&!a.pending;
 return <section className="space-y-4 rounded-xl border bg-background p-4">
  <h3 className="font-semibold">{director?'Centre Director — programme and final internal review':'Exams Officer — provisional eligibility and seating'}</h3>
  {canBind&&<div className="space-y-3">
   <label className="block text-sm font-medium">Programme for this exam
    <select className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={programme} disabled={!canWrite} onChange={e=>setProgramme(e.target.value)}>
     <option value="">Select a centre programme</option>
     {programmes.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
   </label>
   <Button variant="outline" disabled={!canWrite||!programme||programme===roster.programme_id}
    onClick={()=>void a.send('bind',{programme})}>Bind programme to approved exam plan</Button>
  </div>}
  {canAssign&&<div className="space-y-3">
   <label className="block text-sm font-medium">Institutional learner ID (UUID)
    <Input value={student} onChange={e=>setStudent(e.target.value.trim())} disabled={!canWrite} placeholder="From the authorised admissions/enrolment desk" maxLength={36} autoComplete="off"/>
   </label>
   <label className="block text-sm font-medium">Provisional seat code (e.g. A1, B12)
    <Input value={seat} onChange={e=>setSeat(e.target.value)} disabled={!canWrite} maxLength={5} placeholder="A1"/>
   </label>
   <label className="flex items-start gap-3 text-sm">
    <input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)} disabled={!canWrite}/>
    <span>I reviewed the approved participation/consent procedure for this learner. This is a staff process attestation, not a substitute for a signed consent record or official awarding-body entry.</span>
   </label>
   <Button disabled={!canWrite||!validStudentId(student)||!validSeatCode(seat)||!attested}
    onClick={()=>void a.send('assign',{student:student.trim(),seat:normaliseSeat(seat),attested:true})}>Assign provisional seat</Button>
  </div>}
  {canSubmit&&<div className="space-y-2">
   <p className="text-sm text-muted-foreground">The provisional seat count equals the approved internal planning total. Submission rechecks every learner's active programme enrolment.</p>
   <Button variant="outline" disabled={!canWrite} onClick={()=>{
    if(window.confirm('Submit this INTERNAL roster for separate Centre Director review? No official examination registration is being made.'))void a.send('submit');
   }}>Submit internal roster for approval</Button>
  </div>}
  {canApprove&&<div className="space-y-2">
   <p className="text-sm text-muted-foreground">Review the planned count, programme link and process attestations. The database blocks self-approval, stale revisions and any withdrawn enrolment.</p>
   <Button disabled={!canWrite} onClick={()=>{
    if(window.confirm('Approve provisional internal seat planning only, not official exam entry or final invigilator appointment?'))void a.send('approve');
   }}>Approve internal roster</Button>
  </div>}
  {roster.status==='internally_approved'&&<p role="status" className="text-sm">The internal roster is frozen. Official candidate entry, invigilator sign-off and release of individual seating instructions require separate authorised workflows.</p>}
  {roster.status==='submitted'&&!director&&<p role="status" className="text-sm">Submitted for an independent Centre Director review. Editing is locked.</p>}
  {a.pending&&!a.busy&&<Button variant="outline" onClick={()=>void a.send(a.pending!.action)}>Retry identical pending request</Button>}
  {a.error&&<p role="alert" className="rounded-lg border p-3 text-sm text-destructive">{a.error}</p>}
 </section>;
}
