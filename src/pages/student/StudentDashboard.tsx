import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { BookOpen, Video, ClipboardList, BarChart3, Calendar, Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import StudentLearningAgenda from '@/components/student/StudentLearningAgenda';
import STEMCoachLearningAccess from '@/components/student/STEMCoachLearningAccess';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function StudentDashboard() {
  const {user} = useAuth();
  return <StudentDashboardContent key={`${user?.id}:${user?.tenantId}:${user?.role}`} />;
}
function StudentDashboardContent() {
  const { user } = useAuth();
  const scope = [{column: 'tenant_id', operator: 'eq' as const, value: user?.tenantId}];
  const enrolmentsQuery = useSupabaseQuery('student_enrolments', {enabled: !!user?.tenantId, filters: [...scope, {column: 'student_id', operator: 'eq', value: user?.id}, {column: 'status', operator: 'eq', value: 'active'}]});
  const programmeIds = [...new Set(enrolmentsQuery.data.map(row => row.programme_id))];
  const programmesQuery = useSupabaseQuery('programmes', {enabled: programmeIds.length > 0, filters: [...scope, {column: 'id', operator: 'in', value: programmeIds}]});
  const modulesQuery = useSupabaseQuery('modules', {enabled: programmeIds.length > 0, filters: [...scope, {column: 'programme_id', operator: 'in', value: programmeIds}]});
  const moduleIds = modulesQuery.data.map(row => row.id);
  type Approved={attempt_id:string;brief_id:string;final_score:number;released_at:string};
  type Amendment={attempt_id:string;corrected_final_score:number};
  const [approved,setApproved]=useState<Approved[]>([]);
  const [corrections,setCorrections]=useState<Amendment[]>([]);
  const [gradeRefresh,setGradeRefresh]=useState(0);
  const [gradeError,setGradeError]=useState('');
  const [gradeLoading,setGradeLoading]=useState(true);
  useEffect(()=>{
   if(!user?.id||!user.tenantId){setGradeLoading(false);setApproved([]);return;}
   let live=true;setGradeLoading(true);setGradeError('');
   void (async()=>{
    const a=await db.from('unipathway_assessment_released_results')
      .select('attempt_id,brief_id,final_score,released_at')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).order('released_at',{ascending:false}).limit(100);
    if(a.error)throw a.error;
    if(!live)return;
    const ids=(a.data||[]).map((row:Approved)=>row.attempt_id);
    const b=ids.length?await db.from('unipathway_assessment_grade_amendments')
      .select('attempt_id,corrected_final_score')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).in('attempt_id',ids).limit(100):{data:[],error:null};

    if(!live)return;
    if(a.error||b.error){setApproved([]);setCorrections([]);setGradeError('Only independently released marks are available; the secure grade service is not ready.');}
    else {setApproved((a.data||[]) as Approved[]);setCorrections((b.data||[]) as Amendment[]);}
    setGradeLoading(false);
   })().catch(()=>{if(live){setApproved([]);setCorrections([]);setGradeError('Secure approved grades are unavailable.');setGradeLoading(false);}});
   return()=>{live=false;};
  },[user?.id,user?.tenantId,gradeRefresh]);
  const {data: modules} = modulesQuery;
  const {data: programmes} = programmesQuery;
  const queries = [enrolmentsQuery, programmesQuery, modulesQuery];
  const loading = queries.some(query => query.loading);

  const approvedAverage = approved.length>0
    ? Math.round(approved.reduce((sum,g)=>sum+Number(corrections.find(x=>x.attempt_id===g.attempt_id)?.corrected_final_score??g.final_score),0)/approved.length)
    : null;

  if (!user?.tenantId) return <DashboardLayout title="Today"><p role="alert">A centre assignment is required.</p></DashboardLayout>;
  if (loading) return <DashboardSkeleton />;
  if (queries.some(query => query.error)) return <DashboardLayout title="Today"><p role="alert">Your learning records could not be loaded completely.</p><Button onClick={() => queries.forEach(query => void query.refetch())}>Retry learning records</Button></DashboardLayout>;

  const stats = [
    { label: 'Courses', value: String(programmes.length), icon: BookOpen },
    { label: 'Modules', value: String(modules.length), change: 'enrolled', changeType: 'neutral' as const, icon: Video },
    { label: 'Approved Average', value: gradeError||gradeLoading?'—':approvedAverage===null?'—':`${approvedAverage}%`, change: 'Latest 100 released attempts; not a qualification grade', changeType: 'positive' as const, icon: BarChart3 },
  ];

  return (
    <DashboardLayout title="Today" subtitle={`Welcome back, ${user?.name || 'Student'}`}>
      <section className="mb-5 rounded-xl border bg-card p-4"><h2 className="font-semibold">Your student workspace</h2><p className="my-2 text-sm text-muted-foreground">Courses, timetable, recordings, labs, residential visits, documents, careers, fees and support.</p><Link className="font-semibold underline" to="/workspace">Open all student services</Link></section>
      <StudentLearningAgenda tenant={user.tenantId} student={user.id} moduleIds={moduleIds} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Module List */}
        <div className="lg:col-span-2 surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> My Modules
          </h3>
          <div className="space-y-2">
            {!modules.length&&<p>No modules are available for your active enrolments.</p>}
            {modules.slice(0, 5).map((mod) => (
              <div key={mod.id} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link className="text-sm font-medium underline" to={`/student/module?module=${encodeURIComponent(mod.id)}`}>{mod.title}</Link>
                  <p className="text-xs text-muted-foreground">{mod.code || ''} · {mod.credits || 0} credits</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                  mod.status === 'active' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                }`}>
                  {mod.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>


      <STEMCoachLearningAccess enrolled={enrolmentsQuery.data.length > 0} />

      <section className="mb-6 rounded-xl border bg-primary/5 p-4">
        <h3 className="font-semibold">Your verified learning progress</h3>
        <p className="mt-2 text-sm text-muted-foreground">View assignments, read released feedback or ask for a result review. Results appear after marking and quality approval.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/student/assignments">My current coursework</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/student/grades">Approved results</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/student/appeals">Grade appeals</Link></Button>
        </div>
      </section>

      {/* Recent Grades */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Grades
          </h3>
          <div className="space-y-3">
            {gradeError&&<div><p role="alert">{gradeError}</p><Button onClick={()=>setGradeRefresh(x=>x+1)}>Retry approved grades</Button></div>}
            {gradeLoading&&<p role="status" className="text-sm text-muted-foreground">Verifying independent marks…</p>}
            {!gradeError&&!gradeLoading&&approved.slice(0,5).map(g=>{
             const score=corrections.find(x=>x.attempt_id===g.attempt_id)?.corrected_final_score??g.final_score;
             return <div key={g.attempt_id} className="flex items-center justify-between border-b border-border/30 py-2">
               <div><p className="text-sm font-medium">Approved coursework</p>
                <p className="text-xs text-muted-foreground">Released {new Date(g.released_at).toLocaleDateString()} · {g.attempt_id.slice(0,8)}</p></div>
               <span className="text-sm font-bold text-primary">{score}/100</span>
              </div>;
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
    </DashboardLayout>
  );
}
