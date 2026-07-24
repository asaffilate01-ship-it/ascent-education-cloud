import { Link } from 'react-router-dom';
import { Cloud, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openCookiePreferences } from '@/components/CookieConsent';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">UniPathway</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: 24 July 2026</p>

        <div className="rounded-xl border border-border bg-card p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-foreground">Manage your cookie preferences</p>
            <p className="text-sm text-muted-foreground">Change which optional cookies you allow at any time.</p>
          </div>
          <Button onClick={openCookiePreferences}>Cookie preferences</Button>
        </div>

        <div className="space-y-6 text-foreground/80 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. What are cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you signed in, and understand how the site is used.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Cookies we use</h2>
            <div className="grid gap-3">
              <div className="rounded-lg border border-border p-4">
                <p className="font-semibold text-foreground">Essential</p>
                <p className="text-muted-foreground">Required for authentication, security, and core functionality. These cannot be switched off.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-semibold text-foreground">Analytics</p>
                <p className="text-muted-foreground">Help us understand which pages are useful and where visitors run into problems. Only set if you opt in.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-semibold text-foreground">Marketing</p>
                <p className="text-muted-foreground">Used to show you relevant UniPathway offers on other platforms. Only set if you opt in.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Third-party cookies</h2>
            <p>When you use embedded content (e.g., YouTube videos, social media buttons), those providers may set their own cookies. We do not control those cookies; refer to the provider’s policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Your choices</h2>
            <p>You can accept or reject optional cookies from the banner when you first visit, or update your preferences at any time using the button above. You can also block cookies in your browser settings, but essential features may stop working.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Contact</h2>
            <p>For questions about this policy, email <a href="mailto:dpo@unipathway.pk" className="text-primary hover:underline">dpo@unipathway.pk</a>. See also our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
