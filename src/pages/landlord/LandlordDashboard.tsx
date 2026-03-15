import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Building2, Users, CreditCard, GraduationCap, Shield, TrendingUp, Globe, Zap, Server, Clock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Tenant } from '@/types/platform';
import { Button } from '@/components/ui/button';

const MOCK_TENANTS: Tenant[] = [
  { id: '1', name: 'EduPathway (Lahore)', slug: 'edupathway', status: 'active', plan: 'enterprise', studentsCount: 342, monthlyRevenue: 8500, createdAt: '2024-09-01', theme: {} as any },
  { id: '2', name: 'Karachi Institute of Tech', slug: 'kit', status: 'active', plan: 'professional', studentsCount: 890, monthlyRevenue: 4500, createdAt: '2024-11-01', theme: {} as any },
  { id: '3', name: 'Islamabad Academy', slug: 'ia', status: 'onboarding', plan: 'starter', studentsCount: 0, monthlyRevenue: 200, createdAt: '2025-03-10', theme: {} as any },
  { id: '4', name: 'Peshawar Training Centre', slug: 'ptc', status: 'active', plan: 'professional', studentsCount: 156, monthlyRevenue: 2100, createdAt: '2025-02-01', theme: {} as any },
  { id: '5', name: 'Faisalabad Learning Hub', slug: 'flh', status: 'suspended', plan: 'starter', studentsCount: 45, monthlyRevenue: 0, createdAt: '2024-09-20', theme: {} as any },
  { id: '6', name: 'Multan College', slug: 'mc', status: 'active', plan: 'professional', studentsCount: 210, monthlyRevenue: 3200, createdAt: '2025-01-15', theme: {} as any },
];

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const;
  if (s === 'onboarding') return 'info' as const;
  return 'danger' as const;
};

