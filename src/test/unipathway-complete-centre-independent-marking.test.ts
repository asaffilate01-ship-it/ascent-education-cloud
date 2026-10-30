import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const get=(p:string)=>readFileSync(p,'utf8');
const sql=get('supabase/migrations/20261020150000_unipathway_independent_assessment.sql');
const syllabus=get('supabase/migrations/20261020160000_unipathway_full_centre_exam_syllabuses.sql');
const app=get('src/App.tsx');
const student=get('src/pages/student/StudentCoursework.tsx');
const marker=get('src/pages/assessor/IndependentMarkerQueue.tsx');
const qa=get('src/pages/qa/QualityAssessmentApproval.tsx');
const ai=get('supabase/functions/omniqora-assessment-advisory/index.ts');
const routes=get('src/lib/educationCentrePathways.ts');
describe('UniPathway complete centre and independent marking contracts',()=>{
 it('supports Pakistan boards, Cambridge, language, professional, trade and UK regulated study preparation',()=>{
  for(const term of ['Matric / SSC','FSc / HSSC','FA, ICS & ICom','Cambridge AS & A Levels',
  'Spanish, French & Italian','Cloud certifications','Banking, Treasury','Beauty Therapy',
  'Health & Social Care','Trades, Energy','OTHM Qualification','Qualifi Qualification']){
   expect(routes).toContain(term);
  }
  expect(app).toContain('path="/education-centre"');
  expect(app).toContain('path="/director/syllabuses"');
  expect(syllabus).toContain('course_delivery_status');
  expect(syllabus).toContain("official_exam_registration_enabled boolean NOT NULL DEFAULT false");
 });
 it('separates lecturers, authorised assessor, independent QA and student release',()=>{
  expect(sql).toContain('p_marker=b.lecturer_id');
  expect(sql).toContain('p_quality_reviewer=b.lecturer_id');
  expect(sql).toContain('p_marker=p_quality_reviewer');
  expect(sql).toContain("r.role='assessor'::public.app_role");
  expect(sql).toContain("r.role='iqa_officer'::public.app_role");
  expect(sql).toContain('Only assigned independent assessor can mark');
  expect(sql).toContain('Only allocated independent IQA may approve');
  expect(sql).toContain("IF x.status<>'qa_approved'");
  expect(app).toContain('<AssessorR><IndependentMarkerQueue /></AssessorR>');
  expect(app).toContain('<QA><QualityAssessmentApproval /></QA>');
  expect(app).toContain('<StudentR><StudentReleasedResults /></StudentR>');
 });
 it('discloses deadlines, freezes approved rubrics and enforces permitted resubmissions',()=>{
  expect(sql).toContain("published assessment criteria");
  expect(sql).toContain("status='resubmission_requested'");
  expect(sql).toContain('IF now()>b.submission_cutoff');
  expect(sql).toContain('v_attempt>b.max_attempts');
  expect(sql).toContain('(x.attempt_no-1)*b.penalty_points_per_resubmission');
  expect(student).toContain('penalty_points_per_resubmission');
  expect(student).toContain('Your original submitted evidence');
 });
 it('keeps Omniqora analysis private and advisory, requires attributable criterion evidence',()=>{
  expect(ai).toContain('UNIPATHWAY_OMNIQORA_ASSESSMENT_ENABLED');
  expect(ai).toContain("allocation.marker_id!==auth.userId");
  expect(get('supabase/functions/_shared/assessment-draft-validation.ts')).toContain('AI cited text not present in submitted evidence');
  expect(ai).toContain("status:'advisory_only'");
  expect(marker).toContain("record_unipathway_human_mark");
  expect(qa).toContain("review_uni_mark_revision");
  expect(qa).toContain("p_action:approve?'approve':'return'");
  expect(qa).toContain("p_action:'release'");
  expect(qa).toContain("p_revision:mark.revision");
  expect(sql).toContain('REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_ai_drafts');
 });
});
