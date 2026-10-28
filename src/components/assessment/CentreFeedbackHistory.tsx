import {useEffect,useId,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Props={feedbackId:string;title:string;revision:number};
type Decision={id:string;feedback_id:string;tenant_id:string;actor_id:string;revision:number;status:'proposed'|'approved'|'withdrawn';reference:string;created_at:string};
export default function CentreFeedbackHistory(props:Props){
 const {user}=useAuth();
 return <History key={`${user?.id}:${user?.tenantId}:${user?.role}:${props.feedbackId}`} {...props} owner={user?.id} tenant={user?.tenantId}/>;
}
function History({feedbackId,title,revision,owner,tenant}:Props&{owner?:string;tenant?:string}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
 const [result,setResult]=useState<{key:string;rows:Decision[];error:boolean}|null>(null);
 const contentId=useId(),key=`${page}:${refresh}:${revision}`,ready=result?.key===key,loading=open&&!ready;
 useEffect(()=>{
  if(!open||!owner||!tenant)return;let active=true;
  void Promise.resolve(db.from('uni_centre_feedback_events').select('id,feedback_id,tenant_id,actor_id,revision,status,reference,created_at').eq('feedback_id',feedbackId).eq('tenant_id',tenant).order('revision',{ascending:false}).range(page*5,page*5+5))
   .then(r=>{
    if(!active)return;
    if(r.error||!Array.isArray(r.data)||!r.data.every((row:Decision)=>row&&row.feedback_id===feedbackId&&row.tenant_id===tenant&&typeof row.id==='string'&&row.id.length>0&&typeof row.actor_id==='string'&&row.actor_id.length>0&&Number.isInteger(row.revision)&&row.revision>0&&['proposed','approved','withdrawn'].includes(row.status)&&typeof row.reference==='string'&&typeof row.created_at==='string'&&Number.isFinite(Date.parse(row.created_at))))throw Error('Unverified history');
    setResult({key,rows:r.data,error:false});
   }).catch(()=>{if(active)setResult({key,rows:[],error:true});});
  return()=>{active=false;};
 },[open,owner,tenant,feedbackId,page,key]);
 const rows=ready?result.rows:[];
 return <section aria-label={`Decision history for ${title}`} className="min-w-0 space-y-2 border-t pt-3">
  <Button variant="outline" aria-expanded={open} aria-controls={contentId} aria-label={`${open?'Hide':'View'} decision history for ${title}`} disabled={!owner||!tenant} onClick={()=>{setOpen(v=>!v);setPage(0);setResult(null);}}>{open?'Hide decision history':'View decision history'}</Button>
  <div id={contentId} hidden={!open} aria-busy={loading} className="min-w-0 space-y-3">{open&&<>
   <p className="text-sm text-muted-foreground">Recorded decisions only. Historical approval is not current permission to use wording; insertion rechecks current approval. Viewing history changes no phrase, draft or mark.</p>
   <Button variant="ghost" disabled={loading} onClick={()=>{setPage(0);setRefresh(n=>n+1);}}>Refresh decision history</Button>
   {loading?<p role="status">Loading recorded decisions…</p>:result?.error?<p role="alert">Decision history could not be verified. Refresh to retry. No decisions have been inferred.</p>:<>
    <p role="status" className="text-sm text-muted-foreground">{rows.length?`Page ${page+1} · ${Math.min(rows.length,5)} recorded decisions, newest first.`:'No recorded decisions are available to this account on this page.'}</p>
    <ol className="space-y-3" aria-label={`Recorded decisions for ${title}`}>{rows.slice(0,5).map(row=><li key={row.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm [overflow-wrap:anywhere]">
     <h4 className="font-semibold">Revision {row.revision} · {row.status}</h4>
     <p>Recorded <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time></p>
     <p>Account reference: {row.actor_id===owner?'Your account · ':''}<span className="font-mono">{row.actor_id}</span></p>
     <p className="whitespace-pre-wrap">Reference: {row.reference}</p>
    </li>)}</ol>
    {(page>0||rows.length>5)&&<nav aria-label={`Decision history pages for ${title}`} className="flex flex-wrap gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Newer decisions</Button><Button variant="outline" disabled={rows.length<=5} onClick={()=>setPage(p=>p+1)}>Older decisions</Button></nav>}
   </>}
  </>}</div>
 </section>;
}
