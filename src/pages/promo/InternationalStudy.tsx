import { ArrowRight, ArrowUpRight, BookOpen, Globe2, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import PublicFooter from '@/components/PublicFooter';
import PublicNav from '@/components/PublicNav';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { findInternationalStudyGuide, immigrationSourcesChecked, internationalStudyGuides } from '@/lib/internationalStudy';

const hub = '/international-study';

function GuidanceBoundary() {
  return (
    <aside aria-label="Scope of this guidance" className="rounded-2xl border border-border bg-muted/50 p-5 sm:p-6">
      <div className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-success" /><h2 className="text-base font-bold">Admission and immigration are separate</h2></div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">This information is for study planning, not individual immigration advice. The school decides admission and the relevant authorities decide immigration applications. Before applying or paying, check the official rules for your situation and application date. For individual immigration advice, use a qualified or authorised adviser where appropriate. Do not send passports, bank statements or visa documents in a general enquiry.</p>
      <p className="mt-3 text-sm font-semibold">Official sources checked <time dateTime={immigrationSourcesChecked}>24 November 2026</time>.</p>
    </aside>
  );
}

const inPageLink = 'inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md py-2 text-sm font-semibold text-primary underline decoration-1 underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4';

export default function InternationalStudy() {
  const { destination } = useParams();
  const guide = destination ? findInternationalStudyGuide(destination) : undefined;
  return (
    <div className="public-site min-h-dvh bg-background text-foreground">
      {guide ? (
        <Seo canonical={`${hub}/${guide.slug}`} title={`${guide.country} Student Visa & International Study | UniPathway`} description={`Plan study in ${guide.country} from Pakistan, with a separate admissions checklist and official immigration links.`} />
      ) : destination ? (
        <Seo title="Destination guide not found | UniPathway" description="Return to the UniPathway international study guide directory." noindex />
      ) : (
        <Seo canonical={hub} title="International Study & Visa Guidance | UniPathway" description="Compare international admissions steps and find official student visa and permit guidance for nine study destinations from Pakistan." />
      )}
      <PublicNav />
      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-12 pt-6 sm:px-8 sm:pt-10">
        {destination && <nav aria-label="Breadcrumb"><Link className={inPageLink} to={hub}>All international study guides</Link></nav>}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-primary px-5 py-8 text-primary-foreground sm:p-12">
          {guide ? (
            <>
              <p className="text-label text-gold">International study guide</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Study in {guide.country === 'United Kingdom' || guide.country === 'United States' || guide.country === 'Netherlands' ? 'the ' : ''}{guide.country}</h1>
              <p className="mt-4 text-base leading-relaxed">{guide.route} and university admissions for students applying from Pakistan.</p>
            </>
          ) : destination ? (
            <>
              <h1 className="text-3xl font-extrabold sm:text-5xl">Destination guide not found</h1>
              <p className="mt-4 text-base leading-relaxed">Choose a verified guide or use the European study directory to explore other countries.</p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-label text-gold"><Globe2 aria-hidden="true" className="size-5" /> UniPathway study abroad</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">International study &amp; visa guidance</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed">Find out how to research courses, then check the separate student visa or study permit process with the official authority. Start with a destination below.</p>
            </>
          )}
        </header>
        {!destination && <>
          <section aria-labelledby="destination-guides">
            <h2 id="destination-guides" className="text-2xl font-bold sm:text-3xl">Choose a destination</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {internationalStudyGuides.map(entry => (
                <li key={entry.slug} className="min-w-0">
                  <Link to={`${hub}/${entry.slug}`} className="group flex h-full min-h-24 items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-5">
                    <span className="min-w-0"><span className="block text-xs font-semibold text-success">{entry.region}</span><span className="mt-1 block text-lg font-bold">{entry.country}</span><span className="mt-1 block text-sm text-muted-foreground">{entry.route}</span></span>
                    <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="more-europe">
            <h2 id="more-europe" className="text-xl font-bold">Looking for another European country?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Our Europe directory covers all 27 EU member countries and selected other destinations for academic research. Immigration rules are country-specific; use that country’s official instructions.</p>
            <div className="mt-3 flex flex-wrap gap-x-6">
              <Link to="/europe" className={inPageLink}>Explore the European study directory <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
              <a href="https://home-affairs.ec.europa.eu/policies/migration-and-asylum/eu-immigration-portal_en" className={inPageLink}>European Commission immigration portal <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></a>
            </div>
          </section>
        </>}
        {guide && <>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section aria-labelledby="education-title" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <BookOpen aria-hidden="true" className="size-5 text-success" />
              <p className="mt-4 text-label text-success">01 · Education</p>
              <h2 id="education-title" className="mt-2 text-xl font-bold sm:text-2xl">Plan your academic application</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide.education}</p>
              <Link to={guide.academicLink} className={`${inPageLink} mt-3`}>Explore {guide.country} study options <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
            </section>
            <section aria-labelledby="immigration-title" className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <ShieldCheck aria-hidden="true" className="size-5 text-success" />
              <p className="mt-4 text-label text-success">02 · Immigration</p>
              <h2 id="immigration-title" className="mt-2 text-xl font-bold sm:text-2xl">{guide.route}: what to check</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground marker:font-bold marker:text-primary">
                {guide.steps.map(step => <li className="pl-1" key={step}>{step}</li>)}
              </ol>
              {guide.slug === 'uk' && <Link to="/uk#student-visa-costs" className={`${inPageLink} mt-3`}>See UK Student visa costs and dated financial rules <ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>}
              <h3 className="mt-5 border-t border-border pt-4 text-base font-bold">Official sources</h3>
              <ul className="mt-1">{guide.sources.map(source => <li key={source.url}><a href={source.url} className={inPageLink}>{source.label} <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /></a></li>)}</ul>
            </section>
          </div>
          <div><Button variant="outline" asChild><Link to={hub}>Compare other destinations <ArrowRight aria-hidden="true" /></Link></Button></div>
        </>}
        {destination && !guide && <Button asChild><Link to={hub}>Open the guide directory</Link></Button>}
        <GuidanceBoundary />
      </div>
      <PublicFooter />
    </div>
  );
}
