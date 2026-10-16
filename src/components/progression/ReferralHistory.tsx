import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
type Entry={id:string;action:string;old_status:string|null;new_status:string|null;actor_id:string|null;created_at:string};
export default function ReferralHistory({tenant,referral,entityTable="international_partner_referrals"}:{tenant:string;referral:string;entityTable?:"international_partner_referrals"|"international_support_tasks"|"international_partner_agreements"}){
 const [open,setOpen]=useState(false),[entries,setEntries]=useState<Entry[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(false),[page,setPage]=useState(0),[more,setMore]=useState(false);
 useEffect(()=>{setOpen(false);setEntries([]);setPage(0);},[tenant,referral]);
 useEffect(()=>{
  if(!open)return;let active=true;setLoading(true);setError(false);setEntries([]);
  void (async()=>{try{
   const result=await supabase.from('international_partner_audit').select('id,action,old_status,new_status,actor_id,created_at').eq('tenant_id',tenant).eq('entity_table',entityTable).eq('entity_id',referral).order('created_at',{ascending:false}).order('id',{ascending:false}).range(page*20,page*20+20);
   if(!active)return;if(result.error)throw result.error;
   setEntries((result.data||[]).slice(0,20));setMore((result.data||[]).length>20);
  }catch{if(active)setError(true);}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[open,page,tenant,referral,entityTable]);
 return <div className="space-y-2"><Button type="button" variant="outline" aria-expanded={open} onClick={()=>{setOpen(!open);setPage(0);}}>{open?'Hide history':entityTable==='international_support_tasks'?'View task history':entityTable==='international_partner_agreements'?'View agreement history':'View case history'}</Button>{open&&<div className="text-sm space-y-2">
  {loading?<p role="status">Loading history…</p>:error?<p role="alert">History could not be loaded. Close and reopen to retry.</p>:<>
   {!entries.length&&<p>No recorded history is available.</p>}
   <ol className="space-y-2">{entries.map(e=><li key={e.id} className="border-l-2 pl-3"><time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString()}</time><p>{e.action==='INSERT'?'Record created':e.old_status===e.new_status?`Details updated · ${e.new_status||'Unknown'}`:`${e.old_status||'Unknown'} → ${e.new_status||'Unknown'}`}</p><p className="text-muted-foreground break-all">Actor: {e.actor_id||'System'}</p></li>)}</ol>
   <div className="flex gap-2"><Button type="button" variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Newer events</Button><Button type="button" variant="outline" disabled={!more} onClick={()=>setPage(p=>p+1)}>Older events</Button></div>
  </>}
 </div>}</div>;
}
