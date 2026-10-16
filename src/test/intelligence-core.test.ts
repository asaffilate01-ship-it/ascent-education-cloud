import {describe, expect, it} from 'vitest';
import {attendanceRate, collectRows, requireScope, uuid, cohortReference} from '../../supabase/functions/_shared/intelligence-core';

describe('intelligence source semantics', () => {
  it('does not report missing or excused marks as success or failure', () => {
    expect(attendanceRate([])).toBeNull();
    expect(attendanceRate([{status: 'excused'}])).toBeNull();
    expect(attendanceRate([{status: 'unexpected'}])).toBeNull();
  });
  it('uses a real denominator, counts late as attended and excludes excused', () => {
    expect(attendanceRate(['present', 'late', 'absent', 'excused'].map(status => ({status})))).toBe(67);
    expect(attendanceRate([{status: 'absent'}])).toBe(0);
  });
  it('requires a matching tenant role and limits executive calculations to leadership', () => {
    expect(requireScope({tenant_id: 'a'}, [{tenant_id: 'a', role: 'programme_leader'}])).toBe('a');
    for (const [profile, roles, executive] of [
      [null, [{tenant_id: 'a', role: 'superadmin'}], false],
      [{tenant_id: 'a'}, [{tenant_id: 'b', role: 'superadmin'}], false],
      [{tenant_id: 'a'}, [{tenant_id: null, role: 'superadmin'}], false],
      [{tenant_id: 'a'}, [{tenant_id: 'a', role: 'student'}], false],
      [{tenant_id: 'a'}, [{tenant_id: 'a', role: 'programme_leader'}], true],
    ] as const) expect(() => requireScope(profile, [...roles], executive)).toThrow(/tenant-scoped/);
    expect(requireScope({tenant_id: 'a'}, [{tenant_id: 'a', role: 'centre_director'}], true)).toBe('a');
  });
  it('rejects malformed learner and cohort identifiers', () => {
    for (const value of [undefined, null, {}, '', 'not-a-uuid']) expect(() => uuid(value)).toThrow();
    expect(uuid('00000000-0000-0000-0000-000000000001')).toBeTruthy();
    for (const value of [undefined, {}, ' ', 'x'.repeat(201)]) expect(() => cohortReference(value)).toThrow();
    expect(cohortReference('  autumn  ')).toBe('autumn');
  });
  it('reads beyond the first page and rejects incomplete data', async () => {
    const source = Array.from({length: 601}, (_, id) => ({id}));
    expect(await collectRows(async (from, to) => ({data: source.slice(from, to + 1), error: null}))).toEqual(source);
    await expect(collectRows(async from => from === 0 ? {data: source.slice(0, 250), error: null} : {data: null, error: {message: 'denied'}})).rejects.toThrow(/no snapshot was saved/);
    await expect(collectRows(async () => ({data: null, error: null}))).rejects.toThrow();
  });
});
