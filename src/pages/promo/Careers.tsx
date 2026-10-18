import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, GraduationCap, Handshake, HeartHandshake, Users } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const sectors=[
 {name:'Banking & Finance',description:'Retail banking, accountancy and financial-services practice placements.'},
 {name:'Accounting & Audit',description:'Bookkeeping, tax, audit, accounts preparation and professional practice.'},
 {name:'Technology',description:'Software, cyber security, AI, cloud, business analysis and technical support.'},
 {name:'Legal Services',description:'Law firms, paralegal teams, legal administration and research.'},
 {name:'Health & Care',description:'Clinics, hospitals, administration, labs and care-sector workplaces; restricted work requires appropriate qualification and supervision.'},
 {name:'Retail & Automotive',description:'Car dealerships, customer service, sales operations and aftersales teams.'},
 {name:'Hospitality',description:'Restaurants, hotels, event operations, food safety and customer experience.'},
];
export default function Careers() {
 return <div className="public-site min-h-dvh bg-background"><Seo canonical="/careers" title="Pakistan Internships, Jobs and Career Guidance | UniPathway" description="Explore proposed employer-led training, verified internships, entry-level jobs and career development through UniPathway."/><PublicNav/>
 <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
  <header className="max-w-4xl"><p className="text-label text-success">Experience, careers and employment</p><h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Learn skills. Build experience. Explore careers.</h1><p className="mt-4 text-muted-foreground">UniPathway is developing a Pakistan employer network to connect eligible learners with practical training, internships, work experience and employment introductions. Applications and placements will depend on verified vacancies and employer agreements.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Ask for career guidance <ArrowRight className="ml-2 size-4"/></Link></Button><Button variant="outline" asChild><Link to="/student/career">Student career dashboard</Link></Button></div></header>
  <section className="grid gap-4 md:grid-cols-3">{[
   {icon:GraduationCap,title:'Workplace training',description:'Learning objectives, supervised placements and skill-development plans where an employer has agreed to participate.'},
   {icon:Handshake,title:'Internships and placements',description:'Structured applications, employer selection, schedules and mentor feedback when placements are confirmed.'},
   {icon:BriefcaseBusiness,title:'Jobs and employability',description:'CVs, portfolios, applications, interview practice and introductions to verified vacancies.'},
  ].map(({icon:Icon,title,description})=><article key={title} className="rounded-xl border bg-card p-6"><Icon className="size-7 text-success"/><h2 className="mt-3 text-lg font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description}</p></article>)}</section>
  <section><h2 className="text-2xl font-bold">Pakistan industries we plan to work with</h2><p className="mt-2 text-muted-foreground">The categories below are planned recruitment targets, not existing contractual partners or guaranteed vacancies.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sectors.map(s=><article key={s.name} className="rounded-xl border p-5"><Building2 className="size-5 text-success"/><h3 className="mt-3 font-bold">{s.name}</h3><p className="mt-2 text-sm text-muted-foreground">{s.description}</p></article>)}</div></section>
  <section className="grid gap-6 rounded-xl border bg-secondary/40 p-6 lg:grid-cols-2">
   <div><Users className="size-6 text-success"/><h2 className="mt-2 text-xl font-bold">For students and graduates</h2><p className="mt-2 text-sm text-muted-foreground">Enquire about verified opportunities suited to your education level. Where relevant, upload your CV and evidence in the authenticated career workspace once available. No internship or job is guaranteed.</p><Button variant="outline" className="mt-5" asChild><Link to="/contact">Talk to careers</Link></Button></div>
   <div><HeartHandshake className="size-6 text-success"/><h2 className="mt-2 text-xl font-bold">For employers</h2><p className="mt-2 text-sm text-muted-foreground">Banks, accountancy practices, tech businesses, law firms, hospitals, automotive dealers, hotels and restaurants can discuss supervised training and recruitment partnerships. Employer approval and vacancy validation precede public listings.</p><Button variant="outline" className="mt-5" asChild><Link to="/contact">Enquire about employer partnership</Link></Button></div>
  </section>
 </main><PublicFooter/></div>;
}
