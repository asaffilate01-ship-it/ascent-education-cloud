import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {validateWellbeingRequest,WELLBEING_CATEGORIES,ANONYMOUS_EXPLANATION} from '@/lib/wellbeingRequests';
import {classReleaseStatus,releaseAt} from '@/lib/learning/classRelease';

const source=(path:string)=>readFileSync(path,'utf8');
const completed={status:'ended',ends_at:'2026-11-01T10:00:00Z',
 actual_ended_at:'2026-11-01T10:45:00Z',urgent_approved:false};

describe('Wellbeing privacy and personal support',()=>{
 it('supports mental health, academic difficulty, safeguarding, accessibility and other help',()=>{
  for(const category of ['mental_health','academic','personal','financial','bullying','accessibility','housing','other'])
   expect(WELLBEING_CATEGORIES.some(c=>c.value===category)).toBe(true);
  expect(validateWellbeingRequest('mental_health','I would like to discuss how I have been feeling.','routine')).toBe('');
  expect(validateWellbeingRequest('academic','Need academic support.','soon')).toBe('');
  expect(validateWellbeingRequest('not_approved','Please assist with support.','routine')).not.toBe('');
  expect(validateWellbeingRequest('mental_health','short','routine')).not.toBe('');
 });
 it('does not promise complete anonymity or emergency monitoring',()=>{
  expect(ANONYMOUS_EXPLANATION).toContain('Network/security providers');
  const student=source('src/pages/student/StudentWellbeing.tsx');
  expect(student).toContain("privacy==='anonymous'");
  expect(student).toContain("credentials:'omit'");
  expect(student).toContain("referrerPolicy:'no-referrer'");
  expect(student).toContain('WELLBEING_ANONYMOUS_ENABLED');
  expect(student).toContain('CRISIS_NOTICE');
  expect(student).toContain("'my_unipathway_welfare_replies'");
  const edge=source('supabase/functions/unipathway-anonymous-welfare/index.ts');
  expect(edge).toContain("UNIPATHWAY_ANONYMOUS_WELFARE_ENABLED");
  expect(edge).toContain('turnstile/v0/siteverify');
  expect(edge).toContain('student_id:null,anonymous:true');
  expect(edge).not.toContain("auth.uid()");
  expect(edge).toContain("return respond({status:'accepted'},202)");
 });
 it('sends private student records only to a named verified welfare role and centre',()=>{
  const sql=source('scripts/activation/unipathway-wellbeing-requests-forward.sql');
  expect(sql).toContain("r.tenant_id=v_centre AND r.role::text='student'");
  expect(sql).toContain("r.tenant_id=v_centre AND r.role::text='welfare_officer'");
  expect(sql).toContain("anonymous = (student_id IS NULL)");
  expect(sql).toContain('p_expected_revision integer');
  expect(sql).toContain('UNIQUE(request_id,request_nonce)');
  expect(sql).toContain("v_case.anonymous OR v_case.student_id IS NULL");
  // The case details never enter the generic platform activity_log table.
  expect(sql).not.toContain("INSERT INTO public.audit_logs");
  const welfare=source('src/pages/health/WelfareSupportDesk.tsx');
  expect(welfare).toContain("user.role==='welfare_officer'");
  expect(welfare).toContain('p_expected_revision:record.revision');
  expect(welfare).toContain("'respond_to_unipathway_welfare_request'");
 });
 it('links welfare and student views without exposing another role',()=>{
  const app=source('src/App.tsx');
  expect(app).toContain('<Route path="/student/wellbeing" element={<RoleGuard allowed={[\'student\']}><StudentWellbeing /></RoleGuard>} />');
  expect(app).toContain('<Route path="/welfare/support" element={<RoleGuard allowed={[\'welfare_officer\']}><WelfareSupportDesk /></RoleGuard>} />');
  expect(app).toContain('<Route path="/wellbeing/anonymous" element={<StudentWellbeing anonymousOnly />} />');
 });
});

