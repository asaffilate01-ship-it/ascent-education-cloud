import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { db } from '@/lib/db';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Film, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Session={id:string;title:string;starts_at:string};
type Artifact={id:string;session_id:string;artifact_type:string;publication_status:string;storage_reference:string|null;available_at:string|null};
type Pack={session_id:string;summary:string|null;status:string};
export default function LessonArchive(){
 const {user}=useAuth();
 const [sessions,setSessions]=useState<Session[]>([]);
 const [artifacts,setArtifacts]=useState<Artifact[]>([]);
 const [packs,setPacks]=useState<Pack[]>([]);
 const [loading,setLoading]=useState(true);
 const [downloading,setDownloading]=useState<string|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{if(!user?.id)return;let active=true;setLoading(true);setError('');
  void Promise.all([
   db.from('live_class_sessions').select('id,title,starts_at').order('starts_at',{ascending:false}).limit(200),
   db.from('live_class_artifacts').select('id,session_id,artifact_type,publication_status,storage_reference,available_at').order('available_at',{ascending:false}).limit(300),
   db.from('lesson_ai_packs').select('session_id,summary,status').eq('status','published').limit(200),
  ]).then(([s,a,p])=>{if(!active)return;const broken=[s,a,p].find(x=>x.error);
   if(broken){setError(broken.error.message);setSessions([]);setArtifacts([]);setPacks([]);}
   else{setSessions((s.data||[]) as Session[]);setArtifacts((a.data||[]) as Artifact[]);setPacks((p.data||[]) as Pack[]);}
   setLoading(false);
  }).catch(()=>{if(active){setError('Unable to load class archive.');setLoading(false);}});
  return()=>{active=false};
 },[user?.id,user?.tenantId]);
 const openAsset=async(a:Artifact)=>{
  if(!a.storage_reference||a.publication_status!=='published'){toast.error('This asset has not been released.');return;}
  setDownloading(a.id);
  const {data,error:e}=await supabase.storage.from('unipathway-class-media').createSignedUrl(a.storage_reference,120);
  setDownloading(null);
  if(e||!data?.signedUrl){toast.error('Access denied or media unavailable.');return;}
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 };
 return <DashboardLayout title="My lesson archive" subtitle="Approved recordings, transcripts and revision packs for your invited classes">
  <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Recorded lessons remain private</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only published teaching artifacts for classes you are authorised to attend can be downloaded. Media links are short-lived and require private Storage approval. Recording, transcription, upload and academic release must each complete before a lesson appears here.</p></div>
  {loading&&<p role="status">Checking approved lesson recordings…</p>}
  {error&&<div role="alert" className="rounded-lg border border-destructive p-4"><AlertTriangle className="mr-2 inline size-4"/>Lesson archive not available: {error}. Check deployed classroom schema and permission policies.</div>}
  {!loading&&!error&&sessions.length===0&&<p className="rounded-xl border p-6 text-sm text-muted-foreground">No authorised class recordings are available. Ask your lecturer if you believe you should have access.</p>}
  {!loading&&!error&&<div className="space-y-4">{sessions.map(session=>{
   const released=artifacts.filter(a=>a.session_id===session.id&&a.publication_status==='published'&&a.available_at&&new Date(a.available_at).getTime()<=Date.now());
   const pack=packs.find(p=>p.session_id===session.id);
   return <section className="rounded-xl border bg-card p-5" key={session.id}>
    <h3 className="font-bold">{session.title}</h3><p className="mt-1 text-xs text-muted-foreground">{new Date(session.starts_at).toLocaleString()}</p>
    {released.length===0&&!pack&&<p className="mt-3 text-sm text-muted-foreground">Recording or learning materials have not yet been published.</p>}
    {released.length>0&&<div className="mt-3 flex flex-wrap gap-2">{released.map(a=><Button variant="outline" size="sm" disabled={!a.storage_reference||downloading===a.id} key={a.id} onClick={()=>openAsset(a)}>
      {a.artifact_type==='recording'?<Film className="mr-1 size-4"/>:<FileText className="mr-1 size-4"/>}{a.artifact_type} {downloading===a.id?'…':'↗'}
     </Button>)}</div>}
    {pack?.summary&&<div className="mt-4 border-t pt-3"><h4 className="font-semibold">Approved revision pack</h4><p className="mt-2 whitespace-pre-wrap text-sm">{pack.summary}</p></div>}
   </section>;
  })}</div>}
 </DashboardLayout>;
}
