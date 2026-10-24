import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
type Message={id:string;author_id:string;body:string;created_at:string;request_id:string|null};
export function GuardianDiscussion({linkId}:{linkId:string}) {
 const {user}=useAuth();
 return <Conversation key={`${user?.id}:${user?.tenantId}:${linkId}`} linkId={linkId} userId={user?.id}/>;
}
function Conversation({linkId,userId}:{linkId:string;userId?:string}) {
 const [messages,setMessages]=useState<Message[]>([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState(''),[sendError,setSendError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0),[page,setPage]=useState(0),[search,setSearch]=useState('');
 const pending=useRef<{id:string;body:string}|null>(null),sending=useRef(false);
 useEffect(()=>{let active=true;setMessages([]);setLoading(true);setLoadError('');
  void pagedRows<Message>(()=>db.from('unipathway_guardian_messages').select('id,author_id,body,created_at,request_id').eq('link_id',linkId),()=>active).then(rows=>{
   if(!active)return;rows.sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));setMessages(rows);setPage(Math.max(0,Math.ceil(rows.length/20)-1));setSearch('');
   if(pending.current&&rows.some(m=>m.author_id===userId&&m.request_id===pending.current?.id&&m.body===pending.current.body)){pending.current=null;setBody('');setSendError('');setNotice('Your message is confirmed in the conversation.');}
  }).catch(()=>{if(active)setLoadError('Conversation could not be verified. Refresh to retry.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[linkId,userId,refresh]);
 async function send(){
  if(sending.current||loading||loadError||!body.trim())return;
  sending.current=true;setBusy(true);setSendError('');setNotice('');
  pending.current ||= {id:crypto.randomUUID(),body:body.trim()};
  try{
   const r=await db.rpc('send_unipathway_guardian_message_once',{p_link:linkId,p_body:pending.current.body,p_request:pending.current.id});
   if(r.error||typeof r.data!=='string')throw Error('Unconfirmed');
   pending.current=null;setBody('');setNotice('Message saved.');setRefresh(v=>v+1);
  }catch{setSendError('Delivery could not be confirmed. Keep this page open. Refresh to check delivery or retry the same message safely.');}
  finally{sending.current=false;setBusy(false);}
 }
 const visible=messages.filter(m=>m.body.toLowerCase().includes(search.toLowerCase())),last=Math.max(0,Math.ceil(visible.length/20)-1),visiblePage=Math.min(page,last);
 return <div className="mt-4 space-y-3"><h3 className="font-semibold">Centre conversation</h3><p className="text-xs">In-app messages only. This does not send email, SMS or push notifications. Only messages you currently have permission to read are shown.</p>
  <Button variant="outline" disabled={busy||loading} onClick={()=>setRefresh(v=>v+1)}>Refresh conversation</Button>
  {loading&&<p role="status">Checking conversation access…</p>}{loadError&&<p role="alert">{loadError}</p>}{sendError&&<p role="alert">{sendError}</p>}{notice&&<p role="status">{notice}</p>}
  <label className="block text-sm">Search conversation<input className="mt-1 block w-full rounded border bg-background p-2" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>
  {!loading&&!loadError&&!visible.length&&<p>{search?'No messages match your search.':'No messages are currently available.'}</p>}
  <ol className="space-y-2">{visible.slice(visiblePage*20,visiblePage*20+20).map(m=><li key={m.id} className="rounded border p-3"><p className="text-xs">{m.author_id===userId?'You':'Centre / guardian'} · {new Date(m.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p></li>)}</ol>
  {visible.length>20&&<nav aria-label="Conversation pages" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={visiblePage===0} onClick={()=>setPage(visiblePage-1)}>Older messages</Button><span>Page {visiblePage+1} of {last+1} · {visible.length} messages</span><Button variant="outline" disabled={visiblePage===last} onClick={()=>setPage(visiblePage+1)}>Newer messages</Button></nav>}
  <label className="block text-sm">Message to centre or guardian<textarea value={body} maxLength={4000} disabled={busy||!!pending.current} onChange={e=>setBody(e.target.value)} className="mt-1 w-full rounded border bg-background p-2"/></label>
  <Button disabled={busy||loading||!!loadError||!body.trim()} onClick={()=>void send()}>{busy?'Saving message…':pending.current?'Retry same message':'Send message'}</Button>
  {pending.current&&!busy&&<Button className="ml-2" variant="outline" onClick={()=>{pending.current=null;setBody('');setSendError('');setNotice('Draft cleared. A message already saved in the conversation is not deleted.');}}>Clear draft</Button>}
 </div>;
}
