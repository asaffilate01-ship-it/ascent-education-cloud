// @vitest-environment node
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
const fixture = vi.hoisted(() => ({db: null as any, auth: {userId: 'staff'} as any}));
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({createClient: () => fixture.db}));
vi.mock('../../supabase/functions/_shared/auth.ts', () => ({authenticateRequest: async () => fixture.auth}));
vi.mock('../../supabase/functions/_shared/cors.ts', () => ({corsHeaders: {}, rateLimit: () => true, rateLimitResponse: () => new Response(null, {status: 429}), getClientIp: () => 'test'}));
const tenant = '00000000-0000-0000-0000-000000000001';
const student = '00000000-0000-0000-0000-000000000002';
const course = '00000000-0000-0000-0000-000000000003';
let tables: Record<string, any[]>;
let writes: {table: string; row: any}[];
let failure: string;
const handlers: Record<string, (req: Request) => Promise<Response>> = {};
beforeEach(async () => {
  writes = []; failure = '';
  fixture.auth = {userId: 'staff'};
  tables = {
    profiles: [{user_id: 'staff', tenant_id: tenant}, {user_id: student, tenant_id: tenant}],
    user_roles: [{id: 'r', user_id: 'staff', tenant_id: tenant, role: 'centre_director'}],
    attendance_records: [{id: 'a', student_id: student, tenant_id: tenant, date: '2026-01-01', status: 'absent'}],
    course_cohorts: [{id: 'cohort', tenant_id: tenant, course_id: course, cohort_reference: 'autumn'}],
    course_enrolment_requests: [
      {id: 'e', tenant_id: tenant, student_id: student, course_id: course, cohort_id: 'cohort', status: 'enrolled'},
      {id: 'f', tenant_id: 'other', student_id: 'outsider', course_id: course, cohort_id: 'cohort', status: 'enrolled'},
      {id: 'g', tenant_id: tenant, student_id: 'unrelated', course_id: course, cohort_id: 'other', status: 'enrolled'},
    ],
  };
  fixture.db = {from: (table: string) => {
    const filters: [string, unknown][] = [];
    let from = 0, to = Infinity, single = false, count = false, row: any;
    const query: any = {
      select: (_: string, opts?: any) => {count = !!opts?.count; return query;},
      eq: (key: string, value: unknown) => {filters.push([key, value]); return query;},
      order: () => query,
      range: (a: number, b: number) => {from = a; to = b; return query;},
      maybeSingle: () => {single = true; return query;},
      single: () => {single = true; return query;},
      upsert: (value: any) => {row = value; return query;},
      then: (resolve: (result: any) => unknown) => {
        if (failure === table) return Promise.resolve(resolve({data: null, count: null, error: {message: 'private database detail'}}));
        if (row) {writes.push({table, row}); return Promise.resolve(resolve({data: row, error: null}));}
        const rows = (tables[table] || []).filter(r => filters.every(([k, v]) => r[k] === v));
        return Promise.resolve(resolve({data: single ? rows[0] || null : rows.slice(from, to + 1), count: count ? rows.length : null, error: null}));
      },
    };
    return query;
  }};
  if (!Object.keys(handlers).length) {
    let current = '';
    vi.stubGlobal('Deno', {env: {get: () => 'test'}, serve: (handler: any) => {handlers[current] = handler;}});
    current = 'student'; await import(/* @vite-ignore */ '../../supabase/functions/' + 'omniqora-student-intelligence/index.ts');
    current = 'cohort'; await import(/* @vite-ignore */ '../../supabase/functions/' + 'omniqora-cohort-intelligence/index.ts');
    current = 'executive'; await import(/* @vite-ignore */ '../../supabase/functions/' + 'omniqora-executive-snapshot/index.ts');
  } else vi.stubGlobal('Deno', {env: {get: () => 'test'}});
});
afterEach(() => vi.unstubAllGlobals());
const call = (name: string, body: unknown = {}) => handlers[name](new Request('https://example.test', {method: 'POST', body: JSON.stringify(body)}));
describe('intelligence request workflows', () => {
  it('requires authentication and tenant-matched privileged roles before writing', async () => {
    fixture.auth = new Response(null, {status: 401});
    expect((await call('student')).status).toBe(401);
    fixture.auth = {userId: 'staff'};
    tables.user_roles[0].tenant_id = 'other';
    expect((await call('cohort')).status).toBe(403);
    expect(writes).toHaveLength(0);
  });
  it('validates methods and malformed input without database writes', async () => {
    expect((await handlers.student(new Request('https://example.test'))).status).toBe(405);
    expect((await handlers.student(new Request('https://example.test', {method: 'POST', body: '{'}))).status).toBe(400);
    expect((await call('student', {student_id: 'bad'})).status).toBe(400);
    expect(writes).toHaveLength(0);
  });
  it('writes a scoped measured attendance score and clears unsupported legacy metrics', async () => {
    expect((await call('student', {student_id: student, tenant_id: 'forged'})).status).toBe(200);
    expect(writes[0].row).toMatchObject({tenant_id: tenant, student_id: student, attendance_score: 0, risk_score: 100, assessment_score: null, human_review_status: 'required'});
    expect(writes[0].row.calculated_at).toBeTruthy();
  });
  it('refuses cross-tenant learners and missing attendance instead of creating zero risk', async () => {
    tables.profiles[1].tenant_id = 'other';
    expect((await call('student', {student_id: student})).status).toBe(404);
    tables.profiles[1].tenant_id = tenant;
    tables.attendance_records = [];
    expect((await call('student', {student_id: student})).status).toBe(422);
    expect(writes).toHaveLength(0);
  });
  it('limits cohort membership and deduplicates enrolled learners', async () => {
    tables.course_enrolment_requests.push({...tables.course_enrolment_requests[0], id: 'duplicate'});
    expect((await call('cohort', {course_id: course, cohort_reference: 'autumn'})).status).toBe(200);
    expect(writes[0].row).toMatchObject({tenant_id: tenant, learner_count: 1, completion_rate: null, attendance_rate: null});
  });
  it('fails the entire executive calculation if any source fails', async () => {
    failure = 'lab_sessions';
    expect((await call('executive')).status).toBe(503);
    expect(writes).toHaveLength(0);
  });
  it('counts actual tenant enrolments rather than intelligence snapshots', async () => {
    tables.student_enrolments = [{id: 'p', tenant_id: tenant, student_id: student, status: 'active'}];
    expect((await call('executive')).status).toBe(200);
    expect(writes[0].row).toMatchObject({learners: 2, attendance_rate: 0, completion_rate: null});
  });
});
