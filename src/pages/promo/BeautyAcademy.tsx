import AwardingBodyGuidance from '@/components/AwardingBodyGuidance';
import CourseAtAGlance from '@/components/CourseAtAGlance';
import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, HeartHandshake, ShieldCheck, Sparkles, GraduationCap, ClipboardCheck, Search, Users } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { academyAccreditationSchemes, cibtacQualifications, cpdCandidateCourses } from '@/lib/beautyAccreditation';

const areas=['All','Beauty therapy','Make-up','Nails','Advanced aesthetics'] as const;

export default function BeautyAcademy() {
  const [area,setArea]=useState<string>('All');
  const [level,setLevel]=useState<string>('All');
  const [search,setSearch]=useState('');
  const visible=useMemo(()=>cibtacQualifications.filter(q=>
    (area==='All'||q.area===area)&&(level==='All'||String(q.level)===level)&&
    (`${q.name} ${q.code} ${q.area}`.toLowerCase().includes(search.trim().toLowerCase()))
  ),[area,level,search]);
  return <div className="public-site min-h-dvh bg-background">
    <Seo canonical="/beauty-aesthetics" title="Women's Beauty & Aesthetics Academy | UniPathway"
      description="Explore planned women's beauty therapy, make-up, nails and aesthetics training, the CIBTAC centre accreditation pathway and CPD UK course accreditation." />
    <PublicNav/>
    <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
      <PublicHero topic="beauty">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-success">Women's Beauty & Aesthetics Academy</span>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">Professional beauty skills. Supportive learning. Real career pathways.</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">UniPathway plans women-focused classes in Pakistan covering salon skills, make-up, nails, skincare and selected advanced aesthetic subjects. Online theory is paired with supervised in-centre practical learning where the qualification allows it.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/contact">Register your interest <ArrowRight className="ml-1 size-4"/></Link></Button><Button asChild variant="outline" size="lg"><a href="#qualifications">View programme options</a></Button></div>
        </div>
        </PublicHero>
<CourseAtAGlance course="Beauty and aesthetics" delivery="Theory may be online; practical training and assessment require supervised in-person attendance."/><PageContents/>
<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[{icon:Users,title:'Women-focused',detail:'Planned dedicated cohorts'},{icon:GraduationCap,title:'Practical skills',detail:'Supervised in-centre learning'},{icon:BookOpenCheck,title:'Theory + LMS',detail:'Lessons, resources and assessment'},{icon:HeartHandshake,title:'Career development',detail:'Portfolio and salon opportunities'}].map(({icon:Icon,title,detail})=><div key={title} className="rounded-xl border bg-white/90 p-4 dark:bg-card"><Icon className="size-6 text-success"/><h2 className="mt-3 text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>)}
        </div>


      <section className="space-y-4" aria-labelledby="academy-approval-heading">
        <div><p className="text-label text-success">International awarding bodies</p><h2 id="academy-approval-heading" className="mt-2 text-2xl font-bold">Our centre-accreditation plans</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">UniPathway is pursuing these independent approval routes. Centre status, CPD provider membership and individual course certification are not currently presented as awarded.</p></div>
        <div className="grid gap-4 md:grid-cols-2">{academyAccreditationSchemes.slice(0,2).map(s=><article key={s.id} className="rounded-xl border bg-card p-6"><ShieldCheck className="size-6 text-success"/><h3 className="mt-3 text-xl font-bold">{s.name}</h3><p className="mt-2 text-sm text-muted-foreground">{s.description}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Application preparation — approval pending</p></article>)}</div>
      </section>

      <AwardingBodyGuidance beautyOnly/>

      <section id="qualifications" className="scroll-mt-28 space-y-5" aria-labelledby="beauty-qualifications-heading">
        <div><p className="text-label text-success">CIBTAC regulated qualification selection</p><h2 id="beauty-qualifications-heading" className="mt-2 text-2xl font-bold">Planned certificates, awards and diplomas</h2><p className="mt-2 max-w-4xl text-sm text-muted-foreground">Titles, codes and qualification numbers come from CIBTAC's official published lists. The awarding body must approve both the centre and its specific qualification offerings before CIBTAC enrolment or assessments are opened.</p></div>
        <div className="rounded-xl border bg-card p-4 sm:p-5" aria-label="Find a beauty qualification">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <label htmlFor="beauty-search" className="text-sm font-semibold"><Search className="mr-1 inline size-4"/>Search qualification or code<Input className="mt-1" id="beauty-search" placeholder="Facials, nails, CIBTAC code…" value={search} onChange={e=>setSearch(e.target.value)} /></label>
            <label htmlFor="beauty-level" className="text-sm font-semibold">Level<select id="beauty-level" className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={level} onChange={e=>setLevel(e.target.value)}><option value="All">All levels</option>{['2','3','4'].map(l=><option key={l} value={l}>Level {l}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{areas.map(x=><Button type="button" size="sm" key={x} aria-pressed={area===x} variant={area===x?'default':'outline'} onClick={()=>setArea(x)}>{x==='All'?'All subjects':x}</Button>)}</div>
          <p className="mt-3 text-sm text-muted-foreground" role="status">{visible.length} proposed qualification options.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Beauty qualification options">
          {visible.map(q=><article key={q.code} className="flex flex-col rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-success">CIBTAC · Level {q.level}</span><span className="text-xs text-muted-foreground">{q.code}</span></div><h3 className="mt-3 text-lg font-bold">{q.name}</h3><p className="mt-2 text-sm text-muted-foreground">{q.area} · QAN {q.qan}</p><div className="mt-auto flex flex-wrap gap-3 pt-5 text-sm"><Link className="font-semibold text-success hover:underline" to="/contact">Enquire</Link></div></article>)}
          {!visible.length&&<p className="text-muted-foreground">No qualifications match. Adjust the subject or level.</p>}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="beauty-cpd-heading">
        <div><p className="text-label text-success">Short-course learning</p><h2 id="beauty-cpd-heading" className="mt-2 text-2xl font-bold">Short courses planned for CPD UK review</h2><p className="mt-2 max-w-4xl text-sm text-muted-foreground">These are UniPathway-designed candidate learning activities. They are not currently CPD-certified courses. Course-specific certification can be displayed only after The CPD Certification Service has formally assessed and approved each activity.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cpdCandidateCourses.map(c=><article key={c.id} className="rounded-xl border p-5"><Sparkles className="size-5 text-success"/><p className="mt-3 text-xs text-muted-foreground">{c.subject} · {c.length}</p><h3 className="mt-1 text-lg font-bold">{c.name}</h3><p className="mt-2 text-sm text-muted-foreground">{c.practice?'Practical skills are assessed in person under supervision.':'Theory and project-based learning can be delivered online with tutor feedback.'}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">Candidate for CPD review — not yet accredited</p></article>)}</div>
      </section>

      <section className="rounded-xl border bg-secondary/40 p-6 sm:p-8"><ClipboardCheck className="size-7 text-success"/><h2 className="mt-3 text-2xl font-bold">A safe and supportive women-focused learning environment</h2><p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">We plan dedicated ladies' teaching sessions, privacy-conscious practical spaces, suitably qualified instructors, model/client consent, hygiene protocols and professional skills assessment. Female teaching staff, exact timetables, accessibility and facilities will be confirmed before enrolment. Advanced aesthetics, invasive treatments, skin procedures and energy-based devices must never be offered hands-on without approved qualifications, appropriate premises, insurance and local regulatory compliance. No injectables or medical procedures are advertised.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/contact">Enquire about the Ladies Academy</Link></Button><Button asChild variant="outline"><Link to="/careers">Salon employment pathways</Link></Button></div></section>
    </main>
    <PublicFooter/>
  </div>;
}
