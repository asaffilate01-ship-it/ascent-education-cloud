import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {physicalSecurityScope,PHYSICAL_SECURITY_ENABLED} from '@/lib/physicalSecurity';
import {pakistanCalendarDate} from '@/lib/facilitiesPlanning';
import {facilitiesMaintenanceRows,maintenanceCounts,type MaintenanceTiming} from '@/lib/facilitiesMaintenance';
import {verifyFacilitiesRegister,type FacilityRegister} from '@/lib/facilitiesRegister';
import {FACILITIES_WRITE_ENABLED,facilitiesWriterScope} from '@/lib/facilitiesCommands';
import FacilitiesRecordCommands from '@/components/security/FacilitiesRecordCommands';

const enabled=import.meta.env.VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED==='true';
const timingLabels:Record<MaintenanceTiming,string>={overdue:'Overdue',due_today:'Due today',next_seven_days:'Next seven days',later:'Later',unscheduled:'Next date not recorded'};
const filters=[['all','All assets'],['defects','Recorded defects'],['due','Overdue or due today'],['next_seven_days','Next seven days'],['unscheduled','Next date not recorded'],['unverified','Inspection evidence required']] as const;
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
 const [filter,setFilter]=useState('all');
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
 const rows=snapshot?facilitiesMaintenanceRows(snapshot,today):[];
 const counts=maintenanceCounts(rows);
 const visible=rows.filter(row=>{
  const a=row.asset;
  const matches=[a.asset_code,a.category.replace(/_/g,' '),a.location].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  return matches&&(filter==='all'||(filter==='defects'&&row.recordedDefect)||(filter==='due'&&['overdue','due_today'].includes(row.timing))||(filter==='unverified'&&row.needsEvidence)||row.timing===filter);
 });
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
   <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Registered assets',snapshot.assets.length],['Latest recorded defects',counts.defects],['Overdue or due today',counts.due],['Due within seven days',counts.soon],['Next date not recorded',counts.unscheduled],['Inspection evidence required',counts.unverified]].map(([label,n])=><article className="rounded-lg border p-3" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{n}</p></article>)}</div>
   <div className="mt-4 rounded-xl border p-3 sm:p-4">
    <h3 className="font-semibold">Maintenance and inspection review queue</h3>
    <p className="mt-2 text-sm text-muted-foreground">Latest recorded defects appear first, followed by inspection dates. Categories can overlap. A recorded outcome is not an independent safety certification; the queue does not issue alerts or confirm completed repairs.</p>
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm font-medium">Find an asset<Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Asset reference, category or location"/></label><label className="block min-w-0 text-sm font-medium">Inspection review filter<select className="mt-1 min-h-11 w-full min-w-0 rounded-lg border bg-background px-3" value={filter} onChange={e=>setFilter(e.target.value)}>{filters.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-muted-foreground">{visible.length} of {rows.length} registered assets shown · Pakistan date: {today}</p>{(search||filter!=='all')&&<Button variant="outline" onClick={()=>{setSearch('');setFilter('all');}}>Clear filters</Button>}</div>
   </div>
   {!visible.length&&<p className="mt-3 text-sm">{snapshot.assets.length?'No matching assets.':'No registered assets were returned for this verified centre.'}</p>}
   <div className="mt-3 divide-y">{visible.map(({asset:a,latest,dueDate,timing})=>{
    return <article key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0 flex-1 break-words"><p className="font-medium">{a.asset_code} · {a.category.replace(/_/g,' ')}</p><p className="text-sm text-muted-foreground">{a.location} · {dueDate?'Inspection due '+dueDate+' ('+timingLabels[timing]+')':timingLabels[timing]}</p><p className="text-sm">{latest?'Latest recorded outcome: '+latest.outcome.replace(/_/g,' '):'No inspection recorded'}</p></div><Button variant="outline" onClick={()=>setSelected(s=>s===a.id?'':a.id)} aria-expanded={selected===a.id}>{selected===a.id?'Close history':'View history'}</Button></article>;
   })}</div>
   {asset&&<section className="mt-4 rounded-lg border p-4" aria-label={`Inspection history for ${asset.asset_code}`}><h3 className="font-semibold">Inspection history — {asset.asset_code}</h3>{history.length===0&&<p className="mt-2 text-sm">No inspection history recorded.</p>}{history.map(i=><article key={i.id} className="border-b py-3 last:border-0"><p className="font-medium">{i.inspected_on} · {i.outcome.replace(/_/g,' ')}</p><p className="whitespace-pre-wrap break-words text-sm">{i.notes}</p>{i.next_due_date&&<p className="text-sm text-muted-foreground">Next due: {i.next_due_date}</p>}</article>)}</section>}
  </>}
 </section>;
}
