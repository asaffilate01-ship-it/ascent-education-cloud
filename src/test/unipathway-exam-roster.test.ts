import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {EXAM_ROSTER_ENABLED,EXAM_ROSTER_WRITES_ENABLED,
 verifyExamRoster,verifyRosterReceipt,rosterCanSubmit,normaliseSeat,validSeatCode,validStudentId,
 type ExamRoster} from '@/lib/exams/examRoster';
import type {ExamPlan} from '@/lib/exams/examOperations';
const tenant='10000000-0000-4000-8000-000000000001';
const programme='30000000-0000-4000-8000-000000000003';
const student='20000000-0000-4000-8000-000000000004';
const exam='30000000-0000-4000-8000-000000000001';
const plan:ExamPlan={tenant_id:tenant,event_id:exam,event_start:'2026-12-01T09:00:00Z',event_end:'2026-12-01T12:00:00Z',event_location:'Room A',room_capacity:3,planned_candidates:2,planned_invigilators:1,seating_process_checked:true,entry_list_process_checked:true,identity_process_checked:true,emergency_process_checked:true,status:'internally_approved',revision:3,updated_at:'2026-11-03T09:00:00Z'};
const roster:ExamRoster={tenant_id:tenant,event_id:exam,programme_id:programme,status:'draft',revision:2,room_capacity:3,planned_candidates:2,seats:[{seat_label:'A1',student_ref:'••••00000004'}]};
describe('UniPathway F2 candidate enrolment and private provisional seating',()=>{
 it('gates both data reads and mutations behind disabled-by-default environment flags',()=>{
  expect(EXAM_ROSTER_ENABLED).toBe(false);
  expect(EXAM_ROSTER_WRITES_ENABLED).toBe(false);
 });
 it('accepts one verified centre-scoped masked roster',()=>{
  expect(verifyExamRoster(roster,tenant,exam,plan)).toEqual(roster);
  const unconfigured={...roster,status:'unconfigured',revision:0,programme_id:null,seats:[]};
  expect(verifyExamRoster(unconfigured,tenant,exam,plan).status).toBe('unconfigured');
 });
 it('fails closed for foreign centres, secret fields, oversized or duplicate seats',()=>{
  const variations=[
   {...roster,tenant_id:'10000000-0000-4000-8000-000000000002'},
   {...roster,student_name:'Leaked'},
   {...roster,seats:[{seat_label:'A1',student_ref:student}]},
   {...roster,seats:[{seat_label:'A1',student_ref:'••••00000004',email:'secret'}]},
   {...roster,seats:[{seat_label:'A1',student_ref:'••••00000004'},{seat_label:'A1',student_ref:'••••00000005'}]},
   {...roster,seats:Array.from({length:3},(_,i)=>({seat_label:'A'+i,student_ref:'••••00000004'}))},
   {...roster,programme_id:null},
   {...roster,revision:-1},
   {...roster,status:'officially_registered'},
  ];
  for(const row of variations)expect(()=>verifyExamRoster(row,tenant,exam,plan)).toThrow();
  expect(()=>verifyExamRoster({...roster,status:'internally_approved'},tenant,exam,plan)).toThrow();
  expect(()=>verifyExamRoster(roster,'10000000-0000-4000-8000-000000000002',exam,plan)).toThrow();
 });
 it('treats approved internal rosters as complete and requires exact count to submit',()=>{
  expect(rosterCanSubmit(roster)).toBe(false);
  const full={...roster,seats:[...roster.seats,{seat_label:'A2',student_ref:'••••00000005'}]};
  expect(rosterCanSubmit(full)).toBe(true);
  expect(verifyExamRoster({...full,status:'internally_approved'},tenant,exam,plan).seats).toHaveLength(2);
 });
 it('checks one atomic action receipt with exact event, action and next revision',()=>{
  const ok={tenant_id:tenant,event_id:exam,status:'draft',revision:3,action:'assign'};
  expect(verifyRosterReceipt(ok,tenant,exam,'assign',2)).toEqual(ok);
  for(const v of [
   {...ok,tenant_id:'10000000-0000-4000-8000-000000000002'},
   {...ok,status:'submitted'}, {...ok,revision:2}, {...ok,action:'remove'},
   {...ok,student_id:student},
  ])expect(()=>verifyRosterReceipt(v,tenant,exam,'assign',2)).toThrow();
 });
 it('normalises only valid provisional seat codes and institutional learner UUIDs',()=>{
  expect(normaliseSeat(' a12 ')).toBe('A12');
  expect(validSeatCode('b21')).toBe(true);
  for(const s of ['A','1A','A 1','A1234','<script>','ABCD2'])expect(validSeatCode(s)).toBe(false);
  expect(validStudentId(student)).toBe(true);
  expect(validStudentId('passport number')).toBe(false);
 });
 it('routes the separated director/exams workspaces through active-role guards, never raw tables',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  const screen=readFileSync('src/pages/exams/ExamCandidateRoster.tsx','utf8');
  expect(app).toContain('<Route path="/exams/candidate-seating" element={<RoleGuard allowed={[\'exams_officer\']}>');
  expect(app).toContain('<Route path="/director/exam-rosters" element={<RoleGuard allowed={[\'centre_director\']}>');
  expect(screen).toContain('EXAM_ROSTER_ENABLED');
  expect(screen).toContain("db.rpc('get_unipathway_exam_roster'");
  expect(screen).toContain("db.rpc('mutate_unipathway_exam_roster'");
  expect(screen).toContain('verifyExamRoster(data,tenant,selected,selectedPlan)');
  expect(screen).not.toMatch(/\.from\(['"](?:student_enrolments|profiles|unipathway_exam_roster)/);
 });
});
