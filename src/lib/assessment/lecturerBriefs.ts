import {calendarInputToIso} from '@/lib/academicCalendar';

export type LecturerScope = {userId: string; tenantId: string};
export type TeachingModule = {id: string; title: string; tenant_id: string; lecturer_id: string};
export type LecturerBrief = {
  id: string; tenant_id: string; lecturer_id: string; module_id: string; title: string;
  status: 'draft' | 'published' | 'archived'; assessment_type: 'coursework' | 'homework' | 'practical';
  due_at: string; submission_cutoff: string; max_attempts: number;
  penalty_points_per_resubmission: number; policy_reference: string; rubric_version: string;
};
export type LecturerCriterion = {
  id: string; tenant_id: string; brief_id: string; criterion_code: string; learning_outcome: string;
  criterion_description: string; scoring_guidance: string; max_points: number; display_order: number;
};
export type BriefForm = {
  moduleId: string; title: string; kind: string; teaching: string; outcomes: string;
  expectations: string; required: string; due: string; cutoff: string;
  attempts: string; penalty: string; policy: string;
};
export type CriterionForm = {code: string; outcome: string; description: string; guidance: string; points: string};
export type NewLecturerBrief = LecturerBrief & {
  teaching_summary: string; learning_outcomes: string; student_expectations: string; required_evidence: string;
  status: 'draft'; published_at: null; published_by: null;
};

export const TEACHING_MODULE_COLUMNS = 'id,title,tenant_id,lecturer_id';
export const LECTURER_BRIEF_COLUMNS = 'id,tenant_id,lecturer_id,module_id,title,status,assessment_type,due_at,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference,rubric_version';
export const LECTURER_BRIEF_RECEIPT_COLUMNS = LECTURER_BRIEF_COLUMNS + ',teaching_summary,learning_outcomes,student_expectations,required_evidence,published_at,published_by';
export const LECTURER_CRITERION_COLUMNS = 'id,tenant_id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown, min = 1, max = 10000): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const id = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** Accept a real decimal representation; never coerce blank, boolean or null values to zero. */
function decimal(value: unknown): number | null {
  const number = typeof value === 'number' ? value
    : typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}
const timestamp = (value: unknown): value is string => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

export function teachingModule(value: unknown, scope: LecturerScope): TeachingModule | null {
  const row = object(value);
  if (!row || !id(row.id) || !text(row.title) || row.tenant_id !== scope.tenantId || row.lecturer_id !== scope.userId) return null;
  return {id: row.id, title: row.title, tenant_id: scope.tenantId, lecturer_id: scope.userId};
}

export function lecturerBrief(value: unknown, scope: LecturerScope, moduleIds: readonly string[]): LecturerBrief | null {
  const row = object(value);
  if (!row || !id(row.id) || row.tenant_id !== scope.tenantId || row.lecturer_id !== scope.userId
    || typeof row.module_id !== 'string' || !moduleIds.includes(row.module_id) || !text(row.title, 5, 180)
    || !['draft', 'published', 'archived'].includes(String(row.status))
    || !['coursework', 'homework', 'practical'].includes(String(row.assessment_type))
    || !timestamp(row.due_at) || !timestamp(row.submission_cutoff) || Date.parse(row.submission_cutoff) < Date.parse(row.due_at)
    || typeof row.max_attempts !== 'number' || !Number.isInteger(row.max_attempts) || row.max_attempts < 1 || row.max_attempts > 5
    || !text(row.policy_reference, 4) || !text(row.rubric_version)) return null;
  const penalty = decimal(row.penalty_points_per_resubmission);
  if (penalty === null || penalty < 0 || penalty > 30 || (row.max_attempts === 1 && penalty !== 0)) return null;
  return {
    id: row.id, tenant_id: scope.tenantId, lecturer_id: scope.userId, module_id: row.module_id, title: row.title,
    status: row.status as LecturerBrief['status'], assessment_type: row.assessment_type as LecturerBrief['assessment_type'],
    due_at: row.due_at, submission_cutoff: row.submission_cutoff, max_attempts: row.max_attempts,
    penalty_points_per_resubmission: penalty, policy_reference: row.policy_reference, rubric_version: row.rubric_version,
  };
}

export function lecturerCriterion(value: unknown, tenantId: string, briefIds: readonly string[]): LecturerCriterion | null {
  const row = object(value);
  if (!row || !id(row.id) || row.tenant_id !== tenantId || typeof row.brief_id !== 'string' || !briefIds.includes(row.brief_id)
    || !text(row.criterion_code, 2, 35) || !text(row.learning_outcome, 8, 1200)
    || !text(row.criterion_description, 15, 3000) || !text(row.scoring_guidance, 20, 3000)
    || typeof row.display_order !== 'number' || !Number.isInteger(row.display_order) || row.display_order < 1 || row.display_order > 100) return null;
  const points = decimal(row.max_points);
  if (points === null || points <= 0 || points > 100) return null;
  return {
    id: row.id, tenant_id: tenantId, brief_id: row.brief_id, criterion_code: row.criterion_code,
    learning_outcome: row.learning_outcome, criterion_description: row.criterion_description,
    scoring_guidance: row.scoring_guidance, max_points: points, display_order: row.display_order,
  };
}

export const emptyBriefForm = (moduleId = ''): BriefForm => ({moduleId, title: '', kind: 'coursework', teaching: '', outcomes: '', expectations: '', required: '', due: '', cutoff: '', attempts: '1', penalty: '0', policy: ''});
export const emptyCriterionForm = (): CriterionForm => ({code: '', outcome: '', description: '', guidance: '', points: '25'});

