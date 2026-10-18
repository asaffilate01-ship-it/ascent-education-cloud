import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, BookOpenCheck, GraduationCap, Search } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { officialAwardingBodies, qualificationSelection, type AwardingBody } from '@/lib/qualificationSelection';

const bodies = ['All', 'OTHM', 'Qualifi'] as const;
export default function QualificationsCatalogue() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('body');
  const body = bodies.includes(requested as typeof bodies[number]) ? requested! : 'All';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...new Set(qualificationSelection.map(q=>q.category))],[]);
  const filtered = qualificationSelection.filter(q =>
    (body === 'All' || q.body === body) &&
    (category === 'All' || q.category === category) &&
    `${q.name} ${q.body} ${q.category}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return <div className="public-site min-h-dvh bg-background">
    <Seo canonical="/qualifications" title="OTHM and Qualifi Qualification Options | UniPathway" description="Review planned OTHM and Qualifi qualifications in business, IT, AI, accounting, law, hospitality and more, with official qualification directory links."/>
    <PublicNav/>
    <main className="mx-auto max-w-7xl space-y-8 px-5 py-12 sm:px-8">
      <header className="max-w-4xl">
        <p className="text-label text-success">UK & international qualifications</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Choose a pathway that moves you forward</h1>
        <p className="mt-4 text-muted-foreground">Explore proposed OTHM and Qualifi qualifications in business, technology, finance, health and other fields. These are official qualification titles for planning purposes, not confirmed UniPathway enrolment places. Each qualification's specification, centre authorisation, entry requirements and current teaching schedule must be confirmed.</p>
      </header>
      <section className="rounded-xl border bg-card p-5" aria-label="Filter qualification options">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Awarding body">
          {bodies.map(b=><Button key={b} size="sm" type="button" aria-pressed={body===b} variant={body===b?'default':'outline'} onClick={()=>setParams(b==='All'?{}:{body:b})}>{b==='All'?'All awarding bodies':b}</Button>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_230px]">
          <label className="block text-sm font-medium" htmlFor="qualification-search"><Search className="mr-1 inline size-4"/>Search programmes<Input id="qualification-search" className="mt-1" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try cyber security, accounting or law"/></label>
          <label className="block text-sm font-medium" htmlFor="qualification-category">Subject<select id="qualification-category" className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c==='All'?'All subjects':c}</option>)}</select></label>
        </div>
        <p className="mt-3 text-sm text-muted-foreground" role="status">{filtered.length} proposed qualification options match your selection.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Proposed qualifications">
        {filtered.map(q=><article key={q.body+q.name} className="flex flex-col rounded-xl border bg-card p-5">
          <span className="text-xs font-bold text-success">{q.body} · Level {q.level}</span>
          <h2 className="mt-2 text-lg font-bold">{q.name}</h2><p className="mt-2 text-sm text-muted-foreground">{q.category}</p>
          <div className="mt-auto flex flex-wrap gap-3 pt-5 text-sm"><a href={q.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">Official details <ArrowUpRight className="size-4"/></a><Link to="/contact" className="font-semibold text-success hover:underline">Ask admissions</Link></div>
        </article>)}
        {filtered.length===0&&<p>No matching qualifications. Try a different subject or search.</p>}
      </section>
      <section className="rounded-xl border bg-secondary/40 p-6">
        <BookOpenCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Teaching, curriculum and university progression</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Approved awarding-body unit specifications and assessment rules will determine the final modules, credits, assignment briefs and delivery method. Our planned model includes online study and two 14-day centre-based academic visits where permitted. A Level 4 or 5 diploma is not itself a UK university degree and admission or advanced standing is subject to the receiving university.</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {(Object.entries(officialAwardingBodies) as [AwardingBody,{url:string;label:string}][]).map(([body,info])=><a key={body} href={info.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{info.label} ↗</a>)}
        </div><Button asChild className="mt-5"><Link to="/pathways">Explore university progression <GraduationCap className="ml-2 size-4"/></Link></Button>
      </section>
    </main><PublicFooter/>
  </div>;
}
