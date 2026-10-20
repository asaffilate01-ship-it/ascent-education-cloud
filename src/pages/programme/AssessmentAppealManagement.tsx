import {useCallback,useEffect,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {ClipboardCheck,ShieldCheck} from 'lucide-react';
type Brief={id:string;lecturer_id:string;title:string;status:string};
type Policy={brief_id:string;window_days:number;policy_reference:string;approved_at:string};
type Appeal={id:string;attempt_id:string;brief_id:string;student_id:string;reviewer_id:string|null;status:string;grounds:string;details:string;requested_at:string};
type Review={appeal_id:string;reviewer_id:string;recommendation:string;proposed_raw_score:number|null;reasoning:string;proposed_feedback:string|null};
type Released={attempt_id:string;released_by:string;raw_score:number;final_score:number;penalty_points:number};
type Mark={attempt_id:string;marker_id:string};
type Role={user_id:string;role:string;tenant_id:string};
export default function AssessmentAppealManagement(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [briefs,setBriefs]=useState<Brief[]>([]);const [policies,setPolicies]=useState<Policy[]>([]);
 const [appeals,setAppeals]=useState<Appeal[]>([]);const [reviews,setReviews]=useState<Review[]>([]);
 const [releases,setReleases]=useState<Released[]>([]);const [marks,setMarks]=useState<Mark[]>([]);
 const [roles,setRoles]=useState<Role[]>([]);
 const [days,setDays]=useState<Record<string,string>>({});
 const [ref,setRef]=useState<Record<string,string>>({});
 const [chosenReviewer,setChosenReviewer]=useState<Record<string,string>>({});
 const [finalReasons,setFinalReasons]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState('');const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const canSign=!!user?.roles.includes('centre_director');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('Verified programme manager and centre tenant required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [b,p,a,rev,r,m,u]=await Promise.all([
    db.from('unipathway_assessment_briefs').select('id,lecturer_id,title,status').eq('tenant_id',tenant).eq('status','published').order('created_at',{ascending:false}).limit(300),
    db.from('unipathway_assessment_appeal_policies').select('brief_id,window_days,policy_reference,approved_at').eq('tenant_id',tenant),
    db.from('unipathway_assessment_appeals').select('id,attempt_id,brief_id,student_id,reviewer_id,status,grounds,details,requested_at').eq('tenant_id',tenant).order('requested_at',{ascending:false}).limit(300),
    db.from('unipathway_assessment_appeal_reviews').select('appeal_id,reviewer_id,recommendation,proposed_raw_score,reasoning,proposed_feedback').eq('tenant_id',tenant),
    db.from('unipathway_assessment_released_results').select('attempt_id,released_by,raw_score,final_score,penalty_points').eq('tenant_id',tenant),
    db.from('unipathway_assessment_human_marks').select('attempt_id,marker_id').eq('tenant_id',tenant),
    db.from('user_roles').select('user_id,role,tenant_id').eq('tenant_id',tenant).eq('role','iqa_officer')
   ]);
   const bad=[b,p,a,rev,r,m,u].find(x=>x.error);if(bad)throw Error(bad.error.message);
   setBriefs((b.data||[]) as Brief[]);setPolicies((p.data||[]) as Policy[]);
   setAppeals((a.data||[]) as Appeal[]);setReviews((rev.data||[]) as Review[]);
   setReleases((r.data||[]) as Released[]);setMarks((m.data||[]) as Mark[]);
   setRoles((u.data||[]) as Role[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load private appeal management');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const savePolicy=async(b:Brief)=>{
  const d=Number(days[b.id]||0),value=(ref[b.id]||'').trim();
  if(!Number.isInteger(d)||d<1||d>90||value.length<8){toast.error('Choose the correct, formally approved appeal window and policy reference.');return;}
  if(!window.confirm('Record this qualification-specific appeal rule? It is immutable after released grades.'))return;
  setBusy(b.id);
  const {error:e}=await db.rpc('approve_unipathway_appeal_policy',{p_brief:b.id,p_days:d,p_policy:value});
  setBusy('');
  if(e){toast.error('Policy could not be approved: '+e.message);return;}
  toast.success('Approved appeal policy recorded.');await load();
 };
 const allocate=async(a:Appeal)=>{
  const reviewer=chosenReviewer[a.id];
  if(!reviewer){toast.error('Select an independent second IQA reviewer');return;}
  setBusy(a.id);
  const {error:e}=await db.rpc('assign_unipathway_appeal_reviewer',{p_appeal:a.id,p_reviewer:reviewer});
  setBusy('');
  if(e){toast.error('Reviewer allocation denied: '+e.message);return;}
  toast.success('Separate appeal reviewer allocated.');await load();
 };
 const finalize=async(a:Appeal,accept:boolean)=>{
  const reason=(finalReasons[a.id]||'').trim();
  if(reason.length<60){toast.error('A recorded independent director decision needs at least 60 characters.');return;}
  if(!window.confirm(accept?'Approve the independent appeal recommendation? A correction will be logged as a separate immutable amendment.':'Refer this recommendation for further review without altering the original result?'))return;
  setBusy(a.id);
  const {error:e}=await db.rpc('finalise_unipathway_grade_appeal',{
   p_appeal:a.id,p_accept:accept,p_reasoning:reason
  });setBusy('');
  if(e){toast.error('Independent sign-off rejected: '+e.message);return;}
  toast.success(accept?'Signed appeal outcome recorded.':'Appeal referred without changing the original result.');
  await load();
 };
 return <DashboardLayout title="Independent Appeals Management" subtitle="Qualification appeal policies, conflict-free reviewer allocation and centre-director sign-off">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Fairness and separation of duties</h2>
   <p className="mt-2 text-sm text-muted-foreground">Set the approved appeals window before releasing results. Allocate a second qualified IQA who did not teach, mark or originally approve the work. An independent centre director confirms the recommendation. Original marks remain in the permanent record.</p>
  </section>
  {loading&&<p role="status">Checking published briefs and private appeal records…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. This tool requires the appeals schema and protected centre permissions.</p>}
  {!loading&&!error&&<div className="space-y-7">
   <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Set approved qualification appeal rules</h2>
    <p className="mt-2 text-xs text-muted-foreground">Only enter deadlines explicitly supported by the approved centre or awarding-body policy. Never apply a default to every qualification.</p>
    <div className="mt-3 space-y-3">{briefs.map(b=>{
     const approved=policies.find(p=>p.brief_id===b.id);
     const hasReleased=releases.some(r=>appeals.some(a=>a.attempt_id===r.attempt_id&&a.brief_id===b.id));
     return <div key={b.id} className="rounded-lg border p-4"><h3 className="font-semibold text-sm">{b.title}</h3>
      {approved?<p className="mt-2 text-xs text-muted-foreground">{approved.policy_reference} · {approved.window_days} days · Approved {new Date(approved.approved_at).toLocaleDateString()}</p>:
       <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
        <label className="text-xs font-semibold">Appeal days<Input className="mt-1" type="number" min="1" max="90" value={days[b.id]||''} onChange={e=>setDays(p=>({...p,[b.id]:e.target.value}))}/></label>
        <label className="text-xs font-semibold">Signed policy reference<Input className="mt-1" maxLength={240} value={ref[b.id]||''} onChange={e=>setRef(p=>({...p,[b.id]:e.target.value}))}/></label>
        <Button className="self-end" size="sm" disabled={!!busy||hasReleased} onClick={()=>savePolicy(b)}>Approve policy</Button>
       </div>}
     </div>;
    })}{!briefs.length&&<p className="text-sm text-muted-foreground">No published coursework briefs are available.</p>}</div>
   </section>
   <section className="space-y-3"><h2 className="text-xl font-semibold">Appeal queue ({appeals.length})</h2>
    {!appeals.length&&<p className="rounded-lg border p-4 text-sm text-muted-foreground">No formal appeals have been lodged.</p>}
    {appeals.map(a=>{
     const b=briefs.find(x=>x.id===a.brief_id);
     const original=releases.find(x=>x.attempt_id===a.attempt_id);
     const marker=marks.find(x=>x.attempt_id===a.attempt_id);
     const review=reviews.find(x=>x.appeal_id===a.id);
     const reviewers=[...new Set(roles.map(x=>x.user_id))].filter(id=>id!==b?.lecturer_id&&id!==a.student_id&&id!==original?.released_by&&id!==marker?.marker_id&&id!==uid);
     return <article key={a.id} className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div>
       <h3 className="font-semibold">{b?.title||'Coursework'} — {a.grounds.replace(/_/g,' ')}</h3>
       <p className="mt-1 text-xs text-muted-foreground">Appeal {a.id.slice(0,8)} · student {a.student_id.slice(0,8)} · {a.status} · original {original?.final_score??'—'}/100</p></div></div>
      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-secondary/40 p-3 text-sm">{a.details}</p>
      {a.status==='submitted'&&<div className="mt-3 flex flex-wrap items-end gap-2">
       <label className="min-w-56 flex-1 text-sm font-semibold">Independent second IQA reviewer<select className="mt-1 w-full rounded-md border bg-background p-2" value={chosenReviewer[a.id]||''} onChange={e=>setChosenReviewer(p=>({...p,[a.id]:e.target.value}))}>
        <option value="">Select verified second reviewer</option>{reviewers.map(id=><option key={id} value={id}>IQA {id.slice(0,8)}</option>)}</select></label>
       <Button size="sm" disabled={!!busy||!chosenReviewer[a.id]} onClick={()=>allocate(a)}>Allocate reviewer</Button>
      </div>}
      {a.status==='under_review'&&<p className="mt-3 text-sm text-muted-foreground">Assigned to {a.reviewer_id?.slice(0,8)} for independent evidence review.</p>}
      {review&&<div className="mt-3 rounded-lg border p-3 text-sm">
       <p className="font-semibold">Reviewer recommendation: {review.recommendation}</p>
       {review.proposed_raw_score!==null&&<p className="mt-1">Proposed raw rubric score: {review.proposed_raw_score}/100 (original penalty retained)</p>}
       <p className="mt-2 whitespace-pre-wrap">{review.reasoning}</p>
      </div>}
      {a.status==='recommendation'&&<div className="mt-4 space-y-2 border-t pt-3">
       {!canSign?<p className="text-sm text-muted-foreground">The separately authorised centre director must sign the final outcome.</p>:<>
        <label className="block text-sm font-semibold">Independent director's signed decision rationale<Textarea className="mt-1" rows={3} maxLength={6000} value={finalReasons[a.id]||''} onChange={e=>setFinalReasons(p=>({...p,[a.id]:e.target.value}))}/></label>
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!!busy||(finalReasons[a.id]||'').trim().length<60} onClick={()=>finalize(a,true)}>Approve independent outcome</Button>
         <Button variant="outline" size="sm" disabled={!!busy||(finalReasons[a.id]||'').trim().length<60} onClick={()=>finalize(a,false)}>Refer for further review</Button></div>
       </>}
      </div>}
     </article>;
    })}
   </section>
  </div>}
 </DashboardLayout>;
}
