import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Megaphone, Users, Video, BarChart3, Target, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo } from 'react';

export default function MarketingDashboard() {
  const { data: applications } = useSupabaseQuery('applications', {
    orderBy: { column: 'created_at', ascending: false },
  });

  // Compute funnel from real application stages
  const funnel = useMemo(() => {
    const stages = [
      { stage: 'Lead', key: 'lead' },
      { stage: 'Contacted', key: 'contacted' },
      { stage: 'Qualified', key: 'qualified' },
      { stage: 'Applied', key: 'applied' },
      { stage: 'Under Review', key: 'under_review' },
      { stage: 'Enrolled', key: 'enrolled' },
    ];
    return stages.map((s) => ({
      ...s,
      count: applications.filter((a) => a.stage === s.key).length,
    }));
  }, [applications]);

  // Monthly lead data from applications
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    applications.forEach((a) => {
      const month = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short' });
      months[month] = (months[month] || 0) + 1;
    });
    return Object.entries(months).slice(-6).map(([month, count]) => ({ month, leads: count }));
  }, [applications]);

  const totalLeads = applications.length;
  const enrolledCount = applications.filter((a) => a.stage === 'enrolled').length;
  const conversionRate = totalLeads > 0 ? ((enrolledCount / totalLeads) * 100).toFixed(1) : '0';

  // Sources breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    applications.forEach((a) => {
      const src = a.source || 'Unknown';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [applications]);

  return (
    <DashboardLayout
      title="Marketing Dashboard"
      subtitle="Campaigns, leads, and recruitment funnel"
      actions={<Button size="sm"><Megaphone className="w-3.5 h-3.5 mr-1.5" />New Campaign</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={totalLeads} icon={Users} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} change="Lead → Enrolled" changeType="positive" icon={Target} />
        <StatCard label="Enrolled" value={enrolledCount} icon={TrendingUp} />
        <StatCard label="Sources" value={sourceBreakdown.length} icon={Megaphone} />
      </div>

      {/* Lead Funnel */}
      <div className="surface-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Recruitment Funnel
        </h3>
        <div className="flex items-end gap-2">
          {funnel.map((stage, i) => (
            <div key={stage.stage} className="flex-1 text-center">
              <p className="text-lg font-bold mb-1">{stage.count}</p>
              <div
                className="rounded-lg py-3 bg-primary/10 text-primary transition-default"
                style={{ minHeight: `${20 + (i + 1) * 10}px`, opacity: 0.4 + (i * 0.12) }}
              >
                <p className="text-[10px] font-medium px-1">{stage.stage}</p>
              </div>
              {i < funnel.length - 1 && funnel[i].count > 0 && (
                <p className="text-[9px] text-muted-foreground mt-1">
                  {funnel[i + 1].count > 0 ? `${((funnel[i + 1].count / funnel[i].count) * 100).toFixed(0)}% →` : '0% →'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Leads over time */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Leads Over Time
          </h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="leads" name="Leads" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">No lead data yet</p>
          )}
        </div>

        {/* Lead Sources */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Lead Sources
          </h3>
          <div className="space-y-3">
            {sourceBreakdown.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {count}
                  </div>
                  <span className="text-sm font-medium capitalize">{source}</span>
                </div>
                <div className="w-24 h-1.5 bg-secondary rounded-full">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${totalLeads > 0 ? (count / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {sourceBreakdown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No source data</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
