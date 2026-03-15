import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

interface ModuleGrade {
  module: string;
  assignments: { name: string; grade: number | null; weight: number }[];
  overall: number | null;
  status: string;
}

const getGradeClass = (grade: number) => {
  if (grade >= 70) return 'Distinction';
  if (grade >= 60) return 'Merit';
  if (grade >= 40) return 'Pass';
  return 'Fail';
};

export default function StudentGrades() {
  const [moduleGrades, setModuleGrades] = useState<ModuleGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrades() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch assignments with their modules
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*, modules(title)')
        .order('deadline', { ascending: true });

      // Fetch student's submissions
      let submissionsMap: Record<string, any> = {};
      if (user) {
        const { data: subs } = await supabase
          .from('submissions')
          .select('*')
          .eq('student_id', user.id);
        for (const s of subs || []) {
          submissionsMap[s.assignment_id] = s;
        }
      }

      // Group by module
      const moduleMap: Record<string, ModuleGrade> = {};
      for (const a of assignments || []) {
        const moduleName = (a as any).modules?.title || 'Unknown Module';
        if (!moduleMap[moduleName]) {
          moduleMap[moduleName] = { module: moduleName, assignments: [], overall: null, status: 'in_progress' };
        }
        const sub = submissionsMap[a.id];
        moduleMap[moduleName].assignments.push({
          name: a.title,
          grade: sub?.grade || null,
          weight: Math.round(100 / (assignments || []).filter((x: any) => (x as any).modules?.title === moduleName).length),
        });
      }

      // Calculate overall grades
      const grades = Object.values(moduleMap).map((mod) => {
        const graded = mod.assignments.filter((a) => a.grade !== null);
        if (graded.length === mod.assignments.length && graded.length > 0) {
          const totalWeight = graded.reduce((s, a) => s + a.weight, 0);
          mod.overall = Math.round(graded.reduce((s, a) => s + (a.grade || 0) * a.weight, 0) / totalWeight);
          mod.status = 'completed';
        }
        return mod;
      });

      setModuleGrades(grades);
      setLoading(false);
    }
    fetchGrades();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const completedModules = moduleGrades.filter((m) => m.overall !== null);
  const avgGrade = completedModules.length > 0
    ? Math.round(completedModules.reduce((s, m) => s + (m.overall || 0), 0) / completedModules.length)
    : 0;

  return (
    <DashboardLayout title="Grades & Results" subtitle="Academic performance across all modules">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold text-primary">{avgGrade}%</p>
          <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
          {avgGrade > 0 && <span className="text-xs font-semibold text-primary">{getGradeClass(avgGrade)}</span>}
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold">{completedModules.length}/{moduleGrades.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Modules Graded</p>
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold text-success">{completedModules.filter((m) => (m.overall || 0) >= 70).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Distinctions</p>
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold">120</p>
          <p className="text-xs text-muted-foreground mt-1">Total Credits</p>
        </div>
      </div>

      <div className="space-y-4">
        {moduleGrades.map((mod) => (
          <div key={mod.module} className="surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  mod.overall !== null && mod.overall >= 70 ? 'bg-success/10' :
                  mod.overall !== null ? 'bg-primary/10' : 'bg-secondary'
                }`}>
                  <BookOpen className={`w-4 h-4 ${
                    mod.overall !== null && mod.overall >= 70 ? 'text-success' :
                    mod.overall !== null ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{mod.module}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{mod.status.replace('_', ' ')}</p>
                </div>
              </div>
              {mod.overall !== null && (
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{mod.overall}%</p>
                  <p className="text-[10px] font-medium text-primary">{getGradeClass(mod.overall)}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {mod.assignments.map((a) => (
                <div key={a.name} className="flex items-center justify-between py-2 px-3 surface-data rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">({a.weight}%)</span>
                  </div>
                  {a.grade !== null ? (
                    <span className={`text-sm font-semibold ${a.grade >= 70 ? 'text-success' : a.grade >= 60 ? 'text-primary' : 'text-foreground'}`}>
                      {a.grade}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {moduleGrades.length === 0 && (
          <div className="surface-card p-12 text-center text-muted-foreground text-sm">No grades available yet</div>
        )}
      </div>
    </DashboardLayout>
  );
}
