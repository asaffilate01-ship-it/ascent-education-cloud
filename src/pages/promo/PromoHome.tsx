import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, GraduationCap, Video, CreditCard, ShieldCheck, Sparkles, Globe2, BarChart3, Lock,
  ArrowRight, Check, Home, LayoutGrid, Smartphone, HelpCircle, KeyRound, ChevronDown, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
import logo from '@/assets/unipathway-logo.png.asset.json';
import heroImage from '@/assets/promo-hero.jpg';
import shotDesktop from '@/assets/promo-shot-desktop.jpg';
import shotMobile from '@/assets/promo-shot-mobile.jpg';
import { COPY, detectLocale, type Locale } from '@/lib/promoContent';
import { isSiteUnlocked, unlockSite } from '@/lib/siteAccess';

const FEATURE_ICONS = [UserPlus, GraduationCap, Video, CreditCard, ShieldCheck, Sparkles, Globe2, BarChart3, Lock];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function PromoHome() {
  const navigate = useNavigate();
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const t = COPY[locale];

  // Promo page is always light — no dark mode here.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => { if (had) root.classList.add('dark'); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('up_promo_locale', locale);
  }, [locale]);

  const navItems = useMemo(
    () => [
      { id: 'top', label: t.navHome, icon: Home },
      { id: 'platform', label: t.navPlatform, icon: LayoutGrid },
      { id: 'app', label: t.navApp, icon: Smartphone },
      { id: 'faq', label: t.navFaq, icon: HelpCircle },
      { id: 'access', label: t.navAccess, icon: KeyRound },
    ],
    [t],
  );

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockSite(code)) {
      setError(false);
      navigate('/tenant/unipathway');
    } else {
      setError(true);
    }
  };

  return (
    <div id="top" className="min-h-dvh bg-background pb-20 lg:pb-0">
      <Seo
        title="UniPathway — Your Journey to University and Beyond"
        description="UniPathway is a complete education platform: accredited Level 3–5 diplomas, admissions CRM, virtual campus, finance, compliance and a mobile student app."
        canonical="/"
        noindex
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 lg:h-28 flex items-center justify-between">
          <button onClick={() => scrollToId('top')} className="flex items-center" aria-label="UniPathway">
            <img src={logo.url} alt="UniPathway" className="h-14 lg:h-24 w-auto" />
          </button>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            {navItems.map((i) => (
              <button key={i.id} onClick={() => scrollToId(i.id)} className="hover:text-primary transition-colors">
                {i.label}
              </button>
            ))}
            <div className="flex items-center rounded-full border border-border p-0.5">
              {(['en', 'de'] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    locale === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => scrollToId('access')}>
              {t.navAccess}
            </Button>
          </nav>

          <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {navItems.map((i) => (
              <button
                key={i.id}
                onClick={() => { scrollToId(i.id); setMenuOpen(false); }}
                className="block w-full text-left text-sm text-muted-foreground"
              >
                {i.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              {(['en', 'de'] as Locale[]).map((l) => (
                <Button key={l} variant={locale === l ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setLocale(l)}>
                  {l.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-success/[0.07]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl lg:text-6xl font-extrabold leading-[1.05] text-foreground">
              {t.heroTitle}
            </h1>
            <p className="mt-5 text-base lg:text-lg text-muted-foreground max-w-xl">{t.heroLead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => scrollToId('access')}>
                {t.ctaPrimary} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollToId('platform')}>
                {t.ctaSecondary}
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {t.stats.map((s) => (
                <div key={s.label} className="surface-card p-4">
                  <dt className="text-2xl font-extrabold text-primary">{s.value}</dt>
                  <dd className="text-xs text-muted-foreground mt-1 leading-snug">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-primary/15 to-success/15 blur-2xl" />
            <img
              src={heroImage}
              alt={t.heroTitle}
              width={1600}
              height={1008}
              className="relative rounded-2xl border border-border/60 shadow-2xl w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Platform */}
      <section id="platform" className="py-16 lg:py-24 scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl lg:text-4xl font-extrabold">{t.platformTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.platformLead}</p>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {t.features.map((f, idx) => {
              const Icon = FEATURE_ICONS[idx % FEATURE_ICONS.length];
              return (
                <article
                  key={f.title}
                  className="group surface-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-success/80 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                  <div className="mt-4 h-0.5 w-8 rounded-full bg-success/70 transition-all duration-300 group-hover:w-16" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Screenshots / App */}
      <section id="app" className="py-16 lg:py-24 bg-secondary/40 border-y border-border/60 scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl lg:text-4xl font-extrabold">{t.shotsTitle}</h2>
            <p className="mt-3 text-muted-foreground">{t.shotsLead}</p>
          </div>

          <div className="mt-10 grid lg:grid-cols-5 gap-6 items-start">
            <figure className="lg:col-span-3 surface-card overflow-hidden">
              <img
                src={shotDesktop}
                alt={t.shotDesktop}
                loading="lazy"
                width={1600}
                height={1008}
                className="w-full object-cover"
              />
              <figcaption className="p-5 border-t border-border/60">
                <h3 className="text-sm font-bold">{t.shotDesktop}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.shotDesktopBody}</p>
              </figcaption>
            </figure>

            <figure className="lg:col-span-2 surface-card overflow-hidden">
              <img
                src={shotMobile}
                alt={t.shotMobile}
                loading="lazy"
                width={912}
                height={1200}
                className="w-full object-cover bg-background"
              />
              <figcaption className="p-5 border-t border-border/60">
                <h3 className="text-sm font-bold">{t.shotMobile}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.shotMobileBody}</p>
                <ul className="mt-4 space-y-2">
                  {t.appPoints.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-24 scroll-mt-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-center">{t.faqTitle}</h2>
          <div className="mt-10 space-y-3">
            {t.faqs.map((f, i) => (
              <div key={f.q} className="surface-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-semibold">{f.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access gate */}
      <section id="access" className="pb-20 lg:pb-28 scroll-mt-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="surface-card p-8 lg:p-10 text-center bg-gradient-to-br from-primary/[0.06] to-success/[0.06]">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
              <KeyRound className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="mt-5 text-2xl lg:text-3xl font-extrabold">{t.accessTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.accessLead}</p>
            <form onSubmit={handleUnlock} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false); }}
                placeholder={t.accessPlaceholder}
                aria-label={t.accessPlaceholder}
                className="h-11"
              />
              <Button type="submit" size="lg" className="shrink-0">{t.accessButton}</Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{t.accessError}</p>}
            {isSiteUnlocked() && !error && (
              <p className="mt-3 text-sm text-success">{t.accessSuccess}</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center text-center gap-4">
          <img src={logo.url} alt="UniPathway" className="h-16 w-auto" loading="lazy" />
          <p className="text-sm text-muted-foreground">{t.footerTagline}</p>
          <div className="text-xs text-muted-foreground space-y-1 max-w-xl">
            <p>{t.legalDe}</p>
            <p>{t.legalRow}</p>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} UNIPATHWAY.PK — {t.rights}</p>
        </div>
      </footer>

      {/* Mobile native-style bottom navigation */}
      <nav
        aria-label={t.navHome}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-area-pb"
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((i) => (
            <button
              key={i.id}
              onClick={() => scrollToId(i.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] text-muted-foreground active:text-primary"
            >
              <i.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{i.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
