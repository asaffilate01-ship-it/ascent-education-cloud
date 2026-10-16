import { z } from 'zod';
import { dateNumber, datedTeaching, datedTrips, type CalendarVisit } from './residentialCalendar';
export const supportAppointmentSchema = z.object({
  id: z.string().min(1).max(80), student: z.number().int().min(1).max(200),
  tutor: z.string().trim().min(1).max(60), date: z.string(),
  start: z.number().int().min(480).max(1199), minutes: z.union([z.literal(30),z.literal(60),z.literal(90)]),
}).strict();
export type SupportAppointment = z.infer<typeof supportAppointmentSchema>;
export type TeachingAllocation = { session: string; tutor: string };
export const teachingKey = (s: {date:string;start:number}) => `${s.date}/${s.start}`;
const tutorKey = (t: string) => t.trim().toLowerCase();
const overlaps = (a: number,b:number,c:number,d:number) => a<d&&c<b;
export function validateSupport(visit: CalendarVisit, appointments: SupportAppointment[], allocations: TeachingAllocation[]) {
  const errors: string[] = [];
  const teaching = datedTeaching(visit), trips = datedTrips(visit);
  const assigned = new Map<string,string>();
  for (const a of allocations) {
    if (!teaching.some(s=>teachingKey(s)===a.session) || !a.tutor.trim()) errors.push('Teaching allocation must identify an existing session and tutor.');
    if (assigned.has(a.session)) errors.push('A teaching session has duplicate allocations.');
    assigned.set(a.session,tutorKey(a.tutor));
  }
  const ids = new Set<string>();
  const minutes = new Map<number,number>();
  const valid: SupportAppointment[] = [];
  for (const raw of appointments) {
    const parsed = supportAppointmentSchema.safeParse(raw);
    if (!parsed.success) { errors.push('Appointment fields are invalid.'); continue; }
    const a = parsed.data;
    try { dateNumber(a.date); } catch { errors.push('Appointment date is invalid.'); continue; }
    valid.push(a);
    if (ids.has(a.id)) errors.push('Duplicate appointment ID.'); ids.add(a.id);
    if (a.student>visit.students) errors.push(`Student ${a.student} is outside this cohort.`);
    if (a.date<visit.start||a.date>visit.end||a.start+a.minutes>1200) errors.push('Appointment is outside the visit or 8am–8pm opening hours.');
    minutes.set(a.student,(minutes.get(a.student)||0)+a.minutes);
    const group='ABCD'[Math.floor((a.student-1)/50)];
    if (trips.some(t=>t.group===group&&t.date===a.date)) errors.push(`Student ${a.student} has a full-day trip.`);
    if (teaching.some(s=>s.group===group&&s.date===a.date&&overlaps(a.start,a.start+a.minutes,s.start-30,s.end+30))) errors.push(`Student ${a.student} needs 30 minutes clear of teaching.`);
    if (teaching.some(s=>assigned.get(teachingKey(s))===tutorKey(a.tutor)&&s.date===a.date&&overlaps(a.start,a.start+a.minutes,s.start-30,s.end+30))) errors.push(`Tutor ${a.tutor} has a teaching clash or changeover.`);
  }
  for (const [student,total] of minutes) if(total>90) errors.push(`Student ${student} exceeds 90 private-support minutes for this visit.`);
  valid.forEach((a,i)=>valid.slice(i+1).forEach(b=>{
    if(a.date!==b.date||!overlaps(a.start,a.start+a.minutes,b.start,b.start+b.minutes))return;
    if(a.student===b.student)errors.push(`Student ${a.student} has overlapping appointments.`);
    if(tutorKey(a.tutor)===tutorKey(b.tutor))errors.push(`Tutor ${a.tutor} is double-booked.`);
  }));
  for(const date of new Set(valid.map(a=>a.date))) {
    const events=valid.filter(a=>a.date===date).flatMap(a=>[{time:a.start,change:1},{time:a.start+a.minutes,change:-1}]).sort((a,b)=>a.time-b.time||a.change-b.change);
    let count=0;for(const event of events){count+=event.change;if(count>10){errors.push(`More than ten support places used on ${date}.`);break;}}
  }
  return [...new Set(errors)];
}
const planSchema=z.object({version:z.literal(1),visit:z.object({cohort:z.number().int(),visit:z.number().int(),students:z.number().int(),start:z.string(),end:z.string()}).strict(),appointments:z.array(supportAppointmentSchema).max(600),allocations:z.array(z.object({session:z.string(),tutor:z.string().trim().min(1).max(60)}).strict()).max(50)}).strict();
export function parseSupportPlan(raw:string,visit:CalendarVisit){
  if(raw.length>150000)throw Error('Plan exceeds 150 KB.');
  const plan=planSchema.parse(JSON.parse(raw));
  if(['cohort','visit','students','start','end'].some(k=>plan.visit[k as keyof CalendarVisit]!==visit[k as keyof CalendarVisit]))throw Error('This file belongs to a different visit.');
  // Runtime schema validation above requires both fields; strictNullChecks is disabled in this project.
  const allocations: TeachingAllocation[] = plan.allocations.map(a=>({session:a.session!,tutor:a.tutor!}));
  const errors=validateSupport(visit,plan.appointments,allocations);if(errors.length)throw Error(errors[0]);
  return {...plan,allocations};
}
