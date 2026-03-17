import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, BookOpen, CreditCard, Video, FileCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { useMemo } from 'react';

export default function TenantAdminDashboard() {
  const { data: programmes, loading: pLoading } = useSupabaseQuery('programmes');
  const { data: invoices, loading: iLoading } = useSupabaseQuery('invoices');
  const { data: applications, loading: aLoading } = useSupabaseQuery('applications');
  const { data: modules } = useSupabaseQuery('modules');
  const { data: submissions } = useSupabaseQuery('submissions');
  const { data: compliance } = useSupabaseQuery('compliance_checklists' as any);

  const loading = pLoading || iLoading || aLoading;

  const stats = useMemo(() => {
    const enrolled = (applications || []).filter(a => a.stage === 'enrolled').length;
    const activeProgrammes = (programmes || []).filter(p => p.status === 'active').length;
    const revenue = (invoices || []).reduce((s, i) => s + Number(i.paid), 0);
    return { enrolled, activeProgrammes, revenue };
  }, [applications, programmes, invoices]);

  const overdueInvoices = useMemo(() =>
    (invoices || []).filter(i => i.status === 'overdue' || i.status === 'partial').slice(0, 4),
  [invoices]);

  const complianceItems = (compliance || []) as any[];
  const complianceDone = complianceItems.filter((c: any) => c.is_completed).length;
  const complianceTotal = complianceItems.length;

  // Group compliance by category
  const complianceByCategory = useMemo(() => {
    const cats: Record<string, { done: number; total: number }> = {};
    complianceItems.forEach((c: any) => {
      if (!cats[c.category]) cats[c.category] = { done: 0, total: 0 };
      cats[c.category].total++;
      if (c.is_completed) cats[c.category].done++;
    });
    return Object.entries(cats).slice(0, 3);
  }, [complianceItems]);

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="College Dashboard"
      subtitle="Academic Overview — Live Data"
      actions={<Button size="sm">+ Add Student</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students Enrolled" value={stats.enrolled} icon={GraduationCap} />
        <StatCard label="Active Programmes" value={stats.activeProgrammes} icon={BookOpen} />
        <StatCard label="Revenue Collected" value={`Rs.${stats.revenue.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Modules" value={(modules || []).length} icon={Video} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Payment Alerts */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Payment Alerts</h3>
          <div className="space-y-2">
            {overdueInvoices.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No overdue invoices 🎉</p>
            ) : (
              overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.student_name}</p>
                    <p className="text-xs text-muted-foreground">
                      £{Number(inv.amount).toLocaleString()} · Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <StatusBadge
                    status={inv.status}
                    variant={inv.status === 'overdue' ? 'danger' : 'warning'}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Recent Applications</h3>
          <div className="space-y-2">
            {(applications || []).slice(0, 4).map((app) => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{app.student_name}</p>
                  <p className="text-xs text-muted-foreground">{app.programme_name || 'General'}</p>
                </div>
                <StatusBadge
                  status={app.stage.replace(/_/g, ' ')}
                  variant={app.stage === 'enrolled' ? 'success' : app.stage === 'lost' ? 'danger' : 'info'}
                />
              </div>
            ))}
            {(applications || []).length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No applications yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quality Assurance from live compliance data */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" /> Quality Assurance Status
          {complianceTotal > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">{complianceDone}/{complianceTotal} completed</span>
          )}
        </h3>
        {complianceByCategory.length > 0 ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {complianceByCategory.map(([cat, { done, total }]) => (
              <div key={cat} className="surface-data p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{cat}</p>
                <p className="text-lg font-semibold">{done}/{total}</p>
                <div className="w-full h-1.5 bg-border rounded-full mt-2">
                  <div
                    className="h-full bg-primary rounded-full transition-default"
                    style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No compliance checklists seeded yet. Go to Compliance to set up OTHM/QUALIFI/IAB items.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
