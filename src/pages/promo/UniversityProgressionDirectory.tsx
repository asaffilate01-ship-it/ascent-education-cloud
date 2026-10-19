import {useMemo,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowRight,BookOpenCheck,GraduationCap,Landmark,Search,ShieldCheck} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  canadaProgressionStatus,filterProgressionUniversities,progressionCountries,
  universityProgressionDirectory,type ProgressionBody,type ProgressionCountry,
} from '@/lib/universityProgressionDirectory';

type CountrySelection=ProgressionCountry|'All';
type BodySelection=ProgressionBody|'All';
const bodies:BodySelection[]=['All','OTHM','Qualifi'];

export default function UniversityProgressionDirectory(){
 const [params,setParams]=useSearchParams();
 const paramCountry=params.get('country');
 const selectedCountry:CountrySelection=progressionCountries.includes(paramCountry as ProgressionCountry)?paramCountry as ProgressionCountry:'All';
 const paramBody=params.get('body');
 const selectedBody:BodySelection=paramBody==='OTHM'||paramBody==='Qualifi'?paramBody:'All';
 const [search,setSearch]=useState('');
 const results=useMemo(()=>filterProgressionUniversities({country:selectedCountry,body:selectedBody,search}),[search,selectedBody,selectedCountry]);
 const setFilter=(key:'body'|'country',value:string)=>{
   const next=new URLSearchParams(params);
   if(value==='All')next.delete(key);else next.set(key,value);
   setParams(next,{replace:true});
 };
 const countries=[{id:'All',name:'All published routes'},...progressionCountries.map(id=>({id,name:id==='UK'?'United Kingdom':id==='USA'?'United States':id}))];
 return <div className="public-site min-h-dvh bg-background">
  <Seo canonical="/university-progression" title="OTHM & Qualifi University Progression Directory | UniPathway" description="Find named OTHM and Qualifi progression universities in the UK, USA and Australia, with careful explanations about qualification eligibility and individual admissions."/>
  <PublicNav/>
  <main className="mx-auto max-w-7xl space-y-10 px-5 py-12 sm:px-8">
   <header className="max-w-4xl">
    <p className="text-label text-success">UK & International Qualification Progression</p>
    <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">Explore universities with published OTHM or Qualifi progression routes.</h1>
    <p className="mt-5 text-muted-foreground">Compare the named institutions from OTHM and Qualifi’s published university progression lists. Choose a country and awarding body, then ask UniPathway to assess how your exact completed qualification, grades and modules may match an available degree route.</p>
    <p className="mt-3 text-sm text-muted-foreground">These are awarding-body listings, <strong>not UniPathway university partnership agreements</strong>. A university may recognise only certain qualifications, courses, campuses or progression years. Inclusion does not guarantee admission, credit transfer or student sponsorship.</p>
   </header>
   <section aria-label="University directory filters" className="rounded-2xl border bg-card p-5">
    <div className="grid gap-4 sm:grid-cols-[1fr_190px]">
     <label htmlFor="university-name-search" className="block text-sm font-semibold"><Search className="mr-1 inline size-4"/>Find an institution or qualification area<Input id="university-name-search" className="mt-1" placeholder="Search Bangor, business, cyber or accounting" value={search} onChange={e=>setSearch(e.target.value)} autoComplete="off"/></label>
     <label htmlFor="university-awarder" className="block text-sm font-semibold">Awarding body<select id="university-awarder" className="mt-1 block h-10 w-full rounded-md border bg-background px-3" value={selectedBody} onChange={e=>setFilter('body',e.target.value)}>{bodies.map(b=><option key={b} value={b}>{b==='All'?'Both bodies':b}</option>)}</select></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter universities by country" role="group">
     {countries.map(c=><Button type="button" size="sm" key={c.id} variant={selectedCountry===c.id?'default':'outline'} aria-pressed={selectedCountry===c.id} onClick={()=>setFilter('country',c.id)}>{c.name}</Button>)}
    </div>
    <p role="status" className="mt-4 text-sm text-muted-foreground">{results.length} listed universities match your filters.</p>
   </section>
   {selectedCountry==='Canada'&&<section className="rounded-xl border bg-secondary/40 p-6" aria-label="Canada university progression">
     <ShieldCheck className="size-7 text-success"/><h2 className="mt-3 text-xl font-bold">Canadian qualification review remains available</h2>
     <p className="mt-2 text-sm text-muted-foreground">{canadaProgressionStatus}</p>
     <Button className="mt-4" variant="outline" asChild><Link to="/canada">Explore Canadian university entry requirements <ArrowRight className="ml-2 size-4"/></Link></Button>
    </section>}
   <section aria-label="University progression results" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {results.map(u=><article key={u.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-sm">
      <Landmark className="size-6 text-success"/><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-success">{u.country==='UK'?'United Kingdom':u.country==='USA'?'United States':u.country}</p>
      <h2 className="mt-2 text-lg font-bold">{u.name}</h2>
      <div className="mt-3 flex flex-wrap gap-2">{u.bodies.map(body=><span key={body} className="rounded-full border bg-secondary px-3 py-1 text-xs font-semibold">{body}</span>)}</div>
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">{u.bodies.map(body=><p key={body}><span className="font-semibold text-foreground">{body}:</span> {u.bodyNotes[body]}</p>)}</div>
      <div className="mt-auto border-t pt-4">
       <p className="text-xs text-muted-foreground">Last directory review: {u.lastReviewedOn}. Institution-specific admission conditions must be rechecked before applying.</p>
       <Button asChild size="sm" variant="outline" className="mt-3"><Link to={`/pathways?destination=${encodeURIComponent(u.country)}&university=${encodeURIComponent(u.name)}`}>Discuss this university <ArrowRight className="ml-1 size-4"/></Link></Button>
      </div>
    </article>)}
    {results.length===0&&selectedCountry!=='Canada'&&<p className="col-span-full rounded-xl border bg-card p-6 text-muted-foreground">No named university matched this selection. Try a different awarding body, country or search term.</p>}
   </section>
   <section className="rounded-xl border bg-secondary/40 p-6 sm:p-8"><BookOpenCheck className="size-7 text-success"/><h2 className="mt-3 text-2xl font-bold">Your exact diploma matters</h2><p className="mt-2 max-w-4xl text-sm leading-relaxed text-muted-foreground">A Level 3, Level 4, Level 5 or Level 7 award can have different entry options. For example, OTHM publishes qualification-specific programmes at named universities, while the general Qualifi list names institutions with progression paths without specifying that every university accepts every qualification. UniPathway can help review the awarding-body certificate, qualification reference, unit transcript, credits and the university’s current entry requirements.</p><div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/qualifications">Explore diploma options <GraduationCap className="ml-2 size-4"/></Link></Button><Button asChild variant="outline"><Link to="/contact">Talk to the progression team</Link></Button></div></section>
   <p className="text-xs text-muted-foreground">The public directory is intentionally self-contained: university cards keep you on UniPathway. Official awarding-body references are retained for staff verification rather than linked here.</p>
  </main><PublicFooter/>
 </div>;
}
