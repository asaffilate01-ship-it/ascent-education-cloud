import { useState, useEffect, useRef } from 'react';
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  useEffect(() => {
    const token = ++generation.current;
    setNotifications([]); setOpen(false); setError(''); setLoading(true);
    if (!user?.id) return;
    const current = () => generation.current === token;

    const fetchNotifs = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!current()) return;
      setLoading(false);
      if (error) { setError('Notifications could not be loaded. Open the notification centre to retry.'); return; }
      setError(''); setNotifications((data || []) as Notification[]);
    };

    void fetchNotifs().catch(() => { if (current()) { setLoading(false); setError('Notifications could not be loaded.'); } });

    const channel = supabase
      .channel('bell-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (!current() || payload.new.user_id !== user.id) return;
        setNotifications((prev) => [payload.new as Notification, ...prev.filter(n => n.id !== payload.new.id)].slice(0, 10));
      })
      .subscribe();

    return () => { generation.current++; supabase.removeChannel(channel); };
  }, [user?.id, user?.tenantId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    if (!user?.id) return;
    const token = generation.current;
    try {
      const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id).select('id').single();
      if (generation.current !== token) return;
      if (error || data?.id !== id) throw Error('Unconfirmed update');
      setError('');
    } catch { if (generation.current === token) setError('Read status could not be confirmed. Please retry.'); return; }
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
        className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-lg hover:bg-secondary transition-default relative focus-ring"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div role="menu" aria-label="Notifications" className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw_-_2rem)] max-h-[420px] overflow-y-auto bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {error && <p role="alert" className="p-3 text-xs text-destructive">{error}</p>}
            {loading ? <p role="status" className="p-4 text-sm">Loading notifications…</p> : notifications.length === 0 && !error ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              <div>
                {notifications.slice(0, 5).map((n) => {
                  const Icon = ICON_MAP[n.type] || Bell;
                  return (
                    <button type="button"
                      key={n.id}
                      onClick={() => { if (!n.read) markRead(n.id); }}
                      className={`flex w-full text-left items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-default cursor-pointer border-b border-border/50 last:border-0 ${
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
                    </button>
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
