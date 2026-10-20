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
import STEMCoachLearningAccess from '@/components/student/STEMCoachLearningAccess';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const scope = [{column: 'tenant_id', operator: 'eq' as const, value: user?.tenantId}];
  const enrolmentsQuery = useSupabaseQuery('student_enrolments', {enabled: !!user?.tenantId, filters: [...scope, {column: 'student_id', operator: 'eq', value: user?.id}, {column: 'status', operator: 'eq', value: 'active'}]});
  const programmeIds = [...new Set(enrolmentsQuery.data.map(row => row.programme_id))];
  const programmesQuery = useSupabaseQuery('programmes', {enabled: programmeIds.length > 0, filters: [...scope, {column: 'id', operator: 'in', value: programmeIds}]});
  const modulesQuery = useSupabaseQuery('modules', {enabled: programmeIds.length > 0, filters: [...scope, {column: 'programme_id', operator: 'in', value: programmeIds}]});
  const moduleIds = modulesQuery.data.map(row => row.id);
  const assignmentsQuery = useSupabaseQuery('assignments', {enabled: moduleIds.length > 0, filters: [...scope, {column: 'module_id', operator: 'in', value: moduleIds}], orderBy: {column: 'deadline', ascending: true}});
  type Approved={attempt_id:string;brief_id:string;final_score:number;released_at:string};
  type Amendment={attempt_id:string;corrected_final_score:number};
  const [approved,setApproved]=useState<Approved[]>([]);
  const [corrections,setCorrections]=useState<Amendment[]>([]);
  const [gradeError,setGradeError]=useState('');
  const [gradeLoading,setGradeLoading]=useState(true);
  useEffect(()=>{
   if(!user?.id||!user.tenantId){setGradeLoading(false);setApproved([]);return;}
   let live=true;setGradeLoading(true);setGradeError('');
   void Promise.all([
    db.from('unipathway_assessment_released_results')
      .select('attempt_id,brief_id,final_score,released_at')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).order('released_at',{ascending:false}).limit(100),
    db.from('unipathway_assessment_grade_amendments')
      .select('attempt_id,corrected_final_score')
      .eq('student_id',user.id).eq('tenant_id',user.tenantId).limit(100)
   ]).then(([a,b])=>{
    if(!live)return;
    if(a.error||b.error){setApproved([]);setCorrections([]);setGradeError('Only independently released marks are available; the secure grade service is not ready.');}
    else {setApproved((a.data||[]) as Approved[]);setCorrections((b.data||[]) as Amendment[]);}
    setGradeLoading(false);
   }).catch(()=>{if(live){setApproved([]);setCorrections([]);setGradeError('Secure approved grades are unavailable.');setGradeLoading(false);}});
   return()=>{live=false;};
  },[user?.id,user?.tenantId]);
  const {data: assignments} = assignmentsQuery;
  const {data: modules} = modulesQuery;
  const {data: programmes} = programmesQuery;
  const queries = [enrolmentsQuery, programmesQuery, modulesQuery, assignmentsQuery];
  const loading = queries.some(query => query.loading);

  const approvedAverage = approved.length>0
    ? Math.round(approved.reduce((sum,g)=>sum+Number(corrections.find(x=>x.attempt_id===g.attempt_id)?.corrected_final_score??g.final_score),0)/approved.length)
    : null;
  const upcomingAssignments = assignments.filter((a) => new Date(a.deadline) > new Date());

  if (!user?.tenantId) return <DashboardLayout title="My Dashboard"><p role="alert">A centre assignment is required.</p></DashboardLayout>;
  if (loading) return <DashboardSkeleton />;
  if (queries.some(query => query.error)) return <DashboardLayout title="My Dashboard"><p role="alert">Your learning records could not be loaded completely.</p><Button onClick={() => queries.forEach(query => void query.refetch())}>Retry learning records</Button></DashboardLayout>;

  const stats = [
    { label: 'Courses', value: String(programmes.length), icon: BookOpen },
    { label: 'Modules', value: String(modules.length), change: 'enrolled', changeType: 'neutral' as const, icon: Video },
    { label: 'Upcoming Legacy Tasks', value: String(upcomingAssignments.length), change: `${upcomingAssignments.filter(a => {
      const days = (new Date(a.deadline).getTime() - Date.now()) / 86400000;
      return days <= 7;
    }).length} this week`, changeType: 'negative' as const, icon: ClipboardList },
    { label: 'Approved Average', value: gradeError||gradeLoading?'—':approvedAverage===null?'—':`${approvedAverage}%`, change: 'IQA-released results only', changeType: 'positive' as const, icon: BarChart3 },
  ];

  return (
    <DashboardLayout title="My Dashboard" subtitle={`Welcome back, ${user?.name || 'Student'}`}>
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
            {modules.slice(0, 5).map((mod) => (
              <div key={mod.id} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mod.title}</p>
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

        {/* Upcoming Deadlines */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-destructive" /> Scheduled legacy tasks
          </h3>
          <div className="space-y-3">
            {upcomingAssignments.slice(0, 4).map((a) => {
              const daysLeft = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
              const urgent = daysLeft <= 3;
              return (
                <div key={a.id} className={`p-3 rounded-lg ${urgent ? 'bg-destructive/5 border border-destructive/20' : 'surface-data'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Due {new Date(a.deadline).toLocaleDateString()} · {daysLeft}d left
                      </p>
                    </div>
                    {urgent && <StatusBadge status="Urgent" variant="danger" />}
                  </div>
                </div>
              );
            })}
            {upcomingAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
            )}
          </div>
        </div>
      </div>

      <STEMCoachLearningAccess enrolled={enrolmentsQuery.data.length > 0} />

      <section className="mb-6 rounded-xl border bg-primary/5 p-4">
        <h3 className="font-semibold">Your verified learning progress</h3>
        <p className="mt-2 text-sm text-muted-foreground">Coursework, resubmissions and IQA-approved grades now have separate secure workflows. Progress is not inferred from unapproved legacy submissions.</p>
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
            {gradeError&&<p role="alert" className="text-sm text-muted-foreground">{gradeError}</p>}
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
