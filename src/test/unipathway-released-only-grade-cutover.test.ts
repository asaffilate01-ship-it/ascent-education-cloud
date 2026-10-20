import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const file=(p:string)=>readFileSync(p,'utf8');
const sql=file('supabase/migrations/20261020180000_legacy_submission_grade_cutover.sql');
const app=file('src/App.tsx');
const courses=file('src/pages/student/StudentCourses.tsx');
const dashboard=file('src/pages/student/StudentDashboard.tsx');
const results=file('src/pages/student/StudentReleasedResults.tsx');
describe('student coursework grades must only come from human+IQA released results',()=>{
 it('retires every permissive legacy submissions RLS policy without deleting records',()=>{
  expect(sql).toContain("tablename='submissions'");
  expect(sql).toContain("DROP POLICY IF EXISTS %I ON public.submissions");
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.submissions FROM authenticated');
  expect(sql).toContain('archived audit by academic director only');
  expect(sql).not.toContain('DROP TABLE public.submissions');
  expect(sql).not.toContain('DELETE FROM public.submissions');
 });
 it('does not use legacy submitted grades on student-facing dashboards and course lists',()=>{
  expect(courses).not.toContain("useSupabaseQuery('submissions'");
  expect(courses).not.toContain('submissionByAssignment');
  expect(dashboard).not.toContain("useSupabaseQuery('submissions'");
  expect(dashboard).not.toContain('gradedSubmissions');
  expect(dashboard).toContain("db.from('unipathway_assessment_released_results')");
  expect(dashboard).toContain("db.from('unipathway_assessment_grade_amendments')");
  expect(results).toContain("db.from('unipathway_assessment_released_results')");
  expect(results).toContain("db.from('unipathway_assessment_grade_amendments')");
 });
 it('removes generic signed-in direct gradebook visibility',()=>{
  expect(app).not.toContain('<P><GradebookPage /></P>');
  expect(app).toContain('path="/gradebook" element={<StudentR><StudentReleasedResults /></StudentR>}');
  expect(app).toContain('path="/student/appeals" element={<StudentR><StudentAssessmentAppeals /></StudentR>}');
 });
});
