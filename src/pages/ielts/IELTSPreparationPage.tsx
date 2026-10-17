import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Headphones, Mic, PencilLine, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import InternationalEnquiryForm from '@/components/enquiry/InternationalEnquiryForm';
import { Button } from '@/components/ui/button';
import { IELTS_UNITS, IELTS_SKILLS } from '@/lib/ieltsCurriculum';

export default function IELTSPreparationPage() {
  return <div className="public-site min-h-dvh bg-background text-foreground">
    <Seo title="IELTS Preparation | Academic and General Training | UniPathway" description="Independent IELTS Academic and General Training preparation through UniPathway: eight-week study pathway, live tutor support, original practice assignments and mock-test coaching." canonical="/ielts-preparation" />
    <PublicNav />
    <main>
      <section className="bg-secondary/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 md:py-24 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
          <div>
            <span className="text-label text-primary">UNIPATHWAY · ENGLISH LANGUAGE ACADEMY</span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mt-4">IELTS preparation, built around your goals.</h1>
            <p className="text-lg text-muted-foreground mt-5 max-w-2xl">Academic and General Training pathways with guided study, practice assignments, tutor feedback and exam techniques. A flexible part of UniPathway’s learning platform in Pakistan and online.</p>
            <div className="flex flex-wrap gap-3 mt-8"><Button size="lg" asChild><Link to="/register">Explore enrolment <ArrowRight className="ml-2 w-4 h-4"/></Link></Button><Button size="lg" variant="outline" asChild><a href="#ielts-enquiry">Ask about IELTS classes</a></Button></div>
            <p className="text-xs text-muted-foreground mt-5">Students studying OTHM or Qualifi programmes and external students can use the same UniPathway IELTS academy. Course access and any fees are confirmed at enrolment.</p>
          </div>
          <div className="surface-card p-7 rounded-2xl space-y-4">
            <div className="flex items-center gap-3"><GraduationCap className="text-primary w-8 h-8"/><h2 className="text-xl font-bold">Your independent preparation journey</h2></div>
            {['Choose Academic or General Training','Set your personal target band','Complete an eight-week guided programme','Practise with teacher-led feedback','Prepare for an official booking with an authorised provider'].map((step,i)=><div key={step} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0"><span className="text-xs font-bold rounded-full w-7 h-7 bg-primary/10 text-primary flex items-center justify-center shrink-0">{i+1}</span><p className="text-sm">{step}</p></div>)}
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <p className="text-label text-primary">THE FOUR CORE SKILLS</p>
        <h2 className="text-3xl font-bold mt-3">Structured preparation, practical feedback</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7">{IELTS_SKILLS.map((s,i)=>{const icons=[Headphones,BookOpen,PencilLine,Mic];const Icon=icons[i];return <article key={s.key} className="surface-card p-5 space-y-2"><Icon className="w-6 h-6 text-primary"/><h3 className="font-semibold text-lg">{s.label}</h3><p className="text-sm">{s.time}</p><p className="text-xs text-muted-foreground">{s.format}</p></article>;})}</div>
      </section>
      <section className="bg-secondary/40 py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <p className="text-label text-primary">PROPOSED EIGHT-WEEK PLAN</p><h2 className="text-3xl font-bold mt-3">Learn the skills, then practise under pressure</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-7">{IELTS_UNITS.map(unit=><article key={unit.week} className="surface-card p-5"><span className="text-xs font-bold text-primary">WEEK {unit.week}</span><h3 className="font-semibold mt-2">{unit.title}</h3><p className="text-xs text-muted-foreground mt-2">{unit.focus}</p></article>)}</div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid gap-8 md:grid-cols-2">
        <div className="space-y-3"><ShieldCheck className="text-primary w-7 h-7"/><h2 className="text-2xl font-bold">Independent, transparent teaching</h2><p className="text-sm text-muted-foreground">UniPathway provides IELTS exam preparation, not the official examination. Assessments in this course are practice activities and teacher estimates; results are not issued by an official IELTS test provider and no band score, visa or university admission is guaranteed.</p></div>
        <div className="space-y-3"><CheckCircle2 className="text-primary w-7 h-7"/><h2 className="text-2xl font-bold">Link preparation with university planning</h2><p className="text-sm text-muted-foreground">Students can explore academic qualifications, degree progression and admissions counselling separately. OTHM and Qualifi are distinct qualification pathways and do not award or endorse this independent IELTS preparation course.</p><Button variant="outline" asChild><Link to="/pathways">Explore study destinations <ArrowRight className="ml-2 w-4 h-4"/></Link></Button></div>
      </section>
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-16"><InternationalEnquiryForm kind="ielts" /></section>
    </main><PublicFooter />
  </div>;
}
