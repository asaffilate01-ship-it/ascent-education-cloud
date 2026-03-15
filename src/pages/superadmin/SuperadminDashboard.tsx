import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Building2, Users, CreditCard, GraduationCap, Shield, TrendingUp } from 'lucide-react';
import { Tenant } from '@/types/platform';
import { Button } from '@/components/ui/button';

const MOCK_TENANTS: Tenant[] = [
  { id: '1', name: 'Lahore College of Business', slug: 'lcb', status: 'active', plan: 'professional', studentsCount: 342, monthlyRevenue: 4200, createdAt: '2025-01-15', theme: {} as any },
  { id: '2', name: 'Karachi Institute of Tech', slug: 'kit', status: 'active', plan: 'enterprise', studentsCount: 890, monthlyRevenue: 8900, createdAt: '2024-11-01', theme: {} as any },
  { id: '3', name: 'Islamabad Academy', slug: 'ia', status: 'onboarding', plan: 'starter', studentsCount: 0, monthlyRevenue: 0, createdAt: '2025-03-10', theme: {} as any },
  { id: '4', name: 'Peshawar Training Centre', slug: 'ptc', status: 'active', plan: 'professional', studentsCount: 156, monthlyRevenue: 2100, createdAt: '2025-02-01', theme: {} as any },
  { id: '5', name: 'Faisalabad Learning Hub', slug: 'flh', status: 'suspended', plan: 'starter', studentsCount: 45, monthlyRevenue: 0, createdAt: '2024-09-20', theme: {} as any },
];

const statusVariant = (s: string) => {
  if (s === 'active') return 'success';
  if (s === 'onboarding') return 'info';
  return 'danger';
};

const columns = [
  { key: 'name', label: 'Tenant' },
  { key: 'plan', label: 'Plan', render: (t: Tenant) => <span className="capitalize text-sm">{t.plan}</span> },
  { key: 'status', label: 'Status', render: (t: Tenant) => <StatusBadge status={t.status} variant={statusVariant(t.status)} /> },
  { key: 'studentsCount', label: 'Students', render: (t: Tenant) => <span className="font-medium">{t.studentsCount.toLocaleString()}</span> },
  { key: 'monthlyRevenue', label: 'MRR', render: (t: Tenant) => <span className="font-medium">£{t.monthlyRevenue.toLocaleString()}</span> },
  { key: 'createdAt', label: 'Joined', render: (t: Tenant) => new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
];

export default function SuperadminDashboard() {
  return (
    <DashboardLayout
      title="Platform Overview"
      subtitle="EduPathway SaaS — All tenants and metrics"
      actions={<Button size="sm">+ Onboard Tenant</Button>}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tenants" value="5" change="+2 this month" changeType="positive" icon={Building2} />
        <StatCard label="Total Students" value="1,433" change="+18%" changeType="positive" icon={GraduationCap} />
        <StatCard label="Monthly Revenue" value="£15,200" change="+12%" changeType="positive" icon={CreditCard} />
        <StatCard label="Compliance Score" value="94%" change="2 issues" changeType="negative" icon={Shield} />
      </div>

      {/* Tenant Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Tenants</h2>
        <p className="text-xs text-muted-foreground">{MOCK_TENANTS.length} total</p>
      </div>
      <DataTable columns={columns} data={MOCK_TENANTS} />

      {/* Compliance Sidebar hint */}
      <div className="mt-6 surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Accreditation Compliance
        </h3>
        <div className="space-y-2">
          {[
            { label: 'OTHM Centre Approval', status: 'Valid', variant: 'success' as const },
            { label: 'QUALIFI Registration', status: 'Renewal Due', variant: 'warning' as const },
            { label: 'IAB Membership', status: 'Active', variant: 'success' as const },
            { label: 'IQA Reports (Q1)', status: 'Overdue', variant: 'danger' as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-foreground">{item.label}</span>
              <StatusBadge status={item.status} variant={item.variant} />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
