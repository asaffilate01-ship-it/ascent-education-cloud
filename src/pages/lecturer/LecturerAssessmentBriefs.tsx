import {useCallback,useEffect,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,ClipboardCheck,ShieldCheck,Plus} from 'lucide-react';
type Module={id:string;title:string;tenant_id:string;lecturer_id:string|null};
type Brief={id:string;title:string;module_id:string;status:string;assessment_type:string;due_at:string;submission_cutoff:string;max_attempts:number;penalty_points_per_resubmission:number;policy_reference:string};
type Criterion={id:string;brief_id:string;criterion_code:string;learning_outcome:string;criterion_description:string;scoring_guidance:string;max_points:number;display_order:number};
export default function LecturerAssessmentBriefs(){
 const {user}=useAuth();const uid=user?.id,tenant=user?.tenantId;
 const [modules,setModules]=useState<Module[]>([]);
 const [briefs,setBriefs]=useState<Brief[]>([]);
 const [criteria,setCriteria]=useState<Criterion[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const [moduleId,setModuleId]=useState('');
 const [title,setTitle]=useState('');const [kind,setKind]=useState('coursework');
 const [teaching,setTeaching]=useState('');const [outcomes,setOutcomes]=useState('');
 const [expectations,setExpectations]=useState('');const [required,setRequired]=useState('');
 const [due,setDue]=useState('');const [cutoff,setCutoff]=useState('');
 const [attempts,setAttempts]=useState(1);const [penalty,setPenalty]=useState(0);
 const [policy,setPolicy]=useState('');
 const [selected,setSelected]=useState('');
 const [criterionCode,setCriterionCode]=useState('');
 const [criterionLO,setCriterionLO]=useState('');
 const [criterionDescription,setCriterionDescription]=useState('');
 const [criterionGuidance,setCriterionGuidance]=useState('');
 const [criterionPoints,setCriterionPoints]=useState(25);
 const load=useCallback(async()=>{
  if(!uid||!tenant){setError('Assigned lecturer account and centre tenant required.');setLoading(false);return;}
  setLoading(true);setError('');
  try{
   const [m,b]=await Promise.all([
    db.from('modules').select('id,title,tenant_id,lecturer_id').eq('tenant_id',tenant).eq('lecturer_id',uid).order('title'),
    db.from('unipathway_assessment_briefs').select('id,title,module_id,status,assessment_type,due_at,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference')
    .eq('tenant_id',tenant).eq('lecturer_id',uid).order('created_at',{ascending:false}).limit(180)
   ]);
   if(m.error||b.error)throw Error(m.error?.message||b.error?.message);
   const mine=(b.data||[]) as Brief[];
   setModules((m.data||[]) as Module[]);setBriefs(mine);
   if(!mine.length){setCriteria([]);return;}
   const res=await db.from('unipathway_assessment_criteria')
    .select('id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order')
    .in('brief_id',mine.map(x=>x.id)).order('display_order');
   if(res.error)throw Error(res.error.message);
   setCriteria((res.data||[]) as Criterion[]);
  }catch(e){setError(e instanceof Error?e.message:'Cannot load private assignment briefs');}
  finally{setLoading(false);}
 },[uid,tenant]);
 useEffect(()=>{void load();},[load]);
 const create=async()=>{
  if(!uid||!tenant||!modules.some(x=>x.id===moduleId)||!title.trim()||teaching.trim().length<40
  ||outcomes.trim().length<20||expectations.trim().length<40||required.trim().length<20
  ||!due||!cutoff||!policy.trim()){toast.error('Complete the module, teaching summary, learning outcomes, evidence, deadlines and approved policy.');return;}
  if(new Date(cutoff).getTime()<new Date(due).getTime()||new Date(due).getTime()<=Date.now()){toast.error('Due date must be in the future and the final cutoff cannot precede it.');return;}
  if(attempts===1&&penalty!==0){toast.error('A resubmission penalty requires permitted additional attempts.');return;}
  setSaving(true);
  const {error:e}=await db.from('unipathway_assessment_briefs').insert({
   tenant_id:tenant,module_id:moduleId,lecturer_id:uid,title:title.trim(),assessment_type:kind,
   teaching_summary:teaching.trim(),learning_outcomes:outcomes.trim(),student_expectations:expectations.trim(),
   required_evidence:required.trim(),due_at:new Date(due).toISOString(),
   submission_cutoff:new Date(cutoff).toISOString(),max_attempts:attempts,
   penalty_points_per_resubmission:penalty,policy_reference:policy.trim(),
   rubric_version:'v1',status:'draft'
  });setSaving(false);
  if(e){toast.error(e.message);return;}
  toast.success('Teaching detail and draft assessment saved. Programme lead must approve the completed rubric before learners can submit.');
  setTitle('');setTeaching('');setOutcomes('');setExpectations('');setRequired('');await load();
 };
 const addCriterion=async(b:Brief)=>{
  if(criterionLO.trim().length<8||criterionDescription.trim().length<15||criterionGuidance.trim().length<20
   ||criterionCode.trim().length<2||criterionPoints<=0){toast.error('Each criterion needs its code, linked learning outcome, detailed evidence standard, marking guidance and points.');return;}
  const own=criteria.filter(c=>c.brief_id===b.id);
  if(own.reduce((n,c)=>n+Number(c.max_points),0)+criterionPoints>100){toast.error('Rubric points cannot exceed 100.');return;}
  setSaving(true);
  const {error:e}=await db.from('unipathway_assessment_criteria').insert({
    tenant_id:tenant,brief_id:b.id,criterion_code:criterionCode.trim().toUpperCase(),
    learning_outcome:criterionLO.trim(),criterion_description:criterionDescription.trim(),
    scoring_guidance:criterionGuidance.trim(),max_points:criterionPoints,display_order:own.length+1
  });setSaving(false);
  if(e){toast.error(e.message);return;}
  setCriterionCode('');setCriterionLO('');setCriterionDescription('');setCriterionGuidance('');await load();
 };
 const chosen=briefs.find(b=>b.id===selected);
 const ownCriteria=criteria.filter(c=>c.brief_id===selected);
 return <DashboardLayout title="Lecturer Teaching and Assessment Briefs" subtitle="Document precisely what was taught; separate assessors and IQA will mark and approve the work">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4"><h2 className="flex gap-2 font-semibold"><ShieldCheck className="size-5"/>Lecturer sets learning standards — not student grades</h2>
   <p className="mt-2 text-sm text-muted-foreground">Record the lesson progress, outcomes, student expectations and acceptable evidence. Add a transparent criterion rubric. A different assessor will evaluate coursework, Omniqora can suggest an advisory draft, and IQA separately approves the final mark. Resubmissions and any penalties require a manager-approved written policy.</p>
  </section>
  {loading&&<p role="status">Loading your teaching assignments…</p>}
  {error&&<p role="alert" className="rounded-lg border border-destructive p-4">{error}</p>}
  {!loading&&!error&&<div className="space-y-6">
   <section className="rounded-xl border bg-card p-5"><h2 className="flex gap-2 font-semibold"><BookOpen className="size-5"/>Create assessment from taught material</h2>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm">Assigned teaching module<select aria-label="Assigned teaching module" value={moduleId} onChange={e=>setModuleId(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2">
       <option value="">Select module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm">Assessment type<select aria-label="Assessment type" value={kind} onChange={e=>setKind(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2">
       <option value="coursework">Coursework</option><option value="homework">Homework</option><option value="practical">Practical skills assessment</option></select></label>
     <label className="text-sm md:col-span-2">Assessment title<Input value={title} maxLength={180} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Physics mechanics: force and acceleration"/></label>
     {([
       ['Lessons taught and progress',teaching,setTeaching,10000,'Summarise lessons, topics taught and what the lecturer demonstrated'],
       ['Learning outcomes',outcomes,setOutcomes,10000,'What learners should know or be able to do'],
       ['Student expectations',expectations,setExpectations,10000,'Explain the required tasks, structure and standard of independent work'],
       ['Required evidence and deliverables',required,setRequired,10000,'What to submit: calculations, code, reasoning, practical observations, citations']
     ] as const).map(([label,value,onChange,max,placeholder])=><label className="text-sm md:col-span-2" key={label}>{label}
      <Textarea rows={3} className="mt-1" maxLength={max} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>)}
     <label className="text-sm">First submission due<Input className="mt-1" type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label>
     <label className="text-sm">Final submission cutoff<Input className="mt-1" type="datetime-local" value={cutoff} onChange={e=>setCutoff(e.target.value)}/></label>
     <label className="text-sm">Allowed attempts<select className="mt-1 w-full rounded-md border bg-background p-2" value={attempts} onChange={e=>{const n=Number(e.target.value);setAttempts(n);if(n===1)setPenalty(0);}}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
     <label className="text-sm">Approved penalty points per resubmission<Input className="mt-1" type="number" min={0} max={30} step={1} disabled={attempts===1} value={penalty} onChange={e=>setPenalty(Number(e.target.value))}/></label>
     <label className="text-sm md:col-span-2">Awarding-body or centre-approved assessment policy reference
      <Input className="mt-1" value={policy} maxLength={200} onChange={e=>setPolicy(e.target.value)} placeholder="Approved policy reference — do not invent penalties"/></label>
    </div>
    <Button className="mt-3" disabled={saving} onClick={()=>void create()}><Plus className="mr-1 size-4"/>Save unpublished assessment brief</Button>
   </section>
   <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">My assessment briefs ({briefs.length})</h2>
      <div className="mt-3 space-y-2">{briefs.map(b=><button key={b.id} className={`w-full rounded-lg border p-3 text-left text-sm ${selected===b.id?'border-primary bg-primary/5':''}`} onClick={()=>setSelected(b.id)}>
       <p className="font-semibold">{b.title}</p><p className="mt-1 text-xs text-muted-foreground">{b.assessment_type} · {b.status} · {new Date(b.due_at).toLocaleDateString()}</p></button>)}</div>
     {!briefs.length&&<p className="mt-3 text-sm text-muted-foreground">No teaching briefs drafted yet.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5">
     {!chosen?<p className="text-sm text-muted-foreground">Select an assessment to see its frozen rubric or add criteria while in draft.</p>:<>
      <h2 className="font-bold">{chosen.title}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{chosen.status} · {chosen.max_attempts} attempts · {chosen.penalty_points_per_resubmission} penalty points per approved resubmission · policy {chosen.policy_reference}</p>
      <h3 className="mt-4 font-semibold">Marking criteria ({ownCriteria.reduce((n,c)=>n+Number(c.max_points),0)}/100 points)</h3>
      <div className="mt-2 space-y-2">{ownCriteria.map(c=><div key={c.id} className="rounded-lg border p-3 text-sm">
       <p className="font-semibold">{c.criterion_code}: {c.max_points} points</p>
       <p className="mt-1">{c.learning_outcome}</p><p className="mt-1 text-muted-foreground">{c.criterion_description}</p>
      </div>)}</div>
      {chosen.status==='draft'?<div className="mt-4 space-y-2">
       <Input aria-label="Criterion code" placeholder="LO1.P1" value={criterionCode} maxLength={35} onChange={e=>setCriterionCode(e.target.value)}/>
       <Input aria-label="Criterion learning outcome" placeholder="Aligned official learning outcome" value={criterionLO} maxLength={1200} onChange={e=>setCriterionLO(e.target.value)}/>
       <Textarea aria-label="Criterion evidence standard" placeholder="What demonstrates this criterion?" value={criterionDescription} maxLength={3000} onChange={e=>setCriterionDescription(e.target.value)}/>
       <Textarea aria-label="Criterion marking guidance" placeholder="Exactly what deserves full, partial or zero marks?" value={criterionGuidance} maxLength={3000} onChange={e=>setCriterionGuidance(e.target.value)}/>
       <label className="text-sm">Maximum points<Input type="number" min={1} max={100} value={criterionPoints} onChange={e=>setCriterionPoints(Number(e.target.value))}/></label>
       <Button disabled={saving} variant="outline" onClick={()=>void addCriterion(chosen)}>Add criterion</Button>
       <p className="text-xs text-muted-foreground">Two or more criteria totalling 100 points are required for programme-leader approval. No student scores are entered by the lecturer.</p>
      </div>:<p className="mt-3 rounded-lg bg-secondary p-3 text-sm">This published rubric is immutable for the intake. Changes require a new approved assessment version.</p>}
     </>}
    </section>
   </div>
  </div>}
 </DashboardLayout>;
}
