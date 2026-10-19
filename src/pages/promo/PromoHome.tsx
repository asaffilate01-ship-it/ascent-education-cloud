import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, CheckCircle2, FlaskConical, GraduationCap, Globe2, School, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import heroImage from '@/assets/promo-hero.jpg';
import desktopImage from '@/assets/promo-shot-desktop.jpg';
import mobileImage from '@/assets/promo-shot-mobile.jpg';

const pathways = [
  { title: 'UK & international qualifications', caption: 'Online LMS plus two 14-day centre visits for eligible programmes', to: '/qualifications', icon: GraduationCap, number: '01' },
  { title: 'AI, Tech & Accountancy', caption: 'Digital skills and IFA / ACCA exam preparation', to: '/study', icon: School, number: '02' },
  { title: 'Years 8–12 Tuition', caption: 'Online and in-centre maths, English, biology, chemistry, physics and tech', to: '/tuition', icon: BriefcaseBusiness, number: '03' },
  { title: 'University & Career Guidance', caption: 'Pakistan, UK, USA, Germany, Canada and Australia', to: '/pathways', icon: Globe2, number: '04' },
  { title: 'IELTS Preparation', caption: 'Academic & General Training with guided practice', to: '/ielts-preparation', icon: BookOpen, number: '05' },
  { title: 'German Courses', caption: 'A1–C1, Goethe, TestDaF, telc and DSH preparation', to: '/german-preparation', icon: BookOpen, number: '06' },
  { title: 'Pakistan Funded Skills', caption: 'PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC programmes', to: '/funded-courses', icon: GraduationCap, number: '07' },
  { title: 'Careers & Internships', caption: 'Pakistan employers, placements and overseas student support', to: '/careers', icon: BriefcaseBusiness, number: '08' },
];
const experiences = [
  { icon: Video, title: 'Live teaching', text: 'Join classes, access recordings and keep learning between sessions.' },
  { icon: FlaskConical, title: 'Practical learning', text: 'Build skills in digital labs and in-person academic weeks where applicable.' },
  { icon: Users, title: 'Your learning community', text: 'Connect with lecturers, peers and support teams as your journey unfolds.' },
];

