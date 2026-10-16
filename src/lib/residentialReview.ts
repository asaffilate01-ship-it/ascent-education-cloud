import { datedTeaching, scheduleResidentialCalendar, type CalendarDraft } from './residentialCalendar';
import { emptyVisitOperations, visitIdentity, type VisitOperations } from './residentialWorkspace';
import { accommodationSummary, validateAccommodation } from './residentialAccommodation';
import { teachingKey, validateSupport } from './residentialSupport';
export function reviewResidentialWorkspace(calendar:CalendarDraft,operations:Record<string,VisitOperations>){
 const schedule=scheduleResidentialCalendar(calendar);
 const obsolete=Object.keys(operations).filter(key=>!schedule.visits.some(v=>visitIdentity(v)===key));
 const visits=schedule.visits.map(visit=>{
  const op=operations[visitIdentity(visit)]||emptyVisitOperations(visit);
  const teaching=datedTeaching(visit);
  const assigned=new Set(op.support.allocations.filter(a=>a.tutor.trim()).map(a=>a.session));
  const missingTutors=teaching.filter(s=>!assigned.has(teachingKey(s))).length;
  const accommodation=accommodationSummary(visit,op.accommodation);
  const supportStudents=new Set(op.support.appointments.map(a=>a.student)).size;
  const errors=[...validateSupport(visit,op.support.appointments,op.support.allocations),...validateAccommodation(visit,op.accommodation)];
  return {visit,missingTutors,unallocatedStudents:accommodation.unallocated.length,supportStudents,supportMinutes:op.support.appointments.reduce((n,a)=>n+a.minutes,0),errors,
   status:errors.length?'Conflicts':missingTutors||accommodation.unallocated.length?'Allocations incomplete':'Entered allocations complete'};
 });
 return {visits,obsolete,unscheduled:schedule.missing,closuresReviewed:calendar.closuresReviewed};
}
export function residentialReviewCsv(calendar:CalendarDraft,operations:Record<string,VisitOperations>){
 const review=reviewResidentialWorkspace(calendar,operations);
 const rows:(string|number)[][]=[['Cohort','Visit','Start','End','Students','Teaching sessions without tutors','Students without rooms','Students with optional support','Support minutes','Conflicts','Allocation status','Closures reviewed','Unscheduled visits','Obsolete plans']];
 for(const r of review.visits)rows.push([r.visit.cohort,r.visit.visit,r.visit.start,r.visit.end,r.visit.students,r.missingTutors,r.unallocatedStudents,r.supportStudents,r.supportMinutes,r.errors.length,r.status,review.closuresReviewed?'Yes':'No',review.unscheduled.length,review.obsolete.length]);
 return rows.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\r\n');
}
