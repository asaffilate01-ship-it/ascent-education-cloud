import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, Building2, CreditCard, GraduationCap, HeartHandshake, Landmark, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const services=[
 {icon:GraduationCap,title:'University application assistance',text:'Course shortlisting, recognised qualification review, application documents, university correspondence, offer conditions and enrolment steps.'},
 {icon:Building2,title:'Student accommodation guidance',text:'Understanding university housing, approved private accommodation, contracts, deposits and security checks. Booking and housing guarantees are separate.'},
 {icon:Landmark,title:'Banking and arrival essentials',text:'General practical information about bank account options, mobile services, local registration and applicable documents, subject to each provider’s requirements.'},
 {icon:CreditCard,title:'UK National Insurance numbers',text:'Explain when a UK National Insurance number may be needed, where eligible students can apply and the official application process. UniPathway cannot issue numbers.'},
 {icon:BriefcaseBusiness,title:'Part-time work and internships',text:'CVs, career events, employer introductions and job-search readiness. Working-hour limits and work permissions depend on individual visa conditions.'},
 {icon:ShieldCheck,title:'Graduate and skilled-worker immigration routes',text:'Signpost official rules, document checklists and appropriately regulated immigration advisers for individual advice. No visa eligibility or sponsorship is guaranteed.'},
];
export default function StudentSupport() {
 return <div className="public-site min-h-dvh bg-background"><Seo canonical="/student-support" title="International Student Support & Careers | UniPathway" description="Support for university admission, accommodation, financial setup, National Insurance information, jobs and graduate career planning."/><PublicNav/>
 <main className="mx-auto max-w-7xl space-y-11 px-5 py-12 sm:px-8">
  <header className="max-w-4xl"><p className="text-label text-success">International education and career consultancy</p><h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Support before you travel, during your studies and after graduation</h1><p className="mt-4 text-muted-foreground">For students progressing from Pakistan to the UK, Germany, USA, Canada or Australia, our intended service connects university admissions guidance with practical arrival information and career preparation. Services and third-party providers differ by destination.</p><Button asChild className="mt-6"><Link to="/pathways">Explore university destinations</Link></Button></header>
  <section><h2 className="text-2xl font-bold">What we can help you prepare for</h2><div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map(({icon:Icon,title,text})=><article className="rounded-xl border bg-card p-5" key={title}><Icon className="size-6 text-success"/><h3 className="mt-3 text-lg font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{text}</p></article>)}</div></section>
  <section className="grid gap-5 rounded-xl border bg-secondary/40 p-6 md:grid-cols-2">
   <div><HeartHandshake className="size-6 text-success"/><h2 className="mt-2 text-xl font-bold">Education and career counsellors</h2><p className="mt-2 text-sm text-muted-foreground">We plan to train staff using recognised country-specific education-agent courses and maintain evidence of individual completion, institutional agreements and relevant experience. Adviser training must not be presented as government or British Council accreditation for UniPathway itself.</p><Button variant="outline" className="mt-4" asChild><Link to="/contact">Request guidance</Link></Button></div>
   <div><ShieldCheck className="size-6 text-success"/><h2 className="mt-2 text-xl font-bold">Clear boundaries and regulated advice</h2><p className="mt-2 text-sm text-muted-foreground">University and practical settling-in guidance is distinct from regulated immigration advice, banking services or legal representation. We will refer individual UK immigration matters to an appropriately authorised IAA adviser or qualified professional where required. For other countries, equivalent local requirements apply.</p><a href="https://www.gov.uk/guidance/information-for-advice-seekers" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Find regulated UK immigration advice <ArrowUpRight className="size-4"/></a></div>
  </section>
  <section className="rounded-xl border p-6"><h2 className="text-xl font-bold">Useful official UK starting points</h2><p className="mt-2 text-sm text-muted-foreground">These links provide authoritative information, not personalised immigration advice.</p><div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold text-primary">
   <a target="_blank" rel="noopener noreferrer" href="https://www.gov.uk/apply-national-insurance-number">National Insurance number ↗</a>
   <a target="_blank" rel="noopener noreferrer" href="https://www.gov.uk/graduate-visa">Graduate visa information ↗</a>
   <a target="_blank" rel="noopener noreferrer" href="https://www.gov.uk/skilled-worker-visa">Skilled Worker visa information ↗</a>
  </div><Button asChild variant="outline" className="mt-5"><Link to="/careers">Pakistan jobs and internships</Link></Button></section>
 </main><PublicFooter/></div>;
}