export function reviewLecturerBrief(form: BriefForm, module: TeachingModule, scope: LecturerScope, requestId: string, now = Date.now()): NewLecturerBrief {
  if (!id(requestId) || !teachingModule(module, scope) || form.moduleId !== module.id) throw Error('Choose an assigned teaching module before reviewing this brief.');
  if (!text(form.title.trim(), 5, 180) || !text(form.teaching.trim(), 40, 10000) || !text(form.outcomes.trim(), 20, 10000)
    || !text(form.expectations.trim(), 40, 10000) || !text(form.required.trim(), 20, 10000) || !text(form.policy.trim(), 4, 200)) {
    throw Error('Complete the title (5–180 characters), taught material, learning outcomes, student expectations, required evidence and approved policy reference.');
  }
  if (!['coursework', 'homework', 'practical'].includes(form.kind)) throw Error('Choose a supported assessment type.');
  const due = calendarInputToIso(form.due, false), cutoff = calendarInputToIso(form.cutoff, false);
  if (!due || !cutoff || Date.parse(due) <= now || Date.parse(cutoff) < Date.parse(due)) throw Error('Enter valid Pakistan dates and times. The due date must be in the future and the final cutoff cannot precede it.');
  if (!/^[1-5]$/.test(form.attempts)) throw Error('Allowed attempts must be a whole number from 1 to 5.');
  const attempts = Number(form.attempts), penalty = decimal(form.penalty);
  if (penalty === null || penalty < 0 || penalty > 30 || (attempts === 1 && penalty !== 0)) throw Error('Approved penalty points must be between 0 and 30, and must be zero when only one attempt is allowed.');
  return {
    id: requestId, tenant_id: scope.tenantId, lecturer_id: scope.userId, module_id: module.id,
    title: form.title.trim(), assessment_type: form.kind as LecturerBrief['assessment_type'],
    teaching_summary: form.teaching.trim(), learning_outcomes: form.outcomes.trim(), student_expectations: form.expectations.trim(), required_evidence: form.required.trim(),
    due_at: due, submission_cutoff: cutoff, max_attempts: attempts, penalty_points_per_resubmission: penalty,
    policy_reference: form.policy.trim(), rubric_version: 'v1', status: 'draft', published_at: null, published_by: null,
  };
}

export function reviewLecturerCriterion(form: CriterionForm, brief: LecturerBrief, criteria: readonly LecturerCriterion[], scope: LecturerScope, requestId: string): LecturerCriterion {
  if (!id(requestId) || brief.tenant_id !== scope.tenantId || brief.lecturer_id !== scope.userId || brief.status !== 'draft'
    || criteria.some(row => row.tenant_id !== scope.tenantId || row.brief_id !== brief.id)) throw Error('Choose an authorised unpublished assessment before adding a criterion.');
  const code = form.code.trim().toUpperCase(), points = decimal(form.points);
  if (!text(code, 2, 35) || !text(form.outcome.trim(), 8, 1200) || !text(form.description.trim(), 15, 3000) || !text(form.guidance.trim(), 20, 3000)
    || points === null || points <= 0 || points > 100) throw Error('Complete the criterion code, learning outcome, evidence standard, marking guidance and a valid maximum above 0 and at most 100 points.');
  if (criteria.some(row => row.criterion_code.toUpperCase() === code)) throw Error('This assessment already has that criterion code. Choose a distinct code.');
  if (criteria.reduce((total, row) => total + row.max_points, 0) + points > 100) throw Error('Rubric points cannot exceed 100.');
  const order = Math.max(0, ...criteria.map(row => row.display_order)) + 1;
  if (order > 100) throw Error('This rubric has reached its criterion order limit. Ask programme management to review it.');
  return {id: requestId, tenant_id: scope.tenantId, brief_id: brief.id, criterion_code: code, learning_outcome: form.outcome.trim(), criterion_description: form.description.trim(), scoring_guidance: form.guidance.trim(), max_points: points, display_order: order};
}

/** Compare the entire submitted payload; timestamp offsets and decimal representations may be normalized by PostgreSQL. */
export function confirmedLecturerCreation(value: unknown, payload: NewLecturerBrief | LecturerCriterion): boolean {
  const row = object(value);
  return !!row && Object.entries(payload).every(([key, expected]) => {
    if (key === 'due_at' || key === 'submission_cutoff') return timestamp(row[key]) && Date.parse(row[key] as string) === Date.parse(expected as string);
    if (key === 'max_points' || key === 'penalty_points_per_resubmission') return decimal(row[key]) === expected;
    return row[key] === expected;
  });
}

export const briefReviewIdentity = (brief: LecturerBrief): string => JSON.stringify([brief.id, brief.tenant_id, brief.lecturer_id, brief.module_id, brief.title, brief.status, brief.assessment_type, Date.parse(brief.due_at), Date.parse(brief.submission_cutoff), brief.max_attempts, brief.penalty_points_per_resubmission, brief.policy_reference, brief.rubric_version]);
export const rubricReviewIdentity = (criteria: readonly LecturerCriterion[]): string => JSON.stringify([...criteria].sort((a, b) => a.id.localeCompare(b.id)));

/** A known PostgreSQL rejection of the first insert did not commit. Unknown/network failures stay uncertain. */
export function definiteLecturerInsertError(value: unknown): boolean {
  const code = object(value)?.code;
  return typeof code === 'string' && (['42501', '23502', '23503', '23514', '40001', '40P01'].includes(code) || /^22\d{3}$/.test(code));
}
