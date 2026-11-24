import {clockMinutes} from './classDuration';
export const teachingDays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
type Range={start:number;end:number};
export function parseAvailability(value:unknown):Range[]|null{
 if(typeof value!=='string'||!value.trim())return null;
 if(/^unavailable$/i.test(value.trim()))return [];
 const ranges:Range[]=[];
 for(const part of value.split(/[,;]/)){
 const m=/^\s*(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})\s*$/.exec(part);
 if(!m)return null;
 const start=clockMinutes(m[1]),end=clockMinutes(m[2]);
 if(start===null||end===null||end<=start)return null;
 ranges.push({start,end});
 }
 return ranges;
}
export function availabilityFit(value:unknown,start:string,end:string,zone:unknown):'fits'|'outside'|'unknown'{
 if(zone!=='Asia/Karachi')return 'unknown';
 const ranges=parseAvailability(value),a=clockMinutes(start),b=clockMinutes(end);
 if(ranges===null||a===null||b===null||b<=a)return 'unknown';
 return ranges.some(r=>r.start<=a&&r.end>=b)?'fits':'outside';
}
export function weeklyLimit(value:unknown):number|null{
 if(typeof value!=='string'||!/^\d{1,3}(?:\.\d{1,2})?$/.test(value.trim()))return null;
 const n=Number(value);return n>0&&n<=168?n:null;
}
