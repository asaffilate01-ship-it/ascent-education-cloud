import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart3, Award, TrendingUp, BookOpen } from 'lucide-react';

const MODULE_GRADES = [
  { module: 'Strategic Management', assignments: [{ name: 'Strategy Report', grade: 68, weight: 60 }, { name: 'Case Study', grade: 72, weight: 40 }], overall: 70, status: 'in_progress' },
  { module: 'Financial Analysis', assignments: [{ name: 'Ratio Analysis', grade: null, weight: 50 }, { name: 'Investment Appraisal', grade: null, weight: 50 }], overall: null, status: 'in_progress' },
  { module: 'Business Environment', assignments: [{ name: 'Macro Report', grade: 72, weight: 50 }, { name: 'SWOT Analysis', grade: 78, weight: 30 }, { name: 'Group Project', grade: 75, weight: 20 }], overall: 74, status: 'completed' },
];

const getGradeClass = (grade: number) => {
  if (grade >= 70) return 'Distinction';
  if (grade >= 60) return 'Merit';
  if (grade >= 40) return 'Pass';
  return 'Fail';
};

export default function StudentGrades() {
  const completedModules = MODULE_GRADES.filter(m => m.overall !== null);
  const avgGrade = completedModules.length > 0
    ? Math.round(completedModules.reduce((s, m) => s + (m.overall || 0), 0) / completedModules.length)
    : 0;

  return (
    <DashboardLayout title="Grades & Results" subtitle="Academic performance across all modules">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold text-primary">{avgGrade}%</p>
          <p className="text-xs text-muted-foreground mt-1">Overall Average</p>
          <span className="text-xs font-semibold text-primary">{getGradeClass(avgGrade)}</span>
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold">{completedModules.length}/{MODULE_GRADES.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Modules Graded</p>
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold text-success">{completedModules.filter(m => (m.overall || 0) >= 70).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Distinctions</p>
        </div>
        <div className="surface-card p-5 text-center">
          <p className="text-3xl font-bold">120</p>
          <p className="text-xs text-muted-foreground mt-1">Total Credits</p>
        </div>
      </div>

      {/* Module Grades */}
      <div className="space-y-4">
        {MODULE_GRADES.map((mod) => (
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
      </div>
    </DashboardLayout>
  );
}
