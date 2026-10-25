import type { ReactNode } from 'react';

const images = {
  study: { src: '/images/heroes/tuition.jpg', alt: 'Independent study with notes and learning materials' },
  guidance: { src: '/images/heroes/finance.jpg', alt: 'An individual reviewing documents at a desk' },
  english: { src: '/images/heroes/academy-english-v3.webp', alt: 'Male instructor teaching a group of young adult learners in an English classroom' },
  german: { src: '/images/heroes/academy-german-v3.webp', alt: 'Female instructor teaching vocabulary to young women in a German language classroom' },
  technology: { src: '/images/heroes/academy-technology-v3.webp', alt: 'Young adult male students at computer desks learning programming in a technology classroom' },
  finance: { src: '/images/heroes/academy-accountancy-v3.webp', alt: 'Female instructor teaching accountancy to young women at classroom desks' },
  beauty: { src: '/images/heroes/academy-beauty-v3.webp', alt: 'Young women practising make-up on mannequins at separate beauty-training workstations' },
  campus: { src: '/images/heroes/tuition.jpg', alt: 'Independent study with notes and learning materials' },
  germany: { src: '/images/heroes/germany.jpg', alt: 'Brandenburg Gate in Berlin' },
  uk: { src: '/images/heroes/uk.jpg', alt: 'London skyline beside the River Thames' },
  usa: { src: '/images/heroes/usa.jpg', alt: 'Statue of Liberty in New York' },
  canada: { src: '/images/heroes/canada.jpg', alt: 'Toronto skyline' },
  australia: { src: '/images/heroes/australia.jpg', alt: 'Sydney harbour' },
  tuition: { src: '/images/heroes/tuition.jpg', alt: 'Study notes and learning materials on a desk' },
  careers: { src: '/images/heroes/finance.jpg', alt: 'An individual preparing documents at a desk' },
};
export type HeroTopic = keyof typeof images;

export function HeroImage({ topic, className = '' }: { topic: HeroTopic; className?: string }) {
  const photo = images[topic];
  const srcSet = photo.src.endsWith('.webp') ? `${photo.src.replace('.webp', '-640.webp')} 640w, ${photo.src} 1200w` : undefined;
  return <img src={photo.src} srcSet={srcSet} sizes="(max-width: 1023px) calc(100vw - 80px), 560px" alt={photo.alt} width={1200} height={800} fetchPriority="high" decoding="async" className={`aspect-[3/2] w-full rounded-2xl object-cover ${className}`} />;
}

/** Text remains separate from the photograph for readable contrast at every size. */
export default function PublicHero({ topic, children, compact = false }: { topic: HeroTopic; children: ReactNode; compact?: boolean }) {
  return <header className="public-hero grid items-center gap-7 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
    <div className="min-w-0">{children}</div>
    <HeroImage topic={topic} className={compact ? 'h-28 sm:h-auto' : ''} />
  </header>;
}
