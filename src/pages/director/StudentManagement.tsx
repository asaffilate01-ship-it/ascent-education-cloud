import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import {GraduationCap,BookOpen,Calendar,Search,ShieldCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {DashboardSkeleton} from '@/components/ui/Skeletons';

type StudentRow={
 id:string;studentId:string;name:string;email:string;programme:string;
 enrolledAt:string;status:string;attendanceRate:number|null;
};
export default function StudentManagement(){
 const {user}=useAuth();
 return <ScopedStudentRegistry key={[user?.id,user?.tenantId,user?.role].join(':')}/>;
}
function ScopedStudentRegistry(){
 const {user}=useAuth();
 const teacher=user?.role==='lecturer';
 const authorised=!!user&&['centre_director','programme_leader','superadmin'].includes(user.role);
 const tenant=user?.tenantId;
 const [search,setSearch]=useState('');
 const [page,setPage]=useState(0);
 const [students,setStudents]=useState<StudentRow[]>([]);
 const [loading,setLoading]=useState(authorised&&!!tenant);
 const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let live=true;
  if(!authorised||!tenant){setLoading(false);setStudents([]);return()=>{live=false;};}
  setLoading(true);setError('');setStudents([]);
  void (async()=>{
   try{
    const [es,ps,programmes,attendance]=await Promise.all([
     supabase.from('student_enrolments').select('id,student_id,programme_id,status,enrolled_at').eq('tenant_id',tenant),
     supabase.from('profiles').select('user_id,tenant_id,full_name,email').eq('tenant_id',tenant),
     supabase.from('programmes').select('id,title').eq('tenant_id',tenant),
     supabase.from('attendance_records').select('student_id,status').eq('tenant_id',tenant),
    ]);
    if([es,ps,programmes,attendance].some(q=>q.error))throw Error('Student registry data unavailable');
    const profiles=new Map((ps.data||[]).filter(p=>p.tenant_id===tenant).map(p=>[p.user_id,p]));
    const titles=new Map((programmes.data||[]).map(p=>[p.id,p.title]));
    const marks=new Map<string,{present:number;total:number}>();
    for(const mark of attendance.data||[]){
     if(!['present','late','absent'].includes(mark.status))continue;
     const previous=marks.get(mark.student_id)||{present:0,total:0};
     previous.total++;if(['present','late'].includes(mark.status))previous.present++;
     marks.set(mark.student_id,previous);
    }
    const rows=(es.data||[]).map(e=>{
     const profile=profiles.get(e.student_id);
     const record=marks.get(e.student_id);
     return {id:e.id,studentId:e.student_id,name:profile?.full_name||'Student record unavailable',
      email:profile?.email||'',programme:titles.get(e.programme_id)||'Programme record unavailable',
      enrolledAt:e.enrolled_at,status:e.status,
      attendanceRate:record&&record.total?Math.round(record.present*100/record.total):null} satisfies StudentRow;
    });
    if(live)setStudents(rows);
   }catch{
    if(live){setStudents([]);setError('Student records could not be verified completely. Please retry or contact the centre administrator.');}
   }finally{if(live)setLoading(false);}
  })();
  return()=>{live=false;};
 },[authorised,tenant,refresh]);
 const filtered=useMemo(()=>students.filter(row=>
  [row.name,row.email,row.programme].some(value=>value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
 ),[students,search]);
 const count=filtered.length;
 const pages=Math.max(1,Math.ceil(count/20));
 const current=Math.min(page,pages-1);
 const columns=[
  {key:'name',label:'Learner',render:(s:StudentRow)=><div><p className="text-sm font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>},
  {key:'programme',label:'Programme',render:(s:StudentRow)=><span className="text-sm">{s.programme}</span>},
  {key:'attendance',label:'Recorded attendance',render:(s:StudentRow)=><span className="text-sm">{s.attendanceRate===null?'Not available':s.attendanceRate+'%'}</span>},
  {key:'status',label:'Recorded enrolment status',render:(s:StudentRow)=><StatusBadge status={s.status} variant={s.status==='active'?'success':'neutral'}/>}
 ];
 if(teacher)return <DashboardLayout title="Assigned learner roster" subtitle="Teaching permissions follow assigned modules">
  <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Open an assigned module</h2>
   <p className="mt-2 text-sm text-muted-foreground">This centre-wide student registry is restricted to management roles. Your authorised module workspace is the starting point for class registers and enrolled learner activity.</p>
   <Button asChild className="mt-3"><Link to="/lecturer/teaching">My assigned modules</Link></Button>
  </section>
 </DashboardLayout>;
 if(!authorised||!tenant)return <DashboardLayout title="Student registry"><p role="alert">A verified centre leadership or programme role with a centre assignment is required to view the student registry.</p></DashboardLayout>;
 if(loading)return <DashboardLayout title="Student registry"><DashboardSkeleton/></DashboardLayout>;
 if(error)return <DashboardLayout title="Student registry"><div role="alert" className="space-y-3 rounded-lg border border-destructive p-4"><p>{error}</p><Button variant="outline" onClick={()=>setRefresh(x=>x+1)}>Retry registry</Button></div></DashboardLayout>;
 return <DashboardLayout title="Student registry" subtitle="Verified centre enrolment records, not official qualification outcomes"
  actions={user.role==='centre_director'?<Button asChild><Link to="/director/admissions">Manage admissions</Link></Button>:undefined}>
  <section className="mb-6 rounded-xl border bg-card p-4">
   <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4"/>Academic decisions remain independent</h2>
   <p className="mt-2 text-sm text-muted-foreground">Completion of an enrolment is not an external award, official certificate or university admission decision. Grades and certificates require verified independent assessment and authorised release.</p>
  </section>
  <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
   <StatCard label="Enrolment records" value={students.length} icon={GraduationCap}/>
   <StatCard label="Active enrolments" value={students.filter(s=>s.status==='active').length} icon={BookOpen}/>
   <StatCard label="Attendance recorded" value={students.filter(s=>s.attendanceRate!==null).length} icon={Calendar}/>
  </div>
  <label className="mb-4 block max-w-xl text-sm font-semibold">Search centre enrolments
   <span className="relative mt-2 block"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/>
    <input aria-label="Search centre enrolments" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}
     type="search" maxLength={120} placeholder="Name, email or programme"
     className="min-h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"/>
   </span>
  </label>
  <p role="status" className="mb-3 text-sm text-muted-foreground">{filtered.length} of {students.length} authorised enrolment records shown by this filter.</p>
  <DataTable data={filtered.slice(current*20,current*20+20)} columns={columns}
   emptyTitle="No matching enrolments" emptyDescription="Only authorised enrolments in your assigned centre are displayed."/>
  {filtered.length>20&&<nav aria-label="Enrolment pages" className="mt-4 flex flex-wrap items-center gap-3">
   <Button variant="outline" className="min-h-11" disabled={current===0} onClick={()=>setPage(current-1)}>Previous enrolments</Button>
   <span>Page {current+1} of {pages}</span>
   <Button variant="outline" className="min-h-11" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next enrolments</Button>
  </nav>}
 </DashboardLayout>;
}
