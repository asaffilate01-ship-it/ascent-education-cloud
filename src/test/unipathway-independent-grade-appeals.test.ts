import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const load=(p:string)=>readFileSync(p,'utf8');
const sql=load('supabase/migrations/20261020170000_independent_appeals_and_result_amendments.sql');
const app=load('src/App.tsx'),nav=load('src/components/layout/DashboardSidebar.tsx');
const student=load('src/pages/student/StudentAssessmentAppeals.tsx');
const reviewer=load('src/pages/qa/AppealReviewerQueue.tsx');
const manager=load('src/pages/programme/AssessmentAppealManagement.tsx');
const results=load('src/pages/student/StudentReleasedResults.tsx');
describe('qualification-specific UniPathway independent grade appeals',()=>{
 it('requires a signed policy and refuses retroactive window changes',()=>{
  expect(sql).toContain('window_days integer NOT NULL CHECK(window_days BETWEEN 1 AND 90)');
  expect(sql).toContain('approved_by uuid NOT NULL');
  expect(sql).toContain('Cannot alter appeal policy after first released result');
  expect(sql).toContain('The published appeal window has closed');
  expect(student).toContain('Online appeals are not configured');
  expect(manager).toContain('formally approved appeal window');
 });
 it('protects original marks and separates initial IQA from second review',()=>{
  expect(sql).toContain('p_reviewer IN (a.student_id,b.lecturer_id,r.released_by,m.marker_id,auth.uid())');
  expect(sql).toContain("u.role='iqa_officer'::public.app_role");
  expect(sql).toContain('auth.uid() IN (a.student_id,a.reviewer_id,r.released_by,b.lecturer_id,m.marker_id,a.assigned_by)');
  expect(sql).toContain('A separate centre-director sign-off is required');
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unipathway_assessment_grade_amendments');
  expect(sql).toContain('GREATEST(0,v.proposed_raw_score-r.penalty_points)');
  expect(sql).not.toContain('UPDATE public.unipathway_assessment_released_results SET');
 });
 it('never sends unpublished reviews or corrected grades to another student',()=>{
  expect(sql).toContain('CREATE POLICY "review confidential until recorded decision"');
  expect(sql).toContain('CREATE POLICY "student own appeal or assigned reviewer or manager"');
  expect(sql).toContain('student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())');
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_grade_amendments FROM anon,authenticated');
  expect(student).toContain('original_final_score');
  expect(results).toContain('original_final_score');
  expect(results).toContain('correction?.corrected_final_score??g.final_score');
 });
 it('wires appropriate role-specific screens',()=>{
  expect(app).toContain('<StudentR><StudentAssessmentAppeals /></StudentR>');
  expect(app).toContain('<QA><AppealReviewerQueue /></QA>');
  expect(app).toContain('<Director><AssessmentAppealManagement /></Director>');
  expect(nav).toContain("path: '/student/appeals'");
  expect(nav).toContain("path: '/qa/appeals'");
  expect(nav).toContain("path: '/director/assessment-appeals'");
  expect(reviewer).toContain('record_unipathway_appeal_review');
  expect(manager).toContain('finalise_unipathway_grade_appeal');
 });
});
