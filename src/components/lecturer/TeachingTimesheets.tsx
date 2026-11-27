import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {calendarDay,calendarDayLabel} from '@/lib/academicCalendar';
import {displayTeachingMinutes} from '@/lib/teachingLoad';
import {readTeachingSlots,readTeachingClaims,readClaimReceipt,teachingClaimTotals,approvedLecturerTotals,filterTeachingClaims,type TeachingSlot,type TeachingClaim,type TimesheetRole} from '@/lib/teachingTimesheets';

const enabled=import.meta.env.VITE_UNIPATHWAY_TEACHING_TIMESHEETS_ENABLED==='true';
const input='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
const labels={submitted:'Awaiting review',approved:'Approved teaching time',rejected:'Not approved'} as const;
const roleAllowed=(r:string):r is TimesheetRole=>['lecturer','centre_director','finance_officer'].includes(r);
export default function TeachingTimesheets(){
 const {user,loading}=useAuth();
 if(loading||!user?.id||!user.tenantId||!roleAllowed(user.role)||!user.roles?.includes(user.role))return null;
 return <Workspace key={[user.id,user.tenantId,user.role,user.roles.join(',')].join(':')} uid={user.id} tenant={user.tenantId} role={user.role}/>;
}
function Workspace({uid,tenant,role}:{uid:string;tenant:string;role:TimesheetRole}){
 const today=calendarDay();
 const [open,setOpen]=useState(false),[date,setDate]=useState(today),[month,setMonth]=useState(today.slice(0,7));
 const [slots,setSlots]=useState<TeachingSlot[]|null>(null),[selected,setSelected]=useState(''),[minutes,setMinutes]=useState(''),[evidence,setEvidence]=useState('');
 const [rows,setRows]=useState<TeachingClaim[]|null>(null),[page,setPage]=useState(0),[filter,setFilter]=useState<'all'|'submitted'|'approved'|'rejected'>('all');
 const [search,setSearch]=useState('');
 const [reviewId,setReviewId]=useState(''),[reviewNote,setReviewNote]=useState(''),[decision,setDecision]=useState<'approved'|'rejected'>('approved');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef(true),lock=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const chosen=slots?.find(s=>s.schedule_id===selected);
 const selectedReview=rows?.find(r=>r.id===reviewId);
 const validMinutes=/^\d{1,4}$/.test(minutes)&&Number(minutes)>0&&!!chosen&&Number(minutes)<=chosen.planned_minutes;
 async function perform(action:()=>Promise<void>,fallback:string){
  if(!enabled||lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch{if(active.current)setError(fallback);}
  finally{lock.current=false;if(active.current)setBusy(false);}
 }
 async function loadSlots(){if(!enabled||lock.current||!date||date>today)return;setSlots(null);setSelected('');setMinutes('');setEvidence('');await perform(async()=>{
  const r=await db.rpc('get_unipathway_teaching_slots',{p_date:date});
  if(r.error)throw Error();const verified=readTeachingSlots(r.data,tenant,date);
  if(active.current)setSlots(verified);
 },'Teaching slots could not be verified. Check service activation and your timetable.');}
 async function loadMonth(){if(!enabled||lock.current||!month||month>today.slice(0,7))return;setRows(null);setPage(0);setReviewId('');setReviewNote('');await perform(async()=>{
  const r=await db.rpc('get_unipathway_teaching_timesheets',{p_month:month+'-01',p_role:role});
  if(r.error)throw Error();const verified=readTeachingClaims(r.data,tenant,role,month,uid);
  if(active.current)setRows(verified);
 },'Monthly timesheets could not be verified. No totals are available. Retry or ask your centre to confirm activation.');}
 async function submit(){
  if(role!=='lecturer'||!chosen||!validMinutes||evidence.trim().length<5)return;
  await perform(async()=>{
   const r=await db.rpc('submit_unipathway_teaching_timesheet',{p_schedule:chosen.schedule_id,p_date:date,p_minutes:Number(minutes),p_evidence:evidence.trim(),p_expected_updated_at:chosen.updated_at});
   if(r.error)throw Error();const receipt=readClaimReceipt(r.data,{tenant,lecturer:uid,schedule:chosen.schedule_id,date,minutes:Number(minutes)});
   if(active.current){setSlots(null);setRows(null);setSelected('');setMinutes('');setEvidence('');setNotice('Recorded claim: '+labels[receipt.status]+'. Load the teaching month to review your receipt.');}
  },'Submission was not confirmed. Your entries are retained. Retry the same claim or load the month before making a different submission.');
 }
 async function review(){
  if(role!=='centre_director'||!selectedReview||selectedReview.status!=='submitted'||selectedReview.lecturer_id===uid||reviewNote.trim().length<5)return;
  await perform(async()=>{
   const r=await db.rpc('review_unipathway_teaching_timesheet',{p_claim:selectedReview.id,p_revision:selectedReview.revision,p_decision:decision,p_note:reviewNote.trim()});
   if(r.error)throw Error();readClaimReceipt(r.data,{tenant,lecturer:selectedReview.lecturer_id,schedule:selectedReview.schedule_id,date:selectedReview.teaching_date,minutes:selectedReview.actual_minutes,id:selectedReview.id,decision});
   if(active.current){setRows(null);setReviewId('');setReviewNote('');setNotice('Independent teaching review recorded. Load the month again to see the confirmed records.');}
  },'The review was not confirmed. Your decision and note are retained; retry the same review or reload the month to reconcile.');
 }
 const totals=rows?teachingClaimTotals(rows):null,financeRows=rows&&role==='finance_officer'?approvedLecturerTotals(rows):[];
 const filtered=filterTeachingClaims(rows||[],filter,search),pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages-1);
 return <section aria-label="Teaching timesheets" className="my-5 min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">Teaching timesheets</h2><p className="mt-1 text-sm text-muted-foreground">{role==='lecturer'?'Submit actual teaching minutes for completed timetable sessions.':role==='centre_director'?'Review dated teaching claims independently.':'Review approved teaching time for remuneration preparation.'}</p></div><Button type="button" variant="outline" disabled={busy} aria-expanded={open} className="min-h-11" onClick={()=>setOpen(v=>!v)}>{open?'Hide timesheets':'Open timesheets'}</Button></div>
  {open&&(!enabled?<p role="status" className="text-sm">Teaching timesheets require centre activation. No claims, approvals or payroll records have been created by this screen.</p>:<>
   <p className="text-sm text-muted-foreground">Pakistan local dates and times. Claimed and approved teaching are separate from attendance, contract rates and payment. Overtime, cancelled or reassigned classes and corrections to rejected claims require separate centre handling.</p>
   {role==='lecturer'&&<section aria-label="Submit completed teaching" className="min-w-0 space-y-3 rounded-lg border p-3">
    <h3 className="font-semibold">Submit completed teaching</h3>
    <div className="grid gap-3 sm:grid-cols-2 sm:items-end"><label className="block min-w-0 text-sm font-medium">Teaching date (PKT)<input className={input} type="date" min="2000-01-01" max={today} value={date} disabled={busy} onChange={e=>{setDate(e.target.value);setSlots(null);setSelected('');setMinutes('');setEvidence('');setNotice('');setError('');}}/></label><Button type="button" variant="outline" disabled={busy||!date||date>today} onClick={()=>void loadSlots()}>Find completed sessions</Button></div>
    {slots&&(!slots.length?<p className="text-sm text-muted-foreground">No unclaimed, completed sessions match this date and your current timetable. Check your monthly claims or contact your centre.</p>:<>
     <label className="block min-w-0 text-sm font-medium">Scheduled session<select className={input} disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setMinutes('');setEvidence('');}}><option value="">Choose session</option>{slots.map(s=><option key={s.schedule_id} value={s.schedule_id}>{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)} · {s.module_title}</option>)}</select></label>
     {chosen&&<><p className="text-sm text-muted-foreground">Scheduled: {displayTeachingMinutes(chosen.planned_minutes)}. Enter only minutes actually delivered, up to this session's duration.</p><div className="grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-medium">Actual teaching minutes<input className={input} inputMode="numeric" maxLength={4} value={minutes} disabled={busy} onChange={e=>setMinutes(e.target.value)}/></label><label className="block min-w-0 text-sm font-medium">Evidence reference<input className={input} maxLength={500} value={evidence} disabled={busy} placeholder="Centre teaching record reference" onChange={e=>setEvidence(e.target.value)}/></label></div><p className="text-xs text-muted-foreground">Use an authorised teaching record reference. Do not include student names, sensitive data or private document links.</p><Button type="button" disabled={busy||!validMinutes||evidence.trim().length<5} onClick={()=>void submit()}>Submit teaching claim</Button></>}
    </>)}
   </section>}
   <section aria-label="Monthly teaching claims" className="space-y-3 rounded-lg border p-3">
    <h3 className="font-semibold">Monthly teaching records</h3><div className="grid gap-3 sm:grid-cols-2 sm:items-end"><label className="block min-w-0 text-sm font-medium">Teaching month (PKT)<input type="month" min="2000-01" max={today.slice(0,7)} className={input} value={month} disabled={busy} onChange={e=>{setMonth(e.target.value);setRows(null);setReviewId('');setReviewNote('');setPage(0);setFilter('all');setSearch('');setNotice('');setError('');}}/></label><Button type="button" variant="outline" disabled={busy||!month||month>today.slice(0,7)} onClick={()=>void loadMonth()}>Load teaching month</Button></div>
    {rows&&totals&&<>
     <dl className="grid gap-2 sm:grid-cols-3">{(role==='finance_officer'?['approved'] as const:['submitted','approved','rejected'] as const).map(status=><div className="min-w-0 rounded-lg border p-3" key={status}><dt className="text-sm text-muted-foreground">{labels[status]}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{displayTeachingMinutes(totals[status].minutes)}</dd><dd className="text-xs text-muted-foreground">{totals[status].sessions} sessions</dd></div>)}</dl>
     {role==='finance_officer'&&financeRows.length>0&&<div className="space-y-2"><h4 className="font-medium text-sm">Approved time by lecturer</h4>{financeRows.map(r=><div className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm" key={r.id}><span className="min-w-0 [overflow-wrap:anywhere]">{r.name}</span><span className="tabular-nums">{displayTeachingMinutes(r.minutes)} · {r.sessions} sessions</span></div>)}</div>}
     {role!=='finance_officer'&&<label className="block max-w-xs text-sm font-medium">Claim status<select className={input} value={filter} disabled={busy} onChange={e=>{setFilter(e.target.value as typeof filter);setPage(0);setReviewId('');setReviewNote('');}}><option value="all">All claims</option><option value="submitted">Awaiting review</option><option value="approved">Approved</option><option value="rejected">Not approved</option></select></label>}
     <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-[1_1_14rem] text-sm font-medium">Search teaching claims<input type="search" className={input} maxLength={120} value={search} disabled={busy} onChange={e=>{setSearch(e.target.value);setPage(0);setReviewId('');setReviewNote('');}} placeholder="Module, lecturer, date or claim reference"/></label>{(search||filter!=='all')&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{setSearch('');setFilter('all');setPage(0);setReviewId('');setReviewNote('');}}>Clear claim filters</Button>}</div>
     <p className="text-xs text-muted-foreground">Search and status filters apply to the claim list only. Totals above cover the verified teaching month.</p>
     <p role="status" aria-label="Teaching claim results" className="text-sm text-muted-foreground">{filtered.length} of {rows.length} verified claim records match</p>
     {!filtered.length?<p className="text-sm">No matching claims in this month.</p>:<ul className="grid gap-2 xl:grid-cols-2">{filtered.slice(current*10,current*10+10).map(r=><li key={r.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><h4 className="font-semibold">{r.module_title}</h4><p className="text-xs text-muted-foreground">{calendarDayLabel(r.teaching_date)} · {r.scheduled_start.slice(0,5)}–{r.scheduled_end.slice(0,5)} PKT</p>{role!=='lecturer'&&<p>{r.lecturer_name}</p>}<p>{labels[r.status]} · {displayTeachingMinutes(r.actual_minutes)} claimed / {displayTeachingMinutes(r.planned_minutes)} scheduled</p>{r.evidence_reference&&<p className="text-xs">Evidence reference: {r.evidence_reference}</p>}{r.review_note&&<p className="text-xs">Review note: {r.review_note}</p>}{role==='centre_director'&&r.status==='submitted'&&r.lecturer_id!==uid&&<Button type="button" variant="outline" disabled={busy} aria-expanded={reviewId===r.id} onClick={()=>{setReviewId(v=>v===r.id?'':r.id);setReviewNote('');setDecision('approved');}}>Review claim<span className="sr-only"> {r.module_title} {r.teaching_date}</span></Button>}{reviewId===r.id&&role==='centre_director'&&<div className="space-y-3 border-t pt-3"><label className="block text-sm">Decision<select className={input} disabled={busy} value={decision} onChange={e=>setDecision(e.target.value as typeof decision)}><option value="approved">Approve recorded minutes</option><option value="rejected">Do not approve</option></select></label><label className="block text-sm">Independent evidence review note<textarea className={input} disabled={busy} rows={3} maxLength={500} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><p className="text-xs text-muted-foreground">Confirm the evidence before recording a final review. This does not authorise payment.</p><Button type="button" disabled={busy||reviewNote.trim().length<5} onClick={()=>void review()}>Record teaching review</Button></div>}</li>)}</ul>}
     {pages>1&&<nav aria-label="Teaching claim pages" className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy||current===0} onClick={()=>{setPage(current-1);setReviewId('');}}>Previous claims</Button><span className="text-sm">Page {current+1} of {pages}</span><Button type="button" variant="outline" disabled={busy||current+1>=pages} onClick={()=>{setPage(current+1);setReviewId('');}}>Next claims</Button></nav>}
    </>}
   </section>
   {busy&&<p role="status">Confirming teaching records…</p>}{error&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
  </>)}
 </section>;
}
