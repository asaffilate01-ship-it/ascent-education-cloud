import {intelligenceHandler, saveSnapshot, tenantRows} from '../_shared/intelligence.ts';
import {attendanceRate, IntelligenceError, uuid} from '../_shared/intelligence-core.ts';

Deno.serve(intelligenceHandler(false, async (db, tenant, body) => {
  const student_id = uuid(body.student_id);
  const profile = await db.from('profiles').select('user_id').eq('tenant_id', tenant).eq('user_id', student_id).maybeSingle();
  if (profile.error) throw new IntelligenceError(503, 'Learner scope could not be verified');
  if (!profile.data) throw new IntelligenceError(404, 'Learner not found in this tenant');
  const today = new Date().toISOString().slice(0, 10);
  const marks = await tenantRows(db, 'attendance_records', tenant, 'id,status,date', {student_id});
  const attendance = attendanceRate(marks.filter(r => r.date <= today) as {status: string}[]);
  if (attendance === null) throw new IntelligenceError(422, 'No recorded attendance is available; no risk score was generated');
  const calculated_at = new Date().toISOString();
  const intelligence = await saveSnapshot(db, 'omniqora_student_intelligence', {
    tenant_id: tenant, student_id, attendance_score: attendance, risk_score: 100 - attendance,
    engagement_score: null, assessment_score: null, lab_score: null, tuition_score: null, career_readiness_score: null,
    factors: [{type: 'recorded_attendance_only', attendance_rate: attendance, through: today}],
    recommendations: [{action: 'Review recorded attendance and missing marks; this is not an overall learner risk assessment', human_review: true}],
    model_version: 'recorded-attendance-v2', human_review_status: 'required', calculated_at,
  }, 'tenant_id,student_id');
  return {intelligence};
}));
