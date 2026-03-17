import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, BarChart3, Calendar, CreditCard, BookOpen, MessageSquare, Bell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LinkedStudent {
  student_id: string;
  relationship: string;
  verified: boolean;
  profile?: { full_name: string; email: string };
  enrolments?: { programme_title: string; status: string }[];
  grades?: { assignment_title: string; grade: number }[];
  attendance_rate?: number;
  invoices_pending?: number;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLinkedStudents() {
      if (!user) return;
      const { data: links } = await supabase
        .from('parent_student_links')
        .select('*')
        .eq('parent_id', user.id);

      if (!links || links.length === 0) { setLoading(false); return; }

      const enriched: LinkedStudent[] = await Promise.all(links.map(async (link: any) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('user_id', link.student_id).single();
        const { data: subs } = await supabase.from('submissions').select('grade, assignment_id').eq('student_id', link.student_id).not('grade', 'is', null);
        const { data: attendance } = await supabase.from('attendance_records').select('status').eq('student_id', link.student_id);
        const { count: pendingInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('student_id', link.student_id).eq('status', 'pending');

        const presentCount = attendance?.filter((a: any) => a.status === 'present' || a.status === 'late').length || 0;
        const totalCount = attendance?.length || 1;

        return {
          student_id: link.student_id,
          relationship: link.relationship,
          verified: link.verified,
          profile: profile || { full_name: 'Unknown', email: '' },
          grades: (subs || []).map((s: any) => ({ assignment_title: s.assignment_id || 'Assignment', grade: s.grade })),
          attendance_rate: Math.round((presentCount / totalCount) * 100),
          invoices_pending: pendingInvoices || 0,
        };
      }));

      setStudents(enriched);
      if (enriched.length > 0) setSelectedStudent(enriched[0].student_id);
      setLoading(false);
    }
    fetchLinkedStudents();
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  const current = students.find(s => s.student_id === selectedStudent);
  const avgGrade = current?.grades?.length
    ? Math.round(current.grades.reduce((sum, g) => sum + g.grade, 0) / current.grades.length)
    : 0;

  return (
    <DashboardLayout title="Parent Portal" subtitle="Monitor your child's academic progress">
      {students.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Linked Students</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Contact the admissions team to link your account to your child's student record.
          </p>
        </div>
      ) : (
        <>
          {students.length > 1 && (
            <div className="flex gap-2 mb-6">
              {students.map(s => (
                <button
                  key={s.student_id}
                  onClick={() => setSelectedStudent(s.student_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-default ${
                    selectedStudent === s.student_id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.profile?.full_name}
                </button>
              ))}
            </div>
          )}

          {current && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{current.profile?.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{current.profile?.email} · {current.relationship}</p>
                </div>
                {!current.verified && (
                  <StatusBadge status="Pending Verification" variant="warning" />
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Average Grade" value={`${avgGrade}%`} icon={BarChart3}
                  trend={avgGrade >= 60 ? 'up' : avgGrade >= 40 ? undefined : 'down'}
                  trendText={avgGrade >= 70 ? 'Distinction' : avgGrade >= 60 ? 'Merit' : avgGrade >= 40 ? 'Pass' : 'At Risk'} />
                <StatCard title="Attendance" value={`${current.attendance_rate}%`} icon={Calendar}
                  trend={current.attendance_rate! >= 80 ? 'up' : 'down'}
                  trendText={current.attendance_rate! >= 80 ? 'Good' : 'Needs Attention'} />
                <StatCard title="Assignments Graded" value={String(current.grades?.length || 0)} icon={BookOpen} />
                <StatCard title="Pending Invoices" value={String(current.invoices_pending)} icon={CreditCard}
                  trend={current.invoices_pending! > 0 ? 'down' : 'up'}
                  trendText={current.invoices_pending! > 0 ? 'Outstanding' : 'All Clear'} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="surface-card p-5">
                  <h3 className="text-sm font-bold mb-3">Recent Grades</h3>
                  {current.grades && current.grades.length > 0 ? (
                    <div className="space-y-2">
                      {current.grades.slice(0, 5).map((g, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <span className="text-sm">{g.assignment_title || 'Assignment'}</span>
                          <span className={`text-sm font-bold ${g.grade >= 70 ? 'text-success' : g.grade >= 40 ? 'text-primary' : 'text-destructive'}`}>
                            {g.grade}%
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No grades available yet</p>
                  )}
                </div>

                <div className="surface-card p-5">
                  <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/messaging')}>
                      <MessageSquare className="w-4 h-4" /> Message a Lecturer
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/notifications')}>
                      <Bell className="w-4 h-4" /> View Notifications
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
