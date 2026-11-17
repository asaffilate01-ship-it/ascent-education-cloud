import {parseZonedAcademicTimestamp} from '@/lib/academicTime';

const classTimeFormatter = new Intl.DateTimeFormat('en-PK', {
  timeZone: 'Asia/Karachi', weekday: 'short', day: 'numeric', month: 'short',
  hour: 'numeric', minute: '2-digit',
});

/** Invalid persisted class bounds must not be presented as a confirmed local time. */
export const pakistanClassTime = (value: string): string => {
  const instant = parseZonedAcademicTimestamp(value);
  return instant === null ? 'Date unavailable' : classTimeFormatter.format(new Date(instant));
};

export function classJoinState(session: {starts_at: string; ends_at: string; status: string}, now: number) {
  const start = parseZonedAcademicTimestamp(session.starts_at);
  const end = parseZonedAcademicTimestamp(session.ends_at);
  if (start === null || end === null || end <= start || !Number.isFinite(now)) return 'unavailable';
  if (['cancelled', 'ended', 'completed'].includes(session.status) || now > end + 30 * 60_000) return 'ended';
  return now >= start - 20 * 60_000 ? 'open' : 'scheduled';
}
