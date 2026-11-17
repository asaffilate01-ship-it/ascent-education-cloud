/**
 * Parse an academic date as a deterministic instant, irrespective of the
 * browser/device time zone. Production timestamptz values must carry an
 * explicit UTC ("Z") or numeric (+/-HH:MM) offset.
 *
 * Legacy date-only values are interpreted as midnight UTC. A timestamp
 * without an offset is ambiguous and must never be used for deadline,
 * assessment or classroom eligibility guidance.
 *
 * This is read-only UI validation; authenticated server RPCs remain the
 * authority for submission windows and meeting access.
 */
export function parseAcademicInstant(input: unknown): number | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const value = input.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?(Z|[+-]\d{2}:\d{2})$/;
  const plain = dateOnly.exec(value);
  const match = plain || timestamp.exec(value);
  if (!match) return null;

  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day) return null;

  if (!plain) {
    const hour = Number(match[4]), minute = Number(match[5]);
    const second = match[6] === undefined ? 0 : Number(match[6]);
    if (hour > 23 || minute > 59 || second > 59) return null;
    const zone = match[8];
    if (zone !== 'Z') {
      const zoneHour = Number(zone.slice(1, 3)), zoneMinute = Number(zone.slice(4));
      if (zoneHour > 14 || zoneMinute > 59 || (zoneHour === 14 && zoneMinute !== 0)) return null;
    }
  }
  const milliseconds = Date.parse(plain ? value + 'T00:00:00Z' : value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/**
 * Persisted assessment deadlines and live-class bounds require a precise
 * timezone-qualified timestamp. The legacy date-only UTC fallback above is
 * for display of older academic date fields, never an editable class/brief.
 */
export function parseZonedAcademicTimestamp(input: unknown): number | null {
  return typeof input === 'string' && input.includes('T')
    ? parseAcademicInstant(input)
    : null;
}
