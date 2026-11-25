
import {useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useScopedSecurityRows} from '@/hooks/useScopedSecurityRows';
import PhysicalSecurityReadiness from '@/components/security/PhysicalSecurityReadiness';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED,occupancyStats,displayTime,type CentreAccessEvent,type CentreOccupant} from '@/lib/physicalSecurity';
import {Button} from '@/components/ui/button';
export default function CentreSecurity(){const {user}=useAuth();return <GateActivity key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;}
function GateActivity(){
 const {user}=useAuth(),permitted=!!physicalSecurityScope(user)&&PHYSICAL_SECURITY_ENABLED;
 const occupancy=useScopedSecurityRows<CentreOccupant>(user,'centre_occupancy','tenant_id,person_type,in_building,last_event_at,last_gate_id','person_key');
 const events=useScopedSecurityRows<CentreAccessEvent>(user,'centre_access_events','id,tenant_id,gate_id,direction,decision,occurred_at','id');
 const loading=occupancy.loading||events.loading,failed=occupancy.error||events.error;
 const inside=occupancyStats(occupancy.data);
 const [gate,setGate]=useState(''),[direction,setDirection]=useState(''),[decision,setDecision]=useState('');
 const gates=useMemo(()=>[...new Set(events.data.map(e=>e.gate_id))].sort(),[events.data]);
 const decisions=useMemo(()=>[...new Set(events.data.map(e=>e.decision))].sort(),[events.data]);
 const matching=useMemo(()=>events.data.filter(e=>(!gate||e.gate_id===gate)&&(!direction||e.direction===direction)&&(!decision||e.decision===decision)).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)),[events.data,gate,direction,decision]);
 return <DashboardLayout title="Gate activity and occupancy" subtitle="Centre-authorised, recorded entries and exits">
  <PhysicalSecurityReadiness/>
  {permitted&&<div className="my-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Recorded access activity, not live hardware telemetry.</p><Button variant="outline" disabled={loading} onClick={()=>{occupancy.refresh();events.refresh();}}>Refresh access records</Button></div>}
  {permitted&&loading&&<p role="status">Loading the recorded access log…</p>}
  {permitted&&failed&&<div role="alert" className="rounded-xl border p-5"><p>Access events and occupancy could not both be verified. No partial counts are displayed.</p><Button onClick={()=>{occupancy.refresh();events.refresh();}}>Retry</Button></div>}
  {permitted&&!loading&&!failed&&<>
   <section className="grid gap-3 sm:grid-cols-3">
    {([['Recorded inside',inside.inside],['Learners and staff',inside.learnersAndStaff],['Visitors',inside.visitors]] as const).map(([label,value])=><article key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}
   </section>
   <p className="my-4 text-sm text-muted-foreground">Gate events and occupancy may lag hardware; do not treat this as an emergency muster count. No credential hashes or personal access tokens are read.</p>
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Recorded access decisions</h2>
    <div className="my-3 grid gap-3 sm:grid-cols-3">{[{label:'Gate',value:gate,set:setGate,options:gates.map(v=>({value:v,label:v}))},{label:'Direction',value:direction,set:setDirection,options:[{value:'in',label:'Entry'},{value:'out',label:'Exit'}]},{label:'Decision',value:decision,set:setDecision,options:decisions.map(v=>({value:v,label:v}))}].map(filter=><label key={filter.label} className="text-sm font-medium">{filter.label}<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background p-2" value={filter.value} onChange={e=>filter.set(e.target.value)}><option value="">All</option>{filter.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{matching.length} matching of {events.data.length} returned records</p><Button variant="outline" onClick={()=>{setGate('');setDirection('');setDecision('');}}>Clear filters</Button></div>
    {events.data.length>0&&matching.length===0&&<p className="mt-3 text-sm">No returned records match these filters.</p>}
    {events.data.length===0&&<p className="mt-3 text-sm">No access events recorded.</p>}
    <div className="mt-3 divide-y">{matching.slice(0,100).map(event=><article key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
      <div><p className="font-medium">{event.gate_id} · {event.direction==='in'?'Entry':event.direction==='out'?'Exit':'Unknown direction'}</p><p className="text-muted-foreground">{displayTime(event.occurred_at)} PKT</p></div><p className={event.decision==='denied'?'text-destructive':'text-muted-foreground'}>{event.decision}</p>
    </article>)}</div>{matching.length>100&&<p className="text-xs">Showing the latest 100 of {matching.length} matching events, not a full audit export.</p>}
   </section>
  </>}
 </DashboardLayout>;
}
