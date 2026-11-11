import {describe,expect,it} from 'vitest';
import {buildStudentCourseworkAgenda,type AgendaBrief} from './studentAgenda';

const NOW=Date.parse('2026-11-11T10:00:00Z');
const brief=(id:string,cutoff='2026-11-12T10:00:00Z',limit=2):AgendaBrief=>({id,module_id:'m1',title:id,due_at:cutoff,submission_cutoff:cutoff,max_attempts:limit});
describe('student agenda and full coursework queue agree',()=>{
 it('shows first attempts as actionable and submitted work as awaiting review',()=>{
  const result=buildStudentCourseworkAgenda([brief('a'),brief('b')],[{brief_id:'b',attempt_no:1,status:'submitted'}],[],NOW);
  expect(result.action.map(item=>item.id)).toEqual(['a']);
  expect(result.review.map(item=>item.id)).toEqual(['b']);
 });
 it('allows a marker-requested resubmission only within attempt limit',()=>{
  const attempts=[{brief_id:'a',attempt_no:1,status:'resubmission_requested'}];
  expect(buildStudentCourseworkAgenda([brief('a')],attempts,[],NOW).action).toHaveLength(1);
  expect(buildStudentCourseworkAgenda([brief('a',undefined,1)],attempts,[],NOW).closed).toHaveLength(1);
 });
 it('never promotes an expired, invalid or exhausted brief to actionable',()=>{
  const briefs=[brief('expired','2026-11-10T09:00:00Z'),brief('invalid','bad time'),brief('exhausted','2026-11-12T10:00:00Z',0)];
  const result=buildStudentCourseworkAgenda(briefs,[],[],NOW);
  expect(result.action).toHaveLength(0);
  expect(result.closed.map(item=>item.id)).toEqual(['expired','exhausted','invalid']);
 });
 it('keeps released feedback separate from actionable work',()=>{
  const result=buildStudentCourseworkAgenda([brief('a')],[{brief_id:'a',attempt_no:1,status:'human_marked'}],[{brief_id:'a'}],NOW);
  expect(result.released.map(item=>item.id)).toEqual(['a']);
  expect(result.action).toHaveLength(0);
 });
 it('sorts valid deadlines first and handles latest attempt independent of read order',()=>{
  const a=brief('a','2026-11-13T10:00:00Z'),b=brief('b','2026-11-12T10:00:00Z');
  const attempts=[{brief_id:'a',attempt_no:1,status:'submitted'},{brief_id:'a',attempt_no:2,status:'resubmission_requested'}];
  const result=buildStudentCourseworkAgenda([a,b],attempts,[],NOW);
  expect(result.action.map(item=>item.id)).toEqual(['b']);
  expect(result.review).toHaveLength(0);
 });
});
