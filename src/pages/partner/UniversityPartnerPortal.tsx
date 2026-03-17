import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { GraduationCap, Users, CreditCard, FileText, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

const stageToStatus = (stage: string) => {
  if (stage === 'enrolled') return { label: 'Enrolled', variant: 'success' as const };
  if (['conditional_offer', 'unconditional_offer'].includes(stage)) return { label: 'Offer', variant: 'info' as const };
  if (stage === 'deposit_paid') return { label: 'Deposit Paid', variant: 'success' as const };
  if (['under_review', 'applied'].includes(stage)) return { label: 'In Review', variant: 'warning' as const };
  if (stage === 'lost') return { label: 'Lost', variant: 'danger' as const };
  return { label: stage.replace(/_/g, ' '), variant: 'neutral' as const };
};

export default function UniversityPartnerPortal() {
  const { data: applications, loading: aLoading } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });
  const { data: invoices, loading: iLoading } = useSupabaseQuery('invoices');
  const { data: programmes } = useSupabaseQuery('programmes');

  const loading = aLoading || iLoading;
  if (loading) return <DashboardSkeleton />;

  // Filter to progression-stage applications
  const referred = applications.filter(a =>
    ['under_review', 'conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled'].includes(a.stage)
  );
  const enrolled = referred.filter(a => a.stage === 'enrolled').length;
  const offersOut = referred.filter(a => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;

  const commissions = invoices.filter(i => i.type === 'commission');
  const commissionDue = commissions.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.amount), 0);

  const columns = [
    { key: 'student_name', label: 'Student', render: (s: any) => (
      <div>
        <p className="text-sm font-medium">{s.student_name}</p>
        <p className="text-[10px] text-muted-foreground">{s.email}</p>
      </div>
    )},
    { key: 'programme_name', label: 'Programme', render: (s: any) => <span className="text-xs">{s.programme_name || 'N/A'}</span> },
    { key: 'level', label: 'Level', render: (s: any) => <span className="text-xs">{s.level || 'N/A'}</span> },
    { key: 'stage', label: 'Status', render: (s: any) => {
      const cfg = stageToStatus(s.stage);
      return <StatusBadge status={cfg.label} variant={cfg.variant} />;
    }},
    { key: 'actions', label: '', render: (s: any) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="h-7 text-xs">Review</Button>
        {['under_review', 'applied'].includes(s.stage) && (
          <Button size="sm" className="h-7 text-xs">Issue Offer</Button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout
      title="University Partner Portal"
      subtitle="Review referred students and manage commissions"
      actions={<Button size="sm"><FileText className="w-3.5 h-3.5 mr-1.5" />Export Report</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Referred Students" value={referred.length} change="This cycle" icon={Users} />
        <StatCard label="Offers Issued" value={offersOut} changeType="positive" change="Active" icon={Award} />
        <StatCard label="Enrolled" value={enrolled} changeType="positive" change="Confirmed" icon={GraduationCap} />
        <StatCard label="Commission Due" value={`Rs.${commissionDue.toLocaleString()}`} change="Pending" changeType="positive" icon={CreditCard} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Referred Students ({referred.length})</h2>
      </div>
      <DataTable columns={columns} data={referred} />

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Commission History
          </h3>
          <div className="space-y-2">
            {commissions.length > 0 ? commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 surface-data rounded-lg">
                <div>
                  <p className="text-sm font-medium">{c.student_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.issued_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">£{Number(c.amount).toLocaleString()}</p>
                  <StatusBadge status={c.status === 'paid' ? 'Paid' : 'Pending'} variant={c.status === 'paid' ? 'success' : 'warning'} />
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">No commission records</p>
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Available Programmes
          </h3>
          <div className="space-y-2">
            {programmes.filter(p => p.status === 'active').map((p) => (
              <div key={p.id} className="p-3 surface-data rounded-lg">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.level} · {p.awarding_body} · {p.duration || 'N/A'}
                </p>
              </div>
            ))}
            {programmes.filter(p => p.status === 'active').length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No active programmes</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
