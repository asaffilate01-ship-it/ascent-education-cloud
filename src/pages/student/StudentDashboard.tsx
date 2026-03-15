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
import { useMemo } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: assignments, loading: aLoading } = useSupabaseQuery('assignments', {
    orderBy: { column: 'deadline', ascending: true },
  });
  const { data: submissions, loading: sLoading } = useSupabaseQuery('submissions');
  const { data: modules } = useSupabaseQuery('modules');
  const { data: programmes } = useSupabaseQuery('programmes');

  const loading = aLoading || sLoading;

  // Compute stats
  const mySubmissions = useMemo(() =>
    user?.id ? submissions.filter((s) => s.student_id === user.id) : submissions
  , [submissions, user]);

  const gradedSubmissions = mySubmissions.filter((s) => s.grade !== null);
  const avgGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length)
    : 0;

  const upcomingAssignments = assignments.filter((a) => new Date(a.deadline) > new Date());

  if (loading) return <DashboardSkeleton />;

  const stats = [
    { label: 'Courses', value: String(programmes.length), icon: BookOpen },
    { label: 'Modules', value: String(modules.length), change: 'enrolled', changeType: 'neutral' as const, icon: Video },
    { label: 'Assignments Due', value: String(upcomingAssignments.length), change: `${upcomingAssignments.filter(a => {
      const days = (new Date(a.deadline).getTime() - Date.now()) / 86400000;
      return days <= 7;
    }).length} this week`, changeType: 'negative' as const, icon: ClipboardList },
    { label: 'Average Grade', value: avgGrade > 0 ? `${avgGrade}%` : '—', change: avgGrade >= 70 ? 'Merit' : avgGrade >= 40 ? 'Pass' : '—', changeType: 'positive' as const, icon: BarChart3 },
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
            <Clock className="w-4 h-4 text-destructive" /> Upcoming Deadlines
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

      {/* Recent Grades */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Grades
          </h3>
          <div className="space-y-3">
            {gradedSubmissions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Graded {s.graded_at ? new Date(s.graded_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <span className={`text-sm font-bold ${
                  (s.grade || 0) >= 70 ? 'text-success' : (s.grade || 0) >= 40 ? 'text-warning' : 'text-destructive'
                }`}>
                  {s.grade}%
                </span>
              </div>
            ))}
            {gradedSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No grades yet</p>
            )}
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
                  <span className="text-sm font-bold text-primary">{p.enrolled || 0} enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
