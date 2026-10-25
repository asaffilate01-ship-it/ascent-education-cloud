import {useState,useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {lessonUrl,type Lesson} from '@/lib/structuredLessons';
const empty={title:'',body:'',position:1,video_url:'',transcript:'',resource_url:'',status:'draft' as Lesson['status']};
export default function LessonBuilder(){
 const {user}=useAuth();const [params]=useSearchParams();const module=params.get('module')||'';
 const [editing,setEditing]=useState<Lesson|null>(null),[form,setForm]=useState(empty),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false);
 useEffect(()=>{setEditing(null);setForm(empty);setMessage('');setPreview(false);},[module,user?.id,user?.tenantId]);
 const cache=useQueryClient(),key=['lesson-builder',user?.id,user?.tenantId,module];
 const lessons=useQuery({queryKey:key,enabled:!!module&&!!user?.tenantId,queryFn:async()=>{
  const r=await db.from('unipathway_lessons').select('*').eq('tenant_id',user!.tenantId).eq('module_id',module).order('position').order('id');if(r.error)throw r.error;return r.data as Lesson[];
 }});
 function choose(l:Lesson|null){setEditing(l);setForm(l?{...l,video_url:l.video_url||'',resource_url:l.resource_url||''}:{...empty,position:Math.max(0,...(lessons.data||[]).map(x=>x.position))+1});setMessage('');setPreview(false);}
 async function save(status:Lesson['status']){
  if(!user?.tenantId||!module)return;setBusy(true);setMessage('');
  try{
   if(!form.title.trim())throw Error('Give this lesson a title.');
   if(status==='published'&&(form.body.trim().length<20||(form.video_url&&form.transcript.trim().length<20)))throw Error('Add lesson instructions (at least 20 characters) and a transcript when using video.');
   const fields={title:form.title.trim(),body:form.body,position:form.position,video_url:lessonUrl(form.video_url),transcript:form.transcript,resource_url:lessonUrl(form.resource_url),status};
   const request=editing?db.from('unipathway_lessons').update(fields).eq('id',editing.id).eq('revision',editing.revision):db.from('unipathway_lessons').insert({...fields,module_id:module,tenant_id:user.tenantId});
   const r=await request.select('*').single();if(r.error)throw Error('Save failed or another editor changed this lesson. Refresh and try again.');
   setEditing(r.data);setForm({...r.data,video_url:r.data.video_url||'',resource_url:r.data.resource_url||''});setMessage(status==='published'?'Published to enrolled learners.':'Draft saved.');await cache.invalidateQueries({queryKey:key});
  }catch(e){setMessage(e instanceof Error?e.message:'Lesson could not be saved.');}finally{setBusy(false);}
 }
 return <DashboardLayout title="Build lessons" subtitle="Arrange your curriculum, preview it and publish when ready"><ModuleJourney teacher moduleId={module}/>
 {!module?<p>Select a teaching module first.</p>:<div className="grid gap-6 lg:grid-cols-[16rem_1fr]"><aside><Button disabled={busy} onClick={()=>choose(null)}>New lesson</Button>
 {lessons.isError?<p role="alert">Lessons failed to load. <button className="underline" onClick={()=>lessons.refetch()}>Retry</button></p>:lessons.isLoading?<p role="status">Loading…</p>:<ol className="mt-4 space-y-2">{lessons.data?.map(l=><li key={l.id}><button disabled={busy} onClick={()=>choose(l)} className="w-full rounded-lg border p-3 text-left"><span className="block font-semibold">{l.position}. {l.title}</span><span className="text-xs text-muted-foreground">{l.status} · version {l.revision}</span></button></li>)}</ol>}</aside>
 <section className="min-w-0 space-y-4"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing?'Edit lesson':'New lesson'}</h2><Button variant="outline" onClick={()=>setPreview(!preview)}>{preview?'Edit content':'Preview lesson'}</Button></div>
 {preview?<article className="rounded-xl border p-5"><h3 className="text-xl font-bold">{form.title||'Untitled lesson'}</h3><p className="mt-4 whitespace-pre-wrap break-words">{form.body}</p>{form.transcript&&<p className="mt-4 whitespace-pre-wrap">Transcript: {form.transcript}</p>}</article>:<fieldset disabled={busy} className="space-y-4"><legend className="sr-only">Lesson content</legend>
 <label className="block">Title<Input value={form.title} maxLength={200} onChange={e=>setForm({...form,title:e.target.value})}/></label>
 <label className="block">Order in module<Input type="number" min={1} step={1} value={form.position} onChange={e=>setForm({...form,position:Number(e.target.value)})}/></label>
 <label className="block">Lesson instructions and content<Textarea rows={10} value={form.body} maxLength={100000} onChange={e=>setForm({...form,body:e.target.value})}/></label>
 <label className="block">Video HTTPS URL (optional)<Input type="url" value={form.video_url} onChange={e=>setForm({...form,video_url:e.target.value})}/></label>
 <p className="text-sm text-muted-foreground">Use a licensed video file that supports browser playback. External links are shareable; keep confidential learner recordings in the protected classroom archive.</p>
 <label className="block">Video transcript<Textarea rows={5} value={form.transcript} onChange={e=>setForm({...form,transcript:e.target.value})}/></label>
 <label className="block">Related resource HTTPS URL (optional)<Input type="url" value={form.resource_url} onChange={e=>setForm({...form,resource_url:e.target.value})}/></label>
 </fieldset>}
 <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={()=>save('published')}>{busy?'Saving…':'Publish lesson'}</Button><Button disabled={busy} variant="outline" onClick={()=>save('draft')}>Save as draft</Button>{editing&&<Button disabled={busy} variant="outline" onClick={()=>save('archived')}>Archive</Button>}</div>
 <p role="status">{message}</p><p className="text-sm text-muted-foreground">Each save keeps a version snapshot. Publishing a new version requires learners to confirm completion again. Saving a draft removes this lesson from learner view.</p>
 </section></div>}</DashboardLayout>;
}
