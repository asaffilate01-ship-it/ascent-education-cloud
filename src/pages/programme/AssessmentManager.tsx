import {useCallback,useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {ShieldCheck,ClipboardList,Users,GraduationCap} from 'lucide-react';
type Brief={id:string;tenant_id:string;lecturer_id:string;module_id:string;title:string;status:string;policy_reference:string;max_attempts:number;penalty_points_per_resubmission:number;due_at:string};
type Criterion={brief_id:string;max_points:number;criterion_code:string};
type Attempt={id:string;student_id:string;brief_id:string;attempt_no:number;status:string;submitted_at:string};
type Allocation={attempt_id:string;marker_id:string;qa_reviewer_id:string};
type Role={user_id:string;role:string;tenant_id:string};
export default function AssessmentManager(){
 const {user}=useAuth();
 const [briefs,setBriefs]=useState<Brief[]>([]);const [criteria,setCriteria]=useState<Criterion[]>([]);
 const [attempts,setAttempts]=useState<Attempt[]>([]);const [allocations,setAllocations]=useState<Allocation[]>([]);
 const [staff,setStaff]=useState<Role[]>([]);
 const [marker,setMarker]=useState<Record<string,string>>({});
 const [qa,setQa]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');const [error,setError]=useState('');
 const tenant=user?.tenantId,uid=user?.id;
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('Approved centre management role and tenant are required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [b,r,a,al]=await Promise.all([
    db.from('unipathway_assessment_briefs').select('id,tenant_id,lecturer_id,module_id,title,status,policy_reference,max_attempts,penalty_points_per_resubmission,due_at').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(250),
    db.from('user_roles').select('user_id,role,tenant_id').eq('tenant_id',tenant).in('role',['assessor','iqa_officer']),
    db.from('unipathway_assessment_attempts').select('id,student_id,brief_id,attempt_no,status,submitted_at').eq('tenant_id',tenant).order('submitted_at',{ascending:false}).limit(300),
    db.from('unipathway_assessment_allocations').select('attempt_id,marker_id,qa_reviewer_id').eq('tenant_id',tenant)
   ]);
   const fail=[b,r,a,al].find(x=>x.error);
   if(fail)throw Error(fail.error.message);
   const all=(b.data||[]) as Brief[];setBriefs(all);setStaff((r.data||[]) as Role[]);
   setAttempts((a.data||[]) as Attempt[]);setAllocations((al.data||[]) as Allocation[]);
   if(all.length){
    const rubrics=await db.from('unipathway_assessment_criteria').select('brief_id,max_points,criterion_code').in('brief_id',all.map(x=>x.id));
    if(rubrics.error)throw Error(rubrics.error.message);
    setCriteria((rubrics.data||[]) as Criterion[]);
   }else setCriteria([]);
  }catch(e){setError(e instanceof Error?e.message:'Could not load independent assessment controls');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const approve=async(b:Brief)=>{
  if(!window.confirm('Publish this assessment with its frozen rubric, teaching standards, resubmission window and penalty policy?'))return;
  setBusy(b.id);
  const {error:e}=await db.rpc('publish_unipathway_assessment_brief',{p_brief:b.id});
  setBusy('');
  if(e)return toast.error('Approval blocked: '+e.message);
  toast.success('Assessment and criteria published for enrolled students.');await load();
 };
 const allocate=async(a:Attempt)=>{
  const b=briefs.find(x=>x.id===a.brief_id);
  const markerId=marker[a.id],qualityId=qa[a.id];
  if(!b||!markerId||!qualityId||markerId===qualityId||markerId===b.lecturer_id||qualityId===b.lecturer_id){
   toast.error('Allocate a qualified assessor and a different IQA, neither of whom is the teaching lecturer.');return;
  }
  setBusy(a.id);
  const {error:e}=await db.rpc('allocate_unipathway_independent_marker',{
   p_attempt:a.id,p_marker:markerId,p_quality_reviewer:qualityId
  });
  setBusy('');
  if(e)return toast.error('Independent allocation rejected: '+e.message);
  toast.success('Separate assessor and IQA allocated to this submission.');await load();
 };
 const waiting=useMemo(()=>attempts.filter(a=>a.status==='submitted'&&!allocations.some(x=>x.attempt_id===a.id)),[attempts,allocations]);
 const pending=briefs.filter(b=>b.status==='draft');
 const assessors=[...new Set(staff.filter(x=>x.role==='assessor').map(x=>x.user_id))];
 const reviewers=[...new Set(staff.filter(x=>x.role==='iqa_officer').map(x=>x.user_id))];
 return <DashboardLayout title="Assessment Management and Marker Allocation" subtitle="Separate the teaching lecturer, independent marker and independent IQA approval">
  <div className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Three independent responsibilities</h2>
   <p className="mt-2 text-sm text-muted-foreground">Lecturers supply progress and learning outcomes; programme leadership approves curriculum and the written marking policy; an allocated assessor marks; a different IQA approves. Omniqora analysis remains advisory. Students receive no provisional mark.</p>
  </div>
  {loading&&<p role="status">Checking assessment briefs and role-scoped submissions…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}</p>}
  {!loading&&!error&&<div className="space-y-7">
   <div className="grid gap-3 md:grid-cols-3">
    <div className="rounded-xl border bg-card p-4"><GraduationCap className="size-5 text-success"/><p className="mt-2 text-sm">Draft briefs</p><strong className="text-2xl">{pending.length}</strong></div>
    <div className="rounded-xl border bg-card p-4"><Users className="size-5 text-success"/><p className="mt-2 text-sm">Awaiting independent allocation</p><strong className="text-2xl">{waiting.length}</strong></div>
    <div className="rounded-xl border bg-card p-4"><ClipboardList className="size-5 text-success"/><p className="mt-2 text-sm">Active assessor allocations</p><strong className="text-2xl">{allocations.length}</strong></div>
   </div>
   <section className="rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Approve lecturer briefs and marking rubrics</h2>
    <div className="mt-3 space-y-3">{briefs.map(b=>{const r=criteria.filter(c=>c.brief_id===b.id),total=r.reduce((n,c)=>n+Number(c.max_points),0);
     return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4" key={b.id}>
      <div><p className="font-semibold">{b.title}</p><p className="mt-1 text-xs text-muted-foreground">{b.status} · rubric {total}/100 across {r.length} criteria · {b.max_attempts} attempts · {b.penalty_points_per_resubmission} point penalty · {b.policy_reference}</p></div>
      {b.status==='draft'&&<Button disabled={!!busy||r.length<2||total!==100} size="sm" onClick={()=>approve(b)}>Approve and publish</Button>}
     </div>;
    })}{!briefs.length&&<p className="text-sm text-muted-foreground">No lecturer-authored briefs exist for this tenant.</p>}</div>
   </section>
   <section className="rounded-xl border bg-card p-5">
    <h2 className="text-lg font-semibold">Allocate external-to-teaching human assessment</h2>
    <p className="mt-2 text-sm text-muted-foreground">Allocation is based on centrally verified roles. A lecturer cannot mark their own module assignment, and the marker cannot approve their own mark. Avoid conflict of interest or personal relationships and use blind review where appropriate.</p>
    {!assessors.length||!reviewers.length?<p role="alert" className="mt-3 rounded-lg border border-warning p-3 text-sm">No eligible assessor or QA roles are verified in this centre. Assign authorised staff roles first.</p>:null}
    <div className="mt-3 space-y-3">{waiting.map(a=>{const b=briefs.find(x=>x.id===a.brief_id);
     const eligibleMarkers=assessors.filter(id=>id!==b?.lecturer_id&&id!==a.student_id);
     const eligibleReviewers=reviewers.filter(id=>id!==b?.lecturer_id&&id!==a.student_id&&id!==marker[a.id]);
     return <article key={a.id} className="rounded-lg border p-4">
      <p className="font-semibold">{b?.title||'Assignment'} · attempt {a.attempt_no}</p>
      <p className="mt-1 text-xs text-muted-foreground">Student ref: {a.student_id.slice(0,8)} · received {new Date(a.submitted_at).toLocaleString()}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
       <label className="text-sm font-semibold">Separate human assessor<select aria-label="Independent assessor" className="mt-1 w-full rounded border bg-background p-2" value={marker[a.id]||''} onChange={e=>setMarker(p=>({...p,[a.id]:e.target.value}))}>
        <option value="">Select approved assessor</option>{eligibleMarkers.map(id=><option key={id} value={id}>Assessor {id.slice(0,8)}</option>)}</select></label>
       <label className="text-sm font-semibold">Different IQA verifier<select aria-label="IQA reviewer" className="mt-1 w-full rounded border bg-background p-2" value={qa[a.id]||''} onChange={e=>setQa(p=>({...p,[a.id]:e.target.value}))}>
        <option value="">Select approved quality reviewer</option>{eligibleReviewers.map(id=><option key={id} value={id}>IQA {id.slice(0,8)}</option>)}</select></label>
      </div>
      <Button className="mt-3" size="sm" disabled={!!busy||!marker[a.id]||!qa[a.id]} onClick={()=>allocate(a)}>Allocate marking and QA</Button>
     </article>;})}
     {!waiting.length&&<p className="text-sm text-muted-foreground">All submitted coursework attempts are allocated or the submission queue is empty.</p>}
    </div>
   </section>
  </div>}
 </DashboardLayout>;
}
