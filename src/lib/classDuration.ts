// Timetables are stored as same-day Pakistan local wall-clock times.
export function clockMinutes(value:string):number|null{
 const match=/^(\d{2}):(\d{2})(?::00)?$/.exec(value);
 if(!match)return null;
 const hours=Number(match[1]),minutes=Number(match[2]);
 return hours<24&&minutes<60?hours*60+minutes:null;
}
export function classEnd(start:string,duration:number):string|null{
 const minute=clockMinutes(start);
 if(minute===null||!Number.isInteger(duration)||duration<1||minute+duration>=1440)return null;
 const end=minute+duration;
 return String(Math.floor(end/60)).padStart(2,'0')+':'+String(end%60).padStart(2,'0');
}
export function classDuration(start:string,end:string):number|null{
 const a=clockMinutes(start),b=clockMinutes(end);
 return a===null||b===null||b<=a?null:b-a;
}
