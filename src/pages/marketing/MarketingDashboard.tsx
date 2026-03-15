import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { Megaphone, Users, Globe, Video, BarChart3, Mail, Target, TrendingUp, ExternalLink, Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const LEAD_FUNNEL = [
  { stage: 'Website Visitors', count: 4250, color: 'bg-primary/10 text-primary' },
  { stage: 'Lead Captured', count: 680, color: 'bg-primary/20 text-primary' },
  { stage: 'Contacted', count: 420, color: 'bg-primary/30 text-primary' },
  { stage: 'Qualified', count: 280, color: 'bg-primary/40 text-primary-foreground' },
  { stage: 'Applied', count: 195, color: 'bg-primary/60 text-primary-foreground' },
  { stage: 'Enrolled', count: 128, color: 'bg-primary text-primary-foreground' },
];

const CAMPAIGN_DATA = [
  { month: 'Jan', social: 120, google: 85, referral: 45, organic: 65 },
  { month: 'Feb', social: 145, google: 92, referral: 55, organic: 78 },
  { month: 'Mar', social: 180, google: 110, referral: 62, organic: 95 },
];

const CAMPAIGNS = [
  { id: '1', name: 'Spring 2025 Intake — Business', channel: 'Facebook Ads', status: 'active', leads: 145, spent: 2800, cpl: 19.3 },
  { id: '2', name: 'Level 5 Computing — Google', channel: 'Google Ads', status: 'active', leads: 92, spent: 3200, cpl: 34.8 },
  { id: '3', name: 'Free Webinar — UK Pathway', channel: 'Instagram', status: 'active', leads: 210, spent: 800, cpl: 3.8 },
  { id: '4', name: 'Agent Referral Programme', channel: 'Partner', status: 'active', leads: 62, spent: 0, cpl: 0 },
  { id: '5', name: 'Accounting Diploma — TikTok', channel: 'TikTok Ads', status: 'paused', leads: 38, spent: 1200, cpl: 31.6 },
];

const WEBINARS = [
  { title: 'Study in UK — Your Pathway', date: 'Mar 22, 2025', registrations: 185, attended: 0, status: 'upcoming' },
  { title: 'Level 5 Business Overview', date: 'Mar 8, 2025', registrations: 142, attended: 98, status: 'completed' },
  { title: 'Accounting Career Webinar', date: 'Feb 22, 2025', registrations: 88, attended: 62, status: 'completed' },
];

export default function MarketingDashboard() {
  return (
    <DashboardLayout
      title="Marketing Dashboard"
      subtitle="Campaigns, leads, and webinar management"
      actions={<Button size="sm"><Megaphone className="w-3.5 h-3.5 mr-1.5" />New Campaign</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads (MTD)" value="680" change="+22% vs last month" changeType="positive" icon={Users} />
        <StatCard label="Conversion Rate" value="18.8%" change="Lead → Enrolled" changeType="positive" icon={Target} />
        <StatCard label="Cost per Lead" value="£12.40" change="-8% improving" changeType="positive" icon={TrendingUp} />
        <StatCard label="Active Campaigns" value={CAMPAIGNS.filter(c => c.status === 'active').length} icon={Megaphone} />
      </div>

      {/* Lead Funnel */}
      <div className="surface-card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Recruitment Funnel
        </h3>
        <div className="flex items-end gap-2">
          {LEAD_FUNNEL.map((stage, i) => (
            <div key={stage.stage} className="flex-1 text-center">
              <p className="text-lg font-bold mb-1">{stage.count.toLocaleString()}</p>
              <div className={`rounded-lg py-3 ${stage.color} transition-default`} style={{ minHeight: `${20 + (i + 1) * 10}px` }}>
                <p className="text-[10px] font-medium px-1">{stage.stage}</p>
              </div>
              {i < LEAD_FUNNEL.length - 1 && (
                <p className="text-[9px] text-muted-foreground mt-1">
                  {((LEAD_FUNNEL[i + 1].count / stage.count) * 100).toFixed(0)}% →
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Lead Sources Chart */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Leads by Source
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CAMPAIGN_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 8%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(0, 5%, 45%)" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="social" name="Social" fill="hsl(0, 72%, 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="google" name="Google" fill="hsl(0, 60%, 65%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="referral" name="Referral" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="organic" name="Organic" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Webinars */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" /> Webinars
          </h3>
          <div className="space-y-2">
            {WEBINARS.map((w) => (
              <div key={w.title} className="flex items-center justify-between p-3 surface-data rounded-lg">
                <div>
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {w.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{w.registrations} registered</p>
                  {w.status === 'completed' && (
                    <p className="text-xs text-muted-foreground">{w.attended} attended ({Math.round((w.attended / w.registrations) * 100)}%)</p>
                  )}
                  <span className={`text-[10px] font-medium ${w.status === 'upcoming' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {w.status === 'upcoming' ? '● Upcoming' : '✓ Completed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs">
            <Video className="w-3 h-3 mr-1" /> Schedule Webinar
          </Button>
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" /> Active Campaigns
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-2">Campaign</th>
                <th className="text-label text-left px-4 py-2">Channel</th>
                <th className="text-label text-left px-4 py-2">Status</th>
                <th className="text-label text-right px-4 py-2">Leads</th>
                <th className="text-label text-right px-4 py-2">Spent</th>
                <th className="text-label text-right px-4 py-2">CPL</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c) => (
                <tr key={c.id} className="border-t border-border/50">
                  <td className="px-4 py-2.5 text-sm font-medium">{c.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.channel}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      c.status === 'active' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-right">{c.leads}</td>
                  <td className="px-4 py-2.5 text-sm text-right">{c.spent > 0 ? `£${c.spent.toLocaleString()}` : 'Free'}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-right text-primary">{c.cpl > 0 ? `£${c.cpl.toFixed(1)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
