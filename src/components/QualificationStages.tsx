import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stages = [
  { title: 'Level 3 · Build your foundation', text: 'A-levels and Level 3 diplomas sit at this level. A Level 3 Foundation Diploma can prepare you for further study, subject to the next provider’s entry requirements.', to: '/qualifications?level=3#qualification-filters', action: 'Explore Level 3' },
  { title: 'University foundation year', text: 'A preparatory year for a particular degree route. Its level, entry requirements and progression conditions depend on the university. It is different from a foundation degree.', to: '/university-progression', action: 'Explore university routes' },
  { title: 'Level 4 · Higher education begins', text: 'Examples include a Higher National Certificate (HNC) and Level 4 diplomas. Credit and recognition vary; a diploma is not automatically the first year of any university degree.', to: '/qualifications?level=4#qualification-filters', action: 'Explore Level 4' },
  { title: 'Level 5 · Diploma or foundation degree', text: 'HNDs, Level 5 diplomas and UK foundation degrees are different awards at the same level. A foundation degree is a higher education qualification, often called FdA or FdSc—not a foundation year.', to: '/qualifications?level=5#qualification-filters', action: 'Explore Level 5 diplomas' },
  { title: 'Level 6 · Bachelor’s degree stage', text: 'Bachelor’s degrees and Level 6 diplomas sit at this level, but are different qualifications. A top-up degree requires the receiving university to accept your previous learning.', to: '/qualifications?level=6#qualification-filters', action: 'Explore Level 6 diplomas' },
  { title: 'Level 7 · Postgraduate stage', text: 'Master’s degrees and postgraduate diplomas sit at this level. A Level 7 diploma is not itself a master’s degree. Ask about verified entry requirements, available providers and any additional study.', to: '/contact?interest=Level%207%20postgraduate%20guidance', action: 'Ask about postgraduate routes' },
];

export default function QualificationStages() {
  return <section aria-labelledby="qualification-stages" className="rounded-2xl border bg-secondary/30 p-5 sm:p-8">
    <div className="flex items-start gap-3"><GraduationCap className="mt-1 size-7 shrink-0 text-success" aria-hidden="true"/><div>
      <p className="text-label text-success">Find your starting point</p>
      <h2 id="qualification-stages" className="mt-2 text-2xl font-bold sm:text-3xl">From Level 3 to postgraduate study</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Compare stages before choosing a course. These UK level descriptions follow the England, Wales and Northern Ireland framework; Scotland uses a different framework. Your previous qualifications, subject and chosen provider determine your entry point.</p>
    </div></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stages.map(stage => <article key={stage.title} className="flex flex-col rounded-xl border bg-card p-5">
        <h3 className="font-bold">{stage.title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{stage.text}</p>
        <Button asChild variant="outline" className="mt-5 h-auto min-h-11 justify-between whitespace-normal text-left"><Link to={stage.to}>{stage.action}<ArrowRight aria-hidden="true" className="ml-2 size-4 shrink-0"/></Link></Button>
      </article>)}
    </div>
    <p className="mt-5 text-sm leading-relaxed text-muted-foreground">This is a progression guide, not a list of approved UniPathway intakes. Foundation degrees, foundation years and postgraduate routes require provider confirmation. Admission, credit transfer, Pakistani equivalence and progression are not guaranteed.</p>
    <a href="https://www.gov.uk/what-different-qualification-levels-mean/list-of-qualification-levels" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" target="_blank" rel="noreferrer">Check the official UK qualification levels<span className="sr-only"> (opens in a new tab)</span></a>
  </section>;
}