const columns = [
  { key: 'name', label: 'Centre', render: (t: Tenant) => (
    <div>
      <p className="text-sm font-medium">{t.name}</p>
      <p className="text-xs text-muted-foreground">{t.slug}.educloud.com</p>
    </div>
  )},
  { key: 'plan', label: 'Plan', render: (t: Tenant) => (
    <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
      t.plan === 'enterprise' ? 'bg-primary/10 text-primary' :
      t.plan === 'professional' ? 'bg-success/10 text-success' :
      'bg-secondary text-muted-foreground'
    }`}>{t.plan}</span>
  )},
  { key: 'status', label: 'Status', render: (t: Tenant) => <StatusBadge status={t.status} variant={statusVariant(t.status)} /> },
  { key: 'studentsCount', label: 'Students', render: (t: Tenant) => <span className="font-medium">{t.studentsCount.toLocaleString()}</span> },
  { key: 'monthlyRevenue', label: 'MRR', render: (t: Tenant) => <span className="font-medium text-primary">£{t.monthlyRevenue.toLocaleString()}</span> },
  { key: 'createdAt', label: 'Joined', render: (t: Tenant) => new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
];

export default function LandlordDashboard() {
  const totalMRR = MOCK_TENANTS.reduce((s, t) => s + t.monthlyRevenue, 0);
  const totalStudents = MOCK_TENANTS.reduce((s, t) => s + t.studentsCount, 0);
  const activeTenants = MOCK_TENANTS.filter(t => t.status === 'active').length;

  return (
    <DashboardLayout
      title="EduCloud — Landlord Dashboard"
      subtitle="Platform owner view — All centres, revenue, and operations"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileText className="w-3.5 h-3.5 mr-1.5" />Export</Button>
          <Button size="sm"><Building2 className="w-3.5 h-3.5 mr-1.5" />Onboard Centre</Button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Centres" value={MOCK_TENANTS.length} change={`${activeTenants} active`} changeType="positive" icon={Building2} />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} change="+128 this month" changeType="positive" icon={GraduationCap} />
        <StatCard label="Platform MRR" value={`£${totalMRR.toLocaleString()}`} change="+14%" changeType="positive" icon={CreditCard} />
        <StatCard label="Platform Health" value="99.8%" change="Uptime (30d)" changeType="positive" icon={Shield} />
      </div>

      {/* Revenue and Growth */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Revenue by Plan</h3>
          <div className="space-y-3">
            {[
              { plan: 'Enterprise', tenants: 1, mrr: 8500, pct: 46 },
              { plan: 'Professional', tenants: 3, mrr: 9800, pct: 53 },
              { plan: 'Starter', tenants: 2, mrr: 200, pct: 1 },
            ].map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{p.plan}</span>
                  <span className="text-muted-foreground">{p.tenants} centres · £{p.mrr.toLocaleString()}/mo</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full">
                  <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Onboarding Pipeline</h3>
          <div className="space-y-2">
            {[
              { centre: 'Quetta Learning Centre', stage: 'Documents Review', days: 3 },
              { centre: 'Rawalpindi Institute', stage: 'Contract Signing', days: 1 },
              { centre: 'Sialkot Academy', stage: 'Initial Inquiry', days: 7 },
            ].map((o) => (
              <div key={o.centre} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{o.centre}</p>
                  <p className="text-xs text-muted-foreground">{o.stage}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {o.days}d
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Platform Alerts</h3>
          <div className="space-y-2">
            {[
              { alert: 'Faisalabad Hub subscription suspended', type: 'danger', time: '2h ago' },
              { alert: 'Islamabad Academy onboarding incomplete', type: 'warning', time: '1d ago' },
              { alert: 'EduPathway — IQA report overdue', type: 'warning', time: '3d ago' },
              { alert: 'New centre inquiry: Quetta LC', type: 'info', time: '5d ago' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  a.type === 'danger' ? 'text-destructive' : a.type === 'warning' ? 'text-warning' : 'text-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{a.alert}</p>
                  <p className="text-[10px] text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">All Centres</h2>
        <p className="text-xs text-muted-foreground">{MOCK_TENANTS.length} registered</p>
      </div>
      <DataTable columns={columns} data={MOCK_TENANTS} />

      {/* Platform Features & Infrastructure */}
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Subscription Plans
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Starter', price: '£200/mo', features: 'Up to 50 students · Basic LMS · 1 Admin · Email support' },
              { name: 'Professional', price: '£500/mo', features: 'Up to 500 students · Full LMS + Video + QA · 5 Admins · Agent portal · Custom branding' },
              { name: 'Enterprise', price: '£1,000/mo', features: 'Unlimited · Full platform · Custom domain · API access · White-label · SLA' },
            ].map((plan) => (
              <div key={plan.name} className="surface-data p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  <span className="text-sm font-bold text-primary">{plan.price}</span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.features}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Infrastructure & Security
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Database', value: 'PostgreSQL (Supabase)', ok: true },
              { label: 'Auth', value: 'OAuth2 + MFA + RBAC', ok: true },
              { label: 'Storage', value: 'Encrypted (AES-256)', ok: true },
              { label: 'Video', value: 'AWS IVS', ok: true },
              { label: 'Edge Functions', value: 'Active', ok: true },
              { label: 'GDPR Compliance', value: 'Enforced', ok: true },
              { label: 'Audit Trail', value: 'Immutable', ok: true },
              { label: 'Exam Proctoring', value: 'Planned', ok: false },
              { label: 'Offline Sync', value: 'Planned', ok: false },
              { label: 'Doc Watermarking', value: 'Planned', ok: false },
            ].map((i) => (
              <div key={i.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className={`text-xs font-medium flex items-center gap-1 ${i.ok ? 'text-success' : 'text-muted-foreground'}`}>
                  {i.ok ? <CheckCircle className="w-3 h-3" /> : '○'} {i.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance across tenants */}
      <div className="surface-card p-5 mt-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Cross-Tenant Compliance Overview
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-2">Centre</th>
                <th className="text-label text-left px-4 py-2">OTHM</th>
                <th className="text-label text-left px-4 py-2">QUALIFI</th>
                <th className="text-label text-left px-4 py-2">IAB</th>
                <th className="text-label text-left px-4 py-2">IQA Reports</th>
                <th className="text-label text-left px-4 py-2">Tutor CVs</th>
                <th className="text-label text-left px-4 py-2">Overall</th>
              </tr>
            </thead>
            <tbody>
              {[
                { centre: 'EduPathway', othm: 'Valid', qualifi: 'Valid', iab: 'Valid', iqa: 'Overdue', cvs: '16/18', score: 87 },
                { centre: 'Karachi IT', othm: 'Valid', qualifi: 'Valid', iab: 'N/A', iqa: 'Up to date', cvs: '22/22', score: 95 },
                { centre: 'Peshawar TC', othm: 'Valid', qualifi: 'N/A', iab: 'Valid', iqa: 'Up to date', cvs: '8/8', score: 92 },
                { centre: 'Multan College', othm: 'Valid', qualifi: 'Renewal Due', iab: 'N/A', iqa: 'Pending', cvs: '10/12', score: 78 },
              ].map((c) => (
                <tr key={c.centre} className="border-t border-border/50">
                  <td className="px-4 py-2 text-sm font-medium">{c.centre}</td>
                  <td className="px-4 py-2"><StatusBadge status={c.othm} variant={c.othm === 'Valid' ? 'success' : 'neutral'} /></td>
                  <td className="px-4 py-2"><StatusBadge status={c.qualifi} variant={c.qualifi === 'Valid' ? 'success' : c.qualifi === 'N/A' ? 'neutral' : 'warning'} /></td>
                  <td className="px-4 py-2"><StatusBadge status={c.iab} variant={c.iab === 'Valid' ? 'success' : 'neutral'} /></td>
                  <td className="px-4 py-2"><StatusBadge status={c.iqa} variant={c.iqa === 'Up to date' ? 'success' : c.iqa === 'Overdue' ? 'danger' : 'warning'} /></td>
                  <td className="px-4 py-2 text-sm">{c.cvs}</td>
                  <td className="px-4 py-2">
                    <span className={`text-sm font-bold ${c.score >= 90 ? 'text-success' : c.score >= 80 ? 'text-primary' : 'text-warning'}`}>{c.score}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
