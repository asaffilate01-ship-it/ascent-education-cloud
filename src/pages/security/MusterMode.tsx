
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {useScopedSecurityRows} from '@/hooks/useScopedSecurityRows';
import PhysicalSecurityReadiness from '@/components/security/PhysicalSecurityReadiness';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED,displayTime,type MusterEvent,type MusterRow} from '@/lib/physicalSecurity';
import {Button} from '@/components/ui/button';
export default function MusterMode(){const {user}=useAuth();return <ReadMuster key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;}
function ReadMuster(){
 const {user}=useAuth(),permitted=!!physicalSecurityScope(user)&&PHYSICAL_SECURITY_ENABLED;
 const events=useScopedSecurityRows<MusterEvent>(user,'emergency_muster_events','id,tenant_id,status,started_at,ended_at','id');
 const active=events.data.filter(e=>e.status==='active');
 const current=active.length===1?active[0]:null;
 const rows=useScopedSecurityRows<MusterRow>(user,'emergency_muster_status','id,tenant_id,muster_event_id,person_key,person_type,expected_inside,status,muster_point','id',current?{column:'muster_event_id',value:current.id}:{column:'muster_event_id',value:'00000000-0000-0000-0000-000000000000'});
 const loading=events.loading||(!!current&&rows.loading),failed=events.error||(!!current&&rows.error);
 const expected=rows.data.filter(r=>r.muster_event_id===current?.id&&r.expected_inside);
 const accounted=expected.filter(r=>r.status==='safe').length;
 const unaccounted=expected.filter(r=>r.status!=='safe').length;
 return <DashboardLayout title="Recorded emergency muster" subtitle="Centre-scoped accountability, not a substitute for on-site emergency response">
  <PhysicalSecurityReadiness/>
  {permitted&&loading&&<p role="status">Checking recorded muster events…</p>}
  {permitted&&failed&&<div role="alert" className="rounded-xl border p-4"><p>Emergency accountability data could not be fully verified. Follow the physical emergency plan.</p><Button onClick={()=>{events.refresh();rows.refresh();}}>Retry</Button></div>}
  {permitted&&!loading&&!failed&&<section className="mt-4 rounded-xl border bg-card p-5">
   {active.length>1?<p role="alert">Multiple active muster events exist. No authoritative headcount can be shown; contact the responsible centre official.</p>:
   !current?<><h2 className="font-semibold">No active muster recorded</h2><p className="mt-2 text-sm text-muted-foreground">This is only a database observation. For alarms or incidents, use the centre's physical emergency plan immediately.</p></>:
   <><h2 className="font-semibold">Muster recorded at {displayTime(current.started_at)} PKT</h2>
    <div className="mt-4 grid grid-cols-3 gap-3">{[['Expected records',expected.length],['Marked safe',accounted],['Not marked safe',unaccounted]].map(([label,value])=><div key={label} className="rounded-lg border p-3"><p className="text-sm">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div>
    <p className="mt-3 text-sm text-muted-foreground">Numbers cover stored status rows only; missing registration rows are not detectable here. Human roll-call and emergency services remain authoritative.</p>
    <div className="mt-4 divide-y">{expected.slice(0,80).map((row,i)=><div key={row.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span>{row.person_type} · record {i+1}</span><span>{row.status==='safe'?'Marked safe':'Not confirmed'}{row.muster_point?' · '+row.muster_point:''}</span></div>)}</div>
   </>}
  </section>}
 </DashboardLayout>;
}
