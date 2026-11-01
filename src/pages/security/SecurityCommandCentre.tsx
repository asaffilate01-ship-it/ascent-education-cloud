
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useScopedSecurityRows} from '@/hooks/useScopedSecurityRows';
import PhysicalSecurityReadiness from '@/components/security/PhysicalSecurityReadiness';
import {PHYSICAL_SECURITY_ENABLED,physicalSecurityScope,deviceHealth,occupancyStats,type CentreOccupant,type CentreCamera,type CentreDevice,type MusterEvent} from '@/lib/physicalSecurity';
import {Button} from '@/components/ui/button';

export default function SecurityCommandCentre(){const {user}=useAuth();return <Desk key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;}
function Desk(){
 const {user}=useAuth();const permitted=!!physicalSecurityScope(user)&&PHYSICAL_SECURITY_ENABLED;
 const occ=useScopedSecurityRows<CentreOccupant>(user,'centre_occupancy','tenant_id,person_type,in_building,last_event_at,last_gate_id','person_key');
 const cams=useScopedSecurityRows<CentreCamera>(user,'cctv_cameras','id,tenant_id,camera_code,display_name,status,last_health_at','id');
 const devices=useScopedSecurityRows<CentreDevice>(user,'security_devices','id,tenant_id,device_code,device_type,status,last_health_at','id');
 const muster=useScopedSecurityRows<MusterEvent>(user,'emergency_muster_events','id,tenant_id,status,started_at,ended_at','id');
 const sources=[occ,cams,devices,muster];const loading=sources.some(s=>s.loading),failed=sources.some(s=>s.error);
 const stats=occupancyStats(occ.data),active=muster.data.filter(e=>e.status==='active');
 return <DashboardLayout title="Centre security operations" subtitle="Centre-scoped reception, occupancy and emergency readiness">
  <PhysicalSecurityReadiness/>
  {permitted&&loading&&<p role="status" className="mt-4">Verifying all centre operations sources…</p>}
  {permitted&&failed&&<div role="alert" className="mt-4 rounded-xl border p-5"><p>One or more security feeds could not be verified. No partial occupancy or emergency totals are shown.</p><Button variant="outline" className="mt-3" onClick={()=>sources.forEach(s=>s.refresh())}>Retry all sources</Button></div>}
  {permitted&&!loading&&!failed&&<><section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Recorded centre status">
   {[
    ['Reported in building',String(stats.inside)],
    ['Visitors inside',String(stats.visitors)],
    ['Devices recently online',String(devices.data.filter(d=>deviceHealth(d.status,d.last_health_at)==='reported-online').length)],
    ['Active muster events',String(active.length)],
   ].map(([label,value])=><article key={label} className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}
  </section><p className="mt-3 text-sm text-muted-foreground">These are last recorded database/provider states, not a certified real-time headcount or an emergency response service. Follow the centre's physical evacuation plan.</p>
  <section className="mt-5 grid gap-3 md:grid-cols-2">
   {[
    ['/security/centre','Gate and occupancy activity','Review last recorded access decisions'],
    ['/security/visitors','Visitor reception','Review passes and authorised check-in/out'],
    ['/security/muster','Emergency muster','Review recorded accountability and exceptions'],
    ['/security','CCTV workspace','Provider-gated live/playback requests'],
   ].map(([path,label,description])=><Link key={path} to={path} className="rounded-xl border bg-card p-5 hover:bg-accent"><h2 className="font-semibold">{label}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p></Link>)}
  </section><section className="mt-5 rounded-xl border bg-card p-5"><h2 className="font-semibold">Device inventory and freshness</h2>
   {!devices.data.length&&<p className="mt-3 text-sm">No devices were returned from the authorised centre inventory.</p>}
   <div className="mt-3 grid gap-2 md:grid-cols-2">{devices.data.slice(0,100).map(d=><div key={d.id} className="rounded-lg border p-3"><p className="font-medium">{d.device_code}</p><p className="text-sm text-muted-foreground">{d.device_type} · {deviceHealth(d.status,d.last_health_at).replace('-', ' ')}</p></div>)}</div>
   {devices.data.length>100&&<p className="mt-2 text-sm">Showing the first 100 device records. Request a server-exported inventory for all {devices.data.length} returned entries.</p>}
  </section><section className="mt-5 rounded-xl border bg-card p-5"><h2 className="font-semibold">Camera reporting</h2><p className="mt-2 text-sm text-muted-foreground">This overview never loads stream references, footage, passwords or provider tokens.</p>
   <p className="mt-3 text-sm">{cams.data.length} camera registry entries · {cams.data.filter(c=>deviceHealth(c.status,c.last_health_at)==='reported-online').length} recently reported online</p>
  </section></>}
 </DashboardLayout>;
}
