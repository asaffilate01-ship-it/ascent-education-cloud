import {describe,it,expect} from 'vitest';
import {academicReviewSnapshot,academicReviewBrief,type ReviewInputs} from '@/lib/academicReviewSignals';

const fixtures:ReviewInputs={
 enrolments:[
  {tenant_id:'centre-a',student_id:'alice',status:'active'},
  {tenant_id:'centre-a',student_id:'alice',status:'active'},
  {tenant_id:'centre-a',student_id:'bob',status:'active'},
  {tenant_id:'centre-a',student_id:'withdrawn',status:'withdrawn'},
  {tenant_id:'centre-b',student_id:'outside',status:'active'},
 ],
 attendance:[
  {tenant_id:'centre-a',student_id:'alice',status:'absent'},
  {tenant_id:'centre-a',student_id:'alice',status:'absent'},
  {tenant_id:'centre-a',student_id:'bob',status:'present'},
  {tenant_id:'centre-a',student_id:'withdrawn',status:'absent'},
  {tenant_id:'centre-a',student_id:'bob',status:'unknown'},
  {tenant_id:'centre-b',student_id:'outside',status:'absent'},
 ],
 submissions:[
  {tenant_id:'centre-a',status:'submitted'},
  {tenant_id:'centre-a',status:'graded'},
  {tenant_id:'centre-b',status:'submitted'},
 ],
 modules:[
  {tenant_id:'centre-a',status:'active',lecturer_id:null},
  {tenant_id:'centre-a',status:'active',lecturer_id:'teacher'},
  {tenant_id:'centre-a',status:'archived',lecturer_id:null},
  {tenant_id:'centre-b',status:'active',lecturer_id:null},
 ],
};
describe('academic operational review signals',()=>{
 it('uses only centre-scoped records and distinct active learners',()=>{
  expect(academicReviewSnapshot('centre-a',fixtures)).toEqual({
   activeLearners:2,attendanceRecords:3,learnersWithRecordedAbsence:1,
   submittedCoursework:1,activeModules:2,modulesWithoutLecturer:1,evidenceAvailable:true
  });
  expect(academicReviewSnapshot('centre-b',fixtures)).toMatchObject({
   activeLearners:1,attendanceRecords:1,learnersWithRecordedAbsence:1,submittedCoursework:1,
   activeModules:1,modulesWithoutLecturer:1
  });
 });
 it('fails closed for a missing centre and does not invent academic readiness',()=>{
  const noScope=academicReviewSnapshot('',fixtures);
  expect(noScope.activeLearners).toBe(0);
  expect(noScope.evidenceAvailable).toBe(false);
  expect(academicReviewSnapshot('empty',fixtures).evidenceAvailable).toBe(false);
  const brief=academicReviewBrief(academicReviewSnapshot('centre-a',fixtures),'2026-10-31T00:00:00.000Z');
  expect(brief).toContain('Learners with a recorded absence: 1');
  expect(brief).toContain('No grades, personal details');
  for(const personal of ['alice','bob','outside'])expect(brief).not.toContain(personal);
  expect(brief).not.toMatch(/university ready|distinction|at-risk student|guaranteed placement/i);
 });
 it('does not interpret legacy provisional grades even if a caller carries them',()=>{
  const enriched={...fixtures,submissions:[{tenant_id:'centre-a',status:'submitted',grade:0},{tenant_id:'centre-a',status:'graded',grade:99}]};
  expect(academicReviewSnapshot('centre-a',enriched)).toMatchObject({submittedCoursework:1});
 });
});
