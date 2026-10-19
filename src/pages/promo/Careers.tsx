import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, GraduationCap, Handshake, HeartHandshake, Search, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import PartnerCareerLinks from '@/components/career/PartnerCareerLinks';

const sectors=[
 {name:'Banking & Finance',description:'Retail banking, treasury support, branch operations and compliance administration.',roles:['Customer service trainee','Banking operations intern','Credit/finance administrator']},
 {name:'Accounting & Audit',description:'Bookkeeping, audit support, taxation workflows and accounting firm experience.',roles:['Accounts assistant','Audit work-experience trainee','Tax administration intern']},
 {name:'Technology',description:'Software delivery, AI and data, cyber security, cloud, IT support and technical business analysis.',roles:['Junior web developer trainee','QA/testing intern','IT support and data assistant']},
 {name:'Legal Services',description:'Paralegal administration, case management support and law-office customer services.',roles:['Legal office administrator','Document research intern','Client intake assistant']},
 {name:'Health & Care',description:'Hospitals, clinics and healthcare-administration placements; no clinical activity without appropriate qualifications.',roles:['Healthcare front-desk trainee','Patient-service coordinator','Health records assistant']},
 {name:'Retail & Automotive',description:'Car dealerships, supply chains, vehicle aftersales and customer service.',roles:['Showroom sales assistant','Automotive service desk trainee','Inventory administrator']},
 {name:'Hospitality',description:'Restaurants, cafés, hotels, food safety and event operations.',roles:['Restaurant operations trainee','Hotel reception intern','Food safety and stock-control assistant']},
 {name:'Beauty & Wellness',description:'Beauty salons, spas, make-up, nail studios and women-focused supervised practical experience.',roles:['Salon reception trainee','Beauty business assistant','Supervised salon skills placement']},
 {name:'E-commerce & Logistics',description:'Warehousing, marketplace operations, order fulfilment and digital customer support.',roles:['Warehouse inventory assistant','Online marketplace operator','Courier/dispatch administrator']},
];
export default function Careers(){
 const [query,setQuery]=useState(''),[sector,setSector]=useState('All');
 const visible=useMemo(()=>sectors.filter(x=>(sector==='All'||sector===x.name)&&
  `${x.name} ${x.description} ${x.roles.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())),[query,sector]);
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/careers" title="Pakistan Jobs, Internships & Employer Training | UniPathway" description="Explore Pakistan banking, technology, law, health, automotive, accounting, retail and hospitality career and internship training pathways."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
   <header className="rounded-2xl border bg-[#F3F6FA] p-6 dark:bg-slate-950 sm:p-9">
    <p className="text-label text-success">Pakistan Careers & Internships</p><h1 className="mt-4 max-w-4xl text-3xl font-extrabold text-[#0B2D5B] dark:text-white sm:text-5xl">Skills, verified experience and real career planning</h1>
    <p className="mt-4 max-w-4xl text-slate-700 dark:text-slate-300">We are developing an employer network across Pakistan to provide supervised training, internships, career counselling and verified job introductions. The sectors and example roles below are proposed career pathways, not current vacancies or promises of placement.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Ask for career guidance <ArrowRight className="ml-1 size-4"/></Link></Button><Button asChild variant="outline"><Link to="/student/career">Student career dashboard</Link></Button></div>
   </header>
   <section className="grid gap-4 md:grid-cols-3">{[
    {icon:GraduationCap,title:'Employer-supported training',description:'Supervised tasks, planned learning objectives, competency checks and progress feedback at an approved training site.'},
    {icon:Handshake,title:'Internships and experience',description:'Application screening, written placement terms, a named mentor, attendance recording and regular student/employer review.'},
    {icon:BriefcaseBusiness,title:'Jobs and employability',description:'CVs, interview rehearsal, communication skills, portfolios and access to genuine approved employer vacancies when available.'},
   ].map(({icon:Icon,title,description})=><article key={title} className="rounded-xl border bg-card p-6"><Icon className="size-7 text-success"/><h2 className="mt-3 text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p></article>)}</section>
   <section><h2 className="text-2xl font-bold">Industries and example entry-level roles</h2><p className="mt-3 max-w-4xl text-sm text-muted-foreground">Organisations must be vetted, the role must be documented, and recruitment terms confirmed before any opening can be published. Filter the sectors to see suitable career-development topics.</p>
    <div className="mt-5 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_230px]"><label htmlFor="career-search" className="text-sm font-semibold"><Search className="mr-1 inline size-4"/>Search industries and roles<Input id="career-search" className="mt-1" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Banking, coding, hospital, sales…"/></label><label htmlFor="career-sector" className="text-sm font-semibold">Industry<select id="career-sector" className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={sector} onChange={e=>setSector(e.target.value)}><option>All</option>{sectors.map(x=><option key={x.name}>{x.name}</option>)}</select></label></div><p role="status" className="mt-3 text-sm text-muted-foreground">{visible.length} industry pathways shown.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map(x=><article key={x.name} className="flex flex-col rounded-xl border bg-card p-5"><Building2 className="size-6 text-success"/><h3 className="mt-3 text-lg font-bold">{x.name}</h3><p className="mt-2 text-sm text-muted-foreground">{x.description}</p><h4 className="mt-4 text-sm font-semibold">Example training and entry roles</h4><ul className="mt-2 space-y-2">{x.roles.map(r=><li key={r} className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success"/>{r}</li>)}</ul></article>)}</div>
   </section>
   <section className="rounded-xl border bg-secondary/40 p-6"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-2xl font-bold">What happens before a placement or vacancy goes live</h2><div className="mt-5 grid gap-4 md:grid-cols-4">{[
    {n:'01',title:'Employer checks',text:'Verify the company, authorised contact, workplace, insurance and permitted training activities.'},
    {n:'02',title:'Approve placement terms',text:'Record the role, supervision, tasks, location, schedule, remuneration and data-sharing conditions.'},
    {n:'03',title:'Match eligible learners',text:'Obtain student consent, review course suitability and protect CVs and personal information.'},
    {n:'04',title:'Monitor and close',text:'Record attendance, assessment feedback, issues, outcomes and certificates where applicable.'},
   ].map(x=><div key={x.n} className="rounded-lg border bg-card p-4"><p className="font-bold text-success">{x.n}</p><h3 className="mt-2 font-semibold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.text}</p></div>)}</div></section>
   <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border p-6"><Users className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Students and graduates</h2><p className="mt-2 text-sm text-muted-foreground">Work on a CV, career interests, an application portfolio and interview skills through the learner dashboard. Approved placements will be available there only after employer checks and database activation have been completed.</p><div className="mt-5 flex gap-3"><Button asChild variant="outline"><Link to="/student/career">My career workspace</Link></Button><Button asChild variant="outline"><Link to="/funded-courses">Vocational skills</Link></Button></div></article>
   <article className="rounded-xl border p-6"><HeartHandshake className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">For employer partners</h2><p className="mt-2 text-sm text-muted-foreground">Employers can discuss training plans, supervised placements and prospective recruitment. Access to applicant data requires a verified organisational agreement and role-based permissions; it is never granted to general enquiries.</p><Button asChild variant="outline" className="mt-5"><Link to="/contact">Discuss an employer partnership</Link></Button></article></section>
  <PartnerCareerLinks />
  </main><PublicFooter/>
 </div>;
}
