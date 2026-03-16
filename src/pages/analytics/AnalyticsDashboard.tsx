import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Users, GraduationCap, TrendingUp, BookOpen, CreditCard, Calendar, Target, Loader2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar } from 'recharts';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useMemo } from 'react';

export default function AnalyticsDashboard() {
  const { data: applications, loading: appsLoading } = useSupabaseQuery('applications');
  const { data: invoices, loading: invLoading } = useSupabaseQuery('invoices');
  const { data: attendance, loading: attLoading } = useSupabaseQuery('attendance_records');
  const { data: programmes, loading: progLoading } = useSupabaseQuery('programmes');

  const loading = appsLoading || invLoading || attLoading || progLoading;

  const stats = useMemo(() => {
    const apps = applications || [];
    const invs = invoices || [];
    const atts = attendance || [];

    const totalEnrolled = apps.filter(a => a.stage === 'enrolled').length;
    const totalApps = apps.length;
    const enrolledCount = apps.filter(a => a.stage === 'enrolled').length;
    const conversionRate = totalApps > 0 ? Math.round((enrolledCount / totalApps) * 100) : 0;

    const presentCount = atts.filter(a => a.status === 'present' || a.status === 'late').length;
    const avgAttendance = atts.length > 0 ? Math.round((presentCount / atts.length) * 100) : 0;

    const totalRevenue = invs.reduce((sum, inv) => sum + Number(inv.paid), 0);

    return { totalEnrolled, conversionRate, avgAttendance, totalRevenue };
  }, [applications, invoices, attendance]);

  // Build enrollment trend by month from applications
  const enrollmentData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth: Record<string, { applied: number; enrolled: number }> = {};
    months.forEach(m => byMonth[m] = { applied: 0, enrolled: 0 });

    (applications || []).forEach(app => {
      const m = months[new Date(app.created_at).getMonth()];
      if (m) {
        byMonth[m].applied++;
        if (app.stage === 'enrolled') byMonth[m].enrolled++;
      }
    });

    return months.map(m => ({ month: m, applied: byMonth[m].applied, enrolled: byMonth[m].enrolled }));
  }, [applications]);

  // Revenue breakdown by type
  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth: Record<string, { tuition: number; exams: number; commissions: number }> = {};
    months.forEach(m => byMonth[m] = { tuition: 0, exams: 0, commissions: 0 });

    (invoices || []).forEach(inv => {
      const m = months[new Date(inv.issued_date).getMonth()];
      if (m) {
        const amount = Number(inv.paid);
        if (inv.type === 'tuition') byMonth[m].tuition += amount;
        else if (inv.type === 'exam') byMonth[m].exams += amount;
        else if (inv.type === 'commission') byMonth[m].commissions += amount;
        else byMonth[m].tuition += amount;
      }
    });

    return months.map(m => ({ month: m, ...byMonth[m] }));
  }, [invoices]);

  // Programme distribution
  const programmeDist = useMemo(() => {
    const colors = ['hsl(0, 72%, 45%)', 'hsl(0, 60%, 65%)', 'hsl(0, 45%, 30%)', 'hsl(0, 55%, 80%)', 'hsl(142, 76%, 36%)'];
    return (programmes || []).slice(0, 5).map((p, i) => ({
      name: p.title.length > 20 ? p.title.slice(0, 18) + '…' : p.title,
      value: p.enrolled || 0,
      color: colors[i % colors.length],
    }));
  }, [programmes]);

  // Attendance by method
  const attendanceTrend = useMemo(() => {
    const weeks: Record<string, { online: number; centre: number; total: number }> = {};
    (attendance || []).forEach((a, i) => {
      const wk = `W${Math.floor(i / 7) + 1}`;
      if (!weeks[wk]) weeks[wk] = { online: 0, centre: 0, total: 0 };
      weeks[wk].total++;
      if (a.status === 'present' || a.status === 'late') {
        if (a.method === 'online') weeks[wk].online++;
        else weeks[wk].centre++;
      }
    });
    return Object.entries(weeks).slice(0, 8).map(([week, d]) => ({
      week,
      online: d.total > 0 ? Math.round((d.online / d.total) * 100) : 0,
      centre: d.total > 0 ? Math.round((d.centre / d.total) * 100) : 0,
    }));
  }, [attendance]);

  // Application sources
  const sourceData = useMemo(() => {
    const sources: Record<string, { leads: number; converted: number }> = {};
    (applications || []).forEach(app => {
      const src = app.source || 'Direct';
      if (!sources[src]) sources[src] = { leads: 0, converted: 0 };
      sources[src].leads++;
      if (app.stage === 'enrolled') sources[src].converted++;
    });
    return Object.entries(sources).map(([agent, d]) => ({
      agent,
      leads: d.leads,
      converted: d.converted,
      rate: d.leads > 0 ? Math.round((d.converted / d.leads) * 100) : 0,
    })).sort((a, b) => b.leads - a.leads).slice(0, 6);
  }, [applications]);

  if (loading) {
    return (
      <DashboardLayout title="Analytics & Insights" subtitle="Platform-wide performance metrics and trends">
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics & Insights" subtitle="Platform-wide performance metrics and trends">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Enrolled" value={String(stats.totalEnrolled)} icon={GraduationCap} />
        <StatCard label="Avg Attendance" value={`${stats.avgAttendance}%`} icon={Calendar} />
        <StatCard label="Revenue Collected" value={`£${stats.totalRevenue.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} change="Lead → Enrolled" changeType="positive" icon={Target} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Enrollment Trends
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(0, 8%, 90%)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="applied" name="Applied" fill="hsl(0, 55%, 80%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="hsl(0, 72%, 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Revenue Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => [`£${value.toLocaleString()}`, '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="tuition" name="Tuition" stackId="1" fill="hsl(0, 72%, 45%)" stroke="hsl(0, 72%, 45%)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="commissions" name="Commissions" stackId="1" fill="hsl(0, 60%, 65%)" stroke="hsl(0, 60%, 65%)" fillOpacity={0.6} />
              <Area type="monotone" dataKey="exams" name="Exam Fees" stackId="1" fill="hsl(0, 55%, 80%)" stroke="hsl(0, 55%, 80%)" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="surface-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Attendance Trends
          </h3>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="online" name="Online" stroke="hsl(0, 72%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="centre" name="Centre" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No attendance data yet</p>
          )}
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> By Programme
          </h3>
          {programmeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={programmeDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {programmeDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No programmes yet</p>
          )}
        </div>
      </div>

      {/* Source Performance */}
      <div className="surface-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Lead Source Performance
        </h3>
        {sourceData.length > 0 ? (
          <div className="space-y-3">
            {sourceData.map((a) => (
              <div key={a.agent} className="flex items-center gap-3">
                <div className="w-28 text-xs font-medium truncate">{a.agent}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${a.rate}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right">{a.rate}%</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground w-16 text-right">{a.converted}/{a.leads}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">No application data yet</p>
        )}
      </div>
    </DashboardLayout>
  );
}
