import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Settings2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'cookie_consent_v2';
const REOPEN_EVENT = 'unipathway:open-cookie-preferences';

export type ConsentState = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const reopen = () => {
      const c = getConsent();
      if (c) {
        setAnalytics(c.analytics);
        setMarketing(c.marketing);
      }
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(REOPEN_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_EVENT, reopen);
  }, []);

  const persist = async (state: ConsentState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setVisible(false);
    setShowDetails(false);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
    // Non-blocking DB audit trail for signed-in users only (anonymous writes are rejected by RLS)
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      await supabase.from('consent_records').insert({
        user_id: userId,
        consent_type: 'cookie_consent',
        granted: state.analytics || state.marketing,
        user_agent: navigator.userAgent,
      } as any);
    } catch {
      /* localStorage is primary */
    }
  };

  const acceptAll = () =>
    persist({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() });
  const rejectAll = () =>
    persist({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() });
  const saveChoices = () =>
    persist({ essential: true, analytics, marketing, timestamp: new Date().toISOString() });

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cookie preferences"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t border-border shadow-2xl"
    >
      <div className="max-w-5xl mx-auto">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground flex-1">
              We use essential cookies to run UniPathway, and optional cookies for analytics and marketing.
              See our{' '}
              <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link> and{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(true)}>
                <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Preferences
              </Button>
              <Button variant="outline" size="sm" onClick={rejectAll}>Reject all</Button>
              <Button size="sm" onClick={acceptAll}>Accept all</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Cookie preferences</h2>
              </div>
              <button
                onClick={() => setVisible(false)}
                aria-label="Close"
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="rounded-lg border border-border p-3 bg-muted/40 cursor-not-allowed">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Essential</span>
                  <input type="checkbox" checked disabled />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Required for the site to work (auth, security).</p>
              </label>
              <label className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Analytics</span>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Helps us understand how the site is used.</p>
              </label>
              <label className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Marketing</span>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Personalised offers on our channels.</p>
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={rejectAll}>Reject all</Button>
              <Button variant="outline" size="sm" onClick={saveChoices}>Save choices</Button>
              <Button size="sm" onClick={acceptAll}>Accept all</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
