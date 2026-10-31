import {useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useScheduledLectures,DAY_NAMES} from '@/hooks/useScheduledLectures';
import {useAuth} from '@/contexts/AuthContext';
import {teachingHours,planOverlaps,matchesTeachingModuleSearch,pakistanTeachingDayOfWeek} from '@/lib/teachingPlan';
export default function LecturerTeaching(){const {user}=useAuth();return <TeachingWorkspace key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}`}/>;}
function TeachingWorkspace(){
 const {user}=useAuth();
 const modulesQuery=useSupabaseQuery('modules',{enabled:!!user?.id&&!!user?.tenantId,filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId},{column:'lecturer_id',operator:'eq',value:user?.id}],orderBy:{column:'title',ascending:true}});
 const schedule=useScheduledLectures();
 const [search,setSearch]=useState(''),[page,setPage]=useState(0),[dayFilter,setDayFilter]=useState<number|null>(null);
 const modules=modulesQuery.data.filter(m=>m.lecturer_id===user?.id&&m.tenant_id===user?.tenantId);
 const allowed=new Set(modules.map(m=>m.id));
 const lectures=schedule.myLectures.filter(l=>l.lecturer_id===user?.id&&allowed.has(l.module_id));
 const loading=modulesQuery.loading||schedule.loading;
 const error=modulesQuery.error||schedule.error;
 const filtered=modules.filter(m=>matchesTeachingModuleSearch(m.title,m.code,search));
 const overlapCount=planOverlaps(lectures);
 const pakistanToday=pakistanTeachingDayOfWeek();
 const week=DAY_NAMES.map((day,i)=>({day,index:i+1,slots:lectures.filter(l=>l.day_of_week===i+1).sort((a,b)=>a.start_time.localeCompare(b.start_time))}));
 const visibleDays=dayFilter===null?week:week.filter(d=>d.index===dayFilter);
 const hours=(id:string)=>teachingHours(lectures.filter(l=>l.module_id===id));
 async function refresh(){setPage(0);await Promise.all([modulesQuery.refetch(),schedule.refetch()]);}
 return <DashboardLayout title="Teaching" subtitle="Assigned modules and saved weekly teaching plans">
  <div className="mb-4 flex flex-wrap gap-3"><Button asChild><Link to="/lecturer/materials">Upload material</Link></Button><Button asChild variant="outline"><Link to="/lecturer/class-scheduler">Schedule invited classes</Link></Button><Button asChild variant="outline"><Link to="/lecturer/classroom">View class invitations</Link></Button><Button variant="outline" disabled={loading} onClick={()=>void refresh()}>Refresh teaching</Button></div>
  {!user?.tenantId?<p role="alert">A centre assignment is required.</p>:loading?<p role="status">Checking modules and weekly plans…</p>:error?<p role="alert">Your teaching plan could not be verified. Refresh to retry.</p>:<>
   <section className="mb-5 space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Plan and deliver classes</h2><p className="text-sm">Use the class scheduler to review dates, modules and invitations. Saved weekly plans do not create Teams meetings or invitations. Review effective dates and recurrence before delivery.</p>{overlapCount>0&&<p role="status">{overlapCount} possible overlaps in your saved plan. Review the times, effective dates and recurrence with your programme leader.</p>}</section>
   <div className="mb-4 flex flex-wrap items-end gap-3"><label className="block min-w-0 flex-1 text-sm font-medium">Search assigned modules<Input type="search" className="mt-2 min-h-11" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Title or module code, in any order"/></label>{search&&<Button variant="outline" className="min-h-11" onClick={()=>{setSearch('');setPage(0);}}>Clear module search</Button>}</div>
   <p role="status" className="mb-3 text-sm text-muted-foreground">{filtered.length} of {modules.length} assigned modules match.</p>
   <h2 className="mb-3 font-semibold">My modules ({modules.length})</h2>
   {!filtered.length&&<p>{search?'No modules match your search.':'No modules are assigned to you yet.'}</p>}
   <div className="space-y-3 mb-6">{filtered.slice(page*10,page*10+10).map(m=><article className="surface-card p-4" key={m.id}><Link className="font-semibold underline" to={`/lecturer/module?module=${encodeURIComponent(m.id)}`}>{m.title}</Link><p className="text-sm text-muted-foreground">{m.code||'Module'} · {hours(m.id).toFixed(1)} planned hours · {m.status}</p><ModuleJourney moduleId={m.id} teacher/></article>)}</div>
   {filtered.length>10&&<nav aria-label="Teaching module pages" className="my-4 flex gap-3 items-center"><Button variant="outline" disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous modules</Button><span>Page {page+1} of {Math.ceil(filtered.length/10)}</span><Button variant="outline" disabled={(page+1)*10>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next modules</Button></nav>}
   <h2 className="font-semibold mb-3">Saved weekly plan (Pakistan time)</h2><p className="mb-3 text-sm text-muted-foreground">{lectures.length} saved slots · {teachingHours(lectures).toFixed(1)} planned hours. This is a plan, not a live class or attendance report.</p>
   <div role="group" aria-label="Weekly teaching plan days" className="mb-4 flex flex-wrap gap-2"><button type="button" aria-pressed={dayFilter===null} onClick={()=>setDayFilter(null)} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring '+(dayFilter===null?'bg-primary text-primary-foreground':'bg-card hover:bg-accent')}>Full week ({lectures.length})</button>{week.map(d=><button type="button" key={d.index} aria-pressed={dayFilter===d.index} onClick={()=>setDayFilter(d.index)} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring '+(dayFilter===d.index?'bg-primary text-primary-foreground':'bg-card hover:bg-accent')}>{d.day} ({d.slots.length}){d.index===pakistanToday?' · Today in Pakistan':''}</button>)}</div>
   <p role="status" className="mb-4 text-xs text-muted-foreground">{dayFilter===null?'All seven days':'Only '+DAY_NAMES[dayFilter-1]} shown from your saved weekly plan. Check effective dates and recurrence before treating any slot as a scheduled session.</p>
   <div className="grid gap-3 md:grid-cols-2">{visibleDays.map(d=><section className="rounded-xl border bg-card p-4" key={d.day} aria-label={d.day+' weekly plan'}><h3 className="font-semibold">{d.day}{d.index===pakistanToday&&<span className="ml-2 text-xs font-normal text-muted-foreground">(Pakistan today)</span>}</h3>{d.slots.map(l=><article key={l.id} className="border-t mt-2 pt-2 text-sm"><Link className="underline" to={`/lecturer/module?module=${encodeURIComponent(l.module_id)}`}>{l.module_title}</Link><p>{l.start_time.slice(0,5)}–{l.end_time.slice(0,5)} · {l.room||'Room not set'}</p><p className="text-muted-foreground">{l.recurrence} · {l.effective_from} to {l.effective_until||'no end date'}</p></article>)}{!d.slots.length&&<p className="mt-2 text-sm text-muted-foreground">No saved slots.</p>}</section>)}</div>
  </>}
 </DashboardLayout>;
}
