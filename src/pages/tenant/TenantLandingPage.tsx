import { GraduationCap, BookOpen, Users, ArrowRight, Shield, Video, MapPin, Phone, Mail, Loader2, CheckCircle, Star, Clock, Globe, Award, Sparkles, ChevronRight, Play, Target, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import { TenantTheme } from '@/types/platform';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import TenantNav from '@/components/TenantNav';
import tenantHero from '@/assets/tenant-hero.jpg';

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#b91c1c',
  accentColor: '#16a34a',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter',
  heroTitle: 'Your Gateway to Global Qualifications',
  heroSubtitle: 'Study OTHM, QUALIFI & IAB accredited Level 3–5 diplomas 80% online. Progress to universities in the UK, USA, Australia, Canada & beyond.',
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
          heroSubtitle: 'Study internationally recognised diplomas from Pakistan. 80% online, 20% in-centre. Progress to UK, USA, Australia & Canada. Save 50–70% vs studying abroad.',
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
              { icon: Target, title: 'Global University Progression', desc: 'Clear academic pathways to top-up your diploma to a full bachelor\'s degree at partner universities in UK, USA, Australia & Canada.' },
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

      {/* ─── COURSES ─── */}
      <section id="courses" className="py-20 sm:py-28" style={{ background: `${pc}03` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Our Programmes</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Internationally Recognised Qualifications</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Choose from business, computing, and accounting pathways at Level 3–5</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Level 4 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6 },
              { title: 'Level 5 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: 'Rs.880,000', gbp: '£2,200', credits: 120, modules: 6 },
              { title: 'Level 4 Diploma in Computing', body: 'QUALIFI', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6 },
              { title: 'Level 5 Diploma in Computing', body: 'QUALIFI', duration: '12 months', fee: 'Rs.880,000', gbp: '£2,200', credits: 120, modules: 6 },
              { title: 'Level 3 Certificate in Accounting', body: 'IAB', duration: '9 months', fee: 'Rs.560,000', gbp: '£1,400', credits: 60, modules: 4 },
              { title: 'Level 4 Diploma in Accounting', body: 'IAB', duration: '12 months', fee: 'Rs.720,000', gbp: '£1,800', credits: 120, modules: 6 },
            ].map((course) => (
              <motion.div key={course.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-6 hover:shadow-xl transition-all cursor-pointer group border border-border/50 hover:border-primary/15"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ backgroundColor: `${pc}10`, color: pc }}>
                    {course.body}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{course.credits} credits</span>
                </div>
                <h3 className="text-base font-bold mb-3 group-hover:text-primary transition-all leading-snug">{course.title}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.modules} modules</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <span className="text-xl font-extrabold" style={{ color: pc }}>{course.fee}</span>
                    <span className="text-xs text-muted-foreground ml-2">({course.gbp})</span>
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
        </div>
      </section>

      {/* ─── PATHWAYS ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: pc }}>Academic Pathways</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground">Your Route to a Global Degree</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Complete Level 4 & 5 in Pakistan, then top-up to a full bachelor's degree at universities in the UK, USA, Australia or Canada</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Business Management', body: 'OTHM', levels: ['Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BA Top-Up at Global University (Year 3)'], unis: ['🇬🇧 Sunderland', '🇬🇧 Anglia Ruskin', '🇬🇧 Bolton', '🇺🇸 Westcliff', '🇦🇺 Torrens'] },
              { title: 'Computing & IT', body: 'QUALIFI', levels: ['Level 3 IT Foundation', 'Level 4 Computing', 'Level 5 Computing', 'BSc Top-Up at Global University'], unis: ['🇬🇧 Portsmouth', '🇬🇧 Wolverhampton', '🇺🇸 LSUS', '🇦🇺 ECU', '🇨🇦 Yorkville'] },
              { title: 'Accounting & Finance', body: 'IAB', levels: ['Level 3 Accounting', 'Level 4 Accounting', 'Level 5 Accounting', 'BSc Top-Up'], unis: ['🇬🇧 Bolton', '🇬🇧 Chichester', '🇦🇺 Deakin'] },
              { title: 'Health & Social Care', body: 'OTHM', levels: ['Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BSc Top-Up at Global University'], unis: ['🇬🇧 Sunderland', '🇺🇸 Westcliff', '🇦🇺 SCU'] },
            ].map((path) => (
              <motion.div key={path.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="surface-card p-7 border border-border/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold">{path.title}</h3>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${pc}10`, color: pc }}>{path.body}</span>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: pc }}>
                  <GraduationCap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-extrabold text-background text-lg">{theme.brandName}</span>
              </div>
              <p className="text-sm leading-relaxed">UK-accredited education centre in Pakistan. OTHM, QUALIFI & IAB approved.</p>
              <div className="flex gap-2 mt-4">
                {['OTHM', 'QUALIFI', 'IAB'].map(b => (
                  <span key={b} className="text-[9px] font-bold uppercase tracking-wider bg-background/5 px-2 py-1 rounded">{b}</span>
                ))}
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
              <p className="font-bold text-background text-sm mb-3">Students</p>
              <ul className="space-y-2 text-sm">
                <li><Link to="/login" className="hover:text-background transition-all">Student Portal</Link></li>
                <li><Link to="/login" className="hover:text-background transition-all">Library</Link></li>
                <li><Link to="/login" className="hover:text-background transition-all">Timetable</Link></li>
                <li><Link to="/login" className="hover:text-background transition-all">Fees</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-background text-sm mb-3">Centre</p>
              <ul className="space-y-2 text-sm">
                <li><Link to={`/tenant/${slug}/contact`} className="hover:text-background transition-all">Contact</Link></li>
                <li><Link to="/register" className="hover:text-background transition-all">Agent Partnership</Link></li>
                <li><Link to="/privacy" className="hover:text-background transition-all">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-background transition-all">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>© 2026 {theme.brandName}. Powered by EduCloud.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-background transition-all">Privacy</Link>
              <Link to="/terms" className="hover:text-background transition-all">Terms</Link>
              <Link to="/privacy" className="hover:text-background transition-all">GDPR</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
