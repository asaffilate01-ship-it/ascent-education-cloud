import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Criterion={code:string;points:number;reason:string;evidence:string;missing:string};
type Revision={id:string;revision:number;raw_score:number;penalty_points:number;adjusted_score:number;feedback:string|null;criteria_scores:Criterion[]|null;recorded_at:string;marker_id:string};
export default function MarkHistory({attemptId}:{attemptId:string}){
 const {user}=useAuth();return <History key={`${user?.id}:${user?.tenantId}:${attemptId}`} attempt={attemptId} tenant={user?.tenantId}/>;
}
function History({attempt,tenant}:{attempt:string;tenant?:string}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Revision[]>([]),[page,setPage]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const [selected,setSelected]=useState(''),[compare,setCompare]=useState('');
 useEffect(()=>{if(!open||!tenant)return;let active=true;setLoading(true);setError('');setRows([]);setSelected('');setCompare('');
  void Promise.resolve(db.from('unipathway_assessment_mark_history').select('id,revision,raw_score,penalty_points,adjusted_score,feedback,criteria_scores,recorded_at,marker_id').eq('tenant_id',tenant).eq('attempt_id',attempt).order('revision',{ascending:false}).range(page*10,page*10+10)).then(r=>{if(!active)return;if(r.error)throw r.error;setRows(r.data||[]);setSelected(r.data?.[0]?.id||'');setCompare(r.data?.[1]?.id||'');}).catch(()=>{if(active)setError('Revision history could not be verified. Retry.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[open,tenant,attempt,page,refresh]);
 const shown=rows.slice(0,10),current=shown.find(r=>r.id===selected),previous=shown.find(r=>r.id===compare);
 return <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">Submitted marking history</h2><p className="text-sm text-muted-foreground">Compare submitted decisions. Private drafts and AI suggestions are separate. Older revisions may contain totals only.</p>
 {!open?<Button variant="outline" onClick={()=>setOpen(true)}>Load submitted revisions</Button>:<>
 {loading&&<p role="status">Loading revisions…</p>}{error&&<p role="alert">{error} <Button variant="outline" onClick={()=>setRefresh(x=>x+1)}>Retry history</Button></p>}
 {!loading&&!error&&<>{!shown.length?<p>No submitted mark revisions are available to this account.</p>:<>
 <div className="grid gap-3 sm:grid-cols-2"><label>Review revision<select className="mt-1 block min-h-11 w-full rounded border bg-background p-2" value={selected} onChange={e=>{setSelected(e.target.value);if(compare===e.target.value)setCompare(selected);}}>{shown.map(r=><option key={r.id} value={r.id}>Revision {r.revision} · {r.adjusted_score}/100</option>)}</select></label>
 <label>Compare with<select className="mt-1 block min-h-11 w-full rounded border bg-background p-2" value={compare} onChange={e=>setCompare(e.target.value)}><option value="">No comparison</option>{shown.filter(r=>r.id!==selected).map(r=><option key={r.id} value={r.id}>Revision {r.revision} · {r.adjusted_score}/100</option>)}</select></label></div>
 {current&&<><p className="text-sm">Revision {current.revision} · recorded {new Date(current.recorded_at).toLocaleString()} · raw {current.raw_score}, penalty {current.penalty_points}, adjusted {current.adjusted_score}/100</p>
 {previous&&previous.id!==current.id&&<p className="text-sm">Adjusted score change from revision {previous.revision}: {Number(current.adjusted_score)-Number(previous.adjusted_score)} points.</p>}
 <div className="grid gap-4 lg:grid-cols-2"><Snapshot row={current}/>{previous&&previous.id!==current.id&&<Snapshot row={previous}/>}</div></>}
 </>}
 <nav aria-label="Mark history pages" className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Newer revisions</Button><span>Page {page+1}</span><Button variant="outline" disabled={rows.length<=10} onClick={()=>setPage(p=>p+1)}>Older revisions</Button></nav></>}
 </>}
 </section>;
}
function Snapshot({row}:{row:Revision}){return <article className="min-w-0 space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Revision {row.revision}</h3>{!row.criteria_scores||row.feedback===null?<p className="text-sm text-muted-foreground">Full reasoning was not captured for this historical revision. Its score totals remain available; no feedback has been reconstructed.</p>:<><p className="whitespace-pre-wrap break-words text-sm">{row.feedback}</p>{row.criteria_scores.map(c=><details key={c.code} className="border-t pt-2"><summary className="min-h-11 cursor-pointer py-2 font-medium">{c.code} · {c.points} points</summary><dl className="space-y-2 text-sm"><dt className="font-semibold">Reasoning</dt><dd className="whitespace-pre-wrap break-words">{c.reason}</dd><dt className="font-semibold">Evidence</dt><dd className="whitespace-pre-wrap break-words">{c.evidence}</dd><dt className="font-semibold">Missing or met</dt><dd className="whitespace-pre-wrap break-words">{c.missing}</dd></dl></details>)}</>}</article>;}
