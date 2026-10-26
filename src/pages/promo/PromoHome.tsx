import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, Globe2, School, Video, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import heroImage from '@/assets/promo-hero.jpg';
const pathways = [
  { title: 'Complete Education Centre', caption: 'Matric, FSc, FA/ICS/ICom, Cambridge O/A Levels, global languages and vocational certifications', to: '/education-centre', icon: GraduationCap, number: '00' },
  { title: 'UK & international qualifications', caption: 'Online LMS plus two 14-day centre visits for eligible programmes', to: '/qualifications', icon: GraduationCap, number: '01' },
  { title: 'Technology Academy', caption: 'AI, software, Python, cyber security, cloud and DevOps', to: '/tech-academy', icon: School, number: '02' },
  { title: 'Accounting & Finance Academy', caption: 'Bookkeeping, tax, financial reporting and IFA/ACCA preparation', to: '/finance-academy', icon: GraduationCap, number: '09' },
  { title: 'Women’s Beauty & Aesthetics', caption: 'Planned beauty training; CIBTAC centre and CPD UK approvals under preparation', to: '/beauty-aesthetics', icon: GraduationCap, number: '10' },
  { title: 'Years 8–12 Tuition', caption: 'Online and in-centre maths, English, biology, chemistry, physics and tech', to: '/tuition', icon: BriefcaseBusiness, number: '03' },
  { title: 'European & Global University Pathways', caption: 'Explore EU and wider European destinations, alongside the UK, USA, Canada, Australia and Pakistan', to: '/europe', icon: Globe2, number: '04' },
  { title: 'IELTS Preparation', caption: 'Academic & General Training with guided practice', to: '/ielts-preparation', icon: BookOpen, number: '05' },
  { title: 'German Courses', caption: 'A1–C1, Goethe, TestDaF, telc and DSH preparation', to: '/german-preparation', icon: BookOpen, number: '06' },
  { title: 'Pakistan Funded Skills', caption: 'PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC programmes', to: '/funded-courses', icon: GraduationCap, number: '07' },
  { title: 'Careers & Internships', caption: 'Pakistan employers, placements and overseas student support', to: '/careers', icon: BriefcaseBusiness, number: '08' },
];

