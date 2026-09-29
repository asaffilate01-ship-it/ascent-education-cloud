import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, School, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import image from '@/assets/tenant-hero.jpg';

type Kind = 'tuition' | 'employer';
const content = {
  tuition: { eyebrow: 'For school learners', title: 'Years 9–12 tuition, built around progress.', description: 'Subject support, live teaching, revision and exam preparation in a connected learning experience.', icon: School, details: [
    { icon: BookOpen, title: 'Subject learning', text: 'Support across maths, sciences and technology subjects, according to the available track.' },
    { icon: Users, title: 'Live support', text: 'Teaching, homework guidance and revision alongside independent study.' },
    { icon: GraduationCap, title: 'Exam preparation', text: 'Quizzes, mock assessments and progress feedback to help learners focus.' },
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
  return <div className="public-site min-h-dvh bg-background"><Seo title={`${kind === 'tuition' ? 'Years 9–12 Tuition' : 'Employer Learning'} | UniPathway`} description={data.description} canonical={`/${kind === 'tuition' ? 'tuition' : 'employer-learning'}`} /><PublicNav />
    <main><section className="border-b border-border bg-secondary/40"><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-20"><div><span className="text-label text-success">{data.eyebrow}</span><h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{data.title}</h1><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{data.description}</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/contact">Enquire now <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/courses">Explore qualifications</Link></Button></div></div><img src={image} alt="Students learning together" className="aspect-[4/3] w-full rounded-md object-cover shadow-surface-lg" /></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="flex items-center gap-3"><Icon className="size-6 text-success" /><span className="text-label text-success">The learning experience</span></div><h2 className="mt-3 max-w-xl text-2xl font-bold sm:text-3xl">A clearer path from learning to progress</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{data.details.map(({icon: ItemIcon,title,text}) => <article className="surface-card p-6" key={title}><ItemIcon className="size-7 text-success" /><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</div><p className="mt-8 text-sm text-muted-foreground">Availability, timetable and fees depend on the course. Contact UniPathway for current options.</p></section></main><PublicFooter /></div>;
}