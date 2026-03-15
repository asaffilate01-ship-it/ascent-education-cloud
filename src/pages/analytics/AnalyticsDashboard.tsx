import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { BarChart3, Users, GraduationCap, TrendingUp, BookOpen, CreditCard, Calendar, Target } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ENROLLMENT_DATA = [
  { month: 'Sep', level3: 12, level4: 45, level5: 38 },
  { month: 'Oct', level3: 18, level4: 52, level5: 42 },
  { month: 'Nov', level3: 22, level4: 58, level5: 48 },
  { month: 'Dec', level3: 15, level4: 55, level5: 45 },
  { month: 'Jan', level3: 28, level4: 65, level5: 52 },
  { month: 'Feb', level3: 32, level4: 72, level5: 58 },
  { month: 'Mar', level3: 35, level4: 78, level5: 62 },
];

const REVENUE_DATA = [
  { month: 'Sep', tuition: 42000, exams: 5200, commissions: 8000 },
  { month: 'Oct', tuition: 48000, exams: 6100, commissions: 9500 },
  { month: 'Nov', tuition: 51000, exams: 5800, commissions: 11000 },
  { month: 'Dec', tuition: 38000, exams: 8200, commissions: 7500 },
  { month: 'Jan', tuition: 55000, exams: 7100, commissions: 12000 },
  { month: 'Feb', tuition: 62000, exams: 6800, commissions: 14500 },
  { month: 'Mar', tuition: 68000, exams: 7500, commissions: 16000 },
];

const ATTENDANCE_TREND = [
  { week: 'W1', online: 92, centre: 88 },
  { week: 'W2', online: 89, centre: 91 },
  { week: 'W3', online: 94, centre: 85 },
  { week: 'W4', online: 88, centre: 90 },
  { week: 'W5', online: 91, centre: 87 },
  { week: 'W6', online: 93, centre: 92 },
  { week: 'W7', online: 90, centre: 89 },
  { week: 'W8', online: 95, centre: 93 },
];

const PROGRAMME_DIST = [
  { name: 'Business Mgmt', value: 45, color: 'hsl(0, 72%, 45%)' },
  { name: 'Computing', value: 28, color: 'hsl(0, 60%, 65%)' },
  { name: 'Accounting', value: 18, color: 'hsl(0, 45%, 30%)' },
  { name: 'Marketing', value: 9, color: 'hsl(0, 55%, 80%)' },
];

const AGENT_PERFORMANCE = [
  { agent: 'Karachi Office', leads: 45, converted: 28, rate: 62, commission: 14000 },
  { agent: 'Lahore Office', leads: 38, converted: 22, rate: 58, commission: 11000 },
  { agent: 'Islamabad Office', leads: 22, converted: 15, rate: 68, commission: 7500 },
  { agent: 'Dubai Partner', leads: 15, converted: 12, rate: 80, commission: 9600 },
  { agent: 'Online Channel', leads: 52, converted: 18, rate: 35, commission: 5400 },
];

const PROGRESSION_DATA = [
  { university: 'U. Sunderland', referred: 18, applied: 15, offered: 12, enrolled: 10 },
  { university: 'Anglia Ruskin', referred: 14, applied: 11, offered: 9, enrolled: 7 },
  { university: 'U. Bolton', referred: 10, applied: 8, offered: 6, enrolled: 5 },
  { university: 'UCLAN', referred: 8, applied: 6, offered: 5, enrolled: 3 },
];

export default function AnalyticsDashboard() {
  return (
    <DashboardLayout title="Analytics & Insights" subtitle="Platform-wide performance metrics and trends">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Enrolled" value="1,643" change="+128 this month" changeType="positive" icon={GraduationCap} />
        <StatCard label="Avg Attendance" value="91%" change="+3% from last month" changeType="positive" icon={Calendar} />
        <StatCard label="Revenue (MTD)" value="£91,500" change="+18% MoM" changeType="positive" icon={CreditCard} />
        <StatCard label="Conversion Rate" value="56%" change="Lead → Enrolled" changeType="positive" icon={Target} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Enrollment Trends */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Enrollment Trends
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ENROLLMENT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(0, 8%, 90%)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="level3" name="Level 3" fill="hsl(0, 55%, 80%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="level4" name="Level 4" fill="hsl(0, 60%, 65%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="level5" name="Level 5" fill="hsl(0, 72%, 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Revenue Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={REVENUE_DATA}>
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

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Attendance Trend */}
        <div className="surface-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Attendance Trends (Weekly)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ATTENDANCE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="online" name="Online Classes" stroke="hsl(0, 72%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="centre" name="Centre Classes" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Programme Distribution */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> By Programme
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={PROGRAMME_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {PROGRAMME_DIST.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Agent Performance
          </h3>
          <div className="space-y-3">
            {AGENT_PERFORMANCE.map((a) => (
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
                <div className="text-xs font-semibold text-primary w-16 text-right">£{(a.commission/1000).toFixed(1)}k</div>
              </div>
            ))}
          </div>
        </div>

        {/* University Progression Funnel */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" /> University Progression
          </h3>
          <div className="space-y-2">
            {PROGRESSION_DATA.map((u) => (
              <div key={u.university} className="surface-data p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">{u.university}</span>
                  <span className="text-xs text-primary font-medium">{u.enrolled} enrolled</span>
                </div>
                <div className="flex gap-1">
                  {[
                    { label: 'Referred', value: u.referred, pct: 100 },
                    { label: 'Applied', value: u.applied, pct: (u.applied / u.referred) * 100 },
                    { label: 'Offered', value: u.offered, pct: (u.offered / u.referred) * 100 },
                    { label: 'Enrolled', value: u.enrolled, pct: (u.enrolled / u.referred) * 100 },
                  ].map((stage) => (
                    <div key={stage.label} className="flex-1 text-center">
                      <div className="h-1.5 bg-border rounded-full mb-1 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${stage.pct}%` }} />
                      </div>
                      <p className="text-[9px] text-muted-foreground">{stage.label}</p>
                      <p className="text-[10px] font-semibold">{stage.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
