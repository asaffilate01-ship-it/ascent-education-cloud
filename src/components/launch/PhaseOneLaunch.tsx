import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator, GraduationCap, Laptop, School } from 'lucide-react';
import { phaseOneOffers, phaseTwoAreas } from '@/lib/launchPhases';

const icons: Record<string, React.ElementType> = { tuition: School, 'uk-diplomas': GraduationCap, acca: Calculator, ielts: BookOpen, 'tech-certs': Laptop };

/** Phase 1 launch courses, with a short note on what follows in Phase 2. */
export default function PhaseOneLaunch({ eyebrow = 'January 2027 · Phase 1' }: { eyebrow?: string }) {
  return <section id="phase-one" aria-labelledby="phase-one-title" className="scroll-mt-28">
    <p className="text-xs font-bold uppercase tracking-widest text-success">{eyebrow}</p>
    <h2 id="phase-one-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your January 2027 study options</h2>
    <p className="mt-3 max-w-2xl text-muted-foreground">Our planned first intake covers four preparation areas, with online, in-class and hybrid options subject to confirmed timetable, availability and enrolment.</p>
    <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
      {phaseOneOffers.map(offer => { const Icon = icons[offer.id] || GraduationCap; return <Link key={offer.id} to={offer.to} className="group flex min-w-0 flex-col rounded-2xl border border-success/30 bg-card p-5 transition-colors hover:border-success hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-11 place-items-center rounded-xl bg-success/10 text-success"><Icon className="size-5" /></span>
        <h3 className="mt-4 font-bold leading-snug">{offer.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{offer.summary}</p>
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-success">View details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>; })}
    </div>
    <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="later-2027-title"><p className="text-xs font-bold uppercase tracking-widest text-success">Later in 2027 · Phase 2</p><h3 id="later-2027-title" className="mt-2 text-xl font-bold">Build towards a university degree</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Planned Level 3, 4 and 5 qualification pathways in Technology &amp; Computing, Business Management and Accounting &amp; Finance, subject to awarding-body and centre approval. Explore UK Level 6 top-up or international advanced-entry possibilities; receiving universities decide credit and admission.</p><div className="mt-4 flex flex-wrap gap-3"><Link to="/qualifications?phase=2" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Register interest in later intakes <ArrowRight aria-hidden="true" className="ml-2 size-4"/></Link><Link to="/international-study" className="inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold">International study and visa information</Link></div></section>
    <details className="mt-5 rounded-xl border bg-secondary/30 p-4">
      <summary className="cursor-pointer py-1 text-sm font-semibold">Further planned courses and approval-dependent areas</summary>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{phaseTwoAreas.map(item => <li key={item}>• {item}</li>)}</ul>
    </details>
  </section>;
}
