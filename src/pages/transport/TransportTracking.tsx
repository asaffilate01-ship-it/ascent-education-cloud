import {useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import {Bus,MapPin,Route,ShieldCheck,Users} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {supabase} from '@/integrations/supabase/client';
import {toast} from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import type {Tables} from '@/integrations/supabase/types';

const STAFF_ROLES=['centre_director','superadmin','security_officer'] as const;
type Vehicle=Tables<'transport_vehicles'>;
type RouteRow=Tables<'transport_routes'>;
const stopsFor=(value:RouteRow['stops']):string[]=>{
 let parsed:unknown=value;
 if(typeof parsed==='string'){try{parsed=JSON.parse(parsed);}catch{return [];}}
 if(!Array.isArray(parsed))return [];
 return parsed.slice(0,30).map(x=>typeof x==='string'?x:
  x&&typeof x==='object'&&'name' in x?String(x.name):'').filter(Boolean);
};
export default function TransportTracking(){
 const {user}=useAuth();
 return <TransportWorkspace key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function TransportWorkspace(){
 const {user}=useAuth();
 const student=user?.role==='student';
 const staff=!!user&&STAFF_ROLES.some(role=>role===user.role);
 const manager=!!user&&['centre_director','superadmin'].includes(user.role);
 const ready=!!user?.id&&!!user.tenantId&&(student||staff);
 const tenant=user?.tenantId||'';
 const [tab,setTab]=useState<'vehicles'|'routes'>('routes');
 const [busy,setBusy]=useState(false),[vehicleOpen,setVehicleOpen]=useState(false),[routeOpen,setRouteOpen]=useState(false);
 const [vehicleForm,setVehicleForm]=useState({vehicle_number:'',vehicle_type:'bus',capacity:15,driver_name:'',driver_phone:''});
 const [routeForm,setRouteForm]=useState({route_name:'',vehicle_id:'',stops:''});
 const scope=[{column:'tenant_id',operator:'eq' as const,value:tenant}];
 const assignments=useSupabaseQuery('transport_assignments',{
  enabled:ready,filters:[...scope,...(student?[{column:'student_id',operator:'eq' as const,value:user!.id}]:[])]
 });
 const routeIds=[...new Set(assignments.data.map(a=>a.route_id))];
 const routes=useSupabaseQuery('transport_routes',{
  enabled:ready&&(!student||!assignments.loading&&!assignments.error&&routeIds.length>0),
  filters:[...scope,...(student?[{column:'id',operator:'in' as const,value:routeIds}]:[])],
 });
 const vehicleIds=[...new Set(routes.data.map(r=>r.vehicle_id).filter((id):id is string=>!!id))];
 const vehicles=useSupabaseQuery('transport_vehicles',{
  enabled:ready&&(!student||!routes.loading&&!routes.error&&vehicleIds.length>0),
  filters:[...scope,...(student?[{column:'id',operator:'in' as const,value:vehicleIds}]:[])],
 });
 const loading=assignments.loading||routes.loading||vehicles.loading;
 const error=assignments.error||routes.error||vehicles.error;
 const ownRoutes=routes.data.filter(r=>r.tenant_id===tenant&&(!student||routeIds.includes(r.id)));
 const ownVehicles=vehicles.data.filter(v=>v.tenant_id===tenant&&(!student||vehicleIds.includes(v.id)));
 const ownAssignments=assignments.data.filter(a=>a.tenant_id===tenant&&(!student||a.student_id===user?.id));
 const vehiclesById=new Map(ownVehicles.map(v=>[v.id,v]));
 const allowedVehicle=(id:string)=>!!ownVehicles.find(v=>v.id===id&&v.tenant_id===tenant);
 async function addVehicle(){
  if(!manager||!user?.tenantId||busy)return;
  const number=vehicleForm.vehicle_number.trim(),capacity=Number(vehicleForm.capacity);
  if(number.length<3||number.length>40||!Number.isSafeInteger(capacity)||capacity<1||capacity>100){
   toast.error('Enter a valid vehicle registration and capacity (1–100).');return;
  }
  setBusy(true);
  try{
   const response=await supabase.from('transport_vehicles').insert({
    tenant_id:tenant,vehicle_number:number,vehicle_type:vehicleForm.vehicle_type,capacity,
    driver_name:vehicleForm.driver_name.trim()||null,driver_phone:vehicleForm.driver_phone.trim()||null,status:'active',
   });
   if(response.error)throw response.error;
   toast.success('Vehicle registration saved at your centre.');
   setVehicleOpen(false);setVehicleForm({vehicle_number:'',vehicle_type:'bus',capacity:15,driver_name:'',driver_phone:''});
   void vehicles.refetch();
  }catch{toast.error('Vehicle registration could not be saved. Check your centre permissions.');}finally{setBusy(false);}
 }
 async function addRoute(){
  if(!manager||!user?.tenantId||busy)return;
  const name=routeForm.route_name.trim();
  if(name.length<3||name.length>120||(routeForm.vehicle_id&&!allowedVehicle(routeForm.vehicle_id))){
   toast.error('Give the route a name and use only vehicles registered at this centre.');return;
  }
  const stops=routeForm.stops.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30).map((s,i)=>({name:s.slice(0,100),order:i+1}));
  setBusy(true);
  try{
   const response=await supabase.from('transport_routes').insert({
    tenant_id:tenant,route_name:name,vehicle_id:routeForm.vehicle_id||null,stops,status:'active',
   });
   if(response.error)throw response.error;
   toast.success('Centre route saved. No GPS tracking was activated.');
   setRouteOpen(false);setRouteForm({route_name:'',vehicle_id:'',stops:''});void routes.refetch();
  }catch{toast.error('Route could not be saved. Check permissions and vehicle assignment.');}finally{setBusy(false);}
 }
 async function removeVehicle(record:Vehicle){
  if(!manager||!user?.tenantId||busy||record.tenant_id!==tenant)return;
  if(ownRoutes.some(r=>r.vehicle_id===record.id)){
   toast.error('Remove or change existing route assignments before deleting this vehicle.');return;
  }
  if(!window.confirm('Remove this vehicle registration from the selected centre?'))return;
  setBusy(true);
  try{
   const response=await supabase.from('transport_vehicles').delete().eq('id',record.id)
    .eq('tenant_id',tenant).select('id').maybeSingle();
   if(response.error||!response.data?.id)throw Error('Deletion unconfirmed');
   toast.success('Vehicle registration removed.');void vehicles.refetch();
  }catch{toast.error('Deletion was not confirmed. Refresh and check whether the vehicle is still assigned.');}finally{setBusy(false);}
 }
 return <DashboardLayout title="Centre transport" subtitle={student?'Your authorised transport route':'Centre vehicles, routes and transport assignments'}>
  {!ready?<p role="alert">A verified student or transport-authorised centre staff role and centre assignment are required.</p>:<>
   <section className="mb-5 rounded-lg border bg-card p-4">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Authorised transport information</h2>
    <p className="mt-2 text-sm text-muted-foreground">{student?'Only routes and vehicles linked to your own centre transport assignment are shown.':'Only records in your assigned centre are requested.'} Vehicle registration and saved route information do not mean GPS tracking, live location feeds or ETA services are connected.</p>
   </section>
   {loading?<p role="status">Verifying transport assignments and routes…</p>:error?
    <div role="alert" className="space-y-2 rounded-lg border border-destructive p-4">
     <p>Your transport records could not be verified. No partial routes or vehicle details are shown.</p>
     <Button variant="outline" onClick={()=>{void assignments.refetch();void routes.refetch();void vehicles.refetch();}}>Retry transport</Button>
    </div>:<>
     <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
      {([
       ['Authorised routes',ownRoutes.length,Route],
       ['Registered vehicles',ownVehicles.length,Bus],
       [student?'My assigned routes':'Passenger assignments',ownAssignments.length,Users],
      ] as const).map(([label,count,Icon])=><div key={label} className="rounded-xl border bg-card p-4"><p className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4"/>{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{count}</p></div>)}
     </div>
     <div role="group" aria-label="Transport details" className="mb-4 flex flex-wrap gap-2">
      <Button variant={tab==='routes'?'default':'outline'} aria-pressed={tab==='routes'} onClick={()=>setTab('routes')}>Routes</Button>
      <Button variant={tab==='vehicles'?'default':'outline'} aria-pressed={tab==='vehicles'} onClick={()=>setTab('vehicles')}>Vehicles</Button>
      <Button variant="outline" disabled={busy} onClick={()=>{void assignments.refetch();void routes.refetch();void vehicles.refetch();}}>Refresh</Button>
     </div>
     {manager&&<div className="mb-5 flex flex-wrap gap-2">
      <Dialog open={routeOpen} onOpenChange={setRouteOpen}><DialogTrigger asChild><Button variant="outline">Add centre route</Button></DialogTrigger>
       <DialogContent><DialogHeader><DialogTitle>Register a centre route</DialogTitle></DialogHeader>
        <div className="space-y-3">
         <div><Label htmlFor="route-name">Route name</Label><Input id="route-name" maxLength={120} value={routeForm.route_name} onChange={e=>setRouteForm(prev=>({...prev,route_name:e.target.value}))}/></div>
         <div><Label htmlFor="route-vehicle">Centre vehicle</Label><Select value={routeForm.vehicle_id} onValueChange={v=>setRouteForm(prev=>({...prev,vehicle_id:v}))}>
          <SelectTrigger id="route-vehicle" aria-label="Centre vehicle"><SelectValue placeholder="Choose a registered vehicle"/></SelectTrigger>
          <SelectContent>{ownVehicles.map(v=><SelectItem key={v.id} value={v.id}>{v.vehicle_number}</SelectItem>)}</SelectContent></Select></div>
         <div><Label htmlFor="route-stops">Stops (one per line)</Label><textarea id="route-stops" className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" maxLength={3000} value={routeForm.stops} onChange={e=>setRouteForm(prev=>({...prev,stops:e.target.value}))}/></div>
         <Button disabled={busy} onClick={()=>void addRoute()}>Save route</Button>
        </div>
       </DialogContent></Dialog>
      <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}><DialogTrigger asChild><Button variant="outline">Register vehicle</Button></DialogTrigger>
       <DialogContent><DialogHeader><DialogTitle>Register a centre vehicle</DialogTitle></DialogHeader>
        <div className="space-y-3">
         <div><Label htmlFor="vehicle-number">Vehicle registration</Label><Input id="vehicle-number" value={vehicleForm.vehicle_number} onChange={e=>setVehicleForm(prev=>({...prev,vehicle_number:e.target.value}))}/></div>
         <div><Label htmlFor="vehicle-type">Type</Label><Select value={vehicleForm.vehicle_type} onValueChange={v=>setVehicleForm(prev=>({...prev,vehicle_type:v}))}>
          <SelectTrigger id="vehicle-type" aria-label="Vehicle type"><SelectValue/></SelectTrigger>
          <SelectContent>{['bus','van','car'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
         <div><Label htmlFor="vehicle-capacity">Capacity</Label><Input id="vehicle-capacity" type="number" min={1} max={100} value={vehicleForm.capacity} onChange={e=>setVehicleForm(prev=>({...prev,capacity:Number(e.target.value)}))}/></div>
         <div><Label htmlFor="driver-name">Driver name (staff only)</Label><Input id="driver-name" value={vehicleForm.driver_name} onChange={e=>setVehicleForm(prev=>({...prev,driver_name:e.target.value}))}/></div>
         <div><Label htmlFor="driver-phone">Driver contact (staff only)</Label><Input id="driver-phone" value={vehicleForm.driver_phone} onChange={e=>setVehicleForm(prev=>({...prev,driver_phone:e.target.value}))}/></div>
         <Button disabled={busy} onClick={()=>void addVehicle()}>Save vehicle</Button>
        </div>
       </DialogContent></Dialog>
     </div>}
     {tab==='routes'&&<div className="space-y-3">
      {!ownRoutes.length&&<p className="rounded-lg border p-5 text-sm text-muted-foreground">No authorised route has been assigned or recorded yet.</p>}
      {ownRoutes.map(r=><article key={r.id} className="rounded-xl border bg-card p-4">
       <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{r.route_name}</h3><StatusBadge status={r.status}/></div>
       {r.vehicle_id&&<p className="mt-2 text-sm">Vehicle: {vehiclesById.get(r.vehicle_id)?.vehicle_number||'Vehicle details unavailable'}</p>}
       <p className="mt-2 text-sm text-muted-foreground">{stopsFor(r.stops).join(' · ')||'No published stops on this route'}</p>
      </article>)}
     </div>}
     {tab==='vehicles'&&<div className="grid gap-3 md:grid-cols-2">
      {!ownVehicles.length&&<p className="rounded-lg border p-5 text-sm text-muted-foreground">No authorised vehicle registration was found.</p>}
      {ownVehicles.map(v=><article key={v.id} className="rounded-xl border bg-card p-4">
       <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{v.vehicle_number}</h3><StatusBadge status={v.status}/></div>
       <p className="mt-2 text-sm">{v.vehicle_type} · Capacity {v.capacity}</p>
       {staff&&<p className="mt-2 text-sm text-muted-foreground">Driver: {v.driver_name||'Not assigned'} · Contact: {v.driver_phone||'Not recorded'}</p>}
       {manager&&<Button variant="outline" className="mt-3" disabled={busy} onClick={()=>void removeVehicle(v)}>Remove vehicle</Button>}
      </article>)}
     </div>}
     <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4"/>Live GPS tracking is not enabled by these records. A verified GPS provider and appropriate privacy/consent controls are required before location or ETA features appear.</p>
    </>
   }
  </>}
 </DashboardLayout>;
}
