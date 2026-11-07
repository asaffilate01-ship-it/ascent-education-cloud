import type { Tables } from '@/integrations/supabase/types';

export type AcademicEvent = Tables<'academic_events'>;
export const CALENDAR_TIME_ZONE = 'Asia/Karachi';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CALENDAR_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Calendar days are always Pakistan days, independent of the device time zone. */
export function calendarDay(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return '';
  const parts = dayFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function calendarDayLabel(day: string, long = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CALENDAR_TIME_ZONE, weekday: long ? 'long' : undefined,
    day: 'numeric', month: long ? 'long' : 'short', year: 'numeric',
  }).format(new Date(`${day}T12:00:00+05:00`));
}

export function calendarMonthLabel(month: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CALENDAR_TIME_ZONE, month: 'long', year: 'numeric',
  }).format(new Date(`${month}-01T12:00:00+05:00`));
}

export function shiftCalendarMonth(month: string, offset: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export function calendarMonthDays(month: string): { day: string; currentMonth: boolean }[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(1 - mondayOffset + index);
    const day = date.toISOString().slice(0, 10);
    return { day, currentMonth: day.startsWith(month) };
  });
}

export function eventOccursOnDay(event: Pick<AcademicEvent, 'start_date' | 'end_date'>, day: string): boolean {
  const start = calendarDay(event.start_date);
  const end = calendarDay(event.end_date || event.start_date);
  return Boolean(start && end && day >= start && day <= end);
}

export function eventIsUpcomingOrOngoing(event: Pick<AcademicEvent, 'start_date' | 'end_date' | 'all_day'>, now = new Date()): boolean {
  const end = event.end_date || event.start_date;
  return event.all_day ? calendarDay(end) >= calendarDay(now) : Date.parse(end) >= now.getTime();
}

export function eventDateSummary(event: Pick<AcademicEvent, 'start_date' | 'end_date' | 'all_day'>): string {
  const startDay = calendarDay(event.start_date);
  const endDay = calendarDay(event.end_date || event.start_date);
  if (!startDay || !endDay) return 'Date unavailable';
  const startLabel = calendarDayLabel(startDay);
  const endLabel = calendarDayLabel(endDay);
  if (event.all_day) return `${startLabel}${endDay !== startDay ? ` – ${endLabel}` : ''} · All day`;
  const time = (value: string) => new Intl.DateTimeFormat('en-PK', {
    timeZone: CALENDAR_TIME_ZONE, hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
  const end = event.end_date && event.end_date !== event.start_date
    ? ` – ${endDay !== startDay ? `${endLabel}, ` : ''}${time(event.end_date)}` : '';
  return `${startLabel} · ${time(event.start_date)}${end}`;
}

/** Interpret the labelled date/time inputs as Pakistan time; never browser-local time. */
export function calendarInputToIso(value: string, allDay: boolean): string | null {
  const input = allDay ? `${value}T00:00` : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  const check = new Date(`${input}:00Z`);
  if (!Number.isFinite(check.getTime()) || check.getUTCFullYear() !== Number(y)
    || check.getUTCMonth() + 1 !== Number(m) || check.getUTCDate() !== Number(d)
    || check.getUTCHours() !== Number(h) || check.getUTCMinutes() !== Number(min)) return null;
  return new Date(`${input}:00+05:00`).toISOString();
}

export interface CalendarDraft {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  location: string;
  color: string;
}

export type CalendarDraftErrors = Partial<Record<'title' | 'start_date' | 'end_date', string>>;

export function validateCalendarDraft(draft: CalendarDraft): CalendarDraftErrors {
  const errors: CalendarDraftErrors = {};
  if (!draft.title.trim()) errors.title = 'Enter an event title.';
  const start = calendarInputToIso(draft.start_date, draft.all_day);
  const end = draft.end_date ? calendarInputToIso(draft.end_date, draft.all_day) : start;
  if (!start) errors.start_date = 'Enter a valid start date.';
  if (draft.end_date && !end) errors.end_date = 'Enter a valid end date.';
  else if (start && end && end < start) errors.end_date = 'End date must be on or after the start date.';
  return errors;
}
