import {sortDeadlines,validateDeadline,type DeadlineDraft,type DeadlineRecord} from './scholarshipResearch';

export const MAX_DEADLINE_ENTRIES=30;

export function saveDeadlineEntry(records:readonly DeadlineRecord[],draft:DeadlineDraft,editingId:string|null,newId:string):DeadlineRecord[]{
 const item=validateDeadline(draft);
 if(!item)throw Error('Enter a valid title, calendar date and, if provided, an HTTPS source URL.');
 if(!editingId&&records.length>=MAX_DEADLINE_ENTRIES)throw Error('Remove an entry before adding another.');
 if(editingId&&!records.some(r=>r.id===editingId))throw Error('This planning entry no longer exists.');
 if(records.some(r=>r.id!==editingId&&r.title.toLowerCase()===item.title.toLowerCase()&&r.date===item.date&&r.kind===item.kind))throw Error('This planning entry is already on your list.');
 if(editingId)return records.map(r=>r.id===editingId?{...r,...item}:r);
 if(!newId||records.some(r=>r.id===newId))throw Error('Unable to create a unique planning entry.');
 return [...records,{...item,id:newId,completed:false}];
}

function escapeText(value:string){
 const safe=Array.from(value).filter(char=>{const code=char.charCodeAt(0);return code===9||code===10||code===13||(code>=32&&code!==127);}).join('');
 return safe.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
}

/** Fold each content line to at most 75 UTF-8 octets, without splitting a code point. */
export function foldCalendarLine(line:string){
 const encoder=new TextEncoder();
 let bytes=0,part='';
 const parts:string[]=[];
 for(const char of line){
  const length=encoder.encode(char).length;
  if(bytes+length>75){parts.push(part);part=' ';bytes=1;}
  part+=char;bytes+=length;
 }
 parts.push(part);
 return parts.join('\r\n');
}

export function buildAdmissionsCalendar(records:readonly DeadlineRecord[],now=new Date()){
 if(!Number.isFinite(now.getTime()))throw Error('Invalid calendar export timestamp.');
 const pending=sortDeadlines(records.filter(r=>!r.completed));
 if(pending.length>MAX_DEADLINE_ENTRIES)throw Error('Too many planning entries.');
 const used=new Set<string>();
 const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UniPathway//Admissions Planning//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:UniPathway personal planning dates'];
 for(const record of pending){
  const item=validateDeadline(record);
  if(!item||item.date.startsWith('0000-')||!record.id||used.has(record.id))throw Error('Invalid or duplicate planning entry.');
  used.add(record.id);
  lines.push('BEGIN:VEVENT','UID:'+encodeURIComponent(record.id)+'@unipathway.pk','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+item.date.replace(/-/g,''),'SUMMARY:'+escapeText(item.title),'DESCRIPTION:'+escapeText(item.kind+' — Personal planning date only; verify the official cutoff and timezone separately. No confirmed appointment or admission.'),'TRANSP:TRANSPARENT','END:VEVENT');
 }
 lines.push('END:VCALENDAR');
 return lines.map(foldCalendarLine).join('\r\n')+'\r\n';
}
