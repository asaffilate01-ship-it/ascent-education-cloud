import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const recordConsent = async (granted: boolean) => {
    const value = granted ? 'accepted' : 'declined';
    localStorage.setItem('cookie_consent', value);
    setVisible(false);

    // Persist to DB for GDPR audit trail
    try {
      await supabase.from('consent_records').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        consent_type: 'cookie_consent',
        granted,
        user_agent: navigator.userAgent,
      } as any);
    } catch {
      // Non-blocking — localStorage is the primary store
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t border-border shadow-xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to ensure the platform functions correctly. By continuing, you agree to our{' '}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{' '}
          <Link to="/privacy" className="text-primary hover:underline">Cookie Policy</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => recordConsent(false)}>Decline</Button>
          <Button size="sm" onClick={() => recordConsent(true)}>Accept All</Button>
        </div>
      </div>
    </div>
  );
}
