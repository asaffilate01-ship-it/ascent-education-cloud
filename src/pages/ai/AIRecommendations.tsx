import {useMemo} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,BookOpenCheck,ClipboardCheck,Download,GraduationCap,ShieldCheck,UserRoundCheck} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {academicReviewBrief,academicReviewSnapshot} from '@/lib/academicReviewSignals';
import {downloadText} from '@/lib/downloadText';

/**
 * This is an operational briefing, not an automated learner assessment.
 * Never use legacy unmoderated submission.grade values for academic decisions.
 * Nothing here invokes an external model or creates a student intervention.
 */
export default function AIRecommendations(){
 const {user}=useAuth();
 // RoleGuard protects the route; active-role and tenant checks also disable queries
 // if someone with multiple assigned roles changes workspace without navigating.
 const permitted=Boolean(user?.tenantId&&user.roles?.includes(user.role)&&
  (user.role==='superadmin'||user.role==='centre_director'));
 const tenant=user?.tenantId||'';
 const filters=[{column:'tenant_id',operator:'eq' as const,value:tenant}];
 const enrolments=useSupabaseQuery('student_enrolments',{enabled:permitted,select:'student_id,tenant_id,status',filters:[...filters,{column:'status',operator:'eq',value:'active'}]});
 const attendance=useSupabaseQuery('attendance_records',{enabled:permitted,select:'student_id,tenant_id,status',filters});
 const submissions=useSupabaseQuery('submissions',{enabled:permitted,select:'id,tenant_id,status',filters:[...filters,{column:'status',operator:'eq',value:'submitted'}]});
 const modules=useSupabaseQuery('modules',{enabled:permitted,select:'id,tenant_id,status,lecturer_id',filters});
 const queries=[enrolments,attendance,submissions,modules];
 const busy=permitted&&queries.some(q=>q.loading);
 const failed=permitted&&!busy&&queries.some(q=>Boolean(q.error));
 const snapshot=useMemo(()=>academicReviewSnapshot(tenant,{
  enrolments:enrolments.data,attendance:attendance.data,submissions:submissions.data,modules:modules.data,
 }),[tenant,enrolments.data,attendance.data,submissions.data,modules.data]);
 const ready=permitted&&!busy&&!failed;
 const reviewActions=[
  {title:'Check attendance exceptions',detail:'Review recorded absences and correction requests before contacting a learner.',value:snapshot.learnersWithRecordedAbsence,label:'learners with absence records',href:'/director/attendance-corrections'},
  {title:'Review submitted coursework',detail:'Check the marking queue and permitted assessor allocation; do not infer results from draft marks.',value:snapshot.submittedCoursework,label:'submissions in the queue',href:'/director/assessment-management'},
  {title:'Confirm module teaching cover',detail:'Assign authorised lecturers to active modules; verify timetables separately.',value:snapshot.modulesWithoutLecturer,label:'modules without lecturer',href:'/director/programmes'},
 ];
 return <DashboardLayout title="Academic operations insights" subtitle="Evidence-backed operational signals for centre leadership, with human review at every decision">
  {!permitted?<section className="rounded-2xl border bg-card p-6" role="alert">
    <h2 className="font-semibold">Centre leadership access required</h2>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Switch to an assigned centre director or superadmin role with a verified centre context. No learner records were requested.</p>
   </section>:
   <div className="space-y-7">
    <header className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-8">
     <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-success">Centre operations</p>
      <h2 className="mt-2 max-w-2xl text-xl font-bold leading-snug sm:text-2xl">A clearer picture of the work needing attention.</h2>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">These counts come from the records available to your authorised centre account. They support staff planning, not learner risk scoring, qualification grading or university eligibility decisions.</p>
      {ready&&<div className="mt-5 flex flex-wrap items-center gap-3">
       <Button onClick={()=>downloadText('unipathway-centre-review-brief.txt',academicReviewBrief(snapshot,new Date().toISOString()))} className="min-h-11">
        <Download className="mr-2 size-4" aria-hidden="true"/>Download de-identified brief
       </Button>
       <p className="text-xs text-muted-foreground">Counts only. No student names or grades in the export.</p>
      </div>}
     </div>
     <div className="mt-6 border-t pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
      <ShieldCheck aria-hidden="true" className="size-6 text-success"/>
      <h3 className="mt-3 text-sm font-bold">Clear evidence boundaries</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Missing records are not treated as zero marks or proof that everything is fine. No identifiable learner data is sent to an AI provider from this screen.</p>
      <Link to={user?.role==='superadmin'?'/landlord/readiness':'/director/readiness'} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Review integration readiness <ArrowRight aria-hidden="true" className="size-4"/></Link>
     </div>
    </header>
    {busy&&<section role="status" className="rounded-2xl border bg-card p-6">Checking centre records and access permissions…</section>}
    {failed&&<section className="rounded-2xl border bg-card p-6" role="alert">
     <h2 className="font-semibold">Operational evidence could not be verified</h2>
     <p className="mt-2 max-w-xl text-sm text-muted-foreground">One or more source queries failed. No partial figures or reassuring zeroes are shown.</p>
     <Button className="mt-4 min-h-11" variant="outline" onClick={()=>queries.forEach(q=>void q.refetch())}>Retry centre records</Button>
    </section>}
    {ready&&<>
     {!snapshot.evidenceAvailable&&<section className="rounded-xl border bg-card p-5" role="status"><p className="font-semibold">No scoped operational records were returned</p><p className="mt-1 text-sm text-muted-foreground">This does not establish that every learner is attending, assignments are complete, or the centre is ready. Confirm source access and enrolment setup.</p></section>}
     <section aria-labelledby="review-overview">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 id="review-overview" className="text-lg font-bold">Centre snapshot</h2><p className="text-xs text-muted-foreground">Verified query responses · counts only</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
       {[
        {label:'Active learners',value:snapshot.activeLearners,description:'Unique learners with active centre enrolments',icon:GraduationCap},
        {label:'Attendance follow-ups',value:snapshot.learnersWithRecordedAbsence,description:'Enrolled learners with at least one recorded absence',icon:UserRoundCheck},
        {label:'Submissions to review',value:snapshot.submittedCoursework,description:'Legacy submission records marked submitted',icon:ClipboardCheck},
        {label:'Teaching cover to check',value:snapshot.modulesWithoutLecturer,description:'Active modules with no assigned lecturer',icon:BookOpenCheck},
       ].map(item=><article key={item.label} className="rounded-xl border border-border/70 bg-card p-5">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{item.label}</p><item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/></div>
        <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight">{item.value}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
       </article>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{snapshot.attendanceRecords} recorded attendance observations across {snapshot.activeModules} active modules. These are operational records, not complete academic outcomes.</p>
     </section>
     <section aria-labelledby="review-actions">
      <h2 id="review-actions" className="text-lg font-bold">Review priorities</h2>
      <p className="mt-1 text-sm text-muted-foreground">Open the authoritative staff workflow for evidence and decisions. This dashboard does not approve, flag or contact students automatically.</p>
      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
       {reviewActions.map((a,index)=><article key={a.title} className="flex flex-col gap-3 border-b border-border/70 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-4">
         <span aria-hidden="true" className="pt-0.5 text-sm font-semibold tabular-nums text-muted-foreground">0{index+1}</span>
         <div className="min-w-0"><h3 className="text-sm font-bold">{a.title}</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{a.detail}</p><p className="mt-2 text-xs font-medium text-foreground">{a.value} {a.label}</p></div>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border px-3 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-center" to={a.href}>Open records <ArrowRight className="size-4" aria-hidden="true"/></Link>
       </article>)}
      </div>
     </section>
    </>}
   </div>}
 </DashboardLayout>;
}
