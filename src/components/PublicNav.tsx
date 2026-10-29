import WhatsAppWidget from '@/components/WhatsAppWidget';
import SocialIcons from '@/components/SocialIcons';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Globe2, GraduationCap, Menu, School, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import PublicBottomNav from '@/components/PublicBottomNav';
import { cn } from '@/lib/utils';

export const studyLinks = [
  { label: 'Complete Education Centre', detail: 'Pakistan board exams, O/A Levels, global languages, professional certification, care, beauty and UK diplomas', to: '/education-centre', icon: GraduationCap },
  { label: 'All study options', detail: 'Live online / in-centre tuition, qualifications, digital skills, finance and more', to: '/study', icon: BookOpen },
  { label: 'European country explorer', detail: 'All EU university destinations with language and study preparation', to: '/europe', icon: Globe2 },
  { label: 'UniPathway scholarships', detail: 'Foundation opportunity fund for merit and financial need', to: '/scholarships', icon: GraduationCap },
  { label: 'School partnerships', detail: 'Tuition support, referrals and optional school software', to: '/school-partners', icon: School },
  { label: 'Study in Pakistan', detail: 'HEC universities, local degree progression and study guidance', to: '/pakistan', icon: School },
  { label: 'Women’s Beauty & Aesthetics', detail: 'CIBTAC, VTCT Skills guidance, salon skills and CPD training', to: '/beauty-aesthetics', icon: GraduationCap },
  { label: 'Art, Crafts & Sewing', detail: 'Fine art, sewing, tailoring, embroidery, ceramics and selling handmade products', to: '/creative-crafts', icon: BookOpen },

  { label: 'UK & international qualifications', detail: 'OTHM, Qualifi, ATHE, Pearson BTEC and VTCT Skills guidance', to: '/qualifications', icon: GraduationCap },
  { label: 'University progression directory', detail: 'OTHM and Qualifi named university routes with in-site guidance', to: '/university-progression', icon: GraduationCap },
  { label: 'Years 8–12 tuition', detail: 'Matric, Intermediate/FSc, Cambridge; online and in-centre', to: '/tuition', icon: School },
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
  { label: 'All overseas destinations', detail: 'Explore university progression beyond Pakistan', to: '/pathways' },
  { label: 'Europe — all EU countries', detail: 'EU study destinations, universities, languages and training', to: '/europe' },
  { label: 'University progression directory', detail: 'Named OTHM and Qualifi university routes', to: '/university-progression' },
  { label: 'United Kingdom', detail: 'UK admissions and progression', to: '/uk' },
  { label: 'Germany', detail: 'German study options and pathways', to: '/germany' },
  { label: 'United States', detail: 'U.S. universities, English and career guidance', to: '/usa' },
  { label: 'Australia', detail: 'Universities, VET, CRICOS and English requirements', to: '/australia' },
  { label: 'Canada', detail: 'English/French study routes and university options', to: '/canada' },
];

const primaryStudyLinks = studyLinks.filter(link => ['/study', '/qualifications', '/tuition', '/ielts-preparation', '/german-preparation', '/tech-academy', '/finance-academy', '/beauty-aesthetics', '/creative-crafts'].includes(link.to));

const linkCls = (active: boolean) => cn('relative inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors', active ? 'bg-primary/5 text-primary' : 'text-foreground/80 hover:bg-accent hover:text-foreground');

