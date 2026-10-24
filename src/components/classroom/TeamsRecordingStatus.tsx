import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
type Recording={id:string;artifact_type:string;publication_status:string;storage_reference:string|null;available_at:string|null};
type Job={status:string;error_code:string|null;result_count:number};
export default function TeamsRecordingStatus({sessionId,manager}:{sessionId:string;manager:boolean}){
 return <RecordingPanel key={`${sessionId}:${manager}`} sessionId={sessionId} manager={manager}/>;
}
function RecordingPanel({sessionId,manager}:{sessionId:string;manager:boolean}){
 const [items,setItems]=useState<Recording[]>([]),[job,setJob]=useState<Job|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[preview,setPreview]=useState('');
 useEffect(()=>{let active=true;setLoading(true);setItems([]);setError('');setPreview('');
  void Promise.all([
   db.from('live_class_artifacts').select('id,artifact_type,publication_status,storage_reference,available_at').eq('session_id',sessionId).in('artifact_type',['recording','transcript']).order('available_at',{ascending:false}).limit(100),
   manager?db.from('unipathway_recording_jobs').select('status,error_code,result_count').eq('session_id',sessionId).maybeSingle():Promise.resolve({data:null,error:null}),
  ]).then(([r,j])=>{if(active){if(r.error||j.error)setError('Recording status unavailable. Check classroom access and deployed schema.');else{setItems(r.data||[]);setJob(j.data);}}})
   .catch(()=>{if(active)setError('Recording status unavailable.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[sessionId,manager,refresh]);
 const action=async(fn:string,args:Record<string,unknown>,message:string)=>{
  setBusy(true);setError('');setNotice('');setPreview('');
  try{const r=await db.rpc(fn,args);if(r.error)throw r.error;setNotice(message);setRefresh(n=>n+1);}
  catch{setError('Action could not complete. Check organiser setup, ended lesson, private media and current review status, then refresh.');}finally{setBusy(false);}
 };
 const review=async(item:Recording)=>{
  setBusy(true);setError('');setPreview('');
  try{const r=await supabase.storage.from('unipathway-class-media').createSignedUrl(item.storage_reference!,120);if(r.error||!r.data?.signedUrl)throw new Error();setPreview(r.data.signedUrl);}
  catch{setError('Private preview unavailable. Refresh access and try again.');}finally{setBusy(false);}
 };
 return <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">Recordings and transcripts</h2>
  {manager&&<p className="text-sm">Start recording in Teams or use your approved automatic-recording policy. Check the recording indicator and participant notice. Main meeting recordings do not include every breakout conversation.</p>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  {manager&&<div className="space-y-2"><Button variant="outline" disabled={busy||loading||job?.status==='processing'||job?.status==='queued'} onClick={()=>action('request_unipathway_recordings',{p_session:sessionId},'Transfer requested. A configured server worker must process it; this does not start a Teams recording.')}>Retrieve Teams recordings</Button>
   {job&&<p className="text-sm">Transfer: {job.status}{job.status==='complete'?` · ${job.result_count} recording(s)`:''}{job.error_code?` · ${job.error_code.replace(/_/g,' ')}`:''}</p>}
   <p className="text-xs text-muted-foreground">Available after the lesson ends and the organiser account is connected. Retry failed transfers after resolving the cause. Requests are limited to once every five minutes.</p></div>}
  {loading?<p role="status">Checking released media…</p>:!error&&items.length?<ul className="space-y-3">{items.map(i=><li key={i.id} className="rounded border p-3 text-sm space-y-2"><p>{i.artifact_type}: {i.publication_status==='published'&&i.storage_reference&&i.available_at&&Date.parse(i.available_at)<=Date.now()?'Released to authorised learners':manager?`${i.publication_status} — ${i.storage_reference?'private media referenced':'media transfer pending'}`:'Not available for playback'}</p>
   {manager&&<div className="flex flex-wrap gap-2">
    {i.storage_reference&&i.artifact_type==='recording'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>review(i)}>Preview privately</Button>}
    {['draft','withdrawn'].includes(i.publication_status)&&<Button size="sm" disabled={busy||!i.storage_reference} onClick={()=>action('review_unipathway_recording',{p_artifact:i.id,p_expected:i.publication_status,p_status:'approved'},'Review approved. Release separately when ready for students.')}>Confirm review</Button>}
    {i.publication_status==='approved'&&<Button size="sm" disabled={busy} onClick={()=>action('review_unipathway_recording',{p_artifact:i.id,p_expected:'approved',p_status:'published'},'Released to authorised students.')}>Release to students</Button>}
    {['approved','published'].includes(i.publication_status)&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>action('review_unipathway_recording',{p_artifact:i.id,p_expected:i.publication_status,p_status:'withdrawn'},'Withdrawn. Existing signed links expire within two minutes.')}>Withdraw</Button>}
   </div>}
  </li>)}</ul>:!error&&<p className="text-sm">No {manager?'ingested':'released'} recording or transcript is available for this lesson. This does not establish whether Teams recorded it.</p>}
  {preview&&<div><video className="w-full max-h-96" controls src={preview} aria-label="Private recording review"/><p className="text-xs">Preview access expires after two minutes. Select Preview privately again to renew.</p></div>}
  <button className="text-sm underline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>Refresh recording status</button>
  <Link className="ml-4 text-sm underline" to={manager?'/lecturer/lesson-archive':'/student/lesson-archive'}>Open private lesson archive</Link>
  {manager&&<p className="text-xs text-muted-foreground">Check the recording content and participant permissions before confirming review. Only released media becomes available to authorised learners. Transcript retrieval is a separate integration.</p>}
 </section>;
}
