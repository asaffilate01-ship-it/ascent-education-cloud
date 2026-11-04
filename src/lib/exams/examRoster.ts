import type {ExamPlan} from '@/lib/exams/examOperations';

export const EXAM_ROSTER_ENABLED=import.meta.env.VITE_UNIPATHWAY_EXAM_ROSTER_ENABLED==='true';
export const EXAM_ROSTER_WRITES_ENABLED=EXAM_ROSTER_ENABLED&&import.meta.env.VITE_UNIPATHWAY_EXAM_ROSTER_WRITES_ENABLED==='true';

export type RosterStatus='unconfigured'|'draft'|'submitted'|'internally_approved';
export type RosterAction='bind'|'assign'|'remove'|'submit'|'approve';
export interface RosterSeat {seat_label:string;student_ref:string}
export interface ExamRoster {
 tenant_id:string;event_id:string;programme_id:string|null;status:RosterStatus;
 revision:number;room_capacity:number;planned_candidates:number;seats:RosterSeat[];
}
export type RosterReceipt={
 tenant_id:string;event_id:string;status:Exclude<RosterStatus,'unconfigured'>;
 action:RosterAction;revision:number;
};

const rosterKeys=new Set(['tenant_id','event_id','programme_id','status','revision','room_capacity','planned_candidates','seats']);
const seatKeys=new Set(['seat_label','student_ref']);
const receiptKeys=new Set(['tenant_id','event_id','status','action','revision']);
const seatCode=/^[A-Z]{1,2}[0-9]{1,3}$/;
const studentId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isStatus=(v:unknown):v is RosterStatus=>v==='unconfigured'||v==='draft'||v==='submitted'||v==='internally_approved';
const integer=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Unverified exam roster response');
 return value as Record<string,unknown>;
}
function allowKeys(obj:Record<string,unknown>,keys:Set<string>){
 if(Object.keys(obj).some(key=>!keys.has(key)))throw Error('Unexpected private exam roster field');
}
export function validStudentId(value:string):boolean{return studentId.test(value.trim())}
export function normaliseSeat(value:string):string{return value.trim().toUpperCase()}
export function validSeatCode(value:string):boolean{return seatCode.test(normaliseSeat(value))}

/** Fail-closed contract for a single approved event. No raw student UUIDs or contact details. */
export function verifyExamRoster(input:unknown,tenant:string,event:string,plan:ExamPlan):ExamRoster{
 const r=record(input);allowKeys(r,rosterKeys);
 if(r.tenant_id!==tenant||r.event_id!==event||plan.tenant_id!==tenant||plan.event_id!==event||
  plan.status!=='internally_approved'||!isStatus(r.status)||
  !integer(r.revision,0,2147483647)||
  !integer(r.room_capacity,1,2000)||r.room_capacity!==plan.room_capacity||
  !integer(r.planned_candidates,1,r.room_capacity as number)||
  r.planned_candidates!==plan.planned_candidates||
  !Array.isArray(r.seats)||r.seats.length>r.planned_candidates)throw Error('Invalid approved exam roster');
 if(r.status==='unconfigured'){
  if(r.programme_id!==null||r.revision!==0||r.seats.length!==0)throw Error('Unconfigured roster contains private data');
 }else if(typeof r.programme_id!=='string'||!validStudentId(r.programme_id)||
  !integer(r.revision,1,2147483647))throw Error('Invalid roster programme binding');
 const used=new Set<string>();
 for(const item of r.seats){
  const seat=record(item);allowKeys(seat,seatKeys);
  if(typeof seat.seat_label!=='string'||!seatCode.test(seat.seat_label)||
   typeof seat.student_ref!=='string'||!/^••••[0-9a-f]{8}$/i.test(seat.student_ref)||
   used.has(seat.seat_label))throw Error('Unverified provisional seat mapping');
  used.add(seat.seat_label);
 }
 if(r.status==='internally_approved'&&r.seats.length!==r.planned_candidates)throw Error('Incomplete approved roster');
 return r as unknown as ExamRoster;
}

export function verifyRosterReceipt(input:unknown,tenant:string,event:string,action:RosterAction,oldRevision:number):RosterReceipt{
 const r=record(input);allowKeys(r,receiptKeys);
 const expectedStatus:Record<RosterAction,Exclude<RosterStatus,'unconfigured'>>={
  bind:'draft',assign:'draft',remove:'draft',submit:'submitted',approve:'internally_approved'
 };
 if(r.tenant_id!==tenant||r.event_id!==event||r.action!==action||
  r.status!==expectedStatus[action]||r.revision!==oldRevision+1)
  throw Error('Roster write acknowledgement did not match requested revision');
 return r as RosterReceipt;
}
export function rosterCanSubmit(roster:ExamRoster):boolean{
 return roster.status==='draft'&&roster.planned_candidates>0&&roster.seats.length===roster.planned_candidates;
}
