import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, Building2, Users, CreditCard, Shield, BookOpen, FileCheck, Handshake, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CentreDirectorDashboard() {
  return (
    <DashboardLayout
      title="Centre Director"
      subtitle="Lahore College of Business — Full operations view"
      actions={<Button size="sm">Generate Report</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value="342" change="+14 this term" changeType="positive" icon={GraduationCap} />
        <StatCard label="Staff Members" value="18" icon={Users} />
        <StatCard label="Revenue (MTD)" value="£42,300" change="+8%" changeType="positive" icon={CreditCard} />
        <StatCard label="Compliance Score" value="87%" change="Target: 95%" changeType="negative" icon={Shield} />
      </div>

      {/* Operations Overview */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Active Programmes
          </h3>
          <div className="space-y-2">
            {[
              { name: 'Level 4 Business Management', body: 'OTHM', students: 86, status: 'Active' },
              { name: 'Level 5 Business Management', body: 'OTHM', students: 52, status: 'Active' },
              { name: 'Level 4 Computing', body: 'QUALIFI', students: 68, status: 'Active' },
              { name: 'Level 5 Computing', body: 'QUALIFI', students: 44, status: 'Active' },
              { name: 'Level 3 Accounting', body: 'IAB', students: 92, status: 'Active' },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.body} · {p.students} students</p>
                </div>
                <StatusBadge status={p.status} variant="success" />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" /> QA Health
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Internal Verification', done: 48, total: 52 },
              { label: 'Assessment Moderation', done: 36, total: 40 },
              { label: 'External Audit Prep', done: 8, total: 12 },
              { label: 'Tutor CV Compliance', done: 16, total: 18 },
              { label: 'IQA Quarterly Reports', done: 2, total: 4 },
            ].map((qa) => (
              <div key={qa.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{qa.label}</span>
                  <span className="font-medium">{qa.done}/{qa.total}</span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full">
                  <div
                    className={`h-full rounded-full transition-default ${
                      qa.done / qa.total >= 0.9 ? 'bg-success' : qa.done / qa.total >= 0.7 ? 'bg-primary' : 'bg-destructive'
                    }`}
                    style={{ width: `${(qa.done / qa.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" /> Agent Performance
          </h3>
          <div className="space-y-2">
            {[
              { agent: 'Bilal Recruitment', enrolled: 12, pipeline: 18, commission: '£3,200' },
              { agent: 'Pakistan Edu Agency', enrolled: 8, pipeline: 14, commission: '£2,100' },
              { agent: 'Global Pathways', enrolled: 6, pipeline: 10, commission: '£1,500' },
              { agent: 'Study Abroad PK', enrolled: 4, pipeline: 8, commission: '£1,000' },
            ].map((a) => (
              <div key={a.agent} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.agent}</p>
                  <p className="text-xs text-muted-foreground">{a.enrolled} enrolled · {a.pipeline} in pipeline</p>
                </div>
                <span className="text-sm font-medium text-primary">{a.commission}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admissions Funnel + Finance Summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Admissions Funnel (This Intake)
          </h3>
          <div className="space-y-2">
            {[
              { stage: 'Leads', count: 143, pct: 100 },
              { stage: 'Applications', count: 62, pct: 43 },
              { stage: 'Offers', count: 48, pct: 34 },
              { stage: 'Deposits', count: 45, pct: 31 },
              { stage: 'Enrolled', count: 42, pct: 29 },
            ].map((s) => (
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
              { label: 'Tuition Billed', value: '£410,400', sub: 'This academic year' },
              { label: 'Collected', value: '£342,000', sub: '83% collection rate' },
              { label: 'Outstanding', value: '£68,400', sub: '12 students overdue' },
              { label: 'Agent Commissions', value: '£7,800', sub: '4 payouts pending' },
              { label: 'Uni Commissions Expected', value: '£72,000', sub: '24 offers received' },
            ].map((f) => (
              <div key={f.label} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.sub}</p>
                </div>
                <span className="text-sm font-semibold">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
