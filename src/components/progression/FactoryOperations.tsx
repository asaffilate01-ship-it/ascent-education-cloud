import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {workflowRows} from '@/lib/workflowRows';
import {factoryQueueState,queueLabels,factoryBatchResult,factoryDispatchError,localProcessingCount,type FactoryQueueEvent} from '@/lib/factoryQueue';
export default function FactoryOperations(){
 const {user}=useAuth();const allowed=user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 return allowed&&user?.tenantId?<Queue key={`${user.tenantId}-${user.id}`} tenant={user.tenantId}/>:null;
}
function Queue({tenant}:{tenant:string}){
 const [rows,setRows]=useState<FactoryQueueEvent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[operationError,setOperationError]=useState('');
 const [filter,setFilter]=useState('all'),[page,setPage]=useState(0),[now,setNow]=useState(Date.now());
 const generation=useRef(0),active=useRef(false),processing=useRef(false);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);setError('');setRows([]);
  const result=await workflowRows(supabase,'omniqora_event_outbox',tenant,()=>token===generation.current,'id,event_type,status,attempts,processed_at,created_at,exported_at,lease_until,next_attempt_at,factory_run_id,last_error');
  if(token!==generation.current)return;
  if(result.error)setError('Event queue unavailable. Check migrations and centre access, then retry.');else{setRows(result.data as FactoryQueueEvent[]);setNow(Date.now());}
  setLoading(false);
 },[tenant]);
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;generation.current++;};},[load]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 async function process(remote:boolean){
  if(processing.current||loading||error)return;processing.current=true;setBusy(true);setMessage('');setOperationError('');
  try{
   if(remote){const result=await supabase.functions.invoke('omniqora-factory-dispatch',{body:{tenantId:tenant}});if(!active.current)return;if(result.error)throw new Error(await factoryDispatchError(result.error));
    const receipt=factoryBatchResult(result.data);setMessage(`${receipt.localProcessed} processed locally; ${receipt.accepted} accepted by Factory; ${receipt.failed} delivery failures recorded. Refresh the rows for retry or operator-action status.`);
   }else{const result=await supabase.rpc('process_local_education_events',{p_tenant:tenant,p_limit:100});if(!active.current)return;if(result.error)throw new Error('Local processing failed. Check centre permissions and deployment.');setMessage(`${localProcessingCount(result.data)} events added to the local event log. This does not calculate new intelligence scores.`);}
  }catch(e){if(active.current)setOperationError(e instanceof Error?e.message:'Processing result could not be confirmed.');}
  finally{if(active.current){await load();if(active.current)setBusy(false);}processing.current=false;}
 }
 const filtered=rows.filter(r=>filter==='all'||factoryQueueState(r,now)===filter),last=Math.max(0,Math.ceil(filtered.length/20)-1),current=Math.min(page,last);
 return <section className="surface-card p-5 mb-5 space-y-4"><h2 className="font-semibold">Factory event connection</h2><p className="text-sm text-muted-foreground">Acceptance records a Factory receipt, not a completed intelligence job. Delivery requires an enabled centre connection and server-side credentials.</p>
 {message&&<p role="status">{message}</p>}{operationError&&<p role="alert" className="text-destructive">{operationError}</p>}
 {loading?<p role="status">Loading event queue…</p>:error?<p role="alert">{error}</p>:<>
 <div className="grid sm:grid-cols-3 gap-2">{Object.entries(queueLabels).map(([key,label])=><p key={key} className="rounded border p-2 text-sm">{label}: <strong>{rows.filter(r=>factoryQueueState(r,now)===key).length}</strong></p>)}</div>
 <p className="text-xs text-muted-foreground">Counts cover this loaded snapshot. Live leases and retry delays are recalculated locally; refresh to see other workers’ changes.</p>
 <label>Delivery state<select className="ml-2 border rounded p-2" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">All events</option>{Object.entries(queueLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 {!filtered.length&&<p>No events match this delivery state.</p>}
 <div className="space-y-2">{filtered.slice(current*20,current*20+20).map(r=><article key={r.id} className="rounded border p-3 space-y-1 text-sm"><h3 className="font-medium">{r.event_type}</h3><p>{queueLabels[factoryQueueState(r,now)]} · Attempts: {r.attempts}/10</p><p className="break-all">Event: {r.id}</p><p>Created: {new Date(r.created_at).toLocaleString()}</p>{r.processed_at&&<p>Local event recorded: {new Date(r.processed_at).toLocaleString()}</p>}{factoryQueueState(r,now)==='backoff'&&<p>Next retry eligible: {new Date(r.next_attempt_at).toLocaleString()}</p>}{factoryQueueState(r,now)==='leased'&&<p>Worker lease until: {new Date(r.lease_until!).toLocaleString()}</p>}{factoryQueueState(r,now)==='attention'&&<p>Inspect worker logs and resolve the cause. Automatic delivery will not bypass the attempt limit.</p>}{r.factory_run_id&&<p className="break-all">Factory receipt: {r.factory_run_id}</p>}{r.exported_at&&<p>Accepted: {new Date(r.exported_at).toLocaleString()}</p>}{r.last_error&&<p className="text-destructive">Last delivery error: {r.last_error}</p>}</article>)}</div>
 <div className="flex gap-2 items-center"><Button variant="outline" disabled={current===0||busy} onClick={()=>setPage(current-1)}>Previous events</Button><span className="text-sm">Page {current+1} of {last+1}</span><Button variant="outline" disabled={current===last||busy} onClick={()=>setPage(current+1)}>Next events</Button></div>
 </>}
 <div className="flex flex-wrap gap-2"><Button disabled={busy||loading||!!error} onClick={()=>void process(false)}>Process local signals</Button><Button variant="outline" disabled={busy||loading||!!error} onClick={()=>void process(true)}>Deliver next Factory batch</Button><Button variant="outline" disabled={busy||loading} onClick={()=>void load()}>Refresh event queue</Button></div>
 </section>;
}
