import type { ReactNode } from 'react';
import english from '@/assets/blog/english-exams.jpg';
import german from '@/assets/blog/german-exams.jpg';
import guidance from '@/assets/blog/diploma-guidance.jpg';
import students from '@/assets/tenant-hero.jpg';

const images = {
  study: { src: students, alt: 'Students with books on a campus' },
  guidance: { src: guidance, alt: 'Learners reviewing study options together' },
  english: { src: english, alt: 'Learner practising listening skills with headphones' },
  german: { src: german, alt: 'German language study materials' },
  technology: { src: '/images/heroes/technology.jpg', alt: 'Collaborative work using a laptop' },
  finance: { src: '/images/heroes/finance.jpg', alt: 'Reviewing financial documents at a desk' },
  beauty: { src: '/images/heroes/beauty.jpg', alt: 'Make-up tools and beauty products' },
  campus: { src: students, alt: 'Students in modest clothing holding books on a campus' },
  germany: { src: '/images/heroes/germany.jpg', alt: 'Brandenburg Gate in Berlin' },
  uk: { src: '/images/heroes/uk.jpg', alt: 'London skyline beside the River Thames' },
  usa: { src: '/images/heroes/usa.jpg', alt: 'Statue of Liberty in New York' },
  canada: { src: '/images/heroes/canada.jpg', alt: 'Toronto skyline' },
  australia: { src: '/images/heroes/australia.jpg', alt: 'Sydney harbour' },
  tuition: { src: '/images/heroes/tuition.jpg', alt: 'Study notes and learning materials on a desk' },
  careers: { src: '/images/heroes/careers.jpg', alt: 'Colleagues collaborating in a workplace' },
};
export type HeroTopic = keyof typeof images;

export function HeroImage({ topic, className = '' }: { topic: HeroTopic; className?: string }) {
  const photo = images[topic];
  return <img src={photo.src} alt={photo.alt} width={1200} height={800} fetchPriority="high" decoding="async" className={`aspect-[3/2] w-full rounded-2xl object-cover ${className}`} />;
}

/** Text remains separate from the photograph for readable contrast at every size. */
export default function PublicHero({ topic, children }: { topic: HeroTopic; children: ReactNode }) {
  return <header className="public-hero grid items-center gap-7 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
    <div className="min-w-0">{children}</div>
    <HeroImage topic={topic} />
  </header>;
}
