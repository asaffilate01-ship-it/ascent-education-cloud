import { GraduationCap, BookOpen, Users, ArrowRight, Shield, Video, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import { TenantTheme } from '@/types/platform';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TenantNav from '@/components/TenantNav';

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#b91c1c',
  accentColor: '#16a34a',
  logoUrl: '',
  faviconUrl: '',
  fontFamily: 'Inter',
  heroTitle: 'Your Gateway to UK Qualifications',
  heroSubtitle: 'Study OTHM, QUALIFI & IAB accredited Level 3–5 diplomas 80% online.',
  heroImageUrl: '',
  customDomain: '',
  brandName: 'EduPathway',
};

export default function TenantLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTenant() {
      if (!slug) { setLoading(false); return; }
      const { data } = await supabase
        .from('tenants_public' as any)
        .select('id, name, slug, primary_color, accent_color, logo_url, brand_name')
        .eq('slug', slug)
        .single();
      if (data) {
        setTheme({
          primaryColor: data.primary_color || DEFAULT_THEME.primaryColor,
          accentColor: data.accent_color || DEFAULT_THEME.accentColor,
          logoUrl: data.logo_url || '',
          faviconUrl: '',
          fontFamily: 'Inter',
          heroTitle: `Welcome to ${data.brand_name || data.name}`,
          heroSubtitle: 'Study accredited diplomas and progress to top universities worldwide.',
          heroImageUrl: '',
          customDomain: data.custom_domain || '',
          brandName: data.brand_name || data.name,
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

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: theme.fontFamily }}>
      <TenantNav brandName={theme.brandName} primaryColor={theme.primaryColor} activePage="home" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}08, ${theme.accentColor}08)` }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
              <Shield className="w-3 h-3" /> OTHM · QUALIFI · IAB Accredited Centre
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.1]">
              {theme.heroTitle}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 leading-relaxed max-w-2xl">
              {theme.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/apply">
                <Button size="lg" className="w-full sm:w-auto" style={{ backgroundColor: theme.primaryColor }}>
                  Apply Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to={`/tenant/${slug}/courses`}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">View Courses</Button>
              </Link>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-12">
              {[
                { value: '342', label: 'Students' },
                { value: '50–70%', label: 'Cost Savings' },
                { value: '80%', label: 'Online' },
                { value: '95%', label: 'Pass Rate' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xl sm:text-2xl font-bold" style={{ color: theme.primaryColor }}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-12 sm:py-16" style={{ background: `${theme.primaryColor}04` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Why Study With {theme.brandName}?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: GraduationCap, title: 'UK Recognised Qualifications', desc: 'Study OTHM, QUALIFI, and IAB accredited courses — recognised by universities across the UK, Canada, Australia, and USA.' },
              { icon: Video, title: '80% Online Learning', desc: 'Join HD live lectures from home. Interactive whiteboard, breakout rooms, and recorded sessions available 24/7.' },
              { icon: MapPin, title: '20% In-Centre Experience', desc: 'Attend 2 residential weeks per year for workshops, presentations, tutor meetings, and formal examinations.' },
            ].map((f) => (
              <div key={f.title} className="surface-card p-5">
                <div className="p-2 rounded-lg w-fit mb-3" style={{ backgroundColor: `${theme.primaryColor}15` }}>
                  <f.icon className="w-5 h-5" style={{ color: theme.primaryColor }} />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-3">Our Programmes</h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10">Internationally recognised qualifications</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Level 4 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: '£1,200', credits: 120, modules: 6 },
              { title: 'Level 5 Diploma in Business Management', body: 'OTHM', duration: '12 months', fee: '£1,200', credits: 120, modules: 6 },
              { title: 'Level 4 Diploma in Computing', body: 'QUALIFI', duration: '12 months', fee: '£1,200', credits: 120, modules: 6 },
              { title: 'Level 5 Diploma in Computing', body: 'QUALIFI', duration: '12 months', fee: '£1,200', credits: 120, modules: 6 },
              { title: 'Level 3 Certificate in Accounting', body: 'IAB', duration: '9 months', fee: '£800', credits: 60, modules: 4 },
              { title: 'Level 4 Diploma in Accounting', body: 'IAB', duration: '12 months', fee: '£1,200', credits: 120, modules: 6 },
            ].map((course) => (
              <div key={course.title} className="surface-card p-4 sm:p-5 hover:shadow-surface-lg transition-default cursor-pointer group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                    {course.body}
                  </span>
                  <span className="text-xs text-muted-foreground">{course.credits} credits</span>
                </div>
                <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-default">{course.title}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>{course.duration}</span>
                  <span>{course.modules} modules</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold" style={{ color: theme.primaryColor }}>{course.fee}</span>
                  <Link to="/apply">
                    <Button size="sm" variant="outline" className="text-xs">Apply</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={`/tenant/${slug}/courses`}>
              <Button variant="outline">View All Courses <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pathways */}
      <section id="pathways" className="py-12 sm:py-16" style={{ background: `${theme.primaryColor}04` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Academic Pathways to Top Universities</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { title: 'Business Management', body: 'OTHM', levels: ['Level 4 Diploma (Year 1)', 'Level 5 Diploma (Year 2)', 'BA Top-Up at UK University (Year 3)'], unis: ['Sunderland', 'Anglia Ruskin', 'Bolton'] },
              { title: 'Computing & IT', body: 'QUALIFI', levels: ['Level 3 IT Foundation', 'Level 4 Computing', 'Level 5 Computing', 'BSc Top-Up at UK University'], unis: ['Portsmouth', 'Wolverhampton'] },
              { title: 'Accounting & Finance', body: 'IAB', levels: ['Level 3 Accounting', 'Level 4 Accounting', 'Level 5 Accounting', 'BSc Top-Up'], unis: ['Bolton', 'Chichester'] },
            ].map((path) => (
              <div key={path.title} className="surface-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">{path.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>{path.body}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {path.levels.map((level, i) => (
                    <div key={level} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                        {i + 1}
                      </div>
                      <span className="text-sm">{level}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Partner Universities</p>
                  <p className="text-xs font-medium">{path.unis.join(' · ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditation */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">Accredited & Recognised</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
            {['OTHM Qualifications', 'QUALIFI', 'IAB'].map((body) => (
              <div key={body} className="surface-card px-6 sm:px-8 py-5 text-center">
                <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: theme.primaryColor }} />
                <p className="text-sm font-semibold">{body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Approved Centre</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-12 sm:py-16" style={{ background: `${theme.primaryColor}04` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">Get In Touch</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: MapPin, title: 'Visit Us', info: 'Main Boulevard, Gulberg III, Lahore, Pakistan' },
              { icon: Phone, title: 'Call Us', info: '+92 42 1234 5678' },
              { icon: Mail, title: 'Email Us', info: 'admissions@edupathway.pk' },
            ].map((c) => (
              <div key={c.title} className="surface-card p-5 text-center">
                <c.icon className="w-5 h-5 mx-auto mb-2" style={{ color: theme.primaryColor }} />
                <p className="text-sm font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.info}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to={`/tenant/${slug}/contact`}>
              <Button variant="outline">Contact Us <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.primaryColor}cc)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">Start Your UK Qualification Journey</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto text-sm sm:text-base">
            Applications are now open for the next intake. Secure your place today and save 50–70% compared to studying abroad.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/apply">
              <Button size="lg" variant="outline" className="bg-background text-foreground hover:bg-background/90 border-0 w-full sm:w-auto">
                Apply Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to={`/tenant/${slug}/contact`}>
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 w-full sm:w-auto">
                Request a Callback
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/60 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5" style={{ color: theme.primaryColor }} />
                <span className="font-bold text-background">{theme.brandName}</span>
              </div>
              <p className="text-xs leading-relaxed">UK-accredited education centre in Pakistan. OTHM, QUALIFI & IAB approved.</p>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Courses</p>
              <ul className="space-y-1.5 text-xs">
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-default">Business Management</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-default">Computing & IT</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-default">Accounting</Link></li>
                <li><Link to={`/tenant/${slug}/courses`} className="hover:text-background transition-default">View All</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Students</p>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/login" className="hover:text-background transition-default">Student Portal</Link></li>
                <li><Link to="/login" className="hover:text-background transition-default">Library</Link></li>
                <li><Link to="/login" className="hover:text-background transition-default">Timetable</Link></li>
                <li><Link to="/login" className="hover:text-background transition-default">Fees</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-background text-sm mb-2">Centre</p>
              <ul className="space-y-1.5 text-xs">
                <li><Link to={`/tenant/${slug}/about`} className="hover:text-background transition-default">About Us</Link></li>
                <li><Link to={`/tenant/${slug}/contact`} className="hover:text-background transition-default">Contact</Link></li>
                <li><Link to="/register" className="hover:text-background transition-default">Agent Partnership</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <p>© 2026 {theme.brandName}. Powered by EduCloud.</p>
            <div className="flex gap-4">
              <span>Privacy Policy</span>
              <span>Terms</span>
              <span>GDPR</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
