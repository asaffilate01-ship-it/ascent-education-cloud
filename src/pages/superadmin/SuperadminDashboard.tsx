import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Building2, Users, CreditCard, GraduationCap, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const;
  if (s === 'onboarding') return 'info' as const;
  return 'danger' as const;
};

export default function SuperadminDashboard() {
  const navigate = useNavigate();
  const { data: tenants, loading: tenantsLoading } = useSupabaseQuery('tenants', {
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: profiles, loading: profilesLoading } = useSupabaseQuery('profiles');

  const loading = tenantsLoading || profilesLoading;

  const stats = useMemo(() => {
    const t = tenants || [];
    const totalStudents = t.reduce((sum, tenant) => sum + (tenant.students_count || 0), 0);
    const totalMRR = t.reduce((sum, tenant) => sum + (Number(tenant.monthly_revenue) || 0), 0);
    const activeTenants = t.filter(tenant => tenant.status === 'active').length;
    return {
      totalTenants: t.length,
      activeTenants,
      totalStudents,
      totalMRR,
      totalUsers: (profiles || []).length,
    };
  }, [tenants, profiles]);

  const columns = [
    { key: 'name' as const, label: 'Tenant' },
    { key: 'plan' as const, label: 'Plan', render: (t: any) => <span className="capitalize text-sm">{t.plan}</span> },
    { key: 'status' as const, label: 'Status', render: (t: any) => <StatusBadge status={t.status} variant={statusVariant(t.status)} /> },
    { key: 'students_count' as const, label: 'Students', render: (t: any) => <span className="font-medium">{(t.students_count || 0).toLocaleString()}</span> },
    { key: 'monthly_revenue' as const, label: 'MRR', render: (t: any) => <span className="font-medium">Rs.{(Number(t.monthly_revenue) || 0).toLocaleString()}</span> },
    { key: 'created_at' as const, label: 'Joined', render: (t: any) => new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  ];

  return (
    <DashboardLayout
      title="Platform Overview"
      subtitle="EduCloud SaaS — All tenants and metrics"
      actions={<Button size="sm" onClick={() => navigate('/landlord/onboarding')}>+ Onboard Tenant</Button>}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tenants" value={loading ? '...' : String(stats.totalTenants)} change={`${stats.activeTenants} active`} changeType="positive" icon={Building2} />
        <StatCard label="Total Students" value={loading ? '...' : stats.totalStudents.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Monthly Revenue" value={loading ? '...' : `£${stats.totalMRR.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Platform Users" value={loading ? '...' : String(stats.totalUsers)} icon={Users} />
      </div>

      {/* Tenant Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Tenants</h2>
        <p className="text-xs text-muted-foreground">{(tenants || []).length} total</p>
      </div>
      {tenantsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <DataTable columns={columns} data={tenants || []} />
      )}

      {/* Compliance */}
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
