import {describe,expect,it} from 'vitest';
import {JHELUM_CENTRE,adminDutyCoverage,representativeCan,validateRoomRequest,mayAssignTutor,roomCapacityHoursPerWeek,roomOccupancyPercent} from '@/lib/jhelumCentreOperations';

describe('Jhelum centre operations P0-P2',()=>{
 it('uses 3 admin/admissions posts and four rooms with 50 physical seats',()=>{
  expect(JHELUM_CENTRE.adminAdmissionsStaff).toBe(3);
  expect(JHELUM_CENTRE.rooms.reduce((n,r)=>n+r.capacity,0)).toBe(50);
  expect(roomCapacityHoursPerWeek()).toBe(364);
 });
 it('does not grant the representative academic, expense or payment authority',()=>{
  expect(representativeCan('school_outreach')).toBe(true);
  expect(representativeCan('request_meeting_room')).toBe(true);
  for(const denied of ['approve_timetable','receive_student_fees','verify_payment','approve_expense','change_tutor_rate','approve_commission','release_iqa_grade'] as const)expect(representativeCan(denied)).toBe(false);
 });
 it('identifies duty-coverage gaps rather than assuming 3 posts cover 91 weekly hours',()=>{
  const gaps=adminDutyCoverage([{staffId:'a',dayOfWeek:1,start:'08:00',end:'14:00'},{staffId:'b',dayOfWeek:1,start:'14:00',end:'21:00'}]);
  expect(gaps.find(g=>g.day===1)).toBeUndefined();
  expect(gaps.find(g=>g.day===0)?.gaps).toEqual([{start:'08:00',end:'21:00'}]);
 });
 it('validates room capacity, opening hours, and overlapping approved bookings',()=>{
  const prior={id:'a',room:'MAIN20',date:'2026-11-23',start:'10:00',end:'11:00',attendees:10,status:'approved' as const};
  expect(validateRoomRequest({...prior,id:'b',start:'10:30',end:'11:30'},[prior])).toContain('Classroom is already reserved');
  expect(validateRoomRequest({...prior,id:'b',start:'11:00',end:'12:00'},[prior])).toEqual([]);
  expect(validateRoomRequest({...prior,attendees:21},[])).toContain('Capacity exceeded');
  expect(validateRoomRequest({...prior,start:'07:00'},[])).toContain('Booking must stay inside 08:00–21:00 Pakistan time');
 });
 it('blocks tutor allocations without subject and safeguarding approval',()=>{
  const approved={identityVerified:true,qualificationVerified:true,safeguardingCleared:true,subjectApproved:true,approvedByAcademicHead:true};
  expect(mayAssignTutor(approved)).toBe(true);
  expect(mayAssignTutor({...approved,safeguardingCleared:false})).toBe(false);
  expect(mayAssignTutor({...approved,approvedByAcademicHead:false})).toBe(false);
 });
 it('computes source-only utilisation without guessing live room availability',()=>{
  expect(roomOccupancyPercent([{id:'a',room:'MAIN20',date:'2026-11-23',start:'08:00',end:'09:00',attendees:10,status:'approved'}],
   ['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27','2026-11-28','2026-11-29'])).toBe(0.27);
 });
});
