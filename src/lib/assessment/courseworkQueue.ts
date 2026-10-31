/**
 * Student coursework queue: guidance only. Authorised RPCs remain the source
 * of truth for cutoffs, attempt limits and independent IQA release.
 */
export type CourseworkStage = 'action' | 'review' | 'released' | 'closed';
export type CourseworkView = 'all' | CourseworkStage;
export type QueueAttempt = {status: string};
export const COURSEWORK_STAGES: ReadonlyArray<{value: CourseworkView; label: string}> = [
  {value: 'all', label: 'All coursework'},
  {value: 'action', label: 'Action needed'},
  {value: 'review', label: 'Awaiting review'},
  {value: 'released', label: 'Feedback released'},
  {value: 'closed', label: 'Window closed'},
];
export const COURSEWORK_PRIORITY: Record<CourseworkStage, number> = {
  action: 0, review: 1, released: 2, closed: 3,
};
/** Fails closed on invalid cutoffs/limits. This does not grant submission permission. */
export function courseworkQueueState(
  brief: {submission_cutoff: string; max_attempts: number},
  attempts: readonly QueueAttempt[], hasReleasedFeedback: boolean, now = Date.now(),
): {stage: CourseworkStage; maySubmit: boolean} {
  const cutoff = Date.parse(brief.submission_cutoff);
  const available = Number.isFinite(cutoff) && Number.isFinite(now) && now <= cutoff;
  const underLimit = Number.isSafeInteger(brief.max_attempts)
    && brief.max_attempts > 0 && attempts.length < brief.max_attempts;
  // Attempts must be ordered by attempt_no, newest first.
  const pendingRevision = attempts.length === 0 || attempts[0].status === 'resubmission_requested';
  const maySubmit = available && underLimit && pendingRevision;
  const stage: CourseworkStage = maySubmit ? 'action'
    : hasReleasedFeedback ? 'released'
    : attempts.length && !pendingRevision ? 'review'
    : 'closed';
  return {stage, maySubmit};
}
const pkFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
/** Explicit centre-local time prevents a UK device changing the displayed deadline. */
export function formatPakistanAcademicDate(value: string | null | undefined): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? pkFormatter.format(date) + ' PKT' : 'Date unavailable';
}
