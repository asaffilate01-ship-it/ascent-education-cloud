import {CALENDAR_TIME_ZONE, calendarInputToIso} from '@/lib/academicCalendar';
import {parseZonedAcademicTimestamp} from '@/lib/academicTime';

export type ClassCandidate = {id: string; name: string};
export type ClassCandidates = {students: ClassCandidate[]; organisers: ClassCandidate[]};

/** A missing or malformed response is unavailable data, never an empty roster. */
export function readClassCandidates(value: unknown): ClassCandidates | null {
  if (!value || typeof value !== 'object') return null;
  const candidates = value as Partial<ClassCandidates>;
  const valid = (rows: unknown): rows is ClassCandidate[] => Array.isArray(rows) && rows.every(row =>
    row && typeof row === 'object' && typeof row.id === 'string' && row.id.length > 0 && typeof row.name === 'string');
  return valid(candidates.students) && valid(candidates.organisers)
    ? {students: candidates.students, organisers: candidates.organisers} : null;
}

/** Display the stored instant in Pakistan; editing must never reinterpret UTC as device-local time. */
export function pakistanClassInput(value: string): string {
  const time = parseZonedAcademicTimestamp(value);
  if (time === null) return '';
  const date = new Date(time);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CALENDAR_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

type SavedClassTime = Readonly<{
  id: string; tenant_id: string; module_id: string; starts_at: string; ends_at: string;
}>;

/**
 * Classes must come from the current centre's authorised modules and have
 * unambiguous, ordered time bounds before they can appear in the edit/cancel
 * list. An invalid row blocks the entire snapshot, not just one visible item.
 */
export function verifiedScheduledClasses<T extends SavedClassTime>(
  rows: readonly T[], tenantId: string, moduleIds: ReadonlySet<string>,
): T[] {
  const seen = new Set<string>();
  const verified = rows.map(row => {
    const start = parseZonedAcademicTimestamp(row?.starts_at);
    const end = parseZonedAcademicTimestamp(row?.ends_at);
    if (!row || typeof row.id !== 'string' || !row.id || seen.has(row.id)
      || row.tenant_id !== tenantId || !moduleIds.has(row.module_id)
      || start === null || end === null || end <= start) {
      throw Error('Class timetable records could not be verified. Refresh before scheduling or editing.');
    }
    seen.add(row.id);
    return {row, start};
  });
  return verified.sort((a, b) => b.start - a.start || a.row.id.localeCompare(b.row.id))
    .map(entry => entry.row);
}

export type ClassTimeErrors = Partial<Record<'start' | 'end', string>>;

export function validateClassTimes(startInput: string, endInput: string, now = Date.now()): ClassTimeErrors {
  const start = calendarInputToIso(startInput, false), end = calendarInputToIso(endInput, false);
  const errors: ClassTimeErrors = {};
  if (!start) errors.start = 'Enter a valid start date and time in Pakistan time.';
  if (!end) errors.end = 'Enter a valid end date and time in Pakistan time.';
  if (start && end) {
    const duration = Date.parse(end) - Date.parse(start);
    if (duration <= 0) errors.end = 'End time must be after the start time.';
    else if (duration > 12 * 60 * 60 * 1000) errors.end = 'A live class can last no more than 12 hours.';
    else if (Date.parse(end) <= now) errors.end = 'Choose a class that ends in the future.';
  }
  return errors;
}

/** save_uni_calendar_class returns the requested UUID, not a generic acknowledgement. */
export function confirmedClassSave(value: unknown, requestedId: string): boolean {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    && value === requestedId;
}
