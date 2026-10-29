import CourseAtAGlance from '@/components/CourseAtAGlance';
import PublicHero from '@/components/PublicHero';
import PageContents from '@/components/PageContents';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, GraduationCap, Palette, Scissors, Search, ShieldCheck, ShoppingBag, Store } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { creativeEnterpriseCourses, creativeEnterpriseEnquiry } from '@/lib/creativeEnterprise';

const formats = ['All', 'Short course', 'Workshop'] as const;
const highlights = [
  { icon: Scissors, title: 'Learn the craft', desc: 'Machine skills, fabric, stitch and finishing' },
  { icon: Palette, title: 'Make real products', desc: 'Samples, garments and a small product range' },
  { icon: Store, title: 'Price with confidence', desc: 'Materials, time, overheads and profit-aware pricing' },
  { icon: ShoppingBag, title: 'Sell online', desc: 'Photography, listings, enquiries and delivery' },
];

export default function CreativeCrafts() {
  const [format, setFormat] = useState<string>('All');
  const [query, setQuery] = useState('');
  const courses = useMemo(() => creativeEnterpriseCourses.filter(course =>
    (format === 'All' || course.format === format) &&
    `${course.title} ${course.topics.join(' ')} ${course.outcome}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [format, query]);

  return <div className="public-site min-h-dvh bg-background">
    <Seo canonical="/creative-crafts" title="Sewing, Crafts & Creative Enterprise Courses in Pakistan | UniPathway" description="Learn sewing, tailoring, embroidery, ceramics and handmade product making online across Pakistan, with supervised practical workshops in Jhelum." />
    <PublicNav />
    <main className="mx-auto max-w-7xl space-y-12 px-5 py-12 sm:px-8">
      <PublicHero topic="crafts">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#128F58]">Sewing, crafts &amp; creative enterprise</p>
          <h1 className="mt-4 text-3xl font-extrabold text-[#0B2D5B] dark:text-white sm:text-5xl">Turn creative skills into a business you can run from home.</h1>
          <p className="mt-5 max-w-3xl leading-relaxed text-slate-700 dark:text-slate-300">Sewing and tailoring, embroidery and textile crafts, clay and ceramics, product photography and online selling — taught online across Pakistan and in supervised practical workshops at our Jhelum centre. Ask admissions to confirm the dates, fees, materials, equipment and workshop places available to you.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link to="/contact">Ask about enrolling <ArrowRight className="ml-1 size-4" /></Link></Button>
            <Button asChild variant="outline"><Link to="/qualifications?body=Pearson%20BTEC&subject=Fine%20Art%20%26%20Craft">Explore Fine Art diplomas</Link></Button>
          </div>
        </div>
      </PublicHero>
      <CourseAtAGlance course="Sewing, Crafts & Creative Enterprise" /><PageContents />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {highlights.map(({ icon: Icon, title, desc }) => <div key={title} className="rounded-xl border bg-white p-4 dark:bg-card"><Icon className="size-6 text-success" /><h2 className="mt-2 text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div>)}
      </div>

      <section aria-labelledby="crafts-options-heading" className="space-y-5">
        <div>
          <p className="text-label text-success">Short courses and workshops</p>
          <h2 id="crafts-options-heading" className="mt-2 text-2xl font-bold sm:text-3xl">Choose the craft, then the business skills around it</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">These are UniPathway learning descriptions and teaching plans, not a guarantee that every option is currently running. Admissions will confirm start dates, duration, fees, materials, equipment, facilities and workshop attendance before you book.</p>
        </div>
        <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_220px]">
          <label htmlFor="crafts-search" className="text-sm font-semibold"><Search className="mr-1 inline size-4" />Search crafts and skills<Input id="crafts-search" value={query} onChange={e => setQuery(e.target.value)} className="mt-1" placeholder="Search sewing, embroidery, ceramics, selling…" /></label>
          <label htmlFor="crafts-format" className="text-sm font-semibold">Learning format<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" id="crafts-format" value={format} onChange={e => setFormat(e.target.value)}>{formats.map(f => <option key={f} value={f}>{f === 'All' ? 'All formats' : f}</option>)}</select></label>
        </div>
        <p role="status" className="text-sm text-muted-foreground">{courses.length} learning options match your selection.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {courses.map(course => <article key={course.id} className="flex flex-col rounded-xl border bg-card p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-success">UniPathway · {course.format}</p>
            <h3 className="mt-2 text-xl font-bold">{course.title}</h3>
            <div className="mt-5"><h4 className="text-sm font-semibold">What you will cover</h4><ul className="mt-3 space-y-2">{course.topics.map(topic => <li key={topic} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /><span>{topic}</span></li>)}</ul></div>
            <div className="mt-5 border-t pt-4"><p className="text-sm font-semibold">What you will work towards</p><p className="mt-1 text-sm text-muted-foreground">{course.outcome}</p></div>
            <Button asChild variant="outline" className="mt-auto self-start pt-5"><Link to={creativeEnterpriseEnquiry(course.title)}>Request course details</Link></Button>
          </article>)}
        </div>
        {courses.length === 0 && <div className="rounded-xl border p-8"><h3 className="font-bold">No craft matches that search yet.</h3><p className="mt-2 text-sm text-muted-foreground">Try a broader word such as sewing, gifts or selling — or tell an adviser what you would like to learn.</p><button type="button" onClick={() => { setQuery(''); setFormat('All'); }} className="mt-4 min-h-11 font-semibold underline">Show all craft options</button></div>}
      </section>

      <section aria-labelledby="crafts-qualification-heading" className="grid gap-5 rounded-xl border bg-secondary/40 p-6 md:grid-cols-2">
        <div><GraduationCap className="size-7 text-success" /><h2 id="crafts-qualification-heading" className="mt-3 text-xl font-bold">Want a recognised qualification instead?</h2><p className="mt-2 text-sm text-muted-foreground">The Pearson BTEC Level 4 HNC and Level 5 HND in Fine Art cover ceramics, textile surfaces and stitch, printmaking, sculpture and mixed-media practice, with portfolio and project assessment. Admissions will confirm entry requirements, centre visits and whether a programme is currently open.</p><Button asChild variant="outline" className="mt-4"><Link to="/qualifications?body=Pearson%20BTEC&subject=Fine%20Art%20%26%20Craft">See Fine Art qualification details <ArrowRight className="ml-1 size-4" /></Link></Button></div>
        <div><Camera className="size-7 text-success" /><h2 className="mt-3 text-xl font-bold">Business skills built around your own products</h2><p className="mt-2 text-sm text-muted-foreground">Photography, branding, packaging, marketplace and social selling, customer care and simple record keeping are taught using your own work, so you leave with listings, price sheets and a launch plan rather than generic notes. Enterprise teaching supports your ideas; it does not guarantee income or sales.</p></div>
      </section>

      <section aria-labelledby="crafts-honest-heading" className="space-y-4 rounded-xl border p-6">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-1 size-6 shrink-0 text-success" /><div><h2 id="crafts-honest-heading" className="text-lg font-bold">Please check these before booking</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>These short courses and workshops are UniPathway learning options. They are not Pearson qualifications and do not carry HNC or HND credits.</li>
            <li>Practical sessions need machines, tools, fabrics, clay or firing arrangements. Availability, materials lists, supervision and any completion document are confirmed with you in writing before payment.</li>
            <li>Women-focused groups and home-based business routes are available — tell admissions your preferences and accessibility needs.</li>
            <li>Government-funded skills schemes (PSDF, PITB e-Rozgaar, WDD SEHR, NAVTTC) have their own eligibility rules and application windows. We help you check them; we cannot promise a place or a stipend.</li>
          </ul></div></div>
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link to={creativeEnterpriseEnquiry('short courses and workshops')}>Ask about craft courses <ArrowRight className="ml-1 size-4" /></Link></Button>
          <Button asChild variant="outline"><Link to="/funded-courses">Pakistan funded skills schemes</Link></Button>
          <Button asChild variant="outline"><Link to="/study">All study options</Link></Button>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
