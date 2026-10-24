import {GuardianScopeSharing} from '@/components/guardian/GuardianAccess';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Sharing={id:string;parent_name:string;verified:boolean;sharing:boolean};
export default function GuardianResultSharing(){
 const {user}=useAuth();const [links,setLinks]=useState<Sharing[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLinks([]);setLoading(true);setError('');
  if(!user?.id){setLoading(false);return;}
  void (async()=>{try{const r=await db.rpc('get_unipathway_guardian_sharing');if(r.error)throw r.error;
   if(active)setLinks(r.data||[]);
  }catch{if(active)setError('Sharing preferences could not be verified. Please retry.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[user?.id,refresh]);
 async function change(link:Sharing){setBusy(link.id);setError('');try{
  const r=await db.rpc('set_unipathway_guardian_result_sharing',{p_link:link.id,p_share:!link.sharing});if(r.error)throw r.error;
  setRefresh(x=>x+1);
 }catch{setError('The sharing change was not saved. Please retry or contact your centre.');}finally{setBusy('');}}
 return <><GuardianScopeSharing/><section className="my-5 rounded-xl border bg-card p-5" aria-labelledby="guardian-sharing-heading">
  <h2 id="guardian-sharing-heading" className="font-semibold">Parent or guardian result sharing</h2>
  <p className="mt-2 text-sm text-muted-foreground">You choose whether a centre-verified parent or guardian can see your released coursework scores and feedback. Sharing includes future released results and approved corrections. You can stop future access here; copies already saved cannot be recalled.</p>
  {loading&&<p role="status" className="mt-3 text-sm">Checking sharing preferences…</p>}
  {error&&<div role="alert" className="mt-3 text-sm text-destructive">{error} <Button variant="outline" size="sm" disabled={!!busy} onClick={()=>setRefresh(x=>x+1)}>Retry</Button></div>}
  {!loading&&!error&&!links.length&&<p className="mt-3 text-sm text-muted-foreground">No parent or guardian links. Contact admissions to arrange a verified link.</p>}
  {!loading&&links.map(link=><div key={link.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
   <div><p className="font-medium">{link.parent_name}</p><p className="text-sm text-muted-foreground">{!link.verified?'Awaiting centre verification':link.sharing?'Released results shared':'Results private'}</p></div>
   <Button variant={link.sharing?'outline':'default'} disabled={!!busy||(!link.verified&&!link.sharing)} onClick={()=>void change(link)}>{busy===link.id?'Saving…':link.sharing?'Stop sharing':'Share released results'}</Button>
  </div>)}
 </section></>;
}
