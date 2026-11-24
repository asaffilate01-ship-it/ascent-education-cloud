import {classDuration} from './classDuration';
export type WorkloadSlot={id:string;tenant_id:string;lecturer_id:string;day_of_week:number;start_time:string;end_time:string;effective_from:string;effective_until:string|null;is_active:boolean;recurrence:string};
const DAY=86400000;
function isoDay(value:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const t=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value?t:null;
}
const dateText=(n:number)=>new Date(n).toISOString().slice(0,10);
const weekday=(n:number)=>(new Date(n).getUTCDay()+6)%7+1;
export function firstWeeklyOccurrence(from:string,until:string|null,day:number):string|null{
 const a=isoDay(from),b=until?isoDay(until):null;
 if(a===null||(until&&b===null)||!Number.isInteger(day)||day<1||day>7)return null;
 const occurrence=a+((day-weekday(a)+7)%7)*DAY;
 return b!==null&&occurrence>b?null:dateText(occurrence);
}
export function projectedWeeklyLoad(slots:WorkloadSlot[], proposed:WorkloadSlot, replacingId?:string){
 const first=firstWeeklyOccurrence(proposed.effective_from,proposed.effective_until,proposed.day_of_week);
 const candidateMinutes=classDuration(proposed.start_time,proposed.end_time);
 if(!first||candidateMinutes===null)return null;
 const day=isoDay(first)!;
 const monday=day-(weekday(day)-1)*DAY,sunday=monday+6*DAY;
 let existingMinutes=0,count=0,unresolved=0;
 for(const s of slots){
  if(!s.is_active||s.id===replacingId||s.tenant_id!==proposed.tenant_id||s.lecturer_id!==proposed.lecturer_id)continue;
  const a=isoDay(s.effective_from),b=s.effective_until?isoDay(s.effective_until):null;
  if(a===null||(s.effective_until&&b===null)||(b!==null&&b<a)){unresolved++;continue;}
  if(a>sunday||(b!==null&&b<monday))continue;
  if(!Number.isInteger(s.day_of_week)||s.day_of_week<1||s.day_of_week>7){unresolved++;continue;}
  const occurrence=monday+(s.day_of_week-1)*DAY;
  if(occurrence<a||(b!==null&&occurrence>b))continue;
  const minutes=classDuration(s.start_time,s.end_time);
  if(s.recurrence!=='weekly'||minutes===null){unresolved++;continue;}
  existingMinutes+=minutes;count++;
 }
 return {weekStart:dateText(monday),weekEnd:dateText(sunday),existingMinutes,candidateMinutes,totalMinutes:existingMinutes+candidateMinutes,count:count+1,unresolved};
}
export type WeeklyLoad=NonNullable<ReturnType<typeof projectedWeeklyLoad>>;
export function displayTeachingMinutes(minutes:number){return Math.floor(minutes/60)+'h '+String(minutes%60).padStart(2,'0')+'m';}
export function roomCapacityPlan(capacity:string,attendees:string){
 const parse=(s:string)=>/^\d{1,4}$/.test(s.trim())?Number(s.trim()):null;
 const cap=parse(capacity),expected=parse(attendees);
 if(cap===null||cap<=0||expected===null)return null;
 return {capacity:cap,expected,remaining:Math.max(0,cap-expected),overflow:Math.max(0,expected-cap),groups:Math.max(1,Math.ceil(expected/cap))};
}
