import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { GraduationCap, BookOpen, CreditCard, Video, FileCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TenantAdminDashboard() {
  return (
    <DashboardLayout
      title="College Dashboard"
      subtitle="Lahore College of Business — Academic Overview"
      actions={<Button size="sm">+ Add Student</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students" value="342" change="+14 this term" changeType="positive" icon={GraduationCap} />
        <StatCard label="Active Courses" value="12" icon={BookOpen} />
        <StatCard label="Revenue (MTD)" value="£42,300" change="+8%" changeType="positive" icon={CreditCard} />
        <StatCard label="Live Classes Today" value="4" icon={Video} />
      </div>

      {/* Quick panels */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Upcoming Classes */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Today's Schedule</h3>
          <div className="space-y-2">
            {[
              { time: '09:00', course: 'Level 4 Business Management', lecturer: 'Dr. Khan', students: 28 },
              { time: '11:00', course: 'Level 5 Computing', lecturer: 'Ms. Fatima', students: 22 },
              { time: '14:00', course: 'Level 3 Accounting (IAB)', lecturer: 'Mr. Rashid', students: 35 },
              { time: '16:00', course: 'Level 4 IT (QUALIFI)', lecturer: 'Dr. Ahmed', students: 18 },
            ].map((cls) => (
              <div key={cls.time} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-12">{cls.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cls.course}</p>
                  <p className="text-xs text-muted-foreground">{cls.lecturer} · {cls.students} students</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs">Join</Button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Alerts */}
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Payment Alerts</h3>
          <div className="space-y-2">
            {[
              { student: 'Ali Hassan', amount: '£600', status: 'Overdue', days: '15 days' },
              { student: 'Zara Sheikh', amount: '£300', status: 'Due Today', days: 'today' },
              { student: 'Omar Farooq', amount: '£600', status: 'Partial', days: '£300 remaining' },
            ].map((p) => (
              <div key={p.student} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.student}</p>
                  <p className="text-xs text-muted-foreground">{p.amount} · {p.days}</p>
                </div>
                <StatusBadge
                  status={p.status}
                  variant={p.status === 'Overdue' ? 'danger' : p.status === 'Due Today' ? 'warning' : 'info'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Assurance */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-primary" /> Quality Assurance Status
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Internal Verification', done: 48, total: 52 },
            { label: 'Assessment Moderation', done: 36, total: 40 },
            { label: 'External Audit Prep', done: 8, total: 12 },
          ].map((qa) => (
            <div key={qa.label} className="surface-data p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{qa.label}</p>
              <p className="text-lg font-semibold">{qa.done}/{qa.total}</p>
              <div className="w-full h-1.5 bg-border rounded-full mt-2">
                <div
                  className="h-full bg-primary rounded-full transition-default"
                  style={{ width: `${(qa.done / qa.total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
