import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {db} from '@/lib/db';
import {facilitiesCategories,pakistanCalendarDate,type InspectionDraft,type FacilitiesCategory} from '@/lib/facilitiesPlanning';
import {assetCommandPayload,inspectionCommandPayload,inspectionOutcomes,verifyFacilitiesCommandReceipt,type FacilitiesCommand,type InspectionEntry,type InspectionOutcome} from '@/lib/facilitiesCommands';
import type {FacilityRegister} from '@/lib/facilitiesRegister';

const emptyAsset:InspectionDraft={category:'fire_alarm',assetCode:'',location:'',dueDate:''};
const emptyInspection=():InspectionEntry=>({assetId:'',date:pakistanCalendarDate(),outcome:'not_verified',notes:'',nextDue:''});
const field='mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2';
export default function FacilitiesRecordCommands({tenant,snapshot,refresh}:{tenant:string;snapshot:FacilityRegister|null;refresh:()=>void}){
 const [asset,setAsset]=useState(emptyAsset);
 const [inspection,setInspection]=useState(emptyInspection);
 const [pending,setPending]=useState<FacilitiesCommand|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const lock=useRef(false),alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const today=pakistanCalendarDate();
 async function send(command:FacilitiesCommand){
  if(lock.current||!alive.current)return;
  lock.current=true;setBusy(true);setPending(command);setError('');setNotice('');
  try{
   const {data,error:e}=await db.rpc('unipathway_record_facilities_item',{p_tenant:tenant,p_request_id:command.requestId,p_kind:command.kind,p_payload:command.payload});
   if(e)throw e;
   const recordId=verifyFacilitiesCommandReceipt(data,tenant,command);
   if(!alive.current)return;
   setPending(null);
   if(command.kind==='asset')setAsset(emptyAsset);else setInspection(emptyInspection());
   setNotice('Database acknowledged the '+(command.kind==='asset'?'asset registration':'inspection record')+'. Reference: '+recordId+'. Review the refreshed register.');
   refresh();
  }catch{
   if(alive.current){setError('The result could not be confirmed. The request may have reached the centre database. Review the register; retry only this same request or have an authorised operator reconcile it.');refresh();}
  }finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>,kind:FacilitiesCommand['kind']){
  event.preventDefault();
  if(!snapshot||pending||lock.current)return;
  try{
   const payload=kind==='asset'?assetCommandPayload(asset,snapshot):inspectionCommandPayload(inspection,snapshot,today);
   void send({kind,payload,requestId:crypto.randomUUID()});
  }catch(e){setError(e instanceof Error?e.message:'Invalid facilities record.');}
 }
 const locked=busy||!!pending||!snapshot;
 return <section className="mt-5 min-w-0 rounded-xl border p-4 sm:p-5" aria-labelledby="facilities-record-commands">
  <h3 id="facilities-record-commands" className="font-semibold">Record centre facilities</h3>
  <p className="mt-2 text-sm text-muted-foreground">Authorised centre directors can register actual assets and append observed inspection results. The server must confirm write activation and current permissions. Do not enter personal identifiers, credentials or unsupported safety certifications.</p>
  {!snapshot&&<p className="mt-3 text-sm">Verify the centre register before creating another record.</p>}
  {error&&<p role="alert" className="mt-3 rounded-lg border p-3 text-sm text-destructive">{error}</p>}
  {notice&&<p role="status" className="mt-3 break-words rounded-lg border p-3 text-sm">{notice}</p>}
  {pending&&<div className="mt-4 space-y-3 rounded-lg border p-3"><p className="text-sm font-semibold">{busy?'Recording request':'Request awaiting confirmation'}</p><p className="break-all text-xs text-muted-foreground">Request reference: {pending.requestId}</p><p className="text-sm">The exact request is retained in this workspace only. Do not reload or start another request until reconciled. Retrying uses the same identifier and details.</p><Button type="button" variant="outline" disabled={busy} onClick={()=>void send(pending)}>Retry same request</Button></div>}
  <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
   <form onSubmit={e=>submit(e,'asset')} className="min-w-0 rounded-lg border p-4">
    <fieldset disabled={locked||((snapshot?.assets.length??0)>=500)} className="min-w-0 space-y-3">
     <legend className="font-semibold">Register equipment</legend>
     <label className="block text-sm font-medium">Equipment category<select className={field} value={asset.category} onChange={e=>setAsset(a=>({...a,category:e.target.value as FacilitiesCategory}))}>{facilitiesCategories.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}</select></label>
     <label className="block text-sm font-medium">Asset reference<Input className="mt-1" required maxLength={80} value={asset.assetCode} onChange={e=>setAsset(a=>({...a,assetCode:e.target.value}))}/></label>
     <label className="block text-sm font-medium">Confirmed location<Input className="mt-1" required maxLength={160} value={asset.location} onChange={e=>setAsset(a=>({...a,location:e.target.value}))}/></label>
     <label className="block text-sm font-medium">Planned inspection date (Pakistan)<Input className="mt-1" required type="date" value={asset.dueDate} onChange={e=>setAsset(a=>({...a,dueDate:e.target.value}))}/></label>
     <Button type="submit" className="min-h-11 w-full sm:w-auto">Register asset</Button>
    </fieldset>
   </form>
   <form onSubmit={e=>submit(e,'inspection')} className="min-w-0 rounded-lg border p-4">
    <fieldset disabled={locked||!snapshot?.assets.length||((snapshot?.inspections.length??0)>=1000)} className="min-w-0 space-y-3">
     <legend className="font-semibold">Append inspection result</legend>
     <label className="block text-sm font-medium">Registered asset<select className={field} required value={inspection.assetId} onChange={e=>setInspection(a=>({...a,assetId:e.target.value}))}><option value="">Choose a verified asset</option>{snapshot?.assets.map(a=><option value={a.id} key={a.id}>{a.asset_code} — {a.location}</option>)}</select></label>
     <label className="block text-sm font-medium">Date inspected (Pakistan)<Input className="mt-1" required type="date" max={today} value={inspection.date} onChange={e=>setInspection(a=>({...a,date:e.target.value}))}/></label>
     <label className="block text-sm font-medium">Observed outcome<select className={field} value={inspection.outcome} onChange={e=>setInspection(a=>({...a,outcome:e.target.value as InspectionOutcome}))}>{inspectionOutcomes.map(o=><option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}</select></label>
     <label className="block text-sm font-medium">Factual inspection notes<textarea className={field} required rows={3} maxLength={2000} value={inspection.notes} onChange={e=>setInspection(a=>({...a,notes:e.target.value}))}/></label>
     <label className="block text-sm font-medium">Next inspection due (optional)<Input className="mt-1" type="date" min={inspection.date} value={inspection.nextDue} onChange={e=>setInspection(a=>({...a,nextDue:e.target.value}))}/></label>
     <Button type="submit" className="min-h-11 w-full sm:w-auto">Record inspection</Button>
    </fieldset>
   </form>
  </div>
  <p className="mt-3 text-xs text-muted-foreground">Records are append-only. Capacity: 500 assets and 1,000 inspections per centre under the current verified snapshot contract. Use a separately reviewed report or retention workflow before reaching the limit.</p>
 </section>;
}
