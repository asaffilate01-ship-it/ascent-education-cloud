import {parseZonedAcademicTimestamp} from '@/lib/academicTime';
import type {UserRole} from '@/types/platform';
export function instructorLabAccess(user:{id?:string;tenantId?:string;role?:UserRole;roles?:readonly UserRole[]}|null|undefined){
 const role=user?.id&&user.tenantId&&user.role&&user.roles?.includes(user.role)?user.role:null;
 const manager=role==='programme_leader'||role==='centre_director'||role==='superadmin';
 return {authorised:manager||role==='lecturer',manager};
}
export function instructorLabCost(raw:string,provider:string):number|null{
 const cost=raw.trim()?Number(raw):0;
 return Number.isFinite(cost)&&cost>=0&&cost<=500&&(provider!=='aws_managed'||cost>0)?cost:null;
}
export function instructorLabWindow(start:string,end:string){
 const local=(value:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)||parseZonedAcademicTimestamp(value+'Z')===null)return null;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  const shifted=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return shifted.toISOString().slice(0,16)===value?date:null;
 };
 const a=local(start),b=local(end);
 return a&&b&&b.getTime()>a.getTime()?{start:a.toISOString(),end:b.toISOString()}:null;
}
export function instructorFeedbackConfirmed(raw:unknown,expected:{id:string;tenant:string;student:string;referenceKey:'template_id'|'launch_request_id';reference:string;status:'reviewed'|'resolved';authorKey:'reviewer_id'|'assigned_lecturer_id';author:string;textKey:'reviewer_feedback'|'response';text:string}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 const row=raw as Record<string,unknown>;
 return row.id===expected.id&&row.tenant_id===expected.tenant&&row.student_id===expected.student&&
  row[expected.referenceKey]===expected.reference&&row.status===expected.status&&row[expected.authorKey]===expected.author&&row[expected.textKey]===expected.text;
}
