import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import TenantNav from '@/components/TenantNav';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';
import InternationalEnquiryForm from '@/components/enquiry/InternationalEnquiryForm';
import { getProgressionInstitutions } from '@/lib/universityProgressionDirectory';
import { ArrowRight, BookOpenCheck, GraduationCap, MessageSquareText } from 'lucide-react';

const publishedInstitutions = getProgressionInstitutions();
const DESTINATIONS = [
  { key: 'UK', label: 'United Kingdom', symbol: '🇬🇧', guide: '/uk' },
  { key: 'Germany', label: 'Germany', symbol: '🇩🇪', guide: '/germany' },
  { key: 'USA', label: 'United States', symbol: '🇺🇸', guide: '/usa' },
  { key: 'Australia', label: 'Australia', symbol: '🇦🇺', guide: '/australia' },
  { key: 'Canada', label: 'Canada', symbol: '🇨🇦', guide: '/canada' },
] as const;

export default function PathwaysCompare() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('destination');
  const destination = DESTINATIONS.find(item => item.key === requested);
  const chosenUniversity = publishedInstitutions.find(
    entry => entry.name === params.get('university') && entry.country === requested
  );
  const requestedBody = params.get('body');
  const chosenBody = chosenUniversity?.records.some(r=>r.body===requestedBody) &&
    (requestedBody==='OTHM'||requestedBody==='Qualifi') ? requestedBody : undefined;
  if (requested === 'Pakistan') return <Navigate to="/pakistan" replace />;
  return (
    <div className="public-site min-h-dvh bg-background text-foreground">
      <Seo title="Study Abroad & University Admissions | UniPathway" description="Explore university admissions outside Pakistan, including the UK, Germany, USA, Australia and Canada. Request personalised guidance." canonical="/pathways" />
      <TenantNav brandName="UniPathway" />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <PublicHero topic="campus">
          <p className="text-sm font-bold uppercase tracking-wide text-success">Study abroad & university admissions</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">University progression, built on real learning</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            UniPathway teaches and trains learners in Pakistan through tuition, qualifications, digital and professional skills, and language preparation. We then help them research universities, strengthen entry evidence, plan applications and prepare for the next stage of student life. Choose a destination to begin.
          </p>
        </PublicHero>
<PageContents/>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border bg-secondary/40 p-5"><p className="font-semibold">Explore all European countries</p><p className="mt-2 text-sm text-muted-foreground">Not limited to Germany: compare all EU destinations, study languages, academic subject themes and example institutions without leaving UniPathway.</p><Button asChild variant="outline" className="mt-3"><Link to="/europe">Explore European study pathways <ArrowRight className="ml-2 size-4"/></Link></Button></section>
          <section className="rounded-xl border bg-secondary/40 p-5"><p className="font-semibold">Learn and train with UniPathway first</p><p className="mt-2 text-sm text-muted-foreground">Years 8–12 tuition, UK and international diploma planning, accounting, AI, coding, language courses and practical skills form the foundation of our progression service.</p><Button asChild variant="outline" className="mt-3"><Link to="/study">Explore our teaching and training <ArrowRight className="ml-2 size-4"/></Link></Button></section>
        </div>
        <div className="rounded-xl border bg-secondary/40 p-5">
          <p className="font-semibold">Looking for university study within Pakistan instead?</p>
          <p className="mt-2 text-sm text-muted-foreground">Explore Pakistani universities, HEC-recognised campuses, local degree progression, scholarships, vocational training and career opportunities separately from international study.</p>
          <Button asChild variant="outline" className="mt-3"><Link to="/pakistan">Study in Pakistan <ArrowRight className="ml-2 size-4"/></Link></Button>
        </div>
        <section aria-labelledby="destinations-title" className="space-y-4">
          <div><span className="text-xs font-bold uppercase tracking-wider text-success">Step 1</span><h2 id="destinations-title" className="mt-1 text-2xl font-bold">Where would you like to study abroad?</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DESTINATIONS.map(item => <button key={item.key} type="button" aria-pressed={destination?.key === item.key} onClick={() => setParams({ destination: item.key })} className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${destination?.key === item.key ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/60 hover:bg-secondary/60'}`}>
              <span className="text-2xl" aria-hidden="true">{item.symbol}</span><span className="font-semibold">{item.label}</span>
            </button>)}
          </div>
          {!destination && <p className="text-sm text-muted-foreground">Select a destination to see the next step. You can still send an enquiry if you are undecided.</p>}
        </section>

        {destination && <section aria-live="polite" className="rounded-xl border border-border bg-secondary/40 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-success">Step 2</span>
          <h2 className="mt-1 text-xl font-bold">Explore {destination.label}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            University admissions depend on your exact qualification, grades, language requirements, the course and the institution. UK diplomas do not guarantee admission or credit transfer. We'll verify your intended route before describing it as confirmed.
          </p>
          {('guide' in destination) && <Button asChild variant="outline" className="mt-4"><Link to={destination.guide}>Read {destination.label} study guide <ArrowRight className="ml-2 size-4" /></Link></Button>}
          {!('guide' in destination) && <p className="mt-3 text-sm font-medium">We can review your individual options for this destination using the enquiry form below.</p>}
        </section>}

        <section className="space-y-4" aria-labelledby="support-title">
          <h2 id="support-title" className="text-2xl font-bold">How UniPathway can help</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: BookOpenCheck, title: 'Qualification review', copy: 'Review your current study, academic records and possible progression routes.' },
              { icon: GraduationCap, title: 'University choices', copy: 'Understand programme fit, entry requirements and available application routes.' },
              { icon: MessageSquareText, title: 'Application guidance', copy: 'Get help with your enquiry, next steps and required documents.' },
            ].map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-xl border bg-card p-5"><Icon className="size-6 text-success" /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{copy}</p></article>)}
          </div>
        </section>

        <section aria-labelledby="enquiry-title" className="space-y-4">
          {chosenUniversity && <div className="rounded-xl border bg-card p-4 text-sm" role="status">
            <p className="font-bold">Selected university: {chosenUniversity.name}</p>
            <p className="mt-1 text-muted-foreground">The chosen institution is on an awarding-body progression list for particular qualifications; UniPathway will verify your own course, grades and admission options.</p>
          </div>}
          <div><span className="text-xs font-bold uppercase tracking-wider text-success">Step 3</span><h2 id="enquiry-title" className="mt-1 text-2xl font-bold">Ask us about your options</h2><p className="mt-2 text-muted-foreground">{destination ? `You've selected ${destination.label}. Mention this destination in your enquiry so our team can assist.` : 'Not sure where to study? Tell us your qualifications and goals.'}</p></div>
          <InternationalEnquiryForm kind="university" defaultDestination={destination?.key} defaultUniversity={chosenUniversity?.name} defaultQualification={chosenBody}/>
        </section>
        <div className="border-t pt-6"><p className="text-xs leading-relaxed text-muted-foreground">University admission, recognition of prior learning and financial support are assessed case by case.</p></div>
      </main>
    </div>
  );
}
