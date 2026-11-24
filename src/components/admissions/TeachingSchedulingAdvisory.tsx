import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
type Mode='online'|'centre'|'both';
type Result={count:number;assignedInOptions:boolean;asOf:string};
const enabled=import.meta.env.VITE_UNIPATHWAY_TEACHING_SCHEDULER_ENABLED==='true';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readSchedulingReceipt(raw:unknown,moduleId:string,lecturerId:string,slot:{date:string;start:string;end:string;mode:Mode;room:string}):Result{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid advisory receipt');
 const r=raw as Record<string,unknown>;
 if(r.schemaVersion!=='2026-11-24-v1'||r.mode!=='deterministic-advisory'||r.moduleId!==moduleId||typeof r.asOf!=='string'||!Number.isFinite(Date.parse(r.asOf))||!Array.isArray(r.proposals)||r.proposals.length>5)throw Error('Invalid advisory receipt');
 const seen=new Set<string>();
 for(const p of r.proposals){
  if(!p||typeof p.userId!=='string'||!uuid.test(p.userId)||seen.has(p.userId)||p.slotIndex!==0||!p.slot||Object.entries(slot).some(([k,v])=>p.slot[k]!==v))throw Error('Unverified slot recommendation');
  seen.add(p.userId);
 }
 return {count:seen.size,assignedInOptions:seen.has(lecturerId),asOf:r.asOf};
}
export default function TeachingSchedulingAdvisory(props:{moduleId:string;lecturerId:string;date:string;start:string;end:string;room:string;cohort:string}){
 const {moduleId,lecturerId,date,start,end,room,cohort}=props;
 const [mode,setMode]=useState<Mode|''>(''),[result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function check(){
  if(!enabled||!mode||lock.current||(mode!=='online'&&(!room.trim()||room.trim().toLowerCase()==='virtual')))return;
  lock.current=true;setBusy(true);setResult(null);setError('');
  try{
   const slot={date,start,end,mode,room:room.trim()};
   const r=await supabase.functions.invoke('teaching-scheduler-agent',{body:{moduleId,cohortReference:cohort.trim(),requiredSlots:[slot]}});
   if(r.error)throw Error();
   const checked=readSchedulingReceipt(r.data,moduleId,lecturerId,slot);
   if(alive.current)setResult(checked);
  }catch{if(alive.current)setError('Scheduling evidence could not be verified. Check the service activation and approved roster before retrying.');}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="mt-4 space-y-3 rounded-xl border bg-card p-4" aria-label="Academic scheduling advisory">
  <h3 className="font-semibold">Academic scheduling advisory</h3><p className="text-sm text-muted-foreground">Check the first proposed date, {date}, against recorded module eligibility, applicant-declared availability and accessible bookings. This does not reserve a room, assign a lecturer or approve a timetable.</p>
  {!enabled?<p className="text-sm">This service requires centre activation and a verified academic roster.</p>:<>
  <label className="block text-sm font-medium">Delivery mode for advisory<select className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3" value={mode} disabled={busy} onChange={e=>{setMode(e.target.value as Mode|'');setResult(null);setError('');}}><option value="">Select mode</option><option value="online">Online</option><option value="centre">Classroom</option><option value="both">Hybrid</option></select></label>
  {mode&&mode!=='online'&&(!room.trim()||room.trim().toLowerCase()==='virtual')&&<p className="text-sm">Enter the actual classroom name above before checking.</p>}
  <Button type="button" variant="outline" disabled={busy||!mode||(mode!=='online'&&(!room.trim()||room.trim().toLowerCase()==='virtual'))} onClick={()=>void check()}>{busy?'Checking records…':'Check proposed teaching slot'}</Button>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {result&&<div role="status" className="space-y-1 rounded-lg border p-3 text-sm"><p className="font-semibold">{result.count} ranked alternative(s) returned (maximum five)</p><p>{result.assignedInOptions?'Currently assigned lecturer appears in these alternatives.':'Currently assigned lecturer does not appear among the returned alternatives. This is not a finding of ineligibility.'}</p><p className="text-xs text-muted-foreground">Checked {new Date(result.asOf).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} PKT. Confirm current competencies, weekly workload, future dates, room capacity and live meeting availability separately.</p></div>}
  </>}
 </section>;
}
