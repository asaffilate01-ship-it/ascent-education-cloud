/**
 * Jhelum operations guardrails. All checks must ALSO be enforced by database
 * permissions and authorised server transactions; UI validation is advisory.
 */
export const JHELUM_CENTRE = {
  timezone: 'Asia/Karachi',
  open: '08:00',
  close: '21:00',
  adminAdmissionsStaff: 3,
  daysPerWeek: 7,
  rooms: [
    {code:'MAIN20',capacity:20},
    {code:'ROOM10A',capacity:10},
    {code:'ROOM10B',capacity:10},
    {code:'ROOM10C',capacity:10},
  ],
} as const;

export type DutyShift = {staffId:string;dayOfWeek:number;start:string;end:string};
export type RoomBooking = {id:string;room:string;date:string;start:string;end:string;attendees:number;status:'requested'|'approved'|'cancelled'};
export type ExternalAction = 'liaison_note'|'school_outreach'|'submit_referral'|'request_meeting_room'|'approve_timetable'|'receive_student_fees'|'verify_payment'|'approve_expense'|'change_tutor_rate'|'approve_commission'|'release_iqa_grade';

function timeMinutes(value:string):number {
 if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Time must be HH:mm');
 const [hours,mins]=value.split(':').map(Number);
 return hours*60+mins;
}
const opening = timeMinutes(JHELUM_CENTRE.open);
const closing = timeMinutes(JHELUM_CENTRE.close);

/** Representative cannot independently make academic, finance or payout decisions. */
export function representativeCan(action:ExternalAction):boolean {
 return (['liaison_note','school_outreach','submit_referral','request_meeting_room'] as ExternalAction[]).includes(action);
}

/** Report gaps in a seven-day opening schedule. Three staff are a headcount,
 * not a claim that a named person is available for each day or 13-hour shift. */
export function adminDutyCoverage(shifts:DutyShift[]):{day:number;gaps:{start:string;end:string}[]}[] {
 const minutes=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const staffIds=new Set(shifts.map(s=>s.staffId));
 if(staffIds.size>JHELUM_CENTRE.adminAdmissionsStaff)throw new Error('More than three active Admissions/Admin staff in the planned roster');
 const gaps:{day:number;gaps:{start:string;end:string}[]}[]=[];
 for(let day=0;day<7;day++){
  const intervals=shifts.filter(s=>s.dayOfWeek===day).map(s=>{
   if(!s.staffId.trim())throw new Error('Staff identity required');
   const start=timeMinutes(s.start),end=timeMinutes(s.end);
   if(start<opening||end>closing||start>=end)throw new Error('Shift outside authorised hours');
   return {start,end};
  }).sort((a,b)=>a.start-b.start);
  const uncovered:{start:string;end:string}[]=[];
  let cursor=opening;
  for(const span of intervals){
   if(span.start>cursor)uncovered.push({start:minutes(cursor),end:minutes(span.start)});
   cursor=Math.max(cursor,span.end);
  }
  if(cursor<closing)uncovered.push({start:minutes(cursor),end:minutes(closing)});
  if(uncovered.length)gaps.push({day,gaps:uncovered});
 }
 return gaps;
}

export function validateRoomRequest(candidate:RoomBooking,existing:RoomBooking[]):string[] {
 const errors:string[]=[];
 const room=JHELUM_CENTRE.rooms.find(r=>r.code===candidate.room);
 if(!room)errors.push('Unknown Jhelum classroom');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(candidate.date))errors.push('Date must be YYYY-MM-DD');
 if(!Number.isInteger(candidate.attendees)||candidate.attendees<1||candidate.attendees>(room?.capacity||0))errors.push('Capacity exceeded');
 let start=0,end=0;
 try {start=timeMinutes(candidate.start);end=timeMinutes(candidate.end);}
 catch {errors.push('Times must be HH:mm');return errors;}
 if(start<opening||end>closing||end<=start)errors.push('Booking must stay inside 08:00–21:00 Pakistan time');
 if(candidate.status==='approved'&&existing.some(x=>x.id!==candidate.id&&x.status==='approved'&&x.room===candidate.room&&x.date===candidate.date&&start<timeMinutes(x.end)&&timeMinutes(x.start)<end))errors.push('Classroom is already reserved');
 return errors;
}
export type TutorEligibility={identityVerified:boolean;qualificationVerified:boolean;safeguardingCleared:boolean;subjectApproved:boolean;approvedByAcademicHead:boolean};
export function mayAssignTutor(e:TutorEligibility):boolean {
 return e.identityVerified&&e.qualificationVerified&&e.safeguardingCleared&&e.subjectApproved&&e.approvedByAcademicHead;
}
/** Planned weekly theoretical room-hours, not proven utilisation. */
export function roomCapacityHoursPerWeek():number {
 return JHELUM_CENTRE.rooms.length * (closing-opening)/60 * JHELUM_CENTRE.daysPerWeek;
}
export function roomOccupancyPercent(approved:RoomBooking[],weekDates:string[]):number {
 const days = new Set(weekDates);
 if(days.size!==7)throw new Error('Seven distinct dates are required for a weekly forecast');
 const bookedMinutes=approved.filter(s=>s.status==='approved'&&days.has(s.date)).reduce((sum,s)=>{
  if(validateRoomRequest(s,[]).length)throw new Error('Invalid booking in occupancy report');
  return sum+timeMinutes(s.end)-timeMinutes(s.start);
 },0);
 return Math.round(bookedMinutes/(roomCapacityHoursPerWeek()*60)*10000)/100;
}
