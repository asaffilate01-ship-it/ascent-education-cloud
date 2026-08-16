import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Clock, Award, Video, ArrowRight, Shield } from 'lucide-react';
import TenantNav from '@/components/TenantNav';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

interface Course {
  id: string;
  title: string;
  body: string;
  level: string;
  duration: string;
  credits: number;
  modules: string[];
  progression: string;
}

// Fallback catalogue used only if the programme table is unreachable.
const FALLBACK_COURSES: Course[] = [
  { id: '1', title: 'Level 5 Diploma in Business Management', body: 'OTHM', level: 'Level 5', duration: '12 months', credits: 120, modules: ['Strategic Management', 'Financial Analysis', 'Marketing Strategy', 'Business Environment', 'Research Methods', 'Operations Management'], progression: 'BA (Hons) Top-Up at UK universities' },
  { id: '2', title: 'Level 4 Diploma in Business Management', body: 'OTHM', level: 'Level 4', duration: '12 months', credits: 120, modules: ['Business Environment', 'Communication Skills', 'Financial Accounting', 'Management Accounting', 'People Management', 'Business Law'], progression: 'Level 5 Diploma' },
  { id: '3', title: 'Level 5 Diploma in Computing', body: 'QUALIFI', level: 'Level 5', duration: '12 months', credits: 120, modules: ['Software Engineering', 'Database Design', 'Networking', 'Cyber Security', 'Web Development', 'Project Management'], progression: 'BSc (Hons) Top-Up at UK universities' },
  { id: '4', title: 'Level 4 Diploma in Computing', body: 'QUALIFI', level: 'Level 4', duration: '12 months', credits: 120, modules: ['Computer Systems', 'Programming Fundamentals', 'Web Technologies', 'Database Systems', 'Networking Basics', 'IT Project'], progression: 'Level 5 Diploma' },
  { id: '5', title: 'Level 3 Diploma in Accounting', body: 'IAB', level: 'Level 3', duration: '6 months', credits: 60, modules: ['Bookkeeping', 'Financial Statements', 'VAT Returns', 'Payroll'], progression: 'Level 4 Diploma in Accounting' },
];

export default function TenantCoursesPage() {
  const { slug } = useParams();
  const { brandName, primaryColor } = useTenantBranding();
  const [courses, setCourses] = useState<Course[]>(FALLBACK_COURSES);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('programmes')
        .select('id, title, level, awarding_body, credits, duration, progression_pathway, modules(title)')
        .eq('status', 'active')
        .order('level', { ascending: true });

      if (!active || !data?.length) return;
      setCourses(
        data.map((p: any) => ({
          id: p.id,
          title: p.title,
          body: p.awarding_body,
          level: p.level,
          duration: p.duration ?? '12 months',
          credits: p.credits ?? 0,
          modules: (p.modules ?? []).map((m: any) => m.title),
          progression: typeof p.progression_pathway === 'string' ? p.progression_pathway : '',
        })),
      );
    })();
    return () => { active = false; };
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Course',
        name: c.title,
        description: `${c.level} qualification awarded by ${c.body}, ${c.credits} credits over ${c.duration}.`,
        provider: { '@type': 'Organization', name: 'UniPathway' },
      },
    })),
  };

  return (
    <div className="min-h-dvh bg-background">
      <Seo title="Programmes & Diplomas — OTHM, QUALIFI & IAB | UniPathway" description="Browse UK-accredited Level 3–5 diplomas in business, computing and accounting. Study 80% online from Pakistan and progress to a university top-up degree." canonical="/courses" jsonLd={jsonLd} />
      <TenantNav brandName={brandName} primaryColor={primaryColor} activePage="courses" />

      {/* Hero */}
      <section className="gradient-subtle py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Our Programmes</h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-sm sm:text-base">
            UK-accredited qualifications from OTHM, QUALIFI, and IAB — study 80% online and progress to top universities worldwide
          </p>
        </div>
      </section>

      {/* Accreditation Badges */}
      <section className="py-6 sm:py-8 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            {courses.map((course) => (

              <div key={course.id} className="surface-card p-4 sm:p-6 hover:shadow-lg transition-default">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">{course.body}</span>
                      <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded">{course.level}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold">{course.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {course.credits} credits</span>
                      <span className="flex items-center gap-1"><Video className="w-3 h-3" /> 80% Online</span>
                    </div>

                    {/* Modules */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold mb-2">Modules</p>
                      <div className="flex flex-wrap gap-1.5">
                        {course.modules.map((m) => (
                          <span key={m} className="text-[10px] bg-secondary px-2 py-1 rounded font-medium">{m}</span>
                        ))}
                      </div>
                    </div>

                    {/* Progression */}
                    {course.progression && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <GraduationCap className="w-3.5 h-3.5 text-success" />
                        <span className="text-muted-foreground">Progresses to:</span>
                        <span className="font-medium text-success">{course.progression}</span>
                      </div>
                    )}

                  </div>

                  {/* Price & CTA */}
                  <div className="lg:w-48 shrink-0 flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-2">
                    <div className="lg:text-right">
                      <p className="text-xl sm:text-2xl font-bold text-primary">POA</p>
                      <p className="text-xs text-muted-foreground">Price on Application</p>
                    </div>
                    <Link to="/apply">
                      <Button className="mt-0 lg:mt-3">
                        Apply Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Model */}
      <section className="gradient-subtle py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">Hybrid Delivery Model</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { pct: '80%', title: 'Online Learning', desc: 'Live HD video lectures, recorded sessions, digital whiteboard, assignments, and 24/7 learning library access' },
              { pct: '20%', title: 'Centre-Based', desc: 'Two residential weeks per year for intensive workshops, group projects, tutor meetings, and presentations' },
              { pct: '100%', title: 'Exams at Centre', desc: 'All formal examinations conducted at approved centres under invigilated conditions with ID verification' },
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
        <p className="text-muted-foreground mb-6 text-sm">Apply today and begin your journey to a UK degree</p>
        <Link to="/apply"><Button size="lg" className="px-8">Apply Now <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
      </section>
    </div>
  );
}
