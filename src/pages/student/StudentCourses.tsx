import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Clock, Users, Award, ChevronRight, BarChart3 } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

export default function StudentCourses() {
  const { data: programmes, loading: pLoading } = useSupabaseQuery('programmes', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'title', ascending: true },
  });
  const { data: modules, loading: mLoading } = useSupabaseQuery('modules');
  const { data: submissions } = useSupabaseQuery('submissions');
  const { data: profiles } = useSupabaseQuery('profiles');

  const loading = pLoading || mLoading;
  if (loading) return <DashboardSkeleton />;

  // Build lecturer name map
  const lecturerMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  // Group modules by programme
  const modulesByProgramme = useMemo(() => {
    const map: Record<string, typeof modules> = {};
    modules.forEach((m) => {
      if (!map[m.programme_id]) map[m.programme_id] = [];
      map[m.programme_id].push(m);
    });
    return map;
  }, [modules]);

  // Module grade from submissions
  const moduleGrades = useMemo(() => {
    const map: Record<string, number> = {};
    submissions.forEach((s) => {
      if (s.grade != null) {
        // We don't have direct module_id on submission, but we can use assignment_id mapping
        // For now, aggregate by assignment_id
        map[s.assignment_id] = s.grade;
      }
    });
    return map;
  }, [submissions]);

  return (
    <DashboardLayout title="My Courses" subtitle="Enrolled programmes and module progress">
      {programmes.map((prog) => {
        const progModules = modulesByProgramme[prog.id] || [];
        const completedModules = progModules.filter((m) => m.status === 'archived').length;
        const activeModules = progModules.filter((m) => m.status === 'active').length;
        const progress = progModules.length > 0 ? Math.round((completedModules / progModules.length) * 100) : 0;

        return (
          <div key={prog.id} className="mb-8">
            {/* Programme Overview Card */}
            <div className="surface-card p-6 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {prog.awarding_body}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{prog.level}</span>
                  </div>
                  <h2 className="text-lg font-bold">{prog.title}</h2>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {prog.duration || '—'}</span>
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {prog.credits || 0} credits</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {prog.enrolled || 0} students</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{progress}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> {completedModules} Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> {activeModules} Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> {progModules.length - completedModules - activeModules} Draft</span>
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-2">
              {progModules.map((mod) => {
                const statusLabel = mod.status === 'archived' ? 'completed' : mod.status;
                return (
                  <div key={mod.id} className="surface-card p-4 flex items-center gap-4 hover:shadow-lg transition-default cursor-pointer group">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      statusLabel === 'completed' ? 'bg-success/10' :
                      statusLabel === 'active' ? 'bg-primary/10' : 'bg-secondary'
                    }`}>
                      <BookOpen className={`w-4 h-4 ${
                        statusLabel === 'completed' ? 'text-success' :
                        statusLabel === 'active' ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {mod.code || ''} · {mod.credits || 0} credits
                        {mod.lecturer_id && lecturerMap[mod.lecturer_id] ? ` · ${lecturerMap[mod.lecturer_id]}` : ''}
                      </p>
                    </div>
                    <div className="text-right mr-2">
                      <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
                        statusLabel === 'completed' ? 'bg-success/10 text-success' :
                        statusLabel === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-default" />
                  </div>
                );
              })}
              {progModules.length === 0 && (
                <div className="surface-card p-8 text-center text-muted-foreground text-sm">No modules for this programme</div>
              )}
            </div>
          </div>
        );
      })}

      {programmes.length === 0 && (
        <div className="surface-card p-12 text-center text-muted-foreground text-sm">No enrolled programmes found</div>
      )}
    </DashboardLayout>
  );
}
