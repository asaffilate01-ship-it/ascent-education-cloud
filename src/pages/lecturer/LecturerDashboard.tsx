import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, Users, ClipboardList, Video, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

export default function LecturerDashboard() {
  const { user } = useAuth();

  const { data: modules, loading: modLoading } = useSupabaseQuery('modules');
  const { data: submissions, loading: subLoading } = useSupabaseQuery('submissions', {
    filters: [{ column: 'status', operator: 'eq', value: 'submitted' }],
  });
  const { data: allSubmissions } = useSupabaseQuery('submissions');

  const loading = modLoading || subLoading;
  if (loading) return <DashboardSkeleton />;

  // Lecturer's modules (use lecturer_id match or show first few for demo)
  const myModules = user?.id
    ? modules.filter((m) => m.lecturer_id === user.id)
    : [];
  const displayModules = myModules.length > 0 ? myModules : modules.slice(0, 3);

  const toMark = submissions.length;
  const overdueCount = submissions.filter((s) => {
    // Simple heuristic: submitted more than 7 days ago and still not graded
    const submitted = new Date(s.submitted_at);
    return Date.now() - submitted.getTime() > 7 * 86400000;
  }).length;

  // Unique student IDs from all submissions in my modules
  const myModuleIds = new Set(displayModules.map((m) => m.id));
  const myStudentIds = new Set(
    allSubmissions?.filter((s) => {
      // match via assignment -> module mapping isn't direct; count all for now
      return true;
    }).map((s) => s.student_id) || []
  );

  return (
    <DashboardLayout title="Lecturer Dashboard" subtitle={`${user?.name || 'Lecturer'} — Teaching Overview`}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Students" value={myStudentIds.size || '—'} icon={Users} />
        <StatCard label="Modules" value={displayModules.length} icon={BookOpen} />
        <StatCard
          label="To Mark"
          value={toMark}
          change={overdueCount > 0 ? `${overdueCount} overdue` : 'All on time'}
          changeType={overdueCount > 0 ? 'negative' : 'positive'}
          icon={ClipboardList}
        />
        <StatCard label="Active Modules" value={displayModules.filter((m) => m.status === 'active').length} icon={Video} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* My Modules */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">My Modules</h3>
          <div className="space-y-2">
            {displayModules.map((mod) => (
              <div key={mod.id} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{mod.title}</p>
                  <p className="text-xs text-muted-foreground">{mod.code || 'No code'} · {mod.credits || 0} credits</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                  mod.status === 'active' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                }`}>
                  {mod.status}
                </span>
              </div>
            ))}
            {displayModules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No modules assigned</p>
            )}
          </div>
        </div>

        {/* Submissions to Mark */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Submissions to Mark</h3>
          <div className="space-y-2">
            {submissions.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(s.submitted_at).toLocaleDateString()}
                    {s.word_count ? ` · ${s.word_count} words` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.plagiarism_score && s.plagiarism_score > 20 && (
                    <span className="text-xs text-destructive font-medium">Plag {s.plagiarism_score}%</span>
                  )}
                  <Button variant="outline" size="sm" className="text-xs">Mark</Button>
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No submissions pending</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
