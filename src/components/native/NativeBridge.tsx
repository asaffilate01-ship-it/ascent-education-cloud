import { PushNotifications } from '@capacitor/push-notifications';
import { nativePushConfigured } from '@/lib/nativePush';
import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_HOME, useAuth } from '@/contexts/AuthContext';
import { isNativeApp, nativeAuthCode } from '@/lib/native';
export default function NativeBridge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [destination, setDestination] = useState<'home' | 'recovery' | null>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    async function handle(url: string) {
      const callback = nativeAuthCode(url);
      if (!callback || seen.current.has(callback.code)) return;
      seen.current.add(callback.code);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
        if (error) throw error;
        await Browser.close().catch(() => undefined);
        if (!disposed) setDestination(callback.recovery ? 'recovery' : 'home');
      } catch { if (!disposed) toast.error('Sign-in link expired or could not be verified. Start sign-in again on this device.'); }
    }
    const notification = nativePushConfigured() ? PushNotifications.addListener('pushNotificationActionPerformed', () => { if (!disposed) setDestination('home'); }) : null;
    const links = App.addListener('appUrlOpen', ({ url }) => { void handle(url); });
    const lifecycle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh();
    });
    void App.getLaunchUrl().then(result => { if (!disposed && result?.url) void handle(result.url); }).catch(() => toast.error('Unable to read sign-in link.'));
    return () => { disposed = true; void notification?.then(listener => listener.remove()); void links.then(listener => listener.remove()); void lifecycle.then(listener => listener.remove()); };
  }, []);
  useEffect(() => {
    if (!destination || !user) return;
    navigate(destination === 'recovery' ? '/reset-password' : ROLE_HOME[user.role] || '/student', { replace: true });
    setDestination(null);
  }, [destination, user, navigate]);
  return null;
}
