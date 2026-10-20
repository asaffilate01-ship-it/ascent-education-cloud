import {useCallback,useEffect,useMemo,useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {BookOpen,ClipboardCheck,GraduationCap,ShieldCheck,Plus} from 'lucide-react';
import {centrePathwayFamilies,centrePathways} from '@/lib/educationCentrePathways';
type Module={id:string;title:string;programme_id:string;tenant_id:string};
type Syllabus={id:string;module_id:string|null;family:string;awarding_body:string;examination:string;subject:string;qualification_level:string|null;specification_version:string;specification_source:string;course_delivery_status:string;authorisation_status:string;official_exam_registration_enabled:boolean};
type Objective={id:string;syllabus_id:string;objective_code:string;objective_text:string;topic:string;display_order:number;requires_supervised_practical:boolean};
type Mock={id:string;syllabus_id:string;title:string;status:string;starts_at:string|null;duration_minutes:number|null};
const familyMap:Record<string,string>={
 'Pakistan school & board exams':'pakistan_board',
 'International school qualifications':'international_school',
 'Language examinations':'language',
 'Technology certifications':'tech_professional',
 'Accounting banking & finance':'finance_professional',
 'Beauty & aesthetics':'beauty','Healthcare & care':'healthcare',
 'Vocational & employment':'vocational','UK diploma progression':'uk_diploma'
};
export default function CentreSyllabusPlanner(){
 const {user}=useAuth();
 const [tenant,setTenant]=useState(user?.tenantId||'');
 const [modules,setModules]=useState<Module[]>([]);
 const [syllabuses,setSyllabuses]=useState<Syllabus[]>([]);
 const [objectives,setObjectives]=useState<Objective[]>([]);
 const [mocks,setMocks]=useState<Mock[]>([]);
 const [selected,setSelected]=useState('');
 const [family,setFamily]=useState(centrePathwayFamilies[0]);
 const [moduleId,setModuleId]=useState('');
 const [body,setBody]=useState('');
 const [exam,setExam]=useState('');
 const [subject,setSubject]=useState('');
 const [version,setVersion]=useState('');
 const [source,setSource]=useState('');
 const [grading,setGrading]=useState('board_marks');
 const [objCode,setObjCode]=useState('');
 const [objTitle,setObjTitle]=useState('');
 const [objTopic,setObjTopic]=useState('');
 const [mockTitle,setMockTitle]=useState('');
 const [mockStart,setMockStart]=useState('');
 const [mockDuration,setMockDuration]=useState(90);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const userId=user?.id;
 useEffect(()=>{
  if(user?.tenantId){setTenant(user.tenantId);return;}
  if(user?.roles.includes('superadmin'))void db.from('tenants').select('id').eq('slug','unipathway')
   .maybeSingle().then(({data})=>setTenant(data?.id||''));
 },[user?.id,user?.tenantId]);
 const reload=useCallback(async()=>{
  if(!userId||!tenant){setLoading(false);setError('Centre profile and authorised role are required.');return;}
  setLoading(true);setError('');
  try{
   const [m,s]=await Promise.all([
    db.from('modules').select('id,title,programme_id,tenant_id').eq('tenant_id',tenant).order('title'),
    db.from('unipathway_exam_syllabuses').select('id,module_id,family,awarding_body,examination,subject,qualification_level,specification_version,specification_source,course_delivery_status,authorisation_status,official_exam_registration_enabled').eq('tenant_id',tenant).order('created_at',{ascending:false}).limit(250)
   ]);
   if(m.error||s.error)throw Error(m.error?.message||s.error?.message);
   const row=(s.data||[]) as Syllabus[];
   setModules((m.data||[]) as Module[]);setSyllabuses(row);
   if(!row.length){setObjectives([]);setMocks([]);return;}
   const ids=row.map(x=>x.id);
   const [o,q]=await Promise.all([
    db.from('unipathway_syllabus_objectives').select('id,syllabus_id,objective_code,objective_text,topic,display_order,requires_supervised_practical').in('syllabus_id',ids).order('display_order'),
    db.from('unipathway_mock_exam_events').select('id,syllabus_id,title,status,starts_at,duration_minutes').in('syllabus_id',ids).order('starts_at',{ascending:false})
   ]);
   if(o.error||q.error)throw Error(o.error?.message||q.error?.message);
   setObjectives((o.data||[]) as Objective[]);setMocks((q.data||[]) as Mock[]);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load accreditation-safe syllabus records');}
  finally{setLoading(false);}
 },[userId,tenant]);
 useEffect(()=>{void reload();},[reload]);
 const choices=useMemo(()=>centrePathways.filter(p=>familyMap[p.family]===familyMap[family]),[family]);
 const create=async()=>{
  if(!tenant||!userId||!moduleId||!body.trim()||!exam.trim()||!subject.trim()||!version.trim()||source.trim().length<5){
   toast.error('Select a centre module and provide authority, exam, subject, syllabus version and source');return;
  }
  setBusy(true);
  const {error:e}=await db.from('unipathway_exam_syllabuses').insert({
   tenant_id:tenant,module_id:moduleId,created_by:userId,family:familyMap[family],
   awarding_body:body.trim(),examination:exam.trim(),subject:subject.trim(),
   specification_version:version.trim(),specification_source:source.trim(),
   grading_model:grading,course_delivery_status:'planned',authorisation_status:'unverified',
   official_exam_registration_enabled:false,exam_delivery:'external'
  });setBusy(false);
  if(e)return toast.error('Syllabus draft rejected: '+e.message);
  toast.success('Draft syllabus recorded, not an awarding-body approval.');await reload();
 };
 const addObjective=async(s:Syllabus)=>{
  if(!tenant||!objCode.trim()||objTitle.trim().length<15||!objTopic.trim()){
   toast.error('Add objective code, detailed outcome and topic');return;
  }
  const next=objectives.filter(x=>x.syllabus_id===s.id).length+1;
  setBusy(true);
  const {error:e}=await db.from('unipathway_syllabus_objectives').insert({
   syllabus_id:s.id,tenant_id:tenant,objective_code:objCode.trim(),objective_text:objTitle.trim(),
   topic:objTopic.trim(),display_order:next
  });
  setBusy(false);
  if(e)return toast.error('Learning objective was not saved: '+e.message);
  setObjCode('');setObjTitle('');setObjTopic('');await reload();
 };
 const approve=async(s:Syllabus)=>{
  if(!window.confirm('Approve this syllabus for UniPathway teaching only? This will not authorise official examination entries or qualification awards.'))return;
  setBusy(true);
  const {error:e}=await db.rpc('approve_unipathway_teaching_syllabus',{p_syllabus:s.id});
  setBusy(false);
  if(e)return toast.error('Academic review rejected: '+e.message);
  toast.success('Syllabus approved for local teaching and mock preparation.');await reload();
 };
 const createMock=async(s:Syllabus)=>{
  if(!tenant||mockTitle.trim().length<5){toast.error('Enter a mock exam title');return;}
  setBusy(true);
  const {error:e}=await db.from('unipathway_mock_exam_events').insert({
   tenant_id:tenant,syllabus_id:s.id,title:mockTitle.trim(),created_by:userId,
   duration_minutes:mockDuration,starts_at:mockStart?new Date(mockStart).toISOString():null,status:'draft'
  });setBusy(false);
  if(e)return toast.error('Mock schedule draft failed: '+e.message);
  setMockTitle('');setMockStart('');await reload();
 };
 const publishMock=async(id:string)=>{
  setBusy(true);
  const {error:e}=await db.rpc('publish_unipathway_mock',{p_mock:id});
  setBusy(false);
  if(e)return toast.error('Mock approval blocked: '+e.message);
  await reload();
 };
 const selectedSyllabus=syllabuses.find(s=>s.id===selected)||null;
 return <DashboardLayout title="Curriculum & Examination Readiness" subtitle="Map each board, qualification, syllabus version and exam-specific learning outcomes">
  <section className="mb-5 rounded-xl border bg-primary/5 p-4">
   <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5"/>Teaching readiness is not examination authorisation</h2>
   <p className="mt-2 text-sm text-muted-foreground">Plan school examinations, language courses, professional certifications, practical qualifications and regulated diplomas separately. Record their current official syllabus versions and evidence sources. Management may approve UniPathway teaching and internal mock exams, never claim external exam registrations or awarding-body accreditation from this page.</p>
  </section>
  {loading&&<p role="status">Loading curriculum mappings…</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4">{error}. This staging feature requires database and role acceptance testing.</p>}
  {!loading&&!error&&<div className="space-y-7">
   <section className="rounded-xl border bg-card p-5"><h2 className="flex items-center gap-2 font-semibold"><Plus className="size-5"/>Register a syllabus draft</h2>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
     <label className="text-sm font-medium">Department<select value={family} onChange={e=>setFamily(e.target.value as typeof family)} className="mt-1 w-full rounded-md border bg-background p-2">{centrePathwayFamilies.map(f=><option key={f}>{f}</option>)}</select></label>
     <label className="text-sm font-medium">LMS teaching module<select value={moduleId} onChange={e=>setModuleId(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2"><option value="">Choose module</option>{modules.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
     <label className="text-sm font-medium">Exam board / awarding body<Input className="mt-1" maxLength={160} value={body} onChange={e=>setBody(e.target.value)} placeholder="e.g. FBISE, Cambridge International, relevant provider"/></label>
     <label className="text-sm font-medium">Exam / qualification name<Input className="mt-1" maxLength={160} value={exam} onChange={e=>setExam(e.target.value)} placeholder="e.g. HSSC Part I"/></label>
     <label className="text-sm font-medium">Subject<Input className="mt-1" maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Physics"/></label>
     <label className="text-sm font-medium">Specification version / academic year<Input className="mt-1" maxLength={120} value={version} onChange={e=>setVersion(e.target.value)} placeholder="Board-published syllabus identifier"/></label>
     <label className="text-sm font-medium">Grading approach<select className="mt-1 w-full rounded-md border bg-background p-2" value={grading} onChange={e=>setGrading(e.target.value)}>{[
      ['board_marks','Pakistan board marks'],['cambridge_grade','Cambridge grading'],['cefr_skill_band','CEFR / language skills'],['professional_pass','Professional certification pass/refer'],['competency','Competency evidence'],['weighted_rubric','Weighted assessment'],['awarding_body_specific','External awarding-body scheme']
     ].map(([id,text])=><option key={id} value={id}>{text}</option>)}</select></label>
     <label className="text-sm font-medium md:col-span-2">Official source, specification title or stable reference<Input className="mt-1" maxLength={1000} value={source} onChange={e=>setSource(e.target.value)} placeholder="Official syllabus reference and revision date"/></label>
    </div>
    <Button className="mt-3" onClick={create} disabled={busy||!moduleId}>Create draft</Button>
    <p className="mt-2 text-xs text-muted-foreground">Examples within this department: {choices.slice(0,3).map(p=>p.title).join(' · ')}. All records start unverified.</p>
   </section>
   <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Curriculum routes ({syllabuses.length})</h2>
     <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto">{syllabuses.map(s=><button key={s.id} className={`w-full rounded-lg border p-3 text-left text-sm ${selected===s.id?'border-primary bg-primary/5':''}`} onClick={()=>setSelected(s.id)}>
       <p className="font-semibold">{s.subject} · {s.examination}</p><p className="mt-1 text-xs text-muted-foreground">{s.awarding_body} · {s.specification_version} · {s.course_delivery_status.replace(/_/g,' ')}</p>
      </button>)}</div>
     {!syllabuses.length&&<p className="mt-3 text-sm text-muted-foreground">No syllabus records. Begin by selecting an assigned programme module above.</p>}
    </section>
    <section className="rounded-xl border bg-card p-5">
     {!selectedSyllabus?<div className="p-4 text-sm text-muted-foreground">Select a syllabus to map objectives, plan internal mocks and review teaching readiness.</div>:<>
      <h2 className="font-semibold">{selectedSyllabus.subject} — {selectedSyllabus.awarding_body}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{selectedSyllabus.specification_source}</p>
      <p className="mt-2 text-xs font-semibold">External examination authority: {selectedSyllabus.authorisation_status} · Exam registration: {selectedSyllabus.official_exam_registration_enabled?'Verified externally':'Not available through this portal'}</p>
      <h3 className="mt-5 font-semibold">Learning outcomes ({objectives.filter(o=>o.syllabus_id===selectedSyllabus.id).length})</h3>
      <div className="mt-2 space-y-2">{objectives.filter(o=>o.syllabus_id===selectedSyllabus.id).map(o=><article key={o.id} className="rounded-lg border p-3 text-sm"><strong>{o.objective_code}: {o.topic}</strong><p className="mt-1">{o.objective_text}</p></article>)}</div>
      {selectedSyllabus.course_delivery_status==='planned'&&<div className="mt-4 grid gap-2">
       <Input aria-label="Objective code" placeholder="LO1" value={objCode} onChange={e=>setObjCode(e.target.value)} maxLength={40}/>
       <Input aria-label="Topic" placeholder="Topic / paper unit" value={objTopic} onChange={e=>setObjTopic(e.target.value)} maxLength={120}/>
       <Textarea aria-label="Learning outcome" placeholder="What learners must demonstrate" value={objTitle} onChange={e=>setObjTitle(e.target.value)} maxLength={2000} rows={2}/>
       <Button size="sm" variant="outline" disabled={busy} onClick={()=>addObjective(selectedSyllabus)}>Add learning outcome</Button>
      </div>}
      {selectedSyllabus.course_delivery_status!=='approved_for_tuition'&&<Button className="mt-3" disabled={busy} onClick={()=>approve(selectedSyllabus)}><ClipboardCheck className="mr-1 size-4"/>Academic approval for teaching</Button>}
      <h3 className="mt-6 font-semibold">Internal mock exam timetable</h3>
      <div className="mt-2 space-y-2">{mocks.filter(m=>m.syllabus_id===selectedSyllabus.id).map(m=><div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><strong>{m.title}</strong><p className="text-xs text-muted-foreground">{m.status} · {m.starts_at?new Date(m.starts_at).toLocaleString():'Unscheduled'}</p></div>{m.status==='draft'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>publishMock(m.id)}>Approve mock</Button>}</div>)}</div>
      <div className="mt-3 grid gap-2">
       <Input aria-label="Mock exam title" placeholder="Mock Paper 1" maxLength={180} value={mockTitle} onChange={e=>setMockTitle(e.target.value)}/>
       <Input aria-label="Mock date and time" type="datetime-local" value={mockStart} onChange={e=>setMockStart(e.target.value)}/>
       <label className="text-sm">Duration (minutes)<Input type="number" min={15} max={360} value={mockDuration} onChange={e=>setMockDuration(Number(e.target.value))}/></label>
       <Button size="sm" disabled={busy} variant="outline" onClick={()=>createMock(selectedSyllabus)}>Create internal mock draft</Button>
      </div>
     </>}
    </section>
   </div>
  </div>}
 </DashboardLayout>;
}
