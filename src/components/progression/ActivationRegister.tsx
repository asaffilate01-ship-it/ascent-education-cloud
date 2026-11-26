import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {currentActivationInputs,describeActivationState,type ActivationState} from '@/lib/activationRegister';

const labels:Record<ActivationState,string>={not_set:'Not set — off by default',off:'Explicitly disabled',invalid:'Invalid setting — off',blocked:'Enabled switch, prerequisite missing',enabled_unverified:'Enabled in this build — backend unverified'};
export default function ActivationRegister(){
 const [filter,setFilter]=useState('all');
 const rows=describeActivationState(currentActivationInputs());
 const visible=rows.filter(row=>filter==='all'||(filter==='attention'?['blocked','invalid','not_set'].includes(row.state):row.state===filter));
 const enabled=rows.filter(row=>row.state==='enabled_unverified').length;
 const problems=rows.filter(row=>row.state==='blocked'||row.state==='invalid').length;
 return <details className="surface-card min-w-0 space-y-4 p-4 sm:p-5">
  <summary className="min-h-11 cursor-pointer font-semibold">Production activation register · {rows.length} reviewed switches</summary>
  <div className="space-y-3">
   <p className="text-sm leading-relaxed text-muted-foreground">Read-only snapshot of this running browser build. An enabled switch is not evidence of database installation, working providers or permission to launch. Server flags, credentials and hosted access checks are not visible here.</p>
   <dl className="grid gap-3 sm:grid-cols-3">{[['Enabled in build',enabled],['Invalid or blocked',problems],['Reviewed switches',rows.length]].map(([label,value])=><div key={label} className="rounded-lg border p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>)}</dl>
   <div className="flex flex-wrap items-end justify-between gap-3"><label className="min-w-0 text-sm font-medium">Show switches<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All reviewed switches</option><option value="attention">Needs configuration review</option><option value="enabled_unverified">Enabled, unverified</option><option value="off">Explicitly disabled</option></select></label>{filter!=='all'&&<Button variant="outline" onClick={()=>setFilter('all')}>Clear filter</Button>}</div>
   <p role="status" className="text-sm text-muted-foreground">{visible.length} of {rows.length} switches shown.</p>
   <div className="grid gap-3 lg:grid-cols-2">{visible.map(({definition,state,blockers})=><article key={definition.key} className="min-w-0 rounded-xl border p-4 [overflow-wrap:anywhere]"><p className="text-xs font-semibold text-muted-foreground">{definition.area}</p><h3 className="mt-1 font-semibold">{definition.label}</h3><p className="mt-1 text-sm font-medium">{labels[state]}</p><p className="mt-2 break-all text-xs text-muted-foreground">{definition.key}</p>{state==='blocked'&&<p className="mt-2 text-sm">Required configuration: {blockers.join(', ')}</p>}<p className="mt-3 text-sm leading-relaxed"><strong>Evidence required:</strong> {definition.evidence}</p></article>)}</div>
   {!visible.length&&<p className="rounded-lg border p-3 text-sm">No reviewed switches match this filter.</p>}
   <p className="text-xs text-muted-foreground">Use the recorded launch checks above and the reviewed activation runbooks. Changes require an authorised deployment; no switch is writable from this screen.</p>
  </div>
 </details>;
}
