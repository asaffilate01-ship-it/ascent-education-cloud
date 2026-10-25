import CourseAtAGlance from '@/components/CourseAtAGlance';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, School, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { HeroImage } from '@/components/PublicHero';
import PageContents from '@/components/PageContents';

type Kind = 'tuition' | 'employer';
const content = {
  tuition: { eyebrow: 'For school learners', title: 'Years 8–12 tuition — online and in centre.', description: 'Maths, English, Biology, Chemistry, Physics and Technology with live online and in-centre tuition, revision and examination preparation.', icon: School, details: [
    { icon: BookOpen, title: 'Subject learning', text: 'Years 8–12: maths, English, biology, chemistry, physics and technology, subject to centre availability.' },
    { icon: Users, title: 'Live support', text: 'Live online teaching and scheduled in-centre support, with homework, revision and learner feedback.' },
    { icon: GraduationCap, title: 'Exam preparation', text: 'Quizzes, mock assessments, progress feedback and access to STEMCoach for registered learners, subject to account activation.' },
  ] },
  employer: { eyebrow: 'For organisations', title: 'Learning that moves your team forward.', description: 'Short courses and tailored employer learning designed to connect skills development with the working day.', icon: BriefcaseBusiness, details: [
    { icon: BookOpen, title: 'Skills courses', text: 'Explore practical learning formats suited to employees and teams.' },
    { icon: Users, title: 'Cohort learning', text: 'Organise learning for groups and track participation through the employer portal.' },
    { icon: GraduationCap, title: 'Progress visibility', text: 'Follow learning activity and completion where a programme supports it.' },
  ] },
};
export default function LearningOverview({ kind }: { kind: Kind }) {
  const data = content[kind];
  const Icon = data.icon;
  return <div className="public-site min-h-dvh bg-background"><Seo title={`${kind === 'tuition' ? 'Years 8–12 Tuition' : 'Employer Learning'} | UniPathway`} description={data.description} canonical={`/${kind === 'tuition' ? 'tuition' : 'employer-learning'}`} /><PublicNav />
    <main><section className="border-b border-border bg-secondary/40"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-20"><div><span className="text-label text-success">{data.eyebrow}</span><h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{data.title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{data.description}</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/contact">Enquire now <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/courses">Explore qualifications</Link></Button></div></div><HeroImage topic={kind === 'tuition' ? 'tuition' : 'careers'} /></div></section>
    <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8"><CourseAtAGlance course={kind==='tuition'?'School tuition':'Employer learning'} entry={kind==='tuition'?'Years 8–12, Matric, Intermediate and Cambridge pathways. An initial assessment identifies subject and level.':undefined}/><PageContents/></div>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="flex items-center gap-3"><Icon className="size-6 text-success" /><span className="text-label text-success">The learning experience</span></div><h2 className="mt-3 max-w-xl text-2xl font-bold sm:text-3xl">A clearer path from learning to progress</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{data.details.map(({icon: ItemIcon,title,text}) => <article className="surface-card p-6" key={title}><ItemIcon className="size-7 text-success" /><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div><p className="mt-8 text-sm text-muted-foreground">Availability, timetable and fees depend on the course. Contact UniPathway for current options.</p></section>{kind==='tuition'&&<section className="mx-auto max-w-7xl space-y-8 px-5 pb-16 sm:px-8">
  <div><p className="text-label text-success">For multiple Pakistan and international boards</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Your board, your timetable, your way to learn</h2><p className="mt-3 max-w-3xl text-muted-foreground">Years 8–12 are our primary school tuition focus. We adapt lesson objectives, textbooks and revision plans to the student's year, school board, exam series and individual learning goals.</p></div>
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[
      {title:'Matric / SSC',detail:'Secondary School Certificate and provincial boards in Pakistan.'},
      {title:'Intermediate / HSSC',detail:'FA/FSc and relevant higher-secondary learning pathways, including pre-medical and pre-engineering.'},
      {title:'Cambridge IGCSE / O Level',detail:'Cambridge-based subject revision and international secondary examination preparation.'},
      {title:'Cambridge AS / A Level',detail:'Subject-by-subject support where requested, with board-specific course planning.'},
    ].map(item=><article className="rounded-xl border bg-card p-5" key={item.title}><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm text-muted-foreground">{item.detail}</p></article>)}
  </div>
  <div><h2 className="text-2xl font-bold">Tuition subjects</h2><div className="mt-4 flex flex-wrap gap-2">{['Mathematics','Biology','Chemistry','Physics','English','Technology and Computing'].map(subject=><span key={subject} className="rounded-full border bg-secondary px-4 py-2 text-sm font-semibold">{subject}</span>)}</div></div>
  <div className="grid gap-4 md:grid-cols-2"><article className="rounded-xl border p-6"><h3 className="text-lg font-bold">Online classes and independent learning</h3><p className="mt-2 text-sm text-muted-foreground">Attend tutor-led lessons remotely, follow schedules, access materials and recorded lessons where available, submit homework and track feedback through the LMS.</p></article><article className="rounded-xl border p-6"><h3 className="text-lg font-bold">In-centre teaching and revision</h3><p className="mt-2 text-sm text-muted-foreground">Attend scheduled classroom sessions, workshops, laboratory-style learning where equipped, mock assessments and targeted revision at participating locations.</p></article></div>
  <div className="rounded-xl border bg-secondary/40 p-6"><h2 className="text-xl font-bold">STEMCoach for enrolled students</h2><p className="mt-2 text-sm text-muted-foreground">Our goal is to provide active UniPathway students with included STEMCoach access and offer separate worldwide subscriptions for other learners. Full account entitlements and activation require live integration testing.</p><Button asChild className="mt-4"><Link to="/contact">Ask about tuition or STEMCoach</Link></Button></div>
</section>}</main><PublicFooter /></div>;
}