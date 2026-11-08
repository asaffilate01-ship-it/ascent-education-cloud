import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { nextLesson, type Lesson, type LessonProgress } from '@/lib/structuredLessons';
import { acknowledgeProgress, getLessonPack, listLessonPacks, mergeLessonProgress, queueLessonProgress,
 reconcileLessonPack, removeLessonPack, saveLessonPack, type LessonPack } from '@/lib/learning/offlineLessons';
import { persistLessonProgress } from '@/lib/learning/lessonProgress';
import { canUseActiveRole } from '@/lib/roleMembership';

export default function LessonWorkspace() {
 const {user,loading}=useAuth(); const [params]=useSearchParams();
 return <LearningWorkspace key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}:${loading}:${params.get('module')||''}`}/>;
}
function LearningWorkspace() {
 const { user, loading: authLoading } = useAuth(); const [params, setParams] = useSearchParams(); const module = params.get('module') || '';
 const account = !authLoading && user?.tenantId && canUseActiveRole(user,['student']) ? { id: user.id, tenantId: user.tenantId } : null;
 const cache = useQueryClient(); const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false);
 const [online, setOnline] = useState(navigator.onLine); const [packs, setPacks] = useState<LessonPack[]>([]);
 const saving = useRef(false), last = useRef(0); const video = useRef<HTMLVideoElement>(null);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const notify=(message:string)=>{if(mounted.current)setFeedback(message);};
 const key = ['lesson-workspace', user?.id, user?.tenantId, module, online, user?.role, user?.roles?.join(',')];
 async function refreshPacks() { if (account) {const savedPacks=await listLessonPacks(account);if(mounted.current)setPacks(savedPacks);} }
 useEffect(() => { void refreshPacks().catch(() => {if(mounted.current)setPacks([]);}); }, [user?.id, user?.tenantId, module]);
 useEffect(() => {
  const change = () => setOnline(navigator.onLine);
  window.addEventListener('online', change); window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
 }, []);
 useEffect(() => {
  if (online) return;
  const timer = window.setInterval(() => { void cache.invalidateQueries({queryKey:['lesson-workspace',user?.id,user?.tenantId,module]}); }, 30000);
  return () => clearInterval(timer);
 }, [online,module,user?.id,user?.tenantId,cache]);
 const state = useQuery({ queryKey: key, enabled: !!account && !!module, networkMode: 'always', retry: false, queryFn: async () => {
  if (!account) throw Error('Sign in to continue.');
  if (!navigator.onLine) {
   const pack = await getLessonPack(account, module);
   if (!pack) throw Error('No current text pack is saved on this device. Connect to the internet to open this module.');
   return { lessons: pack.lessons, progress: pack.progress, offline: true };
  }
  const a = await db.from('unipathway_lessons').select('*').eq('tenant_id', account.tenantId).eq('module_id', module).eq('status', 'published').order('position').order('id');
  if (!mounted.current) throw Error('Lesson access changed. Reopen this module.');
  if (a.error || !Array.isArray(a.data)) throw Error('Lessons could not be loaded. Check your connection and retry.');
  const lessons = (a.data as Lesson[]).filter(lesson=>lesson.tenant_id===account.tenantId&&lesson.module_id===module&&lesson.status==='published');
  await reconcileLessonPack(account, module, lessons).then(discarded => {
   if (discarded) notify('Some saved work belongs to lessons that changed or are no longer available. Study their current versions.');
  }).catch(() => {});
  if (!lessons.length) return { lessons, progress: [] as LessonProgress[], offline: false };
  const b = await db.from('unipathway_lesson_progress').select('*').eq('student_id', account.id).in('lesson_id', lessons.map(l => l.id));
  if (b.error || !Array.isArray(b.data)) throw Error('Your progress could not be loaded. Retry before continuing.');
  const pack = await getLessonPack(account, module, true).catch(() => null);
  return { lessons, progress: mergeLessonProgress(b.data as LessonProgress[], pack?.pending || []), offline: false };
 }});
 const lessons = state.data?.lessons || [], progress = state.data?.progress || [];
 const hasLessonTarget=params.has('lesson');
 const selected = hasLessonTarget ? lessons.find(l => l.id === params.get('lesson')) : nextLesson(lessons, progress);
 const selectedId=selected?.id;
 const unavailableLesson=!!module&&hasLessonTarget&&state.isSuccess&&!selected;
 const pack = packs.find(p => p.module === module); const currentPack = pack && pack.expiresAt > Date.now();
 const saved = progress.find(p => p.lesson_id === selected?.id && p.revision === selected?.revision);
 const completed = lessons.filter(l => progress.some(p => p.lesson_id === l.id && p.revision === l.revision && p.completed)).length;
 useEffect(() => {
  if (selectedId && !params.has('lesson')) setParams(current=>{const next=new URLSearchParams(current);next.set('module',module);next.set('lesson',selectedId);return next;}, { replace: true });
 }, [selectedId, module, params, setParams]);
 useEffect(() => { last.current = 0; }, [selected?.id]);
 function chooseLesson(id?:string){setFeedback('');setParams(current=>{const next=new URLSearchParams(current);if(id)next.set('lesson',id);else next.delete('lesson');return next;});}
 async function run(action: () => Promise<void>) {
  if (!mounted.current || saving.current) return; saving.current = true; setBusy(true);
  try { await action(); } catch (e) { notify(e instanceof Error ? e.message : 'This action could not be completed. Retry when connected.'); }
  finally { saving.current = false; if(mounted.current){setBusy(false);await refreshPacks().catch(() => {});} }
 }
 async function sync() {
  if (!account || !navigator.onLine) return;
  await run(async () => {
   // Fresh RLS read removes withdrawn/archived/revised items before any replay.
   const current = await state.refetch(); if (!mounted.current) return; if (current.error) throw current.error;
   const local = await getLessonPack(account, module, true);
   let count = 0;
   for (const item of local?.pending || []) {
    if (!mounted.current) return;
    await persistLessonProgress(account.id, item,()=>mounted.current);
    if (!mounted.current) return;
    await acknowledgeProgress(account, module, item.mutation); count++;
   }
   if (!mounted.current) return;
   if (count) notify(`${count} saved progress update${count === 1 ? '' : 's'} synced.`);
   await cache.invalidateQueries({ queryKey: ['lesson-workspace', user?.id, user?.tenantId, module] });
  });
 }
 // Retry is deliberate: one sync on reconnection, then a visible button for failures.
 useEffect(() => { if (online && module && account) void sync(); }, [online, module, user?.id, user?.tenantId]);
 async function save(seconds: number, completed = false) {
  if (!selected || !account) return;
  const item: LessonProgress = { lesson_id: selected.id, revision: selected.revision,
   position_seconds: Math.max(0, Math.min(86400, Math.floor(seconds) || 0)), completed: completed || !!saved?.completed, updated_at: new Date().toISOString() };
  await run(async () => {
   let pending: Awaited<ReturnType<typeof queueLessonProgress>> | null = null;
   if (currentPack && pack.lessons.some(l => l.id === item.lesson_id && l.revision === item.revision)) pending = await queueLessonProgress(account, module, item);
   if (!mounted.current) return;
   if (!navigator.onLine && !pending) throw Error('Save this module for offline study while connected before recording offline progress.');
   if (navigator.onLine) {
    try { await persistLessonProgress(account.id, item,()=>mounted.current); if (!mounted.current) return; if (pending) await acknowledgeProgress(account, module, pending.mutation); }
    catch { throw Error(pending ? 'Progress is saved on this device. Use Sync progress when connected.' : 'Progress was not saved. Check your connection and retry.'); }
   }
   if (!mounted.current) return;
   notify(navigator.onLine ? 'Progress saved' : 'Saved on this device · waiting to sync');
   await cache.invalidateQueries({ queryKey: ['lesson-workspace', user?.id, user?.tenantId, module] });
  });
 }
 if(authLoading||!account)return <DashboardLayout title="Continue learning" subtitle="Study your next lesson, then pick up where you left off">{authLoading?<p role="status">Checking your student access…</p>:<p role="alert">An active, verified Student role and assigned centre are required to open lessons.</p>}</DashboardLayout>;
 return <DashboardLayout title="Continue learning" subtitle="Study your next lesson, then pick up where you left off">
  <ModuleJourney moduleId={module} />
  <details className="mb-5 rounded-xl border p-4"><summary className="cursor-pointer font-semibold min-h-8">Study without internet · {packs.length} saved module{packs.length === 1 ? '' : 's'}</summary>
   <p className="my-3 text-sm text-muted-foreground">Save lesson text and transcripts on your own device for 24 hours. Reopen Saved learning without internet after this device has loaded the published site. Download supported private files separately from Course materials. External videos and linked files need internet. Signing out removes saved packs and unsynced progress.</p>
   {module && !!lessons.length && <Button variant="outline" disabled={busy || !online || state.isError} onClick={() => void run(async () => {
    const latest = await state.refetch(); if (!mounted.current) return; if (latest.error || !latest.data) throw Error('Reconnect and retry before saving a pack.');
    await saveLessonPack(account!, module, latest.data.lessons, latest.data.progress);
    notify('Text pack saved for 24 hours. Use your own device; remove it when finished.');
   })}>{currentPack ? 'Refresh text pack' : 'Save text pack on this device'}</Button>}
   <p className="mt-2 text-xs text-muted-foreground">Up to 10 modules, 5 MB per text pack. Device storage may be cleared by your browser. Saved content cannot receive access changes until you reconnect.</p>
   <Link className="block underline min-h-11 py-3" to="/student/downloads">Manage all saved learning and sync progress</Link>
   <ul className="mt-4 space-y-3">{packs.map(p => <li key={p.key} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
    <div><Link className="underline" to={`/student/lessons?module=${encodeURIComponent(p.module)}`}>{p.lessons[0]?.title || 'Saved module'} · {p.lessons.length} lessons</Link>
     <p className="text-sm text-muted-foreground">{Math.ceil(p.bytes / 1024)} KB · {p.expiresAt > Date.now() ? `Available until ${new Date(p.expiresAt).toLocaleString()}` : 'Expired — reconnect to refresh'} · {p.pending.length} waiting to sync</p></div>
    <Button variant="ghost" disabled={busy} onClick={() => { if (!p.pending.length || window.confirm('Remove this pack and its unsynced progress from this device?')) void run(async () => { await removeLessonPack(account!, p.module); await state.refetch(); }); }}>Remove pack</Button>
   </li>)}</ul>
  </details>
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm">{online ? 'Online' : 'Offline · saved text only'}{lessons.length ? ` · ${completed} of ${lessons.length} lessons completed` : ''}</p>
   {!!pack?.pending.length && <Button variant="outline" disabled={!online || busy} onClick={() => void sync()}>Sync progress ({pack.pending.length})</Button>}</div>
  <p role="status" className="mb-4 text-sm">{feedback}</p>
  {!module ? <Link className="inline-flex min-h-11 items-center underline" to="/student/courses">Choose a course to begin</Link> : state.isLoading ? <p role="status">Loading lessons…</p> : state.isError ? <div role="alert" className="space-y-3 rounded-xl border border-destructive p-4"><p>{state.error.message}</p><Button variant="outline" onClick={() => state.refetch()}>Retry lessons</Button></div> : unavailableLesson ? <section role="alert" className="space-y-3 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Lesson unavailable</h2><p>The requested lesson is not available in this module. It may have changed, been withdrawn or be outside your current access.</p><div className="flex flex-wrap gap-3">{!!lessons.length&&<Button onClick={()=>chooseLesson()}>Choose an available lesson</Button>}<Button variant="outline" asChild><Link to={`/student/module?${new URLSearchParams({module})}`}>Open module overview</Link></Button><Button variant="outline" onClick={()=>state.refetch()}>Retry lessons</Button></div></section> : !selected ? <section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="font-semibold">No published lessons available</h2><p className="text-sm text-muted-foreground">Check the module overview for your classes and materials, or ask your lecturer to confirm access.</p><Button variant="outline" asChild><Link to={`/student/module?${new URLSearchParams({module})}`}>Open module overview</Link></Button></section> : <div className="flex flex-wrap items-start gap-6">
   <label className="block w-full min-w-0 max-w-full lg:hidden">Choose lesson<select className="mt-2 block min-h-12 w-full min-w-0 max-w-full rounded-lg border bg-background p-3" value={selected.id} onChange={e=>chooseLesson(e.target.value)}>{lessons.map((l,i)=><option key={l.id} value={l.id}>{i+1}. {l.title}</option>)}</select></label>
   <nav aria-label="Lesson sequence" className="hidden min-w-0 max-h-[min(50dvh,28rem)] flex-[1_1_16rem] space-y-2 overflow-y-auto lg:block">{lessons.map((l, i) => <button key={l.id} aria-current={l.id === selected.id ? 'step' : undefined} onClick={() => chooseLesson(l.id)} className={`block min-h-12 w-full rounded-lg border p-3 text-left ${l.id === selected.id ? 'border-primary bg-primary/5' : ''}`}>
    <span className="break-words text-sm">{i + 1}. {l.title}</span><span className="block text-xs text-muted-foreground">{progress.some(p => p.lesson_id === l.id && p.revision === l.revision && p.completed) ? 'Completed' : 'To study'}</span>
   </button>)}</nav>
   <article className="min-w-0 flex-[3_1_28rem] space-y-5"><h2 className="break-words text-2xl font-bold">{selected.title}</h2>
    {selected.video_url && online && <video ref={video} key={`${selected.id}:${selected.revision}`} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" src={selected.video_url} aria-label={selected.title}
     onLoadedMetadata={e => { if (saved?.position_seconds) e.currentTarget.currentTime = Math.min(saved.position_seconds, e.currentTarget.duration || 0); }}
     onTimeUpdate={e => { if (Date.now() - last.current > 15000) { last.current = Date.now(); void save(e.currentTarget.currentTime); } }}
     onPause={e => void save(e.currentTarget.currentTime)} />}
    {selected.video_url && online && <p className="text-sm text-muted-foreground">Playback position saves every 15 seconds and when paused. If video fails to load, use the transcript below.</p>}
    <div className="whitespace-pre-wrap break-words leading-7">{selected.body}</div>
    {selected.transcript && <details className="rounded-lg border p-4" open={!online}><summary className="cursor-pointer font-semibold">Read video transcript</summary><p className="mt-4 whitespace-pre-wrap">{selected.transcript}</p></details>}
    {selected.resource_url && online && <a href={selected.resource_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Open lesson resource (new tab)</a>}
    <div className="flex flex-wrap gap-3 border-t pt-5"><Button onClick={() => void save(video.current?.currentTime || saved?.position_seconds || 0, true)} disabled={busy || saved?.completed}>{saved?.completed ? 'Completed' : 'Mark as completed'}</Button>
     {lessons[lessons.indexOf(selected) + 1] ? <Button variant="outline" onClick={() => chooseLesson(lessons[lessons.indexOf(selected) + 1].id)}>Next lesson</Button> : <Button variant="outline" asChild><Link to={`/student/assignments?module=${encodeURIComponent(module)}`}>Continue to assignments</Link></Button>}</div>
    <p className="text-xs text-muted-foreground">Completion records your own study progress. Assessments are marked separately.</p>
   </article></div>}
 </DashboardLayout>;
}