export default function PublicNav() {
  const headerRef = useRef<HTMLElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const coursesTrigger = useRef<HTMLButtonElement>(null);
  const destinationsTrigger = useRef<HTMLButtonElement>(null);
  const [courseQuery, setCourseQuery] = useState('');
  const matchingCourses = studyLinks.filter(link => `${link.label} ${link.detail}`.toLowerCase().includes(courseQuery.trim().toLowerCase()));
  const [open, setOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [destinationsOpen, setDestinationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setStudyOpen(false); setDestinationsOpen(false); setCourseQuery(''); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { const trigger = open ? mobileTrigger : studyOpen ? coursesTrigger : destinationsOpen ? destinationsTrigger : null; setOpen(false); setStudyOpen(false); setDestinationsOpen(false); trigger?.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!headerRef.current?.contains(event.target as Node)) { setStudyOpen(false); setDestinationsOpen(false); } };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [open, studyOpen, destinationsOpen]);
  useEffect(() => {
    if (!open) return;
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(headerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, summary') || []).filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', containFocus);
    return () => document.removeEventListener('keydown', containFocus);
  }, [open]);
  return <>{!open && <WhatsAppWidget />}{!open && <PublicBottomNav />}<header ref={headerRef} className={cn('sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl transition-shadow', scrolled ? 'border-border shadow-surface-lg' : 'border-transparent')}>
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:h-20 sm:px-8 lg:h-20">
      <Link to="/" aria-label="UniPathway home" className="shrink-0"><BrandLogo className="h-11 lg:h-14" /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
        <Link to="/" className={linkCls(pathname === '/')}>Home</Link>
        <div className="relative">
          <button ref={coursesTrigger} type="button" aria-haspopup="true" aria-expanded={studyOpen} onClick={() => { setStudyOpen(!studyOpen); setDestinationsOpen(false); }} className={cn(linkCls(studyOpen), 'inline-flex items-center gap-1')}>Courses <ChevronDown className={cn('size-4 transition-transform', studyOpen && 'rotate-180')} /></button>
          {studyOpen && <div className="absolute left-1/2 top-full w-[760px] -translate-x-1/2 pt-3 animate-in fade-in-0 slide-in-from-top-1"><div className="grid grid-cols-[1fr_220px] overflow-hidden rounded-2xl border border-border bg-card shadow-surface-xl">
            <div className="grid max-h-[min(75vh,620px)] grid-cols-2 gap-1 overflow-y-auto p-3">
              {primaryStudyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={label} to={to} className="group/item flex gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success transition-colors group-hover/item:bg-success group-hover/item:text-success-foreground"><Icon className="size-4" /></span><span><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{detail}</span></span></Link>)}
            </div>
            <div className="flex flex-col justify-between bg-primary p-5 text-primary-foreground"><div><p className="text-[11px] font-bold uppercase tracking-widest text-gold">Find your next step</p><p className="mt-2 text-lg font-bold leading-snug">Not sure where to start?</p><p className="mt-2 text-xs text-primary-foreground/75">Get free, personal guidance on the right course for you.</p></div><Button variant="secondary" size="sm" asChild className="mt-4"><Link to="/contact">Talk to an adviser <ArrowRight /></Link></Button></div>
          </div></div>}
        </div>
        <div className="relative">
          <button ref={destinationsTrigger} type="button" aria-haspopup="true" aria-expanded={destinationsOpen} onClick={() => { setDestinationsOpen(!destinationsOpen); setStudyOpen(false); }} className={cn(linkCls(destinationsOpen), 'inline-flex items-center gap-1')}>Study Abroad <ChevronDown className={cn('size-4 transition-transform', destinationsOpen && 'rotate-180')} /></button>
          {destinationsOpen && <div className="absolute left-1/2 top-full w-[500px] -translate-x-1/2 pt-3 animate-in fade-in-0 slide-in-from-top-1"><div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-3 shadow-surface-xl">
            {destinationLinks.map(({ label, detail, to }) => <Link key={to} to={to} className="rounded-xl p-3 transition-colors hover:bg-secondary"><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></Link>)}
          </div></div>}
        </div>
        <Link to="/about" className={linkCls(pathname === '/about')}>About</Link>
        <Link to="/contact" className={linkCls(pathname === '/contact')}>Contact</Link>
      </nav>
      <div className="hidden items-center gap-2 lg:flex"><Button variant="ghost" className="rounded-full font-semibold" asChild><Link to="/login">Sign in</Link></Button><Button className="rounded-full px-5 shadow-surface-lg" asChild><Link to="/apply">Apply now <ArrowRight /></Link></Button></div>
      <Button ref={mobileTrigger} variant="outline" size="icon" className="rounded-full lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
    </div>
    {open && <nav aria-label="Mobile navigation" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-28 pt-4 animate-in fade-in-0 slide-in-from-top-2 sm:h-[calc(100dvh-5rem)] sm:px-8 lg:hidden">
      <div className="mb-6 grid grid-cols-2 gap-2">{[['All courses','/study'],['Contact admissions','/contact'],['About UniPathway','/about'],['Student sign in','/login']].map(([label,to])=><Link key={to} to={to} className="flex min-h-12 items-center rounded-xl border bg-card px-4 text-sm font-semibold">{label}</Link>)}</div>
      <label htmlFor="mobile-course-search" className="text-label">Find a course or service</label>
      <input id="mobile-course-search" type="search" value={courseQuery} onChange={e => setCourseQuery(e.target.value)} placeholder="Try IELTS, tuition, technology…" className="mt-2 min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
      <p role="status" className="mt-2 text-xs text-muted-foreground">{courseQuery ? `${matchingCourses.length} matching options` : 'Explore our most popular courses'}</p>
      {courseQuery && matchingCourses.length === 0 && <p className="mt-3 text-sm">No matches. <button type="button" className="min-h-11 underline font-semibold" onClick={()=>{setCourseQuery('');document.getElementById('mobile-course-search')?.focus();}}>Clear course search</button> or <Link className="underline" to="/contact">Ask an adviser for help</Link>.</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{(courseQuery ? matchingCourses : primaryStudyLinks).map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 active:scale-[0.99] transition-transform"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/10 text-success"><Icon className="size-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="block text-xs leading-relaxed text-muted-foreground">{detail}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</div>
      <details className="mt-6 rounded-xl border p-4"><summary className="cursor-pointer py-2 font-semibold">Explore study-abroad destinations</summary>
      <div className="mt-3 flex flex-wrap gap-2">{destinationLinks.map(({ label, to }) => <Link key={to} to={to} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold">{label}</Link>)}</div>
      </details><div className="mt-7 grid grid-cols-2 gap-2">{[['Learning advice', '/blog'], ['Apply now', '/apply']].map(([label, to]) => <Link key={to} to={to} className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold">{label}</Link>)}</div>
      <div className="mt-5"><SocialIcons className="mt-3" /></div>
      <Button size="lg" className="mt-5 w-full rounded-full" asChild><Link to="/apply">Apply now <ArrowRight /></Link></Button>
    </nav>}
  </header></>;
}
