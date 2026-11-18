import {describe,expect,it} from 'vitest';
import {buildStudentCourseworkAgenda} from './studentAgenda';
import {
 verifyStudentAgendaBriefs,verifyStudentAgendaEvidence,
 type StudentAgendaScope,
} from './verifiedStudentAgenda';

const scope:StudentAgendaScope={tenantId:'centre-a',studentId:'student-one',moduleIds:['module-a']};
const brief=(change:Record<string,unknown>={})=>({
 id:'brief-a',tenant_id:'centre-a',module_id:'module-a',title:'A published assessment',
 status:'published',due_at:'2099-01-02T04:00:00Z',
 submission_cutoff:'2099-01-05T04:00:00Z',max_attempts:2,...change,
});
const attempt=(change:Record<string,unknown>={})=>({
 id:'attempt-a',tenant_id:'centre-a',student_id:'student-one',
 brief_id:'brief-a',attempt_no:1,status:'submitted',...change,
});
const release=(change:Record<string,unknown>={})=>({
 attempt_id:'attempt-a',tenant_id:'centre-a',student_id:'student-one',
 brief_id:'brief-a',...change,
});
const verify=(b:unknown=[brief()],a:unknown=[attempt()],r:unknown=[])=>{
 const briefs=verifyStudentAgendaBriefs(b,scope);
 return verifyStudentAgendaEvidence(briefs,a,r,scope);
};

describe('Phase 13: evidence-bound student coursework dashboard',()=>{
 it('accepts a published, same-centre assessment and learner-owned attempt without claiming release',()=>{
  const checked=verify();
  expect(checked.briefs).toHaveLength(1);
  expect(checked.attempts).toHaveLength(1);
  const agenda=buildStudentCourseworkAgenda(checked.briefs,checked.attempts,checked.released,
   Date.parse('2099-01-01T00:00:00Z'));
  expect(agenda.action).toHaveLength(0);
  expect(agenda.review.map(row=>row.id)).toEqual(['brief-a']);
 });
 it('accepts a matching independently released result only for its originating attempt',()=>{
  const checked=verify([brief()],[attempt({status:'human_marked'})],[release()]);
  const agenda=buildStudentCourseworkAgenda(checked.briefs,checked.attempts,checked.released,
   Date.parse('2099-01-01T00:00:00Z'));
  expect(agenda.released.map(row=>row.id)).toEqual(['brief-a']);
 });
 it('fails closed on forged or corrupt brief scope before fetching dependent evidence',()=>{
  for(const bad of [
   brief({tenant_id:'another-centre'}),brief({module_id:'unassigned-module'}),
   brief({status:'draft'}),brief({id:' '}),brief({title:''}),
   brief({max_attempts:0}),brief({max_attempts:'2'}),
  ])expect(()=>verifyStudentAgendaBriefs([bad],scope)).toThrow(/verification/);
  expect(()=>verifyStudentAgendaBriefs([brief(),brief()],scope)).toThrow(/verification/);
  expect(()=>verifyStudentAgendaBriefs([brief()],{...scope,tenantId:''})).toThrow(/Unverified/);
 });
 it('preserves readable invalid due-date guidance without inventing a valid deadline',()=>{
  const checked=verify([brief({due_at:'unverified-date'})],[],[]);
  const agenda=buildStudentCourseworkAgenda(checked.briefs,checked.attempts,checked.released,
   Date.parse('2099-01-01T00:00:00Z'));
  expect(agenda.action).toHaveLength(1);
  // The caller's study-focus guard must not recommend a malformed date.
  expect(agenda.action[0].due_at).toBe('unverified-date');
 });
 it('rejects returned attempts from another student, centre, brief or duplicated number',()=>{
  for(const bad of [
   attempt({student_id:'student-two'}),attempt({tenant_id:'centre-b'}),
   attempt({brief_id:'other-brief'}),attempt({attempt_no:0}),
   attempt({attempt_no:1.5}),attempt({status:''}),
  ])expect(()=>verify([brief()],[bad])).toThrow(/verification/);
  expect(()=>verify([brief()],[attempt(),attempt({id:'attempt-two'})]))
   .toThrow(/Duplicate coursework attempt number/);
  expect(()=>verify([brief()],[attempt(),attempt()])).toThrow(/verification/);
 });
 it('rejects unlinked, cross-brief, cross-student or duplicated released receipts',()=>{
  for(const bad of [
   release({attempt_id:'another-attempt'}),
   release({brief_id:'another-brief'}),
   release({student_id:'student-two'}),
   release({tenant_id:'centre-b'}),
  ])expect(()=>verify([brief()],[attempt()],[bad])).toThrow(/verification/);
  expect(()=>verify([brief()],[attempt()],[release(),release()])).toThrow(/verification/);
 });
 it('requires complete arrays rather than silently treating a failed backend as zero',()=>{
  expect(()=>verifyStudentAgendaBriefs(null,scope)).toThrow(/Incomplete/);
  expect(()=>verify([brief()],null,[])).toThrow(/Incomplete/);
  expect(()=>verify([brief()],[],null)).toThrow(/Incomplete/);
  expect(()=>verifyStudentAgendaBriefs([null],scope)).toThrow(/Unverified/);
  expect(verify([],[],[])).toEqual({briefs:[],attempts:[],released:[]});
 });
 it('does not mutate source rows or invent an attempt count',()=>{
  const briefs=[brief()],attempts=[attempt()];
  const checked=verify(briefs,attempts,[]);
  expect(checked.briefs[0].id).toBe(briefs[0].id);
  expect(attempts[0].attempt_no).toBe(1);
  expect(checked.released).toHaveLength(0);
 });
 it('fails closed on missing attempts, out-of-policy numbers and unsubmitted draft records',()=>{
  expect(()=>verify([brief()],[attempt({attempt_no:2})])).toThrow(/Incomplete coursework attempt history/);
  expect(()=>verify([brief({max_attempts:1})],[attempt({attempt_no:2})])).toThrow(/verification/);
  expect(()=>verify([brief()],[attempt({status:'draft'})])).toThrow(/verification/);
  expect(()=>verify([brief({max_attempts:3})],[
   attempt(),attempt({id:'attempt-three',attempt_no:3}),
  ])).toThrow(/Incomplete coursework attempt history/);
  const checked=verify([brief({max_attempts:3})],[
   attempt(),attempt({id:'attempt-two',attempt_no:2}),
   attempt({id:'attempt-three',attempt_no:3}),
  ]);
  expect(checked.attempts.map(row=>row.attempt_no)).toEqual([1,2,3]);
 });

});
