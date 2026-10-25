import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Scope='attendance'|'schedule'|'communication'|'results';
type Consent={id:string;parent_name:string;verified:boolean;scopes:Scope[]};
type Choice={link:string;scope:Scope;share:boolean};
export default function GuardianConsentPanel({results=false}:{results?:boolean}){
 const {user}=useAuth();
 return <Panel key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}:${results}`} results={results}/>;
}
function Panel({results}:{results:boolean}){
 const [links,setLinks]=useState<Consent[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[pending,setPending]=useState<Choice|null>(null);
 const alive=useRef(true),running=useRef(false),desired=useRef<Choice|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;setLoading(true);setLinks([]);setError('');
  void(async()=>{try{
   const r=await db.rpc(results?'get_unipathway_guardian_sharing':'get_unipathway_guardian_scopes');
   if(!active)return;
   if(r.error||!Array.isArray(r.data)||r.data.some(l=>!l||typeof l.id!=='string'||typeof l.parent_name!=='string'||typeof l.verified!=='boolean'||(results?typeof l.sharing!=='boolean':!Array.isArray(l.scopes)||l.scopes.some((s:string)=>!['attendance','schedule','communication'].includes(s)))))throw Error('Unverified');
   const verified:Consent[]=r.data.map(l=>({...l,scopes:results?(l.sharing?['results']:[]):l.scopes}));
   setLinks(verified);
   const wanted=desired.current;
   if(wanted){const link=verified.find(l=>l.id===wanted.link);
    if(!link||link.scopes.includes(wanted.scope)===wanted.share){desired.current=null;setPending(null);setNotice(link?'Permission change verified.':'This guardian link is no longer available. Check with admissions.');}
    else setError('The requested permission is not yet verified. Retry the same change or refresh again.');
   }
  }catch{if(active)setError('Guardian permissions could not be verified. Refresh to check the current state.');}
  finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[results,revision]);
 async function change(choice:Choice){
  if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');desired.current=choice;setPending(choice);
  try{
   const r=await db.rpc(results?'set_unipathway_guardian_result_sharing':'set_unipathway_guardian_scope',results?{p_link:choice.link,p_share:choice.share}:{p_link:choice.link,p_scope:choice.scope,p_share:choice.share});
   if(!alive.current)return;
   if(r.error)throw Error('Unconfirmed');
   setRevision(v=>v+1);
  }catch{if(alive.current)setError('The permission change could not be confirmed. It may have been saved. Refresh to check, or retry the same change.');}
  finally{running.current=false;if(alive.current)setBusy(false);}
 }
 const scopes:Scope[]=results?['results']:['attendance','schedule','communication'];
 return <section className="my-5 space-y-3 rounded-xl border p-5"><h2 className="font-semibold">{results?'Parent or guardian result sharing':'Other parent and guardian permissions'}</h2><p className="text-sm">{results?'Choose whether a verified guardian can see released scores, feedback and approved corrections.':'Choose each permission separately. Schedule sharing does not share Teams joining links. Communication enables a private discussion with authorised centre staff.'} Stopping sharing ends future access; previously saved copies cannot be recalled.</p>
 <Button variant="outline" disabled={busy||loading} onClick={()=>setRevision(v=>v+1)}>{results?'Refresh result sharing':'Refresh permissions'}</Button>
 {loading&&<p role="status">Checking sharing preferences…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {pending&&<div className="rounded border p-3"><p>Unconfirmed choice: {pending.share?'share':'stop sharing'} {pending.scope}.</p><Button disabled={busy||loading} onClick={()=>void change(pending)}>Retry same permission change</Button></div>}
 {!loading&&!error&&!links.length&&<p>No parent or guardian links. Contact admissions to arrange a verified link.</p>}
 {!loading&&links.map(l=><div className="border-t pt-3" key={l.id}><p>{l.parent_name} · {l.verified?'Centre verified':'Awaiting verification'}</p>{results&&<p className="text-sm">{l.scopes.includes('results')?'Released results shared':'Results private'}</p>}<div className="mt-2 flex flex-wrap gap-2">{scopes.map(scope=><Button key={scope} size="sm" variant={l.scopes.includes(scope)?'outline':'default'} disabled={busy||!!pending||(!l.verified&&!l.scopes.includes(scope))} onClick={()=>void change({link:l.id,scope,share:!l.scopes.includes(scope)})}>{results?(l.scopes.includes(scope)?'Stop sharing':'Share released results'):`${l.scopes.includes(scope)?'Stop sharing':'Share'} ${scope}`}</Button>)}</div></div>)}
 </section>;
}
