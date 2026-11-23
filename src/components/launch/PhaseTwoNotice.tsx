import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { registerInterestUrl } from '@/lib/launchPhases';

/** Shown on Phase 2 pages: the area is coming soon and visitors can register interest. */
export default function PhaseTwoNotice({ area, subject }: { area: string; subject: string }) {
  return <aside aria-label="Launch timing" className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-5">
    <Clock aria-hidden="true" className="size-6 shrink-0 text-foreground" />
    <div className="min-w-0 flex-[1_1_18rem]">
      <p className="font-bold">{subject} is coming in our Phase 2 launch</p>
      <p className="mt-1 text-sm text-muted-foreground">These courses are not open for enrolment yet. Register your interest and admissions will contact you when they open.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button asChild><Link to={registerInterestUrl(area)}>Register interest <ArrowRight /></Link></Button>
      <Button asChild variant="outline"><Link to="/#phase-one">See courses open now</Link></Button>
    </div>
  </aside>;
}
