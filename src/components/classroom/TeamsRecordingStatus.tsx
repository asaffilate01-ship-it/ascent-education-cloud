import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
type Recording={id:string;artifact_type:string;publication_status:string;storage_reference:string|null;available_at:string|null};
export default function TeamsRecordingStatus({sessionId,manager}:{sessionId:string;manager:boolean}){
 const [items,setItems]=useState<Recording[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setItems([]);setError('');
  void Promise.resolve(db.from('live_class_artifacts').select('id,artifact_type,publication_status,storage_reference,available_at').eq('session_id',sessionId).in('artifact_type',['recording','transcript']).order('available_at',{ascending:false}).limit(100))
   .then(r=>{if(active){if(r.error)setError('Recording status unavailable. Check classroom access and deployed schema.');else setItems(r.data||[]);}})
   .catch(()=>{if(active)setError('Recording status unavailable.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[sessionId,refresh]);
 return <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">Recordings and transcripts</h2>
  {manager&&<p className="text-sm">In Teams, use More → Record and transcribe, or your approved automatic-recording meeting policy. Check the recording indicator and participant notice. Private and breakout conversations need their own capture decisions; a main meeting recording is not evidence that every breakout was recorded.</p>}
  {loading?<p role="status">Checking released media…</p>:error?<p role="alert">{error}</p>:items.length?<ul className="space-y-2">{items.map(i=><li key={i.id} className="text-sm">{i.artifact_type}: {i.publication_status==='published'&&i.storage_reference&&i.available_at&&Date.parse(i.available_at)<=Date.now()?'Released to authorised learners':manager?`${i.publication_status} — ${i.storage_reference?'private media referenced':'media transfer pending'}`:'Not available for playback'}</li>)}</ul>:<p className="text-sm">No {manager?'ingested':'released'} recording or transcript is available for this lesson. This does not establish whether Teams recorded it.</p>}
  <button className="text-sm underline" onClick={()=>setRefresh(n=>n+1)}>Refresh recording status</button>
  <Link className="ml-4 text-sm underline" to={manager?'/lecturer/lesson-archive':'/student/lesson-archive'}>Open private lesson archive</Link>
  {manager&&<p className="text-xs text-muted-foreground">The archive requires Microsoft recording retrieval, private storage transfer and academic release. Automatic retrieval is not activated by saving a teaching plan.</p>}
 </section>;
}
