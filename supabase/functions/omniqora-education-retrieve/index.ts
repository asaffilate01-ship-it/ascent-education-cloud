import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async (req) => {
 const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
 if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
 if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
 if (!rateLimit(getClientIp(req), 20, 60000)) return rateLimitResponse();
 const auth = await authenticateRequest(req);
 if (auth instanceof Response) return auth;
 let body;
 try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON' }, 400); }
 if (typeof body?.query !== 'string' || !body.query.trim() || body.query.length > 1000) return reply({ error: 'Invalid query' }, 400);
 const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if ([body.course_id, body.module_id].some(v => v != null && (typeof v !== 'string' || !uuid.test(v)))) return reply({ error: 'Invalid course or module' }, 400);
 const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
 const { data, error } = await sb.rpc('search_education_knowledge', { p_query: body.query.trim(), p_course: body.course_id || null, p_module: body.module_id || null });
 if (error) return reply({ error: 'Knowledge search unavailable' }, 503);
 return reply({ query: body.query.trim(), documents: data || [], search_mode: 'permission_filtered_metadata_full_text', semantic_search_pending: true });
});
