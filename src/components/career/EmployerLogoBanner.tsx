import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { employerBrands, type EmployerBrand } from '@/data/employerBrands';
import './EmployerLogoBanner.css';

function BrandCard({ brand }: { brand: EmployerBrand }) {
  const [failed, setFailed] = useState(false);
  return <div className="employer-logo-card">
    <div className={`employer-logo-art ${brand.dark ? 'employer-logo-art-dark' : ''}`}>
      {!failed && brand.logo ? <img src={brand.logo} alt="" width="180" height="72" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span className="font-semibold text-slate-800">{brand.name}</span>}
    </div>
    <span className="text-xs font-semibold text-muted-foreground">{brand.name}</span>
  </div>;
}

export default function EmployerLogoBanner() {
  const id = useId();
  const [paused, setPaused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  return <section aria-labelledby={`${id}-title`} className="employer-banner my-8 min-w-0 rounded-2xl border bg-card py-6 sm:py-8" data-paused={paused} data-expanded={showAll}>
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-widest text-success">Build skills. Gain experience.</p>
        <h2 id={`${id}-title`} className="mt-2 text-xl font-bold sm:text-2xl">Explore internships & training opportunities</h2>
        <p className="mt-3 text-sm text-muted-foreground">Discover our group brands and explore career pathways with leading employers in Pakistan and global technology companies.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="employer-motion-control" variant="outline" size="sm" onClick={() => setPaused(!paused)} aria-pressed={paused} disabled={showAll}>
          {paused ? <Play className="mr-2 size-4" /> : <Pause className="mr-2 size-4" />}{paused ? 'Resume scrolling' : 'Pause scrolling'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} aria-controls={`${id}-logos`}>{showAll ? 'Show scrolling banner' : 'View all employers'}</Button>
      </div>
    </div>
    <div id={`${id}-logos`} className="mt-6 space-y-5">
      {(['group', 'external'] as const).map(group => {
        const brands = employerBrands.filter(b => b.group === group);
        return <div key={group}>
          <h3 className="mb-3 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:px-8">{group === 'group' ? 'Our group brands' : 'Pakistan & global employer pathways'}</h3>
          <div className="employer-logo-window">
            <div className="employer-logo-track">
              <ul className="employer-logo-set" aria-label={group === 'group' ? 'Our group brands' : 'Employers to explore'}>
                {brands.map(brand => <li key={brand.id}><BrandCard brand={brand} /></li>)}
              </ul>
              <ul className="employer-logo-set employer-logo-copy" aria-hidden="true">
                {brands.map(brand => <li key={brand.id}><BrandCard brand={brand} /></li>)}
              </ul>
            </div>
          </div>
        </div>;
      })}
    </div>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">Featured organisations illustrate career and training pathways. Inclusion does not confirm a partnership, an open vacancy or a guaranteed placement. Opportunities depend on eligibility, availability and employer approval.</p>
      <Button asChild size="sm"><Link to="/contact">Ask about internships <ArrowRight className="ml-2 size-4" /></Link></Button>
    </div>
  </section>;
}
