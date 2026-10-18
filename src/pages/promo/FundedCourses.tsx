import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Monitor, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const providers=[
 {name:'Punjab Skills Development Fund (PSDF)',tag:'General IT & vocational programmes',description:'Browse public training opportunities and apply directly where a relevant trainee intake is open.',url:'https://www.psdf.org.pk/'},
 {name:'PITB e-Rozgaar',tag:'Freelancing & digital careers',description:'Check digital freelancing, online earning and entrepreneurship programmes through the official portal.',url:'https://eearn.pitb.gov.pk/'},
 {name:'Punjab WDD SEHR',tag:'Women-focused training',description:'Explore WDD digital, beauty and hospitality training; eligibility is scheme-specific and programmes may be location-restricted.',url:'https://wdd.punjab.gov.pk/SEHR'},
 {name:'NAVTTC',tag:'National vocational & technical training',description:'Browse PMYSDP, industry-led and other national skills curricula or recruitment notices.',url:'https://navttc.gov.pk/'},
];
const tracks=[
 ['Digital & creative','Graphic design, video editing, social-media marketing, SEO and e-commerce'],
 ['Freelancing','Virtual assistant, Amazon selling support, digital freelancing and client operations'],
 ['Software & cloud','Python/Django development, cloud operations, DevOps and Cyber Security'],
 ['Emerging technology','AI, machine learning, data science and automation'],
 ['Vocational & service','Beautician, tailoring, hospitality, BPO and customer care employability'],
 ['Additional certification','Explore Google, Coursera and City & Guilds learning separately; certificates and fees depend on providers'],
];
export default function FundedCourses() {
 return <div className="public-site min-h-dvh bg-background">
  <Seo title="Pakistan Funded Skills & Vocational Training | UniPathway" description="Find the official PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC websites plus guidance on skills training." canonical="/funded-courses"/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
   <header className="max-w-4xl"><p className="text-label text-success">Skills funding in Pakistan</p><h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Find training opportunities and apply at the source</h1><p className="mt-4 text-muted-foreground">Explore government and public-sector programmes that may fund training, support women or develop technical employability. Applications take place directly with the scheme operator unless UniPathway has formally been appointed to administer the scheme.</p></header>
   <section className="grid gap-4 md:grid-cols-2" aria-label="Official training portals">
    {providers.map(p=><article key={p.name} className="flex flex-col rounded-xl border bg-card p-6"><ShieldCheck className="size-6 text-success"/><p className="mt-3 text-label text-success">{p.tag}</p><h2 className="mt-2 text-xl font-bold">{p.name}</h2><p className="my-3 text-sm text-muted-foreground">{p.description}</p><a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline">Visit official portal <ArrowUpRight className="size-4"/></a></article>)}
   </section>
   <section><div className="flex items-center gap-2"><Monitor className="size-6 text-success"/><h2 className="text-2xl font-bold">Skills and vocational subjects to explore</h2></div><p className="mt-2 max-w-3xl text-sm text-muted-foreground">The following are areas of interest for guidance and course matching. They are not a claim that each portal currently funds every subject.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tracks.map(([name,detail])=><article key={name} className="rounded-xl border p-5"><h3 className="font-semibold">{name}</h3><p className="mt-2 text-sm text-muted-foreground">{detail}</p></article>)}</div></section>
   <section className="rounded-xl border bg-secondary/40 p-6"><BriefcaseBusiness className="size-7 text-success"/><h2 className="mt-2 text-xl font-bold">Career support beyond a short course</h2><p className="mt-2 text-sm text-muted-foreground">Our planned employer network will help learners prepare for verified internships and job opportunities. Potential participating sectors include banking, accountancy, technology, law, clinics, hospitals, automotive dealerships, restaurants and professional services. Employer agreements and available roles are still to be confirmed.</p><div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link to="/careers">Explore careers and internships</Link></Button><Button asChild variant="outline"><Link to="/contact">Ask for course guidance <GraduationCap className="ml-2 size-4"/></Link></Button></div></section>
  </main><PublicFooter/>
 </div>;
}
