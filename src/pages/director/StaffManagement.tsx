import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import StatCard from '@/components/ui/StatCard';
import { Users, UserPlus, Shield, Award, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { ROLE_LABELS } from '@/contexts/AuthContext';
import AddStaffModal from '@/components/modals/AddStaffModal';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
  moduleCount: number;
}

const ROLE_DISPLAY: Record<string, string> = {
  centre_director: 'Centre Director',
  admissions_admin: 'Admissions Admin',
  lecturer: 'Lecturer',
  programme_leader: 'Programme Leader',
  iqa_officer: 'IQA Officer',
  exams_officer: 'Exams Officer',
  finance_officer: 'Finance Officer',
  marketing_officer: 'Marketing Officer',
};

export default function StaffManagement() {
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url, created_at');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const { data: modules } = await supabase
      .from('modules')
      .select('lecturer_id');

    const staffRoles = new Set([
      'centre_director', 'admissions_admin', 'lecturer', 'programme_leader',
      'iqa_officer', 'exams_officer', 'finance_officer', 'marketing_officer',
    ]);

    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach(r => {
      if (staffRoles.has(r.role)) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }
    });

    const moduleCountMap: Record<string, number> = {};
    (modules || []).forEach(m => {
      if (m.lecturer_id) {
        moduleCountMap[m.lecturer_id] = (moduleCountMap[m.lecturer_id] || 0) + 1;
      }
    });

    const members: StaffMember[] = (profiles || [])
      .filter(p => roleMap[p.user_id])
      .map(p => ({
        id: p.user_id,
        name: p.full_name,
        email: p.email,
        role: ROLE_DISPLAY[roleMap[p.user_id][0]] || roleMap[p.user_id][0],
        avatarUrl: p.avatar_url,
        createdAt: p.created_at,
        moduleCount: moduleCountMap[p.user_id] || 0,
      }));

    setStaff(members);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filtered = useMemo(() =>
    staff.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    ), [staff, search]);

  const lecturerCount = staff.filter(s => s.role === 'Lecturer').length;

  if (loading) return <DashboardSkeleton />;

  const columns = [
    { key: 'name', label: 'Name', render: (s: StaffMember) => (
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
    { key: 'role', label: 'Role', render: (s: StaffMember) => <span className="text-xs font-medium">{s.role}</span> },
    { key: 'modules', label: 'Modules', render: (s: StaffMember) => <span className="text-sm font-medium">{s.moduleCount || '-'}</span> },
    { key: 'joined', label: 'Joined', render: (s: StaffMember) => <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</span> },
    { key: 'status', label: 'Status', render: () => <StatusBadge status="Active" variant="success" /> },
  ];

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle={`${staff.length} staff members`}
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" />Add Staff</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Staff" value={staff.length} icon={Users} />
        <StatCard label="Lecturers" value={lecturerCount} icon={Award} />
        <StatCard label="Active" value={staff.length} changeType="positive" change="Working" icon={Shield} />
        <StatCard label="Roles Covered" value={new Set(staff.map(s => s.role)).size} icon={Users} />
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, role, or email..."
            className="w-full bg-secondary text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {staff.length === 0 ? (
        <div className="surface-card p-12 text-center text-muted-foreground text-sm">
          No staff members found. Staff are created when users register and are assigned non-student roles.
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </DashboardLayout>
  );
}
