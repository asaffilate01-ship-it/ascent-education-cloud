import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { Calendar, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ATTENDANCE_DATA = [
  { student: 'Sara Ali', module: 'Strategic Management', total: 8, present: 7, absent: 1, late: 0, rate: 88 },
  { student: 'Omar Farooq', module: 'Strategic Management', total: 8, present: 6, absent: 1, late: 1, rate: 75 },
  { student: 'Zara Sheikh', module: 'Strategic Management', total: 8, present: 8, absent: 0, late: 0, rate: 100 },
  { student: 'Hassan Malik', module: 'Strategic Management', total: 8, present: 4, absent: 3, late: 1, rate: 50 },
  { student: 'Ayesha Noor', module: 'Strategic Management', total: 8, present: 7, absent: 0, late: 1, rate: 88 },
  { student: 'Bilal Ahmed', module: 'Strategic Management', total: 8, present: 5, absent: 2, late: 1, rate: 63 },
  { student: 'Fatima Khan', module: 'Strategic Management', total: 8, present: 8, absent: 0, late: 0, rate: 100 },
  { student: 'Usman Raza', module: 'Strategic Management', total: 8, present: 6, absent: 2, late: 0, rate: 75 },
];

const columns = [
  { key: 'student', label: 'Student', render: (r: typeof ATTENDANCE_DATA[0]) => <span className="text-sm font-medium">{r.student}</span> },
  { key: 'present', label: 'Present', render: (r: typeof ATTENDANCE_DATA[0]) => <span className="text-sm text-success font-medium">{r.present}</span> },
  { key: 'absent', label: 'Absent', render: (r: typeof ATTENDANCE_DATA[0]) => <span className={`text-sm font-medium ${r.absent > 2 ? 'text-destructive' : ''}`}>{r.absent}</span> },
  { key: 'late', label: 'Late', render: (r: typeof ATTENDANCE_DATA[0]) => <span className="text-sm text-warning font-medium">{r.late}</span> },
  { key: 'rate', label: 'Rate', render: (r: typeof ATTENDANCE_DATA[0]) => (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-secondary rounded-full">
        <div className={`h-full rounded-full ${r.rate >= 80 ? 'bg-success' : r.rate >= 60 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${r.rate}%` }} />
      </div>
      <span className={`text-xs font-semibold ${r.rate >= 80 ? 'text-success' : r.rate >= 60 ? 'text-warning' : 'text-destructive'}`}>{r.rate}%</span>
    </div>
  )},
  { key: 'status', label: 'Status', render: (r: typeof ATTENDANCE_DATA[0]) => (
    <StatusBadge
      status={r.rate >= 80 ? 'Good' : r.rate >= 60 ? 'At Risk' : 'Critical'}
      variant={r.rate >= 80 ? 'success' : r.rate >= 60 ? 'warning' : 'danger'}
    />
  )},
];

export default function LecturerAttendance() {
  const avgRate = Math.round(ATTENDANCE_DATA.reduce((s, d) => s + d.rate, 0) / ATTENDANCE_DATA.length);
  const atRisk = ATTENDANCE_DATA.filter(d => d.rate < 70).length;

  return (
    <DashboardLayout
      title="Attendance"
      subtitle="Strategic Management (Level 5) — Attendance overview"
      actions={<Button size="sm"><Calendar className="w-3.5 h-3.5 mr-1.5" />Take Register</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Average Attendance" value={`${avgRate}%`} changeType={avgRate >= 80 ? 'positive' : 'negative'} change={avgRate >= 80 ? 'On target' : 'Below 80%'} icon={Calendar} />
        <StatCard label="Total Students" value={ATTENDANCE_DATA.length} icon={Users} />
        <StatCard label="At Risk (<70%)" value={atRisk} change="Need intervention" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Perfect Attendance" value={ATTENDANCE_DATA.filter(d => d.rate === 100).length} icon={CheckCircle} />
      </div>

      <DataTable columns={columns} data={ATTENDANCE_DATA} />
    </DashboardLayout>
  );
}
