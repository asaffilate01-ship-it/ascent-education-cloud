import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {deliveryPhaseEvidence} from '@/lib/deliveryPhases';
import type {ReadinessCheck,ReadinessIntegration} from '@/lib/readiness';

export default function DeliveryPhaseReadiness({checks,integrations,now}:{checks:ReadinessCheck[];integrations:ReadinessIntegration[];now:number}){
 const [outstanding,setOutstanding]=useState(false);
 const [selected,setSelected]=useState('all');
 const phases=deliveryPhaseEvidence(checks,integrations,now);
 const shown=phases.filter(p=>selected==='all'||p.id===selected);
 return <section className="rounded-2xl border bg-card p-3 sm:p-5 space-y-4" aria-labelledby="delivery-phase-heading">
  <div><h2 id="delivery-phase-heading" className="text-lg font-semibold">P0–P9 delivery evidence</h2><p className="mt-1 text-sm text-muted-foreground">Recorded evidence from the current verified centre snapshot. A current evidence record is not a certification, a completed phase, or confirmation of live production. Separate operational acceptance remains required for every phase.</p></div>
  <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-[1_1_14rem] text-sm font-medium">Delivery phase<select className="mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All ten delivery phases</option>{phases.map(p=><option key={p.id} value={p.id}>{p.id} — {p.title}</option>)}</select></label><Button type="button" variant={outstanding?'default':'outline'} aria-pressed={outstanding} onClick={()=>setOutstanding(v=>!v)}>Outstanding evidence only</Button>{(outstanding||selected!=='all')&&<Button type="button" variant="ghost" onClick={()=>{setSelected('all');setOutstanding(false);}}>Clear filters</Button>}</div>
  <div className="grid gap-3 lg:grid-cols-2">{shown.map(p=><article key={p.id} className="min-w-0 rounded-xl border bg-background p-3 sm:p-4 space-y-3 [overflow-wrap:anywhere]">
   <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{p.id} · {p.title}</h3><span className="text-xs text-muted-foreground">{p.gates.length?p.current+' / '+p.gates.length+' mapped records current':'No mapped baseline records'}</span></div>
   {p.gates.length>0&&<ul className="space-y-2 text-sm">{p.gates.filter(g=>!outstanding||g.state!=='current').map(g=><li key={g.key} className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0 flex-1">{g.recordId&&g.kind==='check'?<a className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={'#readiness-check-'+encodeURIComponent(g.recordId)}>{g.key.replace(/_/g,' ')}</a>:g.key.replace(/_/g,' ')}</span><span className={g.state==='current'?'text-muted-foreground':'font-medium text-amber-700 dark:text-amber-300'}>{g.state==='current'?'Evidence current':g.state==='missing'?'Record missing':'Review required'}</span></li>)}</ul>}
   {outstanding&&p.gates.length>0&&p.unverified===0&&<p className="text-sm text-muted-foreground">No outstanding mapped records. Separate acceptance still required.</p>}
   <p className="border-t pt-2 text-sm text-muted-foreground">{p.separate}</p>
  </article>)}</div>
 </section>;
}