export default function PromoHome() {
  return <div className="public-site min-h-dvh bg-background">
    <Seo title="UniPathway — Qualifications, Tuition & Employer Learning" description="Explore qualifications in Pakistan, school tuition, employer learning and global university progression with UniPathway." canonical="/" />
    <PublicNav />
    <main>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/60 to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-8 sm:px-8 md:pt-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-24 lg:pt-16">
          <div className="animate-page-enter">
            <h1 className="mt-5 max-w-2xl text-[2.5rem] font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl">Learn here.<br /><span className="text-success">Go further.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Years 8–12 tuition, UK and international qualifications, AI, tech and accountancy, IELTS and German — plus university and career guidance for Pakistan and abroad.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="h-12 rounded-full px-7 shadow-surface-lg" asChild><Link to="/study">Explore learning <ArrowRight /></Link></Button><Button size="lg" variant="outline" className="h-12 rounded-full bg-card px-7" asChild><Link to="/contact">Talk to an adviser</Link></Button></div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/80 py-4 shadow-surface-lg">{[['8+', 'Learning areas'], ['6', 'Destinations'], ['L3–7', 'Qualifications']].map(([v, l]) => <div key={l} className="px-4 text-center"><dt className="sr-only">{l}</dt><dd className="stat-value text-xl sm:text-2xl">{v}</dd><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground sm:text-xs">{l}</p></div>)}</dl>
          </div>
          <div className="relative pb-8"><img src={heroImage} alt="Pakistani students studying together" className="aspect-[5/4] w-full rounded-3xl object-cover shadow-surface-xl" /><div className="absolute -bottom-0 left-4 flex items-center gap-3 rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-surface-xl sm:left-auto sm:right-6"><Globe2 className="size-7 text-gold" /><span className="text-sm font-bold leading-snug">Local learning.<br />Global ambition.</span></div></div>
        </div>
      </section>
      <section id="study" className="py-16 lg:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-label text-success">Find your pathway</p><h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">There’s more than one way forward.</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Choose online or in-centre study, build your skills, and explore international progression with personal guidance.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{pathways.map(({title, caption, to, icon: Icon, number}) => <Link to={to} key={to} className="group relative flex min-h-60 flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-surface-lg transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-surface-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl bg-success/10 text-success transition-colors group-hover:bg-success group-hover:text-success-foreground"><Icon className="size-6" /></span><span className="text-xs font-bold tabular-nums text-muted-foreground">{number}</span></div><h3 className="mt-auto pt-8 text-lg font-bold leading-snug">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{caption}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-success">Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</div></div></section>
      <section id="experience" className="py-16 lg:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-label text-success">Beyond the course</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">One connected learning experience.</h2><p className="mt-5 text-base leading-relaxed text-muted-foreground">From live classes and practical work to careers support and progression planning, UniPathway brings the important parts of your journey together. What is available varies by programme.</p><Button variant="outline" className="mt-7" asChild><Link to="/about">Discover UniPathway <ArrowRight /></Link></Button></div><div className="relative flex min-w-0 items-end gap-3"><img src={desktopImage} alt="UniPathway desktop learning experience" loading="lazy" className="min-w-0 flex-[4] rounded-md border border-border object-cover shadow-surface-lg" /><img src={mobileImage} alt="UniPathway mobile learning experience" loading="lazy" className="min-w-0 flex-1 rounded-md border border-border object-cover shadow-surface-lg" /></div></div><div className="mt-16 grid gap-8 border-t border-border pt-9 md:grid-cols-3">{experiences.map(({icon: Icon,title,text}) => <div key={title}><Icon className="size-7 text-success" /><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div></div></section>
      <section className="border-y border-border bg-secondary/40 py-16"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 md:grid-cols-2 md:items-center"><div><p className="text-label text-success">For diploma learners</p><h2 className="mt-3 text-3xl font-bold">Study with a destination in mind.</h2><p className="mt-4 text-muted-foreground">Explore planned UK qualifications from Levels 3–7, their official subject specifications, and possible university progression routes. Course delivery, entry requirements and availability vary by programme.</p><Button className="mt-7" asChild><Link to="/qualifications">Browse qualifications <ArrowRight /></Link></Button></div><div className="grid gap-4">{['Structured teaching and assessment', 'UK diplomas: two 14-day centre visits annually; remaining learning online', 'Guidance for university and career pathways'].map(item => <div key={item} className="flex items-start gap-3 border-b border-border py-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><span className="font-medium">{item}</span></div>)}</div></div></div></section>
      <section className="py-14"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-4 md:grid-cols-3">{[
        {title:'Pakistan careers and internships',copy:'Develop workplace skills and explore planned introductions to banks, accountancy practices, technology firms, hospitals and other employers.',to:'/careers'},
        {title:'Funded training in Pakistan',copy:'Find official PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC information and application links.',to:'/funded-courses'},
        {title:'Support after university admission',copy:'Guidance on accommodation, bank accounts, work readiness and pathways to qualified post-study immigration advice.',to:'/student-support'},
      ].map(p=><article key={p.to} className="rounded-xl border bg-card p-6"><h2 className="text-lg font-bold">{p.title}</h2><p className="mt-2 text-sm text-muted-foreground">{p.copy}</p><Button asChild variant="outline" className="mt-5"><Link to={p.to}>Explore support</Link></Button></article>)}</div></div></section>
      <section className="py-16 text-center"><BookOpen className="mx-auto size-7 text-success" /><h2 className="mt-4 text-3xl font-bold">Your next step starts here.</h2><p className="mx-auto mt-3 max-w-lg text-muted-foreground">Tell us what you want to learn and we’ll help you explore the available options.</p><Button size="lg" className="mt-7" asChild><Link to="/contact">Get in touch <ArrowRight /></Link></Button></section>
    </main><PublicFooter />
  </div>;
}
