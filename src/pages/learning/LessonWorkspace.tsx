import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db';
import { nextLesson, type Lesson, type LessonProgress } from '@/lib/structuredLessons';
export default function LessonWorkspace() {
 const {user}=useAuth();const [params,setParams]=useSearchParams();const module=params.get('module')||'';
 const cache=useQueryClient();const [feedback,setFeedback]=useState('');const saving=useRef(false),last=useRef(0);
 const key=['lesson-workspace',user?.id,user?.tenantId,module];
 const state=useQuery({queryKey:key,enabled:!!user?.tenantId&&!!module,queryFn:async()=>{
  const a=await db.from('unipathway_lessons').select('*').eq('tenant_id',user!.tenantId).eq('module_id',module).eq('status','published').order('position').order('id');if(a.error)throw a.error;
  const lessons=a.data as Lesson[];if(!lessons.length)return {lessons,progress:[] as LessonProgress[]};
  const b=await db.from('unipathway_lesson_progress').select('*').eq('student_id',user!.id).in('lesson_id',lessons.map(l=>l.id));if(b.error)throw b.error;
  return {lessons,progress:b.data as LessonProgress[]};
 }});
 const lessons=state.data?.lessons||[],progress=state.data?.progress||[];
 const selected=lessons.find(l=>l.id===params.get('lesson'))||nextLesson(lessons,progress);
 useEffect(()=>{if(selected&&!lessons.some(l=>l.id===params.get('lesson')))setParams({module,lesson:selected.id},{replace:true});},[selected?.id,module,params,setParams]);
 const saved=progress.find(p=>p.lesson_id===selected?.id&&p.revision===selected?.revision);
 useEffect(()=>{setFeedback('');last.current=0;},[selected?.id]);
 async function save(seconds:number,completed=false) {
  if(!selected||!user||saving.current)return;
  saving.current=true;setFeedback('Saving progress…');
  const result=await db.from('unipathway_lesson_progress').upsert({student_id:user.id,lesson_id:selected.id,revision:selected.revision,position_seconds:Math.max(0,Math.min(86400,Math.floor(seconds)||0)),completed:completed||!!saved?.completed,updated_at:new Date().toISOString()},{onConflict:'student_id,lesson_id,revision'}).select('lesson_id').single();
  saving.current=false;
  if(result.error){setFeedback('Progress was not saved. Check your connection and try again.');return;}
  setFeedback('Progress saved');await cache.invalidateQueries({queryKey:key});
 }
 return <DashboardLayout title="Continue learning" subtitle="Your lessons, saved position and next activity">
  <ModuleJourney moduleId={module}/>
  {!module?<Link className="underline" to="/student/courses">Choose a course to begin</Link>:state.isLoading?<p role="status">Loading lessons…</p>:state.isError?<div role="alert">Lessons could not be loaded. <Button variant="outline" onClick={()=>state.refetch()}>Retry</Button></div>:!selected?<p>No lessons have been published for this module yet. Your classes and materials remain available above.</p>:<div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
   <nav aria-label="Lesson sequence" className="space-y-2">{lessons.map((l,i)=><button key={l.id} aria-current={l.id===selected.id?'step':undefined} onClick={()=>setParams({module,lesson:l.id})} className={`block w-full rounded-lg border p-3 text-left ${l.id===selected.id?'border-primary bg-primary/5':''}`}>
    <span className="text-sm">{i+1}. {l.title}</span><span className="block text-xs text-muted-foreground">{progress.some(p=>p.lesson_id===l.id&&p.revision===l.revision&&p.completed)?'Completed':'To study'}</span>
   </button>)}</nav>
   <article className="min-w-0 space-y-5"><h2 className="text-2xl font-bold">{selected.title}</h2>
    {selected.video_url&&<video key={`${selected.id}:${selected.revision}`} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" src={selected.video_url} aria-label={selected.title}
      onLoadedMetadata={e=>{if(saved?.position_seconds)e.currentTarget.currentTime=Math.min(saved.position_seconds,e.currentTarget.duration||0);}}
      onTimeUpdate={e=>{if(Date.now()-last.current>15000){last.current=Date.now();void save(e.currentTarget.currentTime);}}}
      onPause={e=>void save(e.currentTarget.currentTime)}/>}
    {selected.video_url&&<p className="text-sm text-muted-foreground">Playback position saves every 15 seconds and when paused. If video fails to load, use the transcript below.</p>}
    <div className="whitespace-pre-wrap break-words leading-7">{selected.body}</div>
    {selected.transcript&&<details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Read video transcript</summary><p className="mt-4 whitespace-pre-wrap">{selected.transcript}</p></details>}
    {selected.resource_url&&<a href={selected.resource_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Open lesson resource (new tab)</a>}
    <div className="flex flex-wrap gap-3"><Button onClick={()=>void save(saved?.position_seconds||0,true)} disabled={saved?.completed}>{saved?.completed?'Completed':'Mark as completed'}</Button>
    {lessons[lessons.indexOf(selected)+1]&&<Button variant="outline" onClick={()=>setParams({module,lesson:lessons[lessons.indexOf(selected)+1].id})}>Next lesson</Button>}</div>
    <p role="status" className="text-sm">{feedback}</p><p className="text-xs text-muted-foreground">Completion records your own study progress. Assessments are marked separately.</p>
   </article></div>}
 </DashboardLayout>;
}
