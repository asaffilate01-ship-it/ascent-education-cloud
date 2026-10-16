import { datedTeaching, datedTrips, scheduleResidentialCalendar, type CalendarDraft } from './residentialCalendar';
import { emptyVisitOperations, visitIdentity, type VisitOperations } from './residentialWorkspace';
import { teachingKey, validateSupport } from './residentialSupport';
import { validateAccommodation } from './residentialAccommodation';

export type ItineraryActivity = { visit: number; date: string; activity: string; start: number | null; end: number | null; tutor: string };
export const itineraryTime = (minute: number | null) => minute === null ? 'Full day' : `${Math.floor(minute / 60).toString().padStart(2, '0')}:${(minute % 60).toString().padStart(2, '0')}`;

/** Anonymous cohort-local IDs only; this is a staff draft, never a published student record. */
export function residentialItinerary(calendar: CalendarDraft, operations: Record<string, VisitOperations>, cohort: number, student: number) {
  const schedule = scheduleResidentialCalendar(calendar);
  const size = Math.min(200, calendar.students - (cohort - 1) * 200);
  if (!Number.isInteger(cohort) || cohort < 1 || cohort > Math.ceil(calendar.students / 200) || !Number.isInteger(student) || student < 1 || student > size) throw Error('Select a valid cohort and learner number.');
  const group = 'ABCD'[Math.floor((student - 1) / 50)];
  const visits = schedule.visits.filter(v => v.cohort === cohort);
  const blockers: string[] = [];
  if (!calendar.closuresReviewed) blockers.push('Review seasonal closures before exporting.');
  if (visits.length !== 2) blockers.push('Both annual visits must be scheduled before exporting.');
  if (Object.keys(operations).some(key => !schedule.visits.some(v => visitIdentity(v) === key))) blockers.push('Resolve outdated visit allocations before exporting.');
  const activities: ItineraryActivity[] = [];
  const stays = visits.map(visit => {
    const op = operations[visitIdentity(visit)] || emptyVisitOperations(visit);
    const errors = [...validateSupport(visit, op.support.appointments, op.support.allocations), ...validateAccommodation(visit, op.accommodation)];
    if (errors.length) blockers.push(`Visit ${visit.visit}: ${errors.join(' ')}`);
    datedTeaching(visit).filter(s => s.group === group).forEach(s => activities.push({ visit: visit.visit, date: s.date, activity: s.kind, start: s.start, end: s.end, tutor: op.support.allocations.find(a => a.session === teachingKey(s))?.tutor || 'Unassigned' }));
    datedTrips(visit).filter(t => t.group === group).forEach(t => activities.push({ visit: visit.visit, date: t.date, activity: `${t.destination} trip (draft)`, start: null, end: null, tutor: '' }));
    const appointments = op.support.appointments.filter(a => a.student === student);
    appointments.forEach(a => activities.push({ visit: visit.visit, date: a.date, activity: 'Optional private support', start: a.start, end: a.start + a.minutes, tutor: a.tutor }));
    const allocation = op.accommodation.allocations.find(a => a.kind === 'student' && Number(a.person) === student);
    const room = allocation && op.accommodation.rooms.find(r => r.id.trim().toLowerCase() === allocation.room.trim().toLowerCase());
    return { visit: visit.visit, start: visit.start, end: visit.end, site: room?.site || 'Unassigned', room: room?.id || 'Unassigned', supportMinutes: appointments.reduce((sum, a) => sum + a.minutes, 0) };
  });
  activities.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? -1) - (b.start ?? -1));
  const teachingMinutes = visits.reduce((sum, v) => sum + datedTeaching(v).filter(s => s.group === group).reduce((n, s) => n + s.end - s.start, 0), 0);
  return { cohort, student, group, activities, stays, teachingMinutes, supportMinutes: stays.reduce((n, s) => n + s.supportMinutes, 0), blockers };
}

export function residentialItineraryCsv(calendar: CalendarDraft, operations: Record<string, VisitOperations>, cohort: number, student: number) {
  const plan = residentialItinerary(calendar, operations, cohort, student);
  if (plan.blockers.length) throw Error(plan.blockers.join(' '));
  const rows: (string | number)[][] = [
    ['DRAFT ONLY — not a booking or published student timetable'],
    ['Times are Pakistan local. Picnic and evening outing are not yet allocated.'],
    ['Cohort', 'Learner', 'Group', 'Visit', 'Date / start date', 'Activity', 'Start / end date', 'End', 'Tutor', 'Accommodation site', 'Room'],
    ...plan.activities.map(a => [cohort, student, plan.group, a.visit, a.date, a.activity, itineraryTime(a.start), itineraryTime(a.end), a.tutor, '', '']),
    ...plan.stays.map(s => [cohort, student, plan.group, s.visit, s.start, 'Accommodation allocation (unconfirmed)', s.end, '', '', s.site, s.room]),
  ];
  // Quoting alone does not prevent spreadsheet formula execution in entered staff/site fields.
  return rows.map(row => row.map(value => { const text = String(value); const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
}
