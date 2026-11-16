import {describe,expect,it} from 'vitest';
import {parseAcademicInstant} from './academicTime';
import {courseworkQueueState,formatPakistanAcademicDate} from './assessment/courseworkQueue';
import {courseworkDeadlineGuidance} from './assessment/deadlineGuidance';
import {buildStudentCourseworkAgenda} from './assessment/studentAgenda';
import {chooseStudentStudyFocus} from './assessment/studyFocus';
import {loadVerifiedClassAgenda} from './learning/verifiedClassAgenda';

const at=Date.parse('2026-11-16T09:00:00Z');

describe('device-independent academic times and eligibility guidance',()=>{
 it('treats explicit UTC and offset timestamps as the same instant',()=>{
  const expected=Date.parse('2026-11-16T09:00:00Z');
  expect(parseAcademicInstant('2026-11-16T09:00:00Z')).toBe(expected);
  expect(parseAcademicInstant('2026-11-16T14:00:00+05:00')).toBe(expected);
  expect(parseAcademicInstant('2026-11-16T04:00:00-05:00')).toBe(expected);
  expect(parseAcademicInstant('2026-11-16T09:00:00.000000Z')).toBe(expected);
  expect(parseAcademicInstant('2026-11-16T09:00+00:00')).toBe(expected);
 });
 it('interprets legacy ISO date-only fields as UTC, never the device timezone',()=>{
  expect(parseAcademicInstant('2026-11-16')).toBe(Date.parse('2026-11-16T00:00:00Z'));
  expect(formatPakistanAcademicDate('2026-11-16')).toContain('05:00');
 });
 it('rejects ambiguous local timestamps and coercible non-ISO dates',()=>{
  for(const value of [
   '2026-11-16T10:00:00','2026-11-16T10:00','16 Nov 2026 10:00',
   '2026/11/16','2026-11-16 10:00:00+05:00','2026-11-16T10:00:00+0500',
   '2026-11-16T24:00:00Z','2026-11-16T10:60:00Z','2026-11-16T10:00:60Z',
   '2026-11-16T10:00:00+14:01','2026-11-16T10:00:00+15:00',
   '2026-02-30','2026-02-29T10:00:00Z','2026-13-01','2026-00-10',
   '',null,undefined,{},99,
  ])expect(parseAcademicInstant(value)).toBeNull();
  expect(parseAcademicInstant('2028-02-29T00:00:00Z')).not.toBeNull();
 });
 it('keeps ambiguous submission cutoffs closed even when device-local parsing would allow them',()=>{
  const cutoff='2026-11-17T12:00:00';
  const state=courseworkQueueState({submission_cutoff:cutoff,max_attempts:2},[],false,at);
  expect(state).toEqual({stage:'closed',maySubmit:false});
  expect(formatPakistanAcademicDate(cutoff)).toBe('Date unavailable');
  const guidance=courseworkDeadlineGuidance({id:'brief',due_at:'2026-11-16T08:00:00Z',submission_cutoff:cutoff},at);
  expect(guidance.priority).toBe('verify');
  expect(guidance.detail).toMatch(/verification/);
 });
 it('does not promote a malformed deadline to actionable coursework or recommended focus',()=>{
  const brief={id:'b1',module_id:'m1',title:'Essay',due_at:'2026-11-16T08:00:00Z',
   submission_cutoff:'2026-11-17T12:00:00',max_attempts:2};
  const agenda=buildStudentCourseworkAgenda([brief],[],[],at);
  expect(agenda.action).toHaveLength(0);
  expect(agenda.closed.map(row=>row.id)).toEqual(['b1']);
  expect(chooseStudentStudyFocus(agenda,[],['m1'],at)).toBeNull();
 });
 it('rejects a timezone-free classroom session rather than claiming a valid class listing',async()=>{
  const session={id:'s1',tenant_id:'centre',module_id:'m1',status:'scheduled',
   title:'Workshop',starts_at:'2026-11-16T12:00:00',ends_at:'2026-11-16T13:00:00Z'};
  await expect(loadVerifiedClassAgenda(['m1'],'centre',at,async()=>[session])).rejects.toThrow(/verification/);
 });
 it('preserves verified offset-aware classroom sessions and prioritises upcoming work',async()=>{
  const session={id:'s1',tenant_id:'centre',module_id:'m1',status:'scheduled',
   title:'Workshop',starts_at:'2026-11-16T14:30:00+05:00',ends_at:'2026-11-16T16:30:00+05:00'};
  const classes=await loadVerifiedClassAgenda(['m1'],'centre',at,async()=>[session]);
  expect(classes.map(s=>s.id)).toEqual(['s1']);
  const focus=chooseStudentStudyFocus({action:[],review:[],released:[],closed:[]},classes,['m1'],at);
  expect(focus?.kind).toBe('class-check');
  expect(focus?.detail).toMatch(/invitation/);
 });
});
