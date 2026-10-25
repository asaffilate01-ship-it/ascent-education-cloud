import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
type Mark={id:string;module_id:string|null;date:string;status:string;method:string|null};
type Module={id:string;title:string};
export default function AttendanceDashboard(){
 const {user}=useAuth();
 return <StudentAttendance key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}`} student={user?.id} tenant={user?.tenantId}/>;
}
function StudentAttendance({student,tenant}:{student?:string;tenant?:string|null}){
 const [marks,setMarks]=useState<Mark[]>([]),[modules,setModules]=useState<Module[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [module,setModule]=useState(''),[status,setStatus]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setMarks([]);setModules([]);setPage(0);
  void(async()=>{try{
   if(!student||!tenant)throw Error('Sign in');
   const records=await pagedRows<Mark>(()=>db.from('attendance_records').select('id,module_id,date,status,method').eq('student_id',student).eq('tenant_id',tenant),()=>active);
   if(records.some(r=>!r||typeof r.id!=='string'||typeof r.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||typeof r.status!=='string'||(r.module_id!==null&&typeof r.module_id!=='string')||(r.method!==null&&typeof r.method!=='string')))throw Error('Unverified marks');
   const titles=await rowsByIds<Module>(records.flatMap(r=>r.module_id?[r.module_id]:[]),ids=>()=>db.from('modules').select('id,title').eq('tenant_id',tenant).in('id',ids),()=>active);
   if(titles.some(m=>!m||typeof m.id!=='string'||typeof m.title!=='string'))throw Error('Unverified modules');
   if(active){setMarks(records.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)));setModules(titles.sort((a,b)=>a.title.localeCompare(b.title)));}
  }catch{if(active)setError('Attendance could not be verified. Refresh to retry; unavailable records are not counted as absences.');}
  finally{if(active)setLoading(false);}})();return()=>{active=false;};
 },[student,tenant,revision]);
 const invalid=!!(from&&to&&from>to);
 const filtered=marks.filter(r=>(!module||r.module_id===module)&&(!status||r.status===status)&&(!from||r.date>=from)&&(!to||r.date<=to));
 const count=(s:string)=>filtered.filter(r=>r.status===s).length;
 const present=count('present'),late=count('late'),absent=count('absent'),excused=count('excused'),denominator=present+late+absent;
 const names=new Map(modules.map(m=>[m.id,m.title]));
 return <DashboardLayout title="My attendance" subtitle="Your saved attendance history"><div className="space-y-5">
 <p>Marks are recorded entries, not a count of every scheduled class. Missing entries do not mean absence. Ask your lecturer to request a correction if a saved mark is wrong.</p>
 <div className="flex flex-wrap gap-4"><Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Refresh attendance</Button><Link className="underline" to="/student/classroom">View class invitations</Link><Link className="underline" to="/student/grades">Manage guardian sharing in results</Link></div>
 {loading?<p role="status">Checking attendance…</p>:error?<p role="alert">{error}</p>:<>
 <div className="flex flex-wrap gap-3"><label>Module<select className="block rounded border bg-background p-2" value={module} onChange={e=>{setModule(e.target.value);setPage(0);}}><option value="">All modules</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Mark<select className="block rounded border bg-background p-2" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All marks</option>{['present','late','absent','excused'].map(s=><option key={s}>{s}</option>)}</select></label><label>From date<Input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(0);}}/></label><label>To date<Input type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(0);}}/></label><Button variant="outline" onClick={()=>{setModule('');setStatus('');setFrom('');setTo('');setPage(0);}}>Clear filters</Button></div>
 {invalid?<p role="alert">The end date must be on or after the start date.</p>:<>
 <section className="rounded-xl border p-5" aria-label="Recorded attendance summary"><h2 className="font-semibold">Recorded attendance rate: {denominator?`${Math.round(100*(present+late)/denominator)}%`:'Not available'}</h2><p className="my-2">Present {present} · Late {late} · Absent {absent} · Excused {excused}</p><p className="text-sm text-muted-foreground">For the current filters: (present + late) ÷ (present + late + absent). Excused and unrecognised marks are excluded. This is not a programme progression decision.</p></section>
 {!filtered.length?<p>No recorded attendance matches this view.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Date</th><th>Module</th><th>Mark</th><th>Recorded by method</th></tr></thead><tbody>{filtered.slice(page*20,page*20+20).map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.date}</td><td>{r.module_id&&names.has(r.module_id)?<Link className="underline" to={`/student/module?module=${encodeURIComponent(r.module_id)}`}>{names.get(r.module_id)}</Link>:'Module unavailable'}</td><td>{r.status}</td><td>{r.method==='daily_register'?'Daily register':r.method==='manual'?'Manual':r.method?'Other recorded method':'Historical record'}</td></tr>)}</tbody></table></div>}
 {filtered.length>20&&<nav aria-label="Attendance pages" className="flex gap-3 items-center"><Button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous records</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next records</Button></nav>}
 </>}
 </>}
 </div></DashboardLayout>;
}
