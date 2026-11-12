import {describe,expect,it} from 'vitest';
import {chooseStudentStudyFocus} from './studyFocus';
import type {AgendaBrief} from './studentAgenda';

const now=Date.parse('2026-11-12T09:00:00Z');
const brief=(id:string,cutoff='2026-11-13T15:00:00Z',module_id='m1'):AgendaBrief=>({
 id,module_id,title:'Brief '+id,due_at:'2026-11-12T13:00:00Z',submission_cutoff:cutoff,max_attempts:2,
});
const empty=()=>({action:[] as AgendaBrief[],review:[] as AgendaBrief[],released:[] as AgendaBrief[],closed:[] as AgendaBrief[]});
const session=(id:string,start='2026-11-12T09:30:00Z',module_id='m1')=>({
 id,module_id,title:'Class '+id,starts_at:start,ends_at:'2026-11-12T11:00:00Z',
});
describe('study focus uses only verified learner records',()=>{
 it('prefers an imminent class but does not claim a Teams invitation exists',()=>{
  const agenda={...empty(),action:[brief('essay')]};
  const item=chooseStudentStudyFocus(agenda,[session('physics')],['m1'],now);
  expect(item).toMatchObject({kind:'class-check',evidence:'Enrolled-module class listing'});
  expect(item?.detail).toMatch(/separate valid invitation/);
  expect(item?.href).toBe('/student/classroom?module=m1&session=physics');
 });
 it('prioritises a currently closing brief over a class later',()=>{
  const agenda={...empty(),action:[brief('urgent','2026-11-12T09:15:00Z')]};
  expect(chooseStudentStudyFocus(agenda,[session('later')],['m1'],now)).toMatchObject({
   kind:'coursework',href:'/student/assignments?module=m1',
  });
 });
 it('reports a passed due date without claiming an invalid entitlement',()=>{
  const item=chooseStudentStudyFocus({...empty(),action:[{...brief('late'),due_at:'2026-11-11T12:00:00Z'}]},[],['m1'],now);
  expect(item?.detail).toMatch(/due date has passed/);
  expect(item?.actionLabel).toMatch(/eligibility/);
 });
 it('does not create suggestions from non-enrolled or invalid source records',()=>{
  const agenda={...empty(),action:[brief('external','2026-11-13T15:00:00Z','m9'),brief('invalid','invalid')]};
  const item=chooseStudentStudyFocus(agenda,[session('other','2026-11-12T09:30:00Z','m9')],['m1'],now);
  expect(item).toBeNull();
  expect(chooseStudentStudyFocus({...empty(),action:[brief('a')]},[],[],now)).toBeNull();
  expect(chooseStudentStudyFocus({...empty(),action:[brief('a')]},[],['m1'],Number.NaN)).toBeNull();
 });
 it('keeps pending human review and released results distinct',()=>{
  const pending=chooseStudentStudyFocus({...empty(),review:[brief('mark')]},[],['m1'],now);
  expect(pending).toMatchObject({kind:'review',href:'/student/assignments?module=m1'});
  expect(pending?.detail).toMatch(/independent IQA approval/);
  const released=chooseStudentStudyFocus({...empty(),released:[brief('approved')]},[],['m1'],now);
  expect(released).toMatchObject({kind:'released',href:'/student/grades?module=m1'});
  expect(released?.detail).not.toMatch(/provisional.*released/i);
 });
 it('ignores classes with expired end times and never guesses a deadline',()=>{
  const expired={...session('expired'),ends_at:'2026-11-11T12:00:00Z'};
  expect(chooseStudentStudyFocus(empty(),[expired],['m1'],now)).toBeNull();
 });
});
