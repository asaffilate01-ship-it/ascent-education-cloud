import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserPlus, FileText, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AddLeadModal from '@/components/modals/AddLeadModal';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import type { Tables } from '@/integrations/supabase/types';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'conditional_offer', label: 'Conditional' },
  { key: 'unconditional_offer', label: 'Unconditional' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'lost', label: 'Lost' },
];

const stageVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (['enrolled', 'deposit_paid'].includes(s)) return 'success';
  if (['conditional_offer', 'unconditional_offer'].includes(s)) return 'info';
  if (['under_review', 'applied'].includes(s)) return 'warning';
  if (['lost', 'deferred'].includes(s)) return 'danger';
  return 'neutral';
};

export default function AdmissionsCRM() {
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const { data: applications, loading, refetch } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });

  if (loading) return <DashboardSkeleton />;

  // Compute pipeline counts from real data
  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: applications.filter((a) => a.stage === stage.key).length,
  }));

  const totalLeads = applications.length;
  const applied = applications.filter((a) => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offers = applications.filter((a) => ['conditional_offer', 'unconditional_offer'].includes(a.stage)).length;
  const enrolled = applications.filter((a) => a.stage === 'enrolled').length;

  return (
    <DashboardLayout
      title="Admissions Pipeline"
      subtitle="Lead-to-Enrolment CRM — All application stages"
      actions={<Button size="sm" onClick={() => setAddLeadOpen(true)}><UserPlus className="w-3.5 h-3.5 mr-1.5" /> New Lead</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={String(totalLeads)} icon={UserPlus} />
        <StatCard label="Applications" value={String(applied)} change={totalLeads ? `${Math.round((applied / totalLeads) * 100)}% conversion` : '—'} changeType="positive" icon={FileText} />
        <StatCard label="Offers Issued" value={String(offers)} icon={Award} />
        <StatCard label="Enrolled" value={String(enrolled)} icon={TrendingUp} />
      </div>

      {/* Pipeline Funnel */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Admissions Funnel</h3>
        <div className="flex gap-1 items-end h-24">
          {stageCounts.map((stage, i) => {
            const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);
            const height = (stage.count / maxCount) * 100;
            const isLost = stage.key === 'lost';
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-foreground">{stage.count}</span>
                <div
                  className={`w-full rounded-t-sm transition-default cursor-pointer hover:opacity-80 ${isLost ? 'bg-destructive/60' : 'bg-primary'}`}
                  style={{ height: `${Math.max(height, 2)}%`, opacity: isLost ? 0.6 : 1 - i * 0.06 }}
                />
                <span className="text-[9px] text-muted-foreground text-center leading-tight mt-1 hidden sm:block">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applications Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Applications ({applications.length})</h2>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Programme</th>
                <th className="text-label text-left px-4 py-3">Stage</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Counsellor</th>
                <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Source</th>
                <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t border-border/50 hover:bg-secondary/50 cursor-pointer transition-default">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{app.student_name}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{app.programme_name || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.stage.replace(/_/g, ' ')} variant={stageVariant(app.stage)} />
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{app.counsellor || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{app.source || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(app.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {applications.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No applications yet</div>
        )}
      </div>

      <AddLeadModal open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
