import {useSearchParams} from 'react-router-dom';
import {GuardianDiscussion} from './GuardianDiscussion';
export {GuardianDiscussion} from './GuardianDiscussion';
import {useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import GuardianConsentPanel from './GuardianConsentPanel';
export function GuardianScopeSharing(){return <GuardianConsentPanel/>;}
export type Activity={id:string;student_name:string|null;attendance_shared:boolean;schedule_shared:boolean;communication_shared:boolean;attendance:{date:string;status:string;module:string}[];schedule:{title:string;starts_at:string;ends_at:string;status:string}[]};
export function GuardianActivity({view='all'}:{view?:'all'|'attendance'|'schedule'|'communication'}) {
 const {user}=useAuth();
 return <ActivityWorkspace key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}:${view}`} view={view}/>;
}
function ActivityWorkspace({view}:{view:'all'|'attendance'|'schedule'|'communication'}){
 const [params,setParams]=useSearchParams();
 const [search,setSearch]=useState(''),[attendancePage,setAttendancePage]=useState(0),[schedulePage,setSchedulePage]=useState(0);
 const [items,setItems]=useState<Activity[]>([]),[selected,setSelected]=useState(()=>params.get('learner')||''),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setItems([]);setError('');setLoading(true);setAttendancePage(0);setSchedulePage(0);
 void Promise.resolve(db.rpc('get_unipathway_guardian_activity')).then(r=>{if(!active)return;if(r.error||!validActivity(r.data))setError('Shared activity is unavailable. Please retry.');else {const list:Activity[]=r.data;setItems(list);setSelected(previous=>list.some(a=>a.id===previous)?previous:list[0]?.id||'');}}).catch(()=>{if(active)setError('Shared activity is unavailable. Please retry.');}).finally(()=>{if(active)setLoading(false);});
 return()=>{active=false;};},[refresh]);
 const current=items.find(a=>a.id===selected);
 const attendance=current?.attendance.filter(a=>`${a.date} ${a.module||''} ${a.status}`.toLowerCase().includes(search.toLowerCase()))||[];
 const schedule=current?.schedule.filter(a=>`${a.title} ${a.status}`.toLowerCase().includes(search.toLowerCase()))||[];
 return <section className="my-5 space-y-4">
  <Button variant="outline" disabled={loading} onClick={()=>setRefresh(x=>x+1)}>Refresh shared activity</Button>
  {loading&&<p role="status">Loading shared activity…</p>}
  {error&&<p role="alert">{error}</p>}
  {!loading&&!error&&!items.length&&<p className="rounded-xl border p-6">No shared activity yet. Ask admissions to verify your learner link, then ask your learner to choose what to share.</p>}
  {!!items.length&&<div><label htmlFor="guardian-learner" className="mb-2 block text-sm font-medium">Learner</label><select id="guardian-learner" value={selected} onChange={e=>{setSelected(e.target.value);setParams({learner:e.target.value});setSearch('');setAttendancePage(0);setSchedulePage(0);}} className="w-full rounded-lg border bg-background p-3 sm:max-w-sm">{items.map((a,i)=><option key={a.id} value={a.id}>{a.student_name||`Linked learner ${i+1}`}</option>)}</select></div>}
  {current&&<article className="space-y-5 rounded-xl border p-5">{view!=='communication'&&<label className="block">Search shared activity<Input value={search} onChange={e=>{setSearch(e.target.value);setAttendancePage(0);setSchedulePage(0);}}/></label>}
   {(view==='all'||view==='attendance')&&<section><h2 className="font-semibold">Attendance</h2>{current.attendance_shared?<><p className="my-2 text-xs text-muted-foreground">Latest 100 recorded entries; missing records do not mean absence.</p>{attendance.length?attendance.slice(attendancePage*20,attendancePage*20+20).map((a,i)=><p key={i} className="border-b py-3 text-sm">{a.date} · {a.module||'Class'} · {a.status}</p>):<p>{search?'No attendance matches this search.':'No recorded attendance shared yet.'}</p>}<ActivityPages label="attendance" page={attendancePage} count={attendance.length} change={setAttendancePage}/></>:<p className="mt-2 text-sm">Attendance permission has not been granted.</p>}</section>}
   {(view==='all'||view==='schedule')&&<section><h2 className="font-semibold">Class schedule</h2>{current.schedule_shared?<><p className="my-2 text-xs text-muted-foreground">Up to 100 shared sessions. Weekly timetable entries are planned programme sessions, not confirmed live invitations. Times use Pakistan time; joining links stay private.</p>{schedule.length?schedule.slice(schedulePage*20,schedulePage*20+20).map((a,i)=><p key={i} className="border-b py-3 text-sm">{a.title} · {new Date(a.starts_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} – {new Date(a.ends_at).toLocaleString('en-PK',{timeZone:'Asia/Karachi'})} · {a.status}</p>):<p>{search?'No classes match this search.':'No sessions in the shared date window.'}</p>}<ActivityPages label="schedule" page={schedulePage} count={schedule.length} change={setSchedulePage}/></>:<p className="mt-2 text-sm">Schedule permission has not been granted.</p>}</section>}
   {(view==='all'||view==='communication')&&(current.communication_shared?<GuardianDiscussion key={current.id} linkId={current.id}/>:<p className="text-sm">Communication permission has not been granted.</p>)}
  </article>}
 </section>;
}

function ActivityPages({label,page,count,change}:{label:string;page:number;count:number;change:(p:number)=>void}){
 if(count<=20)return null;
 return <nav aria-label={`Shared ${label} pages`} className="flex items-center gap-3"><Button disabled={!page} onClick={()=>change(page-1)}>Previous {label}</Button><span>Page {page+1} of {Math.ceil(count/20)}</span><Button disabled={(page+1)*20>=count} onClick={()=>change(page+1)}>Next {label}</Button></nav>;
}
export function validActivity(value:unknown):value is Activity[]{
 if(!Array.isArray(value))return false;
 return value.every(a=>a&&typeof a.id==='string'&&(typeof a.student_name==='string'||a.student_name===null)&&['attendance_shared','schedule_shared','communication_shared'].every(k=>typeof a[k]==='boolean')&&Array.isArray(a.attendance)&&Array.isArray(a.schedule)&&a.attendance.every(r=>r&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&['present','late','absent','excused'].includes(r.status)&&(typeof r.module==='string'||r.module===null))&&a.schedule.every(r=>r&&typeof r.title==='string'&&typeof r.status==='string'&&typeof r.starts_at==='string'&&typeof r.ends_at==='string'&&Number.isFinite(Date.parse(r.starts_at))&&Number.isFinite(Date.parse(r.ends_at))));
}
