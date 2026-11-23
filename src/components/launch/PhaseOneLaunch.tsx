import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Calculator, GraduationCap, Laptop, School } from 'lucide-react';
import { phaseOneOffers, phaseTwoAreas } from '@/lib/launchPhases';

const icons: Record<string, React.ElementType> = { tuition: School, 'uk-diplomas': GraduationCap, acca: Calculator, ielts: BookOpen, 'tech-certs': Laptop };

/** Phase 1 launch courses, with a short note on what follows in Phase 2. */
export default function PhaseOneLaunch({ eyebrow = 'Phase 1 launch' }: { eyebrow?: string }) {
  return <section id="phase-one" aria-labelledby="phase-one-title" className="scroll-mt-28">
    <p className="text-xs font-bold uppercase tracking-widest text-success">{eyebrow}</p>
    <h2 id="phase-one-title" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Our first courses</h2>
    <p className="mt-3 max-w-2xl text-muted-foreground">We are opening with five areas, taught live online across Pakistan and in class at our Jhelum centre.</p>
    <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
      {phaseOneOffers.map(offer => { const Icon = icons[offer.id] || GraduationCap; return <Link key={offer.id} to={offer.to} className="group flex min-w-0 flex-col rounded-2xl border border-success/30 bg-card p-5 transition-colors hover:border-success hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-11 place-items-center rounded-xl bg-success/10 text-success"><Icon className="size-5" /></span>
        <h3 className="mt-4 font-bold leading-snug">{offer.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{offer.summary}</p>
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-success">View details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
      </Link>; })}
    </div>
    <details className="mt-5 rounded-xl border bg-secondary/30 p-4">
      <summary className="cursor-pointer py-1 text-sm font-semibold">Coming in Phase 2</summary>
      <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{phaseTwoAreas.map(item => <li key={item}>• {item}</li>)}</ul>
    </details>
  </section>;
}
