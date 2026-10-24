import {useCallback,useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,ClipboardCheck,Clock,ShieldCheck,RotateCcw} from 'lucide-react';
type Module={id:string;title:string;programme_id:string};
type Brief={id:string;module_id:string;title:string;assessment_type:string;
 teaching_summary:string;learning_outcomes:string;student_expectations:string;required_evidence:string;
 due_at:string;submission_cutoff:string;max_attempts:number;penalty_points_per_resubmission:number;
 policy_reference:string;rubric_version:string};
type Criterion={id:string;brief_id:string;criterion_code:string;learning_outcome:string;criterion_description:string;scoring_guidance:string;max_points:number;display_order:number};
type Attempt={id:string;brief_id:string;attempt_no:number;status:string;submitted_at:string;resubmission_guidance:string|null;guidance_at:string|null;evidence_text:string};
type Released={attempt_id:string;brief_id:string;student_id:string;final_score:number;raw_score:number;penalty_points:number;published_feedback:string;released_at:string};
export default function StudentCoursework(){
 const {user}=useAuth();
 return <CourseworkWorkspace key={`${user?.id}:${user?.tenantId}:${user?.role}`}/>;
}
function CourseworkWorkspace(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [modules,setModules]=useState<Module[]>([]);const [briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [results,setResults]=useState<Released[]>([]);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!uid||!tenant){setLoading(false);setError('Assigned student and authorised centre profile required.');return;}
  setLoading(true);setError('');
  try{
   const en=await db.from('student_enrolments').select('programme_id')
    .eq('student_id',uid).eq('tenant_id',tenant).eq('status','active');
   if(en.error)throw Error(en.error.message);
   const ids=[...new Set<string>((en.data||[]).map((x:{programme_id:string})=>x.programme_id))];
   if(!ids.length){setModules([]);setBriefs([]);setCriteria([]);setAttempts([]);setResults([]);return;}
   const m=await db.from('modules').select('id,title,programme_id').eq('tenant_id',tenant).in('programme_id',ids);
   if(m.error)throw Error(m.error.message);
   const mods=(m.data||[]) as Module[];setModules(mods);
   if(!mods.length){setBriefs([]);setCriteria([]);setAttempts([]);setResults([]);return;}
   const [b,a,r]=await Promise.all([
    db.from('unipathway_assessment_briefs')
     .select('id,module_id,title,assessment_type,teaching_summary,learning_outcomes,student_expectations,required_evidence,due_at,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference,rubric_version')
     .eq('tenant_id',tenant).eq('status','published').in('module_id',mods.map(x=>x.id)).order('due_at'),
    db.from('unipathway_assessment_attempts')
     .select('id,brief_id,attempt_no,status,submitted_at,resubmission_guidance,guidance_at,evidence_text')
     .eq('student_id',uid).eq('tenant_id',tenant).order('attempt_no',{ascending:false}).limit(250),
    db.from('unipathway_assessment_released_results')
     .select('attempt_id,brief_id,student_id,final_score,raw_score,penalty_points,published_feedback,released_at')
     .eq('student_id',uid).eq('tenant_id',tenant).order('released_at',{ascending:false}).limit(250)
   ]);
   const fail=[b,a,r].find(x=>x.error);if(fail)throw Error(fail.error.message);
   const bs=(b.data||[]) as Brief[];setBriefs(bs);setAttempts((a.data||[]) as Attempt[]);setResults((r.data||[]) as Released[]);
   if(!bs.length){setCriteria([]);return;}
   const c=await db.from('unipathway_assessment_criteria')
    .select('id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order')
    .in('brief_id',bs.map(x=>x.id)).order('display_order');
   if(c.error)throw Error(c.error.message);
   setCriteria((c.data||[]) as Criterion[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to verify enrolled coursework');setBriefs([]);}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const grouped=useMemo(()=>{
  const map=new Map<string,Attempt[]>();
  attempts.forEach(a=>{const list=map.get(a.brief_id)||[];list.push(a);map.set(a.brief_id,list)});
  for(const a of map.values())a.sort((x,y)=>y.attempt_no-x.attempt_no);
  return map;
 },[attempts]);
 const submit=async(b:Brief)=>{
  if(busy)return;
  const list=grouped.get(b.id)||[],latest=list[0];
  const allowed=(!latest||latest.status==='resubmission_requested')&&list.length<b.max_attempts&&Date.now()<=new Date(b.submission_cutoff).getTime();
  if(!allowed){toast.error('Submission requires an open window and a marker-issued resubmission instruction.');return;}
  const work=(drafts[b.id]||'').trim();
  if(work.length<30||work.length>50000){toast.error('Provide between 30 and 50,000 characters of original evidence.');return;}
  if(!window.confirm('Submit this attempt for independent human assessment? You cannot edit it after submission.'))return;
  setBusy(b.id);
  try {
   const {error:e}=await db.rpc('submit_unipathway_assessment',{p_brief:b.id,p_evidence:work});
   if(e)throw e;
   toast.success('Assignment submitted. You can read your result after marking and approval.');
   setDrafts(p=>({...p,[b.id]:''}));await load();
  } catch {toast.error('Submission could not be confirmed. Your draft is still here. Refresh assignments to check whether it arrived before trying again.');}
  finally {setBusy('');}
 };
 return <DashboardLayout title="Assignments" subtitle="Your tasks, submissions and released feedback">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Fair marking and protected student evidence</h2>
   <p className="mt-2 text-sm text-muted-foreground">Review the teaching notes and exact learning outcomes before submitting. Your work goes to an independent marker; Omniqora may offer a private draft, but a separate IQA must approve release. No provisional mark is visible to you.</p>
  </section>
  {loading&&<p role="status">Checking your active enrolled assignments and released feedback…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">Assignments could not be loaded. Please retry or contact your centre.</p>}
  <Button className="mb-4" variant="outline" disabled={loading||!!busy} onClick={()=>void load()}>Refresh assignments</Button>
  {!loading&&!error&&!briefs.length&&<p className="rounded-xl border bg-card p-6 text-sm">Your lecturers have not published coursework under your currently enrolled modules yet.</p>}
  {!loading&&!error&&<div className="space-y-5">{briefs.map(b=>{
   const list=grouped.get(b.id)||[],latest=list[0],released=results.filter(r=>r.brief_id===b.id);
   const within=Date.now()<=new Date(b.submission_cutoff).getTime();
   const maySubmit=within&&list.length<b.max_attempts&&(!latest||latest.status==='resubmission_requested');
   const rubric=criteria.filter(c=>c.brief_id===b.id);
   return <article key={b.id} className="rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
     <div><p className="text-xs font-semibold uppercase text-success">{modules.find(m=>m.id===b.module_id)?.title||'My module'} · {b.assessment_type}</p>
      <h2 className="mt-2 text-xl font-bold">{b.title}</h2>
     </div><span className="text-xs font-semibold text-muted-foreground">{latest?.status||'Not submitted'}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="size-4"/>Due {new Date(b.due_at).toLocaleString()}</span>
      <span>Final cutoff {new Date(b.submission_cutoff).toLocaleString()}</span><span>Attempts: {list.length}/{b.max_attempts}</span></div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
     {([
      ['Lessons covered / lecturer progress',b.teaching_summary],
      ['Learning outcomes',b.learning_outcomes],
      ['What your coursework must demonstrate',b.student_expectations],
      ['Required evidence and deliverables',b.required_evidence]
     ] as const).map(([heading,text])=><section key={heading} className="rounded-lg bg-secondary/40 p-3"><h3 className="text-sm font-semibold">{heading}</h3><p className="mt-2 whitespace-pre-wrap text-sm">{text}</p></section>)}
    </div>
    <h3 className="mt-5 flex items-center gap-2 font-semibold"><ClipboardCheck className="size-4"/>Published marking criteria ({rubric.length})</h3>
    <div className="mt-2 space-y-2">{rubric.map(c=><div key={c.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{c.criterion_code} — {c.max_points} rubric points</p>
     <p className="mt-1">{c.learning_outcome}</p><p className="mt-1 text-muted-foreground">{c.criterion_description}</p><p className="mt-1 text-xs text-muted-foreground">Marker standard: {c.scoring_guidance}</p></div>)}</div>
    <div className="mt-4 rounded-lg border border-warning/40 p-3 text-sm"><strong>Resubmission rule:</strong> Up to {b.max_attempts} attempt(s); {b.penalty_points_per_resubmission} internal percentage points deducted per permitted resubmission, only where permitted under the published {b.policy_reference} policy. No resubmissions after {new Date(b.submission_cutoff).toLocaleString()}.</div>
    {list.map(a=><section key={a.id} className="mt-3 rounded-lg bg-secondary/30 p-3">
     <p className="font-semibold text-sm">Attempt {a.attempt_no} — {a.status}</p>
     <p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(a.submitted_at).toLocaleString()}</p>
     {a.resubmission_guidance&&<p className="mt-2 whitespace-pre-wrap rounded-lg border border-primary/25 bg-card p-3 text-sm"><RotateCcw className="mr-1 inline size-4"/><strong>Independent marker's improvement plan:</strong> {a.resubmission_guidance}</p>}
     {released.find(r=>r.attempt_id===a.id)&&<div className="mt-2 rounded-lg border bg-card p-3 text-sm">
      <p className="font-bold">Approved score: {released.find(r=>r.attempt_id===a.id)?.final_score}/100</p>
      <p className="mt-1 text-xs text-muted-foreground">Human-reviewed raw score: {released.find(r=>r.attempt_id===a.id)?.raw_score}; permitted resubmission penalty: {released.find(r=>r.attempt_id===a.id)?.penalty_points} points.</p>
      <p className="mt-2 whitespace-pre-wrap">{released.find(r=>r.attempt_id===a.id)?.published_feedback}</p>
     </div>}
    </section>)}
    {maySubmit?<div className="mt-5"><label className="text-sm font-semibold">{latest?'Revised work responding to marker guidance':'Your original submitted evidence'}
      <Textarea rows={7} className="mt-2" maxLength={50000} value={drafts[b.id]||''} onChange={e=>setDrafts(p=>({...p,[b.id]:e.target.value}))}
       placeholder="Include your own coursework response, reasoning, calculations, source references or practical observations…"/></label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{(drafts[b.id]||'').length}/50000 characters</span>
       <Button disabled={!!busy||(drafts[b.id]||'').trim().length<30} onClick={()=>submit(b)}><BookOpen className="mr-1 size-4"/>{latest?'Submit revised work':'Submit coursework'}</Button></div>
     </div>:<p className="mt-4 text-xs text-muted-foreground">{within?'Awaiting independent marking, IQA approval or an authorised revision request.':'The submission window is closed.'}</p>}
   </article>;
  })}</div>}
 </DashboardLayout>;
}
