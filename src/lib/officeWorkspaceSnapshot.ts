import {STAFF_CAPABILITIES,staffRoleValid} from './staffPermissionProfiles';
type OfficePerson={id:string;name:string|null;email:string|null;role:string};
type OfficeTask={id:string;title:string;status:string;priority:string;dueOn:string|null};
type OfficeSchedule={id:string;day:number;start:string;end:string;room:string|null;module:string};
export type OfficeData={
 centreId:string;role:string;capabilities:string[];revision:number;
 overrides:Record<string,string>;tasks:OfficeTask[];staff:OfficePerson[];
 schedule:OfficeSchedule[];leaveSummary:{pending?:number;approved?:number;rejected?:number};
 invitationGateway:string;labProvider:string;
};
const object = (v:unknown):v is Record<string,unknown> => !!v && typeof v==='object' && !Array.isArray(v);
const text = (v:unknown):v is string => typeof v==='string';
const optionalText = (v:unknown) => v===null || text(v);
const count = (v:unknown) => typeof v==='number' && Number.isSafeInteger(v) && v>=0;
/** Validate the RPC contract before rendering. Missing evidence is not a zero. */
export function validOfficeSnapshot(v:unknown,centre:string,role:string):v is OfficeData {
 if(!object(v)||!centre||!staffRoleValid(role))return false;
 const row=v;
 return row.centreId===centre && row.role===role && count(row.revision) &&
  Array.isArray(row.capabilities) && row.capabilities.every(c=>STAFF_CAPABILITIES.some(x=>x.key===c)) &&
  Array.isArray(row.tasks) && row.tasks.every(t=>object(t)&&text(t.id)&&text(t.title)&&text(t.status)&&text(t.priority)&&optionalText(t.dueOn)) &&
  Array.isArray(row.staff) && row.staff.every(s=>object(s)&&text(s.id)&&optionalText(s.name)&&optionalText(s.email)&&text(s.role)) &&
  Array.isArray(row.schedule) && row.schedule.every(s=>object(s)&&text(s.id)&&count(s.day)&&Number(s.day)<=6&&text(s.start)&&text(s.end)&&optionalText(s.room)&&text(s.module)) &&
  object(row.leaveSummary) && (!row.capabilities.includes('view_leave_summary') ||
   ['pending','approved','rejected'].every(key=>count((row.leaveSummary as Record<string,unknown>)[key])));
}
