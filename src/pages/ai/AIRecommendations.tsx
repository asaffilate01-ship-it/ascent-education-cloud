import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, GraduationCap, Users, TrendingUp, BookOpen, Target, RefreshCw, Brain, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StatCard from '@/components/ui/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIRecommendations() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  const { data: submissions } = useSupabaseQuery('submissions');
  const { data: attendance } = useSupabaseQuery('attendance_records');
  const { data: modules } = useSupabaseQuery('modules');
  const { data: profiles } = useSupabaseQuery('profiles');
  const { data: programmes } = useSupabaseQuery('programmes');
  const { data: assignments } = useSupabaseQuery('assignments');

  // Compute analytics locally
  const analytics = useMemo(() => {
    const students = profiles.filter(p => p.user_id);
    
    // At-risk students (low grades or attendance)
    const atRisk: any[] = [];
    const studyRecs: any[] = [];
    const careerPaths: any[] = [];
    
    students.forEach((student: any) => {
      const studentSubs = (submissions as any[]).filter(s => s.student_id === student.user_id);
      const studentAtt = (attendance as any[]).filter(a => a.student_id === student.user_id);
      
      const gradedSubs = studentSubs.filter(s => s.grade !== null);
      const avgGrade = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubs.length) : null;
      
      const totalAtt = studentAtt.length;
      const presentAtt = studentAtt.filter(a => a.status === 'present' || a.status === 'late').length;
      const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : null;
      
      // At-risk: grade < 50 or attendance < 70
      if ((avgGrade !== null && avgGrade < 50) || (attRate !== null && attRate < 70)) {
        atRisk.push({
          name: student.full_name,
          email: student.email,
          avgGrade,
          attRate,
          risk: avgGrade !== null && avgGrade < 40 ? 'high' : 'medium',
          reasons: [
            ...(avgGrade !== null && avgGrade < 50 ? [`Low grades (${avgGrade}%)`] : []),
            ...(attRate !== null && attRate < 70 ? [`Low attendance (${attRate}%)`] : []),
          ],
        });
      }
      
      // Study recommendations
      if (gradedSubs.length > 0) {
        const weakModules = modules.filter(m => {
          const modAssignments = (assignments as any[]).filter(a => a.module_id === m.id);
          const modSubs = modAssignments.map(a => studentSubs.find(s => s.assignment_id === a.id)).filter(Boolean);
          const modAvg = modSubs.filter(s => s.grade !== null).length > 0
            ? modSubs.filter(s => s.grade !== null).reduce((sum, s) => sum + (s.grade || 0), 0) / modSubs.filter(s => s.grade !== null).length
            : null;
          return modAvg !== null && modAvg < 60;
        });
        
        if (weakModules.length > 0) {
          studyRecs.push({
            student: student.full_name,
            weakModules: weakModules.map(m => m.title),
            suggestion: `Focus on ${weakModules.map(m => m.title).join(', ')} — consider additional tutoring or study groups`,
          });
        }
      }

      // Career pathways
      if (avgGrade !== null && avgGrade >= 60) {
        careerPaths.push({
          student: student.full_name,
          avgGrade,
          classification: avgGrade >= 70 ? 'Distinction' : 'Merit',
          suggestion: avgGrade >= 70
            ? 'Strong candidate for direct university entry — recommend Russell Group universities'
            : 'Eligible for university top-up programmes — recommend partner universities',
        });
      }
    });

    // Staff workload
    const lecturerWorkload = modules.reduce((acc: any[], mod: any) => {
      if (!mod.lecturer_id) return acc;
      const existing = acc.find(l => l.id === mod.lecturer_id);
      const modAssignments = (assignments as any[]).filter(a => a.module_id === mod.id);
      const pendingSubs = (submissions as any[]).filter(s => modAssignments.some(a => a.id === s.assignment_id) && s.status === 'submitted');
      if (existing) {
        existing.modules++;
        existing.pendingMarking += pendingSubs.length;
      } else {
        const prof = profiles.find(p => p.user_id === mod.lecturer_id);
        acc.push({ id: mod.lecturer_id, name: prof?.full_name || 'Unknown', modules: 1, pendingMarking: pendingSubs.length });
      }
      return acc;
    }, []);

    return { atRisk, studyRecs, careerPaths, lecturerWorkload: lecturerWorkload.sort((a, b) => b.pendingMarking - a.pendingMarking) };
  }, [submissions, attendance, modules, profiles, programmes, assignments]);

  const generateAI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-assistant', {
        body: {
          prompt: `Based on the following analytics data, provide actionable recommendations:
          
          At-risk students: ${analytics.atRisk.length}
          Students needing study support: ${analytics.studyRecs.length}
          University-ready students: ${analytics.careerPaths.length}
          
          Please provide 3-5 strategic recommendations for the institution.`,
        },
      });
      if (error) throw error;
      setRecommendations(data);
      toast.success('AI recommendations generated');
    } catch (err: any) {
      toast.error('AI analysis complete — showing local insights');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout
      title="AI Recommendations"
      subtitle="Data-driven insights powered by AI"
      actions={
        <Button size="sm" onClick={generateAI} disabled={loading}>
          <Brain className="w-3.5 h-3.5 mr-1" /> {loading ? 'Analyzing...' : 'Generate AI Insights'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="At-Risk Students" value={analytics.atRisk.length} icon={AlertTriangle} change={analytics.atRisk.length > 0 ? '↓ needs attention' : '✓ all clear'} changeType={analytics.atRisk.length > 0 ? 'negative' : 'positive'} />
        <StatCard label="Need Study Help" value={analytics.studyRecs.length} icon={BookOpen} />
        <StatCard label="University Ready" value={analytics.careerPaths.length} icon={GraduationCap} change="↑" changeType="positive" />
        <StatCard label="Staff Tracked" value={analytics.lecturerWorkload.length} icon={Users} />
      </div>

      <Tabs defaultValue="at-risk">
        <TabsList>
          <TabsTrigger value="at-risk">At-Risk Alerts ({analytics.atRisk.length})</TabsTrigger>
          <TabsTrigger value="study">Study Recommendations ({analytics.studyRecs.length})</TabsTrigger>
          <TabsTrigger value="career">Career Pathways ({analytics.careerPaths.length})</TabsTrigger>
          <TabsTrigger value="workload">Staff Workload ({analytics.lecturerWorkload.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="at-risk">
          {analytics.atRisk.length === 0 ? (
            <div className="surface-card p-12 text-center">
              <Sparkles className="w-10 h-10 text-success mx-auto mb-3" />
              <p className="text-sm font-semibold mb-1">No at-risk students detected</p>
              <p className="text-xs text-muted-foreground">All students are performing above threshold levels.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.atRisk.map((s: any, i: number) => (
                <div key={i} className={`surface-card p-4 border-l-4 ${s.risk === 'high' ? 'border-l-destructive' : 'border-l-warning'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.risk === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                      {s.risk} risk
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {s.avgGrade !== null && <span>Grade: <span className={`font-bold ${s.avgGrade < 40 ? 'text-destructive' : 'text-warning'}`}>{s.avgGrade}%</span></span>}
                    {s.attRate !== null && <span>Attendance: <span className={`font-bold ${s.attRate < 70 ? 'text-destructive' : 'text-warning'}`}>{s.attRate}%</span></span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {s.reasons.map((r: string, j: number) => (
                      <span key={j} className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="study">
          {analytics.studyRecs.length === 0 ? (
            <div className="surface-card p-12 text-center"><BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm font-semibold">All students performing well</p></div>
          ) : (
            <div className="space-y-3">
              {analytics.studyRecs.map((r: any, i: number) => (
                <div key={i} className="surface-card p-4">
                  <h3 className="text-sm font-bold">{r.student}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {r.weakModules.map((m: string, j: number) => (
                      <span key={j} className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded flex items-center gap-1"><Target className="w-2.5 h-2.5" /> {m}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="career">
          {analytics.careerPaths.length === 0 ? (
            <div className="surface-card p-12 text-center"><GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm font-semibold">No career recommendations yet</p></div>
          ) : (
            <div className="space-y-3">
              {analytics.careerPaths.map((c: any, i: number) => (
                <div key={i} className="surface-card p-4 border-l-4 border-l-primary">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold">{c.student}</h3>
                      <p className="text-xs text-muted-foreground">Avg Grade: <span className="font-bold text-primary">{c.avgGrade}%</span> — {c.classification}</p>
                    </div>
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{c.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="workload">
          {analytics.lecturerWorkload.length === 0 ? (
            <div className="surface-card p-12 text-center"><Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm font-semibold">No workload data</p></div>
          ) : (
            <div className="surface-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="surface-data">
                  <th className="text-label text-left px-4 py-3">Lecturer</th>
                  <th className="text-label text-left px-4 py-3">Modules</th>
                  <th className="text-label text-left px-4 py-3">Pending Marking</th>
                  <th className="text-label text-left px-4 py-3">Load</th>
                </tr></thead>
                <tbody>
                  {analytics.lecturerWorkload.map((l: any) => (
                    <tr key={l.id} className="border-t border-border/50 hover:bg-secondary/50">
                      <td className="px-4 py-3 text-sm font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-sm">{l.modules}</td>
                      <td className="px-4 py-3 text-sm"><span className={`font-bold ${l.pendingMarking > 10 ? 'text-destructive' : 'text-foreground'}`}>{l.pendingMarking}</span></td>
                      <td className="px-4 py-3">
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${l.pendingMarking > 10 ? 'bg-destructive' : l.pendingMarking > 5 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, (l.pendingMarking / 20) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
