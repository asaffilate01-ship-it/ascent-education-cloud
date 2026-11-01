import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {summariseAssignedIqaWorkload} from '@/lib/qa/assignedIqaWorkload';
describe('IQA dashboard allocation boundaries',()=>{
 it('counts only own allocation evidence',()=>{
  expect(summariseAssignedIqaWorkload([{attempt_id:'a'},{attempt_id:'b'},{attempt_id:'c'}],
   [{id:'a',status:'human_marked'},{id:'b',status:'qa_approved'},{id:'c',status:'released'}]
  )).toEqual({assigned:3,awaitingReview:1,awaitingRelease:1,other:1});
 });
 it('rejects missing, other and repeated attempts',()=>{
  const ids=[{attempt_id:'a'}];
  for(const rows of [[],[{id:'b',status:'human_marked'}],[{id:'a',status:'human_marked'},{id:'a',status:'released'}],[{id:'a',status:''}]]){
   expect(()=>summariseAssignedIqaWorkload(ids,rows)).toThrow();
  }
 });
 it('never loads all legacy learner submissions for an IQA reviewer',()=>{
  const code=readFileSync('src/pages/qa/QADashboard.tsx','utf8');
  expect(code).toContain("activeRoleVerified(user)");
  expect(code).toContain(".eq('qa_reviewer_id',reviewer)");
  expect(code).toContain(".eq('tenant_id',tenant)");
  expect(code).not.toMatch(/from\(['"]submissions['"]\)|useSupabaseQuery\(['"]submissions['"]\)/);
  expect(code).not.toContain('student_name');
  expect(code).toContain('No partial figures are shown.');
 });
});
