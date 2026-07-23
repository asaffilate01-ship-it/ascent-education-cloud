import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface Props {
  flag: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  destination: 'germany' | 'uk';
}

export default function DestinationHero({ flag, eyebrow, title, subtitle, bullets, destination }: Props) {
  const { slug } = useParams();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-4">
            <span className="text-base leading-none">{flag}</span> {eyebrow}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">{title}</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-xl leading-relaxed">{subtitle}</p>
          <ul className="mt-6 space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-foreground/80">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={`/tenant/${slug}/apply/${destination}`}>
              <Button size="lg">Start an application <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </Link>
            <Link to={`/tenant/${slug}/pathways`}>
              <Button variant="outline" size="lg">Compare pathways</Button>
            </Link>
          </div>
        </div>
        <div className="hidden lg:flex justify-center">
          <div className="text-[14rem] leading-none select-none opacity-90">{flag}</div>
        </div>
      </div>
    </section>
  );
}
