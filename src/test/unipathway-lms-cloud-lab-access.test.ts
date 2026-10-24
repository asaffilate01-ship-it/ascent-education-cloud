import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const get=(f:string)=>readFileSync(f,'utf8');
const sql=get('supabase/migrations/20261020130000_unipathway_lms_practical_lab_access.sql');
const student=get('src/pages/labs/LabLearningHub.tsx');
const lecturer=get('src/pages/labs/LabInstructorPlanner.tsx');
const courses=get('src/pages/student/StudentCourses.tsx');
const routes=get('src/App.tsx');
const nav=get('src/components/layout/DashboardSidebar.tsx');
const aws=get('supabase/functions/aws-lab-manager/index.ts');
const coding=get('src/pages/coding/CloudCodingSandbox.tsx');
describe('UniPathway LMS cloud/coding labs',()=>{
 it('preserves classroom and independent study on the same enrolled-module hub',()=>{
  expect(routes).toContain('<StudentR><LabLearningHub /></StudentR>');
  expect(routes).toContain('<LecturerR><LabInstructorPlanner /></LecturerR>');
  expect(courses).toContain("useSupabaseQuery('student_enrolments'");
  expect(courses).toContain('enrolled.has(p.id)');
  expect(courses).toContain('<ModuleJourney moduleId={m.id}/>');
  expect(nav).toContain("path: '/student/labs'");
  expect(nav).toContain("path: '/lecturer/labs'");
  expect(student).toContain("to=\"/student/materials\"");
  expect(student).toContain("to=\"/student/classroom\"");
 });
 it('scopes student lab templates and tasks by actual active enrolment',()=>{
  expect(sql).toContain('JOIN public.student_enrolments e ON e.programme_id=m.programme_id');
  expect(sql).toContain("e.student_id=auth.uid() AND e.status='active'");
  expect(sql).toContain('CREATE POLICY "lab templates enrolled student or assigned teacher"');
  expect(sql).toContain('DROP POLICY IF EXISTS "lab templates tenant read"');
  expect(sql).toContain('DROP POLICY IF EXISTS "lab session own academic read"');
  expect(student).toContain("db.from('student_enrolments')");
  expect(student).toContain("eq('status','active')");
 });
 it('requires explicit class invitations for lecturer-led labs',()=>{
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unipathway_lab_run_invitations');
  expect(sql).toContain("i.student_id=auth.uid() AND i.status IN ('invited','accepted')");
  expect(sql).toContain('public.can_access_uni_lab_run(p_class_run)');
  expect(sql).toContain("p_mode='class'");
  expect(lecturer).toContain("invite_enrolled_unipathway_lab_run");
 });
 it('does not provision AWS until verified provider budget and capacity gates pass',()=>{
  expect(sql).toContain("cfg.credential_status<>'verified'");
  expect(sql).toContain("cfg.verified_at IS NULL");
  expect(sql).toContain("cfg.budget_monthly IS NULL OR cfg.budget_monthly<=0");
  expect(sql).toContain('v_active>=cfg.max_concurrent');
  expect(sql).toContain('v_spend+t.estimated_cost_gbp>cfg.budget_monthly');
  expect(sql).toContain("'awaiting_provider'");
  expect(aws).not.toContain("params.instance_id");
  expect(aws).not.toContain('StartInstances');
  expect(aws).toContain("code:'AWS_LAB_ADAPTER_REQUIRED'");
  expect(student).toContain('No AWS machine has started yet');
 });
 it('restricts self-study to authorised published labs and attempt caps',()=>{
  expect(sql).toContain("t.access_mode NOT IN ('self_study','both')");
  expect(sql).toContain('v_count>=t.max_attempts');
  expect(sql).toContain("t.published=true");
  expect(sql).toContain("RETURN v_existing");
  expect(student).toContain("request_unipathway_lms_lab");
 });
 it('persists independent learning evidence without issuing academic grades',()=>{
  expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.unipathway_lab_task_notes');
  expect(sql).toContain('public.save_unipathway_lab_practice_note');
  expect(sql).toContain('public.review_unipathway_lab_practice_note');
  expect(student).toContain('Submit practice evidence');
  expect(lecturer).toContain('Save feedback');
  expect(lecturer).toContain('no grade released');
 });
 it('provides tutor help without sharing other student lab sessions',()=>{
  expect(sql).toContain('public.request_unipathway_lab_support');
  expect(sql).toContain('public.answer_unipathway_lab_support');
  expect(sql).toContain("(student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))");
  expect(student).toContain("response:");
  expect(lecturer).toContain('Lab help queue');
 });
 it('keeps code evaluation outside the authenticated LMS execution context',()=>{
  expect(coding).toContain('sandbox="allow-scripts"');
  expect(coding).toContain("connect-src 'none'");
  expect(coding).toContain("e.source!==runnerRef.current?.contentWindow");
  expect(coding).toContain("e.origin!=='null'");
  expect(coding).toContain("Python is a limited text simulation");
 });
});
