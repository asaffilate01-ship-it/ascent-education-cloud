import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { GraduationCap, UserPlus, Search, BookOpen, CreditCard, BarChart3, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import CertificateDownloadModal from '@/components/modals/CertificateDownloadModal';

interface StudentRow {
  id: string;
  name: string;
  email: string;
  programme: string;
  enrolledAt: string;
  status: string;
  attendanceRate: number;
  avgGrade: number;
  feeStatus: string;
}

export default function StudentManagement() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Get student enrolments with programme info
      const { data: enrolments } = await supabase
        .from('student_enrolments')
        .select('student_id, programme_id, status, enrolled_at');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      const { data: programmes } = await supabase
        .from('programmes')
        .select('id, title');

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('student_id, status');

      const { data: submissions } = await supabase
        .from('submissions')
        .select('student_id, grade');

      const { data: invoices } = await supabase
        .from('invoices')
        .select('student_id, status');

      const profileMap: Record<string, { name: string; email: string }> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = { name: p.full_name, email: p.email }; });

      const progMap: Record<string, string> = {};
      (programmes || []).forEach(p => { progMap[p.id] = p.title; });

      // Attendance rates per student
      const attMap: Record<string, { total: number; present: number }> = {};
      (attendance || []).forEach(a => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { total: 0, present: 0 };
        attMap[a.student_id].total++;
        if (a.status === 'present' || a.status === 'late') attMap[a.student_id].present++;
      });

      // Avg grade per student
      const gradeMap: Record<string, { total: number; count: number }> = {};
      (submissions || []).forEach(s => {
        if (s.grade != null) {
          if (!gradeMap[s.student_id]) gradeMap[s.student_id] = { total: 0, count: 0 };
          gradeMap[s.student_id].total += s.grade;
          gradeMap[s.student_id].count++;
        }
      });

      // Fee status per student
      const feeMap: Record<string, string> = {};
      (invoices || []).forEach(i => {
        if (i.student_id) {
          if (i.status === 'overdue') feeMap[i.student_id] = 'Overdue';
          else if (i.status === 'partial' && feeMap[i.student_id] !== 'Overdue') feeMap[i.student_id] = 'Partial';
          else if (!feeMap[i.student_id]) feeMap[i.student_id] = i.status === 'paid' ? 'Paid' : 'Pending';
        }
      });

      const rows: StudentRow[] = (enrolments || []).map(e => {
        const profile = profileMap[e.student_id] || { name: 'Unknown', email: '' };
        const att = attMap[e.student_id];
        const grade = gradeMap[e.student_id];
        return {
          id: e.student_id,
          name: profile.name,
          email: profile.email,
          programme: progMap[e.programme_id] || 'Unknown',
          enrolledAt: e.enrolled_at,
          status: e.status,
          attendanceRate: att ? Math.round((att.present / att.total) * 100) : 0,
          avgGrade: grade ? Math.round(grade.total / grade.count) : 0,
          feeStatus: feeMap[e.student_id] || 'N/A',
        };
      });

      setStudents(rows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() =>
    students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.programme.toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const activeCount = students.filter(s => s.status === 'active').length;
  const atRiskCount = students.filter(s => s.attendanceRate > 0 && s.attendanceRate < 70).length;
  const overdueCount = students.filter(s => s.feeStatus === 'Overdue').length;

  if (loading) return <DashboardSkeleton />;

  const columns = [
    { key: 'name', label: 'Student', render: (s: StudentRow) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
        </div>
        <div>
          <p className="text-sm font-medium">{s.name}</p>
          <p className="text-[10px] text-muted-foreground">{s.email}</p>
        </div>
      </div>
    )},
    { key: 'programme', label: 'Programme', render: (s: StudentRow) => <span className="text-xs">{s.programme}</span> },
    { key: 'attendance', label: 'Attendance', render: (s: StudentRow) => (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-secondary rounded-full">
          <div className={`h-full rounded-full ${s.attendanceRate >= 80 ? 'bg-success' : s.attendanceRate >= 60 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${s.attendanceRate}%` }} />
        </div>
        <span className={`text-xs font-medium ${s.attendanceRate >= 80 ? 'text-success' : s.attendanceRate >= 60 ? 'text-warning' : 'text-destructive'}`}>{s.attendanceRate}%</span>
      </div>
    )},
    { key: 'grade', label: 'Avg Grade', render: (s: StudentRow) => (
      <span className={`text-xs font-semibold ${s.avgGrade >= 70 ? 'text-success' : s.avgGrade >= 60 ? 'text-primary' : s.avgGrade >= 40 ? 'text-foreground' : 'text-destructive'}`}>
        {s.avgGrade > 0 ? `${s.avgGrade}%` : '-'}
      </span>
    )},
    { key: 'fees', label: 'Fees', render: (s: StudentRow) => (
      <StatusBadge
        status={s.feeStatus}
        variant={s.feeStatus === 'Paid' ? 'success' : s.feeStatus === 'Partial' ? 'warning' : s.feeStatus === 'Overdue' ? 'danger' : 'neutral'}
      />
    )},
    { key: 'status', label: 'Status', render: (s: StudentRow) => (
      <StatusBadge
        status={s.status === 'active' ? 'Active' : s.status === 'completed' ? 'Completed' : 'Withdrawn'}
        variant={s.status === 'active' ? 'success' : s.status === 'completed' ? 'info' : 'neutral'}
      />
    )},
  ];

  return (
    <DashboardLayout
      title="Student Registry"
      subtitle={`${students.length} students enrolled`}
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Enrol Student</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={students.length} icon={GraduationCap} />
        <StatCard label="Active" value={activeCount} changeType="positive" change="Enrolled" icon={BookOpen} />
        <StatCard label="At Risk" value={atRiskCount} changeType="negative" change="Low attendance" icon={BarChart3} />
        <StatCard label="Fees Overdue" value={overdueCount} changeType="negative" change="Need follow-up" icon={CreditCard} />
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, email, or programme..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="surface-card p-12 text-center text-muted-foreground text-sm">
          No enrolled students yet. Students appear here once their application reaches "Enrolled" status.
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </DashboardLayout>
  );
}
