import { ArrowUpRight, BrainCircuit, BriefcaseBusiness, FileText, ShieldCheck } from 'lucide-react';
const services=[
 {title:'Search real vacancies',url:'https://xpertjobs.co.uk/jobs',icon:BriefcaseBusiness,copy:'Search XpertJobs independently. Listings and hiring decisions belong to the recruiting employer.'},
 {title:'UK Skilled Worker employer research',url:'https://xpertjobs.co.uk/skilled-worker-employers',icon:ShieldCheck,copy:'Search sponsor-licence information separately from vacancies. A licensed sponsor does not guarantee an offer or sponsorship for a job.'},
 {title:'CV and interview Career Studio',url:'https://xpertjobs.co.uk/career-studio',icon:FileText,copy:'Start with a private CV checklist, then use XpertJobs account-based tools if entitled. Your UniPathway account and fees do not automatically grant XpertJobs Premium.'},
] as const;
export default function PartnerCareerLinks({compact=false}:{compact?:boolean}){
 return <section aria-labelledby="xpertjobs-pathways" className="rounded-xl border bg-card p-5 sm:p-6">
  <div className="flex items-center gap-2"><BrainCircuit className="size-6 text-success"/><h2 id="xpertjobs-pathways" className="text-xl font-bold">Careers with XpertJobs</h2></div>
  <p className="mt-2 max-w-4xl text-sm text-muted-foreground">UniPathway provides learning and career preparation. XpertJobs is the dedicated recruitment platform, with its own login, CV privacy, employer verification and AI subscription rules. No CV, academic record or application is transferred automatically.</p>
  <div className={`mt-4 grid gap-3 ${compact?'md:grid-cols-3':'lg:grid-cols-3'}`}>{services.map(({title,url,icon:Icon,copy})=><a key={url} href={url} target="_blank" rel="noopener noreferrer" className="group rounded-lg border p-4 transition-colors hover:border-success/60 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon className="size-6 text-success"/><p className="mt-3 flex items-center gap-1 font-semibold">{title}<ArrowUpRight className="size-4 shrink-0"/></p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy}</p></a>)}</div>
  <p className="mt-3 text-xs text-muted-foreground">The XpertJobs public platform may still be under preview access restrictions. Omniqora Intelligence is a separate, server-authorised integration and has not been connected to share learner or candidate records.</p>
 </section>;
}
