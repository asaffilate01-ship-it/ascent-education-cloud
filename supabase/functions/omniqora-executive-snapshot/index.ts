import {intelligenceHandler, saveSnapshot, tenantRows, tenantCount} from '../_shared/intelligence.ts';
import {attendanceRate} from '../_shared/intelligence-core.ts';

Deno.serve(intelligenceHandler(true, async (db, tenant) => {
  const [enrolled, programmes, attendance, courses, interventions, labs, placements, signals] = await Promise.all([
    tenantRows(db, 'course_enrolment_requests', tenant, 'id,student_id', {status: 'enrolled'}),
    tenantRows(db, 'student_enrolments', tenant, 'id,student_id', {status: 'active'}),
    tenantRows(db, 'attendance_records', tenant, 'id,status,date'),
    tenantCount(db, 'course_catalogue', tenant, 'active', true),
    tenantCount(db, 'omniqora_interventions', tenant, 'status', 'open'),
    tenantCount(db, 'lab_sessions', tenant, 'status', 'completed'),
    tenantCount(db, 'residential_work_placements', tenant, 'status', 'completed'),
    tenantRows(db, 'omniqora_student_intelligence', tenant, 'id,student_id,risk_score', {model_version: 'recorded-attendance-v2'}),
  ]);
  const now = new Date().toISOString();
  const members = new Set([...enrolled, ...programmes].map(r => r.student_id));
  const snapshot = await saveSnapshot(db, 'omniqora_executive_snapshots', {
    tenant_id: tenant, snapshot_date: now.slice(0, 10), learners: members.size, active_courses: courses,
    attendance_rate: attendanceRate(attendance.filter(r => r.date <= now.slice(0, 10)) as {status: string}[]),
    engagement_score: null, completion_rate: null, high_attention: signals.filter(r => members.has(r.student_id) && r.risk_score >= 70).length,
    open_interventions: interventions, labs_completed: labs, placements_completed: placements,
    quality_signals: {calculated_at: now, model_version: 'recorded-attendance-v2', attendance_scope: 'All recorded tenant attendance through snapshot date; excused excluded', unavailable_metrics: ['engagement_score', 'completion_rate'], high_attention_scope: 'Active learners with recorded attendance risk >=70; excludes unscored learners; manual review required', learner_scope: 'Distinct active programme or enrolled course learners'},
  }, 'tenant_id,snapshot_date');
  return {snapshot};
}));
