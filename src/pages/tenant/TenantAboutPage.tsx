import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, Globe2, GraduationCap, HeartHandshake, MonitorSmartphone, ShieldCheck, Users } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

const offers=[
  {icon:GraduationCap,title:'UK & International Qualifications',description:'Explore selected OTHM and Qualifi qualification pathways, with the current awarding-body specifications and centre authorisations verified before any programme is opened.',to:'/qualifications'},
  {icon:BookOpen,title:'Online & In-Centre Tuition',description:'Years 8–12 across Mathematics, English, Biology, Chemistry, Physics and Technology, including Matric/FSc and Cambridge board support.',to:'/tuition'},
  {icon:MonitorSmartphone,title:'Technology Academy',description:'Applied AI, coding, Python, cybersecurity, Cyber Essentials awareness, data analytics, cloud infrastructure and DevOps.',to:'/tech-academy'},
  {icon:BriefcaseBusiness,title:'Accounting & Finance',description:'Bookkeeping, financial reporting, taxation, management accounting and preparation for IFA and ACCA professional exams.',to:'/finance-academy'},
  {icon:HeartHandshake,title:'Women’s Beauty & Aesthetics',description:'Planned female-focused skincare, make-up and salon courses with CIBTAC centre and CPD UK review processes.',to:'/beauty-aesthetics'},
  {icon:Globe2,title:'University & Language Guidance',description:'Pakistan, UK, Germany, USA, Canada and Australia admissions guidance, IELTS and German-language preparation.',to:'/pathways'},
  {icon:HeartHandshake,title:'Skills & Careers',description:'Pakistan-funded vocational course links, practical employability training and planned employer-supported internships.',to:'/careers'},
];
const trust=[
 {title:'Transparent qualification status',text:'Qualifications, awarding-body status, institution partnerships and centre permissions are checked and recorded individually; marketing language does not replace an approval.'},
 {title:'Support, safety and accessibility',text:'Residential visits are planned with supervised learning, three meals daily and managed separate accommodation for adult students. Actual site facilities and welfare arrangements must be verified before accepting bookings.'},
 {title:'Career-focused guidance',text:'Students can seek education and employability support; regulated immigration, financial and legal advice is referred to appropriately authorised professionals when necessary.'},
];
export default function TenantAboutPage(){
 return <div className="public-site min-h-dvh bg-background text-foreground">
  <Seo title="About UniPathway | Learning, Qualifications & Global Progression" description="Discover UniPathway's online and in-centre tuition, UK and international qualifications, technology and finance academies, IELTS, career support and international university guidance." canonical="/about"/>
  <PublicNav/>
  <main>
   <section className="relative overflow-hidden border-b border-border bg-[#F3F6FA] py-16 dark:bg-slate-950 sm:py-24">
    <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
     <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#118848]">About UniPathway</p><h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-[#0B2D5B] dark:text-white sm:text-5xl">Learn here. <span className="text-[#16A34A]">Go further.</span></h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-700 dark:text-slate-200">UniPathway is developing a joined-up educational experience for learners in Pakistan: school tuition, British qualification pathways, professional and technical skills, university applications, career preparation and continuing support.</p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">Our goal is to combine accessible online education with structured teaching, practical experience and clear information—without promising an award, funded place, employer placement or visa before it is independently confirmed.</p>
      <div className="mt-7 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/study">Explore learning <ArrowRight className="ml-1 size-4"/></Link></Button><Button variant="outline" asChild size="lg"><Link to="/contact">Contact admissions</Link></Button></div>
     </div>
     <div className="rounded-2xl border border-[#0B2D5B]/10 bg-white p-6 text-[#0B2D5B] shadow-sm dark:bg-card dark:text-foreground">
      <GraduationCap className="size-9 text-[#16A34A]"/><h2 className="mt-4 text-xl font-bold">Local learning, international ambition</h2><p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-muted-foreground">Choose learning in Pakistan and explore international progression through transparent academic guidance, language preparation, verified qualification mapping and support with applications.</p>
      <div className="mt-5 flex flex-wrap gap-2">{['Pakistan','United Kingdom','Germany','United States','Canada','Australia'].map(c=><span key={c} className="rounded-full border px-3 py-1 text-xs font-semibold">{c}</span>)}</div>
     </div>
    </div>
   </section>
   <section className="mx-auto max-w-7xl space-y-6 px-5 py-16 sm:px-8">
    <div className="max-w-3xl"><p className="text-label text-success">Our education services</p><h2 className="mt-2 text-3xl font-bold">Different learning routes, one connected platform</h2><p className="mt-3 text-muted-foreground">Learning options are identified separately from confirmed course availability, admissions and accreditation status.</p></div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offers.map(({icon:Icon,title,description,to})=><article key={title} className="flex flex-col rounded-xl border bg-card p-6"><Icon className="size-7 text-success"/><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p><Link to={to} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-primary hover:underline">Explore this service <ArrowRight className="size-4"/></Link></article>)}</div>
   </section>
   <section className="border-y border-border bg-[#F3F6FA] py-16 dark:bg-slate-950"><div className="mx-auto max-w-7xl px-5 sm:px-8"><h2 className="text-3xl font-bold text-[#0B2D5B] dark:text-white">How blended learning is planned to work</h2>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
     {[{title:'Study online',desc:'Learners access the LMS, published learning materials, deadlines, classes, assignments, recorded teaching where provided and tutor feedback.'},{title:'Two 14-day visits',desc:'For applicable approved diploma programmes, two planned in-centre blocks per academic year with lectures, workshops, supervised practice and educational trips.'},{title:'Student wellbeing',desc:'For eligible adult residential learners, proposed arrangements include separate managed accommodation, three meals daily and pastoral contact. Locations, pricing, supervision and access are confirmed before booking.'}].map((x,i)=><article key={x.title} className="rounded-xl border bg-white p-6 dark:bg-card"><p className="text-sm font-bold text-[#16A34A]">0{i+1}</p><h3 className="mt-2 text-lg font-bold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.desc}</p></article>)}
    </div><p className="mt-5 text-sm text-slate-700 dark:text-slate-300">Individual programmes, awarding-body rules and age-related safeguarding requirements can require different attendance patterns and arrangements. The advertised model is a plan, not a universal qualification condition.</p>
   </div></section>
   <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><h2 className="text-3xl font-bold">Our principles</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{trust.map(t=><article key={t.title} className="rounded-xl border p-6"><ShieldCheck className="size-7 text-success"/><h3 className="mt-3 text-lg font-bold">{t.title}</h3><p className="mt-3 text-sm text-muted-foreground">{t.text}</p></article>)}</div></section>
   <section className="border-t py-14"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="rounded-2xl bg-[#0B2D5B] p-8 text-white sm:p-10"><Users className="size-7 text-[#63D891]"/><h2 className="mt-4 text-2xl font-bold">Build your next step with support</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">Whether you need school tuition, a qualification route, German or English test preparation, a skills course or help selecting a university, our team can discuss your educational plans and the requirements that apply.</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" asChild><Link to="/contact">Speak to admissions</Link></Button><Button className="border border-white/50 bg-transparent text-white hover:bg-white/10" asChild><Link to="/student-support">International student support</Link></Button></div><p className="mt-4 text-xs text-white/70">No claim of approved centre status, partnership, examination-centre status, visa outcome, job placement, student totals or savings rate is made without supporting evidence.</p></div></div></section>
  </main><PublicFooter/>
 </div>;
}
