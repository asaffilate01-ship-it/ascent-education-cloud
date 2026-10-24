import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import type {EducationTables} from '@/integrations/supabase/education-types';
import {workflowRows} from '@/lib/workflowRows';
import IntelligenceCalculations from '@/components/progression/IntelligenceCalculations';
import FactoryOperations from '@/components/progression/FactoryOperations';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
type Student=Pick<EducationTables['omniqora_student_intelligence']['Row'],'id'|'student_id'|'risk_score'|'attendance_score'|'engagement_score'|'assessment_score'|'calculated_at'|'human_review_status'|'model_version'>;
type Executive=EducationTables['omniqora_executive_snapshots']['Row'];
type Course=Pick<EducationTables['omniqora_cohort_intelligence']['Row'],'id'|'course_id'|'cohort_reference'|'completion_rate'|'attendance_rate'|'resubmission_rate'|'calculated_at'|'learner_count'|'high_attention_count'>;
export default function EducationIntelligence(){
 const {user}=useAuth();const allowed=user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 return <DashboardLayout title="Omniqora Education Intelligence" subtitle="Recorded student and course signals for staff review">{!allowed?<p role="alert">Centre management access is required.</p>:!user?.tenantId?<p role="alert">A centre assignment is required.</p>:<><FactoryOperations/><Signals key={`${user.tenantId}-${user.id}-${user.roles.join(',')}`} tenant={user.tenantId}/></>}</DashboardLayout>;
}
function Signals({tenant}:{tenant:string}){
 const [revision,setRevision]=useState(0);
 return <><IntelligenceCalculations tenant={tenant} onCalculated={()=>setRevision(n=>n+1)}/><SnapshotRecords tenant={tenant} revision={revision}/></>;
}
function SnapshotRecords({tenant,revision}:{tenant:string;revision:number}){
 const [executive,setExecutive]=useState<Executive|null>(null);
 const [students,setStudents]=useState<Student[]>([]),[courses,setCourses]=useState<Course[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[studentPage,setStudentPage]=useState(0),[coursePage,setCoursePage]=useState(0);const generation=useRef(0);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);setError('');setStudents([]);setCourses([]);setExecutive(null);
  const current=()=>token===generation.current;
  const [a,b,c]=await Promise.all([
   workflowRows(supabase,'omniqora_student_intelligence',tenant,current,'id,student_id,risk_score,attendance_score,engagement_score,assessment_score,calculated_at,human_review_status,model_version','risk_score'),
   workflowRows(supabase,'omniqora_cohort_intelligence',tenant,current,'id,course_id,cohort_reference,completion_rate,attendance_rate,resubmission_rate,calculated_at,learner_count,high_attention_count','calculated_at'),
   workflowRows(supabase,'omniqora_executive_snapshots',tenant,current,'*','snapshot_date')
  ]);
  if(!current())return;
  if(a.error||b.error||c.error)setError('Intelligence records could not be loaded completely. Check access and migrations, then retry.');
  else{setStudents(a.data as Student[]);setCourses(b.data as Course[]);setExecutive((c.data[0] as Executive)||null);setStudentPage(0);setCoursePage(0);}
  setLoading(false);
 },[tenant]);
 useEffect(()=>{const reads=generation;void load();return()=>{reads.current++;};},[load,revision]);
 if(loading)return <p role="status">Loading intelligence records…</p>;
 if(error)return <div className="space-y-3"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry intelligence records</Button></div>;
 return <div className="space-y-4"><div className="grid sm:grid-cols-3 gap-3">{[['Student records',students.length],['Recorded attendance risk 70+',students.filter(s=>s.model_version==='recorded-attendance-v2'&&s.risk_score>=70).length],['Cohort records',courses.length]].map(([label,value])=><div className="surface-card p-4" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
 <p className="text-sm text-muted-foreground">These are stored snapshots, not live calculations. Check each calculation date and human review status. Processing local events or receiving a Factory receipt does not refresh these scores.</p>
 <section className="surface-card p-4 space-y-2"><h2 className="font-semibold">Latest centre summary</h2>{executive?<><p>Snapshot date: {executive.snapshot_date}</p><p>Active learners: {executive.learners} · Active courses: {executive.active_courses} · High attention: {executive.high_attention}</p><p>Recorded attendance: {executive.attendance_rate??'Not available'} · Completion: {executive.completion_rate??'Not available'} · Engagement: {executive.engagement_score??'Not available'}</p><p>Open interventions: {executive.open_interventions} · Completed labs: {executive.labs_completed} · Completed placements: {executive.placements_completed}</p><p className="text-sm text-muted-foreground">Attendance covers recorded centre marks through the snapshot date. High attention uses stored attendance signals for active learners and excludes learners without scores.</p></>:<p>No centre summary has been calculated.</p>}</section>
 <div className="grid lg:grid-cols-2 gap-4"><section className="surface-card p-4 space-y-3"><h2 className="font-semibold">Student review queue</h2>{!students.length&&<p>No student intelligence records have been calculated.</p>}{students.slice(studentPage*20,studentPage*20+20).map(s=><article key={s.id} className="border rounded p-3 space-y-1 text-sm"><p className="break-all">Student: {s.student_id}</p><p>{s.model_version==='recorded-attendance-v2'?'Recorded attendance risk':'Legacy recorded risk score'}: {s.risk_score} · Review: {s.human_review_status}</p><p>Model: {s.model_version??'Unknown legacy model'}. Attendance risk is 100 minus recorded attendance percentage; it is not an overall learner risk assessment.</p><p>Attendance {s.attendance_score??'Not available'} · Engagement {s.engagement_score??'Not available'} · Assessment {s.assessment_score??'Not available'}</p><p>Calculated: {new Date(s.calculated_at).toLocaleString()}</p></article>)}<div className="flex gap-2"><Button variant="outline" disabled={studentPage===0} onClick={()=>setStudentPage(p=>p-1)}>Previous students</Button><Button variant="outline" disabled={(studentPage+1)*20>=students.length} onClick={()=>setStudentPage(p=>p+1)}>Next students</Button></div></section>
 <section className="surface-card p-4 space-y-3"><h2 className="font-semibold">Course cohort signals</h2>{!courses.length&&<p>No cohort intelligence records have been calculated.</p>}{courses.slice(coursePage*20,coursePage*20+20).map(c=><article key={c.id} className="border rounded p-3 space-y-1 text-sm"><p className="break-all">Course: {c.course_id}</p>{c.cohort_reference&&<p>Cohort: {c.cohort_reference}</p>}<p>Enrolled learners: {c.learner_count} · High attention: {c.high_attention_count}</p><p>Completion {c.completion_rate??'Not available'} · Attendance {c.attendance_rate??'Not available'} · Resubmission {c.resubmission_rate??'Not available'}</p><p>Calculated: {new Date(c.calculated_at).toLocaleString()}</p></article>)}<div className="flex gap-2"><Button variant="outline" disabled={coursePage===0} onClick={()=>setCoursePage(p=>p-1)}>Previous courses</Button><Button variant="outline" disabled={(coursePage+1)*20>=courses.length} onClick={()=>setCoursePage(p=>p+1)}>Next courses</Button></div></section></div>
 <Button variant="outline" onClick={()=>void load()}>Refresh intelligence records</Button></div>;
}
