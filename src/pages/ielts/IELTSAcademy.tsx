import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BookOpen, CheckCircle2, ChevronRight, GraduationCap, Headphones, Loader2, Mic, PencilLine, Target, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IELTSReadingLab from '@/components/ielts/IELTSReadingLab';
import IELTSAudioWorkstation from '@/components/ielts/IELTSAudioWorkstation';
import IELTSListeningLab from '@/components/ielts/IELTSListeningLab';
import IELTSSpeakingPractice from '@/components/ielts/IELTSSpeakingPractice';
import IELTSSpeakingTutorQueue from '@/components/ielts/IELTSSpeakingTutorQueue';
import IELTSReadinessPanel from '@/components/ielts/IELTSReadinessPanel';
import IELTSMockRehearsals from '@/components/ielts/IELTSMockRehearsals';
import {
  IELTS_SKILLS, IELTS_UNITS, IELTS_OFFICIAL_RESOURCES,
  type IeltsTrack, type IeltsSkill, unitPrompt,
} from '@/lib/ieltsCurriculum';

const db: SupabaseClient = supabase;
const teachingRoles = ['lecturer','programme_leader','centre_director','superadmin'];
type Plan = { id:string; track:IeltsTrack; target_band:number; study_goal:string };
type Completion = { id:string; track:IeltsTrack; unit_week:number };
type Submission = {
 id:string; student_id:string; track:IeltsTrack; unit_week:number; skill:IeltsSkill;
 answer_text:string; submitted_at:string; teacher_band:number|null; teacher_feedback:string|null; reviewed_at:string|null;
};
const skillIcons = {listening:Headphones,reading:BookOpen,writing:PencilLine,speaking:Mic};
const bandSteps = Array.from({length:13},(_,i)=>3+i*0.5);

