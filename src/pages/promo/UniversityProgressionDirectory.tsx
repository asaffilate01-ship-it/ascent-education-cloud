import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Building2, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 getProgressionInstitutions, progressionCountries, verifiedProgressionSnapshot,
 type ProgressionBody,type ProgressionCountry,type ProgressionInstitution,
} from '@/lib/universityProgressionDirectory';

type CountryFilter='All'|ProgressionCountry;
type BodyFilter='All'|ProgressionBody;
const filterCountry:('All'|ProgressionCountry)[]=['All',...progressionCountries];
const filterBodies:BodyFilter[]=['All','OTHM','Qualifi'];
const routeCountry:Record<ProgressionCountry,string>={UK:'UK',USA:'USA',Canada:'Canada',Australia:'Australia'};
const statusLabel={university_confirmed_othm_route:'OTHM published university-confirmed arrangement',qualifi_published_progression:'Qualifi published progression listing'} as const;

export default function UniversityProgressionDirectory(){
 const [country,setCountry]=useState<CountryFilter>('All');
 const [body,setBody]=useState<BodyFilter>('All');
 const [search,setSearch]=useState('');
 const all=useMemo(()=>getProgressionInstitutions(),[]);
 const matches=useMemo(()=>{
  const q=search.toLowerCase().trim();
  return all
   .filter(u=>country==='All'||u.country===country)
   .map(u=>({...u,records:u.records.filter(r=>body==='All'||r.body===body)}))
   .filter(u=>u.records.length>0 && (!q||`${u.name} ${u.country} ${u.records.map(r=>r.route).join(' ')}`.toLowerCase().includes(q)));
 },[all,country,body,search]);
 const countryCount=(c:ProgressionCountry)=>all.filter(x=>x.country===c).length;
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/university-progression" title="OTHM & Qualifi University Progression Directory | UniPathway" description="Find named universities in the UK, USA and Australia appearing on OTHM and Qualifi progression lists, with private UniPathway eligibility guidance and no offsite links."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
   <header className="max-w-4xl">
    <p className="text-label text-success">University progression</p>
    <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Find universities that list OTHM or Qualifi progression routes.</h1>
    <p className="mt-4 text-muted-foreground">Explore named institutions from the awarding bodies' published progression listings. These are <strong>qualification- and degree-specific possibilities</strong>, not a blanket recognition of every diploma, an admissions offer, or evidence that UniPathway has a recruitment agreement with the institution.</p>
    <p className="mt-2 text-sm text-muted-foreground">Our internal catalogue snapshot was reviewed on {verifiedProgressionSnapshot}. As universities and agreements change, advisers must recheck current terms before individual recommendations.</p>
   </header>

   <section className="grid gap-4 sm:grid-cols-3" aria-label="Progression coverage">
    {[{country:'UK',label:'United Kingdom'}, {country:'USA',label:'United States'}, {country:'Australia',label:'Australia'}].map(x=><article key={x.country} className="rounded-xl border bg-card p-5">
      <GraduationCap className="size-6 text-success"/><p className="mt-3 text-2xl font-extrabold">{countryCount(x.country as ProgressionCountry)}</p><p className="mt-1 text-sm text-muted-foreground">Named institutions: {x.label}</p>
    </article>)}
   </section>

   <section className="space-y-5" aria-label="Search university progression listings">
    <div className="rounded-xl border bg-card p-5">
     <div className="flex flex-wrap gap-2" role="group" aria-label="Destination country">
      {filterCountry.map(x=><Button key={x} type="button" size="sm" variant={country===x?'default':'outline'} aria-pressed={country===x} onClick={()=>setCountry(x)}>{x==='All'?'All destinations':x}</Button>)}
     </div>
     <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_210px]">
      <label className="block text-sm font-medium" htmlFor="university-search"><Search className="mr-1 inline size-4"/>University, subject or award<Input id="university-search" className="mt-1" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Business, cyber security, university name…"/></label>
      <label className="block text-sm font-medium" htmlFor="awarding-body">Awarding body<select id="awarding-body" className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={body} onChange={e=>setBody(e.target.value as BodyFilter)}>
       {filterBodies.map(x=><option value={x} key={x}>{x==='All'?'OTHM and Qualifi':x}</option>)}
      </select></label>
     </div>
     <p className="mt-3 text-sm text-muted-foreground" role="status">{matches.length} named universities match your search.</p>
    </div>

    {country==='Canada'&&<div className="rounded-xl border bg-secondary/40 p-6">
      <ShieldCheck className="size-6 text-success"/><h2 className="mt-3 text-lg font-bold">Canada: qualification-specific review required</h2>
      <p className="mt-2 text-sm text-muted-foreground">The publicly named OTHM/Qualifi progression lists we reviewed did not identify a confirmed Canadian university route. This does <strong>not</strong> mean Canadian universities never evaluate these awards. We will only list an institution here after our admissions team has confirmed its current qualification- and course-specific position.</p>
      <Button asChild variant="outline" className="mt-4"><Link to="/contact">Ask about a Canadian university</Link></Button>
    </div>}

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="University progression institutions">
     {matches.map((university:ProgressionInstitution)=><article key={university.country+university.name} className="flex flex-col rounded-xl border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-success">{university.country}</p>
      <h2 className="mt-2 text-lg font-bold">{university.name}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{university.records.map(r=>r.body).join(' · ')} published route{university.records.length>1?'s':''}</p>
      <details className="mt-4 rounded-lg border bg-secondary/30 p-3">
       <summary className="cursor-pointer text-sm font-semibold">View progression details</summary>
       <div className="mt-3 space-y-4">
        {university.records.map(r=><div key={r.body} className="text-sm">
         <p className="font-semibold">{r.body}: {statusLabel[r.status]}</p>
         <p className="mt-1 text-muted-foreground">{r.route}</p>
         {r.institutionNote&&<p className="mt-2 text-xs font-semibold text-muted-foreground">{r.institutionNote}</p>}
        </div>)}
       </div>
      </details>
      <Button className="mt-auto pt-4" asChild variant="outline">
       <Link to={`/pathways?destination=${routeCountry[university.country]}&university=${encodeURIComponent(university.name)}&body=${university.records[0].body}`}>Check my eligibility <ArrowRight className="ml-1 size-4"/></Link>
      </Button>
     </article>)}
    </div>
    {matches.length===0&&country!=='Canada'&&<p className="rounded-xl border p-6 text-sm text-muted-foreground">No named routes match these filters. Try another qualification, subject or country, or request individual admissions guidance.</p>}
   </section>
   <section className="rounded-xl border bg-secondary/40 p-6">
    <Building2 className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Keep your university research inside UniPathway</h2>
    <p className="mt-3 max-w-4xl text-sm text-muted-foreground">Use each university’s details and internal eligibility request; we do not send visitors to other websites from these listings. UniPathway admissions can evaluate your exact OTHM or Qualifi award, units, grades, destination degree, delivery campus and evidence needed to seek a decision.</p>
    <p className="mt-3 text-xs text-muted-foreground">Source records are kept for internal staff verification. A source-list appearance is not our recruitment-agent accreditation, guaranteed Year 2/3 entry or a promise of U.S., Canadian, British or Australian credit.</p>
    <div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link to="/qualifications">Browse qualification options</Link></Button><Button asChild variant="outline"><Link to="/pathways">Compare overseas destinations</Link></Button></div>
   </section>
  </main><PublicFooter/>
 </div>;
}
