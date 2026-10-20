import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/20261020090000_unipathway_invited_classroom_acl.sql','utf8');
const routes=readFileSync('src/App.tsx','utf8');
const lecturer=readFileSync('src/pages/lecturer/LecturerTeaching.tsx','utf8');
const sidebar=readFileSync('src/components/layout/DashboardSidebar.tsx','utf8');
const classroom=readFileSync('src/pages/classroom/TeamsClassroom.tsx','utf8');
const scheduler=readFileSync('src/pages/classroom/LiveClassScheduler.tsx','utf8');
const materials=readFileSync('src/pages/learning/ModuleMaterials.tsx','utf8');
const archive=readFileSync('src/pages/student/LessonArchive.tsx','utf8');
describe('UniPathway invitation-only Teams classrooms and academic materials',()=>{
 it('requires both enrolment and explicit invitation before learner join',()=>{
  expect(sql).toContain('JOIN public.student_enrolments e ON e.programme_id=m.programme_id');
  expect(sql).toContain("e.student_id=auth.uid() AND e.status='active'");
  expect(sql).toContain('JOIN public.live_class_invitations i ON i.session_id=s.id');
  expect(sql).toContain("i.user_id=e.student_id AND i.status IN ('invited','accepted')");
  expect(sql).toContain('i.expires_at>now()');
  expect(sql).toContain('can_join_unipathway_class');
 });
 it('removes tenant-wide class, whiteboard, recording and lesson-pack read policies',()=>{
  for(const old of ['live sessions tenant read','live class tenant read','live artifacts tenant read','whiteboard tenant read','lesson packs tenant read']){
   expect(sql).toContain('DROP POLICY IF EXISTS "'+old+'"');
  }
  expect(sql).toContain('CREATE POLICY "class invited participants only"');
  expect(sql).toContain('CREATE POLICY "whiteboard invited class only"');
  expect(sql).toContain('CREATE POLICY "lesson packs reviewed publication"');
 });
 it('never grants open access to recordings or unpublished materials',()=>{
  expect(sql).toContain("publication_status='published' AND available_at IS NOT NULL");
  expect(sql).toContain("bucket_id='unipathway-class-media'");
  expect(sql).toContain("bucket_id='unipathway-module-materials'");
  expect(sql).toContain('CREATE POLICY "private invited classroom artifact download"');
  expect(sql).toContain('CREATE POLICY "published materials enrolled student or teacher"');
  expect(sql).toContain('public.can_review_unipathway_class(s.id)');
  expect(sql).not.toMatch(/CREATE POLICY[^\n]*public.*recording.*FOR SELECT.*USING\(true\)/i);
 });
 it('keeps external reviewers explicitly assigned and unable to join classes',()=>{
  expect(sql).toContain('live_class_evidence_grants');
  expect(sql).toContain('g.reviewer_id=auth.uid() AND g.revoked_at IS NULL');
  const join=sql.split('CREATE OR REPLACE FUNCTION public.can_join_unipathway_class')[1].split('$$;')[0];
  expect(join).not.toContain('can_review_unipathway_class');
 });
 it('exposes lecturer and student routes through the intended role guards',()=>{
  for(const route of ['/lecturer/class-scheduler','/lecturer/materials','/lecturer/lesson-archive','/student/materials']){
    expect(routes).toContain('path="'+route+'"');
    expect(sidebar).toContain("path: '"+route+"'");
  }
  expect(routes).toContain('<StudentR><ModuleMaterials /></StudentR>');
  expect(routes).toContain('<LecturerR><LiveClassScheduler /></LecturerR>');
  expect(routes).toContain('<WelfareR><HealthRecords /></WelfareR>');
 });
 it('does not show unallocated modules as a fallback',()=>{
  expect(lecturer).not.toContain('modules.slice(0, 6)');
  expect(lecturer).toContain('return assigned;');
 });
 it('surfaces provider/migration errors and never claims unpublished Teams recordings are playable',()=>{
  expect(classroom).toContain("if(classes.error){setError(classes.error.message)");
  expect(classroom).toContain('Microsoft Teams lobby, presenter and recording permissions must be configured separately.');
  expect(scheduler).toContain('Automatic Graph scheduling and recording ingestion require');
  expect(archive).toContain("a.publication_status!=='published'");
  expect(archive).toContain('createSignedUrl(a.storage_reference,120)');
  expect(materials).toContain("createSignedUrl(m.object_path,120)");
  expect(materials).toContain("publication_status:'draft'");
 });
});
