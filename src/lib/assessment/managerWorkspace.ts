import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from '@/lib/pagedRows';
import {CALENDAR_TIME_ZONE} from '@/lib/academicCalendar';

export type ManagerBriefStatus = 'draft' | 'published' | 'archived' | 'all';
export type ManagerBriefSummary = {
  id: string; tenant_id: string; lecturer_id: string; module_id: string; title: string;
  status: string; assessment_type: string; due_at: string; created_at: string;
};
export type ManagerBrief = ManagerBriefSummary & {
  teaching_summary: string; learning_outcomes: string; student_expectations: string;
  required_evidence: string; teaching_date: string | null; submission_cutoff: string;
  max_attempts: number; penalty_points_per_resubmission: number; policy_reference: string;
  rubric_version: string; updated_at: string; published_at: string | null; published_by: string | null;
};
export type ManagerCriterion = {
  id: string; tenant_id: string; brief_id: string; criterion_code: string;
  learning_outcome: string; criterion_description: string; scoring_guidance: string;
  max_points: number; display_order: number;
};
export type ManagerAttempt = {
  id: string; tenant_id: string; student_id: string; brief_id: string;
  attempt_no: number; status: string; submitted_at: string;
};
export type ManagerAllocation = {
  attempt_id: string; tenant_id: string; marker_id: string; qa_reviewer_id: string;
};
export type ManagerStaffRole = {user_id: string; role: string; tenant_id: string};
export type ManagerPublicationReview = {brief: ManagerBrief; criteria: ManagerCriterion[]};
export type ManagerAllocationTarget = {attempt: ManagerAttempt; brief: ManagerBriefSummary; allocation: ManagerAllocation | null};
export type ManagerAllocationReview = ManagerAllocationTarget & {marker: string; reviewer: string};

const briefColumns = 'id,tenant_id,lecturer_id,module_id,title,status,assessment_type,due_at,created_at';
const fullBriefColumns = briefColumns + ',teaching_summary,learning_outcomes,student_expectations,required_evidence,teaching_date,submission_cutoff,max_attempts,penalty_points_per_resubmission,policy_reference,rubric_version,updated_at,published_at,published_by';
const criterionColumns = 'id,tenant_id,brief_id,criterion_code,learning_outcome,criterion_description,scoring_guidance,max_points,display_order';
const attemptColumns = 'id,tenant_id,student_id,brief_id,attempt_no,status,submitted_at';
const allocationColumns = 'attempt_id,tenant_id,marker_id,qa_reviewer_id';
const staffColumns = 'user_id,role,tenant_id';

function sameCentre<T extends {tenant_id: string}>(rows: T[], tenant: string): T[] {
  if (rows.some(row => !row || row.tenant_id !== tenant)) throw Error('The centre of these assessment records could not be verified.');
  return rows;
}

/** Each query applies its centre/status/record filters before the bounded read. */
export async function loadManagerBriefs(tenant: string, status: ManagerBriefStatus, current: () => boolean) {
  const rows = sameCentre(await pagedRows<ManagerBriefSummary>(() => {
    const query = db.from('unipathway_assessment_briefs').select(briefColumns).eq('tenant_id', tenant);
    return status === 'all' ? query : query.eq('status', status);
  }, current), tenant);
  if (rows.some(row => !row.id || (status !== 'all' && row.status !== status))) throw Error('The selected brief status could not be verified.');
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}

async function relatedRows<T extends {tenant_id: string}>(table: string, columns: string, tenant: string, column: string, ids: string[], current: () => boolean, key = 'id') {
  return sameCentre(await rowsByIds<T>(ids, chunk => () => db.from(table).select(columns)
    .eq('tenant_id', tenant).in(column, chunk), current, key), tenant);
}

