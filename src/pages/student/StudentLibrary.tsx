import {useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
type Resource={id:string;title:string;module:string;kind:string;bucket:string;path:string};
export default function StudentLibrary(){const {user}=useAuth();return <Library key={`${user?.id}:${user?.tenantId}`} userId={user?.id} tenantId={user?.tenantId}/>;}
export function Library({userId,tenantId}:{userId?:string;tenantId?:string}){
 const [resources,setResources]=useState<Resource[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[search,setSearch]=useState(''),[kind,setKind]=useState('all'),[busy,setBusy]=useState(''),[link,setLink]=useState<{url:string;title:string}|null>(null);
 useEffect(()=>{let active=true;setResources([]);setLink(null);setLoading(true);setError('');
  void(async()=>{try{
   if(!userId||!tenantId)throw new Error('Sign in with an approved centre account.');
   const [enrolments,modules,materials,sessions,artifacts]=await Promise.all([
    db.from('student_enrolments').select('programme_id').eq('student_id',userId).eq('tenant_id',tenantId).eq('status','active'),
    db.from('modules').select('id,title,programme_id').eq('tenant_id',tenantId),
    db.from('unipathway_module_materials').select('id,module_id,title,kind,object_path,available_at').eq('tenant_id',tenantId).eq('publication_status','published').order('created_at',{ascending:false}).limit(500),
    db.from('live_class_sessions').select('id,title,module_id').eq('tenant_id',tenantId).order('starts_at',{ascending:false}).limit(500),
    db.from('live_class_artifacts').select('id,session_id,artifact_type,storage_reference,available_at').eq('tenant_id',tenantId).eq('publication_status','published').in('artifact_type',['recording','transcript','slides','whiteboard']).lte('available_at',new Date().toISOString()).order('available_at',{ascending:false}).limit(500),
   ]);
   if([enrolments,modules,materials,sessions,artifacts].some(r=>r.error))throw new Error('Authorised library could not be loaded. Retry or contact your centre.');
   const programmes=new Set((enrolments.data||[]).map((e:{programme_id:string})=>e.programme_id));
   const eligible=new Map<string,string>((modules.data||[]).filter((m:{programme_id:string})=>programmes.has(m.programme_id)).map((m:{id:string;title:string})=>[m.id,m.title]));
   const classes=new Map<string,{title:string;module_id:string}>((sessions.data||[]).filter((s:{module_id:string})=>eligible.has(s.module_id)).map((s:{id:string;title:string;module_id:string})=>[s.id,s]));
   const list:Resource[]=(materials.data||[]).filter((m:{module_id:string;object_path:string;available_at:string|null})=>eligible.has(m.module_id)&&m.object_path&&(!m.available_at||Date.parse(m.available_at)<=Date.now())).map((m:{id:string;module_id:string;title:string;kind:string;object_path:string})=>({id:`material:${m.id}`,title:m.title,module:eligible.get(m.module_id)!,kind:m.kind,bucket:'unipathway-module-materials',path:m.object_path}));
   for(const a of artifacts.data||[]){const s=classes.get(a.session_id);if(s&&a.storage_reference&&a.available_at&&Date.parse(a.available_at)<=Date.now())list.push({id:`artifact:${a.id}`,title:s.title,module:eligible.get(s.module_id)!,kind:a.artifact_type,bucket:'unipathway-class-media',path:a.storage_reference});}
   if(active)setResources(list);
  }catch(e){if(active)setError(e instanceof Error?e.message:'Library unavailable.');}finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[userId,tenantId,refresh]);
 useEffect(()=>{if(!link)return;const timer=setTimeout(()=>setLink(null),110000);return()=>clearTimeout(timer);},[link]);
 const visible=useMemo(()=>resources.filter(r=>(kind==='all'||r.kind===kind)&&`${r.title} ${r.module}`.toLowerCase().includes(search.toLowerCase())),[resources,kind,search]);
 async function open(r:Resource){setBusy(r.id);setError('');setLink(null);try{const response=await supabase.storage.from(r.bucket).createSignedUrl(r.path,120);if(response.error||!response.data?.signedUrl)throw new Error('Access has expired or this resource is no longer available.');setLink({url:response.data.signedUrl,title:r.title});}catch(e){setError(e instanceof Error?e.message:'Unable to open resource.');}finally{setBusy('');}}
 return <DashboardLayout title="My learning library" subtitle="Published course materials and released recordings for your authorised learning">
  <p className="mb-4 text-sm text-muted-foreground">Materials require active enrolment. Class recordings also require your class invitation and staff release. Showing up to 500 recent materials and 500 released class resources. Access links expire after two minutes.</p>
  <div className="mb-5 flex flex-wrap gap-3"><Input aria-label="Search library" placeholder="Search title or module" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Resource type" className="rounded border bg-background p-2" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All resources</option>{[...new Set(resources.map(r=>r.kind))].sort().map(k=><option key={k}>{k}</option>)}</select><Button variant="outline" disabled={loading||!!busy} onClick={()=>setRefresh(v=>v+1)}>Refresh library</Button></div>
  {loading&&<p role="status">Loading authorised resources…</p>}{error&&<p role="alert" className="mb-4 text-destructive">{error}</p>}
  {link&&<div className="mb-4 rounded border p-4"><a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open or download {link.title}</a><p className="text-xs">This private link expires shortly. Request a new link if playback or downloading stops.</p></div>}
  {!loading&&!error&&!visible.length&&<p>No published resources match your library yet.</p>}
  {!loading&&<div className="space-y-3">{visible.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"><div><h2 className="font-semibold">{r.title}</h2><p className="text-sm text-muted-foreground">{r.module} · {r.kind}</p></div><Button variant="outline" disabled={!!busy} onClick={()=>void open(r)}>{busy===r.id?'Checking access…':'Get private access'}</Button></article>)}</div>}
 </DashboardLayout>;
}
