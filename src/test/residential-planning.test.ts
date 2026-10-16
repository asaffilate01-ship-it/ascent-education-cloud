import { describe, it, expect } from 'vitest';
import { buildResidentialRotation, groupTripDays, residentialCapacity } from '@/lib/programmePriorities';
describe('adult residential capacity and rotation', () => {
  it('fits 1000 learners in ten fortnight bookings without counting private places as teaching places', () => {
    expect(residentialCapacity(1000, 20)).toMatchObject({ cohorts: 5, bookings: 10, requiredWeeks: 20, fits: true, annualSupportTutorHours: 3000 });
    expect(residentialCapacity(1001, 20)).toMatchObject({ cohorts: 6, requiredWeeks: 24, fits: false });
  });
  it('rejects invalid and fractional inputs instead of claiming capacity', () => {
    for (const [students, weeks] of [[0,20],[NaN,20],[1000,0],[1000,20.5],[Infinity,20]]) expect(() => residentialCapacity(students,weeks)).toThrow();
  });
  it('provides 36 actual teaching hours per group and two entirely teaching-free trip days', () => {
    const sessions = buildResidentialRotation();
    for (const group of ['A','B','C','D']) {
      const own = sessions.filter(s => s.group === group);
      expect(own.reduce((total,s) => total+s.end-s.start,0)).toBe(36*60);
      expect(own.filter(s => s.kind === 'Teaching')).toHaveLength(10);
      const trips = groupTripDays(sessions,group);
      expect(trips).toHaveLength(2);
      expect(own.some(s => trips.includes(s.day))).toBe(false);
    }
  });
  it('never overlaps main teaching groups and stays within opening hours', () => {
    const sessions = buildResidentialRotation();
    for (let day=1; day<=14; day++) {
      const daily = sessions.filter(s => s.day===day);
      daily.forEach((s,i) => {
        expect(s.start).toBeGreaterThanOrEqual(8*60);
        expect(s.end).toBeLessThanOrEqual(20*60);
        if (i) expect(s.start-daily[i-1].end).toBeGreaterThanOrEqual(30);
      });
    }
  });
});
