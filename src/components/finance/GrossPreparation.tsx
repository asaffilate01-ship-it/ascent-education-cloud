import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {calendarDay} from '@/lib/academicCalendar';
import {formatPkrPaisa} from '@/lib/teachingRemuneration';
import {displayTeachingMinutes} from '@/lib/teachingLoad';
import {rateDate,type RateRole} from '@/lib/teachingRateRegister';
import {lastCompletedMonth,readGrossMonth,readGrossBatch,type GrossMonth} from '@/lib/grossPreparation';
const enabled=import.meta.env.VITE_UNIPATHWAY_GROSS_PREPARATION_ENABLED==='true';
const input='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
export default function GrossPreparation(){
 const {user,loading}=useAuth();
 if(loading||!user?.id||!user.tenantId||!user.roles?.includes(user.role)||(user.role!=='centre_director'&&user.role!=='finance_officer'))return null;
 return <Workspace key={[user.id,user.tenantId,user.role,user.roles.join(',')].join(':')} uid={user.id} tenant={user.tenantId} role={user.role}/>;
}
function Workspace({uid,tenant,role}:{uid:string;tenant:string;role:RateRole}){
 const maxMonth=lastCompletedMonth(calendarDay());
 const [open,setOpen]=useState(false),[month,setMonth]=useState(maxMonth),[data,setData]=useState<GrossMonth|null>(null),[page,setPage]=useState(0);
 const [decision,setDecision]=useState<'reviewed'|'rejected'>('reviewed'),[reviewNote,setReviewNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef(true),lock=useRef(false),request=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const monthValid=rateDate(month+'-01')&&month<=maxMonth;
 async function run(action:()=>Promise<void>,failure:string){
  if(!enabled||lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch{if(active.current)setError(failure);}finally{lock.current=false;if(active.current)setBusy(false);}
 }
 async function load(){if(!monthValid)return;setData(null);setPage(0);await run(async()=>{
  const r=await db.rpc('get_unipathway_gross_preparation',{p_month:month+'-01',p_role:role});if(r.error)throw Error();
  const next=readGrossMonth(r.data,tenant,role,month,uid);
  if(active.current){setData(next);setDecision(next.batch_current===false?'rejected':'reviewed');setReviewNote('');}
 },'The completed month could not be verified. No totals or review actions are available. Check service activation and retry.');}
 async function prepare(){if(role!=='finance_officer'||!data?.ready||data.contains_own||data.batch)return;
  await run(async()=>{
   const key=month+':'+data.fingerprint;if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
   const expected={id:request.current.id,fingerprint:data.fingerprint};
   const r=await db.rpc('prepare_unipathway_gross_batch',{p_id:expected.id,p_month:month+'-01',p_fingerprint:expected.fingerprint});if(r.error)throw Error();
   const receipt=readGrossBatch(r.data,tenant,month,expected);if(receipt.prepared_by!==uid)throw Error();
   if(active.current){setData(null);setNotice('Preparation recorded: '+receipt.status+'. Reload the month to verify its current source.');}
  },'Preparation not confirmed. Retry the exact month or reload to reconcile before making another preparation.');}
 async function review(){const batch=data?.batch;
  if(role!=='centre_director'||!batch||batch.status!=='prepared'||batch.prepared_by===uid||batch.summary.rows.some(r=>r.lecturer_id===uid)||reviewNote.trim().length<5||(decision==='reviewed'&&(!data?.ready||!data.batch_current)))return;
  await run(async()=>{
   const r=await db.rpc('review_unipathway_gross_batch',{p_id:batch.id,p_fingerprint:batch.fingerprint,p_decision:decision,p_note:reviewNote.trim()});if(r.error)throw Error();
   const receipt=readGrossBatch(r.data,tenant,month,{id:batch.id,fingerprint:batch.fingerprint,status:decision});if(receipt.reviewed_by!==uid)throw Error();
   if(active.current){setData(null);setNotice('Independent review recorded. Reload the month to verify the snapshot. This is not payment approval.');setReviewNote('');}
  },'Review not confirmed. Your note and decision are retained. If the source has changed, reload and reject the stale preparation.');}
 const canReview=role==='centre_director'&&data?.batch?.status==='prepared'&&data.batch.prepared_by!==uid&&!data.batch.summary.rows.some(r=>r.lecturer_id===uid);
 const visible=data?.batch?.summary||data?.summary,pages=Math.max(1,Math.ceil((visible?.rows.length||0)/10));
 return <section className="my-5 min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-5" aria-label="Closed-month gross preparation">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">Closed-month gross preparation</h2><p className="mt-1 text-sm text-muted-foreground">Preserve approved teaching and rate evidence for independent review. No payment is initiated or authorised.</p></div><Button type="button" variant="outline" aria-expanded={open} disabled={busy} onClick={()=>setOpen(v=>!v)}>{open?'Hide gross preparation':'Open gross preparation'}</Button></div>
  {open&&(!enabled?<p role="status" className="text-sm">Gross preparation requires separate centre activation. No payroll records or payments have been created.</p>:<>
   <div className="grid gap-3 sm:grid-cols-2 sm:items-end"><label className="block min-w-0 text-sm font-medium">Completed teaching month (PKT)<input type="month" className={input} min="2000-01" max={maxMonth} value={month} disabled={busy} onChange={e=>{setMonth(e.target.value);setData(null);setPage(0);setError('');setNotice('');setReviewNote('');}}/></label><Button type="button" variant="outline" disabled={busy||!monthValid} onClick={()=>void load()}>Verify completed month</Button></div>
   {data&&<>
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[['Current calculated gross',formatPkrPaisa(data.summary.gross_paisa)],['Approved claims',data.summary.approved_claims],['Pending claims',data.summary.pending_claims],['Unresolved approved claims',data.summary.unresolved_claims]].map(([label,value])=><div className="min-w-0 rounded-lg border p-3 [overflow-wrap:anywhere]" key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}</dl>
    <p className="text-sm">{data.ready?'Source checks passed for gross preparation. This is not proof that all teaching or payroll obligations have been recorded.':'Not ready: no approved claims, pending claims or missing/partial rate exceptions must be resolved first.'}</p>
    {data.batch&&<div className="space-y-2 rounded-lg border p-3"><h3 className="font-semibold">Stored preparation — {data.batch.status}</h3><p className="text-sm">Snapshot gross: <strong>{formatPkrPaisa(data.batch.summary.gross_paisa)}</strong> · {data.batch.summary.approved_claims} approved claims</p><p className="text-xs break-all text-muted-foreground">Reference: {data.batch.id}</p><p className="text-sm">{data.batch_current?'Stored evidence matches current source.':'Source has changed since this snapshot. Do not use the stored amount as a current payroll total. A reviewed snapshot requires separate correction handling.'}</p>{data.batch.review_note&&<p className="text-xs [overflow-wrap:anywhere]">Review note: {data.batch.review_note}</p>}</div>}
    {visible&&<section aria-label="Gross evidence breakdown" className="space-y-2"><h3 className="font-semibold">{data.batch?'Stored snapshot breakdown':'Current calculation breakdown'}</h3>{visible.rows.length===0?<p className="text-sm">No approved teaching records.</p>:<ul className="grid gap-2 xl:grid-cols-2">{visible.rows.slice(page*10,page*10+10).map(r=><li key={r.lecturer_id+':'+r.agreement_id+':'+r.resolution} className="min-w-0 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><p className="font-semibold">{r.lecturer_name}</p><p>{displayTeachingMinutes(r.minutes)} · {r.sessions} claims</p><p className="mt-1 font-medium">{r.gross_paisa===null?'Unresolved — no amount calculated':formatPkrPaisa(r.gross_paisa)}</p></li>)}</ul>}{pages>1&&<nav className="flex flex-wrap items-center gap-2" aria-label="Gross evidence pages"><Button variant="outline" type="button" disabled={busy||page===0} onClick={()=>setPage(v=>v-1)}>Previous</Button><span className="text-sm">Page {page+1} of {pages}</span><Button variant="outline" type="button" disabled={busy||page+1>=pages} onClick={()=>setPage(v=>v+1)}>Next</Button></nav>}</section>}
    {role==='finance_officer'&&!data.batch&&<><p className="text-sm text-muted-foreground">{data.contains_own?'A different finance officer must prepare a month containing your own remuneration.':'Preparation saves the exact verified source snapshot for an independent director review.'}</p><Button type="button" disabled={busy||!data.ready||data.contains_own} onClick={()=>void prepare()}>Prepare gross review batch</Button></>}
    {canReview&&<div className="space-y-3 rounded-lg border p-3"><h3 className="font-semibold">Independent director review</h3><label className="block text-sm">Decision<select className={input} disabled={busy} value={decision} onChange={e=>setDecision(e.target.value as typeof decision)}><option value="reviewed" disabled={!data.batch_current||!data.ready}>Review gross evidence</option><option value="rejected">Reject preparation</option></select></label><label className="block text-sm">Review evidence note<textarea className={input} disabled={busy} rows={3} maxLength={500} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/></label><Button type="button" disabled={busy||reviewNote.trim().length<5||(decision==='reviewed'&&(!data.batch_current||!data.ready))} onClick={()=>void review()}>Record independent review</Button></div>}
    {role==='centre_director'&&data.batch?.status==='prepared'&&!canReview&&<p className="text-sm">A different independent director must review this preparation.</p>}
    {data.rejected_history.length>0&&<details><summary className="min-h-11 cursor-pointer py-2 font-medium text-sm">Rejected preparations ({data.rejected_history.length} most recent)</summary><ul className="space-y-2">{data.rejected_history.map(h=><li key={h.id} className="rounded-lg border p-3 text-xs [overflow-wrap:anywhere]"><p>{h.id}</p><p>{h.review_note}</p></li>)}</ul></details>}
   </>}
   {busy&&<p role="status">Verifying gross preparation…</p>}{error&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
   <p className="text-xs text-muted-foreground">No contracts, statutory deductions, payslips, disbursements or bank details are generated. Late claims may invalidate a previously reviewed snapshot; recheck before any external payroll work.</p>
  </>)}
 </section>;
}
