import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { programmePriorities, progressionDestinations } from '@/lib/programmePriorities';

export default function StudyPriorities() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const visible = programmePriorities.filter(p => (category === 'All' || p.category === category) && `${p.title} ${p.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="public-site min-h-dvh bg-background"><Seo title="Study options — OTHM, Qualifi, Accountancy & IT | UniPathway" description="Explore qualifications, IT training, subject tuition, IELTS, funded-course enquiries and international progression." canonical="/study" /><PublicNav />
    <main className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
      <header><p className="text-label text-success">Your study options</p><h1 className="mt-3 text-4xl font-bold">Qualifications, skills and your next step.</h1><p className="mt-4 max-w-3xl text-muted-foreground">Our primary focus is OTHM, Qualifi, accountancy and IT training, supported by subject tuition, IELTS preparation and funding enquiries. Confirm course availability with admissions.</p></header>
      <section aria-label="Find a study option" className="space-y-4"><label className="block font-medium" htmlFor="study-search">Search subjects and training</label><Input id="study-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Try chemistry, bookkeeping or IELTS" /><div className="flex flex-wrap gap-2">{['All', 'Primary', 'Tuition and English', 'Funding'].map(c => <Button key={c} variant={category === c ? 'default' : 'outline'} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</Button>)}</div><p role="status" className="text-sm text-muted-foreground">{visible.length} study options</p><div className="grid gap-4 md:grid-cols-2">{visible.map(p => <article key={p.id} className="rounded-md border bg-card p-6"><p className="text-label text-success">{p.category}</p><h2 className="mt-2 text-xl font-bold">{p.title}</h2><p className="my-4 text-muted-foreground">{p.description}</p><Button asChild variant="outline"><Link to={p.to}>{p.to === '/contact' ? 'Ask admissions' : 'Explore options'}</Link></Button></article>)}</div></section>
      <section className="rounded-md bg-secondary p-6"><h2 className="text-2xl font-bold">OTHM and Qualifi: online learning, connected in person</h2><p className="mt-3">The planned model is four centre-based weeks per academic year, split into two 14-day visits. The rest of the programme is online.</p><p className="mt-3 text-muted-foreground">The adult residential programme plans 72 teaching hours and up to three optional private-support hours annually, with separate male and female accommodation sections and staggered activities. Dates and qualification-specific delivery requirements must be confirmed before booking.</p></section>
      <section><h2 className="text-2xl font-bold">University progression destinations</h2><div className="my-4 flex flex-wrap gap-3">{progressionDestinations.map(country => <span key={country} className="rounded-md border px-4 py-2">{country}</span>)}</div><p className="mb-4 text-muted-foreground">These are our target destinations. Admission, credit transfer and funding depend on the institution and verified route; a destination listing does not establish a university partnership.</p><Button asChild><Link to="/pathways">Explore progression guidance</Link></Button></section>
    </main><PublicFooter /></div>;
}
