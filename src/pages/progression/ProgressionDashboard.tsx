import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, Award, CreditCard, Globe, FileText, Loader2, ExternalLink } from 'lucide-react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export default function ProgressionDashboard() {
  const [selectedCountry, setSelectedCountry] = useState<string>('All');

  const { data: universities, loading: unisLoading } = useSupabaseQuery('partner_universities' as any, {
    orderBy: { column: 'country', ascending: true },
  });

  const { data: applications, loading: appsLoading } = useSupabaseQuery('applications', {
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: programmes, loading: progsLoading } = useSupabaseQuery('programmes');

  const loading = appsLoading || progsLoading || unisLoading;
  const unis = (universities || []) as any[];

  const eligible = (applications || []).filter(a => ['qualified', 'applied', 'under_review', 'conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled'].includes(a.stage)).length;
  const applied = (applications || []).filter(a => !['lead', 'contacted', 'qualified', 'lost'].includes(a.stage)).length;
  const offered = (applications || []).filter(a => ['conditional_offer', 'unconditional_offer', 'deposit_paid', 'enrolled'].includes(a.stage)).length;
  const enrolled = (applications || []).filter(a => a.stage === 'enrolled').length;

  const countries = ['All', 'UK', 'Australia', 'Canada', 'USA'];
  const filteredUnis = selectedCountry === 'All'
    ? unis
    : unis.filter((u: any) => u.country === selectedCountry);

  const commissionRanges = useMemo(() => {
    const byCountry: Record<string, { flag: string; commissions: string[] }> = {};
    unis.forEach((u: any) => {
      if (!byCountry[u.country]) byCountry[u.country] = { flag: u.flag, commissions: [] };
      if (u.commission) byCountry[u.country].commissions.push(u.commission);
    });
    return Object.entries(byCountry).map(([country, data]) => ({
      country,
      flag: data.flag,
      count: unis.filter((u: any) => u.country === country).length,
      range: data.commissions.length > 1
        ? `${data.commissions[0]} – ${data.commissions[data.commissions.length - 1]}`
        : data.commissions[0] || 'TBC',
    }));
  }, [unis]);

  const handleReferStudent = (uni: any) => {
    window.open(uni.url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening ${uni.name} referral portal — commission: ${uni.commission}/student`);
  };

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Partner Universities ({unis.length})</h3>
          <div className="flex gap-1">
            {countries.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-default ${
                  selectedCountry === c
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {c === 'All' ? 'All' : c === 'UK' ? '🇬🇧 UK' : c === 'Australia' ? '🇦🇺 AUS' : c === 'Canada' ? '🇨🇦 CAN' : '🇺🇸 USA'}
              </button>
            ))}
          </div>
        </div>
        {unisLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUnis.map((u: any) => (
              <div key={u.id} className="surface-data p-4 rounded-lg hover:shadow-lg transition-default group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{u.flag}</span>
                    <div>
                      <p className="text-sm font-semibold group-hover:text-primary transition-default">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.programme}</p>
                    </div>
                  </div>
                  <a href={u.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-accent rounded transition-default">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                  </a>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-muted-foreground">{enrolled} students referred</span>
                  <span className="font-semibold text-primary">{u.commission || 'TBC'}/student</span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-3 text-xs" onClick={() => handleReferStudent(u)}>
                  Refer Student
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="surface-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Student Applications</h3>
        {appsLoading ? (
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
                  <tr key={a.id} className="border-t border-border/50 hover:bg-accent/50 transition-default">
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
          {commissionRanges.map((c) => (
            <div key={c.country} className="surface-data p-4 rounded-lg text-center">
              <p className="text-2xl mb-1">{c.flag}</p>
              <p className="text-sm font-semibold">{c.country}</p>
              <p className="text-xs text-primary font-medium mt-1">{c.range}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.count} partners</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
