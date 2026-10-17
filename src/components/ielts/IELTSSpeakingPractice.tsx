import {useCallback,useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {Mic,MicOff,Headphones,Trash2,LockKeyhole,Loader2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import type {IeltsTrack} from '@/lib/ieltsCurriculum';
import {SPEAKING_PROMPTS,speakingRecordingExtension,validateSpeakingBlob,supportedRecordingMime,type SpeakingPart} from '@/lib/ieltsSpeaking';

const db:SupabaseClient=supabase;
const BUCKET='ielts-speaking';
const MAX_SECONDS=150;
type SavedAudio={id:string;storage_path:string;prompt_key:SpeakingPart;track:IeltsTrack;duration_seconds:number;created_at:string;teacher_feedback:string|null;reviewed_at:string|null};
export default function IELTSSpeakingPractice({tenant,student,track,enabled}:{
 tenant:string;student:string;track:IeltsTrack;enabled:boolean;
}){
 const [part,setPart]=useState<SpeakingPart>('part2');
 const [recording,setRecording]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [blob,setBlob]=useState<Blob|null>(null);
 const [duration,setDuration]=useState(0);
 const [preview,setPreview]=useState('');
 const [shareConsent,setShareConsent]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [rows,setRows]=useState<SavedAudio[]>([]);
 const [playingId,setPlayingId]=useState<string|null>(null);
 const [signedUrl,setSignedUrl]=useState('');
 const recorderRef=useRef<MediaRecorder|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const chunksRef=useRef<Blob[]>([]);
 const startTime=useRef(0);
 const previewRef=useRef('');
 const active=useRef(true);
 const lesson=SPEAKING_PROMPTS.find(p=>p.key===part)||SPEAKING_PROMPTS[1];

 const release=useCallback(()=>{
  streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
 },[]);
 const discard=useCallback(()=>{
  if(previewRef.current)URL.revokeObjectURL(previewRef.current);
  previewRef.current='';setPreview('');setBlob(null);setShareConsent(false);setDuration(0);setSignedUrl('');setPlayingId(null);
 },[]);
 const load=useCallback(async()=>{
  setLoading(true);
  const result=await db.from('ielts_speaking_recordings')
    .select('id,storage_path,prompt_key,track,duration_seconds,created_at,teacher_feedback,reviewed_at')
    .eq('tenant_id',tenant).eq('student_id',student).order('created_at',{ascending:false}).limit(25);
  if(active.current){
   if(result.error)setError('Speaking evidence is unavailable. Check the database migration and centre permissions.');
   else setRows((result.data||[]) as SavedAudio[]);
   setLoading(false);
  }
 },[tenant,student]);
 useEffect(()=>{active.current=true;void load();return()=>{
  active.current=false;
  const r=recorderRef.current;
  if(r?.state==='recording')r.stop();
  release();
  if(previewRef.current)URL.revokeObjectURL(previewRef.current);
 };},[load,release]);
 useEffect(()=>{
  if(!recording)return;
  const timer=window.setInterval(()=>{
    const t=Math.max(0,Math.floor((Date.now()-startTime.current)/1000));
    setElapsed(t);
    if(t>=MAX_SECONDS&&recorderRef.current?.state==='recording')recorderRef.current.stop();
  },250);
  return ()=>window.clearInterval(timer);
 },[recording]);
 async function begin(){
  if(busy||recording)return;
  setError('');discard();
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   setError('This browser does not support microphone recording. Use a current HTTPS browser or practise with a tutor in the live classroom.');
   return;
  }
  let stream:MediaStream|undefined;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   streamRef.current=stream;
   const formats=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];
   const chosen=formats.find(t=>MediaRecorder.isTypeSupported(t));
   const recorder=chosen?new MediaRecorder(stream,{mimeType:chosen}):new MediaRecorder(stream);
   const mime=recorder.mimeType.split(';')[0];
   if(!supportedRecordingMime(mime)){release();return setError('Your browser records in an unsupported audio format. Use a browser that supports WebM, MP4 or OGG.');}
   chunksRef.current=[];recorderRef.current=recorder;
   recorder.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
   recorder.onstop=()=>{
    release();setRecording(false);
    if(!active.current)return;
    const audio=new Blob(chunksRef.current,{type:mime});
    const secs=Math.max(1,Math.round((Date.now()-startTime.current)/1000));
    const issue=validateSpeakingBlob(audio,secs);
    if(issue){setError(issue);return;}
    discard();
    previewRef.current=URL.createObjectURL(audio);
    setPreview(previewRef.current);setBlob(audio);setDuration(secs);
   };
   recorder.onerror=()=>{setError('Microphone recording failed. Try again.');release();setRecording(false);};
   startTime.current=Date.now();setElapsed(0);recorder.start(1000);setRecording(true);
  }catch(e){
   stream?.getTracks().forEach(t=>t.stop());release();
   setError(e instanceof Error?'Microphone permission was denied or unavailable. You can practise with a tutor instead.':'Microphone access failed.');
  }
 }
 function stop(){if(recorderRef.current?.state==='recording')recorderRef.current.stop();}
 async function submit(){
  if(!blob||!enabled||busy||!shareConsent)return;
  if(typeof crypto==='undefined'||!crypto.randomUUID)return setError('A secure browser context is needed to submit recordings.');
  const problem=validateSpeakingBlob(blob,duration);
  if(problem)return setError(problem);
  const ext=speakingRecordingExtension(blob.type.split(';')[0]);if(!ext)return;
  setBusy(true);setError('');
  const path=tenant+'/'+student+'/'+crypto.randomUUID()+'.'+ext;
  try{
   const uploaded=await db.storage.from(BUCKET).upload(path,blob,{contentType:blob.type,upsert:false});
   if(uploaded.error)throw uploaded.error;
   const inserted=await db.from('ielts_speaking_recordings').insert({
    tenant_id:tenant,student_id:student,track,prompt_key:part,
    storage_path:path,mime_type:blob.type.split(';')[0],duration_seconds:duration,consent_at:new Date().toISOString()
   });
   if(inserted.error){
    await db.storage.from(BUCKET).remove([path]);
    throw inserted.error;
   }
   discard();await load();
  }catch(e){setError(e instanceof Error?e.message:'Could not save your audio. No tutor can review an unsaved recording.');}
  finally{setBusy(false);}
 }
 async function playSaved(row:SavedAudio){
  setError('');
  const result=await db.storage.from(BUCKET).createSignedUrl(row.storage_path,90);
  if(result.error||!result.data?.signedUrl){setError('Unable to retrieve your private recording.');return;}
  setSignedUrl(result.data.signedUrl);setPlayingId(row.id);
 }
 async function deleteSaved(row:SavedAudio){
  if(busy||!window.confirm('Permanently delete this speaking recording? Your tutor will no longer be able to listen to it.'))return;
  setBusy(true);setError('');
  try{
   const erased=await db.storage.from(BUCKET).remove([row.storage_path]);
   if(erased.error)throw erased.error;
   const deleted=await db.from('ielts_speaking_recordings').delete().eq('tenant_id',tenant).eq('student_id',student).eq('id',row.id);
   if(deleted.error)throw deleted.error;
   setSignedUrl('');setPlayingId(null);await load();
  }catch(e){setError(e instanceof Error?e.message:'Could not delete the recording. Contact your centre.');}
  finally{setBusy(false);}
 }
 return <section className="rounded-xl border p-4 sm:p-6 space-y-4" aria-label="Private Speaking practice studio">
  <div className="flex gap-3 items-start"><Mic className="w-6 h-6 text-primary shrink-0"/>
   <div><h4 className="font-semibold text-lg">Speaking studio — record and reflect</h4>
    <p className="text-sm text-muted-foreground">Record original practice on your device. Sharing an audio file with your UniPathway tutor is optional and requires consent. This is not an official IELTS speaking test.</p>
   </div>
  </div>
  <label className="block text-sm font-medium">Choose a practice part
   <select value={part} disabled={recording||busy} onChange={e=>{discard();setPart(e.target.value as SpeakingPart);}}
    className="block w-full mt-1 rounded-lg border p-2 bg-background">
    {SPEAKING_PROMPTS.map(p=><option key={p.key} value={p.key}>{p.title}</option>)}
   </select>
  </label>
  <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
   <p className="font-semibold text-sm">{lesson.title}</p><p className="text-sm text-muted-foreground">{lesson.preparation}</p>
   <ul className="list-disc pl-5 text-sm space-y-1">{lesson.questions.map(q=><li key={q}>{q}</li>)}</ul>
  </div>
  <div className="flex items-center gap-3 flex-wrap">
    {recording?<Button type="button" variant="destructive" onClick={stop}><MicOff className="w-4 h-4 mr-2"/> Stop recording ({elapsed}s / {MAX_SECONDS}s)</Button>
      :<Button type="button" variant="outline" disabled={busy||!enabled} onClick={()=>void begin()}><Mic className="w-4 h-4 mr-2"/> Record private practice</Button>}
    {!enabled&&<p className="text-xs text-muted-foreground">Save your IELTS study plan before submitting speaking evidence.</p>}
  </div>
  {preview&&blob&&<div className="rounded-xl border p-4 space-y-3">
    <p className="font-semibold text-sm">Local recording preview — {duration} seconds</p>
    <audio controls src={preview} className="w-full" aria-label="Listen to your local speaking recording"/>
    <label className="flex gap-2 items-start text-xs"><input type="checkbox" className="mt-1 accent-primary" checked={shareConsent} onChange={e=>setShareConsent(e.target.checked)}/>
      <span>I choose to share this recording with authorised UniPathway tutors for feedback. It will be stored in private centre storage and may be deleted by me later. I understand this is not an official IELTS result.</span>
    </label>
    <div className="flex gap-2 flex-wrap">
      <Button type="button" disabled={!shareConsent||busy||!enabled} onClick={()=>void submit()}>{busy?<Loader2 className="animate-spin w-4 h-4 mr-2"/>:<LockKeyhole className="w-4 h-4 mr-2"/>}Share privately for tutor feedback</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={discard}>Discard local audio</Button>
    </div>
  </div>}
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="space-y-3 border-t pt-4">
   <h5 className="font-semibold">My saved speaking practice</h5>
   {loading?<p className="text-sm">Loading private recordings…</p>:rows.length===0?<p className="text-sm text-muted-foreground">No recordings saved yet. You can also practise in the live classroom without uploading audio.</p>:
   rows.map(row=><article key={row.id} className="rounded-lg border p-3 space-y-2">
    <div className="flex items-start justify-between flex-wrap gap-2">
      <p className="text-sm font-medium">{row.prompt_key.toUpperCase()} · {row.duration_seconds}s · {new Date(row.created_at).toLocaleDateString()} · {row.track==='general'?'General Training':'Academic'}</p>
      <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={()=>void playSaved(row)}><Headphones className="w-4 h-4 mr-1"/> Play</Button>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void deleteSaved(row)}><Trash2 className="w-4 h-4 mr-1"/> Delete</Button></div>
    </div>
    {playingId===row.id&&signedUrl&&<audio key={signedUrl} controls src={signedUrl} className="w-full" aria-label="Play your saved speaking recording"/>}
    {row.teacher_feedback&&<p className="text-sm rounded-lg bg-secondary/70 p-3"><strong>Tutor feedback:</strong> {row.teacher_feedback}</p>}
    {!row.teacher_feedback&&<p className="text-xs text-muted-foreground">Tutor review pending.</p>}
   </article>)}
  </div>
 </section>;
}
