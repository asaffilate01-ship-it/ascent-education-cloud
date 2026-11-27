import {foldCalendarLine} from './admissionsCalendar';
import {pakistanCalendarDate,validCalendarDate} from './facilitiesPlanning';
import type {MaintenanceRow} from './facilitiesMaintenance';

export const reminderHorizons=[7,30,90] as const;
export type ReminderHorizon=typeof reminderHorizons[number];
export type ReminderDate={date:string;count:number};
const validDate=(date:string)=>!date.startsWith('0000-')&&validCalendarDate(date);

/** Group dated assets without disclosing their locations, codes, or observations. */
export function facilitiesReminderDates(rows:readonly MaintenanceRow[],today:string,horizon:ReminderHorizon):ReminderDate[]{
 if(!validDate(today)||!reminderHorizons.includes(horizon)||rows.length>500)throw Error('Invalid maintenance calendar selection.');
 const end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+horizon);
 const last=end.toISOString().slice(0,10);
 const counts=new Map<string,number>(),seen=new Set<string>();
 for(const row of rows){
  if(!row.asset.id||seen.has(row.asset.id))throw Error('Unverified maintenance calendar entries.');
  seen.add(row.asset.id);
  if(!row.dueDate)continue;
  if(!validDate(row.dueDate))throw Error('Unverified inspection date.');
  if(row.dueDate>=today&&row.dueDate<=last)counts.set(row.dueDate,(counts.get(row.dueDate)??0)+1);
 }
 return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count}));
}

/** All-day dates with optional display alarms. An export is never a sent notification. */
export function buildFacilitiesReminderCalendar(rows:readonly MaintenanceRow[],horizon:ReminderHorizon,alarmDays:0|1|7,exportId:string,now=new Date()):string{
 if(!Number.isFinite(now.getTime())||![0,1,7].includes(alarmDays)||!/^[a-f0-9-]{36}$/i.test(exportId))throw Error('Invalid calendar export settings.');
 const dates=facilitiesReminderDates(rows,pakistanCalendarDate(now),horizon);
 if(!dates.length)throw Error('There are no upcoming inspection dates to export.');
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UniPathway//Facilities inspection planning//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:UniPathway inspection review dates'];
 for(const item of dates){
  const day=item.date.replace(/-/g,'');
  lines.push('BEGIN:VEVENT','UID:'+exportId+'-'+day+'@facilities.unipathway.pk','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+day,'SUMMARY:Review scheduled centre inspections','DESCRIPTION:Review the current authorised facilities register. This reminder is not a confirmed inspection or safety clearance.','TRANSP:TRANSPARENT');
  if(alarmDays)lines.push('BEGIN:VALARM','TRIGGER:-P'+alarmDays+'D','ACTION:DISPLAY','DESCRIPTION:Review scheduled inspections','END:VALARM');
  lines.push('END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(foldCalendarLine).join('\r\n')+'\r\n';
}
