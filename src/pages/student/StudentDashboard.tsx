import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { BookOpen, Video, ClipboardList, BarChart3, Calendar, Clock, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function StudentDashboard() {
  return (
    <DashboardLayout title="My Dashboard" subtitle="Welcome back, Sara">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Courses', value: '3', icon: BookOpen },
          { label: 'Upcoming Classes', value: '2', change: 'today', changeType: 'neutral' as const, icon: Video },
          { label: 'Assignments Due', value: '4', change: '2 this week', changeType: 'negative' as const, icon: ClipboardList },
          { label: 'Overall Grade', value: '72%', change: 'Merit', changeType: 'positive' as const, icon: BarChart3 },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
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
                <div className="text-xs font-mono text-muted-foreground w-20 sm:w-24">{cls.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cls.module}</p>
                  <p className="text-xs text-muted-foreground">{cls.lecturer}</p>
                </div>
                <Link to="/student/classroom">
                  <Button size="sm" variant={cls.status === 'Live Now' ? 'default' : 'outline'}>
                    {cls.status === 'Live Now' ? 'Join Now' : 'View'}
                  </Button>
                </Link>
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
              <div key={d.title} className={`p-3 rounded-lg ${d.urgent ? 'bg-destructive/5 border border-destructive/20' : 'surface-data'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.module} · Due {d.due}</p>
                  </div>
                  {d.urgent && <StatusBadge status="Urgent" variant="danger" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed + Progress */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Course Progress
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Level 5 Business Management', progress: 68, grade: 'Merit', modules: '4/6' },
              { name: 'Level 4 Computing (QUALIFI)', progress: 45, grade: 'Pass', modules: '3/6' },
              { name: 'Level 3 Accounting (IAB)', progress: 82, grade: 'Merit', modules: '3/4' },
            ].map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.modules} modules · {c.grade}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{c.progress}%</span>
                </div>
                <div className="w-full h-2 bg-border rounded-full">
                  <div
                    className="h-full bg-primary rounded-full transition-default"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { action: 'Assignment graded', detail: 'Business Environment — Merit (68%)', time: '2h ago', type: 'grade' },
              { action: 'New study material uploaded', detail: 'Financial Analysis — Week 8 slides', time: '5h ago', type: 'material' },
              { action: 'Attendance recorded', detail: 'Strategic Management — Present', time: '1d ago', type: 'attendance' },
              { action: 'Fee instalment reminder', detail: '£300 due on March 20', time: '2d ago', type: 'finance' },
              { action: 'Message from Dr. Khan', detail: 'Re: Exam preparation tips', time: '3d ago', type: 'message' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'grade' ? 'bg-success' :
                  a.type === 'finance' ? 'bg-warning' :
                  a.type === 'message' ? 'bg-primary' :
                  'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
