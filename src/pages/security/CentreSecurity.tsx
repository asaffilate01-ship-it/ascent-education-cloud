
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useScopedSecurityRows} from '@/hooks/useScopedSecurityRows';
import PhysicalSecurityReadiness from '@/components/security/PhysicalSecurityReadiness';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED,occupancyStats,displayTime,type CentreAccessEvent,type CentreOccupant} from '@/lib/physicalSecurity';
import {Button} from '@/components/ui/button';
export default function CentreSecurity(){const {user}=useAuth();return <GateActivity key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;}
function GateActivity(){
 const {user}=useAuth(),permitted=!!physicalSecurityScope(user)&&PHYSICAL_SECURITY_ENABLED;
 const occupancy=useScopedSecurityRows<CentreOccupant>(user,'centre_occupancy','tenant_id,person_key,person_type,in_building,last_event_at,last_gate_id','person_key');
 const events=useScopedSecurityRows<CentreAccessEvent>(user,'centre_access_events','id,tenant_id,gate_id,direction,decision,occurred_at','id');
 const loading=occupancy.loading||events.loading,failed=occupancy.error||events.error;
 const inside=occupancyStats(occupancy.data);
 return <DashboardLayout title="Gate activity and occupancy" subtitle="Centre-authorised, recorded entries and exits">
  <PhysicalSecurityReadiness/>
  {permitted&&loading&&<p role="status">Loading the recorded access log…</p>}
  {permitted&&failed&&<div role="alert" className="rounded-xl border p-5"><p>Access events and occupancy could not both be verified. No partial counts are displayed.</p><Button onClick={()=>{occupancy.refresh();events.refresh();}}>Retry</Button></div>}
  {permitted&&!loading&&!failed&&<>
   <section className="grid gap-3 sm:grid-cols-3">
    {([['Recorded inside',inside.inside],['Learners and staff',inside.learnersAndStaff],['Visitors',inside.visitors]] as const).map(([label,value])=><article key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}
   </section>
   <p className="my-4 text-sm text-muted-foreground">Gate events and occupancy may lag hardware; do not treat this as an emergency muster count. No credential hashes or personal access tokens are read.</p>
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Recorded access decisions</h2>
    {events.data.length===0&&<p className="mt-3 text-sm">No access events recorded.</p>}
    <div className="mt-3 divide-y">{[...events.data].sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)).slice(0,100).map(event=><article key={event.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
      <div><p className="font-medium">{event.gate_id} · {event.direction==='in'?'Entry':'Exit'}</p><p className="text-muted-foreground">{displayTime(event.occurred_at)} PKT</p></div><p className={event.decision==='denied'?'text-destructive':'text-muted-foreground'}>{event.decision}</p>
    </article>)}</div>{events.data.length>100&&<p className="text-xs">Showing the latest 100 of {events.data.length} returned events, not a full audit export.</p>}
   </section>
  </>}
 </DashboardLayout>;
}
