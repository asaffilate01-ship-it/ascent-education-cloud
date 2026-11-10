import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Video, BarChart3, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import StudentLearningAgenda from '@/components/student/StudentLearningAgenda';
import STEMCoachLearningAccess from '@/components/student/STEMCoachLearningAccess';
import ContinueLearning from '@/components/student/ContinueLearning';
import { rowsByIds } from '@/lib/pagedRows';
import { formatPakistanAcademicDate } from '@/lib/assessment/courseworkQueue';

export default function StudentDashboard() {
  const {user} = useAuth();
  return <StudentDashboardContent key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}`} />;
}
function StudentDashboardContent() {
  const { user } = useAuth();
  const verified=!!user?.id&&!!user.tenantId&&user.role==='student'&&user.roles?.includes('student');
  const scope = [{column: 'tenant_id', operator: 'eq' as const, value: user?.tenantId}];
  const enrolmentsQuery = useSupabaseQuery('student_enrolments', {enabled: verified, filters: [...scope, {column: 'student_id', operator: 'eq', value: user?.id}, {column: 'status', operator: 'eq', value: 'active'}]});
  const programmeIds = [...new Set(enrolmentsQuery.data.map(row => row.programme_id))];
  const programmesQuery = useSupabaseQuery('programmes', {enabled: verified && programmeIds.length > 0, filters: [...scope, {column: 'id', operator: 'in', value: programmeIds}]});
  const modulesQuery = useSupabaseQuery('modules', {enabled: verified && programmeIds.length > 0, filters: [...scope, {column: 'programme_id', operator: 'in', value: programmeIds}]});
  const moduleIds = modulesQuery.data.map(row => row.id);
  type Approved={attempt_id:string;brief_id:string;final_score:number;released_at:string};
  type Amendment={attempt_id:string;corrected_final_score:number};
  type ReleasedBrief={id:string;module_id:string;title:string};
  const [approved,setApproved]=useState<Approved[]>([]);
  const [corrections,setCorrections]=useState<Amendment[]>([]);
  const [releasedBriefs,setReleasedBriefs]=useState<ReleasedBrief[]>([]);
  const [gradeRefresh,setGradeRefresh]=useState(0);
  const [gradeError,setGradeError]=useState('');
  const [gradeLoading,setGradeLoading]=useState(true);
  useEffect(()=>{
   if(!verified){setGradeLoading(false);setApproved([]);setCorrections([]);setReleasedBriefs([]);setGradeError('');return;}
   let live=true;setGradeLoading(true);setGradeError('');setApproved([]);setCorrections([]);setReleasedBriefs([]);
   void (async()=>{
    const a=await db.from('unipathway_assessment_released_results')
      .select('attempt_id,brief_id,final_score,released_at')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).order('released_at',{ascending:false}).limit(100);
    if(a.error||!Array.isArray(a.data))throw Error('Released results could not be verified');
    if(!live)return;
    const ids=(a.data||[]).map((row:Approved)=>row.attempt_id);
    const b=ids.length?await db.from('unipathway_assessment_grade_amendments')
      .select('attempt_id,corrected_final_score')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).in('attempt_id',ids).limit(100):{data:[],error:null};

    if(!live)return;
    if(b.error||!Array.isArray(b.data))throw Error('Released corrections could not be verified');
    const briefs=await rowsByIds<ReleasedBrief>((a.data as Approved[]).map(row=>row.brief_id),briefIds=>()=>
      db.from('unipathway_assessment_briefs').select('id,module_id,title').eq('tenant_id',user.tenantId).in('id',briefIds),()=>live);
    if(!live)return;
    setApproved(a.data as Approved[]);setCorrections(b.data as Amendment[]);setReleasedBriefs(briefs);
    setGradeLoading(false);
   })().catch(()=>{if(live){setApproved([]);setCorrections([]);setReleasedBriefs([]);setGradeError('Secure approved grades are unavailable.');setGradeLoading(false);}});
   return()=>{live=false;};
  },[verified,user?.id,user?.tenantId,gradeRefresh]);
  const {data: modules} = modulesQuery;
  const {data: programmes} = programmesQuery;
  const queries = [enrolmentsQuery, programmesQuery, modulesQuery];
  const loading = queries.some(query => query.loading);

  const approvedAverage = approved.length>0
    ? Math.round(approved.reduce((sum,g)=>sum+Number(corrections.find(x=>x.attempt_id===g.attempt_id)?.corrected_final_score??g.final_score),0)/approved.length)
    : null;

  if (!verified) return <DashboardLayout title="Today"><p role="alert">An active, verified Student role and assigned centre are required. No learning data is loaded.</p></DashboardLayout>;
  if (loading) return <DashboardSkeleton />;
  if (queries.some(query => query.error)) return <DashboardLayout title="Today"><p role="alert">Your learning records could not be loaded completely.</p><Button onClick={() => queries.forEach(query => void query.refetch())}>Retry learning records</Button></DashboardLayout>;

  const stats = [
    { label: 'Courses', value: String(programmes.length), icon: BookOpen },
    { label: 'Modules', value: String(modules.length), change: 'enrolled', changeType: 'neutral' as const, icon: Video },
    { label: 'Approved Average', value: gradeError||gradeLoading?'—':approvedAverage===null?'—':`${approvedAverage}%`, change: 'Latest 100 released attempts; not a qualification grade', changeType: 'positive' as const, icon: BarChart3 },
  ];

  return (
    <DashboardLayout title="Today" subtitle={`Welcome back, ${user?.name || 'Student'}`}>
      <ContinueLearning modules={modules} />
      <StudentLearningAgenda tenant={user.tenantId} student={user.id} moduleIds={moduleIds} />
      <section aria-labelledby="student-progress-heading" className="mb-5 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="student-progress-heading" className="text-base font-semibold">Your learning overview</h2>
          <Link to="/student/courses" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">View my courses</Link>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2" aria-label="Verified student learning summary">
          {stats.map(({label,value,icon:Icon})=>(
            <div key={label} className="min-w-0 rounded-lg border bg-secondary/30 p-2.5 sm:p-3">
              <dt className="flex items-center gap-1 text-[11px] font-medium leading-4 text-muted-foreground sm:text-sm"><Icon aria-hidden="true" className="hidden size-4 shrink-0 sm:inline"/><span className="break-words">{label}</span></dt>
              <dd className="mt-2 break-words text-lg font-bold tabular-nums sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">The average, where available, covers only the latest 100 independently released attempts. It is not an official qualification grade.</p>
      </section>
      <section className="mb-5 rounded-xl border bg-primary/5 p-4 sm:p-5" aria-labelledby="student-assessment-links">
        <h2 id="student-assessment-links" className="font-semibold">Coursework and feedback</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review published coursework, independently released marks and the separate appeal process.</p>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Coursework and released results">
          <Button asChild variant="outline" size="sm"><Link to="/student/assignments">My coursework</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/student/grades">Approved results</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/student/appeals">Grade appeals</Link></Button>
        </nav>
      </section>

      {/* Recent Grades */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Grades
          </h3>
          <div className="space-y-3">
            {gradeError&&<div><p role="alert">{gradeError}</p><Button className="min-h-11" onClick={()=>setGradeRefresh(x=>x+1)}>Retry approved grades</Button></div>}
            {gradeLoading&&<p role="status" className="text-sm text-muted-foreground">Verifying independent marks…</p>}
            {!gradeError&&!gradeLoading&&approved.slice(0,5).map(g=>{
             const score=corrections.find(x=>x.attempt_id===g.attempt_id)?.corrected_final_score??g.final_score;
             const brief=releasedBriefs.find(item=>item.id===g.brief_id);
             const module=modules.find(item=>item.id===brief?.module_id);
             const feedbackPath=brief?.module_id?`/student/grades?${new URLSearchParams({module:brief.module_id})}`:'/student/grades';
             return <article key={g.attempt_id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border/30 py-2 last:border-0">
               <div className="min-w-0 flex-[1_1_14rem]"><h4 className="break-words text-sm font-medium">{brief?.title||'Approved coursework'}</h4>
                {module&&<p className="mt-1 break-words text-xs text-muted-foreground">{module.title}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Released {formatPakistanAcademicDate(g.released_at)}</p>
                <Link className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" to={feedbackPath}>View approved feedback<span className="sr-only"> for {brief?.title||'this coursework'}</span></Link></div>
               <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-bold text-primary">{score}/100</span>
              </article>;
            })}
            {!gradeError&&!gradeLoading&&approved.length===0&&<p className="py-4 text-center text-sm text-muted-foreground">No independently released grades yet</p>}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Programme Overview
          </h3>
          <div className="space-y-4">
            {programmes.slice(0, 3).map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.level} · {p.awarding_body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <section aria-labelledby="student-support-heading" className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
        <h2 id="student-support-heading" className="font-semibold">Support and additional services</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find student services, confidential wellbeing support and other optional learning tools. Seeking support does not change your marks.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-accent" to="/student/wellbeing">Ask the Welfare team</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-accent" to="/workspace">All student services</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-accent" to="/student/applications">My applications</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border bg-background px-3 py-2 text-sm font-semibold hover:bg-accent" to="/wellbeing/anonymous">Anonymous support</Link>
        </div>
        <details className="mt-3 rounded-lg border px-3 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Optional revision and linked services</summary>
          <div className="pt-3"><STEMCoachLearningAccess enrolled={enrolmentsQuery.data.length > 0} /></div>
        </details>
      </section>
    </DashboardLayout>
  );
}
