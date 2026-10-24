import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import GuardianResultSharing from '@/components/assessment/GuardianResultSharing';
import {GraduationCap,ShieldCheck} from 'lucide-react';
type Grade={attempt_id:string;brief_id:string;final_score:number;raw_score:number;penalty_points:number;published_feedback:string;released_at:string};
type Brief={id:string;title:string;policy_reference:string;assessment_type:string};
type Amendment={attempt_id:string;original_final_score:number;corrected_raw_score:number;corrected_final_score:number;corrected_feedback:string;recorded_at:string};
export default function StudentReleasedResults(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [grades,setGrades]=useState<Grade[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [amendments,setAmendments]=useState<Amendment[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('A verified enrolled student and tenant are required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [r,a]=await Promise.all([
    db.from('unipathway_assessment_released_results')
     .select('attempt_id,brief_id,final_score,raw_score,penalty_points,published_feedback,released_at')
     .eq('student_id',uid).eq('tenant_id',tenant).order('released_at',{ascending:false}).limit(250),
    db.from('unipathway_assessment_grade_amendments')
     .select('attempt_id,original_final_score,corrected_raw_score,corrected_final_score,corrected_feedback,recorded_at')
     .eq('student_id',uid).eq('tenant_id',tenant).limit(250)
   ]);
   if(r.error||a.error)throw Error(r.error?.message||a.error?.message);
   const list=(r.data||[]) as Grade[];setGrades(list);
   setAmendments((a.data||[]) as Amendment[]);
   if(!list.length){setBriefs([]);return;}
   const b=await db.from('unipathway_assessment_briefs')
    .select('id,title,policy_reference,assessment_type').in('id',[...new Set(list.map(x=>x.brief_id))]);
   if(b.error)throw Error(b.error.message);
   setBriefs((b.data||[]) as Brief[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load approved released results');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 return <DashboardLayout title="Approved Grades & Feedback" subtitle="Only independently marked, IQA-approved results released to your own account">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>No provisional grades are shown</h2>
   <p className="mt-2 text-sm text-muted-foreground">Only results from a separate authorised marker and IQA release appear here. Internal rubric scores and practice examinations do not automatically become official board results, external certificates, professional-body examination outcomes or university credit. Contact your centre for appeals under the applicable policy.</p>
   <div className="mt-3 flex flex-wrap gap-2">
    <Button variant="outline" size="sm" asChild><Link to="/student/assignments">My coursework and improvement guidance</Link></Button>
    <Button variant="outline" size="sm" asChild><Link to="/student/appeals">Submit or view an independent grade appeal</Link></Button>
   </div>
  </section>
  <GuardianResultSharing/>
  {loading&&<p role="status">Checking released results…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}. Private approved grades are not available unless verification succeeds.</p>}
  {!loading&&!error&&!grades.length&&<div className="rounded-xl border bg-card p-8 text-center"><GraduationCap className="mx-auto size-7 text-muted-foreground"/><h2 className="mt-3 font-semibold">No released scores yet</h2><p className="mt-2 text-sm text-muted-foreground">Coursework may still be awaiting an independent marker or quality approval. Provisional results are intentionally hidden.</p></div>}
  {!loading&&!error&&<div className="space-y-4">{grades.map(g=>{const correction=amendments.find(a=>a.attempt_id===g.attempt_id);
   return <article key={g.attempt_id} className="rounded-xl border bg-card p-5">
   <p className="text-xs font-semibold uppercase text-success">{briefs.find(b=>b.id===g.brief_id)?.assessment_type||'Assessment'}</p>
   <h2 className="mt-2 text-lg font-bold">{briefs.find(b=>b.id===g.brief_id)?.title||'Reviewed coursework'}</h2>
   <p className="mt-3 text-2xl font-bold">{correction?.corrected_final_score??g.final_score}/100 <span className="text-sm font-normal text-muted-foreground">internal assessment points {correction?'— independently amended':''}</span></p>
   <p className="mt-2 text-xs text-muted-foreground">Human score {correction?.corrected_raw_score??g.raw_score} · authorised resubmission deduction {g.penalty_points} · {briefs.find(b=>b.id===g.brief_id)?.policy_reference||'Approved policy'} · Released {new Date(g.released_at).toLocaleString()}</p>
   <section className="mt-4 rounded-lg bg-secondary/40 p-4"><h3 className="font-semibold">Approved individual feedback</h3><p className="mt-2 whitespace-pre-wrap text-sm">{correction?.corrected_feedback??g.published_feedback}</p></section>
   {correction&&<div className="mt-3 rounded-lg border p-3 text-xs text-muted-foreground"><strong>Immutable appeal audit:</strong> original final {correction.original_final_score}/100; corrected {correction.corrected_final_score}/100; signed on {new Date(correction.recorded_at).toLocaleString()}. <Link className="font-semibold underline" to="/student/appeals">Read independent decision</Link></div>}
  </article>})}</div>}
 </DashboardLayout>;
}
