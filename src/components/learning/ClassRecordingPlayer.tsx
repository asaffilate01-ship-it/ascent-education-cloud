import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {recordingPosition,saveRecordingPosition} from '@/lib/learning/recordingProgress';
import {classMediaUrl} from '@/lib/learning/classMedia';
export default function ClassRecordingPlayer({path,title,onClose,recordingId}:{path:string;title:string;onClose:()=>void;recordingId?:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 const {user}=useAuth();
 const account=user?.tenantId?{id:user.id,tenantId:user.tenantId}:null;
 const [saveStatus,setSaveStatus]=useState('');
 const position=useRef(account&&recordingId?recordingPosition(account,recordingId):0),video=useRef<HTMLVideoElement>(null),lastSave=useRef(0);
 const persist=(notify=true)=>{if(!account||!recordingId)return;try{saveRecordingPosition(account,recordingId,position.current);lastSave.current=Date.now();if(notify)setSaveStatus('Your place is saved on this device.');}catch{if(notify)setSaveStatus('Your place could not be saved on this device. Playback is still available.');}};
 const latestPersist=useRef(persist);latestPersist.current=persist;
 useEffect(()=>{const save=()=>latestPersist.current();window.addEventListener('pagehide',save);return()=>{window.removeEventListener('pagehide',save);latestPersist.current(false);};},[]);
 useEffect(()=>{let current=true;setUrl('');setError('');setLoading(true);
  void classMediaUrl(path).then(value=>{if(current)setUrl(value);}).catch(e=>{if(current)setError(e instanceof Error?e.message:'Recording unavailable.');}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[path,refresh]);
 useEffect(()=>{const element=video.current;return()=>{if(element){element.pause();element.removeAttribute('src');element.load();}};},[url]);
 return <section aria-label="Class recording player" className="my-5 space-y-3 rounded-xl border bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-words font-semibold">{title}</h2><Button variant="outline" onClick={onClose}>Close recording</Button></div>
  {loading&&<p role="status">Checking recording access…</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {url&&<video ref={video} aria-label={`Recording: ${title}`} src={url} controls playsInline preload="metadata" className="max-h-[65vh] w-full rounded-lg bg-black" onTimeUpdate={e=>{if(e.currentTarget===video.current&&e.currentTarget.readyState>=1&&Number.isFinite(e.currentTarget.currentTime)){position.current=e.currentTarget.currentTime;if(Date.now()-lastSave.current>=5000)persist();}}} onPause={()=>persist()} onEnded={()=>{position.current=0;persist();}} onLoadedMetadata={e=>{const v=e.currentTarget;if(position.current>0&&Number.isFinite(v.duration))v.currentTime=Math.min(position.current,Math.max(0,v.duration-0.1));}} onError={()=>setError('Playback stopped or the access link expired. Refresh playback access to retry from your current position.')}/ >}
  <Button variant="outline" disabled={loading} onClick={()=>{if(video.current&&Number.isFinite(video.current.currentTime))position.current=video.current.currentTime;setRefresh(n=>n+1);}}>Refresh playback access</Button>
  {recordingId&&<Button variant="outline" disabled={loading||!url} onClick={()=>{position.current=0;if(video.current)video.current.currentTime=0;persist();}}>Start again</Button>}
  {saveStatus&&<p role="status" className="text-sm text-muted-foreground">{saveStatus}</p>}
  <p className="text-xs text-muted-foreground">Access is checked again when refreshed. Your place is saved for up to 24 hours on this device, and cleared when you sign out or switch accounts. It does not sync to other devices. If the format is unsupported, open the recording file instead.</p>
 </section>;
}
