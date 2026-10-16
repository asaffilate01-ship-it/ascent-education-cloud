import { z } from 'zod';
import type { CalendarVisit } from './residentialCalendar';
const section=z.enum(['male','female']);
const roomSchema=z.object({id:z.string().trim().min(1).max(60),site:z.string().trim().min(1).max(80),section,use:z.enum(['student','staff']),beds:z.number().int().min(1).max(20),accessible:z.boolean()}).strict();
const allocationSchema=z.object({kind:z.enum(['student','staff']),person:z.string().trim().min(1).max(60),section,room:z.string().min(1).max(60),needsAccessible:z.boolean()}).strict();
export type AccommodationRoom=z.infer<typeof roomSchema>;
export type AccommodationAllocation=z.infer<typeof allocationSchema>;
export const accommodationSchema=z.object({version:z.literal(1),rooms:z.array(roomSchema).max(250),allocations:z.array(allocationSchema).max(300)}).strict();
export type AccommodationPlan=z.infer<typeof accommodationSchema>;
const normal=(s:string)=>s.trim().toLowerCase();
export function validateAccommodation(visit:CalendarVisit,input:AccommodationPlan){
 const parsed=accommodationSchema.safeParse(input);if(!parsed.success)return ['Room or allocation fields are invalid.'];
 const {rooms,allocations}=parsed.data,errors:string[]=[],ids=new Set<string>(),people=new Set<string>();
 for(const r of rooms){if(ids.has(normal(r.id)))errors.push('Room IDs must be unique across all sites.');ids.add(normal(r.id));}
 for(const a of allocations){
  const person=a.kind==='student'?String(Number(a.person)):normal(a.person);
  if(a.kind==='student'&&(!/^\d+$/.test(a.person)||Number(a.person)<1||Number(a.person)>visit.students))errors.push(`Student ${a.person} is outside this cohort.`);
  const key=`${a.kind}/${person}`;if(people.has(key))errors.push(`Duplicate allocation for ${a.kind} ${a.person}.`);people.add(key);
  const room=rooms.find(r=>normal(r.id)===normal(a.room));
  if(!room){errors.push(`Room ${a.room} does not exist.`);continue;}
  if(room.use!==a.kind)errors.push('Students and staff must have separate rooms.');
  if(room.section!==a.section)errors.push('Room section does not match the recorded allocation section.');
  if(a.needsAccessible&&!room.accessible)errors.push('This allocation requires an accessible room.');
 }
 for(const r of rooms)if(allocations.filter(a=>normal(a.room)===normal(r.id)).length>r.beds)errors.push(`Room ${r.id} exceeds its bed capacity.`);
 return [...new Set(errors)];
}
export function accommodationSummary(visit:CalendarVisit,plan:AccommodationPlan){
 const allocated=new Set(plan.allocations.filter(a=>a.kind==='student').map(a=>Number(a.person)));
 return {unallocated:Array.from({length:visit.students},(_,i)=>i+1).filter(id=>!allocated.has(id)),sections:['male','female'].map(section=>({section,studentBeds:plan.rooms.filter(r=>r.section===section&&r.use==='student').reduce((n,r)=>n+r.beds,0),staffBeds:plan.rooms.filter(r=>r.section===section&&r.use==='staff').reduce((n,r)=>n+r.beds,0),students:plan.allocations.filter(a=>a.section===section&&a.kind==='student').length,staff:plan.allocations.filter(a=>a.section===section&&a.kind==='staff').length}))};
}
export function parseAccommodation(raw:string,visit:CalendarVisit){
 if(raw.length>150000)throw Error('Draft exceeds 150 KB.');
 const envelope=z.object({visit:z.object({cohort:z.number(),visit:z.number(),students:z.number(),start:z.string(),end:z.string()}).strict(),plan:accommodationSchema}).strict().parse(JSON.parse(raw));
 if(['cohort','visit','students','start','end'].some(k=>envelope.visit[k as keyof CalendarVisit]!==visit[k as keyof CalendarVisit]))throw Error('Draft belongs to a different visit.');
 const errors=validateAccommodation(visit,envelope.plan);if(errors.length)throw Error(errors[0]);return envelope.plan;
}
