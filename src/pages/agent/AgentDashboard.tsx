import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { UserPlus, CreditCard, Users, TrendingUp, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentLead } from '@/types/platform';

const PIPELINE_STAGES = [
  { key: 'new', label: 'New Leads', color: 'bg-muted' },
  { key: 'contacted', label: 'Contacted', color: 'bg-primary/20' },
  { key: 'interested', label: 'Interested', color: 'bg-warning/20' },
  { key: 'applied', label: 'Applied', color: 'bg-primary/40' },
  { key: 'enrolled', label: 'Enrolled', color: 'bg-success/20' },
] as const;

const MOCK_LEADS: AgentLead[] = [
  { id: '1', name: 'Ahmed Raza', email: 'ahmed@gmail.com', phone: '+92300123456', whatsapp: '+92300123456', course: 'Level 4 Business', stage: 'new', assignedAgent: '5', lastContact: '2025-03-14', notes: 'Interested via Facebook ad', paymentStatus: 'pending', commissionAmount: 150, createdAt: '2025-03-14' },
  { id: '2', name: 'Fatima Noor', email: 'fatima@gmail.com', phone: '+92301234567', whatsapp: '+92301234567', course: 'Level 5 Computing', stage: 'contacted', assignedAgent: '5', lastContact: '2025-03-13', notes: 'Sent brochure', paymentStatus: 'pending', commissionAmount: 200, createdAt: '2025-03-10' },
  { id: '3', name: 'Hassan Ali', email: 'hassan@yahoo.com', phone: '+92312345678', whatsapp: '+92312345678', course: 'Level 3 Accounting', stage: 'interested', assignedAgent: '5', lastContact: '2025-03-12', notes: 'Wants installment plan', paymentStatus: 'pending', commissionAmount: 120, createdAt: '2025-03-05' },
  { id: '4', name: 'Ayesha Khan', email: 'ayesha@hotmail.com', phone: '+92321234567', whatsapp: '+92321234567', course: 'Level 4 IT', stage: 'applied', assignedAgent: '5', lastContact: '2025-03-11', notes: 'Documents submitted', paymentStatus: 'partial', commissionAmount: 180, createdAt: '2025-02-28' },
  { id: '5', name: 'Usman Tariq', email: 'usman@gmail.com', phone: '+92333456789', whatsapp: '+92333456789', course: 'Level 5 Business', stage: 'enrolled', assignedAgent: '5', lastContact: '2025-03-10', notes: 'Fully enrolled', paymentStatus: 'paid', commissionAmount: 250, createdAt: '2025-02-15' },
  { id: '6', name: 'Zainab Malik', email: 'zainab@gmail.com', phone: '+92345678901', whatsapp: '+92345678901', course: 'Level 4 Business', stage: 'new', assignedAgent: '5', lastContact: '2025-03-14', notes: 'Walk-in inquiry', paymentStatus: 'pending', commissionAmount: 150, createdAt: '2025-03-14' },
  { id: '7', name: 'Bilal Hussain', email: 'bilal@yahoo.com', phone: '+92301112233', whatsapp: '+92301112233', course: 'Level 3 IT', stage: 'contacted', assignedAgent: '5', lastContact: '2025-03-13', notes: 'Called, interested in scholarship', paymentStatus: 'pending', commissionAmount: 100, createdAt: '2025-03-12' },
];

const stageVariant = (s: string) => {
  const map: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
    new: 'neutral', contacted: 'info', interested: 'warning', applied: 'info', enrolled: 'success', lost: 'danger'
  };
  return map[s] || 'neutral';
};

export default function AgentDashboard() {
  const pipelineCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: MOCK_LEADS.filter(l => l.stage === stage.key).length,
  }));

  const totalCommission = MOCK_LEADS.filter(l => l.stage === 'enrolled').reduce((s, l) => s + l.commissionAmount, 0);
  const pipelineValue = MOCK_LEADS.reduce((s, l) => s + l.commissionAmount, 0);

  return (
    <DashboardLayout
      title="Agent Pipeline"
      subtitle="Your recruitment dashboard"
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Lead</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pipeline Value" value={`£${pipelineValue}`} icon={TrendingUp} />
        <StatCard label="Active Leads" value={MOCK_LEADS.filter(l => l.stage !== 'enrolled').length} icon={Users} />
        <StatCard label="Enrolled" value={MOCK_LEADS.filter(l => l.stage === 'enrolled').length} change="this month" changeType="positive" icon={UserPlus} />
        <StatCard label="Earned Commission" value={`£${totalCommission}`} change="Pending payout" changeType="neutral" icon={CreditCard} />
      </div>

      {/* Pipeline Kanban */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-3">Sales Pipeline</h2>
        <div className="grid grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const leads = MOCK_LEADS.filter(l => l.stage === stage.key);
            return (
              <div key={stage.key} className="surface-data rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stage.label}</p>
                  <span className="text-xs font-bold text-foreground bg-background rounded-full w-5 h-5 flex items-center justify-center shadow-surface-sm">{leads.length}</span>
                </div>
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div key={lead.id} className="surface-card p-3 cursor-pointer hover:shadow-surface-lg transition-default">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.course}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{lead.phone}</span>
                        <span className="text-xs font-medium text-primary">£{lead.commissionAmount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="surface-card p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3">Overdue Payments to Chase</h3>
        <div className="space-y-2">
          {MOCK_LEADS.filter(l => l.paymentStatus === 'partial' || l.paymentStatus === 'pending').slice(0, 4).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.course} · £{lead.commissionAmount}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={lead.paymentStatus} variant={lead.paymentStatus === 'pending' ? 'warning' : 'info'} />
                <Button variant="outline" size="sm" className="text-xs">
                  <Phone className="w-3 h-3 mr-1" /> Chase
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
