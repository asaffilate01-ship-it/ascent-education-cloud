import { GraduationCap, BookOpen, Users, ArrowRight, Shield, Video, MapPin, Phone, Mail, Loader2, CheckCircle, Star, Clock, Globe, Award, Sparkles, ChevronRight, Play, Target, Zap, Flame, Home, Banknote, Plane, Heart, TrendingDown, BadgeCheck, Briefcase, Building2, Laptop, Stethoscope, Calculator, FileText, UserCheck, Handshake, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import { TenantTheme } from '@/types/platform';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import TenantNav from '@/components/TenantNav';
import tenantHero from '@/assets/tenant-hero.jpg';
import SocialIcons from '@/components/SocialIcons';
import { openCookiePreferences } from '@/components/CookieConsent';

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#b91c1c',
  accentColor: '#16a34a',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter',
  heroTitle: 'Your Gateway to Global Qualifications',
  heroSubtitle: 'Study OTHM, QUALIFI & IAB accredited Level 3–5 diplomas 80% online. Progress to universities in the UK, USA, Australia, Canada, Germany & beyond.',
  heroImageUrl: '',
  customDomain: '',
  brandName: 'UniPathway',
};

export default function TenantLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenant() {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase
        .from('tenants_public')
        .select('name, slug, primary_color, accent_color, logo_url, brand_name')
        .eq('slug', slug)
        .single();
      const t = data as any;
      if (t) {
        setTheme({
          primaryColor: t.primary_color || DEFAULT_THEME.primaryColor,
          accentColor: t.accent_color || DEFAULT_THEME.accentColor,
          logoUrl: t.logo_url || '',
          faviconUrl: '',
          fontFamily: 'Inter',
          heroTitle: `Your Gateway to Global Qualifications`,
          heroSubtitle: 'Study internationally recognised diplomas from Pakistan. 80% online, 20% in-centre. Progress to UK, USA, Australia, Canada & Germany. Save 50–70% vs studying abroad.',
          heroImageUrl: '',
          customDomain: t.custom_domain || '',
          brandName: t.brand_name || t.name,
        });
      }
      setLoading(false);
    }
    fetchTenant();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pc = theme.primaryColor;

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: theme.fontFamily }}>
      <TenantNav brandName={theme.brandName} primaryColor={pc} activePage="home" />

      {/* ─── PROMO BANNER ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${pc}, ${pc}dd, ${theme.accentColor})` }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-white">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 animate-pulse" />
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">SEPTEMBER 2026 INTAKE NOW OPEN</span>
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-sm sm:text-base font-medium opacity-95">
            Secure your seat for the <span className="font-bold underline decoration-2 underline-offset-2">September start</span> — limited places.
          </span>
          <Link to="/apply">
            <Button size="sm" className="bg-white hover:bg-white/90 font-bold shadow-lg" style={{ color: pc }}>
              <Zap className="w-4 h-4 mr-1" /> Enrol Now
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${pc}06 0%, transparent 40%), linear-gradient(200deg, transparent 60%, ${theme.accentColor}04 100%)` }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl -z-10" style={{ background: `${pc}05` }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full mb-8 border" style={{ backgroundColor: `${pc}08`, color: pc, borderColor: `${pc}15` }}>
                <Award className="w-3.5 h-3.5" />
                <span>OTHM · QUALIFI · IAB Accredited Centre</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-[1.08]">
                {theme.heroTitle}
              </h1>

              <p className="text-lg text-muted-foreground mt-6 leading-relaxed max-w-lg">
                {theme.heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <Link to="/apply">
                  <Button size="lg" className="h-13 px-10 text-base shadow-lg w-full sm:w-auto" style={{ backgroundColor: pc }}>
                    Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to={`/tenant/${slug}/courses`}>
                  <Button variant="outline" size="lg" className="h-13 text-base w-full sm:w-auto">
                    View Courses
                  </Button>
                </Link>
              </div>

              {/* Micro stats */}
              <div className="grid grid-cols-4 gap-6 mt-14 pt-8 border-t border-border/50">
                {[
                  { value: '342+', label: 'Students' },
                  { value: '50–70%', label: 'Cost Savings' },
                  { value: '80%', label: 'Online' },
                  { value: '95%', label: 'Pass Rate' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: pc }}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right side — hero image */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl" style={{ background: `linear-gradient(135deg, ${pc}15, transparent)` }} />
                <img
                  src={theme.heroImageUrl || tenantHero}
                  alt={`${theme.brandName} students learning together`}
                  className="w-full rounded-2xl shadow-2xl border border-border/30 object-cover aspect-[16/10]"
                  loading="eager"
                />
                {/* Floating stats card */}
                <div className="absolute -bottom-6 -left-6 surface-card p-4 rounded-xl shadow-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}15` }}>
                      <GraduationCap className="w-5 h-5" style={{ color: pc }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">95% Pass Rate</p>
                      <p className="text-[10px] text-muted-foreground">Across all programmes</p>
                    </div>
                  </div>
                </div>
                {/* Floating accreditation badge */}
                <div className="absolute -top-4 -right-4 surface-card px-4 py-2 rounded-full shadow-xl border border-border/50">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Shield className="w-4 h-4" style={{ color: pc }} />
                    <span>UK Accredited</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── WHY US ─── */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Why Choose Us</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Why Study With {theme.brandName}?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, title: 'Globally Recognised Qualifications', desc: 'Study OTHM, QUALIFI, and IAB accredited courses — recognised by universities across the UK, USA, Canada, Australia, and beyond.' },
              { icon: Video, title: '80% Online Learning', desc: 'Join HD live lectures from home. Interactive whiteboard, breakout rooms, and all sessions recorded for 24/7 playback.' },
              { icon: MapPin, title: '20% In-Centre Experience', desc: 'Attend 2 residential weeks per year for workshops, presentations, tutor meetings, and formal examinations.' },
              { icon: Target, title: 'Global University Progression', desc: 'Clear academic pathways to top-up your diploma to a full bachelor\'s degree at partner universities in UK, USA, Australia, Canada & Germany.' },
              { icon: Shield, title: 'Full QA Compliance', desc: 'Every assignment is moderated, plagiarism-checked, and verified to meet awarding body standards.' },
              { icon: Users, title: 'Career Support', desc: 'Access job listings, CV builder, and employer partner internships through our integrated career portal.' },
            ].map((f) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:border-primary/15 hover:shadow-xl transition-all group"
              >
                <div className="p-3 rounded-xl w-fit mb-5 transition-all" style={{ backgroundColor: `${pc}08` }}>
                  <f.icon className="w-6 h-6" style={{ color: pc }} />
                </div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STUDY FROM HOME & SAVE ─── */}
      <section className="py-20 sm:py-28" style={{ background: `linear-gradient(180deg, ${pc}04 0%, transparent 100%)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>The Smart Way to a Global Degree</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Study 2 Years from Home. <br className="hidden sm:block" /><span style={{ color: pc }}>Final Year Abroad.</span> Same Degree.</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-base leading-relaxed">
              Complete your Level 4 &amp; 5 diplomas from the comfort of home in Pakistan, then fly out for just the final top-up year at a partner university in the UK, USA, Australia, Canada or Germany. You graduate with the <strong>exact same degree</strong> as students who studied all 3 years on campus.
            </p>
          </div>

          {/* Savings comparison */}
          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="surface-card p-8 border-2 border-border/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground rounded-bl-lg">Traditional Route</div>
              <h3 className="text-lg font-bold text-muted-foreground mb-6 mt-4">3-Year Degree Abroad</h3>
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Tuition (3 years × £15,000+)', value: '£45,000–£60,000+' },
                  { label: 'Living costs (3 years)', value: '£36,000–£45,000' },
                  { label: 'Visa & flights', value: '£3,000–£5,000' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/50 pt-4 flex justify-between items-center">
                <span className="text-sm font-bold">Total Cost</span>
                <span className="text-2xl font-extrabold text-destructive">Rs. 3–4+ Crore</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="surface-card p-8 border-2 relative overflow-hidden" style={{ borderColor: pc }}
            >
              <div className="absolute top-0 right-0 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg text-white" style={{ backgroundColor: pc }}>{theme.brandName} Route</div>
              <h3 className="text-lg font-bold mb-6 mt-4" style={{ color: pc }}>2 Years Home + 1 Year Abroad</h3>
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Level 4 & 5 at home (2 years)', value: 'Rs. 16–18 Lakh' },
                  { label: 'Final year top-up abroad', value: '£9,000–£15,000' },
                  { label: 'Living costs (1 year only)', value: '£12,000–£15,000' },
                  { label: 'Visa & flights', value: '£2,000–£3,000' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: `${pc}30` }}>
                <span className="text-sm font-bold">Total Cost</span>
                <span className="text-2xl font-extrabold" style={{ color: pc }}>Rs. 70–95 Lakh</span>
              </div>
              <div className="mt-4 rounded-lg p-3 text-center" style={{ backgroundColor: `${pc}08` }}>
                <p className="text-sm font-bold" style={{ color: pc }}>
                   <TrendingDown className="w-4 h-4 inline mr-1" />
                   You save Rs. 2–3+ Crore on a 3-year degree
                </p>
              </div>
            </motion.div>
          </div>

          {/* Benefits grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Home, title: 'Study from Home', desc: 'Complete 2 years of your degree from the comfort of your own home. No relocation, no homesickness, no expensive rent abroad.' },
              { icon: BadgeCheck, title: 'Same Degree Certificate', desc: "Your final degree certificate is identical — it doesn't mention where you studied Years 1 & 2. Employers see the same prestigious university name." },
              { icon: Banknote, title: 'Save Rs. 2.5+ Crore', desc: 'For a 3-year degree, save over Rs. 2.5 Crore in tuition and living costs. For 4-year degrees, savings exceed Rs. 3.5 Crore.' },
              { icon: Heart, title: 'Family & Support', desc: 'Stay close to family during the crucial first 2 years. Enjoy home-cooked meals, familiar surroundings, and zero culture shock while studying.' },
              { icon: Plane, title: 'Just 1 Year Abroad', desc: 'Fly out only for the final top-up year. Experience international campus life, build global networks, and graduate in person — all in 12 months.' },
              { icon: Globe, title: 'Global Career Options', desc: 'A UK/Australian/Canadian degree opens doors worldwide. Access post-study work visas (UK Graduate Route — currently 2 years, reducing to 18 months from 2027; Australia 2–4 year; Canada 3-year PGWP).' },
              { icon: Shield, title: 'UK-Regulated Quality', desc: 'Your Level 4 & 5 qualifications are regulated by Ofqual and recognised by OTHM, QUALIFI & IAB — the same standards as studying in the UK.' },
              { icon: Star, title: 'No Compromise on Learning', desc: 'HD live lectures, recorded sessions, virtual classrooms, e-library access, dedicated tutors, and 2 residential weeks per year for in-person experience.' },
            ].map((b) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-6 border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="p-2.5 rounded-xl w-fit mb-4" style={{ backgroundColor: `${pc}08` }}>
                  <b.icon className="w-5 h-5" style={{ color: pc }} />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{b.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link to="/apply">
              <Button size="lg" className="h-13 px-12 text-base shadow-lg" style={{ backgroundColor: pc }}>
                Start Your Journey — Apply Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">No application fee · Decision within 48 hours</p>
          </div>
        </div>
      </section>

      {/* ─── GERMANY ROUTE ─── */}
      <section className="py-20 sm:py-28 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>
              🇩🇪 Study in Germany
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">
              The Germany Route — Low Tuition, World-Class Degrees
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-base leading-relaxed">
              Public universities in Germany charge little or no tuition — most students pay only a semester contribution (approx. €150–€350). Combine that with an 18-month post-study job-seeker visa and you have one of the strongest global pathways for Pakistani and overseas students.
            </p>
          </div>

          {/* Route steps */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              { step: '1', title: 'Assess Equivalency', desc: 'HSSC / A-Level / Bachelor recognition via Anabin & uni-assist. Studienkolleg may be required before bachelor entry.' },
              { step: '2', title: 'Reach Language Level', desc: 'German B1–B2 for German-taught programmes, or IELTS 6.0–6.5 / TOEFL for English-taught masters.' },
              { step: '3', title: 'Apply & Blocked Account', desc: 'Apply through uni-assist / directly. Open a Sperrkonto with approx. €11,904 for the first year of living costs.' },
              { step: '4', title: 'Student Visa & Arrival', desc: 'National D visa via the German mission, health insurance, and city registration on arrival.' },
            ].map((s) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-6 border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold mb-4" style={{ backgroundColor: `${pc}12`, color: pc }}>
                  {s.step}
                </div>
                <h3 className="text-sm font-bold mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Required language courses */}
          <div className="surface-card p-6 sm:p-8 border border-border/50 rounded-2xl mb-8">
            <div className="flex items-start gap-3 mb-6">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${pc}10` }}>
                <BookOpen className="w-5 h-5" style={{ color: pc }} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Language Courses Required for Germany</h3>
                <p className="text-sm text-muted-foreground mt-1">Most German-taught bachelor's programmes need B2 (some require C1). English-taught masters usually accept IELTS 6.0–6.5.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { code: 'A1', title: 'German A1 — Foundations', hours: '80 hrs · 8 wks', fee: 'Rs.28,000', note: 'Alphabet, greetings, basic present tense.' },
                { code: 'A2', title: 'German A2 — Elementary', hours: '100 hrs · 10 wks', fee: 'Rs.34,000', note: 'Past tenses, everyday topics, forms.' },
                { code: 'B1', title: 'German B1 — Intermediate', hours: '120 hrs · 12 wks', fee: 'Rs.42,000', note: 'Independent user level — apprenticeships, integration.' },
                { code: 'B2', title: 'German B2 — Upper Intermediate', hours: '140 hrs · 14 wks', fee: 'Rs.52,000', note: 'Required for most German-taught degrees.', highlight: true },
                { code: 'TestDaF', title: 'TestDaF Preparation', hours: '40 hrs · 4 wks', fee: 'Rs.24,000', note: 'Preparation only — exam booked with authorised centre.', prep: true },
                { code: 'telc', title: 'telc Deutsch B1/B2 Prep', hours: '32 hrs · 4 wks', fee: 'Rs.22,000', note: 'Preparation only — certificate issued by telc.', prep: true },
                { code: 'Goethe', title: 'Goethe-Zertifikat Prep', hours: '32 hrs · 4 wks', fee: 'Rs.22,000', note: 'Preparation only — certificate by Goethe-Institut.', prep: true },
                { code: 'IELTS', title: 'IELTS Academic Prep', hours: '48 hrs · 6 wks', fee: 'Rs.22,000', note: 'For English-taught masters in Germany.', prep: true },
              ].map((c) => (
                <div key={c.code} className={`rounded-xl border p-4 ${c.highlight ? 'border-primary/40' : 'border-border/50'}`} style={c.highlight ? { borderColor: pc, backgroundColor: `${pc}05` } : undefined}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${pc}12`, color: pc }}>{c.code}</span>
                    {c.prep && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">Prep only</span>}
                    {c.highlight && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: pc, color: 'white' }}>Recommended</span>}
                  </div>
                  <h4 className="text-sm font-bold mb-1 leading-snug">{c.title}</h4>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{c.note}</p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                    <span className="text-muted-foreground">{c.hours}</span>
                    <span className="font-bold" style={{ color: pc }}>{c.fee}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground italic mt-5">
              Preparation courses do not include the official examination fee, sitting or certification — those are issued exclusively by the authorised exam body (TestDaF-Institut, telc, Goethe-Institut, British Council/IDP, Pearson, ETS).
            </p>
          </div>

          {/* Cost snapshot */}
          <div className="grid sm:grid-cols-3 gap-5 mb-10">
            {[
              { icon: Banknote, label: 'Tuition (public universities)', value: '€0 – €1,500 / yr', note: 'Semester fee ~€150–€350' },
              { icon: Home, label: 'Blocked account (Sperrkonto)', value: '≈ €11,904 / yr', note: 'For first-year living costs' },
              { icon: Briefcase, label: 'Post-study visa', value: '18 months', note: 'Job-seeker residence permit' },
            ].map((k) => (
              <div key={k.label} className="surface-card p-5 border border-border/50 rounded-xl">
                <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: `${pc}10` }}>
                  <k.icon className="w-4 h-4" style={{ color: pc }} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                <p className="text-xl font-extrabold mt-1" style={{ color: pc }}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{k.note}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link to={`/tenant/${slug}/germany`}>
              <Button size="lg" style={{ backgroundColor: pc }}>
                Explore the Germany Route <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-[11px] text-muted-foreground mt-3 max-w-2xl mx-auto">
              Indicative figures — verify current DAAD Pakistan and Make it in Germany guidance at the time of application. Admission and visa decisions rest with the receiving institution and the competent German authority.
            </p>
          </div>
        </div>
      </section>

      {/* ─── COURSES ─── */}
      <section id="courses" className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Our Programmes</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Internationally Recognised Qualifications</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Choose from business, computing, and accounting pathways at Level 3–5</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Level 4 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6, progression: 'BA (Hons) Business Management Top-Up', unis: '🇬🇧 Sunderland · 🇬🇧 Anglia Ruskin · 🇬🇧 Derby · 🇬🇧 Bolton · 🇬🇧 Middlesex · 🇬🇧 London South Bank · 🇬🇧 Birmingham City · 🇺🇸 Westcliff · 🇦🇺 Torrens · 🇨🇦 Yorkville' },
              { title: 'Level 5 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: 'Rs.880,000', gbp: '£2,200', credits: 120, modules: 6, progression: 'BA (Hons) Business Management Final Year', unis: '🇬🇧 Sunderland · 🇬🇧 Anglia Ruskin · 🇬🇧 Chichester · 🇬🇧 Derby · 🇬🇧 Portsmouth · 🇬🇧 Middlesex · 🇬🇧 Birmingham City · 🇺🇸 Westcliff · 🇦🇺 Torrens · 🇨🇦 Royal Roads' },
              { title: 'Level 3 Diploma in Childcare & Education', body: 'OTHM', duration: '9 months', fee: 'Rs.560,000', gbp: '£1,400', credits: 60, modules: 4, progression: 'Progress to Level 4 Early Years', unis: '🇬🇧 Open University · 🇬🇧 Sunderland · 🇬🇧 Wolverhampton · 🇬🇧 Cumbria · 🇦🇺 Charles Sturt' },
              { title: 'Level 4 Diploma in Childcare & Education', body: 'OTHM', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6, progression: 'BA (Hons) Early Childhood Studies Top-Up', unis: '🇬🇧 Sunderland · 🇬🇧 Wolverhampton · 🇬🇧 Cumbria · 🇬🇧 Bedfordshire · 🇬🇧 Plymouth Marjon · 🇦🇺 Charles Sturt · 🇨🇦 Athabasca' },
              { title: 'Level 3 Certificate in Accounting', body: 'IAB', duration: '9 months', fee: 'Rs.560,000', gbp: '£1,400', credits: 60, modules: 4, progression: 'Progress to Level 4 Accounting', unis: '🇬🇧 Bolton · 🇬🇧 Chichester · 🇬🇧 London South Bank · 🇬🇧 Northampton · 🇦🇺 Deakin' },
              { title: 'Level 4 Diploma in Accounting & Finance', body: 'IAB', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6, progression: 'BSc (Hons) Accounting & Finance Top-Up', unis: '🇬🇧 Bolton · 🇬🇧 Chichester · 🇬🇧 Northampton · 🇬🇧 Huddersfield · 🇬🇧 London South Bank · 🇦🇺 Deakin · 🇺🇸 LSUS' },
              { title: 'Level 4 Diploma in Computing & IT', body: 'QUALIFI', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6, progression: 'BSc (Hons) Computer Science Top-Up', unis: '🇬🇧 UCLan · 🇬🇧 Wolverhampton · 🇬🇧 Derby · 🇬🇧 Staffordshire · 🇬🇧 De Montfort · 🇬🇧 East London · 🇺🇸 LSUS · 🇦🇺 ECU · 🇨🇦 Yorkville' },
              { title: 'Level 5 Diploma in Computing & IT', body: 'QUALIFI', duration: '12 months', fee: 'Rs.880,000', gbp: '£2,200', credits: 120, modules: 6, progression: 'BSc (Hons) Computer Science Final Year', unis: '🇬🇧 UCLan · 🇬🇧 Wolverhampton · 🇬🇧 Sunderland · 🇬🇧 Leicester · 🇬🇧 Staffordshire · 🇬🇧 Northumbria · 🇬🇧 Lincoln · 🇺🇸 LSUS · 🇦🇺 ECU · 🇨🇦 Yorkville' },
            ].map((course) => (
              <motion.div key={course.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-5 hover:shadow-xl transition-all cursor-pointer group border border-border/50 hover:border-primary/15 flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ backgroundColor: `${pc}10`, color: pc }}>
                    {course.body}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{course.credits} credits</span>
                </div>
                <h3 className="text-sm font-bold mb-2 group-hover:text-primary transition-all leading-snug">{course.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.modules} modules</span>
                </div>
                {/* Degree progression */}
                <div className="rounded-lg p-2.5 mb-3 border border-border/40" style={{ backgroundColor: `${pc}04` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: pc }}>
                    <GraduationCap className="w-3 h-3 inline mr-1" />Progression
                  </p>
                  <p className="text-xs font-semibold text-foreground leading-snug">{course.progression}</p>
                </div>
                {/* Partner unis */}
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Partner Universities</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{course.unis}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                  <div>
                    <span className="text-lg font-extrabold" style={{ color: pc }}>POA</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">Price on Application</span>
                  </div>
                  <Link to="/apply">
                    <Button size="sm" variant="outline" className="text-xs font-semibold">Apply <ArrowRight className="w-3 h-3 ml-1" /></Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to={`/tenant/${slug}/courses`}>
              <Button variant="outline" size="lg">View All Courses <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </div>

          {/* Entry Requirements */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="max-w-4xl mx-auto mt-14 surface-card p-6 sm:p-8 border border-border/50"
          >
            <h3 className="text-base sm:text-lg font-bold mb-5 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: pc }} />
              Entry Requirements
            </h3>

            {/* Level-specific */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { level: 'Level 3', academic: 'Matric / O-Levels or equivalent', english: 'IELTS 5.0+', age: '16+' },
                { level: 'Level 4', academic: 'Level 3 qualification or A-Levels', english: 'IELTS 5.5+', age: '17+' },
                { level: 'Level 5', academic: 'Level 4 diploma or equivalent', english: 'IELTS 6.0+', age: '18+' },
              ].map((r) => (
                <div key={r.level} className="rounded-xl border border-border/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: pc }}>{r.level}</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Academic:</span> {r.academic}</p>
                    <p><span className="font-medium text-foreground">English:</span> {r.english}</p>
                    <p><span className="font-medium text-foreground">Age:</span> {r.age}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* General requirements */}
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: pc }}>All Students Also Need</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  'Laptop or desktop computer (min 8 GB RAM recommended)',
                  'Reliable internet connection (min 10 Mbps)',
                  '2 × 5-day intensive residential workshops per academic year at our campus',
                  'Passport / CNIC copy and academic transcripts (verified during enrolment)',
                  'All qualifications and ID documents will be verified before admission',
                ].map((req) => (
                  <div key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: pc }} />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PATHWAYS ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Academic Pathways</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Your Route to a Global Degree</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Complete Level 4 & 5 in Pakistan, then top-up to a full bachelor's degree at universities in the UK, USA, Australia, Canada or Germany</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Business Management', body: 'OTHM', degree: 'BA (Hons) Business Management', levels: ['Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BA (Hons) Top-Up (Year 3)'], unis: ['🇬🇧 Sunderland', '🇬🇧 Anglia Ruskin', '🇬🇧 Bolton', '🇬🇧 Derby', '🇬🇧 Middlesex', '🇬🇧 London South Bank', '🇬🇧 Birmingham City', '🇬🇧 Chichester', '🇬🇧 Portsmouth', '🇺🇸 Westcliff', '🇦🇺 Torrens', '🇨🇦 Royal Roads', '🇨🇦 Yorkville'] },
              { title: 'Childcare & Education', body: 'OTHM', degree: 'BA (Hons) Early Childhood Studies', levels: ['Level 3 Diploma (Foundation)', 'Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BA (Hons) Top-Up (Year 3)'], unis: ['🇬🇧 Sunderland', '🇬🇧 Wolverhampton', '🇬🇧 Open University', '🇬🇧 Cumbria', '🇬🇧 Bedfordshire', '🇬🇧 Plymouth Marjon', '🇦🇺 Charles Sturt', '🇨🇦 Athabasca'] },
              { title: 'Accounting & Finance', body: 'IAB', degree: 'BSc (Hons) Accounting & Finance', levels: ['Level 3 Certificate (Foundation)', 'Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BSc (Hons) Top-Up (Year 3)'], unis: ['🇬🇧 Bolton', '🇬🇧 Chichester', '🇬🇧 Northampton', '🇬🇧 Huddersfield', '🇬🇧 London South Bank', '🇦🇺 Deakin', '🇺🇸 LSUS'] },
              { title: 'Computing & IT', body: 'QUALIFI', degree: 'BSc (Hons) Computer Science', levels: ['Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BSc (Hons) Top-Up (Year 3)'], unis: ['🇬🇧 UCLan', '🇬🇧 Leicester', '🇬🇧 Wolverhampton', '🇬🇧 Derby', '🇬🇧 Staffordshire', '🇬🇧 De Montfort', '🇬🇧 East London', '🇬🇧 Northumbria', '🇬🇧 Lincoln', '🇬🇧 Sunderland', '🇺🇸 LSUS', '🇦🇺 ECU', '🇨🇦 Yorkville'] },
            ].map((path) => (
              <motion.div key={path.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:shadow-xl transition-all"
              >
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold">{path.title}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${pc}10`, color: pc }}>{path.body}</span>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: pc }}>→ {path.degree}</p>
                </div>
                <div className="space-y-3 mb-6">
                  {path.levels.map((level, i) => (
                    <div key={level} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: `${pc}${10 + i * 5}`, color: pc }}>
                        {i + 1}
                      </div>
                      <span className="text-sm leading-snug">{level}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Partner Universities</p>
                  <div className="flex flex-wrap gap-2">
                    {path.unis.map(u => (
                      <span key={u} className="text-xs font-medium bg-secondary px-3 py-1 rounded-full">{u}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROGRAMME CAREER OUTCOMES ─── */}
      <section className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Career-Focused Education</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Programmes That Lead to Real Careers</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Every programme is designed with career outcomes in mind — from internships to professional qualifications like ACCA.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: Briefcase, title: 'Business Management', tagline: 'Build your business career and complete your degree abroad.',
                careers: ['Business Manager', 'Marketing Executive', 'Entrepreneur', 'Operations Manager'],
                internships: ['Corporate offices', 'Marketing agencies', 'Retail & logistics companies'],
                progression: ['UK degree (final year entry)', 'MBA pathway', 'Global business careers'],
              },
              {
                icon: Laptop, title: 'Information Technology / Computing', tagline: 'Start your tech career in Pakistan and work globally.',
                careers: ['Software Developer', 'IT Engineer', 'Cybersecurity Analyst', 'Data Analyst'],
                internships: ['Software houses', 'IT companies', 'Startups'],
                progression: ['BSc Computer Science abroad', 'AI & Data Science pathways'],
              },
              {
                icon: Calculator, title: 'Accounting & Finance', tagline: 'Start your accounting career and progress to ACCA or a UK degree.',
                careers: ['Accountant', 'Financial Analyst', 'Auditor', 'Finance Manager'],
                internships: ['Accounting firms', 'Audit firms', 'Corporate finance departments'],
                progression: ['UK finance degree', 'ACCA qualification pathway', 'Global accounting careers'],
                acca: true,
              },
              {
                icon: Stethoscope, title: 'Health & Social Care', tagline: 'Pathway to international healthcare careers.',
                careers: ['Care Assistant', 'Healthcare Support Worker', 'Care Coordinator'],
                internships: ['Care homes', 'Clinics', 'Healthcare organisations'],
                progression: ['Healthcare degrees abroad', 'Global care sector opportunities'],
              },
            ].map((prog) => (
              <motion.div key={prog.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: `${pc}08` }}>
                    <prog.icon className="w-6 h-6" style={{ color: pc }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{prog.title}</h3>
                    <p className="text-sm text-muted-foreground italic mt-1">"{prog.tagline}"</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: pc }}>💼 Career Outcomes</p>
                    <ul className="space-y-1">
                      {prog.careers.map(c => (
                        <li key={c} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 shrink-0" style={{ color: pc }} />{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: pc }}>🏢 Internships</p>
                    <ul className="space-y-1">
                      {prog.internships.map(i => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 shrink-0" style={{ color: pc }} />{i}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-lg p-3 border border-border/40 mb-3" style={{ backgroundColor: `${pc}04` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: pc }}>🌍 Progression</p>
                  <div className="flex flex-wrap gap-2">
                    {prog.progression.map(p => (
                      <span key={p} className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>

                {prog.acca && (
                  <div className="rounded-lg p-3 border-2" style={{ borderColor: `${pc}30`, backgroundColor: `${pc}06` }}>
                    <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: pc }}>
                      <Award className="w-4 h-4" /> ACCA Progression Pathway
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Students completing this programme can progress towards ACCA qualification via the Association of Chartered Certified Accountants, receive guidance on exemptions, and prepare for professional accounting careers.
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INTERNSHIPS ACROSS PAKISTAN ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Work Experience</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Internships Across Pakistan</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Gain real-world experience alongside your studies. We connect students with employers across major cities and industries.</p>
          </div>

          {/* Industry sectors */}
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
            {[
              { icon: Building2, label: 'Corporate Internships' },
              { icon: Laptop, label: 'IT Companies' },
              { icon: Calculator, label: 'Accounting Firms' },
              { icon: Stethoscope, label: 'Healthcare Providers' },
              { icon: Briefcase, label: 'SMEs & Startups' },
            ].map((sector) => (
              <motion.div key={sector.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-5 text-center border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${pc}08` }}>
                  <sector.icon className="w-5 h-5" style={{ color: pc }} />
                </div>
                <p className="text-sm font-bold">{sector.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Cities */}
          <div className="surface-card p-8 border border-border/50 text-center">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: pc }}>📍 Available in Major Cities</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan'].map(city => (
                <span key={city} className="text-sm font-semibold px-5 py-2.5 rounded-full border border-border/50 bg-secondary">
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STUDENT JOURNEY ─── */}
      <section className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Your Path</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">The Student Journey</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">From enrolment in Pakistan to graduating abroad — here's your path to a global career.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            {[
              { step: '1', title: 'Enrol in Pakistan', desc: 'Apply online, get accepted within 48 hours, and begin your studies.' },
              { step: '2', title: 'Study Level 3 → Level 4 → Level 5', desc: '80% online live lectures + 20% in-centre residential workshops and exams.' },
              { step: '3', title: 'Gain Internship Experience', desc: 'Access corporate internships across Pakistan in your chosen field.' },
              { step: '4', title: 'Transfer to International University', desc: 'Progress to partner universities in UK, Canada, Australia, or UAE.' },
              { step: '5', title: 'Graduate Abroad', desc: 'Complete your final year on campus and receive the same degree as full-time students.' },
              { step: '6', title: 'Start Your Global Career', desc: 'Access post-study work visas and begin your international career.' },
            ].map((item, i) => (
              <motion.div key={item.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="flex gap-5 mb-1 last:mb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0" style={{ backgroundColor: pc }}>
                    {item.step}
                  </div>
                  {i < 5 && <div className="w-0.5 h-full min-h-[40px] my-1" style={{ backgroundColor: `${pc}20` }} />}
                </div>
                <div className="pb-6">
                  <h3 className="text-base font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CAREER & EMPLOYABILITY SUPPORT ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Career Ready</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Career & Employability Support</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Every student receives comprehensive career support — because your qualification should lead to a real career.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { icon: FileText, title: 'CV Building Support' },
              { icon: UserCheck, title: 'Interview Training' },
              { icon: Users, title: 'Career Workshops' },
              { icon: Handshake, title: 'Internship Placements' },
              { icon: Briefcase, title: 'Job Readiness Training' },
            ].map((s) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-6 text-center border border-border/50 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${pc}08` }}>
                  <s.icon className="w-5 h-5" style={{ color: pc }} />
                </div>
                <p className="text-sm font-bold">{s.title}</p>
              </motion.div>
            ))}
          </div>
          <div className="surface-card mt-10 p-6 border-2 text-center" style={{ borderColor: `${pc}30`, backgroundColor: `${pc}04` }}>
            <p className="text-base font-bold" style={{ color: pc }}>
              "Start your UK degree in Pakistan, gain real work experience, and complete your final year abroad."
            </p>
          </div>
        </div>
      </section>

      {/* ─── GLOBAL PATHWAYS ─── */}
      <section className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Global Mobility</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Transfer to Universities Worldwide</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              { flag: '🇬🇧', country: 'United Kingdom', visa: 'Graduate Route Visa (2 yrs; 18 months from 2027)', unis: ['Sunderland', 'Anglia Ruskin', 'UCLan', 'Middlesex', 'Derby', 'Bolton'] },
              { flag: '🇩🇪', country: 'Germany', visa: '18-Month Job-Seeker Visa', unis: ['TU Berlin', 'RWTH Aachen', 'Uni Hamburg', 'TU Munich', 'Uni Bonn', 'HTW Berlin'] },
              { flag: '🇨🇦', country: 'Canada', visa: '3-Year PGWP', unis: ['Royal Roads', 'Yorkville', 'Athabasca'] },
              { flag: '🇦🇺', country: 'Australia', visa: '2–4 Year Post-Study Visa', unis: ['Torrens', 'Deakin', 'ECU', 'Charles Sturt'] },
              { flag: '🇦🇪', country: 'UAE', visa: 'Employment Opportunities', unis: ['Partner institutions available'] },
            ].map((dest) => (
              <motion.div key={dest.country} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:shadow-xl transition-all text-center"
              >
                <span className="text-4xl mb-3 block">{dest.flag}</span>
                <h3 className="text-lg font-bold mb-1">{dest.country}</h3>
                <p className="text-xs font-semibold mb-4" style={{ color: pc }}>{dest.visa}</p>
                <div className="space-y-1.5">
                  {dest.unis.map(u => (
                    <p key={u} className="text-xs text-muted-foreground">{u}</p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-10 text-center surface-card p-6 border border-border/50">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: pc }}>Professional Pathways</p>
            <p className="text-sm text-muted-foreground">Students can also progress into <strong>ACCA</strong> (Association of Chartered Certified Accountants), industry certifications, and professional careers.</p>
          </div>
        </div>
      </section>

      {/* ─── PARENT-FOCUSED SECTION ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>For Parents</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Why Parents Trust {theme.brandName}</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">We understand that investing in your child's education is one of the biggest decisions you'll make. Here's why families across Pakistan choose us.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Heart, title: 'Your Child Stays Home', desc: 'No need to send your child abroad at 16–18. They study from the safety of your home for 2 years, with the same quality as UK universities.' },
              { icon: Shield, title: 'UK-Regulated & Accredited', desc: 'All qualifications are Ofqual-regulated and recognised worldwide. Your child receives the exact same degree as students studying in the UK.' },
              { icon: Banknote, title: 'Save Rs. 2.5+ Crore', desc: 'Instead of spending Rs. 3–4 Crore on a full 3-year degree abroad, save 50–70% by studying the first 2 years at home.' },
              { icon: Briefcase, title: 'Real Internships & Jobs', desc: 'We provide internship placements across Pakistan — in corporate offices, IT firms, accounting practices, and healthcare organisations.' },
              { icon: Globe, title: 'Global Degree, Global Career', desc: 'After the final year abroad, your child has a UK/Australian/Canadian degree with access to post-study work visas (UK Graduate Route currently 2 years, reducing to 18 months from 2027).' },
              { icon: Users, title: 'Dedicated Support Team', desc: 'Personal academic tutor, career counsellor, and parent liaison officer. We keep you informed every step of the way.' },
            ].map((f) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:shadow-xl transition-all"
              >
                <div className="p-3 rounded-xl w-fit mb-5" style={{ backgroundColor: `${pc}08` }}>
                  <f.icon className="w-6 h-6" style={{ color: pc }} />
                </div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="surface-card mt-10 p-8 border-2 text-center" style={{ borderColor: `${pc}30`, backgroundColor: `${pc}04` }}>
            <p className="text-lg font-extrabold mb-2" style={{ color: pc }}>What You're Really Investing In</p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {['✅ Global degree pathway', '✅ Career outcomes', '✅ International mobility', '✅ Internships + experience'].map(item => (
                <span key={item} className="text-sm font-semibold px-4 py-2 rounded-full bg-secondary">{item}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">This is not just a diploma — it's a complete career launchpad.</p>
          </div>
        </div>
      </section>

      {/* ─── ACCREDITATION ─── */}
      <section className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Accreditation</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-10">Accredited & Recognised in 100+ Countries</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 max-w-3xl mx-auto">
            {[
              { name: 'OTHM Qualifications', desc: 'UK Ofqual regulated awarding body' },
              { name: 'QUALIFI', desc: 'Recognised by UK NARIC / ENIC' },
              { name: 'IAB', desc: 'International accounting body' },
            ].map((body) => (
              <div key={body.name} className="surface-card px-8 py-8 text-center flex-1 border border-border/50 hover:shadow-xl transition-all">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                  <Shield className="w-7 h-7" style={{ color: pc }} />
                </div>
                <p className="text-base font-bold">{body.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{body.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Student Stories</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">What Our Students Say</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Ahmed Khan', programme: 'Level 5 Business Management', quote: 'I completed my Level 4 and 5 from Pakistan and am now finishing my final year at the University of Sunderland. This pathway saved my family over Rs.4 million.' },
              { name: 'Ayesha Malik', programme: 'Level 4 Computing', quote: 'The live online classes are brilliant. The lecturers are engaging, and I can access all recordings anytime. It\'s like being in a real university classroom.' },
              { name: 'Hassan Ali', programme: 'Level 3 Accounting', quote: 'The residential week experience was fantastic. Meeting my classmates and lecturers in person really strengthened my understanding of the modules.' },
            ].map((t) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50"
              >
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-warning text-warning" />)}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                    <span className="text-sm font-bold" style={{ color: pc }}>{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.programme}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Get In Touch</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Contact Us</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: MapPin, title: 'Visit Us', info: 'Main Boulevard, Gulberg III, Lahore, Pakistan' },
              { icon: Phone, title: 'Call Us', info: '+92 42 1234 5678' },
              { icon: Mail, title: 'Email Us', info: 'admissions@unipathway.pk' },
            ].map((c) => (
              <div key={c.title} className="surface-card p-7 text-center border border-border/50 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                  <c.icon className="w-5 h-5" style={{ color: pc }} />
                </div>
                <p className="text-sm font-bold">{c.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{c.info}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/tenant/${slug}/contact`}>
              <Button variant="outline" size="lg">Send Enquiry <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-primary-foreground leading-tight">
            Start Your UK Qualification<br />Journey Today
          </h2>
          <p className="text-primary-foreground/80 mt-6 text-lg max-w-xl mx-auto">
            Applications are now open for the next intake. Secure your place and save 50–70% compared to studying abroad.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <Link to="/apply">
              <Button size="lg" variant="outline" className="bg-background text-foreground hover:bg-background/90 border-0 h-13 px-10 text-base shadow-lg w-full sm:w-auto">
                Apply Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to={`/tenant/${slug}/contact`}>
              <Button size="lg" variant="outline" className="bg-background/15 text-background border-background/40 hover:bg-background/25 h-13 px-10 text-base w-full sm:w-auto font-semibold">
                Request a Callback
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-foreground text-background/50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: pc }}>
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-extrabold text-background text-lg">{theme.brandName}</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">UK-accredited education centre in Pakistan. OTHM, QUALIFI & IAB approved — with UK & Germany progression pathways.</p>
              <div className="flex gap-2 mt-4">
                {['OTHM', 'QUALIFI', 'IAB'].map(b => (
                  <span key={b} className="text-[9px] font-bold uppercase tracking-wider bg-background/5 px-2 py-1 rounded">{b}</span>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-background/70 mb-3">Follow us</p>
                <SocialIcons variant="dark" />
              </div>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Courses</p>
              <ul className="space-y-2 text-sm">
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-all">Business Management</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-all">Computing & IT</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-all">Accounting</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-all">View All</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li><Link to={`/tenant/${slug}/about`} className="hover:text-background transition-all">About</Link></li>
                <li><Link to="/blog" className="hover:text-background transition-all">Blog</Link></li>
                <li><Link to={`/tenant/${slug}/contact`} className="hover:text-background transition-all">Contact</Link></li>
                <li><Link to="/register" className="hover:text-background transition-all">Agent Partnership</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-background transition-all">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-background transition-all">Terms of Service</Link></li>
                <li><Link to="/cookies" className="hover:text-background transition-all">Cookie Policy</Link></li>
                <li><Link to="/disclaimer" className="hover:text-background transition-all">Disclaimer</Link></li>
                <li>
                  <button
                    onClick={openCookiePreferences}
                    className="hover:text-background transition-all text-left"
                  >
                    Cookie preferences
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2026 UNIPATHWAY.PK. All rights reserved. A brand of LoungeTech Digitallösungen GmbH.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-background transition-all">Privacy</Link>
              <Link to="/terms" className="hover:text-background transition-all">Terms</Link>
              <Link to="/cookies" className="hover:text-background transition-all">Cookies</Link>
              <Link to="/disclaimer" className="hover:text-background transition-all">Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
