import {useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useScheduledLectures,DAY_NAMES,TIME_SLOTS} from '@/hooks/useScheduledLectures';
import {scheduleConflicts} from '@/lib/scheduleConflicts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {DashboardSkeleton} from '@/components/ui/Skeletons';
export default function ScheduleManager(){const {user}=useAuth();return <ScheduleContent key={`${user?.id}:${user?.tenantId}`}/>;}
function ScheduleContent(){
 const {user}=useAuth();const schedule=useScheduledLectures();
 const modules=useSupabaseQuery('modules',{enabled:!!user?.tenantId,filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId}]});
 const [moduleId,setModuleId]=useState(''),[day,setDay]=useState('1'),[start,setStart]=useState('09:00'),[end,setEnd]=useState('10:30'),[year,setYear]=useState(String(new Date().getFullYear())),[semester,setSemester]=useState('1'),[from,setFrom]=useState(new Date().toISOString().slice(0,10)),[until,setUntil]=useState(''),[room,setRoom]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canManage=!!user&&['superadmin','centre_director','programme_leader','lecturer'].includes(user.role);
 const selected=modules.data.find(m=>m.id===moduleId);
 const clashes=scheduleConflicts(schedule.lectures);
 async function save(e:React.FormEvent){e.preventDefault();if(busy||!user?.tenantId)return;setError('');
  if(!selected?.lecturer_id){setError('Assign a lecturer to this module before scheduling.');return;}
  if(start>=end||(until&&until<from)){setError('The end time and end date must follow the start.');return;}
  const candidate={id:'new',tenant_id:user.tenantId,module_id:moduleId,lecturer_id:selected.lecturer_id,day_of_week:Number(day),start_time:start+':00',end_time:end+':00',academic_year:year,semester:Number(semester),effective_from:from,effective_until:until||null,room:room.trim()||null,is_active:true};
  if(scheduleConflicts([...schedule.lectures,candidate]).some(c=>c.a==='new'||c.b==='new')){setError('This overlaps an existing lecturer, room or module booking. Choose another time.');return;}
  setBusy(true);try{const ok=await schedule.addLecture({...candidate,id:undefined,room:room.trim()||'Virtual',recurrence:'weekly'});if(!ok)setError('The schedule was not saved. Check the assignment and try again.');}finally{setBusy(false);}
 }
 if(!user?.tenantId)return <DashboardLayout title="Timetable"><p role="alert">A centre assignment is required.</p></DashboardLayout>;
 if(schedule.loading||modules.loading)return <DashboardSkeleton/>;
 if(schedule.error||modules.error)return <DashboardLayout title="Timetable"><p role="alert">Your timetable could not be loaded.</p><Button onClick={()=>{void schedule.refetch();void modules.refetch();}}>Retry</Button></DashboardLayout>;
 const input='mt-1 block min-h-11 w-full rounded-lg border bg-background px-3 text-base';
 return <DashboardLayout title="Timetable" subtitle="Saved weekly classes · Pakistan time" actions={<Button variant="outline" onClick={()=>void schedule.refetch()}>Refresh timetable</Button>}>
  <section className="mb-5 rounded-xl border p-5"><h2 className="font-semibold">{schedule.lectures.length} scheduled classes · {clashes.length} potential clashes</h2><p className="mt-2 text-sm text-muted-foreground">Clash checks cover visible lecturer, room and module bookings in the same academic year and semester. Review shared student groups and live-class invitations separately.</p>{clashes.map(c=><p role="alert" className="mt-2 text-sm text-destructive" key={c.a+c.b}>{c.reasons.join(', ')}: {schedule.lectures.find(l=>l.id===c.a)?.module_title} / {schedule.lectures.find(l=>l.id===c.b)?.module_title}</p>)}</section>
  <section aria-label="Scheduled classes" className="mb-6 grid gap-3 md:grid-cols-2">{!schedule.lectures.length&&<p>No classes are scheduled yet. Your programme team needs to assign modules and teaching times.</p>}{schedule.lectures.map(l=><article key={l.id} className="rounded-xl border bg-card p-5"><h2 className="font-semibold">{l.module_title}</h2><p className="mt-2">{DAY_NAMES[l.day_of_week-1]} · {l.start_time.slice(0,5)}–{l.end_time.slice(0,5)} PKT</p><p className="text-sm text-muted-foreground">{l.programme_title} · {l.academic_year}, semester {l.semester}</p><p className="text-sm text-muted-foreground">{l.room||'Room not specified'} · From {l.effective_from}{l.effective_until?` until ${l.effective_until}`:''}</p></article>)}</section>
  {canManage&&<form onSubmit={save} aria-busy={busy} className="rounded-xl border p-5"><h2 className="text-lg font-semibold">Schedule an assigned module</h2><p className="mt-2 text-sm text-muted-foreground">Uses the lecturer assigned to the module. This creates a 90-minute weekday timetable entry; online meeting invitations are managed in Live Classes.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   <label>Module<select required className={input} value={moduleId} onChange={e=>setModuleId(e.target.value)}><option value="">Choose a module</option>{modules.data.filter(m=>m.lecturer_id).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
   <label>Day<select className={input} value={day} onChange={e=>setDay(e.target.value)}>{DAY_NAMES.slice(0,5).map((d,i)=><option value={i+1} key={d}>{d}</option>)}</select></label>
   <label>Academic year<input required maxLength={20} className={input} value={year} onChange={e=>setYear(e.target.value)}/></label>
   <label>Semester<input required type="number" min="1" max="3" className={input} value={semester} onChange={e=>setSemester(e.target.value)}/></label>
   <label>Class time<select className={input} value={start} onChange={e=>{setStart(e.target.value);setEnd(TIME_SLOTS.find(t=>t.start===e.target.value)!.end);}}>{TIME_SLOTS.map(t=><option key={t.start} value={t.start}>{t.label} PKT</option>)}</select></label>

   <label>Starts on<input required type="date" className={input} value={from} onChange={e=>setFrom(e.target.value)}/></label>
   <label>Ends on (optional)<input type="date" className={input} value={until} onChange={e=>setUntil(e.target.value)}/></label>
   <label>Room (optional)<input maxLength={100} className={input} value={room} onChange={e=>setRoom(e.target.value)}/></label>
  </div>{error&&<p role="alert" className="mt-3 text-destructive">{error}</p>}<Button className="mt-4" disabled={busy}>{busy?'Saving…':'Save weekly class'}</Button></form>}
 </DashboardLayout>;
}
