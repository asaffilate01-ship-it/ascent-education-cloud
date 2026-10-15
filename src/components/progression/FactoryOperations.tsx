import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
export default function FactoryOperations(){
 const {user}=useAuth();const tenant=user?.tenantId;
 const allowed=user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 const [rows,setRows]=useState<{id:string;status:string;processed_at:string|null;attempts:number}[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setRows([]);setError('');if(!tenant||!allowed)return;const result=await supabase.from('omniqora_event_outbox').select('id,status,processed_at,attempts').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(250);if(result.error)setError('Event queue unavailable. Check migrations and access.');else setRows(result.data||[]);},[tenant,allowed]);
 useEffect(()=>{void load();},[load]);
 if(!allowed||!tenant)return null;
 async function process(remote:boolean){setBusy(true);try{
  if(remote){const result=await supabase.functions.invoke('omniqora-factory-dispatch',{body:{tenantId:tenant}});if(result.error)throw new Error('Factory dispatch unavailable. Check deployment, scoped connection and credentials.');toast.success(`${result.data.accepted} accepted by Factory; ${result.data.failed} waiting for retry.`);}
  else{const result=await supabase.rpc('process_local_education_events',{p_tenant:tenant,p_limit:100});if(result.error)throw result.error;toast.success(`${result.data} events added to local intelligence.`);}
  await load();
 }catch(e){toast.error((e as Error).message||'Processing failed');}finally{setBusy(false);}}
 return <section className="surface-card p-5 mb-5 space-y-3"><h2 className="font-semibold">Factory event connection</h2><p className="text-sm text-muted-foreground">Latest {rows.length} events: {rows.filter(r=>!r.processed_at).length} awaiting local processing · {rows.filter(r=>r.status==='exported').length} accepted by Factory · {rows.filter(r=>r.status==='failed').length} failed. Acceptance does not mean an intelligence job has completed.</p>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void process(false)}>Process local signals</Button><Button variant="outline" disabled={busy} onClick={()=>void process(true)}>Deliver next Factory batch</Button></div><p className="text-xs text-muted-foreground">Live delivery requires an enabled tenant-scoped connection. Events contain notification metadata only.</p></section>;
}
