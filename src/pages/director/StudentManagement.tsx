import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { GraduationCap, UserPlus, Search, BookOpen, CreditCard, BarChart3, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const STUDENTS = [
  { id: '1', name: 'Sara Ali', studentId: 'EP-2024-001', email: 'sara.ali@email.com', programme: 'Level 5 Business Mgmt', intake: 'Oct 2024', attendance: 88, grade: 72, fees: 'Paid', status: 'active' },
  { id: '2', name: 'Omar Farooq', studentId: 'EP-2024-002', email: 'omar.farooq@email.com', programme: 'Level 5 Business Mgmt', intake: 'Oct 2024', attendance: 75, grade: 65, fees: 'Partial', status: 'active' },
  { id: '3', name: 'Zara Sheikh', studentId: 'EP-2024-003', email: 'zara.sheikh@email.com', programme: 'Level 5 Business Mgmt', intake: 'Oct 2024', attendance: 95, grade: 78, fees: 'Paid', status: 'active' },
  { id: '4', name: 'Hassan Malik', studentId: 'EP-2024-004', email: 'hassan.malik@email.com', programme: 'Level 4 Computing', intake: 'Oct 2024', attendance: 50, grade: 45, fees: 'Overdue', status: 'at_risk' },
  { id: '5', name: 'Ayesha Noor', studentId: 'EP-2024-005', email: 'ayesha.noor@email.com', programme: 'Level 4 Business Mgmt', intake: 'Jan 2025', attendance: 92, grade: 70, fees: 'Paid', status: 'active' },
  { id: '6', name: 'Bilal Ahmed', studentId: 'EP-2024-006', email: 'bilal.ahmed@email.com', programme: 'Level 4 Computing', intake: 'Jan 2025', attendance: 68, grade: 55, fees: 'Partial', status: 'active' },
  { id: '7', name: 'Fatima Khan', studentId: 'EP-2024-007', email: 'fatima.khan@email.com', programme: 'Level 3 Accounting', intake: 'Oct 2024', attendance: 96, grade: 82, fees: 'Paid', status: 'active' },
  { id: '8', name: 'Usman Raza', studentId: 'EP-2024-008', email: 'usman.raza@email.com', programme: 'Level 5 Computing', intake: 'Oct 2024', attendance: 82, grade: 68, fees: 'Paid', status: 'active' },
  { id: '9', name: 'Mariam Iqbal', studentId: 'EP-2024-009', email: 'mariam.iqbal@email.com', programme: 'Level 5 Business Mgmt', intake: 'Oct 2024', attendance: 15, grade: 0, fees: 'Overdue', status: 'withdrawn' },
  { id: '10', name: 'Ali Hussain', studentId: 'EP-2024-010', email: 'ali.hussain@email.com', programme: 'Level 4 Computing', intake: 'Jan 2025', attendance: 88, grade: 62, fees: 'Paid', status: 'active' },
];

const columns = [
  { key: 'name', label: 'Student', render: (s: typeof STUDENTS[0]) => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-primary">{s.name.split(' ').map(n => n[0]).join('')}</span>
      </div>
      <div>
        <p className="text-sm font-medium">{s.name}</p>
        <p className="text-[10px] text-muted-foreground">{s.studentId}</p>
      </div>
    </div>
  )},
  { key: 'programme', label: 'Programme', render: (s: typeof STUDENTS[0]) => <span className="text-xs">{s.programme}</span> },
  { key: 'attendance', label: 'Attendance', render: (s: typeof STUDENTS[0]) => (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-secondary rounded-full">
        <div className={`h-full rounded-full ${s.attendance >= 80 ? 'bg-success' : s.attendance >= 60 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${s.attendance}%` }} />
      </div>
      <span className={`text-xs font-medium ${s.attendance >= 80 ? 'text-success' : s.attendance >= 60 ? 'text-warning' : 'text-destructive'}`}>{s.attendance}%</span>
    </div>
  )},
  { key: 'grade', label: 'Grade', render: (s: typeof STUDENTS[0]) => (
    <span className={`text-xs font-semibold ${s.grade >= 70 ? 'text-success' : s.grade >= 60 ? 'text-primary' : s.grade >= 40 ? 'text-foreground' : 'text-destructive'}`}>
      {s.grade > 0 ? `${s.grade}%` : '-'}
    </span>
  )},
  { key: 'fees', label: 'Fees', render: (s: typeof STUDENTS[0]) => (
    <StatusBadge
      status={s.fees}
      variant={s.fees === 'Paid' ? 'success' : s.fees === 'Partial' ? 'warning' : 'danger'}
    />
  )},
  { key: 'status', label: 'Status', render: (s: typeof STUDENTS[0]) => (
    <StatusBadge
      status={s.status === 'active' ? 'Active' : s.status === 'at_risk' ? 'At Risk' : 'Withdrawn'}
      variant={s.status === 'active' ? 'success' : s.status === 'at_risk' ? 'danger' : 'neutral'}
    />
  )},
];

export default function StudentManagement() {
  const [search, setSearch] = useState('');
  const filtered = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.studentId.toLowerCase().includes(search.toLowerCase()) ||
    s.programme.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = STUDENTS.filter(s => s.status === 'active').length;
  const atRiskCount = STUDENTS.filter(s => s.status === 'at_risk' || s.attendance < 70).length;

  return (
    <DashboardLayout
      title="Student Registry"
      subtitle={`${STUDENTS.length} students enrolled`}
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Enrol Student</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={STUDENTS.length} icon={GraduationCap} />
        <StatCard label="Active" value={activeCount} changeType="positive" change="Enrolled" icon={BookOpen} />
        <StatCard label="At Risk" value={atRiskCount} changeType="negative" change="Low attendance/grades" icon={BarChart3} />
        <StatCard label="Fees Overdue" value={STUDENTS.filter(s => s.fees === 'Overdue').length} changeType="negative" change="Need follow-up" icon={CreditCard} />
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students by name, ID, or programme..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />
    </DashboardLayout>
  );
}
