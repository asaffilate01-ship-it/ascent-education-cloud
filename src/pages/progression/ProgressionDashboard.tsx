import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, Award, CreditCard, Globe, FileText, Loader2 } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

export default function ProgressionDashboard() {
  const { data: applications, loading: appsLoading } = useSupabaseQuery('applications', {
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: programmes, loading: progsLoading } = useSupabaseQuery('programmes');

  const loading = appsLoading || progsLoading;

  // Compute live stats
  const eligible = (applications || []).filter(a => ['qualified', 'applied', 'under_review', 'conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled'].includes(a.stage)).length;
  const applied = (applications || []).filter(a => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offered = (applications || []).filter(a => ['conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled'].includes(a.stage)).length;
  const enrolled = (applications || []).filter(a => a.stage === 'enrolled').length;

  // Group by programme for "partner" view
  const progMap = new Map((programmes || []).map(p => [p.id, p]));
  const byProgramme = new Map<string, typeof applications>();
  (applications || []).forEach(app => {
    const key = app.programme_name || 'Unknown';
    if (!byProgramme.has(key)) byProgramme.set(key, []);
    byProgramme.get(key)!.push(app);
  });

  const PARTNER_UNIS = [
    { uni: 'University of Sunderland', country: 'UK', commission: '£3,000' },
    { uni: 'Anglia Ruskin University', country: 'UK', commission: '£2,500' },
    { uni: 'University of Bolton', country: 'UK', commission: '£2,000' },
    { uni: 'University of Nicosia', country: 'Cyprus', commission: '€2,000' },
    { uni: 'Conestoga College', country: 'Canada', commission: '$4,000' },
    { uni: 'Charles Sturt University', country: 'Australia', commission: '$3,500' },
  ];

  return (
    <DashboardLayout title="University Progression" subtitle="Partner universities, applications, offers, and commissions">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Eligible Students" value={loading ? '...' : String(eligible)} icon={GraduationCap} />
        <StatCard label="Applications Sent" value={loading ? '...' : String(applied)} change={eligible > 0 ? `${Math.round((applied / eligible) * 100)}% of eligible` : ''} changeType="positive" icon={FileText} />
        <StatCard label="Offers Received" value={loading ? '...' : String(offered)} change={applied > 0 ? `${Math.round((offered / applied) * 100)}% success` : ''} changeType="positive" icon={Award} />
        <StatCard label="Enrolled" value={loading ? '...' : String(enrolled)} icon={CreditCard} />
      </div>

      {/* Partner Universities */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Partner Universities</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PARTNER_UNIS.map((u) => (
            <div key={u.uni} className="surface-data p-4 rounded-lg hover:shadow-surface-md transition-default cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{u.uni}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.country}</p>
                </div>
                <Globe className="w-4 h-4 text-primary shrink-0" />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-muted-foreground">{enrolled} students referred</span>
                <span className="font-medium text-primary">{u.commission}/student</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Student Applications</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="surface-data">
                  <th className="text-label text-left px-4 py-3">Student</th>
                  <th className="text-label text-left px-4 py-3">Programme</th>
                  <th className="text-label text-left px-4 py-3">Level</th>
                  <th className="text-label text-left px-4 py-3">Source</th>
                  <th className="text-label text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(applications || []).slice(0, 20).map((a) => (
                  <tr key={a.id} className="border-t border-border/50">
                    <td className="px-4 py-3 text-sm font-medium">{a.student_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{a.programme_name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{a.level || '—'}</td>
                    <td className="px-4 py-3 text-sm">{a.source || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={a.stage.replace(/_/g, ' ')}
                        variant={a.stage === 'enrolled' ? 'success' : ['conditional_offer', 'unconditional_offer'].includes(a.stage) ? 'info' : a.stage === 'lost' ? 'danger' : 'warning'}
                      />
                    </td>
                  </tr>
                ))}
                {(applications || []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No applications yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission Rates */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3">Commission Rates by Country</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { country: 'United Kingdom', range: '£2,000 – £5,000', flag: '🇬🇧' },
            { country: 'Canada', range: '$3,000 – $4,000', flag: '🇨🇦' },
            { country: 'Australia', range: '$3,000 – $3,500', flag: '🇦🇺' },
            { country: 'USA', range: '$2,500 – $4,000', flag: '🇺🇸' },
          ].map((c) => (
            <div key={c.country} className="surface-data p-4 rounded-lg text-center">
              <p className="text-2xl mb-1">{c.flag}</p>
              <p className="text-sm font-semibold">{c.country}</p>
              <p className="text-xs text-primary font-medium mt-1">{c.range}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
