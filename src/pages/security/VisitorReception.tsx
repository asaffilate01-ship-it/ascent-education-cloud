
import {useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {useScopedSecurityRows} from '@/hooks/useScopedSecurityRows';
import PhysicalSecurityReadiness from '@/components/security/PhysicalSecurityReadiness';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED,visitorWriter,visitorStats,validateVisitorReceipt,displayTime,type CentreVisitor} from '@/lib/physicalSecurity';

type CheckInAttempt={requestId:string;name:string;purpose:string;gate:string};
type CheckOutAttempt={requestId:string;visitorId:string};
export default function VisitorReception(){const {user}=useAuth();return <VisitorDesk key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`}/>;}
function VisitorDesk(){
 const {user}=useAuth();
 const tenant=physicalSecurityScope(user);
 const allowed=!!tenant&&PHYSICAL_SECURITY_ENABLED;
 const writer=visitorWriter(user);
 const visitors=useScopedSecurityRows<CentreVisitor>(user,'centre_visitors','id,tenant_id,full_name,pass_number,purpose,status,checked_in_at,checked_out_at,created_at','id');
 const [name,setName]=useState(''),[purpose,setPurpose]=useState(''),[gate,setGate]=useState('Reception');
 const [attested,setAttested]=useState(false),[inFlight,setInFlight]=useState(false),[actionError,setActionError]=useState('');
 const [checkinAttempt,setCheckinAttempt]=useState<CheckInAttempt|null>(null);
 const [checkoutAttempt,setCheckoutAttempt]=useState<CheckOutAttempt|null>(null);
 const stats=visitorStats(visitors.data);
 const canCheckIn=writer&&!inFlight&&attested&&name.trim().length>=2&&purpose.trim().length>=2&&gate.trim().length>=2;
 async function checkIn(){
  if(!tenant||!canCheckIn)return;
  const attempt=checkinAttempt||{requestId:crypto.randomUUID(),name:name.trim(),purpose:purpose.trim(),gate:gate.trim()};
  setCheckinAttempt(attempt);setInFlight(true);setActionError('');
  try{
   const {data,error}=await db.rpc('unipathway_register_centre_visitor',{
    p_tenant:tenant,p_name:attempt.name,p_purpose:attempt.purpose,p_gate:attempt.gate,
    p_id_attested:true,p_request_id:attempt.requestId
   });
   if(error)throw error;
   validateVisitorReceipt(data,tenant,'in_building');
   setCheckinAttempt(null);setName('');setPurpose('');setGate('Reception');setAttested(false);
   visitors.refresh();
  }catch{
   setActionError('Check-in could not be verified. It may have reached the centre database. Review the register before starting a new check-in; retrying this same request is idempotent.');
   visitors.refresh();
  }finally{setInFlight(false);}
 }
 async function checkOut(visitor:CentreVisitor){
  if(!tenant||!writer||inFlight||visitor.tenant_id!==tenant||visitor.status!=='in_building')return;
  if(checkoutAttempt&&checkoutAttempt.visitorId!==visitor.id)return;
  if(!window.confirm(`Record checkout for pass ${visitor.pass_number}? This will update the recorded occupancy and access log.`))return;
  const attempt=checkoutAttempt||{requestId:crypto.randomUUID(),visitorId:visitor.id};
  setCheckoutAttempt(attempt);setInFlight(true);setActionError('');
  try{
   const {data,error}=await db.rpc('unipathway_checkout_centre_visitor',{p_tenant:tenant,p_visitor:visitor.id,p_gate:'Reception',p_request_id:attempt.requestId});
   if(error)throw error;
   validateVisitorReceipt(data,tenant,'checked_out',visitor.id);
   setCheckoutAttempt(null);visitors.refresh();
  }catch{
   setActionError('Checkout confirmation is uncertain. Review the register before creating a different checkout. Retrying the same request preserves its request identifier.');
  }finally{setInFlight(false);}
 }
 return <DashboardLayout title="Visitor reception" subtitle="Recorded passes, centre-bound check-in and check-out">
  <PhysicalSecurityReadiness/>
  {allowed&&visitors.loading&&<p role="status" className="mt-4">Loading authorised visitor register…</p>}
  {allowed&&visitors.error&&<div role="alert" className="mt-4 rounded-xl border p-4"><p>Visitor records could not be fully verified; no partial list is shown.</p><Button variant="outline" className="mt-2" onClick={visitors.refresh}>Retry register</Button></div>}
  {allowed&&!visitors.loading&&!visitors.error&&<>
   <section className="mt-4 grid grid-cols-3 gap-3">{[
    ['Inside (recorded)',stats.inside],['Pre-registered',stats.preRegistered],['Checked out',stats.checkedOut]
   ].map(([label,value])=><article className="rounded-xl border bg-card p-4" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></article>)}</section>
   <p className="mt-3 text-sm text-muted-foreground">Pass statuses are stored records, not biometric identification. Physical ID verification, host consent and restricted-zone supervision remain on-site duties.</p>
   {actionError&&<p role="alert" className="mt-4 rounded-lg border p-4">{actionError}</p>}
   {writer?<section className="mt-5 rounded-xl border bg-card p-5"><h2 className="font-semibold">Register a visitor and issue a pass</h2>
    <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={e=>{e.preventDefault();void checkIn();}}>
     <label className="text-sm font-medium">Visitor's name<Input required maxLength={120} value={name} disabled={inFlight||!!checkinAttempt} onChange={e=>setName(e.target.value)} /></label>
     <label className="text-sm font-medium">Purpose of visit<Input required maxLength={200} value={purpose} disabled={inFlight||!!checkinAttempt} onChange={e=>setPurpose(e.target.value)}/></label>
     <label className="text-sm font-medium">Reception gate<Input required maxLength={80} value={gate} disabled={inFlight||!!checkinAttempt} onChange={e=>setGate(e.target.value)}/></label>
     <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={attested} disabled={inFlight||!!checkinAttempt} onChange={e=>setAttested(e.target.checked)}/>I checked identity in person using the approved reception procedure. No ID number is uploaded.</label>
     <div className="flex flex-wrap gap-3 md:col-span-2"><Button type="submit" disabled={!canCheckIn}>{inFlight?'Recording…':checkinAttempt?'Retry same check-in':'Record check-in'}</Button>
      {checkinAttempt&&<Button type="button" variant="outline" disabled={inFlight} onClick={()=>{setCheckinAttempt(null);setActionError('First check the visitor register for this visitor before creating a new request.');visitors.refresh();}}>I reviewed the register — start a new request</Button>}
     </div>
    </form>
   </section>:<p role="status" className="mt-5 rounded-lg border p-4">Visitor writes are disabled until the dedicated server-authorised, audited centre RPCs and two-centre checks are activated. Read access alone cannot check someone in or out.</p>}
   <section className="mt-5 rounded-xl border bg-card p-5"><h2 className="font-semibold">Visitor register</h2>
    {!visitors.data.length&&<p className="mt-3 text-sm">No visitors are recorded in this centre's register.</p>}
    <div className="mt-3 divide-y">{[...visitors.data].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,100).map(v=><article className="flex flex-wrap items-center justify-between gap-3 py-4" key={v.id}>
     <div><p className="font-semibold">{v.full_name}</p><p className="text-sm text-muted-foreground">Pass {v.pass_number} · {v.purpose||'Purpose not recorded'}</p>
      <p className="text-xs text-muted-foreground">{v.status} · In {displayTime(v.checked_in_at)} PKT · Out {displayTime(v.checked_out_at)} PKT</p></div>
     {writer&&v.status==='in_building'&&<Button type="button" variant="outline" disabled={inFlight||(!!checkoutAttempt&&checkoutAttempt.visitorId!==v.id)} onClick={()=>void checkOut(v)}>{checkoutAttempt?.visitorId===v.id?'Retry checkout':'Record checkout'}</Button>}
    </article>)}</div>
    {visitors.data.length>100&&<p className="mt-2 text-xs">Latest 100 of {visitors.data.length} returned visitor records. Use a reviewed server report for complete historical exports.</p>}
   </section>
  </>}
 </DashboardLayout>;
}
