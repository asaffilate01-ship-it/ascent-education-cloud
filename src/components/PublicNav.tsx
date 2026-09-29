import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronDown, Globe2, GraduationCap, Menu, School, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/unipathway-logo.png';

export const studyLinks = [
  { label: 'Qualifications in Pakistan', detail: 'Diplomas and progression', to: '/courses', icon: GraduationCap },
  { label: 'Years 9–12 tuition', detail: 'School support and exam preparation', to: '/tuition', icon: School },
  { label: 'Employer learning', detail: 'Skills for teams and organisations', to: '/employer-learning', icon: BriefcaseBusiness },
  { label: 'UK & Germany pathways', detail: 'Plan your next step abroad', to: '/pathways', icon: Globe2 },
];

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); setStudyOpen(false); }, [pathname]);

  return <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:h-24">
      <Link to="/" aria-label="UniPathway home" className="shrink-0"><img src={logo} alt="UniPathway" className="h-14 w-auto max-w-[160px] object-contain lg:h-20 lg:max-w-[220px]" /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
        <Link to="/" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">Home</Link>
        <div className="group relative" onMouseEnter={() => setStudyOpen(true)} onMouseLeave={() => setStudyOpen(false)}>
          <Button variant="ghost" aria-haspopup="true" aria-expanded={studyOpen} onClick={() => setStudyOpen(!studyOpen)} className="gap-1 font-semibold">Study <ChevronDown className="size-4" /></Button>
          {studyOpen && <div className="absolute left-0 top-full w-[490px] pt-2"><div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 shadow-surface-xl">
            {studyLinks.map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to} className="group/item flex gap-3 rounded-md p-3 transition-colors hover:bg-secondary"><Icon className="mt-0.5 size-5 shrink-0 text-success" /><span><span className="block text-sm font-bold text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span></Link>)}
          </div></div>}
        </div>
        <Link to="/germany" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">Germany</Link>
        <Link to="/uk" className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">UK</Link>
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
      <div className="mt-4 grid grid-cols-2 gap-2">{[['Germany','/germany'],['UK','/uk'],['About','/about'],['Contact','/contact']].map(([label,to]) => <Link key={to} to={to} className="rounded-md py-2 text-sm font-semibold">{label}</Link>)}</div>
      <div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1" asChild><Link to="/login">Sign in</Link></Button><Button className="flex-1" asChild><Link to="/apply">Apply now</Link></Button></div>
    </nav>}
  </header>;
}