import ModuleJourney from '@/components/assessment/ModuleJourney';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {pagedRows,rowsByIds} from '@/lib/pagedRows';
import {Button} from '@/components/ui/button';
import GuardianResultSharing from '@/components/assessment/GuardianResultSharing';
import {GraduationCap,ShieldCheck} from 'lucide-react';
type Grade={attempt_id:string;brief_id:string;final_score:number;raw_score:number;penalty_points:number;published_feedback:string;released_at:string};
type Brief={module_id:string;id:string;title:string;policy_reference:string;assessment_type:string};
type Amendment={attempt_id:string;original_final_score:number;corrected_raw_score:number;corrected_final_score:number;corrected_feedback:string;recorded_at:string};
export default function StudentReleasedResults(){const {user}=useAuth();const [params]=useSearchParams();return <ResultsWorkspace key={`${user?.id}:${user?.tenantId}:${params.get('module')}`}/>;}
function ResultsWorkspace(){
 const [params]=useSearchParams();const moduleId=params.get('module');
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [grades,setGrades]=useState<Grade[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [amendments,setAmendments]=useState<Amendment[]>([]);
 const generation=useRef(0);
 const [search,setSearch]=useState(''),[page,setPage]=useState(0);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const load=useCallback(async()=>{
  const token=++generation.current,current=()=>token===generation.current;
  setLoading(true);setError('');setGrades([]);setBriefs([]);setAmendments([]);setPage(0);
  try{
   if(!uid||!tenant)throw Error('A verified student and centre are required.');
   const [r,a]=await Promise.all([
    pagedRows<Grade>(()=>db.from('unipathway_assessment_released_results')
     .select('attempt_id,brief_id,final_score,raw_score,penalty_points,published_feedback,released_at')
     .eq('student_id',uid).eq('tenant_id',tenant),current,'attempt_id'),
    pagedRows<Amendment>(()=>db.from('unipathway_assessment_grade_amendments')
     .select('attempt_id,original_final_score,corrected_raw_score,corrected_final_score,corrected_feedback,recorded_at')
     .eq('student_id',uid).eq('tenant_id',tenant),current,'attempt_id')
   ]);
   const b=await rowsByIds<Brief>(r.map(x=>x.brief_id),ids=>()=>db.from('unipathway_assessment_briefs')
    .select('id,module_id,title,policy_reference,assessment_type').eq('tenant_id',tenant).in('id',ids),current);
   if(current()){setGrades(r.sort((x,y)=>y.released_at.localeCompare(x.released_at)||x.attempt_id.localeCompare(y.attempt_id)));setAmendments(a);setBriefs(b);}
  }catch{if(current()){setGrades([]);setAmendments([]);setBriefs([]);setError('Released results could not be verified. Refresh to retry.');}}
  finally{if(current())setLoading(false);}
 },[uid,tenant]);
 const invalidate=useCallback(()=>{generation.current++;},[]);
 useEffect(()=>{void load();return invalidate;},[load,invalidate]);
 const visible=grades.filter(g=>{
  const brief=briefs.find(b=>b.id===g.brief_id);
  return (!moduleId||brief?.module_id===moduleId)&&`${brief?.title||'Reviewed coursework'} ${brief?.assessment_type||''} ${g.attempt_id}`.toLowerCase().includes(search.toLowerCase());
 });
 return <DashboardLayout title="Approved Grades & Feedback" subtitle="Only independently marked, IQA-approved results released to your own account">
  <ModuleJourney moduleId={moduleId||undefined}/>
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>No provisional grades are shown</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only results from a separate authorised marker and IQA release appear here. Internal rubric scores and practice examinations do not automatically become official board results, external certificates, professional-body examination outcomes or university credit. Contact your centre for appeals under the applicable policy.</p>
   <div className="mt-3 flex flex-wrap gap-2">
    <Button variant="outline" size="sm" asChild><Link to={moduleId?`/student/assignments?module=${encodeURIComponent(moduleId)}`:"/student/assignments"}>My coursework and improvement guidance</Link></Button>
    <Button variant="outline" size="sm" asChild><Link to="/student/appeals">Submit or view an independent grade appeal</Link></Button>
   </div>
  </section>
  <GuardianResultSharing/>
  <div className="my-4 flex flex-wrap items-end gap-3"><label className="text-sm">Search released results<input className="mt-1 block rounded border bg-background p-2" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Assessment or attempt reference"/></label><Button variant="outline" disabled={loading} onClick={()=>void load()}>Refresh results</Button></div>
  {loading&&<p role="status">Checking released results…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}. Private approved grades are not available unless verification succeeds.</p>}
  {!loading&&!error&&!visible.length&&<div className="rounded-xl border bg-card p-8 text-center"><GraduationCap className="mx-auto size-7 text-muted-foreground"/><h2 className="mt-3 font-semibold">{search?'No matching released scores':'No released scores yet'}</h2><p className="mt-2 text-sm text-muted-foreground">Coursework may still be awaiting an independent marker or quality approval. Provisional results are intentionally hidden.</p></div>}
  {!loading&&!error&&<div className="space-y-4">{visible.slice(page*20,page*20+20).map(g=>{const correction=amendments.find(a=>a.attempt_id===g.attempt_id);
   return <article key={g.attempt_id} className="rounded-xl border bg-card p-5">
   <p className="text-xs font-semibold uppercase text-success">{briefs.find(b=>b.id===g.brief_id)?.assessment_type||'Assessment'}</p>
   <h2 className="mt-2 text-lg font-bold">{briefs.find(b=>b.id===g.brief_id)?.title||'Reviewed coursework'}</h2>
   <p className="mt-3 text-2xl font-bold">{correction?.corrected_final_score??g.final_score}/100 <span className="text-sm font-normal text-muted-foreground">internal assessment points {correction?'— independently amended':''}</span></p>
   <p className="mt-2 text-xs text-muted-foreground">Human score {correction?.corrected_raw_score??g.raw_score} · authorised resubmission deduction {g.penalty_points} · {briefs.find(b=>b.id===g.brief_id)?.policy_reference||'Approved policy'} · Released {new Date(g.released_at).toLocaleString()}</p>
   <section className="mt-4 rounded-lg bg-secondary/40 p-4"><h3 className="font-semibold">Approved individual feedback</h3><p className="mt-2 whitespace-pre-wrap text-sm">{correction?.corrected_feedback??g.published_feedback}</p></section>
   {correction&&<div className="mt-3 rounded-lg border p-3 text-xs text-muted-foreground"><strong>Immutable appeal audit:</strong> original final {correction.original_final_score}/100; corrected {correction.corrected_final_score}/100; signed on {new Date(correction.recorded_at).toLocaleString()}. <Link className="font-semibold underline" to="/student/appeals">Read independent decision</Link></div>}
  </article>})}</div>}
  {!loading&&!error&&visible.length>20&&<nav aria-label="Result pages" className="mt-4 flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous results</Button><span>Page {page+1} of {Math.ceil(visible.length/20)} · {visible.length} results</span><Button variant="outline" disabled={(page+1)*20>=visible.length} onClick={()=>setPage(p=>p+1)}>Next results</Button></nav>}
 </DashboardLayout>;
}
