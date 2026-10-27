import {useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import ClassRecordingPlayer from '@/components/learning/ClassRecordingPlayer';
import {useEffect,useRef,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import {classMediaUrl} from '@/lib/learning/classMedia';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
type Session={module_id:string;id:string;title:string;starts_at:string};
type Artifact={id:string;session_id:string;artifact_type:string;publication_status:string;storage_reference:string|null;available_at:string|null};
type Pack={id:string;session_id:string;summary:string|null;status:string};
const released=(a:Artifact)=>a.publication_status==='published'&&!!a.available_at&&Date.parse(a.available_at)<=Date.now();
export default function LessonArchive(){const {user}=useAuth();const [params]=useSearchParams();const filter=params.get('module')||'';return <ArchiveWorkspace key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles.join(',')}:${filter}`} moduleFilter={filter}/>;}
function ArchiveWorkspace({moduleFilter}:{moduleFilter:string}){
 const {user}=useAuth();
 const [sessions,setSessions]=useState<Session[]>([]),[artifacts,setArtifacts]=useState<Artifact[]>([]),[packs,setPacks]=useState<Pack[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0);
 const [downloading,setDownloading]=useState<string|null>(null),[playing,setPlaying]=useState('');
 const mounted=useRef(true),operation=useRef(false),popup=useRef<Window|null>(null),generation=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;popup.current?.close();};},[]);
 useEffect(()=>{let active=true;generation.current++;setLoading(true);setError('');setSessions([]);setArtifacts([]);setPacks([]);setPlaying('');setPage(0);
  void (async()=>{try{
   if(!user?.id||!user.tenantId)throw Error('A signed-in account and centre assignment are required.');
   const classes=await pagedRows<Session>(()=>{let q=db.from('live_class_sessions').select('id,title,module_id,starts_at').eq('tenant_id',user.tenantId);if(moduleFilter)q=q.eq('module_id',moduleFilter);return q;},()=>active);
   const ids=classes.map(s=>s.id);
   const [assets,summaries]=await Promise.all([
    rowsByIds<Artifact>(ids,batch=>()=>db.from('live_class_artifacts').select('id,session_id,artifact_type,publication_status,storage_reference,available_at').eq('tenant_id',user.tenantId).in('session_id',batch).eq('publication_status','published'),()=>active),
    rowsByIds<Pack>(ids,batch=>()=>db.from('lesson_ai_packs').select('id,session_id,summary,status').eq('tenant_id',user.tenantId).in('session_id',batch).eq('status','published'),()=>active)
   ]);
   if(!active)return;
   setSessions(classes.sort((a,b)=>b.starts_at.localeCompare(a.starts_at)||a.id.localeCompare(b.id)));setArtifacts(assets.filter(released));setPacks(summaries);
  }catch{if(active)setError('Your lesson archive could not be verified. Refresh to retry, or ask your centre to check your class invitations.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;generation.current++;};
 },[user?.id,user?.tenantId,moduleFilter,refresh]);
 const openAsset=async(a:Artifact)=>{
  if(operation.current||!a.storage_reference||!released(a))return;
  operation.current=true;setDownloading(a.id);const request=generation.current;
  const target=window.open('about:blank','_blank');popup.current=target;if(target)target.opener=null;
  try{if(!target)throw Error('Allow pop-ups to open the private file, then retry.');const url=await classMediaUrl(a.storage_reference);
   if(!mounted.current||request!==generation.current){target.close();return;}target.location.replace(url);popup.current=null;
  }catch(e){target?.close();if(mounted.current&&request===generation.current)toast.error(e instanceof Error?e.message:'Media unavailable.');}finally{operation.current=false;if(mounted.current)setDownloading(null);}
 };
 const hasRecording=(id:string)=>artifacts.some(a=>a.session_id===id&&a.artifact_type==='recording'&&a.storage_reference);
 const visible=sessions.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())&&(filter==='all'||filter==='recordings'&&hasRecording(s.id)||filter==='packs'&&packs.some(p=>p.session_id===s.id&&p.summary)));
 const activeAsset=artifacts.find(a=>a.id===playing),activeSession=sessions.find(s=>s.id===activeAsset?.session_id);
 return <DashboardLayout title="My lesson archive" subtitle="Find recordings and approved revision materials from your classes">
  <ModuleJourney moduleId={moduleFilter} teacher={!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r))}/>
  <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Private class recordings</h2><p className="mt-2 text-sm text-muted-foreground">Recordings appear after processing and academic release. Your class invitation and private storage permissions control access.</p></div>
  <div className="mb-5 flex flex-wrap items-end gap-3"><label className="text-sm">Search classes<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Class title"/></label><label className="text-sm">Show<select className="block h-11 rounded-lg border bg-background px-3" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">All invited classes</option><option value="recordings">Recordings available</option><option value="packs">Revision packs available</option></select></label><Button variant="outline" disabled={loading||!!downloading} onClick={()=>setRefresh(n=>n+1)}>Refresh archive</Button></div>
  {loading&&<p role="status">Checking your lesson archive…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}</p>}
  {activeAsset?.storage_reference&&activeSession&&<ClassRecordingPlayer key={activeAsset.id} recordingId={activeAsset.id} path={activeAsset.storage_reference} title={activeSession.title} onClose={()=>setPlaying('')}/>}
  {!loading&&!error&&!visible.length&&<p role="status" className="rounded-xl border p-6 text-sm text-muted-foreground">{search||filter!=='all'?'No classes match these filters. Try another title or show all classes.':'No authorised classes are available. Ask your lecturer to check your invitations.'}</p>}
  {!loading&&!error&&<div className="space-y-4">{visible.slice(page*10,page*10+10).map(session=>{
   const assets=artifacts.filter(a=>a.session_id===session.id),pack=packs.find(p=>p.session_id===session.id);
   return <section className="rounded-xl border bg-card p-5" key={session.id}>
    <h3 className="break-words font-bold">{session.title}</h3><p className="mt-1 text-sm text-muted-foreground">{new Date(session.starts_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi',dateStyle:'medium',timeStyle:'short'})} · Pakistan time</p>
    {!assets.length&&!pack&&<p className="mt-3 text-sm text-muted-foreground">Recording or revision materials have not yet been released.</p>}
    <div className="mt-3 flex flex-wrap gap-2">{assets.map(a=><div key={a.id} className="flex flex-wrap gap-2">{a.artifact_type==='recording'&&a.storage_reference&&<Button onClick={()=>setPlaying(a.id)}>{playing===a.id?'Recording open':'Watch recording'}</Button>}<Button variant="outline" disabled={!a.storage_reference||!!downloading} onClick={()=>void openAsset(a)}>{downloading===a.id?'Opening…':`Open ${a.artifact_type.replace(/_/g,' ')} file`}</Button></div>)}</div>
    {pack?.summary&&<details className="mt-4 border-t pt-3"><summary className="cursor-pointer font-semibold">Approved revision pack</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm">{pack.summary}</p></details>}
   </section>;
  })}</div>}
  {!loading&&!error&&visible.length>10&&<nav aria-label="Lesson archive pages" className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!page} onClick={()=>setPage(n=>n-1)}>Previous classes</Button><span>Page {page+1} of {Math.ceil(visible.length/10)}</span><Button variant="outline" disabled={(page+1)*10>=visible.length} onClick={()=>setPage(n=>n+1)}>Next classes</Button></nav>}
 </DashboardLayout>;
}
