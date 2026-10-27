import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {classMediaUrl} from '@/lib/learning/classMedia';
export default function ClassRecordingPlayer({path,title,onClose}:{path:string;title:string;onClose:()=>void}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 const position=useRef(0),video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{let current=true;setUrl('');setError('');setLoading(true);
  void classMediaUrl(path).then(value=>{if(current)setUrl(value);}).catch(e=>{if(current)setError(e instanceof Error?e.message:'Recording unavailable.');}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[path,refresh]);
 useEffect(()=>{const element=video.current;return()=>{if(element){element.pause();element.removeAttribute('src');element.load();}};},[url]);
 return <section aria-label="Class recording player" className="my-5 space-y-3 rounded-xl border bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-words font-semibold">{title}</h2><Button variant="outline" onClick={onClose}>Close recording</Button></div>
  {loading&&<p role="status">Checking recording access…</p>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {url&&<video ref={video} aria-label={`Recording: ${title}`} src={url} controls playsInline preload="metadata" className="max-h-[65vh] w-full rounded-lg bg-black" onTimeUpdate={e=>{if(e.currentTarget===video.current&&e.currentTarget.readyState>=1&&Number.isFinite(e.currentTarget.currentTime))position.current=e.currentTarget.currentTime;}} onLoadedMetadata={e=>{const v=e.currentTarget;if(position.current>0&&Number.isFinite(v.duration))v.currentTime=Math.min(position.current,Math.max(0,v.duration-0.1));}} onError={()=>setError('Playback stopped or the access link expired. Refresh playback access to retry from your current position.')}/ >}
  <Button variant="outline" disabled={loading} onClick={()=>{if(video.current&&Number.isFinite(video.current.currentTime))position.current=video.current.currentTime;setRefresh(n=>n+1);}}>Refresh playback access</Button>
  <p className="text-xs text-muted-foreground">Access is checked again when refreshed. Your place is kept while this player stays open; it is not saved after leaving this page. If the format is unsupported, open the recording file instead.</p>
 </section>;
}
