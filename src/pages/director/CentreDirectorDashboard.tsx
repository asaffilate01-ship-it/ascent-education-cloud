import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, Users, CreditCard, Shield, BookOpen, FileCheck, Handshake, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AddStudentModal from '@/components/modals/AddStudentModal';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

export default function CentreDirectorDashboard() {
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const { toast } = useToast();

  const { data: programmes, loading: progLoading } = useSupabaseQuery('programmes');
  const { data: applications, loading: appLoading } = useSupabaseQuery('applications');
  const { data: invoices, loading: invLoading } = useSupabaseQuery('invoices');

  const loading = progLoading || appLoading || invLoading;
  if (loading) return <DashboardSkeleton />;

  const totalStudents = programmes.reduce((s, p) => s + (p.enrolled || 0), 0);
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const activeProgrammes = programmes.filter((p) => p.status === 'active');

  // Admissions funnel from real data
  const totalLeads = applications.length;
  const applied = applications.filter((a) => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offers = applications.filter((a) => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;
  const deposits = applications.filter((a) => a.stage === 'deposit_paid').length;
  const enrolled = applications.filter((a) => a.stage === 'enrolled').length;

  const funnelStages = [
    { stage: 'Leads', count: totalLeads, pct: 100 },
    { stage: 'Applications', count: applied, pct: totalLeads ? Math.round((applied / totalLeads) * 100) : 0 },
    { stage: 'Offers', count: offers, pct: totalLeads ? Math.round((offers / totalLeads) * 100) : 0 },
    { stage: 'Deposits', count: deposits, pct: totalLeads ? Math.round((deposits / totalLeads) * 100) : 0 },
    { stage: 'Enrolled', count: enrolled, pct: totalLeads ? Math.round((enrolled / totalLeads) * 100) : 0 },
  ];

  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const outstanding = totalBilled - totalCollected;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const commissions = invoices.filter((i) => i.type === 'commission').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <DashboardLayout
      title="Centre Director"
      subtitle="Full operations view"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => toast({ title: 'Report Generated', description: 'Monthly report has been downloaded.' })}>Generate Report</Button>
          <Button size="sm" onClick={() => setAddStudentOpen(true)}>+ Add Student</Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={String(totalStudents)} icon={GraduationCap} />
        <StatCard label="Active Programmes" value={String(activeProgrammes.length)} icon={BookOpen} />
        <StatCard label="Revenue Collected" value={`£${totalCollected.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Invoices" value={String(invoices.length)} icon={FileCheck} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Active Programmes
          </h3>
          <div className="space-y-2">
            {activeProgrammes.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.awarding_body} · {p.enrolled || 0} students</p>
                </div>
                <StatusBadge status="Active" variant="success" />
              </div>
            ))}
            {activeProgrammes.length === 0 && <p className="text-sm text-muted-foreground">No active programmes</p>}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Admissions Funnel
          </h3>
          <div className="space-y-2">
            {funnelStages.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.stage}</span>
                  <span className="font-medium">{s.count} ({s.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full">
                  <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Financial Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Billed', value: `£${totalBilled.toLocaleString()}` },
              { label: 'Collected', value: `£${totalCollected.toLocaleString()}` },
              { label: 'Outstanding', value: `£${outstanding.toLocaleString()}`, sub: `${overdueCount} overdue` },
              { label: 'Commissions', value: `£${commissions.toLocaleString()}` },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm">{f.label}</p>
                  {f.sub && <p className="text-xs text-muted-foreground">{f.sub}</p>}
                </div>
                <span className="text-sm font-semibold">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddStudentModal open={addStudentOpen} onOpenChange={setAddStudentOpen} />
    </DashboardLayout>
  );
}
