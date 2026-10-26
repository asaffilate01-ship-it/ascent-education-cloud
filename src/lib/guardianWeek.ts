import {pakistanDay} from './staffTasks';
export function guardianWeek(now=new Date()){
 const today=pakistanDay(now),date=new Date(today+'T00:00:00Z');const day=(date.getUTCDay()+6)%7;
 date.setUTCDate(date.getUTCDate()-day);const from=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+7);return {from,until:date.toISOString().slice(0,10)};
}
export function inGuardianWeek(value:string,week:ReturnType<typeof guardianWeek>){const date=value.length===10?value:pakistanDay(new Date(value));return date>=week.from&&date<week.until;}
export function guardianPath(path:string,learner:string){return learner?`${path}?${new URLSearchParams({learner})}`:path;}
