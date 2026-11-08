import {type BrowserContext} from '@playwright/test';

export const tenant = '00000000-0000-4000-8000-000000000010';
export const user = {
  id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'synthetic-journey@unipathway.invalid', app_metadata: {provider: 'email'}, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
export type Row = Record<string, unknown>;
export type AcademicRead = {name: string; pathname: string; method: string; params: URLSearchParams; body: Row | null};
type Response = {body: unknown; status?: number};
type Rpc = (request: AcademicRead) => Response | Promise<Response>;
type Override = (request: AcademicRead) => Response | undefined | Promise<Response | undefined>;

/** In-browser fixtures only: no hosted account, provider or database is used. */
export async function academicRecords(context: BrowserContext, role: string, tables: Record<string, Row[]>) {
  const requests: AcademicRead[] = [];
  const failures = new Set<string>();
  const rpc = new Map<string, Rpc>([['ensure_my_account', () => ({body: null})]]);
  // Opt-in handlers keep writes and specialised reads explicit in each synthetic journey.
  const overrides = new Map<string, Override>();
  await context.addInitScript(({user}) => {
    if (location.origin === 'null') return;
    const token = btoa(JSON.stringify({alg: 'HS256', typ: 'JWT'})) + '.' +
      btoa(JSON.stringify({sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600})) + '.synthetic';
    localStorage.setItem('sb-unipathway-browser-ci-auth-token', JSON.stringify({
      access_token: token, refresh_token: 'synthetic', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user,
    }));
  }, {user});
  await context.route('https://unipathway-browser-ci.invalid/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const name = url.pathname.split('/').at(-1) || '';
    const read: AcademicRead = {name, pathname: url.pathname, method: request.method(), params: url.searchParams,
      body: request.postData() ? request.postDataJSON() as Row : null};
    requests.push(read);
    const headers = {'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', 'content-type': 'application/json'};
    const respond = ({body, status = 200}: Response) => route.fulfill({status, headers, body: JSON.stringify(body)});
    if (failures.has(name) || failures.has(`${request.method()}:${name}`)) {
      return respond({status: 503, body: {message: 'Synthetic unavailable source'}});
    }
    if (url.pathname.endsWith('/auth/v1/user')) return respond({body: user});
    if (name === 'consent_records' && request.method() === 'POST') return respond({body: null});
    const override = overrides.get(name);
    if (override) {
      const response = await override(read);
      if (response) return respond(response);
    }
    if (name === 'profiles') return respond({body: {full_name: role === 'student' ? 'Synthetic learner' : 'Synthetic lecturer', tenant_id: tenant}});
    if (name === 'user_roles') return respond({body: [{role, tenant_id: role === 'superadmin' ? null : tenant}]});
    if (url.pathname.includes('/rpc/')) {
      const handler = rpc.get(name);
      return respond(handler ? await handler(read) : {status: 400, body: {message: `No synthetic RPC fixture for ${name}`}});
    }
    if (!['GET', 'HEAD'].includes(request.method())) return respond({status: 405, body: {message: 'Synthetic table fixture is read-only'}});
    const matches = (row: Row, key: string, value: string) => {
      if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
      if (value.startsWith('neq.')) return String(row[key]) !== value.slice(4);
      if (value.startsWith('is.')) return value === 'is.null' ? row[key] == null : String(row[key]) === value.slice(3);
      if (value.startsWith('in.(')) return value.slice(4, -1).split(',').includes(String(row[key]));
      if (value.startsWith('gte.')) return String(row[key]) >= value.slice(4);
      if (value.startsWith('lte.')) return String(row[key]) <= value.slice(4);
      return true;
    };
    let data = [...(tables[name] || [])];
    for (const [key, value] of url.searchParams) {
      if (key === 'or') {
        data = data.filter(row => value.slice(1, -1).split(',').some(condition => {
          const split = condition.indexOf('.');
          return matches(row, condition.slice(0, split), condition.slice(split + 1));
        }));
      } else data = data.filter(row => matches(row, key, value));
    }
    for (const order of (url.searchParams.get('order') || '').split(',').reverse()) {
      const [field, direction] = order.split('.');
      if (field) data.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (direction === 'desc' ? -1 : 1));
    }
    const total = data.length, offset = Number(url.searchParams.get('offset') || 0);
    data = data.slice(offset, offset + Number(url.searchParams.get('limit') || 250));
    const single = request.headers().accept?.includes('application/vnd.pgrst.object+json');
    return route.fulfill({status: 200,
      headers: {...headers, 'content-range': `${offset}-${offset + data.length - 1}/${total}`},
      body: request.method() === 'HEAD' ? '' : JSON.stringify(single ? data[0] ?? null : data)});
  });
  return {requests, failures, rpc, overrides};
}
