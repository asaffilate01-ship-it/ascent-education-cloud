import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {verifiedProgressionSnapshot,type ProgressionInstitution} from '@/lib/universityProgressionDirectory';
import {universityResearchKey,MAX_SHORTLIST} from '@/lib/universityShortlist';

const destinations={UK:'uk',USA:'usa',Australia:'australia',Canada:'canada'} as const;
export default function UniversityResearchComparison({universities,onRemove,onClear}:{universities:ProgressionInstitution[];onRemove:(key:string)=>void;onClear:()=>void}){
 return <section id="university-shortlist" aria-labelledby="university-shortlist-title" className="scroll-mt-28 rounded-2xl border bg-card p-5 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="university-shortlist-title" className="text-xl font-bold">Your university research shortlist</h2><p role="status" className="mt-1 text-sm text-muted-foreground">{universities.length} of {MAX_SHORTLIST} selected</p></div>{universities.length>0&&<Button type="button" variant="outline" onClick={onClear}>Clear shortlist</Button>}</div>
  <p className="mt-3 text-sm text-muted-foreground">Choose up to three institutions. Your choices remain when filters change and are held only in this page session. Compare published research records, not confirmed offers, tuition quotes or visa outcomes.</p>
  {!universities.length?<p className="mt-4 rounded-lg border border-dashed p-4 text-sm">Use the shortlist button on a university card below to begin.</p>:<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {universities.map(u=><article key={universityResearchKey(u)} className="flex min-w-0 flex-col rounded-xl border p-4 [overflow-wrap:anywhere]">
    <p className="text-xs font-bold uppercase tracking-wide text-success">{u.country}</p><h3 className="mt-2 text-lg font-bold">{u.name}</h3>
    <dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold">Awarding body listings</dt><dd className="mt-1 text-muted-foreground">{[...new Set(u.records.map(r=>r.body))].join(' · ')}</dd></div><div><dt className="font-semibold">Published route details</dt><dd className="mt-2 space-y-3">{u.records.map((r,i)=><div key={r.body+':'+i} className="rounded-md bg-muted/40 p-3"><p className="font-semibold">{r.body} · {r.status==='university_confirmed_othm_route'?'Published university-confirmed arrangement':'Published progression listing'}</p><p className="mt-1 text-muted-foreground">{r.route}</p>{r.institutionNote&&<p className="mt-2 text-xs font-medium">{r.institutionNote}</p>}</div>)}</dd></div><div><dt className="font-semibold">Still to verify</dt><dd className="mt-1 text-muted-foreground">Exact degree, campus, entry level, transfer credit, teaching language, intake, tuition and eligibility.</dd></div></dl>
    <div className="mt-auto flex flex-wrap gap-2 pt-4"><Button asChild variant="outline"><Link to={'/consultation?destination='+destinations[u.country]}>Request guidance</Link></Button><Button type="button" variant="outline" onClick={()=>onRemove(universityResearchKey(u))} aria-label={'Remove '+u.name+' ('+u.country+') from shortlist'}>Remove</Button></div>
   </article>)}
  </div>}
  <p className="mt-4 text-xs text-muted-foreground">Showing full directory records for selected institutions, regardless of active search filters. Catalogue snapshot: {verifiedProgressionSnapshot}. Verify each route before applying or paying.</p>
 </section>;
}
