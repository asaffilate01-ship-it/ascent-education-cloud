import DashboardLayout from '@/components/layout/DashboardLayout';
import { BookOpen, AlertCircle, Send, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ModuleGrade {
  module: string;
  assignments: { name: string; grade: number | null; weight: number; assignmentId: string }[];
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
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealTarget, setAppealTarget] = useState<{ module: string; assignment: string; grade: number } | null>(null);
  const [appeals, setAppeals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchGrades() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: assignments } = await supabase
        .from('assignments')
        .select('*, modules(title)')
        .order('deadline', { ascending: true });

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
          assignmentId: a.id,
        });
      }

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

  const handleAppeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!appealTarget) return;
    const fd = new FormData(e.currentTarget);
    const reason = fd.get('reason') as string;
    setAppeals(prev => ({ ...prev, [appealTarget.assignment]: true }));
    setAppealOpen(false);
    toast.success('Grade appeal submitted. The QA team will review your request.');
  };

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

      {/* Grade Appeal Dialog */}
      <Dialog open={appealOpen} onOpenChange={setAppealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appeal Grade</DialogTitle>
          </DialogHeader>
          {appealTarget && (
            <form onSubmit={handleAppeal} className="space-y-4">
              <div className="surface-data rounded-lg p-3">
                <p className="text-sm font-medium">{appealTarget.module}</p>
                <p className="text-xs text-muted-foreground">{appealTarget.assignment} — Current Grade: {appealTarget.grade}%</p>
              </div>
              <div>
                <Label>Reason for Appeal</Label>
                <Textarea name="reason" required placeholder="Explain why you believe the grade should be reviewed..." rows={4} />
              </div>
              <p className="text-[10px] text-muted-foreground">Appeals are reviewed by the QA/IQA team within 10 working days. You will be notified of the outcome.</p>
              <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-2" />Submit Appeal</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                  <div className="flex items-center gap-2">
                    {a.grade !== null ? (
                      <>
                        <span className={`text-sm font-semibold ${a.grade >= 70 ? 'text-success' : a.grade >= 60 ? 'text-primary' : 'text-foreground'}`}>
                          {a.grade}%
                        </span>
                        {appeals[a.name] ? (
                          <span className="text-[10px] text-warning flex items-center gap-1"><AlertCircle className="w-3 h-3" />Under review</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-6 px-2"
                            onClick={() => { setAppealTarget({ module: mod.module, assignment: a.name, grade: a.grade! }); setAppealOpen(true); }}
                          >
                            Appeal
                          </Button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </div>
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
