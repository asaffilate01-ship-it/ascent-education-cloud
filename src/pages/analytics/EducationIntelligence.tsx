import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import type {EducationTables} from '@/integrations/supabase/education-types';
import {workflowRows} from '@/lib/workflowRows';
import FactoryOperations from '@/components/progression/FactoryOperations';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
type Student=Pick<EducationTables['omniqora_student_intelligence']['Row'],'id'|'student_id'|'risk_score'|'attendance_score'|'engagement_score'|'assessment_score'|'calculated_at'|'human_review_status'>;
type Course=Pick<EducationTables['omniqora_course_intelligence']['Row'],'id'|'course_id'|'cohort_reference'|'completion_rate'|'attendance_rate'|'resubmission_rate'|'calculated_at'>;
export default function EducationIntelligence(){
 const {user}=useAuth();const allowed=user?.roles.some(r=>['superadmin','centre_director'].includes(r));
 return <DashboardLayout title="Omniqora Education Intelligence" subtitle="Recorded student and course signals for staff review">{!allowed?<p role="alert">Centre management access is required.</p>:!user?.tenantId?<p role="alert">A centre assignment is required.</p>:<><FactoryOperations/><Signals key={`${user.tenantId}-${user.id}`} tenant={user.tenantId}/></>}</DashboardLayout>;
}
function Signals({tenant}:{tenant:string}){
 const [students,setStudents]=useState<Student[]>([]),[courses,setCourses]=useState<Course[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[studentPage,setStudentPage]=useState(0),[coursePage,setCoursePage]=useState(0);const generation=useRef(0);
 const load=useCallback(async()=>{
  const token=++generation.current;setLoading(true);setError('');setStudents([]);setCourses([]);
  const current=()=>token===generation.current;
  const [a,b]=await Promise.all([
   workflowRows(supabase,'omniqora_student_intelligence',tenant,current,'id,student_id,risk_score,attendance_score,engagement_score,assessment_score,calculated_at,human_review_status','risk_score'),
   workflowRows(supabase,'omniqora_course_intelligence',tenant,current,'id,course_id,cohort_reference,completion_rate,attendance_rate,resubmission_rate,calculated_at','calculated_at')
  ]);
  if(!current())return;
  if(a.error||b.error)setError('Intelligence records could not be loaded completely. Check access and migrations, then retry.');
  else{setStudents(a.data as Student[]);setCourses(b.data as Course[]);setStudentPage(0);setCoursePage(0);}
  setLoading(false);
 },[tenant]);
 useEffect(()=>{void load();return()=>{generation.current++;};},[load]);
 if(loading)return <p role="status">Loading intelligence records…</p>;
 if(error)return <div className="space-y-3"><p role="alert">{error}</p><Button onClick={()=>void load()}>Retry intelligence records</Button></div>;
 return <div className="space-y-4"><div className="grid sm:grid-cols-3 gap-3">{[['Student records',students.length],['Recorded risk score 70+',students.filter(s=>s.risk_score>=70).length],['Course records',courses.length]].map(([label,value])=><div className="surface-card p-4" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
 <p className="text-sm text-muted-foreground">These are stored snapshots, not live calculations. Check each calculation date and human review status. Processing local events or receiving a Factory receipt does not refresh these scores.</p>
 <div className="grid lg:grid-cols-2 gap-4"><section className="surface-card p-4 space-y-3"><h2 className="font-semibold">Student review queue</h2>{!students.length&&<p>No student intelligence records have been calculated.</p>}{students.slice(studentPage*20,studentPage*20+20).map(s=><article key={s.id} className="border rounded p-3 space-y-1 text-sm"><p className="break-all">Student: {s.student_id}</p><p>Recorded risk score: {s.risk_score} · Review: {s.human_review_status}</p><p>Attendance {s.attendance_score??'Not available'} · Engagement {s.engagement_score??'Not available'} · Assessment {s.assessment_score??'Not available'}</p><p>Calculated: {new Date(s.calculated_at).toLocaleString()}</p></article>)}<div className="flex gap-2"><Button variant="outline" disabled={studentPage===0} onClick={()=>setStudentPage(p=>p-1)}>Previous students</Button><Button variant="outline" disabled={(studentPage+1)*20>=students.length} onClick={()=>setStudentPage(p=>p+1)}>Next students</Button></div></section>
 <section className="surface-card p-4 space-y-3"><h2 className="font-semibold">Course and cohort signals</h2>{!courses.length&&<p>No course intelligence records have been calculated.</p>}{courses.slice(coursePage*20,coursePage*20+20).map(c=><article key={c.id} className="border rounded p-3 space-y-1 text-sm"><p className="break-all">Course: {c.course_id}</p>{c.cohort_reference&&<p>Cohort: {c.cohort_reference}</p>}<p>Completion {c.completion_rate??'Not available'} · Attendance {c.attendance_rate??'Not available'} · Resubmission {c.resubmission_rate??'Not available'}</p><p>Calculated: {new Date(c.calculated_at).toLocaleString()}</p></article>)}<div className="flex gap-2"><Button variant="outline" disabled={coursePage===0} onClick={()=>setCoursePage(p=>p-1)}>Previous courses</Button><Button variant="outline" disabled={(coursePage+1)*20>=courses.length} onClick={()=>setCoursePage(p=>p+1)}>Next courses</Button></div></section></div>
 <Button variant="outline" onClick={()=>void load()}>Refresh intelligence records</Button></div>;
}
