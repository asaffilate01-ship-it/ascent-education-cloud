import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
type Module={id:string;title:string};
type Mark={id:string;student_id:string;module_id:string;status:string;date:string};
type Profile={user_id:string;full_name:string};
type Summary={id:string;name:string;present:number;late:number;absent:number;excused:number;other:number};
const rate=(s:Summary)=>{const total=s.present+s.late+s.absent;return total?Math.round(100*(s.present+s.late)/total):null;};
export default function LecturerAttendance(){
 const {user}=useAuth();
 return <AttendanceWorkspace key={`${user?.id}:${user?.tenantId}:${user?.roles.join(',')}`} lecturer={user?.id} tenant={user?.tenantId}/>;
}
function AttendanceWorkspace({lecturer,tenant}:{lecturer?:string;tenant?:string|null}){
 const [modules,setModules]=useState<Module[]>([]),[marks,setMarks]=useState<Mark[]>([]),[profiles,setProfiles]=useState<Profile[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const [moduleId,setModuleId]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');setModules([]);setMarks([]);setProfiles([]);setPage(0);
  void(async()=>{try{
   if(!tenant||!lecturer)throw Error('Missing centre');
   const assigned=await pagedRows<Module>(()=>db.from('modules').select('id,title').eq('tenant_id',tenant).eq('lecturer_id',lecturer),()=>active);
   const records=await rowsByIds<Mark>(assigned.map(m=>m.id),ids=>()=>db.from('attendance_records').select('id,student_id,module_id,status,date').eq('tenant_id',tenant).in('module_id',ids),()=>active);
   const names=await rowsByIds<Profile>(records.map(r=>r.student_id),ids=>()=>db.from('profiles').select('user_id,full_name').eq('tenant_id',tenant).in('user_id',ids),()=>active,'user_id');
   if(active){setModules(assigned.sort((a,b)=>a.title.localeCompare(b.title)));setMarks(records);setProfiles(names);}
  }catch{if(active)setError('Attendance could not be verified. Refresh to retry, or contact your programme leader.');}
  finally{if(active)setLoading(false);}})();
  return()=>{active=false;};
 },[lecturer,tenant,refresh]);
 const names=new Map(profiles.map(p=>[p.user_id,p.full_name]));
 const grouped=new Map<string,Summary>();
 marks.filter(m=>!moduleId||m.module_id===moduleId).forEach(m=>{
  const s=grouped.get(m.student_id)||{id:m.student_id,name:names.get(m.student_id)||`Learner ${m.student_id}`,present:0,late:0,absent:0,excused:0,other:0};
  if(m.status==='present')s.present++;else if(m.status==='late')s.late++;else if(m.status==='absent')s.absent++;else if(m.status==='excused')s.excused++;else s.other++;
  grouped.set(m.student_id,s);
 });
 const summaries=[...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const filtered=summaries.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));
 const totals=summaries.reduce((a,s)=>({present:a.present+s.present,late:a.late+s.late,absent:a.absent+s.absent,excused:a.excused+s.excused,other:a.other+s.other}),{present:0,late:0,absent:0,excused:0,other:0});
 const overall=rate({...totals,id:'total',name:'Total'});
 const retry=()=>{setMarks([]);setProfiles([]);setModules([]);setLoading(true);setPage(0);setModuleId('');setRefresh(x=>x+1);};
 return <DashboardLayout title="Attendance" subtitle="Recorded attendance for your assigned modules">
  <div className="mb-4 flex flex-wrap gap-3"><Button variant="outline" disabled={loading} onClick={retry}>Refresh attendance</Button><Button asChild variant="outline"><Link to="/lecturer/classroom">View class invitations</Link></Button></div>
  <p className="mb-4 text-sm text-muted-foreground">Rate = present plus late, divided by present, late and absent marks. Excused and other marks are shown separately and excluded. This report covers recorded marks only; it does not infer attendance for unmarked classes.</p>
  {loading?<p role="status">Checking attendance and assigned modules…</p>:error?<p role="alert">{error}</p>:<>
   <div className="mb-4 flex flex-wrap gap-3"><label className="text-sm">Module<select className="block rounded border bg-background p-2" value={moduleId} onChange={e=>{setModuleId(e.target.value);setPage(0);}}><option value="">All assigned modules</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label className="text-sm">Search learners<Input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label></div>
   <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[['Recorded attendance rate',overall===null?'Not available':`${overall}%`],['Learners with marks',summaries.length],['Excused marks',totals.excused],['Other marks',totals.other]].map(([label,value])=><div key={label} className="surface-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}</div>
   {!filtered.length?<p>{search?'No learners match your search.':modules.length?'No attendance marks are available for these modules.':'No modules are assigned to you yet.'}</p>:<div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><caption className="p-3 text-left">Learner attendance summaries</caption><thead><tr>{['Learner','Present','Late','Absent','Excused','Other','Rate'].map(h=><th key={h} className="p-3" scope="col">{h}</th>)}</tr></thead><tbody>{filtered.slice(page*20,page*20+20).map(s=><tr key={s.id} className="border-t"><th scope="row" className="p-3 font-medium">{s.name}</th>{[s.present,s.late,s.absent,s.excused,s.other,rate(s)===null?'Not available':`${rate(s)}%`].map((v,i)=><td key={i} className="p-3">{v}</td>)}</tr>)}</tbody></table></div>}
   {filtered.length>20&&<nav aria-label="Attendance pages" className="mt-4 flex items-center gap-3"><Button variant="outline" disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous learners</Button><span>Page {page+1} of {Math.ceil(filtered.length/20)}</span><Button variant="outline" disabled={(page+1)*20>=filtered.length} onClick={()=>setPage(p=>p+1)}>Next learners</Button></nav>}
  </>}
 </DashboardLayout>;
}
