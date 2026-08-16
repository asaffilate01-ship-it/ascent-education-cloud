import TenantNav from '@/components/TenantNav';
import ComplianceDisclosure from '@/components/tenant/ComplianceDisclosure';
import LanguageAcademy from '@/components/tenant/LanguageAcademy';
import DestinationHero from '@/components/tenant/DestinationHero';
import { GraduationCap, Wallet, ShieldCheck, FileCheck2, Briefcase, Building2 } from 'lucide-react';
import Seo from '@/components/Seo';

export default function UKPathway() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Seo title="Study in the UK from Pakistan — Degrees & Top-Ups | UniPathway" description="UK university pathways for Pakistani students: accredited diplomas, top-up degrees, IELTS preparation and student visa guidance." canonical="/uk" />
      <TenantNav brandName="UniPathway" activePage="home" />

      <DestinationHero
        flag="🇬🇧"
        eyebrow="Study in the United Kingdom"
        title="Foundation, bachelor’s, master’s and top-up routes to the UK"
        subtitle="One-year master’s programmes, wide English-taught delivery and a clear pathway from Pakistani HSSC or A-Levels — with structured Academic English and IELTS / PTE / TOEFL preparation."
        bullets={[
          'One-year taught master’s across most disciplines',
          'Foundation and top-up routes for HSSC and Level 4/5 diploma holders',
          'Graduate Route post-study work — currently 2 years (planned reduction to 18 months from 2027)',
          'Applications handled directly with the licensed Student sponsor institution',
        ]}
        destination="uk"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        <ComplianceDisclosure destination="uk" />

        {/* Study levels */}
        <section>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Study levels</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Which UK route fits your profile?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Building2, title: 'Foundation year', desc: 'For HSSC holders who need an academic bridge before Year 1 of a UK bachelor’s.' },
              { icon: GraduationCap, title: 'Bachelor’s (3 years)', desc: 'For A-Level holders or Foundation graduates. Direct entry to Year 1 of a UK undergraduate degree.' },
              { icon: GraduationCap, title: 'Top-up (final year)', desc: 'Complete UniPathway Level 4 & 5 in Pakistan, then progress to Year 3 at a partner UK university for a full bachelor’s.' },
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
              <li><strong className="text-foreground">UniPathway Level 4 & 5 (240 credits):</strong> progression into Year 3 (top-up) at partner UK universities.</li>
              <li><strong className="text-foreground">Pakistani 4-year bachelor’s:</strong> generally recognised for direct master’s entry.</li>
              <li><strong className="text-foreground">Pakistani 2-year bachelor’s:</strong> normally requires a bridging Level 6 or pre-master’s.</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4">Final equivalency is decided by the UK institution using UK ENIC.</p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <Wallet className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Costs & maintenance funds (indicative)</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">International tuition</span><span className="font-semibold">£12,000 – £28,000 / year</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Living — London</span><span className="font-semibold">£1,483 / month × 9</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Living — outside London</span><span className="font-semibold">£1,136 / month × 9</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Immigration Health Surcharge</span><span className="font-semibold">£776 / year</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Visa application fee</span><span className="font-semibold">£524 (outside UK)</span></li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4">Current figures must be verified on GOV.UK Student Visa guidance at the time of application.</p>
          </div>
        </section>

        {/* Visa + post-study */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <ShieldCheck className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Student visa</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Unconditional offer from a licensed UK Student sponsor</li>
              <li>Confirmation of Acceptance for Studies (CAS)</li>
              <li>Financial evidence — tuition + 9 months maintenance</li>
              <li>Approved English language evidence (SELT where required)</li>
              <li>ATAS certificate for specified STEM subjects</li>
              <li>TB test at an approved Pakistan clinic</li>
            </ol>
            <p className="text-xs text-muted-foreground italic mt-4">CAS issuance is a decision of the sponsoring institution. Visa decisions are made by UKVI.</p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <Briefcase className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Graduate Route (post-study work)</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Successful UK bachelor’s or master’s graduates may apply for the <strong className="text-foreground">Graduate Route</strong> to work or look for work in the UK. The route is currently <strong className="text-foreground">2 years</strong>, with a planned reduction to <strong className="text-foreground">18 months from 2027</strong>. PhD graduates: 3 years.
            </p>
            <p className="text-xs text-muted-foreground italic mt-4">Rules and durations must be checked on GOV.UK at the time of graduation.</p>
          </div>
        </section>

        {/* Documents */}
        <section className="surface-card p-6 rounded-2xl border border-border/50">
          <h3 className="text-lg font-bold mb-4">Document checklist — UK application</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              'Valid passport (min. 6 months validity)',
              'HSSC / A-Level / bachelor transcripts, attested',
              'Degree certificates, attested',
              'Approved English language evidence (IELTS / PTE / TOEFL / MOI where accepted)',
              'CV / résumé',
              'Personal statement',
              'Two academic references (master’s)',
              'Financial evidence — bank statements held 28 consecutive days',
              'TB test certificate — approved Pakistan clinic',
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

        <ComplianceDisclosure destination="language" compact />
      </div>

      <footer className="border-t border-border/40 mt-14 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} UniPathway — operated by the Pakistan-registered entity named in your fee schedule and invoice. Agent conduct aligned to the British Council Agent Quality Framework.</p>
          <p>Admission and CAS decisions are made by the UK institution. Visa decisions are made by UK Visas and Immigration.</p>
        </div>
      </footer>
    </div>
  );
}