export default function IELTSAcademy() {
  const { user } = useAuth();
  const tenant = user?.tenantId;
  const student = user?.id;
  const teacher = user?.roles.some(role=>teachingRoles.includes(role)) ?? false;
  const [plans,setPlans] = useState<Plan[]>([]);
  const [completions,setCompletions] = useState<Completion[]>([]);
  const [submissions,setSubmissions] = useState<Submission[]>([]);
  const [names,setNames] = useState<Record<string,string>>({});
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [tab,setTab] = useState<'learn'|'review'>('learn');
  const [track,setTrack] = useState<IeltsTrack>('academic');
  const [targetBand,setTargetBand] = useState('6.5');
  const [studyGoal,setStudyGoal] = useState('');
  const [selectedWeek,setSelectedWeek] = useState(1);
  const [draft,setDraft] = useState('');
  const [review,setReview] = useState<Submission|null>(null);
  const [feedback,setFeedback] = useState('');
  const [reviewBand,setReviewBand] = useState('');
  const activePlan = plans[0];
  const activeTrack = activePlan?.track || track;
  const selectedUnit = IELTS_UNITS.find(unit=>unit.week===selectedWeek) || IELTS_UNITS[0];

  const reload = useCallback(async()=>{
    if(!tenant || !student){setLoading(false);return;}
    setLoading(true);setError('');
    try {
      const [p,c,s] = await Promise.all([
        teacher ? Promise.resolve({data:[],error:null}) : db.from('ielts_study_plans').select('id,track,target_band,study_goal').eq('tenant_id',tenant).eq('student_id',student).limit(1),
        teacher ? Promise.resolve({data:[],error:null}) : db.from('ielts_unit_completions').select('id,track,unit_week').eq('tenant_id',tenant).eq('student_id',student),
        teacher ? db.from('ielts_practice_submissions').select('id,student_id,track,unit_week,skill,answer_text,submitted_at,teacher_band,teacher_feedback,reviewed_at').eq('tenant_id',tenant).order('submitted_at',{ascending:false}).limit(100)
                : db.from('ielts_practice_submissions').select('id,student_id,track,unit_week,skill,answer_text,submitted_at,teacher_band,teacher_feedback,reviewed_at').eq('tenant_id',tenant).eq('student_id',student).order('submitted_at',{ascending:false}).limit(100),
      ]);
      if(p.error||c.error||s.error)throw p.error||c.error||s.error;
      setPlans((p.data||[]) as Plan[]);
      setCompletions((c.data||[]) as Completion[]);
      const rows=(s.data||[]) as Submission[];
      setSubmissions(rows);
      if(teacher && rows.length){
        const ids=[...new Set(rows.map(row=>row.student_id))];
        const lookup=await db.from('profiles').select('user_id,full_name').eq('tenant_id',tenant).in('user_id',ids);
        if(!lookup.error)setNames(Object.fromEntries((lookup.data||[]).map(row=>[row.user_id,row.full_name])));
      }
    } catch {
      setError('IELTS workspace could not be loaded. Check your centre access and migration status, then retry.');
    } finally {setLoading(false);}
  },[tenant,student,teacher]);
  useEffect(()=>{void reload();},[reload]);
  useEffect(()=>{
    if(activePlan){setTrack(activePlan.track);setTargetBand(String(activePlan.target_band));setStudyGoal(activePlan.study_goal||'');}
  },[activePlan?.id,activePlan?.track,activePlan?.target_band,activePlan?.study_goal]);
  useEffect(()=>{setDraft('');},[selectedWeek,activeTrack]);
  const completedWeeks = useMemo(()=>new Set(completions.filter(c=>c.track===activeTrack).map(c=>c.unit_week)),[completions,activeTrack]);
  const mySubmissions = submissions.filter(s=>s.track===activeTrack);
  const unitSubmissions = mySubmissions.filter(s=>s.unit_week===selectedWeek);
  const writingFeedback = mySubmissions.filter(s=>s.teacher_band!==null && s.skill==='writing');
  const progressPct=Math.round(100*completedWeeks.size/IELTS_UNITS.length);

  async function savePlan(){
    if(!tenant||!student||busy||teacher)return;
    const band=Number(targetBand);
    if(!Number.isFinite(band)||band<0||band>9||!Number.isInteger(band*2))return toast.error('Choose a valid half-band target.');
    setBusy(true);
    try{
      const result=await db.from('ielts_study_plans').upsert({
        tenant_id:tenant,student_id:student,track,target_band:band,study_goal:studyGoal.trim().slice(0,1000),
      },{onConflict:'tenant_id,student_id'});
      if(result.error)throw result.error;
      toast.success('Study plan saved');await reload();
    }catch(e){toast.error((e as Error).message||'Unable to save study plan');}
    finally{setBusy(false);}
  }
  async function markComplete(){
    if(!tenant||!student||busy||teacher||!activePlan)return;
    setBusy(true);
    try{
      const result=await db.from('ielts_unit_completions').upsert({
        tenant_id:tenant,student_id:student,track:activeTrack,unit_week:selectedWeek
      },{onConflict:'tenant_id,student_id,track,unit_week'});
      if(result.error)throw result.error;
      toast.success('Study unit completed');await reload();
    }catch(e){toast.error((e as Error).message||'Could not record completion');}
    finally{setBusy(false);}
  }
  async function submitPractice(){
    if(!tenant||!student||activePlan==null||teacher||busy)return;
    if(draft.trim().length<10)return toast.error('Add a meaningful written response or practice reflection.');
    if(draft.length>15000)return toast.error('Practice response exceeds the 15,000-character limit.');
    setBusy(true);
    try{
      const result=await db.from('ielts_practice_submissions').insert({
        tenant_id:tenant,student_id:student,track:activeTrack,unit_week:selectedWeek,skill:selectedUnit.skill,answer_text:draft.trim()
      });
      if(result.error)throw result.error;
      setDraft('');toast.success('Practice saved for tutor review');await reload();
    }catch(e){toast.error((e as Error).message||'Could not submit practice');}
    finally{setBusy(false);}
  }
  async function saveListeningDrill(summary:string):Promise<void>{
    if(!tenant||!student||!activePlan||teacher||busy)throw new Error('Create a student study plan before saving practice.');
    setBusy(true);
    try {
      const result=await db.from('ielts_practice_submissions').insert({
        tenant_id:tenant,student_id:student,track:activeTrack,unit_week:2,skill:'listening',answer_text:summary
      });
      if(result.error)throw result.error;
      toast.success('Listening practice saved.');
      await reload();
    }finally{setBusy(false);}
  }
  async function saveReadingDrill(summary:string):Promise<void>{
    if(!tenant||!student||!activePlan||teacher||busy)throw new Error('Create a student study plan before saving practice.');
    setBusy(true);
    try{
      const result=await db.from('ielts_practice_submissions').insert({
        tenant_id:tenant,student_id:student,track:activeTrack,unit_week:3,skill:'reading',answer_text:summary
      });
      if(result.error)throw result.error;
      toast.success('Reading practice saved to your LMS.');
      await reload();
    }finally{setBusy(false);}
  }
  function openReview(submission:Submission){
    setReview(submission);setFeedback(submission.teacher_feedback||'');
    setReviewBand(submission.teacher_band===null?'':String(submission.teacher_band));
  }
  async function saveReview(){
    if(!tenant||!teacher||!review||busy)return;
    if(feedback.trim().length<10)return toast.error('Give actionable tutor feedback of at least 10 characters.');
    const band=review.skill==='writing' && reviewBand!=='' ? Number(reviewBand) : null;
    if(band!==null&&(!Number.isFinite(band)||band<0||band>9||!Number.isInteger(band*2)))return toast.error('Choose a valid band estimate.');
    setBusy(true);
    try{
      const result=await db.from('ielts_practice_submissions')
        .update({teacher_feedback:feedback.trim(),teacher_band:band})
        .eq('id',review.id).eq('tenant_id',tenant);
      if(result.error)throw result.error;
      toast.success('Tutor feedback saved');setReview(null);await reload();
    }catch(e){toast.error((e as Error).message||'Could not save assessment');}
    finally{setBusy(false);}
  }

  return <DashboardLayout title="IELTS Preparation Academy" subtitle="Independent Academic and General Training preparation · UniPathway LMS">
    {!tenant?<p role="alert" className="surface-card p-6">A UniPathway centre assignment is required. External learners may join as student accounts without enrolling in OTHM or Qualifi.</p>:
     loading?<div className="surface-card p-8 flex items-center gap-3"><Loader2 className="animate-spin" /> Loading IELTS programme…</div>:
     error?<div className="surface-card p-6 space-y-3"><p role="alert">{error}</p><Button onClick={()=>void reload()}>Retry</Button></div>:
     <div className="space-y-6">
       <section className="surface-card p-6 grid gap-5 md:grid-cols-[1.4fr_1fr] items-center">
         <div className="space-y-2">
           <p className="text-xs uppercase font-semibold tracking-widest text-primary">Learn · Practise · Improve</p>
           <h2 className="text-2xl font-bold">Prepare with purpose. Practise with feedback.</h2>
           <p className="text-sm text-muted-foreground">Eight guided weeks across Listening, Reading, Writing and Speaking. Learn online and use your UniPathway live classes for human coaching. IELTS exam booking is through an authorised test provider.</p>
           <Button variant="outline" size="sm" asChild><Link to={teacher?'/lecturer/classroom':'/student/classroom'}>Open live classroom</Link></Button>
         </div>
         <div className="rounded-xl bg-secondary/70 p-4 text-sm space-y-1">
           <p className="font-medium">Independent exam preparation</p>
           <p className="text-muted-foreground">This is not an official IELTS test or test centre. Teacher estimates and practice accuracy are not official IELTS scores. No target band is guaranteed.</p>
         </div>
       </section>
       <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
         {IELTS_SKILLS.map(skill=>{const Icon=skillIcons[skill.key];return <div key={skill.key} className="surface-card p-4 space-y-2"><Icon className="w-5 h-5 text-primary" /><h3 className="font-semibold">{skill.label}</h3><p className="text-sm">{skill.time}</p><p className="text-xs text-muted-foreground">{skill.format}</p></div>;})}
       </div>
       {teacher?<div className="flex flex-wrap gap-2">
         <Button variant={tab==='learn'?'default':'outline'} onClick={()=>setTab('learn')}>Teaching plan</Button>
         <Button variant={tab==='review'?'default':'outline'} onClick={()=>setTab('review')}>Practice review ({submissions.filter(s=>!s.teacher_feedback).length})</Button>
       </div>:<section className="surface-card p-5 space-y-3">
         <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4"/> My IELTS study plan</h3><span className="text-sm font-bold text-primary">{progressPct}% units completed</span></div>
         <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width:String(progressPct)+'%'}}/></div>
         <div className="grid gap-3 sm:grid-cols-3">
           <label className="text-xs font-medium">IELTS test type<select aria-label="IELTS test type" className="block w-full mt-1 rounded-lg border p-2 bg-background" value={track} onChange={e=>setTrack(e.target.value as IeltsTrack)}><option value="academic">Academic</option><option value="general">General Training</option></select></label>
           <label className="text-xs font-medium">Target band<select aria-label="Target overall band" className="block w-full mt-1 rounded-lg border p-2 bg-background" value={targetBand} onChange={e=>setTargetBand(e.target.value)}>{bandSteps.map(b=><option key={b} value={String(b)}>{b.toFixed(1)}</option>)}</select></label>
           <label className="text-xs font-medium">Study goal<Input className="mt-1" maxLength={1000} value={studyGoal} placeholder="University admission, professional goals…" onChange={e=>setStudyGoal(e.target.value)} /></label>
         </div>
         <Button onClick={()=>void savePlan()} disabled={busy}>{activePlan?'Update study plan':'Start IELTS preparation'}</Button>
         {activePlan&&<p className="text-xs text-muted-foreground">Changing test type starts a separate set of weekly completions. Existing submitted work remains visible in its original test type.</p>}
       </section>}
       {!teacher&&activePlan&&student&&<IELTSReadinessPanel tenant={tenant} student={student} track={activeTrack} submissions={mySubmissions} onSelectWeek={setSelectedWeek}/>}
       {teacher && tab==='review'?<div className="space-y-5"><section className="surface-card p-5 space-y-4">
         <h3 className="font-semibold">Tutor review queue · latest 100 centre submissions</h3>
         <p className="text-sm text-muted-foreground">Only score a genuine Writing response with evidence against the official writing descriptors. Speaking reflections cannot be band-scored from typed text.</p>
         {submissions.length===0?<p>No learner practice has been submitted yet.</p>:<div className="space-y-2">{submissions.map(s=><button key={s.id} type="button" onClick={()=>openReview(s)} className="w-full text-left rounded-xl border p-4 flex items-center justify-between gap-3 hover:bg-accent/50">
           <div><p className="font-medium">{names[s.student_id]||'Student '+s.student_id.slice(0,8)}</p><p className="text-sm text-muted-foreground">Week {s.unit_week} · {s.skill} · {s.track==='academic'?'Academic':'General Training'} · {new Date(s.submitted_at).toLocaleDateString()}</p></div>
           <div className="text-right text-xs">{s.teacher_feedback?'Feedback added':'Needs feedback'}{s.teacher_band!==null?<p>Practice estimate {s.teacher_band.toFixed(1)}</p>:null}<ChevronRight className="ml-auto mt-1 w-4 h-4" /></div>
         </button>)}</div>}
         {review&&<div className="rounded-xl bg-secondary/60 p-4 space-y-3">
           <h4 className="font-semibold">Review: Week {review.unit_week} · {review.skill}</h4>
           <div className="rounded-lg bg-background border p-3 max-h-72 overflow-y-auto text-sm whitespace-pre-wrap">{review.answer_text}</div>
           <label className="block text-sm font-medium">Actionable feedback<Textarea className="mt-2" rows={4} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What the learner did well, what needs work and what to practise next" /></label>
           {review.skill==='writing'?<label className="block text-sm font-medium">Optional tutor-estimated Writing practice band
             <select className="block mt-2 rounded-lg border p-2 bg-background" value={reviewBand} onChange={e=>setReviewBand(e.target.value)}>
               <option value="">Feedback only — no band estimate</option>{bandSteps.map(b=><option key={b} value={String(b)}>{b.toFixed(1)}</option>)}
             </select><p className="text-xs mt-1 text-muted-foreground">Formative estimate only. Check task achievement/response, coherence, vocabulary and grammar against current official criteria.</p></label>
           :<p className="text-xs text-muted-foreground">No numerical practice band is available for this text-based reflection.</p>}
           <div className="flex gap-2"><Button disabled={busy} onClick={()=>void saveReview()}>Save feedback</Button><Button variant="outline" onClick={()=>setReview(null)}>Cancel</Button></div>
         </div>}
       </section><IELTSSpeakingTutorQueue tenant={tenant}/></div>:<div className="grid gap-5 lg:grid-cols-[260px_1fr]">
         <nav className="surface-card p-3 space-y-1 self-start" aria-label="IELTS weekly curriculum">
           <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider px-2 py-2">Eight-week curriculum</p>
           {IELTS_UNITS.map(unit=><button key={unit.week} type="button" onClick={()=>setSelectedWeek(unit.week)}
             className={'flex items-center w-full gap-3 text-left rounded-lg px-3 py-3 text-sm '+(selectedWeek===unit.week?'bg-primary/10 text-primary font-semibold':'hover:bg-secondary')}>
             {completedWeeks.has(unit.week)?<CheckCircle2 className="w-4 h-4 text-success shrink-0"/>:<span className="text-xs font-bold w-4 shrink-0">{String(unit.week).padStart(2,'0')}</span>}
             <span className="flex-1">{unit.title}</span><ChevronRight className="w-4 h-4 shrink-0"/>
           </button>)}
         </nav>
         <section className="surface-card p-5 sm:p-7 space-y-5">
           <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs uppercase font-bold tracking-widest text-primary">Week {selectedUnit.week} of 8 · {selectedUnit.skill}</span><span className="text-sm text-muted-foreground">Suggested activity {selectedUnit.minutes} min</span></div>
           <h3 className="text-2xl font-bold">{selectedUnit.title}</h3><p className="text-muted-foreground">{selectedUnit.focus}</p>
           <div className="rounded-xl border p-4 space-y-3"><h4 className="font-semibold">Learning outcomes</h4><ul className="list-disc pl-5 space-y-2 text-sm">{selectedUnit.learningObjectives.map(x=><li key={x}>{x}</li>)}</ul></div>
           {!teacher&&selectedWeek===2&&<IELTSListeningLab available={!!activePlan&&!busy} onSave={saveListeningDrill}/>}
           {!teacher&&selectedWeek===3&&<IELTSReadingLab track={activeTrack} available={!!activePlan&&!busy} onSave={saveReadingDrill}/>} 
            {!teacher&&selectedWeek===6&&student&&<IELTSSpeakingPractice key={`${tenant}-${student}`} tenant={tenant} student={student} track={activeTrack} enabled={!!activePlan&&!busy}/>}
           <div className="space-y-2"><h4 className="font-semibold">Lesson notes</h4><p className="text-sm leading-7 whitespace-pre-wrap">{selectedUnit.teachingNotes}</p></div>
           <div className="rounded-xl bg-secondary/60 p-4 space-y-3"><h4 className="font-semibold">Original {activeTrack==='academic'?'Academic':'General Training'} practice task</h4><p className="text-sm leading-7 whitespace-pre-wrap">{unitPrompt(selectedUnit,activeTrack)}</p></div>
           {teacher?<div className="rounded-xl border p-4 space-y-2"><h4 className="font-semibold">Teacher checklist</h4><ul className="list-disc pl-5 space-y-2 text-sm">{selectedUnit.teacherChecklist.map(x=><li key={x}>{x}</li>)}</ul></div>
           :activePlan?<div className="space-y-3">
             <label className="block font-semibold text-sm">Your answer or study reflection<Textarea rows={7} className="mt-2" placeholder="Enter your original work. For Speaking, record tutor feedback notes; this text is not a spoken test." value={draft} onChange={e=>setDraft(e.target.value)} maxLength={15000}/></label>
             <p className="text-xs text-muted-foreground">Submissions are private to you and authorised tutors. They are not automatically converted into IELTS band scores.</p>
             <div className="flex flex-wrap gap-2"><Button disabled={busy||draft.trim().length<10} onClick={()=>void submitPractice()}>Submit for feedback</Button><Button variant="outline" disabled={busy||completedWeeks.has(selectedWeek)} onClick={()=>void markComplete()}>{completedWeeks.has(selectedWeek)?'Completed':'Mark lesson complete'}</Button></div>
             {unitSubmissions.length>0&&<div className="space-y-2 pt-3"><p className="font-semibold text-sm">Your recent practice</p>{unitSubmissions.map(s=><div key={s.id} className="rounded-lg border p-3 space-y-2 text-sm"><p className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words line-clamp-4">{s.answer_text}</p>{s.teacher_feedback&&<p className="text-sm rounded bg-secondary p-2"><strong>Tutor:</strong> {s.teacher_feedback}</p>}{s.teacher_band!==null&&<p className="text-xs text-muted-foreground">Tutor-estimated Writing practice band: {s.teacher_band.toFixed(1)} (not official)</p>}</div>)}</div>}
           </div>:<div className="border rounded-xl p-4 text-sm text-muted-foreground"><GraduationCap className="w-5 h-5 mb-2"/> Save your Academic or General Training plan to enable practice submissions and track your learning.</div>}
         </section>
       </div>}
       <IELTSAudioWorkstation key={`${tenant}:${student}`} />
       <IELTSMockRehearsals track={activeTrack}/>
        <section className="surface-card p-5 space-y-3">
         <h3 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Official format and practice resources</h3>
         <p className="text-sm text-muted-foreground">Open these official websites for licensed sample materials and the current examiner descriptors. UniPathway’s written learning activities are independent originals.</p>
         <div className="grid gap-2 sm:grid-cols-2">{IELTS_OFFICIAL_RESOURCES.map(x=><a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border p-3 text-sm font-medium hover:bg-accent/50 flex items-center justify-between gap-2">{x.label}<ExternalLink className="w-4 h-4 shrink-0"/></a>)}</div>
       </section>
     </div>}
  </DashboardLayout>;
}
