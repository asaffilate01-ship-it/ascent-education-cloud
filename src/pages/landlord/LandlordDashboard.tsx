import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/ui/DataTable';
import { Building2, Users, CreditCard, GraduationCap, Shield, Zap, Server, Clock, AlertTriangle, CheckCircle, FileText, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';
import OnboardTenantModal from '@/components/modals/OnboardTenantModal';

const statusVariant = (s: string) => {
  if (s === 'active') return 'success' as const;
  if (s === 'onboarding') return 'info' as const;
  return 'danger' as const;
};

export default function LandlordDashboard() {
  const { data: tenants, loading: tLoading } = useSupabaseQuery('tenants', {
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: invoices, loading: iLoading } = useSupabaseQuery('invoices');
  const { data: applications, loading: aLoading } = useSupabaseQuery('applications');

  // MRR trend
  const mrrTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
      const joined = tenants.filter(t => new Date(t.created_at).getMonth() <= i);
      const mrr = joined.reduce((s, t) => s + Number(t.monthly_revenue || 0), 0);
      return { month: m, mrr };
    });
  }, [tenants]);

  // Enrolment trend
  const enrolmentTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map(m => {
      const mApps = applications.filter(a => new Date(a.created_at).toLocaleString('en', { month: 'short' }) === m);
      return { month: m, applications: mApps.length, enrolled: mApps.filter(a => a.stage === 'enrolled').length };
    });
  }, [applications]);

  const loading = tLoading || iLoading || aLoading;
  if (loading) return <DashboardSkeleton />;

  const totalMRR = tenants.reduce((s, t) => s + Number(t.monthly_revenue || 0), 0);
  const totalStudents = tenants.reduce((s, t) => s + (t.students_count || 0), 0);
  const activeTenants = tenants.filter(t => t.status === 'active').length;

  const columns = [
    { key: 'name', label: 'Centre', render: (t: any) => (
      <div>
        <p className="text-sm font-medium">{t.name}</p>
        <p className="text-xs text-muted-foreground">{t.slug}.educloud.com</p>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: (t: any) => (
      <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded ${
        t.plan === 'enterprise' ? 'bg-primary/10 text-primary' :
        t.plan === 'professional' ? 'bg-success/10 text-success' :
        'bg-secondary text-muted-foreground'
      }`}>{t.plan}</span>
    )},
    { key: 'status', label: 'Status', render: (t: any) => <StatusBadge status={t.status} variant={statusVariant(t.status)} /> },
    { key: 'students_count', label: 'Students', render: (t: any) => <span className="font-medium">{(t.students_count || 0).toLocaleString()}</span> },
    { key: 'monthly_revenue', label: 'MRR', render: (t: any) => <span className="font-medium text-primary">£{Number(t.monthly_revenue || 0).toLocaleString()}</span> },
    { key: 'created_at', label: 'Joined', render: (t: any) => new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
  ];

  // Revenue by plan
  const planBreakdown = ['enterprise', 'professional', 'starter'].map(plan => {
    const filtered = tenants.filter(t => t.plan === plan);
    const mrr = filtered.reduce((s, t) => s + Number(t.monthly_revenue || 0), 0);
    return { plan, tenants: filtered.length, mrr, pct: totalMRR ? Math.round((mrr / totalMRR) * 100) : 0 };
  });

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Centres" value={tenants.length} change={`${activeTenants} active`} changeType="positive" icon={Building2} />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={GraduationCap} />
        <StatCard label="Platform MRR" value={`£${totalMRR.toLocaleString()}`} changeType="positive" icon={CreditCard} />
        <StatCard label="Platform Health" value="99.8%" change="Uptime (30d)" changeType="positive" icon={Shield} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Revenue by Plan</h3>
          <div className="space-y-3">
            {planBreakdown.map((p) => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium capitalize">{p.plan}</span>
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
            {tenants.filter(t => t.status === 'onboarding').map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.plan} plan</p>
                </div>
                <StatusBadge status="Onboarding" variant="info" />
              </div>
            ))}
            {tenants.filter(t => t.status === 'onboarding').length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No centres onboarding</p>
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Platform Alerts</h3>
          <div className="space-y-2">
            {tenants.filter(t => t.status === 'suspended').map((t) => (
              <div key={t.id} className="flex items-start gap-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{t.name} subscription suspended</p>
                </div>
              </div>
            ))}
            {tenants.filter(t => t.status === 'suspended').length === 0 && (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle className="w-3.5 h-3.5 text-success" />
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> MRR Growth
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`£${v.toLocaleString()}`, 'MRR']} />
              <Line type="monotone" dataKey="mrr" name="MRR" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> Enrolment Pipeline
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={enrolmentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="applications" name="Applications" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">All Centres</h2>
        <p className="text-xs text-muted-foreground">{tenants.length} registered</p>
      </div>
      <DataTable columns={columns} data={tenants} />

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
            <Server className="w-4 h-4 text-primary" /> Infrastructure
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Database', value: 'PostgreSQL', ok: true },
              { label: 'Auth', value: 'OAuth2 + RBAC', ok: true },
              { label: 'Storage', value: 'Encrypted', ok: true },
              { label: 'Video', value: 'Jitsi Meet', ok: true },
              { label: 'GDPR', value: 'Enforced', ok: true },
              { label: 'RLS', value: 'All tables', ok: true },
            ].map((i) => (
              <div key={i.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">{i.label}</span>
                <span className="text-xs font-medium flex items-center gap-1 text-success">
                  <CheckCircle className="w-3 h-3" /> {i.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
