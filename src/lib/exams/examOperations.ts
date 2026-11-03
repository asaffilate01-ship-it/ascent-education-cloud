import type {ExamCalendarEvent} from '@/lib/exams/examReadiness';

export const EXAM_OPERATIONS_ENABLED=import.meta.env.VITE_UNIPATHWAY_EXAM_OPERATIONS_ENABLED==='true';
export const EXAM_WRITES_ENABLED=EXAM_OPERATIONS_ENABLED&&import.meta.env.VITE_UNIPATHWAY_EXAM_OPERATIONS_WRITES_ENABLED==='true';
export const EXAM_APPROVALS_ENABLED=EXAM_WRITES_ENABLED&&import.meta.env.VITE_UNIPATHWAY_EXAM_OPERATIONS_APPROVALS_ENABLED==='true';

type Actor={id:string;tenantId?:string;role:string;roles?:readonly string[]}|null|undefined;
export function examOperationsScope(user:Actor):string|null{
 if(!user?.id||!user.tenantId||!Array.isArray(user.roles)||!user.roles.includes(user.role))return null;
 return user.role==='exams_officer'||user.role==='centre_director'?user.tenantId:null;
}
export type ExamPlanStatus='draft'|'submitted'|'internally_approved';
export interface ExamPlan {
 tenant_id:string;event_id:string;event_start:string;event_end:string;event_location:string;
 room_capacity:number;planned_candidates:number;planned_invigilators:number;
 seating_process_checked:boolean;entry_list_process_checked:boolean;
 identity_process_checked:boolean;emergency_process_checked:boolean;
 status:ExamPlanStatus;revision:number;updated_at:string;
}
export type ExamPlanReceipt={tenant_id:string;event_id:string;revision:number;status:ExamPlanStatus};
export type ExamDraft={
 capacity:number;candidates:number;invigilators:number;
 seating:boolean;entries:boolean;identity:boolean;emergency:boolean;
};
const planColumns=[
 'tenant_id','event_id','event_start','event_end','event_location','room_capacity',
 'planned_candidates','planned_invigilators','seating_process_checked','entry_list_process_checked',
 'identity_process_checked','emergency_process_checked','status','revision','updated_at'
] as const;
const allowed=new Set<string>(planColumns);
const validStatus=(x:unknown):x is ExamPlanStatus=>x==='draft'||x==='submitted'||x==='internally_approved';
const integer=(x:unknown,min:number,max:number)=>typeof x==='number'&&Number.isInteger(x)&&x>=min&&x<=max;
const timestamp=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x));

/** Projection is explicitly allowlisted: unrecognised confidential backend fields fail closed. */
export function verifyExamPlans(data:unknown,tenant:string):ExamPlan[]{
 if(!Array.isArray(data)||data.length>100)throw Error('Invalid exam-plan page');
 const result:ExamPlan[]=[];
 for(const item of data){
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid exam-plan record');
  const p=item as Record<string,unknown>;
  if(Object.keys(p).some(key=>!allowed.has(key)))throw Error('Unexpected private exam-plan field');
  if(p.tenant_id!==tenant||typeof p.event_id!=='string'||!p.event_id||
    !timestamp(p.event_start)||!timestamp(p.event_end)||Date.parse(p.event_end as string)<=Date.parse(p.event_start as string)||
    typeof p.event_location!=='string'||!p.event_location.trim()||
    !integer(p.room_capacity,1,2000)||!integer(p.planned_candidates,0,p.room_capacity as number)||
    !integer(p.planned_invigilators,0,100)||!integer(p.revision,1,2147483647)||!timestamp(p.updated_at)||
    !validStatus(p.status)||
    ['seating_process_checked','entry_list_process_checked','identity_process_checked','emergency_process_checked']
      .some(field=>typeof p[field]!=='boolean')
  )throw Error('Unverified exam-plan response');
  result.push(p as unknown as ExamPlan);
 }
 if(new Set(result.map(p=>p.event_id)).size!==result.length)throw Error('Duplicate exam plans');
 return result;
}
export function verifyExamReceipt(data:unknown,tenant:string,eventId:string,status:ExamPlanStatus,previousRevision:number):ExamPlanReceipt{
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Exam operation receipt missing');
 const row=data as Record<string,unknown>;
 if(Object.keys(row).some(k=>!['tenant_id','event_id','revision','status'].includes(k))||
   row.tenant_id!==tenant||row.event_id!==eventId||row.status!==status||
   !integer(row.revision,previousRevision+1,2147483647))
   throw Error('Exam operation receipt does not match this centre/event/revision');
 return row as unknown as ExamPlanReceipt;
}
export function validExamDraft(draft:ExamDraft,submit:boolean):boolean{
 if(!integer(draft.capacity,1,2000)||!integer(draft.candidates,0,draft.capacity)||
    !integer(draft.invigilators,0,100))return false;
 if(submit&&(!draft.candidates||!draft.invigilators||
    !draft.seating||!draft.entries||!draft.identity||!draft.emergency))return false;
 return true;
}
export function planMatchesCalendar(plan:ExamPlan,event:ExamCalendarEvent):boolean{
 return plan.tenant_id===event.tenant_id&&plan.event_id===event.id&&event.event_type==='exam'&&
   !event.all_day&&typeof event.location==='string'&&
   plan.event_location===event.location.trim()&&
   timestamp(event.start_date)&&timestamp(event.end_date)&&
   Date.parse(plan.event_start)===Date.parse(event.start_date as string)&&
   Date.parse(plan.event_end)===Date.parse(event.end_date as string);
}
