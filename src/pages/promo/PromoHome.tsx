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
  { title: 'Pakistan qualifications', caption: 'OTHM, QUALIFI and IAB diplomas', to: '/courses', icon: GraduationCap, number: '01' },
  { title: 'Years 9–12 tuition', caption: 'School learning and exam preparation', to: '/tuition', icon: School, number: '02' },
  { title: 'Employer learning', caption: 'Skills development for your team', to: '/employer-learning', icon: BriefcaseBusiness, number: '03' },
  { title: 'Global progression', caption: 'Explore UK and Germany pathways', to: '/pathways', icon: Globe2, number: '04' },
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
      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 pb-12 pt-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pb-20 lg:pt-16">
          <div><p className="text-label text-success">A world of learning, closer to home</p><h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">UniPathway</h1><p className="mt-5 max-w-xl text-xl font-semibold text-foreground sm:text-2xl">Learn here. Go further.</p><p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">Qualifications, school tuition and employer learning in Pakistan, with pathways to opportunities in the UK, Germany and beyond.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" asChild><Link to="/courses">Explore learning <ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild><Link to="/contact">Talk to us</Link></Button></div></div>
          <div className="relative pb-6 sm:pb-8"><img src={heroImage} alt="Learners studying together" className="aspect-[5/4] w-full rounded-md object-cover shadow-surface-xl" /><div className="absolute bottom-0 left-4 flex items-center gap-3 rounded-md bg-primary px-5 py-4 text-primary-foreground shadow-surface-lg sm:left-auto sm:right-[-1rem]"><Globe2 className="size-7 text-gold" /><span className="text-sm font-bold">Local learning.<br />Global ambition.</span></div></div>
        </div>
      </section>
      <section id="study" className="bg-success py-16 text-success-foreground lg:py-20"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-label text-success-foreground/80">Find your pathway</p><h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">There’s more than one way forward.</h2></div><p className="max-w-sm text-sm leading-relaxed text-success-foreground/85">Choose the learning that fits your stage, your goals and your next step.</p></div><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{pathways.map(({title, caption, to, icon: Icon, number}) => <Link to={to} key={to} className="group flex min-h-56 flex-col rounded-md bg-card p-5 text-card-foreground transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between"><Icon className="size-7 text-success" /><span className="text-xs font-bold text-muted-foreground">{number}</span></div><h3 className="mt-auto text-lg font-bold">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{caption}</p><ArrowRight className="mt-4 size-5 text-success transition-transform group-hover:translate-x-1" /></Link>)}</div></div></section>
      <section id="experience" className="py-16 lg:py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-label text-success">Beyond the course</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">One connected learning experience.</h2><p className="mt-5 text-base leading-relaxed text-muted-foreground">From live classes and practical work to careers support and progression planning, UniPathway brings the important parts of your journey together. What is available varies by programme.</p><Button variant="outline" className="mt-7" asChild><Link to="/about">Discover UniPathway <ArrowRight /></Link></Button></div><div className="relative flex min-w-0 items-end gap-3"><img src={desktopImage} alt="UniPathway desktop learning experience" loading="lazy" className="min-w-0 flex-[4] rounded-md border border-border object-cover shadow-surface-lg" /><img src={mobileImage} alt="UniPathway mobile learning experience" loading="lazy" className="min-w-0 flex-1 rounded-md border border-border object-cover shadow-surface-lg" /></div></div><div className="mt-16 grid gap-8 border-t border-border pt-9 md:grid-cols-3">{experiences.map(({icon: Icon,title,text}) => <div key={title}><Icon className="size-7 text-success" /><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div></div></section>
      <section className="border-y border-border bg-secondary/40 py-16"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="grid gap-10 md:grid-cols-2 md:items-center"><div><p className="text-label text-success">For diploma learners</p><h2 className="mt-3 text-3xl font-bold">Study with a destination in mind.</h2><p className="mt-4 text-muted-foreground">Explore Level 3–5 qualifications and possible progression routes. Course delivery, entry requirements and availability vary by programme.</p><Button className="mt-7" asChild><Link to="/courses">Browse qualifications <ArrowRight /></Link></Button></div><div className="grid gap-4">{['Structured teaching and assessment', 'Practical and centre-based learning where applicable', 'Guidance for university and career pathways'].map(item => <div key={item} className="flex items-start gap-3 border-b border-border py-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /><span className="font-medium">{item}</span></div>)}</div></div></div></section>
      <section className="py-16 text-center"><BookOpen className="mx-auto size-7 text-success" /><h2 className="mt-4 text-3xl font-bold">Your next step starts here.</h2><p className="mx-auto mt-3 max-w-lg text-muted-foreground">Tell us what you want to learn and we’ll help you explore the available options.</p><Button size="lg" className="mt-7" asChild><Link to="/contact">Get in touch <ArrowRight /></Link></Button></section>
    </main><PublicFooter />
  </div>;
}
