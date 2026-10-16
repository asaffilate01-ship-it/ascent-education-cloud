import { describe, expect, it } from 'vitest';
import { calendarDraftSchema, calendarCsv, dateNumber, datedTeaching, datedTrips, initialCalendarDraft, parseCalendarDraft, scheduleResidentialCalendar } from '@/lib/residentialCalendar';
describe('dated residential planning', () => {
  it('fits ten visits with turnaround and keeps visits separated for every cohort', () => {
    const result = scheduleResidentialCalendar(initialCalendarDraft);
    expect(result.fits).toBe(true);
    expect(result.closuresReviewed).toBe(false);
    expect(result.visits).toHaveLength(10);
    result.visits.forEach((v,i) => {
      expect(dateNumber(v.end)-dateNumber(v.start)).toBe(13);
      if (i) expect(dateNumber(v.start)-dateNumber(result.visits[i-1].end)-1).toBeGreaterThanOrEqual(1);
      if (v.visit===2) {
        const first=result.visits.find(f=>f.cohort===v.cohort&&f.visit===1)!;
        expect(dateNumber(v.start)-dateNumber(first.end)-1).toBeGreaterThanOrEqual(28);
      }
    });
  });
  it('skips inclusive, overlapping and unsorted closures without double-counting days', () => {
    const draft={...initialCalendarDraft, closures:[{label:'B',start:'2027-10-20',end:'2027-10-30'},{label:'A',start:'2027-10-15',end:'2027-10-25'}]};
    const result=scheduleResidentialCalendar(draft);
    expect(result.visits[0].start).toBe('2027-10-31');
    expect(result.usableDays).toBe(dateNumber(draft.seasonEnd)-dateNumber(draft.seasonStart)+1-16);
    result.visits.forEach(v=>expect(draft.closures.some(c=>v.start<=c.end&&v.end>=c.start)).toBe(false));
  });
  it('reports insufficient space instead of shortening visits', () => {
    const result=scheduleResidentialCalendar({...initialCalendarDraft,seasonEnd:'2027-10-28'});
    expect(result.fits).toBe(false); expect(result.visits).toHaveLength(1); expect(result.missing).toHaveLength(9);
  });
  it('handles leap days and rejects malformed imports and blank date input without throwing from safeParse', () => {
    expect(dateNumber('2028-03-01')-dateNumber('2028-02-28')).toBe(2);
    for(const changes of [{seasonStart:''},{seasonStart:'2027-02-29'},{students:-1},{seasonEnd:'2026-10-15'},{version:2}]) {
      expect(calendarDraftSchema.safeParse({...initialCalendarDraft,...changes}).success).toBe(false);
      expect(()=>parseCalendarDraft(JSON.stringify({...initialCalendarDraft,...changes}))).toThrow();
    }
    expect(()=>parseCalendarDraft('x'.repeat(100001))).toThrow();
    expect(parseCalendarDraft(JSON.stringify(initialCalendarDraft))).toEqual(initialCalendarDraft);
  });
  it('exports actual partial cohort sizes and keeps trips entirely teaching-free', () => {
    const draft={...initialCalendarDraft,students:251};
    const visits=scheduleResidentialCalendar(draft).visits;
    const partial=visits.find(v=>v.cohort===2)!;
    expect(partial.students).toBe(51);
    const teaching=datedTeaching(partial), trips=datedTrips(partial);
    expect(teaching.every(s=>s.group==='A'||s.group==='B')).toBe(true);
    expect(teaching.filter(s=>s.group==='B').every(s=>s.students===1)).toBe(true);
    for(const trip of trips) expect(teaching.some(s=>s.date===trip.date&&s.group===trip.group)).toBe(false);
    expect(calendarCsv(draft)).toContain('Pakistan local');
    for(const group of ['A','B']) expect(teaching.filter(s=>s.group===group).reduce((n,s)=>n+s.end-s.start,0)).toBe(36*60);
  });
});
