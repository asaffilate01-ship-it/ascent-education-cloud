import ModuleJourney from '@/components/assessment/ModuleJourney';
import TeamsLink from '@/components/native/TeamsLink';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import {isTeamsMeetingUrl as isTeamsUrl} from '@/lib/teamsTeaching';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, BookOpen, Calendar, ExternalLink, Film, Hand, PenTool, ShieldCheck, Video, Users } from 'lucide-react';

type Session={id:string;title:string;module_id:string|null;starts_at:string;ends_at:string;
 class_mode:string;status:string;join_url:string|null;recording_enabled:boolean;capacity:number};
type Board={id:string;session_id:string;title:string};
export default function TeamsClassroom(){const {user}=useAuth();return <ClassroomWorkspace key={`${user?.id}:${user?.tenantId}`}/>;}
function ClassroomWorkspace(){
 const {user}=useAuth();const [params]=useSearchParams();const moduleId=params.get('module');
 const [sessions,setSessions]=useState<Session[]>([]);
 const [boards,setBoards]=useState<Board[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [boardError,setBoardError]=useState('');
 const [showPast,setShowPast]=useState(false);const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  if(!user?.id){setSessions([]);setLoading(false);return;}
  let live=true;setLoading(true);setError('');setBoardError('');
  void Promise.all([
   db.from('live_class_sessions').select('id,title,module_id,starts_at,ends_at,class_mode,status,join_url,recording_enabled,capacity')
    .order('starts_at',{ascending:false}).limit(200),
   db.from('lesson_whiteboards').select('id,session_id,title').order('created_at',{ascending:false}).limit(200),
  ]).then(([classes,whiteboards])=>{
   if(!live)return;
   if(classes.error){setError(classes.error.message);setSessions([]);}else setSessions((classes.data||[]) as Session[]);
   if(whiteboards.error){setBoardError(whiteboards.error.message);setBoards([]);}else setBoards((whiteboards.data||[]) as Board[]);
   setLoading(false);
  }).catch(()=>{if(live){setError('Classroom service unavailable');setLoading(false);}});
  return()=>{live=false};
 },[user?.id,user?.tenantId,refresh]);
 const upcoming=useMemo(()=>[...sessions].filter(s=>(!moduleId||s.module_id===moduleId)&&s.status!=='cancelled' && (showPast ? new Date(s.ends_at).getTime()<Date.now() : new Date(s.ends_at).getTime()>=Date.now()))
  .sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime()),[sessions,showPast,moduleId]);
 const teacher=!!user?.roles.some(r=>['lecturer','programme_leader','centre_director','superadmin'].includes(r));
 return <DashboardLayout title="UniPathway Live Classroom" subtitle="Private lecture rooms with interactive whiteboard and on-demand materials">
  {user?.role==='student'&&<ModuleJourney moduleId={moduleId||undefined}/>}
  <section className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
   <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5"/>Invited students and allocated teachers only</h2>
   <p className="mt-2 text-sm text-muted-foreground">Students need an active enrolment AND an invitation for a specific class. For 100+ student lectures, everyone sees one presenter-controlled board without individual copies. The board can be shared into Teams recording by the lecturer. Microsoft Teams lobby, presenter and recording permissions must be configured separately.</p>
   {teacher&&<div className="mt-3 flex flex-wrap gap-4">
    <Link className="inline-flex items-center gap-2 text-sm font-bold underline" to="/lecturer/class-scheduler"><Calendar className="size-4"/>Class scheduling and bulk invitations</Link>
    <Link className="inline-flex items-center gap-2 text-sm font-bold underline" to="/lecturer/whiteboards"><PenTool className="size-4"/>Whiteboard Studio</Link>
   </div>}
  </section>
  <div className="mb-5 flex flex-wrap gap-3"><button type="button" className="rounded-lg border px-4 py-2 text-sm" aria-pressed={!showPast} onClick={()=>setShowPast(false)}>Upcoming classes</button><button type="button" className="rounded-lg border px-4 py-2 text-sm" aria-pressed={showPast} onClick={()=>setShowPast(true)}>Past classes</button><button type="button" className="rounded-lg border px-4 py-2 text-sm" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh classes</button></div>
  {loading&&<p role="status">Checking your class invitations…</p>}
  {error&&<div role="alert" className="rounded-xl border border-destructive/50 p-5">
    <AlertTriangle className="mr-2 inline size-5"/>Classroom could not be loaded: {error}
    <p className="mt-2 text-xs text-muted-foreground">Try Refresh classes. If the problem continues, contact your centre with the error above.</p>
   </div>}
  {boardError&&!loading&&<p role="alert" className="mb-4 rounded-lg border p-3 text-sm">Whiteboards are not configured or accessible: {boardError}</p>}
  {!loading&&!error&&upcoming.length===0&&<div className="rounded-xl border p-8 text-center">
   <Video className="mx-auto size-7 text-muted-foreground"/><h3 className="mt-3 font-semibold">{showPast?'No past classes':'No upcoming classes'}</h3>
   <p className="mt-2 text-sm text-muted-foreground">Eligible lectures will appear after enrolment and an approved invitation.</p>
  </div>}
  {!loading&&!error&&<div className="grid gap-4 md:grid-cols-2">{upcoming.map(s=>{
    const current=Date.now(),start=new Date(s.starts_at).getTime(),end=new Date(s.ends_at).getTime();
    const joinWindow=current>=start-20*60_000&&current<=end+30*60_000;
    const joinable=joinWindow&&isTeamsUrl(s.join_url);
    const board=boards.find(b=>b.session_id===s.id);
    return <article key={s.id} className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">{s.title}</h3><StatusBadge status={s.status}/></div>
      <p className="mt-2 text-sm text-muted-foreground">{new Date(s.starts_at).toLocaleString()} · {s.class_mode}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-4"/>Planned class capacity: {s.capacity}. Actual Teams licence/provider limits apply.</p>
      <p className="mt-2 text-xs text-muted-foreground">{s.recording_enabled?'Teams recording requested; successful capture and release are separate.':'Teams recording not requested.'}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
       {joinable?<TeamsLink className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href={s.join_url!} target="_blank" rel="noopener noreferrer">Join Teams <ExternalLink className="size-4"/></TeamsLink>:
        <p className="text-xs font-semibold text-muted-foreground">{current>end+30*60_000?'Class completed':!joinWindow?'Teams join opens 20 minutes before start':'Verified Teams link not configured'}</p>}
       <Link className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" to={'/classroom/teaching/'+s.id}>Teaching desk · groups & recordings</Link>
       <Link className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" to={'/classroom/discussion/'+s.id}><Hand className="size-4"/>Raise hand / Ask a question</Link>
       {board?<Link className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" to={'/classroom/whiteboard/'+board.id}><PenTool className="size-4"/>Open live board & replay</Link>:
       <span className="text-xs text-muted-foreground">{boardError?'Board unavailable':'Lecturer has not created the board yet'}</span>}
      </div>
     </article>;
   })}</div>}
  <div className="mt-6 rounded-xl border p-4"><h2 className="flex items-center gap-2 font-semibold"><Film className="size-5"/>Lesson archive</h2>
   <p className="mt-2 text-sm text-muted-foreground">Saved whiteboard drawings replay independently from Teams video. Private recordings, transcripts and approved learning packs appear only when received and published.</p>
   <Link className="mt-3 inline-block text-sm font-semibold underline" to={teacher?'/lecturer/lesson-archive':'/student/lesson-archive'}>Open my class archive</Link>
   <Link className="ml-4 mt-3 inline-flex items-center gap-2 text-sm font-semibold underline" to={teacher?'/lecturer/materials':'/student/materials'}><BookOpen className="size-4"/>All enrolled course notes and materials</Link>
  </div>
 </DashboardLayout>;
}
