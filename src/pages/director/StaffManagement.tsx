import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { Users, UserPlus, Shield, Award, Mail, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const STAFF_MEMBERS = [
  { id: '1', name: 'Dr. Ahmed Khan', email: 'ahmed.khan@edupathway.pk', role: 'Lecturer', department: 'Business', qualification: 'PhD Business Admin', modules: 3, students: 86, status: 'active', joinDate: '2024-09-01' },
  { id: '2', name: 'Mr. Rashid Ali', email: 'rashid.ali@edupathway.pk', role: 'Lecturer', department: 'Finance', qualification: 'MSc Finance', modules: 2, students: 60, status: 'active', joinDate: '2024-09-01' },
  { id: '3', name: 'Ms. Fatima Ahmed', email: 'fatima.ahmed@edupathway.pk', role: 'Lecturer', department: 'Business', qualification: 'MBA', modules: 2, students: 58, status: 'active', joinDate: '2024-10-15' },
  { id: '4', name: 'Dr. Saeed Farooq', email: 'saeed.farooq@edupathway.pk', role: 'Programme Leader', department: 'Computing', qualification: 'PhD Computer Science', modules: 2, students: 83, status: 'active', joinDate: '2024-09-01' },
  { id: '5', name: 'Mrs. Nadia Hussain', email: 'nadia.hussain@edupathway.pk', role: 'IQA Officer', department: 'Quality', qualification: 'CELTA, DTLLS', modules: 0, students: 0, status: 'active', joinDate: '2024-11-01' },
  { id: '6', name: 'Mr. Kamran Shah', email: 'kamran.shah@edupathway.pk', role: 'Exams Officer', department: 'Examinations', qualification: 'BA Education', modules: 0, students: 0, status: 'active', joinDate: '2025-01-10' },
  { id: '7', name: 'Ms. Sana Malik', email: 'sana.malik@edupathway.pk', role: 'Admissions Admin', department: 'Admissions', qualification: 'BBA', modules: 0, students: 0, status: 'active', joinDate: '2024-09-15' },
  { id: '8', name: 'Dr. Imran Shah', email: 'imran.shah@edupathway.pk', role: 'Centre Director', department: 'Management', qualification: 'EdD Leadership', modules: 0, students: 0, status: 'active', joinDate: '2024-08-01' },
  { id: '9', name: 'Mr. Hassan Raza', email: 'hassan.raza@edupathway.pk', role: 'Lecturer', department: 'Accounting', qualification: 'ACCA, MSc Accounting', modules: 2, students: 44, status: 'on_leave', joinDate: '2024-09-01' },
];

const columns = [
  { key: 'name', label: 'Name', render: (s: typeof STAFF_MEMBERS[0]) => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-primary">{s.name.split(' ').map(n => n[0]).join('')}</span>
      </div>
      <div>
        <p className="text-sm font-medium">{s.name}</p>
        <p className="text-[10px] text-muted-foreground">{s.email}</p>
      </div>
    </div>
  )},
  { key: 'role', label: 'Role', render: (s: typeof STAFF_MEMBERS[0]) => <span className="text-xs font-medium">{s.role}</span> },
  { key: 'department', label: 'Department', render: (s: typeof STAFF_MEMBERS[0]) => <span className="text-xs text-muted-foreground">{s.department}</span> },
  { key: 'modules', label: 'Modules', render: (s: typeof STAFF_MEMBERS[0]) => <span className="text-sm font-medium">{s.modules || '-'}</span> },
  { key: 'students', label: 'Students', render: (s: typeof STAFF_MEMBERS[0]) => <span className="text-sm font-medium">{s.students || '-'}</span> },
  { key: 'status', label: 'Status', render: (s: typeof STAFF_MEMBERS[0]) => (
    <StatusBadge status={s.status === 'active' ? 'Active' : 'On Leave'} variant={s.status === 'active' ? 'success' : 'warning'} />
  )},
];

export default function StaffManagement() {
  const [search, setSearch] = useState('');
  const filtered = STAFF_MEMBERS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle={`${STAFF_MEMBERS.length} staff members`}
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Staff</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Staff" value={STAFF_MEMBERS.length} icon={Users} />
        <StatCard label="Lecturers" value={STAFF_MEMBERS.filter(s => s.role === 'Lecturer').length} icon={Award} />
        <StatCard label="Active" value={STAFF_MEMBERS.filter(s => s.status === 'active').length} changeType="positive" change="Working" icon={Shield} />
        <StatCard label="On Leave" value={STAFF_MEMBERS.filter(s => s.status === 'on_leave').length} icon={Users} />
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <DataTable columns={columns} data={filtered} />
    </DashboardLayout>
  );
}
