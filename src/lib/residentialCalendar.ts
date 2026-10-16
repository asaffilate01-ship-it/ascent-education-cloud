import { z } from 'zod';
import { buildResidentialRotation, groupTripDays } from './programmePriorities';
const DAY = 86400000;
export function dateNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid calendar date.');
  const stamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0,10) !== value) throw new Error('Use a valid calendar date.');
  return stamp / DAY;
}
export const dateString = (day: number) => new Date(day * DAY).toISOString().slice(0,10);
const dateSchema = z.string().refine(value => { try { dateNumber(value); return true; } catch { return false; } }, 'Invalid calendar date');
export const calendarDraftSchema = z.object({
  version: z.literal(1),
  students: z.number().int().min(1).max(10000),
  seasonStart: dateSchema, seasonEnd: dateSchema,
  turnaroundDays: z.number().int().min(0).max(14),
  minimumVisitGapDays: z.number().int().min(1).max(180),
  closuresReviewed: z.boolean(),
  closures: z.array(z.object({ label: z.string().trim().min(1).max(100), start: dateSchema, end: dateSchema }).strict()).max(50),
}).strict().superRefine((draft, ctx) => {
  if (![draft.seasonStart, draft.seasonEnd, ...draft.closures.flatMap(c => [c.start,c.end])].every(value => dateSchema.safeParse(value).success)) return;
  const start = dateNumber(draft.seasonStart), end = dateNumber(draft.seasonEnd);
  if (end < start || end - start > 366) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Season must be ordered and no longer than 367 days.' });
  draft.closures.forEach((c, i) => { if (dateNumber(c.end) < dateNumber(c.start)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['closures',i], message: 'Closure end must follow its start.' }); });
});
export type CalendarDraft = z.infer<typeof calendarDraftSchema>;
export type CalendarVisit = { cohort: number; visit: number; students: number; start: string; end: string };
export const initialCalendarDraft: CalendarDraft = { version: 1, students: 1000, seasonStart: '2027-10-15', seasonEnd: '2028-04-15', turnaroundDays: 1, minimumVisitGapDays: 28, closuresReviewed: false, closures: [] };
export function parseCalendarDraft(raw: string): CalendarDraft {
  if (raw.length > 100000) throw new Error('Draft file is too large. Maximum 100 KB.');
  return calendarDraftSchema.parse(JSON.parse(raw));
}
/** First-fit, chronological draft. Never publishes or guarantees an optimal allocation. */
export function scheduleResidentialCalendar(input: CalendarDraft) {
  const draft = calendarDraftSchema.parse(input);
  const start = dateNumber(draft.seasonStart), end = dateNumber(draft.seasonEnd);
  const closures = draft.closures.map(c => ({ start: dateNumber(c.start), end: dateNumber(c.end) }));
  const blocked = (day: number) => closures.some(c => day >= c.start && day <= c.end);
  const cohorts = Math.ceil(draft.students / 200);
  const visits: CalendarVisit[] = [];
  const missing: { cohort: number; visit: number }[] = [];
  const firstEnds = new Map<number, number>();
  let cursor = start;
  for (let visit = 1; visit <= 2; visit++) for (let cohort = 1; cohort <= cohorts; cohort++) {
    if (visit === 2 && !firstEnds.has(cohort)) { missing.push({ cohort, visit }); continue; }
    let candidate = Math.max(cursor, visit === 2 ? firstEnds.get(cohort)! + draft.minimumVisitGapDays + 1 : start);
    while (candidate + 13 <= end) {
      const conflict = closures.find(c => candidate <= c.end && candidate + 13 >= c.start);
      if (!conflict) break;
      candidate = conflict.end + 1;
    }
    if (candidate + 13 > end) { missing.push({ cohort, visit }); continue; }
    visits.push({ cohort, visit, students: Math.min(200, draft.students - (cohort-1)*200), start: dateString(candidate), end: dateString(candidate+13) });
    if (visit === 1) firstEnds.set(cohort, candidate+13);
    cursor = candidate + 14 + draft.turnaroundDays;
  }
  const usableDays = Array.from({ length: end-start+1 }, (_, i) => start+i).filter(day => !blocked(day)).length;
  return { visits, missing, usableDays, fits: missing.length === 0, closuresReviewed: draft.closuresReviewed };
}
export function datedTeaching(visit: CalendarVisit) {
  return buildResidentialRotation().map(s => ({ ...s, date: dateString(dateNumber(visit.start)+s.day-1), students: Math.max(0,Math.min(50,visit.students-('ABCD'.indexOf(s.group)*50))) })).filter(s => s.students > 0);
}
export function datedTrips(visit: CalendarVisit) {
  const rotation = buildResidentialRotation();
  return ['A','B','C','D'].flatMap((group,i) => visit.students > i*50 ? groupTripDays(rotation,group).map((day,index) => ({ group, date: dateString(dateNumber(visit.start)+day-1), destination: index === 0 ? 'Lahore' : 'Islamabad', students: Math.min(50,visit.students-i*50) })) : []);
}
const csvCell = (value: string | number) => `"${String(value).replace(/"/g,'""')}"`;
export function calendarCsv(draft: CalendarDraft) {
  const { visits } = scheduleResidentialCalendar(draft);
  const rows: (string | number)[][] = [['Cohort','Visit','Group','Date','Activity','Start (Pakistan local)','End (Pakistan local)','Students']];
  const time = (minute: number) => `${Math.floor(minute/60).toString().padStart(2,'0')}:${(minute%60).toString().padStart(2,'0')}`;
  visits.forEach(v => {
    datedTeaching(v).forEach(s => rows.push([v.cohort,v.visit,s.group,s.date,s.kind,time(s.start),time(s.end),s.students]));
    datedTrips(v).forEach(t => rows.push([v.cohort,v.visit,t.group,t.date,`${t.destination} trip (draft)`,'Full day','Full day',t.students]));
  });
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
