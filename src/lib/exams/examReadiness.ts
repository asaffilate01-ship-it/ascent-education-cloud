import {parseAcademicInstant,parseZonedAcademicTimestamp} from '@/lib/academicTime';

export interface ExamCalendarEvent {
 id:string; tenant_id:string; event_type:string; start_date:string|null;
 end_date?:string|null; location?:string|null; all_day?:boolean|null;
}

/** Recorded exam calendar appointments are hints, not candidate confirmations. */
const examInstant=(event:ExamCalendarEvent,value:unknown)=>
 event.all_day===true?parseAcademicInstant(value):parseZonedAcademicTimestamp(value);

function timeWindow(event:ExamCalendarEvent){
 if(event.all_day===true)return null;
 const start=examInstant(event,event.start_date),end=examInstant(event,event.end_date);
 return start!==null&&end!==null&&end>start?{start,end}:null;
}

function datesVerified(event:ExamCalendarEvent){
 const start=examInstant(event,event.start_date);
 const end=event.end_date?examInstant(event,event.end_date):
  event.all_day===true?start:null;
 return start!==null&&end!==null&&(event.all_day===true?end>=start:end>start);
}

function conflicting(a:ExamCalendarEvent,b:ExamCalendarEvent){
 if(a.id===b.id||a.tenant_id!==b.tenant_id||a.event_type!=='exam'||b.event_type!=='exam')return false;
 const venue=a.location?.trim().toLowerCase();
 if(!venue||venue!==b.location?.trim().toLowerCase())return false;
 const x=timeWindow(a),y=timeWindow(b);
 return !!x&&!!y&&x.start<y.end&&y.start<x.end;
}
export function examEventChecks(event:ExamCalendarEvent,events:readonly ExamCalendarEvent[]):string[]{
 const issues:string[]=[];
 if(!event.location?.trim())issues.push('venue not recorded');
 if(!datesVerified(event))issues.push('invalid start or finish date');
 if(events.some(other=>conflicting(event,other)))issues.push('possible same-venue time overlap');
 return issues;
}
/** Build the full readiness index once. A venue clash is a hint, not a
 * capacity, candidate, or official examination approval check.
 */
export function examReadinessIndex(events:readonly ExamCalendarEvent[]){
 const checks=new Map<string,string[]>();
 const groups=new Map<string,{id:string;start:number;end:number}[]>();
 let missingVenue=0,invalidDates=0,overlapPairs=0;
 if(new Set(events.map(e=>e.id)).size!==events.length)throw Error('Duplicate exam calendar records');
 for(const event of events){
  const issues:string[]=[];
  const venue=event.location?.trim().toLowerCase();
  if(!venue){missingVenue++;issues.push('venue not recorded');}
  if(!datesVerified(event)){invalidDates++;issues.push('invalid start or finish date');}
  checks.set(event.id,issues);
  const window=timeWindow(event);
  if(!venue||!window||event.event_type!=='exam')continue;
  const key=JSON.stringify([event.tenant_id,venue]);
  const group=groups.get(key)||[];
  group.push({id:event.id,...window});groups.set(key,group);
 }
 // Within each centre/venue, sort starts and ends once. Every ended
 // interval started earlier; intervals touching at endpoints do not clash.
 for(const group of groups.values()){
  group.sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));
  const ends=group.map(w=>w.end).sort((a,b)=>a-b);
  let ended=0,maxPreviousEnd=-Infinity;
  for(let i=0;i<group.length;i++){
   const w=group[i];
   while(ended<ends.length&&ends[ended]<=w.start)ended++;
   overlapPairs+=i-ended;
   if(maxPreviousEnd>w.start||(i+1<group.length&&group[i+1].start<w.end))
    checks.get(w.id)!.push('possible same-venue time overlap');
   maxPreviousEnd=Math.max(maxPreviousEnd,w.end);
  }
 }
 return {checks,summary:{total:events.length,missingVenue,invalidDates,overlapPairs}};
}
export function examReadinessSummary(events:readonly ExamCalendarEvent[]){
 // Preserve the existing helper's semantics for callers with duplicate IDs;
 // the authenticated dashboard instead rejects duplicates before indexing.
 if(new Set(events.map(e=>e.id)).size!==events.length){
  let overlapPairs=0;
  for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++)if(conflicting(events[i],events[j]))overlapPairs++;
  const checks=events.map(event=>examEventChecks(event,events));
  return {total:events.length,missingVenue:checks.filter(x=>x.includes('venue not recorded')).length,invalidDates:checks.filter(x=>x.includes('invalid start or finish date')).length,overlapPairs};
 }
 return examReadinessIndex(events).summary;
}

/** Defence-in-depth: a partial or inconsistent centre snapshot is never treated
 * as "no exams". The authenticated database/RLS remains the access authority.
 * Malformed *calendar time* is retained as a flagged event, not silently hidden.
 */
export function verifiedExamCalendarSnapshot<T extends ExamCalendarEvent & {title:string}>(
 raw:readonly T[],tenant:string,
):T[]{
 if(typeof tenant!=='string'||!tenant.trim()||tenant.length>128||
    !Array.isArray(raw)||raw.length>10000)
  throw Error('Exam calendar source could not be verified');
 const ids=new Set<string>();
 for(const candidate of raw){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
   throw Error('Exam calendar record could not be verified');
  const row=candidate as ExamCalendarEvent & {title:string};
  if(typeof row.id!=='string'||!row.id.trim()||row.id.length>128||ids.has(row.id)||
     row.tenant_id!==tenant||row.event_type!=='exam'||
     typeof row.title!=='string'||!row.title.trim()||row.title.length>300||
     (row.start_date!==null&&typeof row.start_date!=='string')||
     (row.end_date!==null&&row.end_date!==undefined&&typeof row.end_date!=='string')||
     (row.location!==null&&row.location!==undefined&&typeof row.location!=='string')||
     (row.all_day!==null&&row.all_day!==undefined&&typeof row.all_day!=='boolean'))
   throw Error('Exam calendar provenance or record type could not be verified');
  ids.add(row.id);
 }
 return [...raw];
}
