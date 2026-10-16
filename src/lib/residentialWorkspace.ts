import { z } from 'zod';
import { calendarDraftSchema, scheduleResidentialCalendar, type CalendarDraft, type CalendarVisit } from './residentialCalendar';
import { parseSupportPlan, validateSupport, type SupportAppointment, type TeachingAllocation } from './residentialSupport';
import { parseAccommodation, validateAccommodation, type AccommodationPlan } from './residentialAccommodation';
export type VisitOperations={visit:CalendarVisit;support:{appointments:SupportAppointment[];allocations:TeachingAllocation[]};accommodation:AccommodationPlan};
export const visitIdentity=(v:CalendarVisit)=>`${v.cohort}/${v.visit}/${v.start}/${v.end}/${v.students}`;
export const emptyVisitOperations=(visit:CalendarVisit):VisitOperations=>({visit,support:{appointments:[],allocations:[]},accommodation:{version:1,rooms:[],allocations:[]}});
const envelope=z.object({version:z.literal(1),calendar:calendarDraftSchema,operations:z.array(z.object({visit:z.object({cohort:z.number(),visit:z.number(),students:z.number(),start:z.string(),end:z.string()}).strict(),support:z.object({appointments:z.array(z.unknown()).max(600),allocations:z.array(z.unknown()).max(50)}).strict(),accommodation:z.unknown()}).strict()).max(100)}).strict();
export function parseResidentialWorkspace(raw:string){
 if(raw.length>3000000)throw Error('Workspace exceeds 3 MB.');
 const input=envelope.parse(JSON.parse(raw));
 const visits=scheduleResidentialCalendar(input.calendar).visits;
 const seen=new Set<string>();
 const operations:Record<string,VisitOperations>={};
 for(const item of input.operations){
  const visit=visits.find(v=>visitIdentity(v)===visitIdentity(item.visit as CalendarVisit));
  if(!visit)throw Error('Workspace contains a visit that no longer matches the calendar.');
  const key=visitIdentity(visit);if(seen.has(key))throw Error('Duplicate visit in workspace.');seen.add(key);
  const support=parseSupportPlan(JSON.stringify({...item.support,version:1,visit}),visit);
  const accommodation=parseAccommodation(JSON.stringify({visit,plan:item.accommodation}),visit);
  operations[key]={visit,support:{appointments:support.appointments,allocations:support.allocations},accommodation};
 }
 return {calendar:{...input.calendar,closuresReviewed:false},operations};
}
export function serializeResidentialWorkspace(calendar:CalendarDraft,operations:Record<string,VisitOperations>){
 const raw=JSON.stringify({version:1,calendar,operations:Object.values(operations)},null,2);
 // Reuse import validation so invalid/clashing edits cannot masquerade as a valid saved workspace.
 parseResidentialWorkspace(raw);return raw;
}
export function operationsIssues(operations:Record<string,VisitOperations>){
 return Object.values(operations).flatMap(o=>[...validateSupport(o.visit,o.support.appointments,o.support.allocations),...validateAccommodation(o.visit,o.accommodation)]);
}
