import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Calendar, ExternalLink, Film, ShieldCheck, Video } from 'lucide-react';

type Session = {
 id:string; title:string; module_id:string|null; starts_at:string; ends_at:string;
 class_mode:string; status:string; join_url:string|null; recording_enabled:boolean;
};
function isTeamsUrl(value: string | null):value is string {
 if(!value)return false;
 try {const url=new URL(value);return url.protocol==='https:'&&url.hostname==='teams.microsoft.com';}
 catch{return false;}
}
export default function TeamsClassroom(){
 const {user}=useAuth();
 const [sessions,setSessions]=useState<Session[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!user?.id){setSessions([]);setLoading(false);return;}
  let live=true;
  setLoading(true);setError('');
  // SQL RLS requires both an active programme enrolment AND a per-class invitation
  // for learner access. Staff must be the assigned lecturer or an authorised manager.
  void db.from('live_class_sessions')
   .select('id,title,module_id,starts_at,ends_at,class_mode,status,join_url,recording_enabled')
   .order('starts_at',{ascending:true})
   .then(({data,error:err})=>{if(!live)return;if(err){setError(err.message);setSessions([]);}else setSessions((data||[]) as Session[]);setLoading(false);})
   .catch(()=>{if(live){setError('Classroom service unavailable');setLoading(false);}});
  return ()=>{live=false};
 },[user?.id,user?.tenantId]);
 const upcoming=useMemo(()=>sessions.filter(s=>new Date(s.ends_at).getTime()>Date.now()&&s.status!=='cancelled'),[sessions]);
 const teacher=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 return <DashboardLayout title="UniPathway Live Classroom" subtitle="Invited learners, allocated lecturers and secure academic materials">
  <section className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
   <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5"/>Private, enrolment-gated classes</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only people invited to an eligible course can see a class through UniPathway. Joining opens the Microsoft Teams meeting until an Azure Communication Services branded video experience is activated. Microsoft Entra, lobby and presenter policies must independently enforce admission; a forwarded Teams link must never bypass the lobby.</p>
   {teacher&&<Link className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline" to="/lecturer/class-scheduler"><Calendar className="size-4"/>Manage schedules and invitations</Link>}
  </section>
  {loading&&<p role="status">Checking your class invitations…</p>}
  {error&&<div role="alert" className="rounded-xl border border-destructive/50 p-5">
    <div className="flex gap-2 font-semibold"><AlertTriangle className="size-5"/>Classroom could not be loaded.</div>
    <p className="mt-2 text-sm">{error}</p>
    <p className="mt-2 text-xs text-muted-foreground">The classroom tables and access policies must be deployed and tested before this service is available. No sessions or permissions have been assumed.</p>
   </div>}
  {!loading&&!error&&upcoming.length===0&&<div className="rounded-xl border p-8 text-center">
   <Video className="mx-auto size-7 text-muted-foreground"/><h3 className="mt-3 font-semibold">No invited upcoming classes</h3>
   <p className="mt-2 text-sm text-muted-foreground">When you are enrolled and invited by your lecturer, eligible classes appear here. Contact course administration if a class is missing.</p>
  </div>}
  {!loading&&!error&&<div className="grid gap-4 md:grid-cols-2">
   {upcoming.map(s=>{
    const current=Date.now();const start=new Date(s.starts_at).getTime(),end=new Date(s.ends_at).getTime();
    const joinWindow=current>=start-20*60_000&&current<=end+30*60_000;
    const joinable=joinWindow&&isTeamsUrl(s.join_url);
    return <article key={s.id} className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{s.title}</h3><StatusBadge status={s.status}/></div>
      <p className="mt-2 text-sm text-muted-foreground">{new Date(s.starts_at).toLocaleString()} — {new Date(s.ends_at).toLocaleTimeString()} · {s.class_mode}</p>
      <p className="mt-3 text-xs text-muted-foreground">{s.recording_enabled?'Recording requested; access will follow academic review and release.':'Recording not requested.'}</p>
      {joinable?<a className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={s.join_url!} target="_blank" rel="noopener noreferrer">Join Teams meeting <ExternalLink className="size-4"/></a>:
       <p className="mt-4 text-xs font-semibold text-muted-foreground">{!joinWindow?'Join opens 20 minutes before the scheduled start.':'A verified Teams link has not been configured.'}</p>}
     </article>;
   })}
  </div>}
  <div className="mt-6 rounded-xl border p-4"><h2 className="flex items-center gap-2 font-semibold"><Film className="size-5"/>Recording and lesson archive</h2><p className="mt-2 text-sm text-muted-foreground">Only released recordings, transcripts and approved lesson packs appear in the archive. Microsoft recording capture, consent, retention and Graph ingestion must be configured by your institution.</p><Link className="mt-3 inline-block text-sm font-semibold underline" to={teacher?'/lecturer/lesson-archive':'/student/lesson-archive'}>Open my class archive</Link></div>
 </DashboardLayout>;
}
