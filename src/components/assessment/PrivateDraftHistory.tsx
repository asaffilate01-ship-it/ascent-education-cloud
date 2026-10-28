import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Criterion={code:string;points:number;reason:string;evidence:string;missing:string};
export type PrivateDraftSnapshot={id:string;revision:number;created_at:string;criteria:Record<string,Criterion>|null;feedback:string|null;guidance:string|null};
type Props={attemptId:string;savedRevision:number;onRestore?:(snapshot:PrivateDraftSnapshot)=>boolean};
export default function PrivateDraftHistory({attemptId,savedRevision,onRestore}:Props){
 const {user}=useAuth();
 return <History key={`${user?.id}:${user?.tenantId}:${user?.role}:${attemptId}`} attempt={attemptId} owner={user?.id} tenant={user?.tenantId} savedRevision={savedRevision} onRestore={onRestore}/>;
}
function History({attempt,owner,tenant,savedRevision,onRestore}:{attempt:string;owner?:string;tenant?:string;savedRevision:number;onRestore?:Props['onRestore']}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[refresh,setRefresh]=useState(0);
 const [result,setResult]=useState<{key:string;rows:PrivateDraftSnapshot[];error:boolean}|null>(null);
 const [notice,setNotice]=useState<{key:string;text:string}|null>(null);
 const key=`${page}:${refresh}:${savedRevision}`,ready=result?.key===key;
 useEffect(()=>{
  if(!open||!owner||!tenant)return;let active=true;
  void Promise.resolve(db.from('uni_marking_draft_events').select('id,revision,created_at,criteria,feedback,guidance').eq('attempt_id',attempt).eq('marker_id',owner).eq('tenant_id',tenant).order('revision',{ascending:false}).range(page*10,page*10+10))
   .then(r=>{if(!active)return;if(r.error)throw r.error;setResult({key,rows:r.data||[],error:false});})
   .catch(()=>{if(active)setResult({key,rows:[],error:true});});
  return()=>{active=false;};
 },[open,owner,tenant,attempt,page,key]);
 const rows=ready?result.rows:[],loading=open&&!ready;
 return <section aria-label="Private saved draft history" aria-busy={loading} className="mt-4 min-w-0 space-y-3 border-t pt-4">
  <h3 className="font-semibold">Your private draft history</h3>
  <p className="text-sm text-muted-foreground">Saved wording only. Unsaved edits are not recorded. Viewing history does not replace your editor, submit a mark or notify the learner.</p>
  <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!owner||!tenant} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'Hide private draft history':'View private draft history'}</Button>{open&&<Button variant="ghost" onClick={()=>{setPage(0);setRefresh(v=>v+1);}}>Refresh draft history</Button>}</div>
  {open&&<>{loading?<p role="status">Loading your saved draft revisions…</p>:result?.error?<p role="alert">Private draft history could not be verified. Refresh to retry. Your current edits are unchanged.</p>:<>
   <p role="status" className="text-sm text-muted-foreground">{rows.length?`Page ${page+1} · showing ${Math.min(rows.length,10)} saved revisions, newest first.`:'No saved revisions are available to this account on this page.'}</p>
   {rows.slice(0,10).map(row=><details key={row.id} className="min-w-0 rounded-lg border p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Draft revision {row.revision} · {new Date(row.created_at).toLocaleString()}</summary>
    <SnapshotContent row={row}/>
    {onRestore&&row.criteria!==null&&row.feedback!==null&&row.guidance!==null&&<Button className="mt-3 max-w-full whitespace-normal" variant="outline" onClick={()=>{
     const accepted=onRestore(row);setNotice({key,text:accepted?`Revision ${row.revision} copied into unsaved editor fields. Review the content, then save a private draft to create a new revision.`:`Revision ${row.revision} was not loaded. Your current editor is unchanged.`});
    }}>Use revision {row.revision} in editor</Button>}
   </details>)}
   {notice?.key===key&&<p role="status" className="text-sm">{notice.text}</p>}
   <nav aria-label="Private draft history pages" className="flex flex-wrap gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(v=>v-1)}>Newer draft revisions</Button><Button variant="outline" disabled={rows.length<=10} onClick={()=>setPage(v=>v+1)}>Older draft revisions</Button></nav>
  </>}</>}
 </section>;
}
function SnapshotContent({row}:{row:PrivateDraftSnapshot}){
 if(row.criteria===null||row.feedback===null||row.guidance===null)return <p className="text-sm text-muted-foreground">Only the save time and revision were recorded. This revision’s wording was not captured and cannot be reconstructed.</p>;
 return <div className="space-y-3 text-sm [overflow-wrap:anywhere]">
  <p className="text-muted-foreground">Private unfinished work; these points are not a submitted decision or student grade.</p>
  <h4 className="font-semibold">Saved feedback</h4><p className="whitespace-pre-wrap">{row.feedback||'No feedback saved.'}</p>
  <h4 className="font-semibold">Saved resubmission guidance</h4><p className="whitespace-pre-wrap">{row.guidance||'No guidance saved.'}</p>
  {!Object.keys(row.criteria).length?<p>No criterion entries saved.</p>:Object.values(row.criteria).map(c=><details key={c.code} className="border-t pt-2"><summary className="min-h-11 cursor-pointer py-2 font-medium">{c.code} · {c.points} draft points</summary><dl className="space-y-2 whitespace-pre-wrap"><dt className="font-semibold">Reasoning</dt><dd>{c.reason||'Not entered.'}</dd><dt className="font-semibold">Evidence</dt><dd>{c.evidence||'Not entered.'}</dd><dt className="font-semibold">Missing or met</dt><dd>{c.missing||'Not entered.'}</dd></dl></details>)}
 </div>;
}
