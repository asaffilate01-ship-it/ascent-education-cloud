import CourseAtAGlance from '@/components/CourseAtAGlance';
import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, Cloud, GraduationCap, Laptop, Search, ShieldCheck, Wallet } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { academyTracks,type AcademyKind } from '@/lib/academyCatalog';

const levels=['All','Foundation','Intermediate','Advanced','Exam preparation'] as const;
export default function AcademyPage({kind}:{kind:AcademyKind}){
 const tech=kind==='tech';
 const [level,setLevel]=useState<string>('All'),[query,setQuery]=useState('');
 const tracks=useMemo(()=>academyTracks(kind).filter(t=>
  (level==='All'||t.level===level)&&`${t.title} ${t.summary} ${t.topics.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())
 ),[kind,level,query]);
 const title=tech?'Technology Academy':'Accounting & Finance Academy';
 return <div className="public-site min-h-dvh bg-background">
   <Seo canonical={tech?'/tech-academy':'/finance-academy'} title={title+' | UniPathway'} description={tech?'AI, coding, cyber security, Cyber Essentials awareness, cloud, DevOps and technology training online and in centre.':'Financial accounting, bookkeeping, finance modelling, software and tutor-led IFA/ACCA exam preparation.'}/>
   <PublicNav/>
   <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
     <PublicHero topic={tech ? 'technology' : 'finance'}>
       <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#128F58]">{title}</p><h1 className="mt-4 text-3xl font-extrabold text-[#0B2D5B] dark:text-white sm:text-5xl">{tech?'Build the skills to create, protect and operate technology.':'Understand the numbers. Build practical financial expertise.'}</h1>
         <p className="mt-5 max-w-3xl leading-relaxed text-slate-700 dark:text-slate-300">{tech?'Learn programming, AI, responsible automation, cloud computing, cyber defence, DevOps and data analytics with applied projects, tutor feedback and career preparation.':'Develop confidence in bookkeeping, financial reporting, tax, management accounting, analytics, treasury and professional examination preparation.'} Explore the subjects below. Ask admissions to confirm the start date, fees and online or in-centre options.</p>
         <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Ask about enrolling <ArrowRight className="ml-1 size-4"/></Link></Button><Button asChild variant="outline"><Link to="/qualifications">Explore awarding-body diplomas</Link></Button></div>
       </div>
       </PublicHero>
<CourseAtAGlance course={title}/><PageContents/>
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{icon:BookOpen,title:'Structured syllabuses',desc:'Clear modules and objectives'},{icon:Laptop,title:'Practical projects',desc:'Exercises and portfolios'},{icon:ClipboardCheck,title:'Tutor feedback',desc:'Assignments and revision'},{icon:GraduationCap,title:'Progression advice',desc:'Next course and career step'}].map(({icon:Icon,title,desc})=><div key={title} className="rounded-xl border bg-white p-4 dark:bg-card"><Icon className="size-6 text-success"/><h2 className="mt-2 text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div>)}</div>

     <section aria-labelledby="academy-programmes-heading" className="space-y-5">
       <div><p className="text-label text-success">Course catalogue</p><h2 id="academy-programmes-heading" className="mt-2 text-2xl font-bold sm:text-3xl">{tech?'Technology and digital learning pathways':'Accounting and finance learning pathways'}</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">These are course descriptions and teaching plans, not a guarantee that every track is currently running or externally certified. Admissions will confirm timetables, eligibility, teaching staff and fees.</p></div>
       <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_220px]">
         <label htmlFor="academy-search" className="text-sm font-semibold"><Search className="mr-1 inline size-4"/>Search subjects<Input id="academy-search" value={query} onChange={e=>setQuery(e.target.value)} className="mt-1" placeholder="Search courses and topics…"/></label>
         <label htmlFor="academy-level" className="text-sm font-semibold">Learning level<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" id="academy-level" value={level} onChange={e=>setLevel(e.target.value)}>{levels.map(l=><option key={l} value={l}>{l==='All'?'All levels':l}</option>)}</select></label>
       </div>
       <p role="status" className="text-sm text-muted-foreground">{tracks.length} learning pathways match your selection.</p>
       <div className="grid gap-4 lg:grid-cols-2">{tracks.map(track=><article key={track.id} className="flex flex-col rounded-xl border bg-card p-6">
         <p className="text-xs font-bold uppercase tracking-wide text-success">{track.level}</p><h3 className="mt-2 text-xl font-bold">{track.title}</h3><p className="mt-2 text-sm text-muted-foreground">{track.summary}</p>
         <div className="mt-5"><h4 className="text-sm font-semibold">Topics and modules</h4><ul className="mt-3 space-y-2">{track.topics.map(item=><li key={item} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success"/><span>{item}</span></li>)}</ul></div>
         <div className="mt-5 border-t pt-4"><p className="text-sm font-semibold">Practical outcome</p><p className="mt-1 text-sm text-muted-foreground">{track.practical}</p><p className="mt-3 text-sm font-semibold">Who it suits</p><p className="mt-1 text-sm text-muted-foreground">{track.forWhom}</p><p className="mt-3 text-xs text-muted-foreground">{track.certification}</p></div>
         <Button asChild variant="outline" className="mt-auto self-start pt-5"><Link to={`/contact?${new URLSearchParams({course:track.title})}`}>Request course details</Link></Button>
       </article>)}</div>
     </section>
     <section className="grid gap-5 rounded-xl border bg-secondary/40 p-6 md:grid-cols-2">
       <div><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Independent certifications are separate</h2><p className="mt-2 text-sm text-muted-foreground">UniPathway can prepare students for relevant vendor or professional examinations, but students only receive a third-party certificate through the official provider, after meeting its own requirements. We do not claim to be an official Microsoft, AWS, Google, ACCA, IFA or Cyber Essentials certification centre unless formally authorised.</p></div>
       <div>{tech?<Cloud className="size-7 text-success"/>:<Wallet className="size-7 text-success"/>}<h2 className="mt-3 text-xl font-bold">Learning through the UniPathway LMS</h2><p className="mt-2 text-sm text-muted-foreground">Our intended learner journey includes registration, an individual timetable, lesson notes and recordings where licensed, guided labs or worked examples, practical assignments, marking, progression tracking and careers support. Admissions will confirm which resources and practical activities are included in your chosen course.</p></div>
     </section>
     <div className="flex flex-wrap gap-3"><Button asChild><Link to="/careers">Pakistan careers and internships</Link></Button><Button asChild variant="outline"><Link to="/student-support">International study guidance</Link></Button></div>
   </main><PublicFooter/>
 </div>;
}
