import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, Video, ClipboardList, BarChart3, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  return (
    <DashboardLayout title="My Dashboard" subtitle="Welcome back, Sara">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Courses" value="3" icon={BookOpen} />
        <StatCard label="Upcoming Classes" value="2" change="today" changeType="neutral" icon={Video} />
        <StatCard label="Assignments Due" value="4" change="2 this week" changeType="warning" icon={ClipboardList} />
        <StatCard label="Overall Grade" value="72%" change="Merit" changeType="positive" icon={BarChart3} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Today's Classes */}
        <div className="lg:col-span-2 surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Today's Classes
          </h3>
          <div className="space-y-2">
            {[
              { time: '09:00 - 10:30', module: 'Strategic Management', lecturer: 'Dr. Khan', status: 'Live Now' },
              { time: '14:00 - 15:30', module: 'Financial Analysis', lecturer: 'Mr. Rashid', status: 'Upcoming' },
            ].map((cls) => (
              <div key={cls.module} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
                <div className="text-xs font-mono text-muted-foreground w-24">{cls.time}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cls.module}</p>
                  <p className="text-xs text-muted-foreground">{cls.lecturer}</p>
                </div>
                <Button size="sm" variant={cls.status === 'Live Now' ? 'default' : 'outline'}>
                  {cls.status === 'Live Now' ? 'Join Now' : 'View'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Deadlines */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-destructive" /> Upcoming Deadlines
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Business Strategy Report', module: 'Strategic Mgmt', due: 'Mar 18', urgent: true },
              { title: 'Financial Ratio Analysis', module: 'Finance', due: 'Mar 22', urgent: false },
              { title: 'IT Project Proposal', module: 'Computing', due: 'Mar 28', urgent: false },
              { title: 'Accounting Quiz #4', module: 'IAB Accounting', due: 'Apr 1', urgent: false },
            ].map((d) => (
              <div key={d.title} className={`p-3 rounded-lg ${d.urgent ? 'bg-destructive/5' : 'surface-data'}`}>
                <p className="text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{d.module} · Due {d.due}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
