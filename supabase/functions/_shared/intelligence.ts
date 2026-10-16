import {createClient, type SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {authenticateRequest} from './auth.ts';
import {corsHeaders, rateLimit, rateLimitResponse, getClientIp} from './cors.ts';
import {IntelligenceError, requireScope, collectRows} from './intelligence-core.ts';

type Client = SupabaseClient;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
});
export function intelligenceHandler(executive: boolean, run: (db: Client, tenant: string, body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, {headers: {...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS'}});
    if (req.method !== 'POST') return json({error: 'Use POST'}, 405);
    if (!rateLimit(getClientIp(req), 10, 60000)) return rateLimitResponse();
    try {
      const auth = await authenticateRequest(req);
      if (auth instanceof Response) return auth;
      let body: unknown;
      try { body = await req.json(); } catch { throw new IntelligenceError(400, 'A JSON object is required'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new IntelligenceError(400, 'A JSON object is required');
      // Service writes are necessary: intelligence tables deliberately have SELECT-only RLS.
      // Trust only server-stored profile and matching tenant roles, never request/JWT metadata.
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth: {persistSession: false, autoRefreshToken: false}});
      const profile = await db.from('profiles').select('tenant_id').eq('user_id', auth.userId).maybeSingle();
      if (profile.error) throw new IntelligenceError(503, 'Could not resolve account scope');
      const roles = await collectRows<{tenant_id: string | null; role: string}>((from, to) => db.from('user_roles').select('tenant_id,role').eq('user_id', auth.userId).order('id').range(from, to));
      const tenant = requireScope(profile.data, roles, executive);
      return json(await run(db, tenant, body as Record<string, unknown>));
    } catch (error) {
      return json({error: error instanceof IntelligenceError ? error.message : 'Calculation failed; retry or contact support'}, error instanceof IntelligenceError ? error.status : 500);
    }
  };
}
export async function saveSnapshot(db: Client, table: string, row: Record<string, unknown>, conflict: string) {
  const {data, error} = await db.from(table).upsert(row, {onConflict: conflict}).select().single();
  if (error) throw new IntelligenceError(503, 'Snapshot could not be saved');
  return data;
}
export function tenantRows(db: Client, table: string, tenant: string, columns: string, filters: Record<string, string> = {}) {
  return collectRows<Record<string, any>>((from, to) => {
    let query = db.from(table).select(columns).eq('tenant_id', tenant);
    for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
    return query.order('id').range(from, to);
  });
}
export async function tenantCount(db: Client, table: string, tenant: string, key: string, value: string | boolean) {
  const {count, error} = await db.from(table).select('id', {count: 'exact', head: true}).eq('tenant_id', tenant).eq(key, value);
  if (error || count === null) throw new IntelligenceError(503, 'Source counts unavailable; no snapshot was saved');
  return count;
}
