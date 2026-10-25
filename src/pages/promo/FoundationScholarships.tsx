import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpenCheck, GraduationCap, HandHeart, HeartHandshake, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const criteria=[
  {icon:GraduationCap,title:'Academic achievement and potential',text:'Grades, relevant assessed work, academic progress, recommendations and the course being pursued are considered together. A numerical grade does not automatically determine the result.'},
  {icon:HeartHandshake,title:'Genuine financial need',text:'Family circumstances and verified inability to meet fees are reviewed privately, with respect and the minimum necessary documentation.'},
  {icon:HandHeart,title:'Fair opportunity',text:'We consider additional barriers, including rural access, disability-related costs and circumstances affecting women or underserved students, without automatically scoring protected attributes.'},
];
const steps=[
  {title:'Express your interest',detail:'Contact UniPathway admissions. Parents or guardians should initiate enquiries for students who are under 18.'},
  {title:'Document academic and financial circumstances',detail:'Our authorised team requests only relevant verified evidence through a protected process; do not send income records or identity documents through a general website form.'},
  {title:'Independent human review',detail:'Applications are assessed under the current funding programme policy, recorded criteria, available money and conflict-of-interest controls.'},
  {title:'Written decision and support plan',detail:'Successful applicants receive a written decision setting out the amount, programme, conditions and any funder restrictions. Interest or eligibility is not a guarantee of an award.'},
];
export default function FoundationScholarships(){
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/scholarships" title="UniPathway Foundation — Opportunity Fund & Scholarships" description="Learn about proposed merit-and-need scholarships, confidential financial need reviews and employer-supported study opportunities."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
   <PublicHero topic="campus">
    <p className="text-label text-success">UniPathway Foundation • Opportunity Fund</p>
    <h1 className="mt-3 max-w-4xl text-3xl font-extrabold text-[#0B2D5B] dark:text-white sm:text-5xl">Talent deserves opportunity, regardless of family income.</h1>
    <p className="mt-5 max-w-4xl leading-relaxed text-slate-700 dark:text-slate-200">We are planning scholarships based on academic potential and financial need. Explore the criteria and application steps below. Awards depend on approved funding; applications are not yet presented as open or guaranteed.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Discuss scholarship eligibility <ArrowRight className="ml-2 size-4"/></Link></Button><Button asChild variant="outline"><Link to="/study">Explore learning pathways</Link></Button></div>
   </PublicHero>
<PageContents/>

   <section><p className="text-label text-success">How eligibility is assessed</p><h2 className="mt-2 text-2xl font-bold">Merit and need, with thoughtful individual assessment</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{criteria.map(({icon:Icon,title,text})=><article key={title} className="rounded-xl border bg-card p-6"><Icon className="size-7 text-success"/><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div></section>
   <section><div className="flex items-center gap-2"><BookOpenCheck className="size-6 text-success"/><h2 className="text-2xl font-bold">The application and decision process</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2">{steps.map((x,i)=><article key={x.title} className="rounded-xl border p-5"><p className="text-sm font-bold text-success">0{i+1}</p><h3 className="mt-2 font-bold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.detail}</p></article>)}</div></section>
   <section className="grid gap-5 lg:grid-cols-2">
    <article className="rounded-xl border bg-secondary/40 p-6"><HeartHandshake className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">For employer and community sponsors</h2><p className="mt-3 text-sm text-muted-foreground">Businesses may pledge support for specific learning programmes, regions or cohorts. Pledges are recorded separately from money actually received. A funder does not receive students' family income files, sensitive eligibility evidence, educational records or an employment guarantee.</p><Button className="mt-5" asChild variant="outline"><Link to="/contact">Discuss responsible sponsorship</Link></Button></article>
    <article className="rounded-xl border bg-card p-6"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Privacy, safeguarding and governance</h2><p className="mt-3 text-sm text-muted-foreground">Applications involving under-18s need verified parent or guardian consent. Decisions require independent human review. Personal circumstances are handled confidentially, with controlled staff access and a documented selection policy. Scholarship eligibility must never be inferred by an AI model alone.</p><p className="mt-4 text-xs text-muted-foreground">“UniPathway Foundation / Opportunity Fund” describes the proposed programme; charitable registration, tax-relief eligibility and employer-sponsored funding are not claimed without formal confirmation.</p></article>
   </section>
   <section className="rounded-xl border p-6"><Award className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">What scholarships may support</h2><p className="mt-3 text-sm text-muted-foreground">Subject to each published fund's eligibility and budget, awards may contribute towards online tuition, UK or international qualification fees, exam preparation, technology or finance training, supervised residential learning costs, and other approved educational expenses. Actual awards, payment arrangements and conditions will be detailed in an individual written offer.</p></section>
  </main><PublicFooter/>
 </div>;
}
