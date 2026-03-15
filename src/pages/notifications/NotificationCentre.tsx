import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bell, Check, Clock, AlertTriangle, MessageSquare, CreditCard, GraduationCap, FileText, Users, Settings, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type NotificationType = 'all' | 'urgent' | 'academic' | 'finance' | 'system';

const NOTIFICATIONS = [
  { id: '1', title: 'Assignment deadline approaching', message: 'Business Strategy Report is due in 3 days (Mar 18)', type: 'academic', time: '10 min ago', read: false, icon: FileText, severity: 'warning' },
  { id: '2', title: 'Fee instalment due', message: 'Your next instalment of £400 is due on March 20', type: 'finance', time: '1 hour ago', read: false, icon: CreditCard, severity: 'urgent' },
  { id: '3', title: 'New message from Dr. Khan', message: 'Please review the updated slides for Week 9 on Porter\'s Value Chain', type: 'academic', time: '2 hours ago', read: false, icon: MessageSquare, severity: 'info' },
  { id: '4', title: 'Grade released', message: 'Marketing Environment Report graded: 72% (Merit)', type: 'academic', time: '5 hours ago', read: true, icon: GraduationCap, severity: 'success' },
  { id: '5', title: 'Attendance warning', message: 'Your attendance in Strategic Management is 75% — below the 80% threshold', type: 'academic', time: '1 day ago', read: true, icon: AlertTriangle, severity: 'warning' },
  { id: '6', title: 'Class cancelled', message: 'Financial Analysis class on March 17 has been rescheduled to March 19', type: 'academic', time: '1 day ago', read: true, icon: Clock, severity: 'info' },
  { id: '7', title: 'Document verified', message: 'Your passport scan has been verified by the admissions team', type: 'system', time: '2 days ago', read: true, icon: Check, severity: 'success' },
  { id: '8', title: 'New internship opportunity', message: 'TechCorp Pakistan is offering a Business Analyst internship in Lahore', type: 'system', time: '3 days ago', read: true, icon: Users, severity: 'info' },
  { id: '9', title: 'Payment received', message: 'Payment of £400 received for instalment 3/6', type: 'finance', time: '5 days ago', read: true, icon: CreditCard, severity: 'success' },
  { id: '10', title: 'Exam schedule published', message: 'Final exams for Level 5 modules are scheduled for May 12-16', type: 'academic', time: '1 week ago', read: true, icon: FileText, severity: 'info' },
];

export default function NotificationCentre() {
  const [filter, setFilter] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const filtered = filter === 'all' ? notifications :
    filter === 'urgent' ? notifications.filter(n => n.severity === 'warning' || n.severity === 'urgent') :
    notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const severityColor = (s: string) => {
    if (s === 'urgent' || s === 'warning') return 'text-warning';
    if (s === 'success') return 'text-success';
    return 'text-primary';
  };

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={`${unreadCount} unread notifications`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="w-3.5 h-3.5 mr-1.5" />Mark All Read</Button>
          <Button variant="outline" size="sm"><Settings className="w-3.5 h-3.5 mr-1.5" />Preferences</Button>
        </div>
      }
    >
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        {([
          { key: 'all', label: 'All' },
          { key: 'urgent', label: 'Urgent' },
          { key: 'academic', label: 'Academic' },
          { key: 'finance', label: 'Finance' },
          { key: 'system', label: 'System' },
        ] as { key: NotificationType; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-default ${
              filter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className={`surface-card p-4 flex items-start gap-3 transition-default hover:shadow-lg cursor-pointer ${
                !n.read ? 'border-l-3 border-l-primary bg-primary/[0.02]' : ''
              }`}
              onClick={() => setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif))}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                n.severity === 'urgent' || n.severity === 'warning' ? 'bg-warning/10' :
                n.severity === 'success' ? 'bg-success/10' : 'bg-primary/10'
              }`}>
                <Icon className={`w-4 h-4 ${severityColor(n.severity)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{n.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
