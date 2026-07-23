import TenantNav from '@/components/TenantNav';
import ComplianceDisclosure from '@/components/tenant/ComplianceDisclosure';
import LanguageAcademy from '@/components/tenant/LanguageAcademy';
import DestinationHero from '@/components/tenant/DestinationHero';
import { GraduationCap, Wallet, ShieldCheck, FileCheck2, Briefcase, Building2 } from 'lucide-react';

export default function GermanyPathway() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TenantNav brandName="UniPathway" activePage="home" />

      <DestinationHero
        flag="🇩🇪"
        eyebrow="Study in Germany"
        title="Bachelor’s, master’s and language pathways to Germany"
        subtitle="Low-tuition public universities, English-taught master’s, and a clear route from Pakistani HSSC or A-Levels through Studienkolleg or direct entry — supported by German A1–B2 teaching in Karachi and online."
        bullets={[
          'Most public universities charge only a semester fee (approx. €150–€350)',
          'English-taught master’s programmes available across engineering, IT, business and life sciences',
          '18-month job-seeker residence permit after graduation to find qualified employment',
          'Applications processed via uni-assist or Hochschulstart where the institution requires it',
        ]}
        destination="germany"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        <ComplianceDisclosure destination="germany" />

        {/* Study levels */}
        <section>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Study levels</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">Which route fits your qualifications?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { icon: Building2, title: 'Studienkolleg', desc: 'For HSSC holders who do not meet direct-entry criteria. One-year foundation preparing you for German bachelor’s admission with the Feststellungsprüfung.' },
              { icon: GraduationCap, title: 'Bachelor’s', desc: 'For A-Level or recognised HSSC equivalency. Mostly German-taught (B2 required) with a growing selection of English-taught programmes.' },
              { icon: GraduationCap, title: 'Master’s', desc: 'For Pakistani bachelor holders. Wide selection of English-taught master’s programmes; DAAD equivalency and uni-assist evaluation apply.' },
              { icon: GraduationCap, title: 'PhD', desc: 'Direct supervisor route or structured programmes. Handled case-by-case with the receiving faculty.' },
            ].map((s, i) => (
              <div key={i} className="surface-card p-5 rounded-xl border border-border/50">
                <s.icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Equivalency */}
        <section id="equivalency" className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <FileCheck2 className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Qualification equivalency</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">HSSC (Pakistan / India):</strong> usually not sufficient for direct German bachelor entry — Studienkolleg + Feststellungsprüfung route applies.</li>
              <li><strong className="text-foreground">A-Levels (3 subjects, min. grades per Anabin):</strong> can qualify for direct bachelor entry.</li>
              <li><strong className="text-foreground">4-year Pakistani bachelor’s:</strong> generally recognised for master’s entry, subject to Anabin classification of your university.</li>
              <li><strong className="text-foreground">2-year bachelor’s + Level 5/6 diploma:</strong> assessed on a case-by-case basis via uni-assist.</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4">Equivalency is determined by uni-assist and the receiving institution using the Anabin database. UniPathway prepares your file — it does not decide the outcome.</p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <Wallet className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Costs & blocked funds (indicative)</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Public university tuition</span><span className="font-semibold">€0 – €3,000 / year</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Semester fee</span><span className="font-semibold">€150 – €350</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Sperrkonto (blocked account)</span><span className="font-semibold">approx. €11,904 / year</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Health insurance</span><span className="font-semibold">approx. €120 / month</span></li>
              <li className="flex justify-between gap-4"><span className="text-muted-foreground">Living costs</span><span className="font-semibold">€900 – €1,200 / month</span></li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-4">Verify current figures at the time of application — DAAD Pakistan and Make it in Germany publish authoritative values.</p>
          </div>
        </section>

        {/* Visa & post-study */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <ShieldCheck className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Student visa (Pakistan applicants)</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Conditional or unconditional admission letter</li>
              <li>Sperrkonto opened and funded, or scholarship equivalent</li>
              <li>Health insurance confirmation</li>
              <li>APS certificate (Akademische Prüfstelle) for Pakistani applicants</li>
              <li>National visa (D) appointment at the German Embassy Islamabad or Consulate</li>
            </ol>
            <p className="text-xs text-muted-foreground italic mt-4">The visa decision is made by the competent German authority. Immigration advice on individual cases is provided only by regulated advisers.</p>
          </div>

          <div className="surface-card p-6 rounded-2xl border border-border/50">
            <Briefcase className="w-6 h-6 text-primary mb-3" />
            <h3 className="text-lg font-bold mb-3">Post-study work route</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Graduates of German higher-education institutions may apply for an <strong className="text-foreground">18-month job-seeker residence permit</strong> to find qualified employment matching their degree. Once employed, this can convert to a work residence permit or the EU Blue Card, depending on salary and role.
            </p>
            <p className="text-xs text-muted-foreground italic mt-4">Current rules and thresholds must be checked on Make it in Germany at the time of graduation.</p>
          </div>
        </section>

        {/* Documents */}
        <section id="documents" className="surface-card p-6 rounded-2xl border border-border/50">
          <h3 className="text-lg font-bold mb-4">Document checklist — Germany application</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              'Valid passport (min. 12 months validity)',
              'HSSC / A-Level / bachelor transcripts, notarised',
              'Degree certificates, notarised',
              'APS certificate (Akademische Prüfstelle) — Pakistani applicants',
              'Language certificate — TestDaF / telc / Goethe (German-taught) or IELTS / TOEFL (English-taught)',
              'CV / résumé in English or German',
              'Motivation letter / statement of purpose',
              'Two academic references (for master’s)',
              'Passport-sized photographs (biometric)',
              'Financial evidence — Sperrkonto or scholarship',
            ].map((d, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <LanguageAcademy track="german" />

        <ComplianceDisclosure destination="language" compact />
      </main>

      <footer className="border-t border-border/40 mt-14 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-muted-foreground space-y-2">
          <p>© {new Date().getFullYear()} UniPathway — operated by the Pakistan-registered entity named in your fee schedule and invoice. SECP-compliant education consultancy.</p>
          <p>UniPathway is not a uni-assist placement partner. Admission decisions are made by the institution and immigration decisions are made by the competent authority.</p>
        </div>
      </footer>
    </div>
  );
}