describe('Post-class embargo for learning materials and recordings',()=>{
 it('never unlocks on a scheduled finish, cancellation or missing actual end',()=>{
  for(const input of [
   {...completed,status:'scheduled'},
   {...completed,status:'cancelled'},
   {...completed,actual_ended_at:null},
   {...completed,ends_at:null},
  ])expect(classReleaseStatus(input,Date.parse('2026-11-05T00:00:00Z')).unlocked).toBe(false);
 });
 it('uses the later actual end, with 24h default and 12h approved exception',()=>{
  expect(releaseAt('2026-11-01T10:45:00Z',24)).toBe('2026-11-02T10:45:00.000Z');
  expect(classReleaseStatus(completed,Date.parse('2026-11-02T10:44:59Z')).unlocked).toBe(false);
  expect(classReleaseStatus(completed,Date.parse('2026-11-02T10:45:00Z')).unlocked).toBe(true);
  const urgent={...completed,urgent_approved:true};
  expect(classReleaseStatus(urgent,Date.parse('2026-11-01T22:44:59Z')).unlocked).toBe(false);
  expect(classReleaseStatus(urgent,Date.parse('2026-11-01T22:45:00Z')).unlocked).toBe(true);
  expect(classReleaseStatus({...completed,ends_at:'2026-11-01T12:00:00Z'},
   Date.parse('2026-11-02T11:45:00Z')).unlocked).toBe(false);
 });
 it('protects backend data and storage, not just buttons',()=>{
  const sql=source('scripts/activation/unipathway-post-class-resource-release-forward.sql');
  expect(sql).toContain("v_session.status<>'ended' OR v_session.actual_ended_at IS NULL");
  expect(sql).toContain("THEN INTERVAL '12 hours' ELSE INTERVAL '24 hours'");
  expect(sql).toContain('AS RESTRICTIVE FOR SELECT TO authenticated');
  expect(sql).toContain('ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated');
  expect(sql).toContain('public.can_open_my_unipathway_class_media');
  expect(sql).toContain('public.can_open_my_unipathway_material');
  expect(sql).toContain('publish_unipathway_course_material');
  expect(sql).toContain('p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 500');
  const material=source('src/pages/learning/ModuleMaterials.tsx');
  expect(material).toContain('class_session_id:classSessionId||null');
  expect(material).toContain("'can_open_my_unipathway_material'");
  expect(material).toContain("'publish_unipathway_course_material'");
  expect(material).not.toContain("available_at:new Date().toISOString()");
  expect(source('src/lib/learning/classMedia.ts')).toContain("'can_open_my_unipathway_class_media'");
  expect(source('src/lib/learning/offlineSync.ts')).toContain("'can_open_my_unipathway_material'");
 });
 it('does not create immediately available recordings on a Jitsi session exit',()=>{
  const live=source('src/pages/classroom/LiveClassroom.tsx');
  expect(live).not.toContain("from('classroom_recordings'");
  expect(live).not.toContain("status: 'available'");
  expect(live).not.toContain('recording saved');
  expect(live).toContain('POST_CLASS_EXPLANATION');
  expect(live).toContain("'/student/lesson-archive'");
  expect(live).toContain(".eq('tenant_id',user.tenantId)");
 });
 it('shows actual class-end and urgent approvals only to appropriate staff',()=>{
  const app=source('src/App.tsx');
  expect(app).toContain('path="/lecturer/class-release"');
  expect(app).toContain('path="/programme/class-release"');
  expect(app).toContain('path="/director/class-release"');
  const manager=source('src/pages/classroom/ClassReleaseManager.tsx');
  expect(manager).toContain('confirm_unipathway_actual_class_end');
  expect(manager).toContain('approve_unipathway_urgent_class_release');
  expect(manager).toContain("['programme_leader','centre_director'].includes(role)");
  expect(manager).toContain('VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED');
 });
});