export async function loadManagerAllocations(tenant: string, current: () => boolean) {
  const attempts = sameCentre(await pagedRows<ManagerAttempt>(() => db.from('unipathway_assessment_attempts')
    .select(attemptColumns).eq('tenant_id', tenant).eq('status', 'submitted'), current), tenant);
  if (attempts.some(attempt => !attempt.id || attempt.status !== 'submitted')) throw Error('Submitted attempts could not be verified.');
  const allocations = await relatedRows<ManagerAllocation>('unipathway_assessment_allocations', allocationColumns, tenant, 'attempt_id', attempts.map(attempt => attempt.id), current, 'attempt_id');
  const allocated = new Set(allocations.map(row => row.attempt_id));
  const waiting = attempts.filter(attempt => !allocated.has(attempt.id));
  const briefs = await relatedRows<ManagerBriefSummary>('unipathway_assessment_briefs', briefColumns, tenant, 'id', waiting.map(attempt => attempt.brief_id), current);
  const byId = new Map(briefs.map(brief => [brief.id, brief]));
  if (waiting.some(attempt => !byId.has(attempt.brief_id))) throw Error('A submitted assessment brief is unavailable. Reload the allocation queue to verify it.');
  return waiting.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at) || a.id.localeCompare(b.id))
    .map(attempt => ({attempt, brief: byId.get(attempt.brief_id)!, allocation: null} satisfies ManagerAllocationTarget));
}

export async function loadManagerDirectory(tenant: string, current: () => boolean, userIds?: string[]) {
  const rows = sameCentre(await pagedRows<ManagerStaffRole>(() => {
    const query = db.from('user_roles').select(staffColumns).eq('tenant_id', tenant).in('role', ['assessor', 'iqa_officer']);
    return userIds ? query.in('user_id', [...new Set(userIds)]) : query;
  }, current), tenant);
  if (rows.some(row => !row.user_id || !['assessor', 'iqa_officer'].includes(row.role))) throw Error('Visible staff roles could not be verified.');
  return rows;
}

export async function loadManagerPublication(tenant: string, id: string, current: () => boolean): Promise<ManagerPublicationReview> {
  const briefs = sameCentre(await pagedRows<ManagerBrief>(() => db.from('unipathway_assessment_briefs')
    .select(fullBriefColumns).eq('tenant_id', tenant).eq('id', id), current), tenant);
  if (briefs.length !== 1 || briefs[0].id !== id) throw Error('This assessment is unavailable in your current centre. No other brief has been selected.');
  const criteria = sameCentre(await pagedRows<ManagerCriterion>(() => db.from('unipathway_assessment_criteria')
    .select(criterionColumns).eq('tenant_id', tenant).eq('brief_id', id), current), tenant);
  if (criteria.some(criterion => criterion.brief_id !== id || !criterion.id)) throw Error('The rubric for this assessment could not be verified.');
  return {brief: briefs[0], criteria: criteria.sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))};
}

export async function loadManagerAllocationTarget(tenant: string, id: string, current: () => boolean): Promise<ManagerAllocationTarget> {
  const attempts = await relatedRows<ManagerAttempt>('unipathway_assessment_attempts', attemptColumns, tenant, 'id', [id], current);
  if (attempts.length !== 1 || attempts[0].id !== id) throw Error('This submission is unavailable in your current centre.');
  const attempt = attempts[0];
  const [briefs, allocations] = await Promise.all([
    relatedRows<ManagerBriefSummary>('unipathway_assessment_briefs', briefColumns, tenant, 'id', [attempt.brief_id], current),
    relatedRows<ManagerAllocation>('unipathway_assessment_allocations', allocationColumns, tenant, 'attempt_id', [id], current, 'attempt_id'),
  ]);
  if (briefs.length !== 1 || briefs[0].id !== attempt.brief_id || allocations.length > 1 || allocations.some(row => row.attempt_id !== id)) throw Error('The submission and its assessment could not be verified together.');
  return {attempt, brief: briefs[0], allocation: allocations[0] || null};
}

/** SQL numeric has no two-decimal restriction. Ignore only accumulated binary floating noise. */
export function managerRubricTotal(criteria: ManagerCriterion[]): number {
  const total = criteria.reduce((sum, criterion) => sum + Number(criterion.max_points), 0);
  if (!Number.isFinite(total)) return total;
  const noise = Number.EPSILON * Math.max(100, Math.abs(total)) * Math.max(1, criteria.length) * 2;
  return Math.abs(total - 100) <= noise ? 100 : total;
}

