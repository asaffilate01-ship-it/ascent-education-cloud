import {useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import {useEffect,useMemo,useRef,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {learningResources,type LearningResource as Resource} from '@/lib/learningResources';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function StudentLibrary(){const {user}=useAuth();const [params]=useSearchParams();const moduleId=params.get('module')||undefined;return <Library moduleId={moduleId} initialKind={params.get('kind')||'all'} key={`${user?.id}:${user?.tenantId}:${user?.role}:${moduleId}:${params.get('kind')}`} userId={user?.id} tenantId={user?.tenantId}/>;}
export function Library({userId,tenantId,moduleId,initialKind='all'}:{userId?:string;tenantId?:string;moduleId?:string;initialKind?:string}){
 const accessGeneration=useRef(0),opening=useRef(false),searchInput=useRef<HTMLInputElement>(null);
 const [resources,setResources]=useState<Resource[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[kind,setKind]=useState(initialKind),[busy,setBusy]=useState(''),[page,setPage]=useState(0),[link,setLink]=useState<{url:string;title:string}|null>(null);
 useEffect(()=>{let active=true;accessGeneration.current++;opening.current=false;setBusy('');setResources([]);setPage(0);setLink(null);setLoading(true);setError('');
  void(async()=>{try{
   if(!userId||!tenantId)throw new Error('Sign in with an approved centre account.');
   const list=await learningResources(userId,tenantId,moduleId,()=>active);
   if(active)setResources(list);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Library unavailable.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;accessGeneration.current++;opening.current=false;};
 },[userId,tenantId,moduleId,refresh]);
 useEffect(()=>{if(!link)return;const timer=setTimeout(()=>setLink(null),110000);return()=>clearTimeout(timer);},[link]);
 const visible=useMemo(()=>resources.filter(r=>(kind==='all'||r.kind===kind)&&`${r.title} ${r.module}`.toLowerCase().includes(search.trim().toLowerCase())),[resources,kind,search]);
 function refreshLibrary(){accessGeneration.current++;opening.current=false;setBusy('');setLink(null);setRefresh(v=>v+1);}
 function clearFilters(){setSearch('');setKind('all');setPage(0);searchInput.current?.focus();}
 async function open(r:Resource){
  if(opening.current||loading)return;
  opening.current=true;const token=++accessGeneration.current;const current=()=>accessGeneration.current===token;
  setBusy(r.id);setError('');setLink(null);
  try{const response=await supabase.storage.from(r.bucket).createSignedUrl(r.path,120);
   if(!current())return;
   if(response.error||!response.data?.signedUrl)throw new Error('Access has expired or this resource is no longer available.');
   setLink({url:response.data.signedUrl,title:r.title});
  }catch(e){if(current())setError(e instanceof Error?e.message:'Unable to open resource.');}
  finally{if(current()){opening.current=false;setBusy('');}}
 }
 return <DashboardLayout title="My learning library" subtitle="Published course materials and released recordings for your authorised learning">
  <ModuleJourney moduleId={moduleId}/>
  <p className="mb-4 text-sm text-muted-foreground">Materials require active enrolment. Class recordings also require your class invitation and staff release. All authorised resources are loaded, including older classes. Access links expire after two minutes.</p>
  <div className="mb-5 flex flex-wrap gap-3"><Input ref={searchInput} type="search" maxLength={120} aria-describedby="library-result-count" aria-label="Search library" placeholder="Search title or module" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><select aria-label="Resource type" className="min-h-11 max-w-full rounded border bg-background p-2" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}}><option value="all">All resources</option>{[...new Set(['recording',...resources.map(r=>r.kind)])].sort().map(k=><option key={k}>{k}</option>)}</select><Button variant="outline" disabled={loading} onClick={refreshLibrary}>Refresh library</Button></div>
  {!loading&&!error&&<p id="library-result-count" role="status" aria-atomic="true" className="mb-4 text-sm text-muted-foreground">{visible.length} of {resources.length} authorised resources</p>}
  {(search||kind!=='all')&&<Button className="mb-4" variant="outline" onClick={clearFilters}>Clear library filters</Button>}
  {loading&&<p role="status">Loading authorised resources…</p>}{error&&<p role="alert" className="mb-4 text-destructive">{error}</p>}
  {link&&<div className="mb-4 rounded border p-4 [overflow-wrap:anywhere]"><a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open or download {link.title}</a><p className="text-xs">This private link expires shortly. Request a new link if playback or downloading stops.</p></div>}
  {!loading&&!error&&!visible.length&&<p>{resources.length?'No resources match your filters. Try another title or module, or clear the filters.':'No published resources match your library yet.'}</p>}
  {!loading&&<div className="space-y-3 [overflow-wrap:anywhere] [&_button]:max-w-full [&_button]:whitespace-normal">{visible.slice(page*20,page*20+20).map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div className="min-w-0"><h2 className="font-semibold">{r.title}</h2><p className="text-sm text-muted-foreground">{r.module} · {r.kind}</p></div><Button variant="outline" disabled={!!busy} onClick={()=>void open(r)}>{busy===r.id?'Checking access…':'Get private access'}</Button></article>)}</div>}
  {!loading&&visible.length>20&&<nav aria-label="Library pages" className="mt-4 flex flex-wrap items-center gap-3 [&_button]:max-w-full [&_button]:whitespace-normal"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous resources</Button><span>Page {page+1} of {Math.ceil(visible.length/20)} · {visible.length} resources</span><Button variant="outline" disabled={(page+1)*20>=visible.length} onClick={()=>setPage(p=>p+1)}>Next resources</Button></nav>}
 </DashboardLayout>;
}
