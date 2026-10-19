import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Globe2, GraduationCap, Menu, School, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import PublicBottomNav from '@/components/PublicBottomNav';
import { cn } from '@/lib/utils';

export const studyLinks = [
  { label: 'All study options', detail: 'Qualifications, accountancy, IT and more', to: '/study', icon: BookOpen },
  { label: 'Study in Pakistan', detail: 'HEC universities, local degree progression and study guidance', to: '/pakistan', icon: School },
  { label: 'Women’s Beauty & Aesthetics', detail: 'CIBTAC centre approval pathway, salon skills and CPD training', to: '/beauty-aesthetics', icon: GraduationCap },
  { label: 'UK & international qualifications', detail: 'Browse planned diplomas and awarding-body details', to: '/qualifications', icon: GraduationCap },
  { label: 'Years 8–12 tuition & STEMCoach', detail: 'Matric, Intermediate/FSc, Cambridge; online and in-centre', to: '/tuition', icon: School },
  { label: 'IELTS preparation', detail: 'Academic and General Training practice', to: '/ielts-preparation', icon: BookOpen },
  { label: 'German language courses', detail: 'A1–C1, Goethe, TestDaF, telc and DSH preparation', to: '/german-preparation', icon: BookOpen },
  { label: 'Technology Academy', detail: 'AI, Python, coding, cyber defence, cloud and DevOps', to: '/tech-academy', icon: BookOpen },
  { label: 'Accounting & Finance Academy', detail: 'Bookkeeping, tax, finance, IFA and ACCA revision', to: '/finance-academy', icon: GraduationCap },
  { label: 'Employer learning', detail: 'Skills for teams and organisations', to: '/employer-learning', icon: BriefcaseBusiness },
  { label: 'Education consultancy', detail: 'Universities, admissions, counselling and career guidance', to: '/pathways', icon: Globe2 },
  { label: 'Pakistan funded skills', detail: 'PSDF, PITB e-Rozgaar, WDD SEHR and NAVTTC', to: '/funded-courses', icon: BriefcaseBusiness },
  { label: 'Pakistan careers & internships', detail: 'Planned employer partnerships and practical placements', to: '/careers', icon: BriefcaseBusiness },
  { label: 'Overseas student support', detail: 'Accommodation, banking, work and graduate guidance', to: '/student-support', icon: Globe2 },
];

export const destinationLinks = [
  { label: 'All overseas destinations', detail: 'Compare UK, USA, Canada, Australia and Germany', to: '/pathways' },
  { label: 'United Kingdom', detail: 'UK admissions and progression', to: '/uk' },
  { label: 'Germany', detail: 'German study options and pathways', to: '/germany' },
  { label: 'United States', detail: 'U.S. universities, English and career guidance', to: '/usa' },
  { label: 'Australia', detail: 'Universities, VET, CRICOS and English requirements', to: '/australia' },
  { label: 'Canada', detail: 'English/French study routes and university options', to: '/canada' },
];

