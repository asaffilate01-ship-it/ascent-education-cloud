import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { Calendar, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

interface StudentAttendanceSummary {
  id: string;
  student: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export default function LecturerAttendance() {
  const { data: records, loading } = useSupabaseQuery('attendance_records', {
    orderBy: { column: 'date', ascending: false },
  });
  const { data: profiles } = useSupabaseQuery('profiles');

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => { map[p.user_id] = p.full_name; });
    return map;
  }, [profiles]);

  const studentSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    const byStudent: Record<string, { total: number; present: number; absent: number; late: number }> = {};
    records.forEach((r) => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = { total: 0, present: 0, absent: 0, late: 0 };
      const s = byStudent[r.student_id];
      s.total++;
      if (r.status === 'present') s.present++;
      else if (r.status === 'absent') s.absent++;
      else if (r.status === 'late') s.late++;
      else if (r.status === 'excused') s.present++; // count excused as present
    });
    return Object.entries(byStudent).map(([id, s]) => ({
      id,
      student: profileMap[id] || id.slice(0, 8),
      ...s,
      rate: s.total > 0 ? Math.round(((s.present) / s.total) * 100) : 0,
    }));
  }, [records, profileMap]);

  if (loading) return <DashboardSkeleton />;

  const avgRate = studentSummaries.length > 0
    ? Math.round(studentSummaries.reduce((s, d) => s + d.rate, 0) / studentSummaries.length)
    : 0;
  const atRisk = studentSummaries.filter((d) => d.rate < 70).length;

  const columns = [
    { key: 'student' as const, label: 'Student', render: (r: StudentAttendanceSummary) => <span className="text-sm font-medium">{r.student}</span> },
    { key: 'present' as const, label: 'Present', render: (r: StudentAttendanceSummary) => <span className="text-sm text-success font-medium">{r.present}</span> },
    { key: 'absent' as const, label: 'Absent', render: (r: StudentAttendanceSummary) => <span className={`text-sm font-medium ${r.absent > 2 ? 'text-destructive' : ''}`}>{r.absent}</span> },
    { key: 'late' as const, label: 'Late', render: (r: StudentAttendanceSummary) => <span className="text-sm text-warning font-medium">{r.late}</span> },
    { key: 'rate' as const, label: 'Rate', render: (r: StudentAttendanceSummary) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-secondary rounded-full">
          <div className={`h-full rounded-full ${r.rate >= 80 ? 'bg-success' : r.rate >= 60 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${r.rate}%` }} />
        </div>
        <span className={`text-xs font-semibold ${r.rate >= 80 ? 'text-success' : r.rate >= 60 ? 'text-warning' : 'text-destructive'}`}>{r.rate}%</span>
      </div>
    )},
    { key: 'id' as const, label: 'Status', render: (r: StudentAttendanceSummary) => (
      <StatusBadge
        status={r.rate >= 80 ? 'Good' : r.rate >= 60 ? 'At Risk' : 'Critical'}
        variant={r.rate >= 80 ? 'success' : r.rate >= 60 ? 'warning' : 'danger'}
      />
    )},
  ];

  return (
    <DashboardLayout
      title="Attendance"
      subtitle="Student attendance overview from records"
      actions={<Button size="sm"><Calendar className="w-3.5 h-3.5 mr-1.5" />Take Register</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Average Attendance" value={`${avgRate}%`} changeType={avgRate >= 80 ? 'positive' : 'negative'} change={avgRate >= 80 ? 'On target' : 'Below 80%'} icon={Calendar} />
        <StatCard label="Total Students" value={studentSummaries.length} icon={Users} />
        <StatCard label="At Risk (<70%)" value={atRisk} change="Need intervention" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Perfect Attendance" value={studentSummaries.filter((d) => d.rate === 100).length} icon={CheckCircle} />
      </div>

      {studentSummaries.length > 0 ? (
        <DataTable columns={columns} data={studentSummaries} />
      ) : (
        <div className="surface-card p-12 text-center text-muted-foreground text-sm">No attendance records found</div>
      )}
    </DashboardLayout>
  );
}
