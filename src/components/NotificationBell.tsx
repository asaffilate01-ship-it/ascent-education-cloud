import { useState, useEffect } from 'react';
import { Bell, FileText, CreditCard, Settings, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
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
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications((data || []) as Notification[]);
    };

    fetchNotifs();

    const channel = supabase
      .channel('bell-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const severityBg = (s: string) => {
    if (s === 'urgent' || s === 'warning') return 'bg-warning/10';
    if (s === 'success') return 'bg-success/10';
    return 'bg-primary/10';
  };

  const severityText = (s: string) => {
    if (s === 'urgent' || s === 'warning') return 'text-warning';
    if (s === 'success') return 'text-success';
    return 'text-primary';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary transition-default relative"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((n) => {
                  const Icon = ICON_MAP[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-default cursor-pointer border-b border-border/50 last:border-0 ${
                        !n.read ? 'bg-primary/[0.03]' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${severityBg(n.severity)}`}>
                        <Icon className={`w-3.5 h-3.5 ${severityText(n.severity)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs ${!n.read ? 'font-semibold' : 'font-medium'} truncate`}>{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-primary py-3 border-t border-border hover:bg-accent/50 transition-default"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