const linkCls = (active: boolean) => cn('relative rounded-full px-4 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary/5 text-primary' : 'text-foreground/80 hover:bg-accent hover:text-foreground');

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setStudyOpen(false); setDestinationsOpen(false); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  return <><PublicBottomNav /><header className={cn('sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl transition-shadow', scrolled ? 'border-border shadow-surface-lg' : 'border-transparent')}>
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:h-20 sm:px-8 lg:h-24">
      <Link to="/" aria-label="UniPathway home" className="shrink-0"><BrandLogo className="h-11 lg:h-14" /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 lg:flex">
        <Link to="/" className={linkCls(pathname === '/')}>Home</Link>
        <div className="relative" onMouseEnter={() => setStudyOpen(true)} onMouseLeave={() => setStudyOpen(false)}>
          <button type="button" aria-haspopup="true" aria-expanded={studyOpen} onClick={() => setStudyOpen(!studyOpen)} className={cn(linkCls(studyOpen), 'inline-flex items-center gap-1')}>Study <ChevronDown className={cn('size-4 transition-transform', studyOpen && 'rotate-180')} /></button>
          {studyOpen && <div className="absolute left-1/2 top-full w-[760px] -translate-x-1/2 pt-3 animate-in fade-in-0 slide-in-from-top-1"><div className="grid grid-cols-[1fr_220px] overflow-hidden rounded-2xl border border-border bg-card shadow-surface-xl">
            <div className="grid max-h-[min(75vh,620px)] grid-cols-2 gap-1 overflow-y-auto p-3">
              {studyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={label} to={to} className="group/item flex gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success transition-colors group-hover/item:bg-success group-hover/item:text-success-foreground"><Icon className="size-4" /></span><span><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{detail}</span></span></Link>)}
            </div>
            <div className="flex flex-col justify-between bg-primary p-5 text-primary-foreground"><div><p className="text-[11px] font-bold uppercase tracking-widest text-gold">September intake</p><p className="mt-2 text-lg font-bold leading-snug">Not sure where to start?</p><p className="mt-2 text-xs text-primary-foreground/75">Get free, personal guidance on the right course for you.</p></div><Button variant="secondary" size="sm" asChild className="mt-4"><Link to="/contact">Talk to an adviser <ArrowRight /></Link></Button></div>
          </div></div>}
        </div>
        <div className="relative" onMouseEnter={() => setDestinationsOpen(true)} onMouseLeave={() => setDestinationsOpen(false)}>
          <button type="button" aria-haspopup="true" aria-expanded={destinationsOpen} onClick={() => setDestinationsOpen(!destinationsOpen)} className={cn(linkCls(destinationsOpen), 'inline-flex items-center gap-1')}>Study Abroad <ChevronDown className={cn('size-4 transition-transform', destinationsOpen && 'rotate-180')} /></button>
          {destinationsOpen && <div className="absolute left-1/2 top-full w-[500px] -translate-x-1/2 pt-3 animate-in fade-in-0 slide-in-from-top-1"><div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-3 shadow-surface-xl">
            {destinationLinks.map(({ label, detail, to }) => <Link key={to} to={to} className="rounded-xl p-3 transition-colors hover:bg-secondary"><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></Link>)}
          </div></div>}
        </div>
        <Link to="/about" className={linkCls(pathname === '/about')}>About</Link>
        <Link to="/contact" className={linkCls(pathname === '/contact')}>Contact</Link>
      </nav>
      <div className="hidden items-center gap-2 lg:flex"><Button variant="ghost" className="rounded-full font-semibold" asChild><Link to="/login">Sign in</Link></Button><Button className="rounded-full px-5 shadow-surface-lg" asChild><Link to="/apply">Apply now <ArrowRight /></Link></Button></div>
      <Button variant="outline" size="icon" className="rounded-full lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
    </div>
    {open && <nav aria-label="Mobile navigation" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-28 pt-4 animate-in fade-in-0 slide-in-from-top-2 sm:h-[calc(100dvh-5rem)] sm:px-8 lg:hidden">
      <p className="text-label">Explore learning</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{studyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 active:scale-[0.99] transition-transform"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block truncate text-xs text-muted-foreground">{detail}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div>
      <p className="text-label mt-7">Study abroad</p>
      <div className="mt-3 flex flex-wrap gap-2">{destinationLinks.map(({ label, to }) => <Link key={to} to={to} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">{label}</Link>)}</div>
      <div className="mt-7 grid grid-cols-2 gap-2">{[['About', '/about'], ['Contact', '/contact'], ['Blog', '/blog'], ['Sign in', '/login']].map(([label, to]) => <Link key={to} to={to} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold">{label}</Link>)}</div>
      <Button size="lg" className="mt-5 w-full rounded-full" asChild><Link to="/apply">Apply now <ArrowRight /></Link></Button>
    </nav>}
  </header></>;
}
