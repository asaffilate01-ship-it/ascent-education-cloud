import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const sql=readFileSync('supabase/migrations/20261022100000_unipathway_lms_lab_permissions.sql','utf8');
const edge=readFileSync('supabase/functions/unipathway-aws-lab-gateway/index.ts','utf8');
const legacy=readFileSync('supabase/functions/aws-lab-manager/index.ts','utf8');
const page=readFileSync('src/pages/labs/LMSVirtualLabs.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
const courses=readFileSync('src/pages/student/StudentCourses.tsx','utf8');
const sidebar=readFileSync('src/components/layout/DashboardSidebar.tsx','utf8');

describe('UniPathway LMS AWS and coding virtual lab privacy contract',()=>{
 it('adds managed AWS routes while retaining practical hubs, coding and released results',()=>{
  for(const [role,guard] of [['student','StudentR'],['lecturer','LecturerR'],['director','Director'],['programme','Programme']]){
   expect(app).toContain(`<Route path="/${role}/managed-labs" element={<${guard}><LMSVirtualLabs /></${guard}>} />`);
   expect(sidebar).toContain(`path: '/${role}/managed-labs'`);
  }
  expect(app).toContain('<StudentR><LabLearningHub /></StudentR>');
  expect(app).toContain('<LecturerR><LabInstructorPlanner /></LecturerR>');
  expect(app).toContain('<P><CloudCodingSandbox /></P>');
  expect(courses).not.toContain('sub.grade');
  expect(sql).toContain('request_unipathway_managed_lab');
  expect(sql).not.toContain('FUNCTION public.request_unipathway_lms_lab(');
 });
 it('checks tenant, active programme enrolment, published offering, provider verification and class invite',()=>{
  expect(sql).toContain('unipathway_lab_student_enrolled');
  expect(sql).toContain("e.student_id=auth.uid()");
  expect(sql).toContain("e.status='active'");
  expect(sql).toContain('v.published OR NOT v.launch_enabled');
  expect(sql).toContain("cfg.credential_status='verified'");
  expect(sql).toContain('lms_lab_class_invitations');
  expect(sql).toContain("i.student_id=auth.uid() AND i.status='invited'");
  expect(sql).toContain('NOT (p_mode=ANY(v.modes))');
  expect(sql).toContain("p_mode='self_study'");
 });
 it('enforces concurrency, usage expiry and attempt caps before reserving paid workspace',()=>{
  expect(sql).toContain("status IN ('provisioning','ready','active','paused')");
  expect(sql).toContain("used_attempts>=v.self_study_attempts");
  expect(sql).toContain("active_count>=v.max_active_learners");
  expect(sql).toContain('active_count>=run.max_concurrent');
  expect(sql).toContain("idle_shutdown_minutes,attempt_no");
  expect(sql).toContain('pg_advisory_xact_lock');
 });
 it('restricts instructor access to module staff and learner evidence to tutor review',()=>{
  expect(sql).toContain("m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'");
  expect(sql).toContain('public.unipathway_lab_can_view_session(id)');
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.lab_sessions FROM anon,authenticated');
  expect(sql).toContain('CREATE OR REPLACE FUNCTION public.review_unipathway_lab_task');
  expect(sql).toContain("status='pending_review'");
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.lab_task_progress');
  expect(page).toContain('Evidence noted for tutor review, not graded automatically');
 });
 it('launches only student-owned short-lived managed AWS sessions, never arbitrary EC2 instances',()=>{
  expect(edge).toContain("offering.tenant_id!==profile.tenant_id");
  expect(edge).toContain('session.student_id!==actor');
  expect(edge).toContain("template.provider!=='aws_managed'");
  expect(edge).toContain('student_enrolments');
  expect(edge).toContain('CreateStreamingURLCommand');
  expect(edge).toContain('Validity:60');
  expect(edge).toContain("AWS_LAB_ENABLED");
  expect(edge).not.toContain('params.instance_id');
  expect(edge).not.toContain('StartInstances');
  expect(legacy).toContain("status:409");
  expect(legacy).not.toContain('StartInstances');
  expect(legacy).not.toContain('AWS_SECRET_ACCESS_KEY');
 });
 it('shows real provider setup state and course delivery choices rather than fictional AWS readiness',()=>{
  expect(page).toContain("['self_study','online','in_centre']");
  expect(page).toContain("aws_managed_configured");
  expect(page).toContain('verified credentials');
  expect(page).toContain('providerReady');
  expect(page).toContain('AWS Academy Learner Lab');
  expect(page).toContain('Invite all enrolled learners');
  expect(edge).toContain("'Lab service environment incomplete'");
 });
});
