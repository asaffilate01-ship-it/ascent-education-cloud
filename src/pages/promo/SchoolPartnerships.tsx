import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Building2, CheckCircle2, GraduationCap, HeartHandshake, LockKeyhole, School, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';

export default function SchoolPartnerships(){
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/school-partners" title="School Partnerships — UniPathway" description="Explore tuition support, consented student referrals and optional school software through UniPathway school partnerships."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
   <PublicHero topic="study"><p className="text-label text-success">UniPathway school partnerships</p><h1 className="mt-3 max-w-4xl text-3xl font-extrabold text-[#0B2D5B] dark:text-white sm:text-5xl">More learning opportunities for your school.</h1><p className="mt-5 max-w-4xl leading-relaxed text-slate-700 dark:text-slate-300">Give your students access to extra subject tuition and education guidance. Keep your existing school software: Ilmvero is optional. Contact us to discuss a partnership and how parent-approved referrals work.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Enquire about school partnership <ArrowRight className="ml-2 size-4"/></Link></Button><Button variant="outline" asChild><Link to="/tuition">Online and in-centre tuition</Link></Button></div></PublicHero>
<PageContents/>

   <section className="grid gap-4 md:grid-cols-3">{[
    {icon:School,title:'Optional Ilmvero software',copy:'School and campus operations, attendance, timetables, fees, parents, teachers, exams and available learning tools, subject to the agreed licence.'},
    {icon:GraduationCap,title:'UniPathway — extended education',copy:'Online and planned in-school Years 8–12 tuition in Maths, English, Biology, Chemistry, Physics and Technology, plus international progression information.'},
    {icon:BookOpen,title:'Optional Omniqora Intelligence',copy:'Future permission-scoped educational analytics, teaching plans and learning support. An Ilmvero licence does not automatically activate cross-platform AI or transfer pupil information.'},
   ].map(({icon:Icon,title,copy})=><article className="rounded-xl border bg-card p-6" key={title}><Icon className="size-7 text-success"/><h2 className="mt-3 text-lg font-bold">{title}</h2><p className="mt-3 text-sm text-muted-foreground">{copy}</p></article>)}</section>
   <section><h2 className="text-2xl font-bold">Optional Ilmvero partnership benefit</h2><p className="mt-3 text-sm text-muted-foreground">Ilmvero is standalone school-management software with its own account, licence and onboarding. Eligible schools may receive their first 12 months complimentary under a separate signed agreement. Confirm the included plan, activation date and renewal terms before joining.</p><div className="mt-5 grid gap-4 md:grid-cols-4">{[
    {number:'01',title:'School verification',text:'School leadership chooses the services it wants. Software licensing and any data-processing arrangements are agreed separately.'},
    {number:'02',title:'12 months complimentary',text:'An eligible school receives its agreed Ilmvero plan for the first twelve months from documented activation.'},
    {number:'03',title:'Refer interested families',text:'The family or guardian independently consents and completes UniPathway admissions. Sharing pupil lists or registering unverified leads is not sufficient.'},
    {number:'04',title:'Renew free access',text:'At least one verified referred enrolment in the preceding year qualifies the school for another operator-approved free year.'},
   ].map(x=><article className="rounded-xl border p-5" key={x.number}><p className="text-sm font-bold text-success">{x.number}</p><h3 className="mt-2 font-bold">{x.title}</h3><p className="mt-2 text-sm text-muted-foreground">{x.text}</p></article>)}</div></section>
   <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border bg-secondary/40 p-6"><ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Privacy and school independence</h2><p className="mt-3 text-sm text-muted-foreground">Ilmvero can be used independently of UniPathway. Schools retain control of their own learner records. Separate accounts are required; a partnership does not create a shared login or give UniPathway automatic access to pupil records. UniPathway referrals are handled separately with guardian consent where applicable. The Ilmvero confirmation register uses random enrolment receipts instead of names, family circumstances or grades. No school is required to provide children’s records to receive the first free year.</p></article><article className="rounded-xl border bg-card p-6"><HeartHandshake className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Opportunities for deserving students</h2><p className="mt-3 text-sm text-muted-foreground">The planned UniPathway Foundation Opportunity Fund can consider academic merit and genuine financial need, with independent human review and optional employer-funded awards. Scholarships are independent of school referral targets and never guaranteed.</p><Button className="mt-4" variant="outline" asChild><Link to="/scholarships">Explore scholarships</Link></Button></article></section>
   <p className="flex items-start gap-2 text-xs text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0"/>Ilmvero's account/licence billing, school verification, UniPathway enrolment acknowledgements and Omniqora service entitlements must be activated separately by authorised operators. Nothing on this page initiates automatic pupil-data transfer or an AI processing job.</p>
  </main><PublicFooter/>
 </div>;
}
