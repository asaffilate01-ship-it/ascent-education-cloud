/**
 * Operational review signals, not AI grades, predictions or learner eligibility.
 * Only centre-scoped metadata is accepted. Keep this pure and provider-free.
 */
type TenantRow = {tenant_id:string|null};
type Enrolment = TenantRow & {student_id:string;status:string};
type Attendance = TenantRow & {student_id:string;status:string};
type Submission = TenantRow & {status:string};
type Module = TenantRow & {status:string;lecturer_id:string|null};

export type ReviewInputs = {
  enrolments:readonly Enrolment[];
  attendance:readonly Attendance[];
  submissions:readonly Submission[];
  modules:readonly Module[];
};
export type AcademicReviewSnapshot = {
  activeLearners:number;
  attendanceRecords:number;
  learnersWithRecordedAbsence:number;
  submittedCoursework:number;
  activeModules:number;
  modulesWithoutLecturer:number;
  evidenceAvailable:boolean;
};

/** Never accept grades, student names, medical data, CVs or contact details. */
export function academicReviewSnapshot(tenantId:string,records:ReviewInputs):AcademicReviewSnapshot {
  if(!tenantId) return {activeLearners:0,attendanceRecords:0,learnersWithRecordedAbsence:0,
    submittedCoursework:0,activeModules:0,modulesWithoutLecturer:0,evidenceAvailable:false};
  const inCentre=<T extends TenantRow>(rows:readonly T[])=>rows.filter(r=>r?.tenant_id===tenantId);
  const enrolled=new Set(inCentre(records.enrolments).filter(r=>r.status==='active'&&typeof r.student_id==='string'&&r.student_id.trim()).map(r=>r.student_id));
  const attend=inCentre(records.attendance).filter(r=>enrolled.has(r.student_id)&&['present','absent','late','excused'].includes(r.status));
  const absences=new Set(attend.filter(r=>r.status==='absent').map(r=>r.student_id));
  const modules=inCentre(records.modules).filter(r=>r.status==='active');
  const submissions=inCentre(records.submissions).filter(r=>r.status==='submitted');
  return {
    activeLearners:enrolled.size,
    attendanceRecords:attend.length,
    learnersWithRecordedAbsence:absences.size,
    submittedCoursework:submissions.length,
    activeModules:modules.length,
    modulesWithoutLecturer:modules.filter(r=>!r.lecturer_id?.trim()).length,
    evidenceAvailable:enrolled.size>0||attend.length>0||submissions.length>0||modules.length>0,
  };
}

/** Export only counts. The organisation and its staff retain all decisions. */
export function academicReviewBrief(snapshot:AcademicReviewSnapshot,asOf:string):string {
  return [
    'UniPathway centre operations — review brief',
    `Generated: ${asOf}`,
    '',
    'Centre-scoped evidence snapshot, not a prediction or qualification decision.',
    `Active learners (unique): ${snapshot.activeLearners}`,
    `Attendance observations for active learners: ${snapshot.attendanceRecords}`,
    `Learners with a recorded absence: ${snapshot.learnersWithRecordedAbsence}`,
    `Coursework submissions awaiting review: ${snapshot.submittedCoursework}`,
    `Active modules: ${snapshot.activeModules}`,
    `Active modules without a lecturer: ${snapshot.modulesWithoutLecturer}`,
    '',
    'Review actions: check official attendance records and correction requests; allocate',
    'module lecturers; review submission queues; confirm source coverage with centre staff.',
    'A zero may mean no recorded evidence. It is not proof of attendance, wellbeing,',
    'course completion, academic success or university eligibility.',
    'No grades, personal details, learner identifiers or health records are included.',
  ].join('\n');
}
