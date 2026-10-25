import PublicHero from '@/components/PublicHero';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, Award, Video, ArrowRight, Shield } from 'lucide-react';
import TenantNav from '@/components/TenantNav';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import PublicFooter from '@/components/PublicFooter';
import { Link as CourseLink } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  body: string;
  level: string;
  duration: string;
  credits: number | null;
  modules: string[];
  progression: string;
}

export default function TenantCoursesPage() {
  const { slug } = useParams();
  const { brandName, primaryColor } = useTenantBranding();
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [bodyFilter, setBodyFilter] = useState('All');
  useEffect(() => {
    let active = true;
    setCourses([]); setLoading(true); setError('');
    (async () => {
      try {
        if (!slug) throw new Error('Choose a centre to view its available courses.');
        const tenant = await supabase.from('tenants_public').select('id').eq('slug', slug).single();
        if (tenant.error || !tenant.data) throw new Error('The centre could not be loaded.');
        const rows: Course[] = [];
        for (let offset = 0; ; offset += 250) {
          const { data, error } = await supabase.from('programmes')
            .select('id, title, level, awarding_body, credits, duration, progression_pathway, modules(title, code)')
            .eq('tenant_id', tenant.data.id).eq('status', 'active').order('id').range(offset, offset + 249);
          if (!active) return;
          if (error) throw new Error('Courses could not be loaded. Please retry.');
          rows.push(...(data || []).map((p: any) => ({
            id: p.id, title: p.title, body: p.awarding_body || 'Not recorded', level: p.level || '',
            duration: p.duration || 'Duration to be confirmed', credits: p.credits,
            modules: [...(p.modules || [])].sort((a: any, b: any) => String(a.code || '').localeCompare(String(b.code || ''))).map((m: any) => m.title),
            progression: typeof p.progression_pathway === 'string' ? p.progression_pathway : '',
          })));
          if (!data || data.length < 250) break;
        }
        if (active) setCourses(rows);
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [slug, retry]);
  const visibleCourses = courses.filter(c => bodyFilter === 'All' || c.body.toUpperCase() === bodyFilter);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: `${c.level} qualification: ${c.body}. Duration: ${c.duration}.`,
        provider: { '@type': 'Organization', name: 'UniPathway' },
      },
    })),
  };

  return (
    <div className="public-site min-h-dvh bg-background">
      <Seo title="Programmes & Diplomas — OTHM, QUALIFI & IAB | UniPathway" description="Explore recorded qualifications in business, computing and accounting. OTHM and Qualifi plans include two 14-day centre visits annually, with remaining learning online." canonical="/courses" jsonLd={jsonLd} />
      <TenantNav brandName={brandName} primaryColor={primaryColor} activePage="courses" />

      {/* Hero */}
      <section className="border-b border-border bg-secondary/40 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
<PublicHero topic="guidance">          <p className="text-label text-success">Qualifications in Pakistan</p>
          <h1 className="mt-4 max-w-2xl text-3xl sm:text-5xl font-bold">Find the qualification for your next step.</h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-sm sm:text-base">
            Browse Level 3–5 diplomas in business, computing and accounting, with progression options to explore.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm"><CourseLink to="/tuition" className="font-bold text-success hover:underline">Looking for school tuition? →</CourseLink><CourseLink to="/employer-learning" className="font-bold text-success hover:underline">Learning for your team? →</CourseLink></div></PublicHero>
        </div>
      </section>

      {/* Accreditation Badges */}
      <section className="py-6 sm:py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-wrap items-center gap-4 sm:gap-8">
          {['OTHM Qualifications', 'QUALIFI', 'IAB Accounting'].map((body) => (
            <div key={body} className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Course Cards */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="mb-5 flex flex-wrap gap-2">{['All', 'OTHM', 'QUALIFI', 'IAB'].map(body => <Button key={body} variant={bodyFilter === body ? 'default' : 'outline'} aria-pressed={bodyFilter === body} onClick={() => setBodyFilter(body)}>{body}</Button>)}<Button asChild variant="outline"><Link to="/study">IT, tuition, IELTS and funded enquiries</Link></Button></div>
          {loading && <p role="status">Loading available programmes…</p>}
          {error && <div role="alert"><p>{error}</p><Button onClick={() => setRetry(r => r + 1)}>Retry courses</Button></div>}
          {!loading && !error && !visibleCourses.length && <p>No active programmes match this selection. Ask admissions about upcoming availability.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {visibleCourses.map((course) => (

              <article key={course.id} className="surface-card rounded-md p-5 sm:p-7 hover-lift">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase text-success">{course.body}</span>
                      <span className="text-xs text-muted-foreground">· {course.level}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold">{course.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {course.credits == null ? 'Credits to be confirmed' : `${course.credits} credits`}</span>
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {['OTHM','QUALIFI'].includes(course.body.toUpperCase()) ? 'Online + two 14-day visits annually' : 'Delivery to be confirmed'}</span>
                    </div>

                    {/* Modules */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold mb-2">Modules</p>
                      <div className="flex flex-wrap gap-1.5">
                        {course.modules.map((m) => (
                          <span key={m} className="text-[11px] bg-secondary px-2 py-1 rounded-sm font-medium">{m}</span>
                        ))}
                      </div>
                    </div>

                    {/* Progression */}
                    {course.progression && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <GraduationCap className="w-3.5 h-3.5 text-success" />
                        <span className="text-muted-foreground">Progression guidance:</span>
                        <span className="font-medium text-success">{course.progression}</span>
                      </div>
                    )}

                  </div>

                  {/* Price & CTA */}
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-5">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-primary">POA</p>
                      <p className="text-xs text-muted-foreground">Price on Application</p>
                    </div>
                    <Button asChild>
                      <Link to={`/tenant/${slug}/contact`}>
                        Enquire about study <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Model */}
      <section className="bg-secondary/40 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Hybrid Delivery Model</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { pct: 'Online', title: 'Between Visits', desc: 'The rest of the OTHM / Qualifi programme is delivered online, according to the confirmed programme timetable.' },
              { pct: '2 × 14 days', title: 'Annual Centre Visits', desc: 'Four weeks annually for OTHM / Qualifi. Planned centre teaching totals 72 hours plus up to three hours of optional private help.' },
              { pct: 'By programme', title: 'Assessment and Approval', desc: 'Assessment, entry requirements and the complete delivery plan must be confirmed for your qualification. These residential hours do not represent total qualification learning hours.' },
            ].map((d) => (
              <div key={d.title} className="surface-card p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-primary mb-2">{d.pct}</p>
                <p className="text-sm font-semibold mb-2">{d.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-10 sm:py-12 text-center px-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-3">Ready to Start Your Pathway?</h2>
        <p className="text-muted-foreground mb-6 text-sm">Discuss your programme and progression options with admissions</p>
        <Link to={`/tenant/${slug}/contact`}><Button size="lg" className="px-8">Enquire about study <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
      </section>
      <PublicFooter />
    </div>
  );
}
