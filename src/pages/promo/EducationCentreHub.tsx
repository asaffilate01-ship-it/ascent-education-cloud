import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, ShieldCheck, Search, School, Languages, BriefcaseBusiness } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { centrePathwayFamilies,searchCentrePathways } from '@/lib/educationCentrePathways';

const categories:Record<string,React.ElementType>={
 'Pakistan school & board exams':School,
 'International school qualifications':GraduationCap,
 'Language examinations':Languages,
 'Technology certifications':BookOpen,
 'Accounting banking & finance':BriefcaseBusiness,
 'Beauty & aesthetics':GraduationCap,
 'Healthcare & care':ShieldCheck,
 'Vocational & employment':BriefcaseBusiness,
 'UK diploma progression':GraduationCap
};
export default function EducationCentreHub(){
 const [family,setFamily]=useState('All');
 const [query,setQuery]=useState('');
 const results=useMemo(()=>searchCentrePathways(family,query),[family,query]);
 return <div className="public-site min-h-dvh bg-background">
  <Seo title="UniPathway Centre — School Exams, Language, Professional & Diploma Preparation" description="Explore Pakistan Matric, FSc, FA/ICS/ICom, Cambridge O/A Levels, language exams, technology, finance, healthcare, beauty and UK diploma preparation in UniPathway's online and in-centre learning model." canonical="/education-centre"/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8">
   <PublicHero topic="study">
    <p className="text-label font-semibold text-success">UniPathway Centre · Online & in-centre</p>
    <h1 className="mt-3 text-3xl font-bold md:text-5xl">One learning centre. Every next step.</h1>
    <p className="mt-4 max-w-3xl text-muted-foreground">Find support for school exams, learn a language or build skills for work. Browse our learning areas below, then ask admissions about entry requirements, fees and the next available class.</p>
    <div className="mt-6 flex flex-wrap gap-3">
     <Button asChild><Link to="/study">Explore all study options <ArrowRight className="ml-1 size-4"/></Link></Button>
     <Button variant="outline" asChild><Link to="/contact">Ask admissions about an intake</Link></Button>
    </div>
   </PublicHero>
<PageContents/>

   <div className="mt-8 grid gap-3 md:grid-cols-3">
    <div className="rounded-xl border bg-card p-4"><BookOpen className="size-5 text-success"/><h2 className="mt-2 font-semibold">Curriculum & examination readiness</h2><p className="mt-1 text-sm text-muted-foreground">Board-specific subject planning, practice papers and guided revision where offered</p></div>
    <div className="rounded-xl border bg-card p-4"><ClipboardCheck className="size-5 text-success"/><h2 className="mt-2 font-semibold">Independent assessment</h2><p className="mt-1 text-sm text-muted-foreground">Published rubrics, separate marking, advisory AI feedback and human verification before results</p></div>
    <div className="rounded-xl border bg-card p-4"><GraduationCap className="size-5 text-success"/><h2 className="mt-2 font-semibold">Live classes & self-study</h2><p className="mt-1 text-sm text-muted-foreground">Classroom and online teaching, protected notes, coursework and learning tools</p></div>
   </div>
   <section aria-labelledby="pathways-heading" className="mt-12">
    <h2 id="pathways-heading" className="text-2xl font-bold">Find your examination or training pathway</h2>
    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
     <label className="flex-1 text-sm font-semibold">Search qualifications, boards and subjects
      <div className="relative mt-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
       <Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. Matric, Cambridge, ACCA, Spanish, AWS, care"/></div>
     </label>
     <label className="text-sm font-semibold">Department
      <select className="mt-1 block w-full rounded-md border bg-background px-3 py-2 md:w-64" aria-label="Filter department" value={family} onChange={e=>setFamily(e.target.value)}>
       <option value="All">All departments</option>{centrePathwayFamilies.map(x=><option key={x}>{x}</option>)}
      </select>
     </label>
    </div>
    <p role="status" className="mt-3 text-sm text-muted-foreground">{results.length} preparation pathways found. These are course directions, not confirmed places or examination approvals.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
     {results.map(p=>{const Icon=categories[p.family]||BookOpen;
       return <article key={p.id} className="flex flex-col rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-success"><Icon className="size-4"/>{p.family}</div>
        <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{p.courseLevel} · {p.practical?'Practical/portfolio elements':'Theory, practice & feedback'}</p>
        <p className="mt-3 text-sm">{p.preparationFor}</p>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">Subjects: {p.subjects.join(' · ')}</p>
        <div className="mt-4 space-y-2 border-t pt-4 text-sm">
         <p><strong>Preparation:</strong> {p.assessment}</p>
         <p><strong>Official exam/award:</strong> {p.examAuthority}</p>
        </div>
        <div className="mt-auto pt-4"><Button variant="outline" size="sm" asChild><Link to={p.route}>Explore training <ArrowRight className="ml-1 size-4"/></Link></Button></div>
       </article>
      })}
    </div>
    {!results.length&&<p className="rounded-xl border p-6 text-sm">No matching pathway. Try a different subject or contact admissions about developing a course.</p>}
   </section>
   <aside className="mt-10 rounded-xl border bg-secondary/30 p-5">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Preparation is not official certification</h2>
    <p className="mt-2 text-sm text-muted-foreground">UniPathway's learning and mock assessments are distinct from final examinations, external professional certifications and accredited or regulated awards. Board exams require registration with the relevant examination authority. OTHM, Qualifi, beauty, vocational and other third-party awards require specific programme and centre authorisation. Admissions must confirm actual course delivery, fees, eligible age groups, timetables and exam registration routes before enrolment. Mock scores are not official examination results.</p>
   </aside>
  </main>
  <PublicFooter/>
 </div>;
}
