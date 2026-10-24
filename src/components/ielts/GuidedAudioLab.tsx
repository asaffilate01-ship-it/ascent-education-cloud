import {useEffect, useRef, useState} from 'react';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
type Session={id:string;title:string;starts_at:string};
type AudioState={session_id:string;storage_path:string;title:string;playing:boolean;position_seconds:number;revision:number;updated_at:string};
export default function GuidedAudioLab(){
 const {user}=useAuth();
 return user?.tenantId?<ClassPicker key={`${user.id}:${user.tenantId}:${user.role}`} tenant={user.tenantId}/>:null;
}
function ClassPicker({tenant}:{tenant:string}){
 const [sessions,setSessions]=useState<Session[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(false),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError(false);
  void (async()=>{try{const result=await db.from('live_class_sessions').select('id,title,starts_at').eq('tenant_id',tenant).in('status',['scheduled','live']).gte('ends_at',new Date().toISOString()).order('starts_at').order('id').limit(100);
   if(result.error||!Array.isArray(result.data))throw Error('Unavailable');if(active)setSessions(result.data);
  }catch{if(active){setError(true);setSessions([]);setSelected('');}}finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[tenant,retry]);
 return <section className="surface-card p-5 space-y-3" aria-label="Tutor-led audio lab"><h3 className="text-lg font-semibold">Tutor-led audio lab</h3>
 <p className="text-sm text-muted-foreground">Join an invited class to follow a tutor’s shared recording. You control your volume and can leave audio at any time. No microphone is opened.</p>
 {loading?<p role="status">Loading invited classes…</p>:error?<p role="alert">Class access could not be verified.</p>:<label className="block text-sm">Class<select aria-label="Audio class" value={selected} onChange={e=>setSelected(e.target.value)} className="block border rounded p-2 bg-background max-w-full"><option value="">Choose an invited class</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.title} · {new Date(s.starts_at).toLocaleString()}</option>)}</select></label>}
 {!loading&&!error&&!sessions.length&&<p>No upcoming class invitations. Ask your tutor to schedule and invite you.</p>}
 <Button variant="outline" onClick={()=>setRetry(x=>x+1)}>Refresh classes</Button>
 {!loading&&!error&&selected&&sessions.some(s=>s.id===selected)&&<GuidedSession key={selected} session={selected}/>}
 </section>;
}
export function GuidedSession({session}:{session:string}){
 const [state,setState]=useState<AudioState|null>(null),[manager,setManager]=useState(false),[enabled,setEnabled]=useState(false),[volume,setVolume]=useState(.5),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[url,setUrl]=useState('');
 const audio=useRef<HTMLAudioElement>(null), active=useRef(true),pollToken=useRef(0),snapshot=useRef<{state:AudioState;server:number;received:number}|null>(null),source=useRef(''),expires=useRef(0),requestBusy=useRef(false);
 const enabledRef=useRef(false);enabledRef.current=enabled;
 async function load(){
  if(requestBusy.current)return;requestBusy.current=true;const token=++pollToken.current;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   const result=await Promise.race([db.rpc('get_unipathway_guided_audio',{p_session:session}),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Timed out')),10000);})]);
   if(!active.current||token!==pollToken.current)return;
   if(result.error||!result.data||typeof result.data.can_manage!=='boolean'||!Number.isFinite(Date.parse(result.data.server_now)))throw Error('Unavailable');
   const next=result.data.state as AudioState|null;
   setManager(result.data.can_manage);setReady(true);
   if(!next){setState(null);snapshot.current=null;audio.current?.pause();setUrl('');source.current='';return;}
   if(next.session_id!==session||!Number.isFinite(Number(next.position_seconds))||!Number.isFinite(Date.parse(next.updated_at)))throw Error('Invalid state');
   snapshot.current={state:next,server:Date.parse(result.data.server_now),received:Date.now()};setState(next);
   if(source.current!==next.storage_path||expires.current<Date.now()){
    const signed=await supabase.storage.from('guided-class-audio').createSignedUrl(next.storage_path,90);
    if(!active.current||token!==pollToken.current)return;
    if(signed.error||!signed.data?.signedUrl)throw Error('Audio unavailable');
    source.current=next.storage_path;expires.current=Date.now()+60000;setUrl(signed.data.signedUrl);
   }
   setError('');
  }catch{if(active.current&&token===pollToken.current){audio.current?.pause();snapshot.current=null;setState(null);setUrl('');source.current='';setManager(false);setReady(false);setError('Audio access or connection failed. Playback is paused while reconnecting.');}}
  finally{clearTimeout(timeout);requestBusy.current=false;}
 }
 function targetPosition(){const s=snapshot.current;return s?Number(s.state.position_seconds)+(s.state.playing?Math.max(0,(s.server+Date.now()-s.received-Date.parse(s.state.updated_at))/1000):0):0;}
 function follow(){
  const el=audio.current,s=snapshot.current;if(!el||!s||!enabledRef.current)return;
  const target=Number(s.state.position_seconds)+(s.state.playing?Math.max(0,(s.server+Date.now()-s.received-Date.parse(s.state.updated_at))/1000):0);
  if(el.readyState>=1){const position=Number.isFinite(el.duration)?Math.min(target,el.duration):target;if(Math.abs(el.currentTime-position)>1.5)el.currentTime=position;}
  if(s.state.playing){if(el.paused)void el.play().catch(()=>{if(active.current){setEnabled(false);setError('Your browser paused audio. Press Enable class audio to resume.');}});}else el.pause();
 }
 useEffect(()=>{active.current=true;void load();const timer=setInterval(()=>void load(),3000);const sync=setInterval(()=>follow(),1000);return()=>{active.current=false;pollToken.current++;clearInterval(timer);clearInterval(sync);audio.current?.pause();};
 // Session is keyed by the parent; refs provide current playback state.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[session]);
 useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume,url]);
 async function command(playing:boolean,position:number,path=state?.storage_path,title=state?.title){
  if(!manager||busy||!path||!title)return false;setBusy(true);
  try{const r=await db.rpc('set_unipathway_guided_audio',{p_session:session,p_revision:state?.revision||0,p_path:path,p_title:title,p_playing:playing,p_position:position});if(r.error)throw r.error;
   if(active.current){setError('');await load();}return true;
  }catch{if(active.current)setError('Command was not confirmed. Refresh before retrying; another tutor may have changed the session.');return false;}finally{if(active.current)setBusy(false);}
 }
 async function upload(file?:File){
  if(!file||!manager||busy)return;
  const extensions:Record<string,string>={'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/mp4':'m4a','audio/webm':'webm'};
  const extension=extensions[file.type];if(!extension||!file.size||file.size>50*1024*1024){setError('Choose MP3, WAV, OGG, M4A or WebM audio up to 50 MB.');return;}
  setBusy(true);const path=`${session}/${crypto.randomUUID()}.${extension}`;
  try{const result=await supabase.storage.from('guided-class-audio').upload(path,file,{upsert:false,contentType:file.type});if(result.error)throw result.error;
   if(!active.current)return;
   const saved=await db.rpc('set_unipathway_guided_audio',{p_session:session,p_revision:state?.revision||0,p_path:path,p_title:file.name.slice(0,160),p_playing:false,p_position:0});
   if(saved.error){await supabase.storage.from('guided-class-audio').remove([path]);throw saved.error;}
   setError('');await load();
  }catch{if(active.current)setError('Shared audio was not confirmed. Refresh the session and retry.');}finally{if(active.current)setBusy(false);}
 }
 return <div className="border rounded p-4 space-y-3">
 {error&&<p role="alert">{error}</p>}{!ready&&!error&&<p role="status">Checking class audio…</p>}
 {ready&&!state&&<p>The tutor has not shared an audio recording yet.</p>}
 {state&&<><h4 className="font-semibold">{state.title}</h4><p className="text-sm">Tutor playback: {state.playing?'playing':'paused'}</p>
 <audio ref={audio} src={url||undefined} preload="auto" onLoadedMetadata={follow} onError={()=>{audio.current?.pause();setEnabled(false);source.current='';setError('Unable to play shared audio. Check your connection and enable audio again.');}}/>
 <Button variant="outline" onClick={()=>{if(enabled){setEnabled(false);audio.current?.pause();}else{enabledRef.current=true;setEnabled(true);setError('');follow();}}}>{enabled?'Leave class audio':'Enable class audio'}</Button>
 <label className="block text-sm">Class volume<input aria-label="Class volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label></>}
 {manager&&<div className="space-y-2 border-t pt-3"><p className="text-sm">Tutor controls · Share only recordings you own or are licensed to distribute.</p><label className="block text-sm">Share class audio<input aria-label="Share class audio" type="file" accept="audio/*" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
 {state&&<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void command(true,targetPosition())}>Play for class</Button><Button disabled={busy} onClick={()=>void command(false,targetPosition())}>Pause for class</Button><Button disabled={busy} variant="outline" onClick={()=>void command(false,0)}>Reset to beginning</Button></div>}</div>}
 <p className="text-xs text-muted-foreground">Playback updates about every three seconds. This is guided practice, not synchronised exam delivery. Access is checked on each refresh. Revocation blocks new links; already buffered audio cannot be recalled.</p>
 <Button variant="outline" disabled={busy} onClick={()=>{void load();}}>Refresh audio</Button>
 </div>;
}
