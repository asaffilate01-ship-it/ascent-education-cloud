import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Globe, CreditCard, Users, Shield, Zap, Server } from 'lucide-react';

export default function SuperadminPlatform() {
  return (
    <DashboardLayout title="Platform Management" subtitle="Features, subscriptions, and infrastructure">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Tenants" value="4" icon={Globe} />
        <StatCard label="Total MRR" value="£15,200" icon={CreditCard} />
        <StatCard label="Platform Users" value="1,876" icon={Users} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscription Plans */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4">Subscription Plans</h3>
          <div className="space-y-3">
            {[
              { name: 'Starter', price: '£200/mo', features: ['Up to 50 students', 'Basic LMS', '1 admin user', 'Email support'], tenants: 2 },
              { name: 'Professional', price: '£500/mo', features: ['Up to 500 students', 'Full LMS + Video', '5 admin users', 'Priority support', 'Custom branding'], tenants: 2 },
              { name: 'Enterprise', price: '£1,000/mo', features: ['Unlimited students', 'Full platform', 'Unlimited admins', 'Custom domain', 'API access', 'SLA guarantee'], tenants: 1 },
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
                  <span className={`text-xs ${f.status.startsWith('✓') ? 'text-success' : 'text-muted-foreground'}`}>{f.status}</span>
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
                { label: 'Database', value: 'Supabase (PostgreSQL)' },
                { label: 'Auth', value: 'Supabase Auth + OAuth2' },
                { label: 'Storage', value: 'Supabase Storage (encrypted)' },
                { label: 'Video', value: 'AWS IVS (planned)' },
                { label: 'Edge Functions', value: 'Supabase Edge Functions' },
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
