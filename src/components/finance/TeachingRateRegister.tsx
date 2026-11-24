import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {calendarDay,calendarDayLabel} from '@/lib/academicCalendar';
import {formatPkrPaisa} from '@/lib/teachingRemuneration';
import {displayTeachingMinutes} from '@/lib/teachingLoad';
import {parseRatePaisa,rateDate,readRateRegister,readRateReceipt,readRatePreview,previewTotals,type RateIdentity,type RateRole,type RateRegister,type RatePreview,type RateBasis} from '@/lib/teachingRateRegister';
const enabled=import.meta.env.VITE_UNIPATHWAY_TEACHING_RATES_ENABLED==='true';
const input='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
const reasonLabels={calculated:'Calculated from approved time',missing_rate:'No approved rate for the teaching date',partial_session:'Partial flat-rate session — review required'} as const;
export default function TeachingRateRegister(){
 const {user,loading}=useAuth();
 if(loading||!user?.id||!user.tenantId||!user.roles?.includes(user.role)||(user.role!=='centre_director'&&user.role!=='finance_officer'))return null;
 return <Workspace key={[user.id,user.tenantId,user.role,user.roles.join(',')].join(':')} uid={user.id} tenant={user.tenantId} role={user.role}/>;
}
function Workspace({uid,tenant,role}:{uid:string;tenant:string;role:RateRole}){
 const today=calendarDay();
 const [open,setOpen]=useState(false),[month,setMonth]=useState(today.slice(0,7)),[register,setRegister]=useState<RateRegister|null>(null),[preview,setPreview]=useState<RatePreview|null>(null);
 const [lecturer,setLecturer]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[basis,setBasis]=useState<RateBasis>('hourly'),[amount,setAmount]=useState(''),[reference,setReference]=useState('');
 const [reviewId,setReviewId]=useState(''),[decision,setDecision]=useState<'approved'|'rejected'>('approved'),[note,setNote]=useState(''),[page,setPage]=useState(0),[previewPage,setPreviewPage]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const active=useRef(true),lock=useRef(false),request=useRef<{fingerprint:string;id:string}|null>(null);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const rate=parseRatePaisa(amount);
 const valid=!!register?.roster.some(r=>r.id===lecturer)&&lecturer!==uid&&rateDate(from)&&rateDate(until)&&from<=until&&rate!==null&&reference.trim().length>=5&&reference.trim().length<=500;
 const current=register?.rates.find(r=>r.id===reviewId);
 async function run(action:()=>Promise<void>,failure:string){
  if(!enabled||lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await action();}catch{if(active.current)setError(failure);}finally{lock.current=false;if(active.current)setBusy(false);}
 }
 function clearSnapshot(){setRegister(null);setPreview(null);setReviewId('');setNote('');setPage(0);setPreviewPage(0);}
 async function load(){if(!rateDate(month+'-01'))return;clearSnapshot();await run(async()=>{
  const r=await db.rpc('get_unipathway_teaching_rates',{p_month:month+'-01',p_role:role});if(r.error)throw Error();const value=readRateRegister(r.data,tenant,role,month);
  if(active.current){setRegister(value);if(!value.roster.some(x=>x.id===lecturer))setLecturer('');}
 },'Rate register could not be verified. No rates are shown; check centre activation or retry.');}
 async function propose(){if(role!=='centre_director'||!valid||rate===null)return;
  await run(async()=>{
   const payload={tenant_id:tenant,lecturer_id:lecturer,effective_from:from,effective_until:until,basis,rate_paisa:rate,currency:'PKR' as const,agreement_reference:reference.trim()};
   const fingerprint=JSON.stringify(payload);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
   const expected={...payload,id:request.current.id};
   const r=await db.rpc('propose_unipathway_teaching_rate',{p_id:expected.id,p_lecturer:lecturer,p_from:from,p_until:until,p_basis:basis,p_rate:rate,p_reference:reference.trim()});if(r.error)throw Error();
   const receipt=readRateReceipt(r.data,expected);
   if(active.current){clearSnapshot();request.current=null;setAmount('');setReference('');setNotice('Rate agreement recorded: '+receipt.status+'. Load the relevant month to confirm the register.');}
  },'Proposal not confirmed. Retry the same entries, or reload the register to reconcile before changing the request.');
 }
 async function review(){if(role!=='finance_officer'||!current||current.status!=='pending'||current.proposed_by===uid||current.lecturer_id===uid||note.trim().length<5)return;
  await run(async()=>{
   const expected:Omit<RateIdentity,'status'>={id:current.id,tenant_id:tenant,lecturer_id:current.lecturer_id,effective_from:current.effective_from,effective_until:current.effective_until,basis:current.basis,rate_paisa:current.rate_paisa,currency:'PKR',agreement_reference:current.agreement_reference};
   const r=await db.rpc('review_unipathway_teaching_rate',{p_id:current.id,p_decision:decision,p_note:note.trim()});if(r.error)throw Error();readRateReceipt(r.data,expected,decision);
   if(active.current){clearSnapshot();setNotice('Independent finance review recorded. Reload the month for the confirmed rate and gross preview.');}
  },'Review not confirmed. Your decision is retained; retry exactly or reload the register.');
 }
 async function calculate(){if(role!=='finance_officer'||!rateDate(month+'-01')||month>today.slice(0,7))return;setPreview(null);setPreviewPage(0);await run(async()=>{
  const r=await db.rpc('preview_unipathway_teaching_remuneration',{p_month:month+'-01'});if(r.error)throw Error();const value=readRatePreview(r.data,tenant,month);if(active.current)setPreview(value);
 },'Approved remuneration could not be reconciled. No amounts are shown; retry after checking the source records.');}
 const totals=preview?previewTotals(preview.rows):null,pages=Math.max(1,Math.ceil((register?.rates.length||0)/10)),previewPages=Math.max(1,Math.ceil((preview?.rows.length||0)/10));
 return <section className="my-5 min-w-0 space-y-4 rounded-xl border bg-card p-3 sm:p-5" aria-label="Teaching rate agreements">
  <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">Teaching rate agreements</h2><p className="mt-1 text-sm text-muted-foreground">{role==='centre_director'?'Record a dated rate from independently agreed part-time teaching terms.':'Review proposed rates and prepare gross remuneration from approved teaching claims.'}</p></div><Button variant="outline" type="button" disabled={busy} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Hide rate register':'Open rate register'}</Button></div>
  {open&&(!enabled?<p role="status" className="text-sm">Teaching rate management requires separate centre activation. No rates or remuneration have been recorded by this screen.</p>:<>
   <p className="text-sm text-muted-foreground">PKR only. A rate reference is not a signed contract or payment approval. Corrected agreements, overtime, deductions and disputed claims require separate authorised handling.</p>
   <div className="grid gap-3 sm:grid-cols-2 sm:items-end"><label className="block min-w-0 text-sm font-medium">Agreement / teaching month (PKT)<input type="month" min="2000-01" max="2099-12" className={input} value={month} disabled={busy} onChange={e=>{setMonth(e.target.value);clearSnapshot();setError('');setNotice('');}}/></label><Button variant="outline" type="button" disabled={busy||!rateDate(month+'-01')} onClick={()=>void load()}>Load rate register</Button></div>
   {role==='centre_director'&&register&&<section className="space-y-3 rounded-lg border p-3" aria-label="Propose rate agreement"><h3 className="font-semibold">Propose independently agreed rate</h3>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-medium">Verified lecturer<select className={input} value={lecturer} disabled={busy} onChange={e=>setLecturer(e.target.value)}><option value="">Choose lecturer</option>{register.roster.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label className="block text-sm font-medium">Rate basis<select className={input} value={basis} disabled={busy} onChange={e=>{setBasis(e.target.value as RateBasis);setAmount('');}}><option value="hourly">Hourly</option><option value="session">Per full session</option></select></label><label className="block min-w-0 text-sm font-medium">Effective from<input type="date" className={input} min="2000-01-01" max="2099-12-31" value={from} disabled={busy} onChange={e=>setFrom(e.target.value)}/></label><label className="block min-w-0 text-sm font-medium">Effective until (inclusive)<input type="date" className={input} min={from||'2000-01-01'} max="2099-12-31" value={until} disabled={busy} onChange={e=>setUntil(e.target.value)}/></label><label className="block min-w-0 text-sm font-medium">Agreed rate (PKR)<input className={input} inputMode="decimal" maxLength={10} value={amount} disabled={busy} onChange={e=>setAmount(e.target.value)}/></label><label className="block min-w-0 text-sm font-medium">Agreement evidence reference<input className={input} maxLength={500} value={reference} disabled={busy} onChange={e=>setReference(e.target.value)}/></label></div><p className="text-xs text-muted-foreground">Use the approved agreement reference, not personal identity information, bank details or confidential document URLs. Independent finance review is required.</p><Button type="button" disabled={busy||!valid} onClick={()=>void propose()}>Propose teaching rate</Button>
   </section>}
   {register&&<section className="space-y-3" aria-label="Recorded rate agreements"><h3 className="font-semibold">{register.rates.length} recorded agreements overlapping the selected month</h3>
    {register.rates.length===0?<p className="text-sm text-muted-foreground">No recorded agreements for this month.</p>:<ul className="grid gap-3 xl:grid-cols-2">{register.rates.slice(page*10,page*10+10).map(r=><li key={r.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{r.lecturer_name}</h4><span className="capitalize">{r.status}</span></div><p className="font-semibold tabular-nums">{formatPkrPaisa(r.rate_paisa)} / {r.basis==='hourly'?'hour':'full session'}</p><p>{calendarDayLabel(r.effective_from)} – {calendarDayLabel(r.effective_until)}</p><p className="text-xs text-muted-foreground">Evidence: {r.agreement_reference}</p>{r.review_note&&<p className="text-xs">Review note: {r.review_note}</p>}{role==='finance_officer'&&r.status==='pending'&&r.proposed_by!==uid&&r.lecturer_id!==uid&&<Button type="button" variant="outline" disabled={busy} aria-expanded={reviewId===r.id} onClick={()=>{setReviewId(v=>v===r.id?'':r.id);setNote('');setDecision('approved');}}>Review rate<span className="sr-only"> {r.lecturer_name}</span></Button>}{reviewId===r.id&&<div className="space-y-3 border-t pt-3"><label className="block text-sm">Rate decision<select className={input} value={decision} disabled={busy} onChange={e=>setDecision(e.target.value as typeof decision)}><option value="approved">Approve recorded rate</option><option value="rejected">Reject proposal</option></select></label><label className="block text-sm">Finance review note<textarea className={input} rows={3} maxLength={500} value={note} disabled={busy} onChange={e=>setNote(e.target.value)}/></label><Button type="button" disabled={busy||note.trim().length<5} onClick={()=>void review()}>Record independent rate review</Button></div>}</li>)}</ul>}
    {pages>1&&<nav aria-label="Rate agreement pages" className="flex flex-wrap items-center gap-2"><Button variant="outline" type="button" disabled={busy||page===0} onClick={()=>{setPage(v=>v-1);setReviewId('');}}>Previous rates</Button><span className="text-sm">Page {page+1} of {pages}</span><Button variant="outline" type="button" disabled={busy||page+1>=pages} onClick={()=>{setPage(v=>v+1);setReviewId('');}}>Next rates</Button></nav>}
   </section>}
   {role==='finance_officer'&&<section className="space-y-3 rounded-lg border p-3" aria-label="Monthly gross remuneration"><h3 className="font-semibold">Monthly gross remuneration preview</h3><p className="text-sm text-muted-foreground">Only approved claims and rates covering their teaching dates are calculated. Hourly amounts round once per rate group; a partial flat-rate session requires a separate decision. Pending claims are excluded.</p><Button type="button" variant="outline" disabled={busy||!rateDate(month+'-01')||month>today.slice(0,7)} onClick={()=>void calculate()}>Calculate approved teaching time</Button>
   {preview&&totals&&<><dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[['Calculated subtotal',formatPkrPaisa(totals.gross)],['Calculated sessions',totals.calculated],['Unresolved approved sessions',totals.unresolved],['Awaiting teaching approval',preview.pending_claims]].map(([label,value])=><div key={label} className="min-w-0 rounded-lg border p-3 [overflow-wrap:anywhere]"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}</dl><p className="text-sm">{totals.unresolved?'Incomplete gross subtotal — resolve all exceptions before payment preparation.':'Preview only — not a payroll batch or payment authorisation.'}</p>
   <ul className="grid gap-2 xl:grid-cols-2">{preview.rows.slice(previewPage*10,previewPage*10+10).map(r=><li key={r.lecturer_id+':'+r.agreement_id+':'+r.resolution} className="min-w-0 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]"><p className="font-semibold">{r.lecturer_name}</p><p>{displayTeachingMinutes(r.minutes)} · {r.sessions} sessions</p><p>{reasonLabels[r.resolution]}</p>{r.rate_paisa!==null&&<p className="text-xs text-muted-foreground">{formatPkrPaisa(r.rate_paisa)} / {r.basis==='hourly'?'hour':'full session'}</p>}<p className="mt-1 font-medium">{r.gross_paisa===null?'Amount not calculated':formatPkrPaisa(r.gross_paisa)}</p></li>)}</ul>{preview.rows.length===0&&<p className="text-sm">No approved teaching claims for this month.</p>}{previewPages>1&&<nav aria-label="Remuneration pages" className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy||previewPage===0} onClick={()=>setPreviewPage(v=>v-1)}>Previous results</Button><span className="text-sm">Page {previewPage+1} of {previewPages}</span><Button type="button" variant="outline" disabled={busy||previewPage+1>=previewPages} onClick={()=>setPreviewPage(v=>v+1)}>Next results</Button></nav>}</>}
   </section>}
   {busy&&<p role="status">Confirming teaching rates…</p>}{error&&<p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}{notice&&<p role="status" className="rounded-lg border p-3 text-sm">{notice}</p>}
  </>)}
 </section>;
}
