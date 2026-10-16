/** Recorded attendance only: late counts as attended, excused is excluded.
 * Missing marks are unknown, never a zero-risk learner or a completion rate.
 */
export function attendanceRate(rows: {status: string}[]): number | null {
  const marks = rows.filter(r => ['present', 'late', 'absent'].includes(r.status));
  return marks.length ? Math.round(100 * marks.filter(r => r.status !== 'absent').length / marks.length) : null;
}
export class IntelligenceError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new IntelligenceError(400, 'A valid UUID is required');
  return value;
}
export function cohortReference(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200)
    throw new IntelligenceError(400, 'A cohort reference is required (maximum 200 characters)');
  return value.trim();
}
export function requireScope(profile: {tenant_id: string | null} | null, roles: {tenant_id: string | null; role: string}[], executive = false): string {
  const tenant = profile?.tenant_id;
  const allowed = executive ? ['centre_director', 'superadmin'] : ['centre_director', 'programme_leader', 'iqa_officer', 'superadmin'];
  if (!tenant || !roles.some(r => r.tenant_id === tenant && allowed.includes(r.role)))
    throw new IntelligenceError(403, 'A tenant-scoped leadership or academic role is required');
  return tenant;
}
/** Stable ID pagination. A failed page must prevent any snapshot write. */
export async function collectRows<T>(page: (from: number, to: number) => PromiseLike<{data: T[] | null; error: unknown}>, size = 250): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const result = await page(from, from + size - 1);
    if (result.error || !result.data) throw new IntelligenceError(503, 'Source data could not be read; no snapshot was saved');
    rows.push(...result.data);
    if (result.data.length < size) return rows;
  }
}
