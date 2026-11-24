export type TimesheetRole='lecturer'|'centre_director'|'finance_officer';
export type TeachingSlot={schedule_id:string;module_id:string;module_title:string;start_time:string;end_time:string;updated_at:string;planned_minutes:number};
export type TeachingClaim={id:string;tenant_id:string;lecturer_id:string;lecturer_name:string;schedule_id:string;module_id:string;module_title:string;teaching_date:string;scheduled_start:string;scheduled_end:string;planned_minutes:number;actual_minutes:number;status:'submitted'|'approved'|'rejected';revision:1|2;submitted_at:string;reviewed_at:string|null;evidence_reference:string|null;review_note:string|null};
export type ClaimReceipt={id:string;tenant_id:string;lecturer_id:string;schedule_id:string;teaching_date:string;actual_minutes:number;status:TeachingClaim['status'];revision:1|2};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId=(s:unknown):s is string=>typeof s==='string'&&uuid.test(s);
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const instant=(v:unknown):v is string=>typeof v==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
function day(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const n=Date.parse(v+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===v;}
function mins(v:unknown):number|null{if(typeof v!=='string'||!/^\d{2}:\d{2}(?::00)?$/.test(v))return null;const [h,m]=v.split(':').map(Number);return h<24&&m<60?h*60+m:null;}
function range(start:unknown,end:unknown,duration:unknown){const a=mins(start),b=mins(end);return a!==null&&b!==null&&b>a&&Number.isInteger(duration)&&duration===b-a;}
function claimState(status:unknown,revision:unknown){return status==='submitted'?revision===1:(status==='approved'||status==='rejected')&&revision===2;}
export function readTeachingSlots(raw:unknown,tenant:string,date:string):TeachingSlot[]{
 if(!record(raw)||raw.tenant_id!==tenant||raw.role!=='lecturer'||raw.date!==date||!day(date)||!Array.isArray(raw.slots)||raw.slots.length>100)throw Error('Invalid teaching slots');
 const seen=new Set<string>();
 for(const s of raw.slots){
  if(!record(s)||!isId(s.schedule_id)||seen.has(s.schedule_id)||!isId(s.module_id)||!nonempty(s.module_title)||!instant(s.updated_at)||!range(s.start_time,s.end_time,s.planned_minutes))throw Error('Invalid teaching slot');
  seen.add(s.schedule_id);
 }
 return raw.slots as TeachingSlot[];
}
export function readTeachingClaims(raw:unknown,tenant:string,role:TimesheetRole,month:string,userId:string):TeachingClaim[]{
 if(!record(raw)||raw.tenant_id!==tenant||raw.role!==role||raw.month!==month+'-01'||!day(raw.month)||!Array.isArray(raw.rows)||raw.rows.length>500)throw Error('Invalid timesheet month');
 const seen=new Set<string>();
 for(const r of raw.rows){
  if(!record(r)||!isId(r.id)||seen.has(r.id)||r.tenant_id!==tenant||!isId(r.lecturer_id)||!nonempty(r.lecturer_name)||!isId(r.schedule_id)||!isId(r.module_id)||!nonempty(r.module_title)||!day(r.teaching_date)||r.teaching_date.slice(0,7)!==month||!range(r.scheduled_start,r.scheduled_end,r.planned_minutes)||!Number.isInteger(r.actual_minutes)||Number(r.actual_minutes)<1||Number(r.actual_minutes)>Number(r.planned_minutes)||!claimState(r.status,r.revision)||!instant(r.submitted_at)||(r.status==='submitted'?r.reviewed_at!==null:!instant(r.reviewed_at)))throw Error('Invalid claim');
  if(role==='lecturer'&&r.lecturer_id!==userId)throw Error('Foreign claim');
  if(role==='finance_officer'&&(r.status!=='approved'||r.evidence_reference!==null||r.review_note!==null))throw Error('Unapproved or private finance record');
  if(role!=='finance_officer'&&(!nonempty(r.evidence_reference)||r.evidence_reference.length>500||(r.status==='submitted'?r.review_note!==null:!nonempty(r.review_note))))throw Error('Invalid review evidence');
  seen.add(r.id);
 }
 return raw.rows as TeachingClaim[];
}
export function readClaimReceipt(raw:unknown,expected:{tenant:string;lecturer:string;schedule:string;date:string;minutes:number;id?:string;decision?:'approved'|'rejected'}):ClaimReceipt{
 if(!record(raw)||!isId(raw.id)||raw.tenant_id!==expected.tenant||raw.lecturer_id!==expected.lecturer||raw.schedule_id!==expected.schedule||raw.teaching_date!==expected.date||raw.actual_minutes!==expected.minutes||!claimState(raw.status,raw.revision)||(expected.id&&raw.id!==expected.id)||(expected.decision&&raw.status!==expected.decision))throw Error('Invalid timesheet receipt');
 return raw as unknown as ClaimReceipt;
}
export function teachingClaimTotals(rows:readonly TeachingClaim[]){
 return rows.reduce((totals,r)=>{totals[r.status].sessions++;totals[r.status].minutes+=r.actual_minutes;return totals;},{submitted:{sessions:0,minutes:0},approved:{sessions:0,minutes:0},rejected:{sessions:0,minutes:0}});
}
export function approvedLecturerTotals(rows:readonly TeachingClaim[]){
 const staff=new Map<string,{id:string;name:string;minutes:number;sessions:number}>();
 for(const r of rows){if(r.status!=='approved')continue;const total=staff.get(r.lecturer_id)||{id:r.lecturer_id,name:r.lecturer_name,minutes:0,sessions:0};total.minutes+=r.actual_minutes;total.sessions++;staff.set(r.lecturer_id,total);}
 return [...staff.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