export function publicationBlockers({brief, criteria}: ManagerPublicationReview, now = Date.now()): string[] {
  const blockers: string[] = [];
  if (brief.status !== 'draft') blockers.push('Only a draft assessment can be published.');
  if ([brief.title, brief.teaching_summary, brief.learning_outcomes, brief.student_expectations, brief.required_evidence, brief.rubric_version, brief.policy_reference].some(value => typeof value !== 'string' || !value.trim())) blockers.push('The complete teaching brief and policy must be available before publication.');
  if (criteria.length < 2 || criteria.some(criterion => !Number.isFinite(Number(criterion.max_points)) || Number(criterion.max_points) <= 0 || Number(criterion.max_points) > 100)
    || managerRubricTotal(criteria) !== 100) blockers.push('At least two rubric criteria totalling 100 points are required.');
  if (criteria.some(criterion => [criterion.criterion_code, criterion.learning_outcome, criterion.criterion_description, criterion.scoring_guidance].some(value => typeof value !== 'string' || !value.trim()))) blockers.push('Every rubric criterion needs its outcome, description and scoring guidance.');
  const due = Date.parse(brief.due_at), cutoff = Date.parse(brief.submission_cutoff);
  if (!Number.isFinite(due) || !Number.isFinite(cutoff) || due <= now || cutoff <= now || cutoff < due) blockers.push('The deadline and submission cutoff must be in the future, with the cutoff on or after the deadline.');
  if (!Number.isInteger(brief.max_attempts) || brief.max_attempts < 1 || brief.max_attempts > 5
    || !Number.isFinite(brief.penalty_points_per_resubmission) || brief.penalty_points_per_resubmission < 0 || brief.penalty_points_per_resubmission > 30
    || (brief.max_attempts === 1 && brief.penalty_points_per_resubmission !== 0)) blockers.push('The attempt limit and resubmission penalty could not be verified.');
  return blockers;
}

/** Compare the authored content and full rubric, not publication audit timestamps. */
export function samePublicationContent(a: ManagerPublicationReview, b: ManagerPublicationReview): boolean {
  const content = ({brief, criteria}: ManagerPublicationReview) => ({
    brief: [brief.id, brief.tenant_id, brief.module_id, brief.lecturer_id, brief.title, brief.assessment_type,
      brief.teaching_summary, brief.learning_outcomes, brief.student_expectations, brief.required_evidence,
      brief.teaching_date, brief.due_at, brief.submission_cutoff, brief.max_attempts,
      brief.penalty_points_per_resubmission, brief.policy_reference, brief.rubric_version],
    criteria: criteria.map(criterion => [criterion.id, criterion.tenant_id, criterion.brief_id, criterion.criterion_code,
      criterion.learning_outcome, criterion.criterion_description, criterion.scoring_guidance,
      Number(criterion.max_points), criterion.display_order]),
  });
  return JSON.stringify(content(a)) === JSON.stringify(content(b));
}

export function sameAllocationTarget(a: ManagerAllocationTarget, b: ManagerAllocationTarget): boolean {
  return a.attempt.id === b.attempt.id && a.attempt.tenant_id === b.attempt.tenant_id
    && a.attempt.brief_id === b.attempt.brief_id && a.attempt.student_id === b.attempt.student_id
    && a.attempt.attempt_no === b.attempt.attempt_no && a.attempt.status === b.attempt.status
    && a.attempt.submitted_at === b.attempt.submitted_at && a.brief.id === b.brief.id
    && a.brief.title === b.brief.title && a.brief.lecturer_id === b.brief.lecturer_id && a.brief.module_id === b.brief.module_id;
}

export function validIndependentAllocation(review: ManagerAllocationReview, roles: ManagerStaffRole[]): boolean {
  return review.attempt.status === 'submitted' && !review.allocation && Boolean(review.marker && review.reviewer)
    && review.marker !== review.reviewer
    && [review.marker, review.reviewer].every(id => id !== review.attempt.student_id && id !== review.brief.lecturer_id)
    && roles.some(role => role.tenant_id === review.attempt.tenant_id && role.user_id === review.marker && role.role === 'assessor')
    && roles.some(role => role.tenant_id === review.attempt.tenant_id && role.user_id === review.reviewer && role.role === 'iqa_officer');
}

export function managerAssessmentTime(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Intl.DateTimeFormat('en-PK', {timeZone: CALENDAR_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(value));
}
