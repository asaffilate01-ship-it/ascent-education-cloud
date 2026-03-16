import { useMemo } from 'react';
import { CheckCircle2, Circle, Clock, BookOpen } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface ProgressTrackerProps {
  modules: Tables<'modules'>[];
  submissions: Tables<'submissions'>[];
  assignments: Tables<'assignments'>[];
}

export default function ProgressTracker({ modules, submissions, assignments }: ProgressTrackerProps) {
  const moduleProgress = useMemo(() => {
    return modules.map((mod) => {
      const modAssignments = assignments.filter((a) => a.module_id === mod.id);
      const modSubmissions = submissions.filter((s) =>
        modAssignments.some((a) => a.id === s.assignment_id)
      );
      const graded = modSubmissions.filter((s) => s.grade !== null);
      const totalAssignments = modAssignments.length;
      const completedCount = graded.length;
      const avgGrade = graded.length > 0
        ? Math.round(graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length)
        : null;
      const progress = totalAssignments > 0
        ? Math.round((completedCount / totalAssignments) * 100)
        : 0;

      return {
        id: mod.id,
        title: mod.title,
        code: mod.code,
        credits: mod.credits || 0,
        totalAssignments,
        completedCount,
        avgGrade,
        progress,
        status: mod.status,
      };
    });
  }, [modules, submissions, assignments]);

  const overallProgress = useMemo(() => {
    const total = moduleProgress.reduce((s, m) => s + m.totalAssignments, 0);
    const done = moduleProgress.reduce((s, m) => s + m.completedCount, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [moduleProgress]);

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Programme Progress
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-primary">{overallProgress}%</span>
        </div>
      </div>

      <div className="space-y-3">
        {moduleProgress.map((mod) => (
          <div key={mod.id} className="surface-data p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {mod.progress === 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : mod.progress > 0 ? (
                  <Clock className="w-5 h-5 text-warning" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{mod.title}</p>
                  {mod.avgGrade !== null && (
                    <span className={`text-xs font-bold ml-2 ${
                      mod.avgGrade >= 70 ? 'text-success' : mod.avgGrade >= 40 ? 'text-warning' : 'text-destructive'
                    }`}>
                      {mod.avgGrade}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground">{mod.code || '—'}</span>
                  <span className="text-[10px] text-muted-foreground">{mod.credits} credits</span>
                  <span className="text-[10px] text-muted-foreground">
                    {mod.completedCount}/{mod.totalAssignments} graded
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      mod.progress === 100 ? 'bg-success' : mod.progress > 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    style={{ width: `${mod.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {moduleProgress.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No modules enrolled yet</p>
        )}
      </div>
    </div>
  );
}
