import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Languages, Mic, ArrowUpRight } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const steps=[
  { level:'A1–A2',title:'German foundations',description:'Listening, speaking, pronunciation, everyday grammar and practical vocabulary.' },
  { level:'B1–B2',title:'Intermediate and independent German',description:'Build fluency for university preparation, professional communication and language certification.' },
  { level:'C1',title:'Advanced academic German',description:'Academic reading, writing, discussions and preparation for university entry language requirements.' },
];
const examinations=[
  {name:'Goethe-Zertifikat',description:'General proficiency certificates at several CEFR levels; university recognition depends on institution and course.'},
  {name:'TestDaF',description:'Academic German examination commonly used for applications to German-taught university courses.'},
  {name:'telc Deutsch C1 Hochschule',description:'Higher-education German assessment recognised by many German universities.'},
  {name:'DSH',description:'University entrance German assessment generally taken at a German institution.'},
];
export default function GermanPreparation() {
  return <div className="public-site min-h-dvh bg-background"><Seo canonical="/german-preparation" title="German Language Courses & TestDaF Preparation | UniPathway" description="Learn German from A1 to C1 and prepare for Goethe, TestDaF, telc and DSH routes for university studies."/>
    <PublicNav/>
    <main className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
      <PublicHero topic="german"><p className="text-label text-success">German language academy</p><h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Learn German. Prepare for your next step.</h1><p className="mt-4 text-muted-foreground">Tutor-led online and planned in-centre German language courses, from beginner A1 through advanced C1, plus focused examination preparation for study in Germany.</p><Button className="mt-6" asChild><Link to="/contact">Enquire about German classes</Link></Button></PublicHero>
<PageContents/>

      <section><h2 className="text-2xl font-bold">Language pathways</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{steps.map(s=><article key={s.level} className="rounded-xl border bg-card p-5"><Languages className="size-6 text-success"/><p className="mt-3 text-sm font-bold text-success">{s.level}</p><h3 className="mt-1 font-bold">{s.title}</h3><p className="mt-2 text-sm text-muted-foreground">{s.description}</p></article>)}</div></section>
      <section><div className="flex items-center gap-2"><Mic className="size-6 text-success"/><h2 className="text-2xl font-bold">German examination preparation</h2></div><p className="mt-2 max-w-3xl text-muted-foreground">There is no single universal German equivalent of IELTS. Your university decides which examination and level it accepts.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{examinations.map(e=><article key={e.name} className="rounded-xl border p-5"><BookOpen className="size-5 text-success"/><h3 className="mt-2 font-bold">{e.name}</h3><p className="mt-2 text-sm text-muted-foreground">{e.description}</p></article>)}</div></section>
      <section className="rounded-xl bg-secondary/50 p-6"><GraduationCap className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">From language preparation to university applications</h2><p className="mt-2 text-sm text-muted-foreground">UniPathway can help review qualification eligibility and language-test requirements. Official testing is provided by the relevant examination bodies, not by UniPathway unless separately authorised. No university place, score or visa outcome is guaranteed.</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link to="/germany">Explore Germany pathways</Link></Button><a className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" href="https://www.daad.de/en/studying-in-germany/living-in-germany/german-language/" target="_blank" rel="noopener noreferrer">DAAD language guidance <ArrowUpRight className="size-4"/></a></div></section>
    </main><PublicFooter/>
  </div>;
}
