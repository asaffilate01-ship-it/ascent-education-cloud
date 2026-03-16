import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserPlus, CreditCard, Users, TrendingUp, Phone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import AddLeadModal from '@/components/modals/AddLeadModal';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'New Leads', color: 'bg-muted' },
  { key: 'contacted', label: 'Contacted', color: 'bg-primary/20' },
  { key: 'qualified', label: 'Qualified', color: 'bg-warning/20' },
  { key: 'applied', label: 'Applied', color: 'bg-primary/40' },
  { key: 'enrolled', label: 'Enrolled', color: 'bg-success/20' },
] as const;

export default function AgentDashboard() {
  const { user } = useAuth();
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: applications, loading, refetch } = useSupabaseQuery('applications', {
    orderBy: { column: 'updated_at', ascending: false },
  });
  const { data: invoices } = useSupabaseQuery('invoices');

  if (loading) return <DashboardSkeleton />;

  const myApps = user?.id
    ? applications.filter(a => a.agent_id === user.id || a.source === 'agent')
    : applications;

  const filtered = search
    ? myApps.filter(a =>
        a.student_name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase()) ||
        (a.programme_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : myApps;

  const enrolledCount = myApps.filter(a => a.stage === 'enrolled').length;
  const commissionInvoices = invoices.filter(i => i.type === 'commission');
  const totalEarned = commissionInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.paid), 0);
  const pipelineValue = commissionInvoices.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <DashboardLayout
      title="Agent Pipeline"
      subtitle="Your recruitment dashboard"
      actions={
        <Button size="sm" onClick={() => setAddLeadOpen(true)}>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Lead
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pipeline Value" value={`£${pipelineValue.toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Active Leads" value={myApps.filter(a => a.stage !== 'enrolled' && a.stage !== 'lost').length} icon={Users} />
        <StatCard label="Enrolled" value={enrolledCount} change="confirmed" changeType="positive" icon={UserPlus} />
        <StatCard label="Earned Commission" value={`£${totalEarned.toLocaleString()}`} change="Paid" changeType="positive" icon={CreditCard} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-3">Sales Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const leads = filtered.filter(a => a.stage === stage.key);
            return (
              <div key={stage.key} className="surface-data rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stage.label}</p>
                  <span className="text-xs font-bold text-foreground bg-background rounded-full w-5 h-5 flex items-center justify-center shadow-surface-sm">{leads.length}</span>
                </div>
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div key={lead.id} className="surface-card p-3 cursor-pointer hover:shadow-lg transition-default">
                      <p className="text-sm font-medium">{lead.student_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.programme_name || 'No programme'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{lead.phone || lead.email}</span>
                      </div>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments to Chase */}
      <div className="surface-card p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3">Outstanding Commission Payments</h3>
        <div className="space-y-2">
          {commissionInvoices.filter(i => i.status !== 'paid').map((inv) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{inv.student_name}</p>
                <p className="text-xs text-muted-foreground">£{Number(inv.amount).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={inv.status} variant={inv.status === 'overdue' ? 'danger' : 'warning'} />
                <Button variant="outline" size="sm" className="text-xs">
                  <Phone className="w-3 h-3 mr-1" /> Chase
                </Button>
              </div>
            </div>
          ))}
          {commissionInvoices.filter(i => i.status !== 'paid').length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No outstanding commissions</p>
          )}
        </div>
      </div>

      <AddLeadModal open={addLeadOpen} onOpenChange={setAddLeadOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
