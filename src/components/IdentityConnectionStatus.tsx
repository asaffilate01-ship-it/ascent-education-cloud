import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
export default function IdentityConnectionStatus(){
 const {user}=useAuth();const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setMessage('');},[user?.id]);
 async function check(){setBusy(true);try{const result=await supabase.functions.invoke('nadra-identity-connector',{body:{action:'status'}});if(result.error)throw result.error;setMessage(result.data?.message||'Connection status unavailable.');}catch{setMessage('Connection status could not be checked. Ask admissions to review your identity documents.');}finally{setBusy(false);}}
 return <section className="mb-5 rounded-xl border bg-card p-5"><h2 className="font-semibold">Pakistan identity verification</h2><p className="mt-2 text-sm text-muted-foreground">Upload your CNIC, juvenile card or B-form as appropriate for admissions review. Document review and NADRA verification are separate. Live NADRA checks require UniPathway’s approved institutional connection and the required consent process.</p><Button className="mt-3" variant="outline" disabled={busy} onClick={()=>void check()}>{busy?'Checking…':'Check NADRA connection'}</Button>{message&&<p role="status" className="mt-3 text-sm">{message}</p>}</section>;
}
