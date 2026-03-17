import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Globe, CreditCard, Users, Shield, Zap, Server, Loader2 } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo } from 'react';

export default function SuperadminPlatform() {
  const { data: tenants, loading } = useSupabaseQuery('tenants');
  const { data: profiles } = useSupabaseQuery('profiles');

  const stats = useMemo(() => {
    const t = tenants || [];
    return {
      activeTenants: t.filter(x => x.status === 'active').length,
      totalMRR: t.reduce((s, x) => s + (Number(x.monthly_revenue) || 0), 0),
      totalUsers: (profiles || []).length,
    };
  }, [tenants, profiles]);

  const planCounts = useMemo(() => {
    const t = tenants || [];
    return {
      starter: t.filter(x => x.plan === 'starter').length,
      professional: t.filter(x => x.plan === 'professional').length,
      enterprise: t.filter(x => x.plan === 'enterprise').length,
    };
  }, [tenants]);

  return (
    <DashboardLayout title="Platform Management" subtitle="Features, subscriptions, and infrastructure">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Tenants" value={loading ? '...' : String(stats.activeTenants)} icon={Globe} />
        <StatCard label="Total MRR" value={loading ? '...' : `Rs.${stats.totalMRR.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Platform Users" value={loading ? '...' : String(stats.totalUsers)} icon={Users} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscription Plans */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">Subscription Plans</h3>
          <div className="space-y-3">
            {[
              { name: 'Starter', price: '£200/mo', features: ['Up to 50 students', 'Basic LMS', '1 admin user', 'Email support'], tenants: planCounts.starter },
              { name: 'Professional', price: '£500/mo', features: ['Up to 500 students', 'Full LMS + Video', '5 admin users', 'Priority support', 'Custom branding'], tenants: planCounts.professional },
              { name: 'Enterprise', price: '£1,000/mo', features: ['Unlimited students', 'Full platform', 'Unlimited admins', 'Custom domain', 'API access', 'SLA guarantee'], tenants: planCounts.enterprise },
            ].map((plan) => (
              <div key={plan.name} className="surface-data p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-lg font-bold text-primary">{plan.price}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{plan.tenants} active</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Features */}
        <div className="space-y-4">
          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Security & Compliance
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { feature: 'GDPR Compliance', status: '✓ Active' },
                { feature: 'Data Encryption (AES-256)', status: '✓ Active' },
                { feature: 'Audit Trail Logging', status: '✓ Active' },
                { feature: 'Document Watermarking', status: '○ Planned' },
                { feature: 'Exam Proctoring (AI)', status: '○ Planned' },
                { feature: 'Offline-First Sync', status: '○ Planned' },
              ].map((f) => (
                <div key={f.feature} className="flex items-center justify-between py-1">
                  <span>{f.feature}</span>
                  <span className={`text-xs ${f.status.startsWith('✓') ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>{f.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> Infrastructure
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Database', value: 'PostgreSQL (Cloud)' },
                { label: 'Auth', value: 'Cloud Auth + OAuth2' },
                { label: 'Storage', value: 'Encrypted Object Storage' },
                { label: 'Video', value: 'Jitsi Meet (8×8 JaaS)' },
                { label: 'Backend Functions', value: 'Edge Functions' },
                { label: 'CDN', value: 'Cloudflare' },
              ].map((i) => (
                <div key={i.label} className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-medium">{i.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
