import {useEffect,useRef,useState} from 'react';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
const marks=['present','late','absent','excused'];
type Props={record?:{id:string;status:string};requestId?:string;onSaved?:()=>void};
/** Freeze the exact request after dispatch so an uncertain response can be retried safely. */
export default function AttendanceCorrectionForm({record,requestId,onSaved}:Props){
 const [choice,setChoice]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 const [pending,setPending]=useState<Record<string,string>|null>(null);
 const mounted=useRef(true),running=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function submit(){
  if(running.current||done)return;
  const payload=pending||(record?{p_id:crypto.randomUUID(),p_record:record.id,p_status:choice,p_reason:reason.trim()}:{p_id:requestId!,p_decision:choice,p_reason:reason.trim()});
  running.current=true;setBusy(true);setPending(payload);setMessage('');
  try{
   const result=await db.rpc(record?'request_attendance_correction':'review_attendance_correction',payload);
   if(!mounted.current)return;
   if(result.error||result.data!==payload.p_id)throw Error('Unconfirmed');
   setDone(true);setPending(null);setMessage(record?'Correction requested. The saved mark stays unchanged until approved.':'Review saved. Attendance and correction history are updated.');onSaved?.();
  }catch{if(mounted.current)setMessage('Could not confirm the save. Retry the same details, or refresh correction history to check whether it was saved. A pending request or changed mark may require administrator review.');}
  finally{running.current=false;if(mounted.current)setBusy(false);}
 }
 return <div className="mt-3 space-y-3 rounded border p-3">
 <label className="block">{record?'Requested mark':'Review decision'}<select className="ml-2 rounded border bg-background p-2" disabled={busy||done||!!pending} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose {record?'a different mark':'a decision'}</option>{(record?marks.filter(m=>m!==record.status):['approved','rejected']).map(m=><option key={m} value={m}>{m}</option>)}</select></label>
 <label className="block">{record?'Reason for correction':'Reason for decision'}<Textarea maxLength={2000} value={reason} disabled={busy||done||!!pending} onChange={e=>setReason(e.target.value)}/></label>
 <p className="text-sm text-muted-foreground">Give 10–2,000 characters. The reason becomes part of the attendance audit history.</p>
 <Button disabled={busy||done||!choice||reason.trim().length<10} onClick={()=>void submit()}>{busy?'Saving…':pending?'Retry same details':record?'Request correction':'Save review'}</Button>
 {message&&<p role="status">{message}</p>}
 </div>;
}
