import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {isTeamsMeetingUrl as validTeamsUrl} from '@/lib/teamsTeaching';
import { db } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CalendarDays, ShieldCheck, Users, Video } from 'lucide-react';

type Module={id:string;title:string;programme_id:string;tenant_id:string;lecturer_id:string|null};
type Enrolment={student_id:string;programme_id:string;tenant_id:string;status:string};
type Student={user_id:string;full_name:string|null;email:string|null;tenant_id:string|null};
type Session={id:string;title:string;module_id:string|null;starts_at:string;ends_at:string;status:string;capacity:number};
export default function LiveClassScheduler(){
 const {user}=useAuth();
 const [tenantId,setTenantId]=useState<string|null>(user?.tenantId||null);
 const [modules,setModules]=useState<Module[]>([]);
 const [sessions,setSessions]=useState<Session[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
 const [enrolments,setEnrolments]=useState<Enrolment[]>([]);
 const [invites,setInvites]=useState<{session_id:string;user_id:string}[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [title,setTitle]=useState('');const [moduleId,setModuleId]=useState('');
 const [start,setStart]=useState('');const [end,setEnd]=useState('');
 const [joinUrl,setJoinUrl]=useState('');
 const [capacity,setCapacity]=useState(20);
 const [recipient,setRecipient]=useState<Record<string,string>>({});
 const manager=!!user?.roles.some(x=>['programme_leader','centre_director','superadmin'].includes(x));
 useEffect(()=>{if(!user?.id)return;let active=true;(async()=>{
  let t=user.tenantId||null;
  if(!t&&user.roles.includes('superadmin')){const {data}=await db.from('tenants').select('id').eq('slug','unipathway').maybeSingle();t=data?.id||null;}
  if(active)setTenantId(t);
 })();return()=>{active=false};},[user?.id,user?.tenantId,user?.roles.join('|')]);
 useEffect(()=>{if(!user?.id)return;if(!tenantId){setLoading(false);setError('No approved centre tenant is attached to this account.');return;}
  let active=true;setLoading(true);setError('');
  void Promise.all([
   db.from('modules').select('id,title,programme_id,tenant_id,lecturer_id').eq('tenant_id',tenantId),
   db.from('live_class_sessions').select('id,title,module_id,starts_at,ends_at,status,capacity').eq('tenant_id',tenantId).order('starts_at',{ascending:true}),
   db.from('student_enrolments').select('student_id,programme_id,tenant_id,status').eq('tenant_id',tenantId).eq('status','active'),
   db.from('profiles').select('user_id,full_name,email,tenant_id').eq('tenant_id',tenantId),
   db.from('live_class_invitations').select('session_id,user_id').eq('tenant_id',tenantId),
  ]).then(([m,s,e,p,i])=>{
   if(!active)return;
   const bad=[m,s,e,p,i].find(x=>x.error);
   if(bad){setError(bad.error.message);setLoading(false);return;}
   const eligible=manager?(m.data||[]):(m.data||[]).filter((row:Module)=>row.lecturer_id===user.id);
   setModules(eligible as Module[]);setSessions((s.data||[]) as Session[]);
   setEnrolments((e.data||[]) as Enrolment[]);setStudents((p.data||[]) as Student[]);
   setInvites((i.data||[]) as {session_id:string;user_id:string}[]);
   setLoading(false);
  }).catch(()=>{if(active){setError('Cannot load secure classroom scheduling.');setLoading(false);}});
  return()=>{active=false};
 },[tenantId,user?.id,manager]);
 const available=useMemo(()=>sessions.filter(s=>modules.some(m=>m.id===s.module_id)),[sessions,modules]);
 const create=async()=>{
  if(!tenantId||!user?.id||!moduleId||!title.trim()||!start||!end||!validTeamsUrl(joinUrl)){
   toast.error('Choose a module, dates and a valid Microsoft Teams meeting link.');return;
  }
  if(new Date(end).getTime()<=new Date(start).getTime()){toast.error('Class must end after it starts.');return;}
  setSaving(true);
  const {data,error:e}=await db.from('live_class_sessions').insert({
   tenant_id:tenantId,module_id:moduleId,organiser_user_id:user.id,title:title.trim(),
   starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),
   join_url:joinUrl.trim(),provider:'microsoft_teams',status:'scheduled',capacity,
   recording_enabled:true,transcript_enabled:true,whiteboard_enabled:true
  }).select('id,title,module_id,starts_at,ends_at,status,capacity').single();
  setSaving(false);
  if(e){toast.error('Class was not scheduled: '+e.message);return;}
  setSessions(prev=>[...prev,data as Session].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));
  setTitle('');setStart('');setEnd('');setJoinUrl('');toast.success('Class saved. Now invite enrolled students.');
 };
 const invite=async(session:Session)=>{
  const id=recipient[session.id],module=modules.find(m=>m.id===session.module_id);
  if(!id||!user?.id||!tenantId||!module)return;
  setSaving(true);
  const {error:e}=await db.from('live_class_invitations').insert({tenant_id:tenantId,session_id:session.id,user_id:id,invited_by:user.id,status:'invited'});
  setSaving(false);
  if(e){toast.error('Invitation rejected: '+e.message);return;}
  setInvites(prev=>[...prev,{session_id:session.id,user_id:id}]);
  setRecipient(prev=>({...prev,[session.id]:''}));
  toast.success('Invitation saved. Student access is now scoped to this class. Notification delivery requires separate configuration.');
 };
 const inviteWholeClass=async(session:Session)=>{
  if(!window.confirm('Invite every actively enrolled student to this lecture, up to the planned class capacity? This records access invitations only; external email delivery is separate.'))return;
  setSaving(true);
  const {data,error:e}=await db.rpc('invite_enrolled_unipathway_lecture',{p_session:session.id});
  if(e){setSaving(false);toast.error('Bulk invitation rejected: '+e.message);return;}
  const {data:all,error:refreshError}=await db.from('live_class_invitations').select('session_id,user_id')
    .eq('session_id',session.id).eq('status','invited');
  setSaving(false);
  if(refreshError){toast.error('Invitations saved; refresh list unavailable.');return;}
  setInvites(previous=>[...previous.filter(i=>i.session_id!==session.id),...((all||[]) as {session_id:string;user_id:string}[])]);
  toast.success(String(data||0)+' new students invited to the class.');
 };
 return <DashboardLayout title="Class schedules and invitations" subtitle="Enterprise Teams scheduling with UniPathway course and learner permissions">
  <section className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5"/>Invitations are stored under the approved centre</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only an active programme enrolment with an explicit class invitation grants student access. Create a Microsoft Teams calendar meeting as an authorised organiser first, then enter its link here. Automatic Graph scheduling and recording ingestion require Microsoft tenant setup, admin consent, meeting policies and end-to-end validation.</p>
   <Link to="/lecturer/classroom" className="mt-2 inline-block text-sm font-semibold underline">View classroom</Link>
  </section>
  {loading&&<p role="status">Checking centre modules and invitations…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error} — confirm deployed schema, tenant mapping and RLS first.</p>}
  {!loading&&!error&&<div className="space-y-6">
   <section className="rounded-xl border bg-card p-5"><h2 className="mb-3 flex gap-2 font-bold"><CalendarDays className="size-5"/>Schedule Teams lesson</h2>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium">Assigned module<select className="mt-1 w-full rounded-md border bg-background p-2" value={moduleId} onChange={e=>setModuleId(e.target.value)}><option value="">Select a module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
      <label className="text-sm font-medium">Class name<Input className="mt-1" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/></label>
      <label className="text-sm font-medium">Start time<Input className="mt-1" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label>
      <label className="text-sm font-medium">End time<Input className="mt-1" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></label>
    </div><label className="mt-3 block text-sm font-medium">Microsoft Teams calendar meeting URL<Input className="mt-1" type="url" value={joinUrl} placeholder="https://teams.microsoft.com/l/meetup-join/..." onChange={e=>setJoinUrl(e.target.value)}/></label>
    <label className="mt-3 block text-sm font-medium">Planned lecture capacity<select aria-label="Planned lecture capacity" className="mt-1 w-full rounded-md border bg-background p-2" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}>{[20,30,50,100,150,200,250,300,350,500,1000].map(n=><option value={n} key={n}>{n} learners</option>)}</select></label>
    <p className="mt-2 text-xs text-muted-foreground">For 100–350 learners, test the chosen Teams/ACS limits and your Realtime plan. Capacity is a planning ceiling, not proof of admission or licensing. Larger meetings may require native Teams. Recording is requested, not guaranteed. Configure Teams recording/transcription and ensure learners receive the required notices and consent information.</p>
    <Button className="mt-3" disabled={saving||!tenantId} onClick={create}><Video className="mr-2 size-4"/>Schedule class</Button>
   </section>
   <section className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Users className="size-5"/>Invite eligible students</h2>
    {available.length===0&&<p className="rounded-lg border p-4 text-sm text-muted-foreground">No classes assigned or scheduled yet.</p>}
    {available.map(s=>{const module=modules.find(m=>m.id===s.module_id);
     const allowed=enrolments.filter(e=>e.programme_id===module?.programme_id && e.status==='active')
       .map(e=>students.find(p=>p.user_id===e.student_id)).filter((x):x is Student=>!!x)
       .filter(p=>!invites.some(i=>i.session_id===s.id&&i.user_id===p.user_id));
     const count=invites.filter(i=>i.session_id===s.id).length;
     const eligibleCount=new Set(enrolments.filter(e=>e.programme_id===module?.programme_id).map(e=>e.student_id)).size;
     return <article key={s.id} className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-xs text-muted-foreground">{module?.title} · {new Date(s.starts_at).toLocaleString()} · {eligibleCount} enrolled · {count} recorded invitation(s) · planned capacity {s.capacity}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-52 flex-1 text-sm font-medium">Enrolled learner<select className="mt-1 w-full rounded-md border bg-background p-2" value={recipient[s.id]||''} onChange={e=>setRecipient(p=>({...p,[s.id]:e.target.value}))}><option value="">Choose a student</option>{allowed.map(p=><option key={p.user_id} value={p.user_id}>{p.full_name||p.email||p.user_id}</option>)}</select></label><Button disabled={saving||!recipient[s.id]} onClick={()=>invite(s)}>Invite one</Button><Button variant="outline" disabled={saving||eligibleCount===0} onClick={()=>void inviteWholeClass(s)}>Invite entire class ({eligibleCount})</Button></div>
     </article>;
    })}
   </section>
  </div>}
 </DashboardLayout>;
}
