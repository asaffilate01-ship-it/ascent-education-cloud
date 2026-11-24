// Read-only candidate evaluation. All dates and wall-clock times are Pakistan time.
export const MAX_SCHEDULER_ROWS=500;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
const norm=(v:unknown)=>typeof v==='string'?v.trim().toLowerCase():'';
function date(v:unknown):v is string{
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const t=Date.parse(v+'T00:00:00Z');
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v;
}
function minutes(v:unknown):number|null{
 if(typeof v!=='string'||!/^\d{2}:\d{2}(?::00)?$/.test(v))return null;
 const [h,m]=v.split(':').map(Number);return h<24&&m<60?h*60+m:null;
}
const instant=(v:unknown)=>typeof v==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export type ProposedSlot={date:string;start:string;end:string;mode:'online'|'centre'|'both';room?:string};
export type SchedulerRequest={moduleId:string;cohortReference:string;requiredSlots:ProposedSlot[]};
export function parseSchedulingRequest(raw:unknown):SchedulerRequest{
 if(!object(raw)||!keys(raw,['moduleId','cohortReference','requiredSlots'])||!id(raw.moduleId)||!Array.isArray(raw.requiredSlots)||raw.requiredSlots.length<1||raw.requiredSlots.length>8)throw Error('Invalid scheduling request');
 const cohort=raw.cohortReference??'';
 if(typeof cohort!=='string'||cohort.length>100)throw Error('Invalid cohort');
 const requiredSlots=raw.requiredSlots.map(s=>{
  if(!object(s)||!keys(s,['date','start','end','mode','room'])||!date(s.date)||typeof s.start!=='string'||typeof s.end!=='string'||!['online','centre','both'].includes(String(s.mode)))throw Error('Invalid slot');
  const a=minutes(s.start),b=minutes(s.end);
  if(a===null||b===null||![45,90].includes(b-a)||s.start.length!==5||s.end.length!==5)throw Error('Use a 45- or 90-minute session');
  const room=s.room??'';
  if(typeof room!=='string'||room.length>100||(s.mode!=='online'&&(!room.trim()||norm(room)==='virtual')))throw Error('Physical delivery requires a room');
  return {date:s.date,start:s.start,end:s.end,mode:s.mode as ProposedSlot['mode'],room:room.trim()};
 });
 if(new Set(requiredSlots.map(s=>JSON.stringify(s))).size!==requiredSlots.length)throw Error('Duplicate slots');
 return {moduleId:raw.moduleId.toLowerCase(),cohortReference:cohort.trim(),requiredSlots};
}
export function verifiedSchedulingManager(rows:unknown,tenant:string,uid:string){
 return Array.isArray(rows)&&rows.some(r=>object(r)&&r.user_id===uid&&((r.role==='centre_director'&&r.tenant_id===tenant)||(r.role==='superadmin'&&r.tenant_id===null)));
}
export function approvedCandidates(rows:unknown,roles:unknown,tenant:string,module:string,now=Date.now()){
 if(!Array.isArray(rows)||!Array.isArray(roles))throw Error('Unverified eligibility records');
 const members=new Set(roles.filter(r=>object(r)&&r.tenant_id===tenant&&r.role==='lecturer'&&id(r.user_id)).map(r=>r.user_id));
 const seen=new Set<string>();
 return rows.flatMap(r=>{
  if(!object(r)||r.tenant_id!==tenant||r.module_id!==module||r.active!==true||!id(r.user_id)||!members.has(r.user_id)||!id(r.approved_by)||r.approved_by===r.user_id)return [];
  const at=instant(r.approved_at);
  if(at===null||at>now||seen.has(r.user_id))return [];
  seen.add(r.user_id);
  const score=typeof r.eligibility_score==='number'&&Number.isFinite(r.eligibility_score)?r.eligibility_score:null;
  return [{userId:r.user_id,score}];
 }).sort((a,b)=>(b.score??-Infinity)-(a.score??-Infinity)||a.userId.localeCompare(b.userId));
}
export function declaredAvailabilityFits(answers:unknown,slot:ProposedSlot){
 if(!object(answers)||answers['Availability timezone']!=='Asia/Karachi')return false;
 const mode=norm(answers['Study or teaching mode (online / classroom / both)']);
 if(mode!=='both'&&!(mode==='online'&&slot.mode==='online')&&!(mode==='classroom'&&slot.mode==='centre'))return false;
 const day=dayNames[new Date(slot.date+'T00:00:00Z').getUTCDay()];
 const value=answers[day],a=minutes(slot.start),b=minutes(slot.end);
 if(typeof value!=='string'||a===null||b===null||b<=a)return false;
 const windows=value.split(/[,;]/).map(part=>{
  const m=/^\s*(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})\s*$/.exec(part);
  if(!m)return null;
  const start=minutes(m[1]),end=minutes(m[2]);
  return start!==null&&end!==null&&end>start?{start,end}:null;
 });
 return windows.every(w=>w!==null)&&windows.some(w=>w!==null&&w.start<=a&&w.end>=b);
}
const resourceConflict=(row:Record<string,unknown>,lecturer:string,module:string,cohort:string,room:unknown,slot:ProposedSlot)=>
 row.lecturer_id===lecturer||row.module_id===module||
 (!!norm(cohort)&&norm(row.cohort_reference)===norm(cohort))||
 (slot.mode!=='online'&&!!norm(slot.room)&&norm(room)===norm(slot.room));
export function hasSchedulingConflict(weekly:unknown[],assignments:unknown[],tenant:string,lecturer:string,module:string,cohort:string,slot:ProposedSlot){
 const weekday=(new Date(slot.date+'T00:00:00Z').getUTCDay()+6)%7+1;
 const a=minutes(slot.start)!,b=minutes(slot.end)!;
 for(const r of weekly){
  if(!object(r)||r.tenant_id!==tenant||r.is_active!==true)continue;
  if(!resourceConflict(r,lecturer,module,cohort,r.room,slot))continue;
  // Treat unknown recurrence as a potential weekly booking. Never guess a free slot.
  if(!date(r.effective_from)||(r.effective_until!==null&&!date(r.effective_until))||(r.effective_until&&String(r.effective_until)<r.effective_from)||typeof r.day_of_week!=='number'||!Number.isInteger(r.day_of_week)||r.day_of_week<1||r.day_of_week>7)return true;
  if(slot.date<r.effective_from||(r.effective_until&&slot.date>String(r.effective_until))||r.day_of_week!==weekday)continue;
  const start=minutes(r.start_time),end=minutes(r.end_time);
  if(start===null||end===null||end<=start||a<end&&start<b)return true;
 }
 const start=Date.parse(slot.date+'T'+slot.start+':00+05:00'),end=Date.parse(slot.date+'T'+slot.end+':00+05:00');
 for(const r of assignments){
  if(!object(r)||r.tenant_id!==tenant||r.status==='cancelled')continue;
  if(!resourceConflict(r,lecturer,module,cohort,r.room_or_link,slot))continue;
  const x=instant(r.starts_at),y=instant(r.ends_at);
  if(x===null||y===null||y<=x||start<y&&x<end)return true;
 }
 return false;
}
