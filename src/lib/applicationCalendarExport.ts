import {validateDeadline,type DeadlineRecord} from './scholarshipResearch';

const textEncoder=new TextEncoder();
function escapeCalendarText(value:string){
 return value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g,'');
}
/** iCalendar folds content lines at 75 UTF-8 octets, without splitting code points. */
function foldLine(line:string):string{
 const lines:string[]=[];
 let part='',bytes=0;
 for(const character of line){
  const size=textEncoder.encode(character).length;
  if(bytes+size>75){lines.push(part);part=' ';bytes=1;}
  part+=character;bytes+=size;
 }
 lines.push(part);
 return lines.join('\r\n');
}
export function calendarEligibleRecords(records:readonly DeadlineRecord[],today:string):DeadlineRecord[]{
 const used=new Set<string>();
 return records.filter(record=>{
  if(record.completed||record.date<today||!validateDeadline(record)||!/^[-a-zA-Z0-9]{1,80}$/.test(record.id)||used.has(record.id))return false;
  used.add(record.id);return true;
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
export function buildApplicationCalendar(records:readonly DeadlineRecord[],today:string,reminder:boolean,now=new Date()):string{
 const entries=calendarEligibleRecords(records,today);
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UniPathway//Application planning//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const entry of entries){
  lines.push('BEGIN:VEVENT','UID:'+entry.id+'@planning.unipathway.pk','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+entry.date.replace(/-/g,''),'SUMMARY:'+escapeCalendarText(entry.kind+': '+entry.title),'DESCRIPTION:'+escapeCalendarText('Personal planning date only. Verify the official application cutoff and timezone separately.'),'TRANSP:TRANSPARENT');
  if(reminder)lines.push('BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:'+escapeCalendarText('Review your application planning date'),'END:VALARM');
  lines.push('END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(foldLine).join('\r\n')+'\r\n';
}
