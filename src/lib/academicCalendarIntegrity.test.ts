import {describe, expect, it} from 'vitest';
import {
  calendarDay, calendarDayLabel, calendarMonthLabel, eventDateSummary,
  eventIsUpcomingOrOngoing, eventOccursOnDay,
} from './academicCalendar';

const now = new Date('2030-12-01T04:30:00Z');
const event = (start_date = '2030-12-01T04:00:00Z', end_date = '2030-12-01T05:00:00Z', all_day = false) =>
  ({start_date, end_date, all_day});

describe('Phase 11: verified calendar projections for UK and Pakistan devices', () => {
  it('preserves a known Pakistan calendar day and equivalent UTC/offset instants', () => {
    expect(calendarDay('2030-12-01T20:00:00Z')).toBe('2030-12-02');
    expect(calendarDay('2030-12-02T01:00:00+05:00')).toBe('2030-12-02');
    expect(eventDateSummary(event())).toContain('1 Dec 2030');
    expect(eventIsUpcomingOrOngoing(event(), now)).toBe(true);
    expect(eventOccursOnDay(event(), '2030-12-01')).toBe(true);
  });

  it('does not promote timezone-free or impossible saved timed events to upcoming', () => {
    for (const bad of [
      event('2030-12-01T09:00:00', '2030-12-01T10:00:00'),
      event('2030-02-30T04:00:00Z', '2030-12-01T05:00:00Z'),
      event('2030-12-01', '2030-12-02'),
      event('2030-12-01T04:00:00Z', '2030-12-01T10:00:00'),
    ]) {
      expect(eventIsUpcomingOrOngoing(bad, now)).toBe(false);
      expect(eventDateSummary(bad)).toBe('Date unavailable');
    }
    expect(calendarDay('2030-12-01T09:00:00')).toBe('');
    expect(calendarDay('2030-02-30')).toBe('');
  });

  it('rejects invalid and reversed event spans from day groupings', () => {
    for (const bad of [
      event('2030-12-02T04:00:00Z', '2030-12-01T04:00:00Z'),
      event('2030-12-01T09:00:00', '2030-12-01T10:00:00Z'),
      event('2030-02-30T04:00:00Z', '2030-12-01T05:00:00Z'),
    ]) {
      expect(eventOccursOnDay(bad, '2030-12-01')).toBe(false);
      expect(eventDateSummary(bad)).toBe('Date unavailable');
      expect(eventIsUpcomingOrOngoing(bad, now)).toBe(false);
    }
  });

  it('supports legacy date-only all-day events but rejects malformed all-day days', () => {
    const allDay = event('2030-12-01', '2030-12-01', true);
    expect(eventOccursOnDay(allDay, '2030-12-01')).toBe(true);
    expect(eventIsUpcomingOrOngoing(allDay, now)).toBe(true);
    expect(eventDateSummary(allDay)).toContain('· All day');
    expect(eventIsUpcomingOrOngoing(event('2030-02-30', '2030-12-01', true), now)).toBe(false);
    expect(eventDateSummary(event('2030-02-30', '2030-12-01', true))).toBe('Date unavailable');
  });

  it('renders unavailable labels rather than coerce impossible calendar dates', () => {
    expect(calendarDayLabel('2030-02-30')).toBe('Date unavailable');
    expect(calendarMonthLabel('2030-13')).toBe('Date unavailable');
    expect(calendarDayLabel('2030-12-01', true)).toContain('December');
    expect(calendarMonthLabel('2030-12')).toBe('December 2030');
  });
});
