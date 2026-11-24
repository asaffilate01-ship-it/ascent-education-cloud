import {useState} from 'react';
import {teachingRemuneration,formatPkrPaisa,type RateBasis} from '@/lib/teachingRemuneration';
export default function TeachingRemunerationPlanner(){
 const [basis,setBasis]=useState<RateBasis>('hourly'),[rate,setRate]=useState(''),[minutes,setMinutes]=useState(''),[sessions,setSessions]=useState('');
 const estimate=teachingRemuneration(basis,rate,minutes,sessions);
 const input='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-base';
 return <details className="rounded-xl border bg-card p-4"><summary className="cursor-pointer font-semibold">Part-time lecturer remuneration planner</summary><div className="mt-4 space-y-3"><p className="text-sm text-muted-foreground">Estimate gross teaching costs for a selected monthly pay period using manually checked figures. This does not create a contract, approve a timesheet, calculate deductions or authorise payment. No amounts are saved.</p>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="block text-sm font-medium">Rate basis<select className={input} value={basis} onChange={e=>{setBasis(e.target.value as RateBasis);setRate('');}}><option value="hourly">Hourly</option><option value="session">Per session</option></select></label>
 <label className="block text-sm font-medium">{basis==='hourly'?'Hourly rate (PKR)':'Session rate (PKR)'}<input className={input} inputMode="decimal" maxLength={10} value={rate} onChange={e=>setRate(e.target.value)} placeholder="Agreed rate"/></label>
 {basis==='hourly'?<label className="block text-sm font-medium">Teaching minutes in pay period<input className={input} inputMode="numeric" maxLength={5} value={minutes} onChange={e=>setMinutes(e.target.value)} placeholder="Reviewed minutes"/></label>:<label className="block text-sm font-medium">Sessions in pay period<input className={input} inputMode="numeric" maxLength={4} value={sessions} onChange={e=>setSessions(e.target.value)} placeholder="Reviewed sessions"/></label>}</div>
 {estimate?<div role="status" className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Estimated gross remuneration</p><p className="mt-1 text-xl font-semibold tabular-nums break-words">{formatPkrPaisa(estimate.grossPaisa)}</p><p className="text-xs text-muted-foreground">Planning estimate only, before any taxes, expenses, deductions or adjustments.</p></div>:<p className="text-sm text-muted-foreground">Enter a positive agreed rate and valid whole minutes or sessions.</p>}
 </div></details>;
}
