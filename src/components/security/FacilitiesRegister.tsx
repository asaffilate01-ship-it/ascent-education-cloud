import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED} from '@/lib/physicalSecurity';
import {inspectionTiming,pakistanCalendarDate} from '@/lib/facilitiesPlanning';
import {verifyFacilitiesRegister,type FacilityRegister} from '@/lib/facilitiesRegister';
import {FACILITIES_WRITE_ENABLED,facilitiesWriterScope} from '@/lib/facilitiesCommands';
import FacilitiesRecordCommands from '@/components/security/FacilitiesRecordCommands';

const enabled=import.meta.env.VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED==='true';
export default function FacilitiesRegister(){
 const {user}=useAuth();
 const tenant=physicalSecurityScope(user);
 return <RegisterView key={`${user?.id}:${tenant}:${user?.role}:${user?.roles?.join(',')}`} tenant={tenant} writer={!!facilitiesWriterScope(user)&&FACILITIES_WRITE_ENABLED}/>;
}
function RegisterView({tenant,writer}:{tenant:string|null;writer:boolean}){
 const permitted=!!tenant&&PHYSICAL_SECURITY_ENABLED&&enabled;
 const [revision,setRevision]=useState(0);
 const [state,setState]=useState<{revision:number;data:FacilityRegister|null;error:boolean}>({revision:-1,data:null,error:false});
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState('');
 useEffect(()=>{
  if(!permitted||!tenant)return;
  let active=true;
  void (async()=>{
   try{
    const {data,error}=await db.rpc('get_unipathway_facilities_register',{p_tenant:tenant});
    if(error)throw error;
    const verified=verifyFacilitiesRegister(data,tenant);
    if(active)setState({revision,data:verified,error:false});
   }catch{if(active)setState({revision,data:null,error:true});}
  })();
  return()=>{active=false;};
 },[permitted,tenant,revision]);
 const snapshot=state.revision===revision?state.data:null;
 const refresh=()=>setRevision(n=>n+1);
 const failed=state.revision===revision&&state.error;
 const waiting=permitted&&!snapshot&&!failed;
 const today=pakistanCalendarDate();
 const visible=snapshot?.assets.filter(a=>[a.asset_code,a.category.replace(/_/g,' '),a.location].join(' ').toLowerCase().includes(search.trim().toLowerCase()))??[];
 const asset=snapshot?.assets.find(a=>a.id===selected);
 const history=snapshot?.inspections.filter(i=>i.asset_id===selected)??[];
 return <section className="mt-5 rounded-xl border bg-card p-5" aria-labelledby="facilities-register-title">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="facilities-register-title" className="font-semibold">Facilities register</h2>{permitted&&<Button variant="outline" disabled={waiting} onClick={()=>setRevision(n=>n+1)}>Refresh register</Button>}</div>
  {!permitted&&<p className="mt-3 text-sm text-muted-foreground">Persistent facilities records are not enabled for this session. No records have been fetched.</p>}
  {waiting&&<p role="status" className="mt-3 text-sm">Verifying centre facilities records…</p>}
  {failed&&<p role="alert" className="mt-3 text-sm text-destructive">The facilities register could not be verified. Check activation or centre permission before relying on it.</p>}
  {permitted&&tenant&&writer&&<FacilitiesRecordCommands tenant={tenant} snapshot={snapshot} refresh={refresh}/>}
  {snapshot&&<>
   <p className="mt-3 text-sm text-muted-foreground">Recorded inspection outcomes are not certification of equipment safety. Dates are compared in Pakistan time. {writer?'Recording requires a verified director and a separate server write gate.':'This workspace is read-only.'}</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Registered assets',snapshot.assets.length],['Inspection records',snapshot.inspections.length],['Assets with a recorded defect',snapshot.assets.filter(a=>snapshot.inspections.find(i=>i.asset_id===a.id)?.outcome==='defect').length]].map(([label,n])=><article className="rounded-lg border p-3" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{n}</p></article>)}</div>
   <label className="mt-4 block text-sm font-medium">Find an asset<Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Asset reference, category or location"/></label>
   {!visible.length&&<p className="mt-3 text-sm">{snapshot.assets.length?'No matching assets.':'No registered assets were returned for this verified centre.'}</p>}
   <div className="mt-3 divide-y">{visible.map(a=>{
    const latest=snapshot.inspections.find(i=>i.asset_id===a.id);
    const due=latest?.next_due_date??a.planned_inspection_date;
    return <article key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{a.asset_code} · {a.category.replace(/_/g,' ')}</p><p className="text-sm text-muted-foreground">{a.location} · Planned due {due} ({inspectionTiming(due,today).replace(/-/g,' ')})</p><p className="text-sm">{latest?'Latest recorded outcome: '+latest.outcome.replace(/_/g,' '):'No inspection recorded'}</p></div><Button variant="outline" onClick={()=>setSelected(s=>s===a.id?'':a.id)} aria-expanded={selected===a.id}>{selected===a.id?'Close history':'View history'}</Button></article>;
   })}</div>
   {asset&&<section className="mt-4 rounded-lg border p-4" aria-label={`Inspection history for ${asset.asset_code}`}><h3 className="font-semibold">Inspection history — {asset.asset_code}</h3>{history.length===0&&<p className="mt-2 text-sm">No inspection history recorded.</p>}{history.map(i=><article key={i.id} className="border-b py-3 last:border-0"><p className="font-medium">{i.inspected_on} · {i.outcome.replace(/_/g,' ')}</p><p className="whitespace-pre-wrap break-words text-sm">{i.notes}</p>{i.next_due_date&&<p className="text-sm text-muted-foreground">Next due: {i.next_due_date}</p>}</article>)}</section>}
  </>}
 </section>;
}
