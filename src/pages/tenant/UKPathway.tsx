import { useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CompanyDetails from '@/components/CompanyDetails';
import TenantNav from '@/components/TenantNav';
import LanguageAcademy from '@/components/tenant/LanguageAcademy';
import DestinationHero from '@/components/tenant/DestinationHero';
import { GraduationCap, Wallet, ShieldCheck, FileCheck2, Briefcase, Building2 } from 'lucide-react';
import Seo from '@/components/Seo';
import { StudyDestinationSections } from '@/pages/promo/StudyDestinationPage';
import { studyDestinations } from '@/lib/studyDestinations';

export default function UKPathway() {
  const { hash } = useLocation();
  useLayoutEffect(() => {
    if (hash === '#student-visa-costs') {
      document.getElementById('student-visa-costs')?.scrollIntoView({ block: 'start' });
    }
  }, [hash]);
  return (
    <div className="public-site min-h-dvh bg-background text-foreground">
      <Seo title="Study in the UK from Pakistan — Degrees & Top-Ups | UniPathway" description="UK university pathways for Pakistani students: accredited diplomas, top-up degrees, IELTS preparation and student visa guidance." canonical="/uk" />
      <TenantNav brandName="UniPathway" activePage="home" />

      <DestinationHero
        flag="🇬🇧"
        eyebrow="Study in the United Kingdom"
        title="Foundation, bachelor’s, master’s and top-up routes to the UK"
        subtitle="One-year master’s programmes, wide English-taught delivery and a clear pathway from Pakistani HSSC or A-Levels — with Academic English, IELTS and PTE preparation. Ask about TOEFL iBT preparation."
        bullets={[
          'One-year taught master’s across most disciplines',
          'Foundation and top-up routes for HSSC and Level 4/5 diploma holders',
          'Graduate and post-study immigration routes depend on current GOV.UK eligibility rules',
          'Check whether the institution can sponsor your exact course and study location',
        ]}
        destination="uk"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        <Link to="/international-study/uk" className="inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline underline-offset-4">Read the UK student visa guide</Link>
        <StudyDestinationSections destination={studyDestinations.uk} compact />

        {/* Study levels */}
        <section>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Study levels</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Which UK route fits your profile?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Building2, title: 'Foundation year', desc: 'For HSSC holders who need an academic bridge before Year 1 of a UK bachelor’s.' },
              { icon: GraduationCap, title: 'Bachelor’s (3 years)', desc: 'For A-Level holders or Foundation graduates. Direct entry to Year 1 of a UK undergraduate degree.' },
              { icon: GraduationCap, title: 'Top-up (final year)', desc: 'Level 4/5 diploma holders can ask a UK university to assess possible advanced standing or a top-up route; admission and credit recognition are not automatic.' },
              { icon: GraduationCap, title: 'Master’s (1 year)', desc: 'For bachelor holders. One-year taught master’s across business, computing, health, engineering and more.' },
            ].map((s, i) => (
              <div key={i} className="surface-card p-5 rounded-xl border border-border/50">
                <s.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Equivalency + costs */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <FileCheck2 className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Qualification equivalency (UK ENIC)</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">HSSC (Pakistan):</strong> typically requires a Foundation year for bachelor’s entry.</li>
              <li><strong className="text-foreground">A-Levels (3 subjects):</strong> direct entry to Year 1 of a UK bachelor’s, subject to institution grades.</li>
              <li><strong className="text-foreground">UniPathway Level 4 & 5 (240 credits):</strong> may be considered individually for advanced standing or top-up entry after institutional review.</li>
              <li><strong className="text-foreground">Pakistani 4-year bachelor’s:</strong> generally recognised for direct master’s entry.</li>
              <li><strong className="text-foreground">Pakistani 2-year bachelor’s:</strong> normally requires a bridging Level 6 or pre-master’s.</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4">Final equivalency is decided by the UK institution using UK ENIC.</p>
          </div>

          <section id="student-visa-costs" aria-labelledby="student-visa-costs-heading" className="surface-card scroll-mt-32 rounded-2xl border border-border/50 p-5 sm:p-6">
            <Wallet aria-hidden="true" className="mb-3 size-6 text-primary" />
            <h2 id="student-visa-costs-heading" className="text-lg font-bold">UK Student visa costs and financial evidence</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">For course fees, check the institution’s written offer. When financial evidence is needed, check the relevant fees on your Confirmation of Acceptance for Studies (CAS) and the <a className="font-semibold text-primary underline underline-offset-4" href="https://www.gov.uk/student-visa/money">GOV.UK money requirements</a>.</p>
            <h3 className="mt-5 font-bold">Maintenance evidence by application date</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Where it applies, the monthly requirement runs for up to nine months. These figures are evidence requirements, not a fee or an estimate of living costs.</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <dt className="font-semibold">Before 30 November 2026</dt>
                <dd className="mt-1 text-muted-foreground">London: £1,529/month<br />Outside London: £1,171/month</dd>
              </div>
              <div className="rounded-xl border border-border p-3">
                <dt className="font-semibold">From 30 November 2026</dt>
                <dd className="mt-1 text-muted-foreground">London: £1,570/month<br />Outside London: £1,203/month</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The <a className="font-semibold text-primary underline underline-offset-4" href="https://www.gov.uk/government/publications/statement-of-changes-to-the-immigration-rules-hc-584-3-september-2026/statement-of-changes-to-the-immigration-rules-hc-584-3-september-2026-accessible">Home Office rule change</a> uses the date you apply. Where cash evidence is required, the funds generally must be held for at least 28 consecutive days, with the period ending within 31 days before you apply. Other evidence routes and exemptions have their own rules.</p>
            <h3 className="mt-5 font-bold">Separate application charges</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Checked 24 November 2026: <a className="font-semibold text-primary underline underline-offset-4" href="https://www.gov.uk/student-visa">Student visa from outside the UK: £558</a>. The <a className="font-semibold text-primary underline underline-offset-4" href="https://www.gov.uk/healthcare-immigration-application/how-much-pay">student health surcharge rate is £776 per year</a>; the total depends on the visa length. Check the official charges again before applying.</p>
          </section>
        </section>

        {/* Visa + post-study */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <ShieldCheck className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Student visa</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Offer from a licensed UK Student sponsor that meets the Student visa requirements</li>
              <li>Confirmation of Acceptance for Studies (CAS)</li>
              <li>Course fees on your CAS and maintenance evidence where applicable, for up to nine months</li>
              <li>English-language evidence that meets Student visa rules, including an approved SELT where required</li>
              <li>ATAS certificate for specified STEM subjects</li>
              <li>TB test at an approved clinic if GOV.UK requires it</li>
            </ol>
            <p className="text-xs text-muted-foreground italic mt-4">CAS issuance is a decision of the sponsoring institution. Visa decisions are made by UKVI.</p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <Briefcase className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Graduate Route (post-study work)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Eligible graduates must apply from inside the UK and meet the separate <a className="font-semibold text-primary underline underline-offset-4" href="https://www.gov.uk/graduate-visa">Graduate visa requirements</a>. For eligible non-doctoral applicants, the published duration is two years if applying on or before 31 December 2026, and 18 months from 1 January 2027. It is three years for an eligible PhD or other doctoral qualification.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">A top-up or a course studied from Pakistan does not automatically qualify. Ask the UK institution to confirm the exact course, sponsor and mode, then check the official rules before applying.</p>
          </div>
        </section>

        {/* Documents */}
        <section className="surface-card p-6 rounded-2xl border border-border/50">
          <h3 className="text-lg font-bold mb-4">Document checklist — UK application</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              'Current passport or other valid travel documentation',
              'Transcripts with attestations or translations where requested by the institution',
              'Award certificates where requested',
              'Check academic English evidence with the university and visa English evidence separately with GOV.UK',
              'CV / résumé',
              'Personal statement',
              'Two academic references (master’s)',
              'Financial evidence matching the applicable GOV.UK requirements',
              'TB test certificate where required, from an approved clinic',
              'ATAS (specified STEM subjects only)',
            ].map((d, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <LanguageAcademy track="english" />

      </div>

      <footer className="border-t border-border/40 mt-14 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} UniPathway — operated by the Pakistan-registered entity named in your fee schedule and invoice. Agent conduct aligned to the British Council Agent Quality Framework.</p>
          <p>Admission and CAS decisions are made by the UK institution. Visa decisions are made by UK Visas and Immigration.</p>
        </div>
      <div className="mx-auto max-w-6xl px-4 mt-6"><CompanyDetails /></div></footer>
    </div>
  );
}
