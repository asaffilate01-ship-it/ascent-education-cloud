import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { GraduationCap, Globe, Shield, Users, Target, Heart, Award, BookOpen, Building2, ArrowRight, CheckCircle } from 'lucide-react';
import TenantNav from '@/components/TenantNav';
import ComplianceDisclosure from '@/components/tenant/ComplianceDisclosure';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import Seo from '@/components/Seo';

export default function TenantAboutPage() {
  const { slug } = useParams();
  const { brandName, primaryColor: pc, loading } = useTenantBranding();

  if (loading) return <div className="min-h-dvh bg-background" />;

  return (
    <div className="min-h-dvh bg-background">
      <Seo title="About UniPathway — Study Abroad Counselling in Pakistan" description="UniPathway is a Pakistan-based education counselling and language-preparation service helping students progress to recognised universities in the UK and Germany." canonical="/about" />
      <TenantNav brandName={brandName} primaryColor={pc} activePage="about" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${pc}0d 0%, transparent 60%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5" style={{ backgroundColor: `${pc}12`, color: pc }}>
            About {brandName}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Global qualifications, built for <span style={{ color: pc }}>Pakistani students</span>.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-3xl mx-auto leading-relaxed">
            {brandName} is a Pakistan-registered education counselling and language-preparation service. We help students in Pakistan and across South Asia progress into recognised universities in the UK, Germany and other study destinations — through licensed diplomas, language academies and honest advisory work.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Link to={`/tenant/${slug}/pathways`}><Button size="lg" style={{ backgroundColor: pc }}>See our pathways <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
            <Link to={`/tenant/${slug}/contact`}><Button size="lg" variant="outline">Talk to a counsellor</Button></Link>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: 'Our Mission', body: 'Make internationally recognised qualifications and study-abroad progression affordable, transparent and achievable for students studying from Pakistan.' },
            { icon: Globe, title: 'Our Vision', body: 'A generation of Pakistani graduates confidently moving between UK, German and global universities — without hidden fees, false promises, or unlicensed advice.' },
            { icon: Heart, title: 'Our Values', body: 'Honesty in claims, compliance with UK, EU and Pakistani regulators, care for every applicant, and long-term student outcomes over short-term sales.' },
          ].map((c) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="surface-card p-6 border border-border/50 rounded-2xl">
              <div className="p-2.5 rounded-xl w-fit mb-4" style={{ backgroundColor: `${pc}10` }}>
                <c.icon className="w-5 h-5" style={{ color: pc }} />
              </div>
              <h3 className="text-base font-bold mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section className="py-16 sm:py-20 border-t border-border/30" style={{ background: `${pc}03` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>What we do</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Four things, done properly.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: GraduationCap, title: 'UK Level 3–5 Diplomas', body: 'OTHM, QUALIFI and IAB regulated qualifications delivered 80% online with 2 residential weeks per year at our Pakistan centre. Progress to a full UK/USA/Australia/Canada degree with a final top-up year abroad.' },
              { icon: Building2, title: 'Germany Pathway', body: 'End-to-end support for Studienkolleg, bachelor and master applications through uni-assist / direct entry, plus guidance on the Sperrkonto, health insurance and the 18-month post-study job-seeker visa.' },
              { icon: BookOpen, title: 'Language Academy', body: 'Live-taught German A1–B2 and Academic English, plus dedicated preparation courses for TestDaF, telc, Goethe-Zertifikat, IELTS, PTE and TOEFL.' },
              { icon: Users, title: 'Applicant Advisory', body: 'Qualification equivalency checks (HEC ↔ Anabin/uni-assist ↔ UK ENIC), document checklists, deposit and financial planning, and application tracking through our student portal.' },
            ].map((c) => (
              <div key={c.title} className="surface-card p-6 border border-border/50 rounded-2xl flex gap-4">
                <div className="p-2.5 rounded-xl h-fit" style={{ backgroundColor: `${pc}12` }}>
                  <c.icon className="w-5 h-5" style={{ color: pc }} />
                </div>
                <div>
                  <h3 className="text-base font-bold mb-1.5">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '342+', label: 'Students supported' },
              { value: '2', label: 'Study destinations' },
              { value: '95%', label: 'Diploma pass rate' },
              { value: '50–70%', label: 'Cost saving vs full study abroad' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl sm:text-4xl font-extrabold" style={{ color: pc }}>{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accreditations & regulators */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: pc }}>Accreditation & Compliance</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Regulated where it matters.</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm">Our diploma programmes are delivered under UK awarding bodies. Our Pakistan operation is SECP-registered and works within BEOE boundaries.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'UK Awarding Bodies', items: ['OTHM (Ofqual regulated)', 'QUALIFI (Ofqual regulated)', 'IAB — International Association of Bookkeepers'] },
              { title: 'Language Exam Bodies', items: ['TestDaF-Institut', 'telc GmbH', 'Goethe-Institut', 'British Council / IDP · Pearson · ETS'] },
              { title: 'Regulatory Boundaries', items: ['SECP-registered Pakistan operator', 'Operates within BEOE — no overseas job placement', 'British Council AQF principles for UK agents', 'GOV.UK Student Visa & DAAD guidance for applicants'] },
            ].map((b) => (
              <div key={b.title} className="surface-card p-6 border border-border/50 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4" style={{ color: pc }} />
                  <h3 className="text-sm font-bold">{b.title}</h3>
                </div>
                <ul className="space-y-2">
                  {b.items.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: pc }} />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance disclosure */}
      <section className="py-12 border-t border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <ComplianceDisclosure destination="pakistan" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20" style={{ background: `linear-gradient(180deg, ${pc}05 0%, transparent 100%)` }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="w-8 h-8 mx-auto mb-4" style={{ color: pc }} />
          <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to plan your route?</h2>
          <p className="text-muted-foreground mt-3">Book a free counselling call — we'll assess your equivalency, language level and best-fit destination in one sitting.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to={`/tenant/${slug}/contact`}><Button size="lg" style={{ backgroundColor: pc }}>Contact us</Button></Link>
            <Link to={`/tenant/${slug}/pathways`}><Button size="lg" variant="outline">Compare pathways</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