export default function PromoHome() {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All subjects');
  const areas: Record<string, string[]> = {
    'All subjects': [],
    'School tuition': ['/tuition', '/education-centre'],
    'Languages': ['/ielts-preparation', '/german-preparation'],
    'Career skills': ['/tech-academy', '/finance-academy', '/beauty-aesthetics', '/funded-courses', '/careers'],
    'Qualifications & university': ['/qualifications', '/europe'],
  };
  const matches = pathways.filter(p => `${p.title} ${p.caption}`.toLowerCase().includes(query.trim().toLowerCase()) && (area === 'All subjects' || areas[area].includes(p.to)));
  return <div className="public-site min-h-dvh bg-background text-foreground">
    <Seo title="UniPathway | Online & In-Class Learning in Pakistan" description="Explore tuition, languages, qualifications and skills. Learn online across Pakistan or in class in Jhelum." canonical="/" />
    <PublicNav />
    <main id="main-content">
      <section className="border-b bg-[#f6f5ef] dark:bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-success">Your next chapter starts in Pakistan</p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl">Learn online.<br />Learn in class.<br /><span className="text-success">Move forward.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">Build your skills, prepare for exams or take your next academic step. Online across Pakistan. In class at our Jhelum centre.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="h-12 px-6" asChild><a href="#study">Find your course <ArrowRight /></a></Button><Button variant="outline" size="lg" className="h-12" asChild><Link to="/contact">Talk to an adviser</Link></Button></div>
            <a href="#how-it-works" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">See how learning works</a>
          </div>
          <figure className="min-w-0"><img src={heroImage} alt="Pakistani students in separate groups of girls and boys with space between them" className="aspect-[5/4] w-full rounded-2xl object-cover" fetchPriority="high" /><figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><Video className="size-4 text-success" />Online across Pakistan</span><span className="flex items-center gap-2"><School className="size-4 text-success" />In class in Jhelum</span></figcaption></figure>
        </div>
      </section>
      <section id="study" className="scroll-mt-28 py-14 sm:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-success">01 / Find your direction</p>
        <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What would you like to learn?</h2><p className="mt-3 max-w-xl text-muted-foreground">Start with a subject. Check the course details, then speak to us about entry requirements, fees and the next intake.</p></div><div className="relative md:w-80 md:shrink-0"><label htmlFor="home-course-search" className="sr-only">Search learning areas</label><Search className="pointer-events-none absolute left-4 top-4 size-5 text-muted-foreground" /><input id="home-course-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try Python, IELTS or finance" className="h-14 w-full rounded-xl border bg-card pl-12 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div></div>
        <div role="group" aria-label="Filter learning areas" className="mt-7 flex flex-wrap gap-2">{Object.keys(areas).map(label => <button key={label} aria-pressed={area === label} onClick={() => setArea(label)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${area === label ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent'}`}>{label}</button>)}</div><p role="status" className="mt-4 text-sm text-muted-foreground">{query || area !== 'All subjects' ? `${matches.length} matching learning areas` : 'Explore all learning areas'}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.map(({title,caption,to,icon:Icon})=><Link to={to} key={to} className="group relative flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 transition-colors hover:border-success hover:bg-success/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-success/10 text-success"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><h3 className="font-bold leading-snug">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{caption}</p></div><ArrowRight className="mt-1 size-4 shrink-0" /></Link>)}</div>
        {matches.length===0&&<div className="rounded-xl border p-8"><h3 className="font-bold">Let’s find the right option.</h3><p className="mt-2 text-muted-foreground">Try a broader subject or ask an adviser for guidance.</p><button onClick={()=>{setQuery('');setArea('All subjects');}} className="mt-4 min-h-11 font-semibold underline">Show all learning areas</button></div>}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2"><Link className="inline-flex min-h-11 items-center gap-2 font-semibold" to="/study">View the full course guide <ArrowRight className="size-4" /></Link><Link className="inline-flex min-h-11 items-center gap-2 font-semibold" to="/employer-learning">Learning for your team <ArrowRight className="size-4" /></Link></div>
      </div></section>
      <section id="how-it-works" className="scroll-mt-28 border-y bg-secondary/40 py-14 sm:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-widest text-success">02 / Know what happens next</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">A clear path from interest to learning.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
        ['Choose your course','Explore the subjects, skills and qualifications that fit your goals.'],
        ['Confirm the details','We’ll help you check eligibility, availability, fees and whether your course is online, in class or a mix of both.'],
        ['Start with a plan','Once enrolled, use your student portal for your timetable, available materials and learning support.'],
      ].map(([title,copy],i)=><article key={title} className="border-t border-border pt-5"><span className="text-sm font-bold text-success">0{i+1}</span><h3 className="mt-4 text-xl font-bold">{title}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{copy}</p></article>)}</div></div></section>
      <section className="py-14 sm:py-20"><div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-widest text-success">03 / Keep learning simple</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Your learning.<br />In one place.</h2><p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">On your phone, tablet or computer, your student portal helps you find the next thing to do. Features and class delivery depend on your programme.</p><Button asChild className="mt-7"><Link to="/login">Sign in to your portal <ArrowRight /></Link></Button></div><div className="rounded-2xl border bg-card p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inside your student portal</p>{[['Your classes','Check your timetable and join available live sessions.'],['Your study materials','Find the resources shared for your modules.'],['Your next steps','Keep track of coursework and ask for support.']].map(([title,copy])=><div key={title} className="flex gap-4 border-b py-6 last:border-0 last:pb-0"><CheckCircle2 className="mt-1 size-5 shrink-0 text-success" /><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy}</p></div></div>)}</div></div></section>
      <section className="bg-primary py-14 text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 sm:px-8 md:flex-row md:items-center"><div><h2 className="text-3xl font-bold">Not sure where to start?</h2><p className="mt-3 max-w-xl text-primary-foreground/80">Tell us your goals. We’ll help you understand your options and choose your next step.</p></div><Button size="lg" variant="secondary" asChild className="h-12 shrink-0"><Link to="/contact">Talk to an adviser <ArrowRight /></Link></Button></div></section>
    </main><PublicFooter />
  </div>;
}
