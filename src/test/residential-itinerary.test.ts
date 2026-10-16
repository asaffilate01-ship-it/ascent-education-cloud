import { describe, it, expect } from 'vitest';
import { initialCalendarDraft, scheduleResidentialCalendar, datedTrips } from '../lib/residentialCalendar';
import { emptyVisitOperations, visitIdentity } from '../lib/residentialWorkspace';
import { residentialItinerary, residentialItineraryCsv } from '../lib/residentialItinerary';
const calendar = { ...initialCalendarDraft, closuresReviewed: true };
describe('individual annual itinerary', () => {
  it('gives every group 72 teaching hours and two trips to each city across both visits', () => {
    for (const student of [1, 50, 51, 100, 101, 150, 151, 200]) {
      const plan = residentialItinerary(calendar, {}, 1, student);
      expect(plan.teachingMinutes).toBe(72 * 60);
      expect(plan.activities.filter(a => a.activity.startsWith('Lahore'))).toHaveLength(2);
      expect(plan.activities.filter(a => a.activity.startsWith('Islamabad'))).toHaveLength(2);
      expect(plan.blockers).toEqual([]);
    }
  });
  it('rejects nonexistent learners including a partial last cohort', () => {
    const draft = { ...calendar, students: 251 };
    expect(residentialItinerary(draft, {}, 2, 51).group).toBe('B');
    for (const [cohort, student] of [[2, 52], [3, 1], [0, 1], [1, 0], [1, 1.5], [NaN, 1]]) expect(() => residentialItinerary(draft, {}, cohort, student)).toThrow();
  });
  it('includes only the selected learner’s support and room and neutralizes CSV formulas', () => {
    const visit = scheduleResidentialCalendar(calendar).visits[0];
    const op = emptyVisitOperations(visit);
    op.accommodation.rooms = [{ id: '=room', site: '+site', section: 'male', use: 'student', beds: 1, accessible: false }, { id: 'private-other-room', site: 'other-site', section: 'female', use: 'student', beds: 1, accessible: false }];
    op.accommodation.allocations = [{ kind: 'student', person: '01', section: 'male', room: '=room', needsAccessible: false }, { kind: 'student', person: '2', section: 'female', room: 'private-other-room', needsAccessible: false }];
    const day = Array.from({ length: 14 }, (_, i) => visit.start.slice(0, 8) + String(15 + i).padStart(2, '0')).find(date => !datedTrips(visit).some(t => t.group === 'A' && t.date === date))!;
    // Use a teaching-free evening; 19:30–20:00 can clash with changeover, so
    // isolation is tested directly and export separately without appointments.
    op.support.appointments = [{ id: 'one', student: 1, tutor: 'my-tutor', date: day, start: 1170, minutes: 30 }, { id: 'two', student: 2, tutor: 'other-private-tutor', date: day, start: 1170, minutes: 30 }];
    const operations = { [visitIdentity(visit)]: op };
    const plan = residentialItinerary(calendar, operations, 1, 1);
    expect(plan.supportMinutes).toBe(30);
    expect(JSON.stringify(plan.activities)).not.toContain('other-private-tutor');
    expect(plan.stays[0].room).toBe('=room');
    op.support.appointments = [];
    const csv = residentialItineraryCsv(calendar, operations, 1, 1);
    expect(csv).toContain("'=room"); expect(csv).toContain("'+site");
    expect(csv).not.toContain('private-other-room'); expect(csv).not.toContain('other-site');
  });
  it('blocks exports for unreviewed closures, missing visits, outdated allocations and conflicts', () => {
    expect(() => residentialItineraryCsv({ ...calendar, closuresReviewed: false }, {}, 1, 1)).toThrow(/closures/);
    expect(() => residentialItineraryCsv({ ...calendar, seasonEnd: '2027-10-28' }, {}, 1, 1)).toThrow(/Both/);
    const visit = scheduleResidentialCalendar(calendar).visits[0], op = emptyVisitOperations(visit);
    expect(() => residentialItineraryCsv(calendar, { stale: op }, 1, 1)).toThrow(/outdated/);
    op.accommodation.allocations = [{ kind: 'student', person: '1', section: 'male', room: 'missing', needsAccessible: false }];
    expect(() => residentialItineraryCsv(calendar, { [visitIdentity(visit)]: op }, 1, 1)).toThrow(/does not exist/);
  });
});
