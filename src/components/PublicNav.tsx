import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Globe2, GraduationCap, Menu, School, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import PublicBottomNav from '@/components/PublicBottomNav';

export const studyLinks = [
  { label: 'All study options', detail: 'OTHM, Qualifi, accountancy, IT and more', to: '/study', icon: BookOpen },
  { label: 'OTHM & Qualifi qualifications', detail: 'Explore planned UK diploma programmes and awarding-body details', to: '/qualifications', icon: GraduationCap },
  { label: 'Years 8–12 tuition & STEMCoach', detail: 'Matric, Intermediate/FSc, Cambridge; online and in-centre', to: '/tuition', icon: School },
  { label: 'IELTS preparation', detail: 'Academic and General Training practice', to: '/ielts-preparation', icon: BookOpen },
  { label: 'German language courses', detail: 'A1–C1, Goethe, TestDaF, telc and DSH preparation', to: '/german-preparation', icon: BookOpen },
  { label: 'AI, tech & accounting', detail: 'Coding, cyber security, cloud, finance and IFA/ACCA prep', to: '/study', icon: BookOpen },
  { label: 'Employer learning', detail: 'Skills for teams and organisations', to: '/employer-learning', icon: BriefcaseBusiness },
  { label: 'Education consultancy', detail: 'Universities, admissions, counselling and career guidance', to: '/pathways', icon: Globe2 },
  { label: 'Pakistan funded skills', detail: 'PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC', to: '/funded-courses', icon: BriefcaseBusiness },
  { label: 'Pakistan careers & internships', detail: 'Planned employer partnerships and practical placements', to: '/careers', icon: BriefcaseBusiness },
  { label: 'Overseas student support', detail: 'Accommodation, banking, work and graduate guidance', to: '/student-support', icon: Globe2 },
];

export const destinationLinks = [
  { label: 'All destinations', detail: 'Compare admissions and progression across countries', to: '/pathways' },
  { label: 'United Kingdom', detail: 'UK admissions and progression', to: '/uk' },
  { label: 'Germany', detail: 'German study options and pathways', to: '/germany' },
  { label: 'United States', detail: 'USA university admissions enquiries', to: '/pathways?destination=USA' },
  { label: 'Australia', detail: 'Australian university admissions enquiries', to: '/pathways?destination=Australia' },
  { label: 'Canada', detail: 'Canadian university admissions enquiries', to: '/pathways?destination=Canada' },
  { label: 'Pakistan', detail: 'Local university and qualification options', to: '/pathways?destination=Pakistan' },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setStudyOpen(false); setDestinationsOpen(false); }, [pathname]);

  return <><PublicBottomNav /><header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:h-28">
      <Link to="/" aria-label="UniPathway home" className="shrink-0"><BrandLogo className="h-11 lg:h-14" /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
        <Link to="/" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">Home</Link>
        <div className="group relative" onMouseEnter={() => setStudyOpen(true)} onMouseLeave={() => setStudyOpen(false)}>
          <Button variant="ghost" aria-haspopup="true" aria-expanded={studyOpen} onClick={() => setStudyOpen(!studyOpen)} className="gap-1 font-semibold">Study <ChevronDown className="size-4" /></Button>
          {studyOpen && <div className="absolute left-0 top-full w-[540px] pt-2"><div className="grid max-h-[min(75vh,620px)] grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border bg-card p-3 shadow-surface-xl">
            {studyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to} className="group/item flex gap-3 rounded-md p-3 transition-colors hover:bg-secondary"><Icon className="mt-0.5 size-5 shrink-0 text-success" /><span><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span></Link>)}
          </div></div>}
        </div>
        <div className="group relative" onMouseEnter={() => setDestinationsOpen(true)} onMouseLeave={() => setDestinationsOpen(false)}>
          <Button variant="ghost" aria-haspopup="true" aria-expanded={destinationsOpen} onClick={() => setDestinationsOpen(!destinationsOpen)} className="gap-1 font-semibold">Study Abroad <ChevronDown className="size-4" /></Button>
          {destinationsOpen && <div className="absolute left-0 top-full w-[470px] pt-2"><div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 shadow-surface-xl">
            {destinationLinks.map(({ label, detail, to }) => <Link key={to} to={to} className="rounded-md p-3 transition-colors hover:bg-secondary"><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></Link>)}
          </div></div>}
        </div>
        <Link to="/about" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">About</Link>
        <Link to="/contact" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">Contact</Link>
      </nav>
      <div className="hidden items-center gap-2 lg:flex"><Button variant="outline" asChild><Link to="/login">Sign in</Link></Button><Button asChild><Link to="/apply">Apply <ArrowRight /></Link></Button></div>
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
    </div>
    {open && <nav aria-label="Mobile navigation" className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-border bg-background px-5 pb-6 pt-3 lg:hidden">
      <Link to="/" className="block border-b border-border py-3 text-base font-bold">Home</Link>
      <p className="pt-5 text-xs font-bold uppercase text-success">Explore learning</p>
      <div className="mt-2 grid gap-1">{studyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-md border border-border bg-card p-3"><Icon className="size-5 shrink-0 text-success" /><span className="flex-1"><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span><ArrowRight className="size-4 text-muted-foreground" /></Link>)}</div>
      <p className="pt-5 text-xs font-bold uppercase text-success">Study abroad and university guidance</p>
      <div className="mt-2 grid gap-1">{destinationLinks.map(({ label, detail, to }) => <Link key={to} to={to} className="block rounded-md border border-border bg-card p-3"><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></Link>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">{[['About','/about'],['Contact','/contact']].map(([label,to]) => <Link key={to} to={to} className="rounded-md py-2 text-sm font-semibold">{label}</Link>)}</div>
      <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" asChild><Link to="/login">Sign in</Link></Button><Button className="flex-1" asChild><Link to="/apply">Apply now</Link></Button></div>
    </nav>}
  </header></>;
}
