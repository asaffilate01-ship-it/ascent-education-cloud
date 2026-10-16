import {intelligenceHandler, saveSnapshot, tenantRows} from '../_shared/intelligence.ts';
import {cohortReference, IntelligenceError, uuid} from '../_shared/intelligence-core.ts';

Deno.serve(intelligenceHandler(false, async (db, tenant, body) => {
  const course_id = uuid(body.course_id);
  const cohort_reference = cohortReference(body.cohort_reference);
  const cohort = await db.from('course_cohorts').select('id').eq('tenant_id', tenant).eq('course_id', course_id).eq('cohort_reference', cohort_reference).maybeSingle();
  if (cohort.error) throw new IntelligenceError(503, 'Cohort could not be read');
  if (!cohort.data) throw new IntelligenceError(404, 'Cohort not found in this tenant and course');
  const enrolments = await tenantRows(db, 'course_enrolment_requests', tenant, 'id,student_id', {course_id, cohort_id: cohort.data.id, status: 'enrolled'});
  const members = new Set(enrolments.map(r => r.student_id));
  const signals = await tenantRows(db, 'omniqora_student_intelligence', tenant, 'id,student_id,risk_score', {model_version: 'recorded-attendance-v2'});
  const highAttention = signals.filter(r => members.has(r.student_id) && r.risk_score >= 70).length;
  // Student-wide attendance is not a course/cohort attendance or completion rate.
  // These rates remain unknown until a course-specific denominator exists.
  const cohortSnapshot = await saveSnapshot(db, 'omniqora_cohort_intelligence', {
    tenant_id: tenant, course_id, cohort_reference, learner_count: members.size,
    attendance_rate: null, engagement_score: null, completion_rate: null, lab_completion_rate: null,
    resubmission_rate: null, placement_completion_rate: null, high_attention_count: highAttention, weak_criteria: [],
    recommended_interventions: [{action: 'Course-specific rates are unavailable. High attention counts enrolled learners with recorded student-wide attendance risk of 70 or more; unscored learners require manual review', human_review: true}],
    calculated_at: new Date().toISOString(),
  }, 'tenant_id,course_id,cohort_reference');
  return {cohort: cohortSnapshot, unavailable_metrics: ['attendance_rate', 'engagement_score', 'completion_rate']};
}));
