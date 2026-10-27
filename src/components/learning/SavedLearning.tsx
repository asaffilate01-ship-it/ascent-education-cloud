import {useEffect,useRef,useState} from 'react';
import {getLessonPack,isLearningAccount,listLessonPacks,queueLessonProgress,removeLessonPack,setLearningAccount,type LearningAccount,type LessonPack} from '@/lib/learning/offlineLessons';
import {listOfflineMaterials,materialCurrent,removeOfflineMaterial,saveMaterialPosition,type OfflineMaterial} from '@/lib/learning/offlineMaterials';
import {nextLesson} from '@/lib/structuredLessons';
const button='inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 font-medium disabled:opacity-50';
export default function SavedLearning({account,authenticated=false}:{account:LearningAccount;authenticated?:boolean}){
 const [packs,setPacks]=useState<LessonPack[]>([]),[files,setFiles]=useState<OfflineMaterial[]>([]),[selected,setSelected]=useState(''),[lessonId,setLessonId]=useState(''),[fileId,setFileId]=useState('');
 const [now,setNow]=useState(Date.now()),[online,setOnline]=useState(navigator.onLine),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const lock=useRef(false);
 const [loading,setLoading]=useState(true);const [active,setActive]=useState(true);
 async function refresh(){const [p,f]=await Promise.all([listLessonPacks(account),listOfflineMaterials(account)]);if(!isLearningAccount(account))return;setPacks(p);setFiles(f);}
 useEffect(()=>{let mounted=true;void refresh().catch(()=>{if(mounted)setError('Saved learning could not be read. Check device storage and retry.');}).finally(()=>{if(mounted)setLoading(false);});
  const update=()=>{if(mounted){setNow(Date.now());setOnline(navigator.onLine);setActive(isLearningAccount(account));}};
  const timer=setInterval(update,1000);window.addEventListener('storage',update);window.addEventListener('online',update);window.addEventListener('offline',update);
  return()=>{mounted=false;clearInterval(timer);window.removeEventListener('storage',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);};
 },[account.id,account.tenantId]);
 const pack=packs.find(p=>p.module===selected)||packs[0];const usable=pack&&pack.savedAt<=now&&pack.expiresAt>now;
 const lesson=usable?(pack.lessons.find(l=>l.id===lessonId)||nextLesson(pack.lessons,pack.progress)):null;
 const completed=lesson&&pack?.progress.some(p=>p.lesson_id===lesson.id&&p.revision===lesson.revision&&p.completed);
 const file=files.find(f=>f.id===fileId&&materialCurrent(f,now));
 const pending=packs.reduce((sum,p)=>sum+p.pending.length,0);
 async function run(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await action();await refresh();}catch(e){setError(e instanceof Error?e.message:'Action failed. Retry.');}finally{lock.current=false;setBusy(false);}}
 async function syncAll(){await run(async()=>{const {syncSavedLearning}=await import('@/lib/learning/offlineSync');const r=await syncSavedLearning(account);setMessage(`${r.synced} updates synced. ${r.discarded} obsolete updates and ${r.removedFiles} unavailable files removed.`);if(r.failures.length)setError(r.failures.join(' '));});}
 // One authenticated attempt on entry/reconnection; failures keep a visible manual retry.
 useEffect(()=>{if(authenticated&&online)void syncAll();},[authenticated,online,account.id,account.tenantId]);
 if(!active)return <p role="alert">This device’s account changed. Reopen UniPathway to continue.</p>;
 return <div className="space-y-6">
  <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-semibold">On this device</h2><p>{packs.length} lesson packs · {files.length} files ({(files.reduce((sum,f)=>sum+f.bytes,0)/1024/1024).toFixed(1)} MB) · {pending} progress updates waiting to sync</p>
   <p className="text-sm text-muted-foreground">Saved copies are available for 24 hours on this browser. Use a private device. Signing out removes them; files you export separately stay in your device’s downloads. Access changes take effect when checked online or when the saved copy expires.</p>
   <div className="flex flex-wrap gap-3">{authenticated?<button className={`${button} bg-primary text-primary-foreground`} disabled={busy||!online} onClick={()=>void syncAll()}>{busy?'Working…':'Sync and check all saved learning'}</button>:<a className={`${button} bg-primary text-primary-foreground`} href="/student/downloads">Sign in online to sync</a>}
    <button className={button} disabled={busy} onClick={()=>{if(confirm('Remove all saved lessons, files and unsynced progress from this device?'))void run(async()=>{await setLearningAccount(null);if(authenticated)await setLearningAccount(account);else setActive(false);});}}>Clear saved learning</button></div>
   {authenticated&&<a className="inline-block underline min-h-11 py-3" href="/offline.html">Open offline reader</a>}
   <p className="text-sm text-muted-foreground">{online?'Connection available. Sync requires a signed-in session.':'Offline · progress stays on this device until you sync.'}</p>
  </section>
  {loading&&<p role="status">Reading saved learning…</p>}{message&&<p role="status">{message}</p>}{error&&<div role="alert"><p>{error}</p><button className={button} disabled={busy} onClick={()=>void run(refresh)}>Retry</button></div>}
  {!loading&&!packs.length&&!files.length&&<p>No saved learning yet. While online, save a lesson pack or choose “Save offline” in Course materials.</p>}
  {!!packs.length&&<section className="space-y-4"><h2 className="text-xl font-semibold">Saved lessons</h2>
   <label className="block">Module<select className="mt-2 w-full min-h-12 rounded-lg border bg-background p-3" value={pack?.module||''} onChange={e=>{setSelected(e.target.value);setLessonId('');}}>{packs.map(p=><option key={p.key} value={p.module}>{p.lessons[0]?.title||'Saved module'} · {p.lessons.length} lessons</option>)}</select></label>
   {pack&&<div className="flex flex-wrap items-center gap-3"><p className="text-sm">{usable?`Available until ${new Date(pack.expiresAt).toLocaleString()}`:'Expired — reconnect to refresh'} · {pack.pending.length} waiting to sync</p><button className={button} disabled={busy} onClick={()=>{if(!pack.pending.length||confirm('Remove this pack and its unsynced progress?'))void run(async()=>{await removeLessonPack(account,pack.module);});}}>Remove pack</button></div>}
   {lesson&&pack&&<article className="space-y-4 rounded-xl border bg-card p-5 min-w-0">
    <label className="block">Lesson<select className="mt-2 w-full min-h-12 rounded-lg border bg-background p-3" value={lesson.id} onChange={e=>setLessonId(e.target.value)}>{pack.lessons.map((l,i)=><option key={l.id} value={l.id}>{i+1}. {l.title}</option>)}</select></label>
    <h3 className="text-2xl font-semibold break-words">{lesson.title}</h3><div className="whitespace-pre-wrap break-words leading-7">{lesson.body}</div>
    {lesson.transcript&&<details open><summary className="cursor-pointer font-semibold">Transcript</summary><p className="whitespace-pre-wrap break-words mt-3 leading-7">{lesson.transcript}</p></details>}
    <div className="flex flex-wrap gap-3"><button className={`${button} bg-primary text-primary-foreground`} disabled={busy||!!completed} onClick={()=>void run(async()=>{const current=await getLessonPack(account,pack.module);if(!current)throw Error('This pack expired. Reconnect to refresh.');await queueLessonProgress(account,pack.module,{lesson_id:lesson.id,revision:lesson.revision,completed:true,position_seconds:current.progress.find(p=>p.lesson_id===lesson.id&&p.revision===lesson.revision)?.position_seconds||0,updated_at:new Date().toISOString()});setMessage('Completed on this device. Sign in online and sync to update your course.');})}>{completed?'Completed on this device':'Mark as completed'}</button>
     {pack.lessons[pack.lessons.indexOf(lesson)+1]&&<button className={button} onClick={()=>setLessonId(pack.lessons[pack.lessons.indexOf(lesson)+1].id)}>Next lesson</button>}</div>
   </article>}
  </section>}
  {!!files.length&&<section className="space-y-3"><h2 className="text-xl font-semibold">Saved files</h2><p className="text-sm text-muted-foreground">Up to 20 files, 25 MB each and 100 MB total. Browser storage can be evicted; keep original coursework elsewhere.</p>
   {files.map(f=><article key={f.key} className="rounded-xl border p-4 flex flex-wrap justify-between gap-3 min-w-0"><div className="min-w-0"><h3 className="font-semibold break-words">{f.title}</h3><p className="text-sm">{(f.bytes/1024/1024).toFixed(1)} MB · {materialCurrent(f,now)?`Until ${new Date(f.expiresAt).toLocaleString()}`:'Expired — download again online'}</p></div><div className="flex gap-2"><button className={button} disabled={!materialCurrent(f,now)} onClick={()=>setFileId(f.id)}>View saved file</button><button className={button} disabled={busy} onClick={()=>void run(async()=>{await removeOfflineMaterial(account,f.id);if(fileId===f.id)setFileId('');})}>Remove</button></div></article>)}
   {file&&<SavedFile key={file.key} file={file} account={account}/>} 
  </section>}
 </div>;
}
function SavedFile({file,account}:{file:OfflineMaterial;account:LearningAccount}){
 const last=useRef(0);const [error,setError]=useState('');
 async function remember(seconds:number){try{await saveMaterialPosition(account,file.id,seconds);}catch{setError('Playback position could not be saved. Reopen the file after checking your saved learning.');}}
 const [url,setUrl]=useState('');useEffect(()=>{const u=URL.createObjectURL(file.blob);setUrl(u);return()=>URL.revokeObjectURL(u);},[file.blob]);
 const name=file.object_path.split('/').pop()||'course-material';
 return <article className="space-y-3 rounded-xl border bg-card p-4"><h3 className="font-semibold break-words">{file.title}</h3>
  {url&&file.blob.type==='video/mp4'&&<video controls playsInline src={url} className="w-full rounded-lg" aria-label={file.title} onLoadedMetadata={e=>{if(file.position_seconds)e.currentTarget.currentTime=Math.min(file.position_seconds,e.currentTarget.duration||0);}} onPause={e=>void remember(e.currentTarget.currentTime)} onTimeUpdate={e=>{if(Date.now()-last.current>15000){last.current=Date.now();void remember(e.currentTarget.currentTime);}}}/>}
  {url&&['image/png','image/jpeg'].includes(file.blob.type)&&<img src={url} alt={file.title} className="max-w-full max-h-[70vh] object-contain"/>}
  {url&&file.blob.type==='application/pdf'&&<details><summary className="min-h-11 py-3 cursor-pointer">Preview PDF in this browser</summary><iframe title={file.title} sandbox="" src={url} className="w-full h-[65vh] rounded-lg border"/></details>}
  {file.blob.type==='video/mp4'&&<p className="text-sm text-muted-foreground">Playback position saves on this device every 15 seconds and when paused. It does not submit assessed work.</p>}{error&&<p role="alert">{error}</p>}
  <a className="inline-flex min-h-11 items-center underline" href={url} download={name}>Download saved file to device</a><p className="text-sm text-muted-foreground">If the preview is unavailable, download the file and open it with a compatible app. Exported copies cannot be removed by UniPathway.</p>
 </article>;
}
