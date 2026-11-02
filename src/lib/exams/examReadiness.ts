export interface ExamCalendarEvent {
 id:string; tenant_id:string; event_type:string; start_date:string|null;
 end_date?:string|null; location?:string|null; all_day?:boolean|null;
}
function timeWindow(event:ExamCalendarEvent){
 if(event.all_day||!event.start_date||!event.end_date)return null;
 const start=Date.parse(event.start_date),end=Date.parse(event.end_date);
 return Number.isFinite(start)&&Number.isFinite(end)&&end>start?{start,end}:null;
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
 if(!event.start_date||!Number.isFinite(Date.parse(event.start_date))||
  (event.end_date!=null&&(!Number.isFinite(Date.parse(event.end_date))||Date.parse(event.end_date)<=Date.parse(event.start_date))))issues.push('invalid start or finish date');
 if(events.some(other=>conflicting(event,other)))issues.push('possible same-venue time overlap');
 return issues;
}
export function examReadinessSummary(events:readonly ExamCalendarEvent[]){
 let overlapPairs=0;
 for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++)if(conflicting(events[i],events[j]))overlapPairs++;
 const checks=events.map(event=>examEventChecks(event,events));
 return {total:events.length,missingVenue:checks.filter(x=>x.includes('venue not recorded')).length,
  invalidDates:checks.filter(x=>x.includes('invalid start or finish date')).length,overlapPairs};
}
