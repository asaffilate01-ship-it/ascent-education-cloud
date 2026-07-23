import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, Clock, Award, ChevronRight, CheckCircle, Circle, Lock } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';

export default function StudentCourses() {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const { data: programmes, loading: pLoading } = useSupabaseQuery('programmes', {
    filters: [{ column: 'status', operator: 'eq', value: 'active' }],
    orderBy: { column: 'title', ascending: true },
  });
  const { data: modules, loading: mLoading } = useSupabaseQuery('modules');
  const { data: submissions } = useSupabaseQuery('submissions');
  const { data: assignments } = useSupabaseQuery('assignments');
  const { data: profiles } = useSupabaseQuery('profiles');

  const lecturerMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  const modulesByProgramme = useMemo(() => {
    const map: Record<string, typeof modules> = {};
    modules.forEach((m) => {
      if (!map[m.programme_id]) map[m.programme_id] = [];
      map[m.programme_id].push(m);
    });
    return map;
  }, [modules]);

  // Assignments grouped by module
  const assignmentsByModule = useMemo(() => {
    const map: Record<string, typeof assignments> = {};
    assignments.forEach((a) => {
      if (a.module_id) {
        if (!map[a.module_id]) map[a.module_id] = [];
        map[a.module_id].push(a);
      }
    });
    return map;
  }, [assignments]);

  // Submission status by assignment
  const submissionByAssignment = useMemo(() => {
    const map: Record<string, typeof submissions[0]> = {};
    submissions.forEach((s) => {
      map[s.assignment_id] = s;
    });
    return map;
  }, [submissions]);

  const loading = pLoading || mLoading;
  if (loading) return <DashboardSkeleton />;

  const handleModuleClick = (mod: any) => {
    setSelectedModule(mod);
  };

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
            <div className="surface-card p-6 mb-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
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
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {progModules.length} modules</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold text-primary">{progress}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
              <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> {completedModules} Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> {activeModules} Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> {progModules.length - completedModules - activeModules} Upcoming</span>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {progModules.map((mod) => {
                const statusLabel = mod.status === 'archived' ? 'completed' : mod.status;
                const modAssignments = assignmentsByModule[mod.id] || [];
                const completedAssignments = modAssignments.filter(a => {
                  const sub = submissionByAssignment[a.id];
                  return sub && sub.grade != null;
                }).length;
                const avgGrade = modAssignments.reduce((acc, a) => {
                  const sub = submissionByAssignment[a.id];
                  return sub?.grade ? acc + sub.grade : acc;
                }, 0) / (completedAssignments || 1);

                return (
                  <div
                    key={mod.id}
                    onClick={() => handleModuleClick(mod)}
                    className="surface-card p-4 hover:shadow-lg transition-default cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        statusLabel === 'completed' ? 'bg-success/10' :
                        statusLabel === 'active' ? 'bg-primary/10' : 'bg-secondary'
                      }`}>
                        {statusLabel === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : statusLabel === 'active' ? (
                          <BookOpen className="w-5 h-5 text-primary" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold group-hover:text-primary transition-default">{mod.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {mod.code || ''} · {mod.credits || 0} credits
                        </p>
                      </div>
                    </div>

                    {/* Module stats */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground">{modAssignments.length} assignments</span>
                      {completedAssignments > 0 && (
                        <span className="font-semibold text-primary">{Math.round(avgGrade)}% avg</span>
                      )}
                    </div>

                    {/* Progress mini-bar */}
                    {modAssignments.length > 0 && (
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-default ${statusLabel === 'completed' ? 'bg-success' : 'bg-primary'}`}
                          style={{ width: `${modAssignments.length > 0 ? (completedAssignments / modAssignments.length) * 100 : 0}%` }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded ${
                        statusLabel === 'completed' ? 'bg-success/10 text-success' :
                        statusLabel === 'active' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {statusLabel}
                      </span>
                      {mod.lecturer_id && lecturerMap[mod.lecturer_id] && (
                        <span className="text-[10px] text-muted-foreground">{lecturerMap[mod.lecturer_id]}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {progModules.length === 0 && (
                <div className="col-span-full surface-card p-8 text-center text-muted-foreground text-sm">No modules for this programme</div>
              )}
            </div>
          </div>
        );
      })}

      {programmes.length === 0 && (
        <div className="surface-card p-12 text-center text-muted-foreground text-sm">No enrolled programmes found</div>
      )}

      {/* Module Detail Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
        <DialogContent className="max-w-lg">
          {selectedModule && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {selectedModule.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Code:</span>
                  <span className="font-medium">{selectedModule.code || 'N/A'}</span>
                  <span className="text-muted-foreground ml-4">Credits:</span>
                  <span className="font-medium">{selectedModule.credits || 0}</span>
                  <StatusBadge
                    status={selectedModule.status === 'archived' ? 'Completed' : selectedModule.status}
                    variant={selectedModule.status === 'archived' ? 'success' : selectedModule.status === 'active' ? 'info' : 'neutral'}
                  />
                </div>

                {selectedModule.lecturer_id && lecturerMap[selectedModule.lecturer_id] && (
                  <p className="text-sm text-muted-foreground">Lecturer: <span className="font-medium text-foreground">{lecturerMap[selectedModule.lecturer_id]}</span></p>
                )}

                {/* Assignments for this module */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Assignments</h4>
                  <div className="space-y-2">
                    {(assignmentsByModule[selectedModule.id] || []).map((a: any) => {
                      const sub = submissionByAssignment[a.id];
                      return (
                        <div key={a.id} className="surface-data p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground">{a.type} · Due {new Date(a.deadline).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div className="text-right">
                            {sub?.grade != null ? (
                              <span className="text-sm font-bold text-primary">{sub.grade}%</span>
                            ) : sub ? (
                              <StatusBadge status="Submitted" variant="info" />
                            ) : (
                              <StatusBadge status="Pending" variant="warning" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(assignmentsByModule[selectedModule.id] || []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No assignments yet</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={() => { setSelectedModule(null); navigate('/student/assignments'); }}>
                    View All Assignments
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setSelectedModule(null); navigate('/student/grades'); }}>
                    View Grades
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
