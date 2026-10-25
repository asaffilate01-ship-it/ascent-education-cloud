import type { ReactNode } from 'react';

const images = {
  study: { src: '/images/heroes/tuition.jpg', alt: 'Independent study with notes and learning materials' },
  guidance: { src: '/images/heroes/finance.jpg', alt: 'An individual reviewing documents at a desk' },
  english: { src: '/images/heroes/academy-english-v1.webp', alt: 'Female tutor and adult learner practising English with headphones' },
  german: { src: '/images/heroes/academy-german-v1.webp', alt: 'German vocabulary workbook, flashcards and headphones' },
  technology: { src: '/images/heroes/academy-technology-v1.webp', alt: 'Two male students learning programming and electronics' },
  finance: { src: '/images/heroes/academy-accountancy-v1.webp', alt: 'Two male learners studying accountancy with a spreadsheet and calculator' },
  beauty: { src: '/images/heroes/academy-beauty-v1.webp', alt: 'Female instructor and learner practising make-up on a training mannequin' },
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
export default function PublicHero({ topic, children }: { topic: HeroTopic; children: ReactNode }) {
  return <header className="public-hero grid items-center gap-7 rounded-2xl border border-border bg-secondary/40 p-5 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
    <div className="min-w-0">{children}</div>
    <HeroImage topic={topic} />
  </header>;
}
