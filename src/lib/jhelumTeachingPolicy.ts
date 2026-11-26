/** Proposed teaching operations rules — deterministic validation only, not live scheduling/entitlement enforcement. */
export type SessionTrack='school_tuition'|'acca_prep'|'ielts_prep'|'tech_cert_prep'|'othm'|'qualifi';
export type AttendanceMode='in_person'|'hybrid'|'online';
export const KARACHI_TIME_ZONE='Asia/Karachi' as const;
export const DAY_START_MINUTES=8*60;
export const DAY_END_MINUTES=21*60;
export function lessonMinutes(track:SessionTrack):45|90{
 return track==='school_tuition'?45:90;
}
export function validateTeachingSlot(input:{
 track:SessionTrack; startMinutes:number; endMinutes:number;
 tutorQualified:boolean; tutorAvailable:boolean; equipmentReady:boolean;
 mode:AttendanceMode; physicalSeats:number; roomCapacity:number;
 onlineSeats:number; onlineCapacity:number;
}):{valid:boolean;reasons:string[]}{
 const reasons:string[]=[];
 if(!Number.isInteger(input.startMinutes)||!Number.isInteger(input.endMinutes)||
 input.startMinutes<DAY_START_MINUTES||input.endMinutes>DAY_END_MINUTES||
 input.endMinutes-input.startMinutes!==lessonMinutes(input.track))reasons.push('outside_hours_or_wrong_duration');
 if(!input.tutorQualified)reasons.push('tutor_not_approved_for_subject_level');
 if(!input.tutorAvailable)reasons.push('tutor_unavailable');
 if(!input.equipmentReady)reasons.push('required_lab_equipment_missing');
 if([input.physicalSeats,input.roomCapacity,input.onlineSeats,input.onlineCapacity].some(x=>!Number.isInteger(x)||x<0))
 reasons.push('invalid_capacity');
 else {
  if(input.physicalSeats>input.roomCapacity)reasons.push('room_capacity_exceeded');
  if(input.onlineSeats>input.onlineCapacity)reasons.push('online_capacity_exceeded');
  if(input.mode==='online'&&input.physicalSeats!==0)reasons.push('physical_seats_in_online_class');
  if(input.mode==='in_person'&&input.onlineSeats!==0)reasons.push('online_seats_in_person_class');
  if(input.physicalSeats+input.onlineSeats===0)reasons.push('empty_class');
 }
 return {valid:reasons.length===0,reasons};
}
export type FeeStanding='verified_current'|'grace_period'|'verified_overdue'|'disputed'|'unknown';
export type StudentResource='login'|'live_lesson'|'recording'|'course_material'|'billing'|'safeguarding'|'appeal'|'personal_records';
/** Never equate unknown or disputed finance state with confirmed unpaid status.
 * Keep core identity, legal rights, safety and billing access available.
 * Use only on the server after verified enrollment/guardian authorization; UI is advisory. */
export function learningAccessByFee(standing:FeeStanding,resource:StudentResource):'allow'|'manual_review'|'course_restricted'{
 if(['login','billing','safeguarding','appeal','personal_records'].includes(resource))return 'allow';
 if(standing==='verified_current'||standing==='grace_period')return 'allow';
 if(standing==='verified_overdue')return 'course_restricted';
 return 'manual_review';
}
export function remoteEquipmentNotice(language:'en'|'ur'){
 return language==='ur'
 ? 'آن لائن کلاس کے لیے مناسب لیپ ٹاپ، مستحکم انٹرنیٹ اور مائیکروفون والا ہیڈسیٹ درکار ہے۔ کورس کے مطابق کم از کم ضروریات داخلہ ٹیم بتائے گی۔'
 : 'Remote learners need a suitable laptop, stable internet and a headset with microphone. Admissions will confirm the course-specific minimum specifications before enrolment.';
}
