import DashboardLayout from '@/components/layout/DashboardLayout';
import { Bell, Check, Clock, AlertTriangle, MessageSquare, CreditCard, GraduationCap, FileText, Users, Settings, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

type NotificationType = 'all' | 'urgent' | 'academic' | 'finance' | 'system';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, any> = {
  academic: FileText,
  finance: CreditCard,
  system: Settings,
  message: MessageSquare,
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationCentre() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<NotificationType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    setNotifications((data || []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === 'all' ? notifications :
    filter === 'urgent' ? notifications.filter(n => n.severity === 'warning' || n.severity === 'urgent') :
    notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true } as any).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const severityColor = (s: string) => {
    if (s === 'urgent' || s === 'warning') return 'text-warning';
    if (s === 'success') return 'text-success';
    return 'text-primary';
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="w-3.5 h-3.5 mr-1.5" />Mark All Read</Button>
        </div>
      }
    >
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
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
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-default whitespace-nowrap ${
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
          const Icon = ICON_MAP[n.type] || Bell;
          return (
            <div
              key={n.id}
              className={`surface-card p-4 flex items-start gap-3 transition-default hover:shadow-lg cursor-pointer ${
                !n.read ? 'border-l-3 border-l-primary bg-primary/[0.02]' : ''
              }`}
              onClick={() => !n.read && markRead(n.id)}
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
                <p className="text-[10px] text-muted-foreground mt-1.5">{timeAgo(n.created_at)}</p>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="surface-card p-12 text-center text-muted-foreground text-sm">No notifications</div>
        )}
      </div>
    </DashboardLayout>
  );
}
