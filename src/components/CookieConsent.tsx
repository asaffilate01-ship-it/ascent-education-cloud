import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t border-border shadow-xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to ensure the platform functions correctly. By continuing, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a> and{' '}
          <a href="#" className="text-primary hover:underline">Cookie Policy</a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={decline}>Decline</Button>
          <Button size="sm" onClick={accept}>Accept All</Button>
        </div>
      </div>
    </div>
  );
}
