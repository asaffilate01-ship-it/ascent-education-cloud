import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, Users, ClipboardList, Video, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LecturerDashboard() {
  return (
    <DashboardLayout title="Lecturer Dashboard" subtitle="Dr. Ahmed Khan — Business Management">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Students" value="86" icon={Users} />
        <StatCard label="Modules" value="3" icon={BookOpen} />
        <StatCard label="To Mark" value="12" change="5 overdue" changeType="negative" icon={ClipboardList} />
        <StatCard label="Classes Today" value="2" icon={Video} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Today's Teaching</h3>
          <div className="space-y-2">
            {[
              { time: '09:00', module: 'Strategic Management (L5)', room: 'Virtual Room A', students: 28 },
              { time: '14:00', module: 'Business Environment (L4)', room: 'Virtual Room B', students: 32 },
            ].map((c) => (
              <div key={c.time} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-12">{c.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.module}</p>
                  <p className="text-xs text-muted-foreground">{c.room} · {c.students} students</p>
                </div>
                <Button size="sm">Start Class</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Submissions to Mark</h3>
          <div className="space-y-2">
            {[
              { student: 'Sara Ali', assignment: 'Strategy Report', submitted: 'Mar 14', late: false },
              { student: 'Omar Farooq', assignment: 'Business Plan', submitted: 'Mar 13', late: true },
              { student: 'Zara Sheikh', assignment: 'Case Study Analysis', submitted: 'Mar 12', late: false },
            ].map((s) => (
              <div key={s.student + s.assignment} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.student}</p>
                  <p className="text-xs text-muted-foreground">{s.assignment} · {s.submitted}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.late && <span className="text-xs text-destructive font-medium">Late</span>}
                  <Button variant="outline" size="sm" className="text-xs">Mark</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
