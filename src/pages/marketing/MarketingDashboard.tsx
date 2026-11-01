import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Megaphone, Users, Video, BarChart3, Target, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo } from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {DashboardSkeleton} from '@/components/ui/Skeletons';

export default function MarketingDashboard() {
  const {user}=useAuth();
  // Do not fetch a cross-centre marketing funnel when the selected role or
  // centre has not been verified. Database RLS must independently enforce this.
  const scoped=!!user?.id&&!!user.tenantId&&
   ['marketing_officer','centre_director','superadmin'].includes(user.role)&&user.roles?.includes(user.role);
  const { data: applications, loading, error, refetch } = useSupabaseQuery('applications', {
    // Only aggregate-safe columns are needed; never fetch applicant contact details for this chart.
    select: 'id,tenant_id,stage,created_at,source',
    orderBy: { column: 'created_at', ascending: false },
    enabled: scoped,
    filters: [{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],
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
      const date = new Date(a.created_at);
      if (Number.isNaN(date.getTime())) return;
      const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      months[month] = (months[month] || 0) + 1;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, count]) => ({ month, leads: count }));
  }, [applications]);

  const totalLeads = applications.length;
  const largestStage=Math.max(1,...funnel.map(stage=>stage.count));
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

  if(!scoped) return <DashboardLayout title="Marketing Dashboard"><p role="alert" className="rounded-xl border p-5">A verified active marketing or centre leadership role and an assigned centre are required. No applications or funnel statistics have been loaded.</p></DashboardLayout>;
  if (loading) return <DashboardLayout title="Marketing Dashboard"><DashboardSkeleton /></DashboardLayout>;
  if (error) return <DashboardLayout title="Marketing Dashboard"><div role="alert"><p>Lead data could not be loaded. Marketing totals are unavailable.</p><Button className="mt-3" onClick={() => void refetch()}>Retry marketing data</Button></div></DashboardLayout>;

  return (
    <DashboardLayout
      title="Marketing Dashboard"
      subtitle="Campaigns, leads, and recruitment funnel"
      actions={<Button size="sm" asChild><Link to="/marketing/email-campaigns"><Megaphone className="w-3.5 h-3.5 mr-1.5" />Email campaigns</Link></Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={totalLeads} icon={Users} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} change="Current share in enrolled stage" changeType="positive" icon={Target} />
        <StatCard label="Enrolled" value={enrolledCount} icon={TrendingUp} />
        <StatCard label="Sources" value={sourceBreakdown.length} icon={Megaphone} />
      </div>

      {/* Lead Funnel */}
      <div className="surface-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Current application stages
        </h3>
        <div className="flex items-end gap-2">
          {funnel.map((stage) => (
            <div key={stage.stage} className="flex-1 text-center">
              <p className="text-lg font-bold mb-1">{stage.count}</p>
              <div
                className="rounded-lg py-3 bg-primary/10 text-primary transition-default"
                style={{ minHeight: `${Math.max(24,Math.round(stage.count/largestStage*100))}px`, opacity:stage.count?1:0.35 }}
              >
                <p className="text-[10px] font-medium px-1">{stage.stage}</p>
              </div>

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
