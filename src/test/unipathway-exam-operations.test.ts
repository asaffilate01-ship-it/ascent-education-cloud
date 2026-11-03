import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 examOperationsScope,verifyExamPlans,verifyExamReceipt,validExamDraft,planMatchesCalendar,
 type ExamPlan,type ExamDraft
} from '@/lib/exams/examOperations';
const centre='centre-a',other='centre-b';
const user={id:'officer',tenantId:centre,role:'exams_officer',roles:['exams_officer']};
const plan:ExamPlan={
 tenant_id:centre,event_id:'exam',event_start:'2026-12-01T09:00:00Z',
 event_end:'2026-12-01T12:00:00Z',event_location:'Room A',
 room_capacity:24,planned_candidates:18,planned_invigilators:2,
 seating_process_checked:true,entry_list_process_checked:true,
 identity_process_checked:true,emergency_process_checked:true,
 status:'submitted',revision:2,updated_at:'2026-11-03T09:00:00Z'
};
const draft:ExamDraft={
 capacity:24,candidates:18,invigilators:2,seating:true,entries:true,identity:true,emergency:true
};
describe('UniPathway exam planning and independent approval contract',()=>{
 it('requires active, centre-scoped membership; no global owner/secondary role bypass',()=>{
  expect(examOperationsScope(user)).toBe(centre);
  expect(examOperationsScope({...user,role:'centre_director',roles:['centre_director']})).toBe(centre);
  expect(examOperationsScope({...user,role:'student',roles:['student','exams_officer']})).toBeNull();
  expect(examOperationsScope({...user,roles:['student']})).toBeNull();
  expect(examOperationsScope({...user,role:'superadmin',roles:['superadmin']})).toBeNull();
  expect(examOperationsScope({...user,tenantId:undefined})).toBeNull();
 });
 it('accepts only centre-bound, fixed-column, individually verified plan projections',()=>{
  expect(verifyExamPlans([plan],centre)).toEqual([plan]);
  expect(()=>verifyExamPlans([{...plan,tenant_id:other}],centre)).toThrow();
  expect(()=>verifyExamPlans([{...plan,updated_by:'private'}],centre)).toThrow();
  expect(()=>verifyExamPlans([{...plan,candidate_name:'secret'}],centre)).toThrow();
  expect(()=>verifyExamPlans([{...plan,revision:0}],centre)).toThrow();
  expect(()=>verifyExamPlans([{...plan,status:'officially_registered'}],centre)).toThrow();
  expect(()=>verifyExamPlans([plan,plan],centre)).toThrow();
  expect(()=>verifyExamPlans({rows:[plan]},centre)).toThrow();
 });
 it('confirms centre, event and next revision, never trusts a mismatched RPC receipt',()=>{
  expect(verifyExamReceipt({tenant_id:centre,event_id:'exam',status:'internally_approved',revision:3},centre,'exam','internally_approved',2).revision).toBe(3);
  for(const receipt of [
   {tenant_id:other,event_id:'exam',status:'internally_approved',revision:3},
   {tenant_id:centre,event_id:'other',status:'internally_approved',revision:3},
   {tenant_id:centre,event_id:'exam',status:'submitted',revision:3},
   {tenant_id:centre,event_id:'exam',status:'internally_approved',revision:2},
   {tenant_id:centre,event_id:'exam',status:'internally_approved',revision:3,student_id:'private'}
  ])expect(()=>verifyExamReceipt(receipt,centre,'exam','internally_approved',2)).toThrow();
 });
 it('requires practical capacity, invigilators and four process attestations for submission',()=>{
  expect(validExamDraft(draft,true)).toBe(true);
  expect(validExamDraft({...draft,candidates:25},false)).toBe(false);
  expect(validExamDraft({...draft,invigilators:0},false)).toBe(true);
  expect(validExamDraft({...draft,invigilators:0},true)).toBe(false);
  expect(validExamDraft({...draft,entries:false},true)).toBe(false);
  expect(validExamDraft({...draft,candidates:0},true)).toBe(false);
 });
 it('rejects calendar changes after plan submission, even within the same centre',()=>{
  const event={id:'exam',tenant_id:centre,event_type:'exam',start_date:plan.event_start,end_date:plan.event_end,location:'Room A',all_day:false};
  expect(planMatchesCalendar(plan,event)).toBe(true);
  expect(planMatchesCalendar(plan,{...event,location:'Room B'})).toBe(false);
  expect(planMatchesCalendar(plan,{...event,end_date:'2026-12-01T13:00:00Z'})).toBe(false);
  expect(planMatchesCalendar(plan,{...event,tenant_id:other})).toBe(false);
  expect(planMatchesCalendar(plan,{...event,all_day:true})).toBe(false);
 });
 it('only routes verified roles to the private RPC workspace and no direct table reads',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  const screen=readFileSync('src/pages/exams/ExamSessionOperations.tsx','utf8');
  expect(app).toContain('<Route path="/exams/session-plans" element={<RoleGuard allowed={[\'exams_officer\']}>');
  expect(app).toContain('<Route path="/director/exam-plans" element={<RoleGuard allowed={[\'centre_director\']}>');
  expect(screen).toContain('EXAM_OPERATIONS_ENABLED');
  expect(screen).toContain("db.rpc('get_unipathway_exam_session_plans'");
  expect(screen).toContain("db.rpc('unipathway_save_exam_session_plan'");
  expect(screen).toContain("db.rpc('unipathway_approve_exam_session_plan'");
  expect(screen).not.toMatch(/\.from\(['"]unipathway_examops/);
 });
});
