import {describe,it,expect} from 'vitest';
import {lessonMinutes,validateTeachingSlot,learningAccessByFee,remoteEquipmentNotice} from './jhelumTeachingPolicy';
const valid={
 track:'school_tuition' as const,startMinutes:8*60,endMinutes:8*60+45,
 tutorQualified:true,tutorAvailable:true,equipmentReady:true,mode:'in_person' as const,
 physicalSeats:10,roomCapacity:10,onlineSeats:0,onlineCapacity:0
};
describe('Jhelum timetable rules',()=>{
 it('assigns 45 mins tuition and 90 mins qualifications / test preparation',()=>{
   expect(lessonMinutes('school_tuition')).toBe(45);
   for(const track of ['acca_prep','ielts_prep','tech_cert_prep','othm','qualifi'] as const)
     expect(lessonMinutes(track)).toBe(90);
 });
 it('accepts an 08:00–08:45 tuition session with an approved tutor and ten seats',()=>{
   expect(validateTeachingSlot(valid)).toEqual({valid:true,reasons:[]});
 });
 it('rejects overbooked rooms, mistimed sessions, unapproved tutors and missing equipment',()=>{
   const result=validateTeachingSlot({...valid,physicalSeats:20,endMinutes:8*60+90,tutorQualified:false,equipmentReady:false});
   expect(result.valid).toBe(false);
   expect(result.reasons).toContain('room_capacity_exceeded');
   expect(result.reasons).toContain('outside_hours_or_wrong_duration');
   expect(result.reasons).toContain('tutor_not_approved_for_subject_level');
   expect(result.reasons).toContain('required_lab_equipment_missing');
 });
 it('rejects an attempt to schedule past 21:00 PKT',()=>{
   expect(validateTeachingSlot({...valid,startMinutes:20*60+30,endMinutes:21*60+15}).valid).toBe(false);
 });
});
describe('financial protection',()=>{
 it('restricts course service on verified overdue only and preserves login, appeals and billing',()=>{
   expect(learningAccessByFee('verified_overdue','recording')).toBe('course_restricted');
   expect(learningAccessByFee('verified_overdue','login')).toBe('allow');
   expect(learningAccessByFee('verified_overdue','billing')).toBe('allow');
   expect(learningAccessByFee('verified_overdue','safeguarding')).toBe('allow');
   expect(learningAccessByFee('verified_overdue','personal_records')).toBe('allow');
   expect(learningAccessByFee('disputed','live_lesson')).toBe('manual_review');
   expect(learningAccessByFee('unknown','course_material')).toBe('manual_review');
 });
 it('provides English and Urdu remote-equipment notices',()=>{
   expect(remoteEquipmentNotice('en')).toMatch(/laptop/);
   expect(remoteEquipmentNotice('ur')).toMatch(/لیپ ٹاپ/);
 });
});
