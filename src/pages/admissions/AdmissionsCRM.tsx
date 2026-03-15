import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { UserPlus, Users, FileText, Award, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Application } from '@/types/platform';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', count: 28 },
  { key: 'contacted', label: 'Contacted', count: 19 },
  { key: 'qualified', label: 'Qualified', count: 14 },
  { key: 'applied', label: 'Applied', count: 11 },
  { key: 'under_review', label: 'Under Review', count: 8 },
  { key: 'conditional_offer', label: 'Conditional', count: 5 },
  { key: 'unconditional_offer', label: 'Unconditional', count: 3 },
  { key: 'deposit_paid', label: 'Deposit Paid', count: 6 },
  { key: 'enrolled', label: 'Enrolled', count: 42 },
  { key: 'lost', label: 'Lost', count: 7 },
];

const MOCK_APPLICATIONS: Application[] = [
  { id: '1', studentName: 'Hamza Qadir', email: 'hamza@gmail.com', phone: '+92300111222', programme: 'Level 4 Business Management', level: '4', stage: 'under_review', documents: [{ name: 'CNIC', status: 'verified' }, { name: 'Matric Certificate', status: 'verified' }, { name: 'Inter Certificate', status: 'pending' }], counsellor: 'Ayesha Tariq', source: 'Facebook Ad', createdAt: '2025-03-10', lastActivity: '2025-03-14' },
  { id: '2', studentName: 'Maryam Khalid', email: 'maryam@gmail.com', phone: '+92301222333', programme: 'Level 5 Computing', level: '5', stage: 'conditional_offer', documents: [{ name: 'CNIC', status: 'verified' }, { name: 'Level 4 Diploma', status: 'verified' }, { name: 'Passport', status: 'uploaded' }], counsellor: 'Ayesha Tariq', source: 'Agent Referral', createdAt: '2025-03-08', lastActivity: '2025-03-13' },
  { id: '3', studentName: 'Ali Raza', email: 'ali@yahoo.com', phone: '+92312333444', programme: 'Level 3 Accounting (IAB)', level: '3', stage: 'applied', documents: [{ name: 'CNIC', status: 'verified' }, { name: 'Matric Certificate', status: 'uploaded' }], counsellor: 'Bilal Ahmed', source: 'Walk-in', createdAt: '2025-03-12', lastActivity: '2025-03-14' },
  { id: '4', studentName: 'Nadia Shah', email: 'nadia@gmail.com', phone: '+92333444555', programme: 'Level 4 IT (QUALIFI)', level: '4', stage: 'deposit_paid', documents: [{ name: 'CNIC', status: 'verified' }, { name: 'FSc Certificate', status: 'verified' }, { name: 'Passport', status: 'verified' }, { name: 'English Proof', status: 'verified' }], counsellor: 'Ayesha Tariq', source: 'Webinar', createdAt: '2025-02-28', lastActivity: '2025-03-11' },
  { id: '5', studentName: 'Omar Farooq', email: 'omar@hotmail.com', phone: '+92345555666', programme: 'Level 5 Business Management', level: '5', stage: 'enrolled', documents: [{ name: 'CNIC', status: 'verified' }, { name: 'Level 4 Diploma', status: 'verified' }, { name: 'Passport', status: 'verified' }], counsellor: 'Bilal Ahmed', source: 'Agent Referral', createdAt: '2025-02-15', lastActivity: '2025-03-10' },
];

const stageVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (['enrolled', 'deposit_paid'].includes(s)) return 'success';
  if (['conditional_offer', 'unconditional_offer'].includes(s)) return 'info';
  if (['under_review', 'applied'].includes(s)) return 'warning';
  if (['lost', 'deferred'].includes(s)) return 'danger';
  return 'neutral';
};

const docStatusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'verified') return 'success';
  if (s === 'uploaded') return 'info';
  if (s === 'rejected') return 'danger';
  return 'warning';
};

export default function AdmissionsCRM() {
  return (
    <DashboardLayout
      title="Admissions Pipeline"
      subtitle="Lead-to-Enrolment CRM — All application stages"
      actions={<Button size="sm"><UserPlus className="w-3.5 h-3.5 mr-1.5" /> New Lead</Button>}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value="143" change="+23 this week" changeType="positive" icon={UserPlus} />
        <StatCard label="Applications" value="62" change="43% conversion" changeType="positive" icon={FileText} />
        <StatCard label="Offers Issued" value="8" icon={Award} />
        <StatCard label="Enrolled (MTD)" value="42" change="+12 vs last month" changeType="positive" icon={TrendingUp} />
      </div>

      {/* Pipeline Funnel */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Admissions Funnel</h3>
        <div className="flex gap-1 items-end h-24">
          {PIPELINE_STAGES.map((stage, i) => {
            const maxCount = Math.max(...PIPELINE_STAGES.map(s => s.count));
            const height = (stage.count / maxCount) * 100;
            const isLost = stage.key === 'lost';
            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-foreground">{stage.count}</span>
                <div
                  className={`w-full rounded-t-sm transition-default cursor-pointer hover:opacity-80 ${
                    isLost ? 'bg-destructive/60' : 'bg-primary'
                  }`}
                  style={{ height: `${height}%`, opacity: isLost ? 0.6 : 1 - (i * 0.06) }}
                />
                <span className="text-[9px] text-muted-foreground text-center leading-tight mt-1">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Applications Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Applications</h2>
        <Button variant="outline" size="sm" className="text-xs">View All</Button>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3">Programme</th>
                <th className="text-label text-left px-4 py-3">Stage</th>
                <th className="text-label text-left px-4 py-3">Documents</th>
                <th className="text-label text-left px-4 py-3">Counsellor</th>
                <th className="text-label text-left px-4 py-3">Source</th>
                <th className="text-label text-left px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_APPLICATIONS.map((app) => (
                <tr key={app.id} className="border-t border-border/50 hover:bg-secondary/50 cursor-pointer transition-default">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{app.studentName}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{app.programme}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.stage.replace(/_/g, ' ')} variant={stageVariant(app.stage)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {app.documents.map((doc) => (
                        <StatusBadge key={doc.name} status={doc.name} variant={docStatusVariant(doc.status)} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{app.counsellor}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{app.source}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{app.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Eligibility Rules */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Eligibility Rules Engine</h3>
          <div className="space-y-2">
            {[
              { programme: 'Level 3', rule: 'Matric / O-Levels required', auto: true },
              { programme: 'Level 4', rule: 'Inter / FSc / A-Levels required', auto: true },
              { programme: 'Level 5', rule: 'Level 4 Diploma required', auto: true },
              { programme: 'Progression', rule: 'English proof + Level 5 completion', auto: false },
            ].map((r) => (
              <div key={r.programme} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.programme}</p>
                  <p className="text-xs text-muted-foreground">{r.rule}</p>
                </div>
                <StatusBadge status={r.auto ? 'Auto' : 'Manual'} variant={r.auto ? 'success' : 'warning'} />
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Counsellor Activity</h3>
          <div className="space-y-2">
            {[
              { name: 'Ayesha Tariq', leads: 48, converted: 22, rate: '46%' },
              { name: 'Bilal Ahmed', leads: 35, converted: 14, rate: '40%' },
              { name: 'Sana Mir', leads: 28, converted: 8, rate: '29%' },
            ].map((c) => (
              <div key={c.name} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.leads} leads · {c.converted} converted</p>
                </div>
                <span className="text-sm font-semibold text-primary">{c.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
