import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import { authenticateRequest } from './auth.ts';
import { tutorEndpoint } from './study-tutor.ts';

export class OmniqoraError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
const roles: Record<string, string[]> = {
  'ai-course-builder': ['lecturer', 'programme_leader', 'centre_director', 'superadmin'],
  'ai-study-assistant': ['student', 'lecturer', 'programme_leader', 'centre_director', 'superadmin'],
  'ai-grading-assistant': ['assessor', 'iqa_officer'],
  'ai-assessment-agent': ['assessor', 'iqa_officer'],
  'academic-integrity-agent': ['assessor', 'iqa_officer', 'programme_leader'],
  'teaching-scheduler-agent': ['programme_leader', 'centre_director', 'superadmin'],
  'omniqora-assessment-advisory': ['assessor', 'iqa_officer'],
};
/** The server supplies identity and purpose. Omniqora owns model selection and tenant budgets. */
export async function omniqoraCompletion(req: Request, purpose: string, init: RequestInit): Promise<Response> {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response || auth.claims.is_anonymous === true) throw new OmniqoraError('Sign in to use Omniqora.', 401);
  const scoped = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const { data: profile, error } = await scoped.from('profiles').select('tenant_id').eq('user_id', auth.userId).single();
  if (error || !profile?.tenant_id) throw new OmniqoraError('A centre-linked account is required.', 403);
  const { data: assigned, error: roleError } = await scoped.from('user_roles').select('role,tenant_id').eq('user_id', auth.userId);
  if (roleError || !assigned?.some(r => (r.tenant_id === profile.tenant_id || r.tenant_id === null) && roles[purpose]?.includes(r.role)))
    throw new OmniqoraError('This AI tool is not available for your role.', 403);
  const endpoint = Deno.env.get('OMNIQORA_AI_URL'), token = Deno.env.get('OMNIQORA_AI_TOKEN');
  if (!endpoint || !token || token.length < 32 || Deno.env.get('OMNIQORA_AI_TENANT_ID') !== profile.tenant_id)
    throw new OmniqoraError('Omniqora is not connected for your centre yet.');
  const url = tutorEndpoint(endpoint);
  const input = JSON.parse(String(init.body));
  if (!Array.isArray(input.messages) || input.messages.length > 24 || JSON.stringify(input.messages).length > 65000)
    throw new OmniqoraError('AI request is too long.', 400);
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Share the durable account allowance with the tutor; legacy routes cannot bypass it.
  const quota = await service.rpc('consume_study_tutor_quota', { p_user: auth.userId });
  if (quota.error || !quota.data) throw new OmniqoraError('Your usage allowance could not be checked.');
  if (!quota.data.allowed) throw new OmniqoraError('Your AI allowance is reached. Please try again later.', 429);
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      body: JSON.stringify({ product: 'unipathway', purpose, requestId, userId: auth.userId,
        tenantId: profile.tenant_id, messages: input.messages, maxOutputTokens: Math.min(input.max_tokens || 2048, 5500),
        temperature: input.temperature ?? 0.1, responseFormat: input.response_format }),
    });
  } catch { throw new OmniqoraError('Omniqora is temporarily unavailable.'); }
  if (!response.ok) throw new OmniqoraError('Omniqora could not complete this request.', response.status === 429 ? 429 : 503);
  const reader = response.body?.getReader();
  if (!reader) throw new OmniqoraError('Omniqora returned no response.');
  const decoder = new TextDecoder(); let output = '';
  try { while (true) { const { done, value } = await reader.read(); if (done) break;
    output += decoder.decode(value, { stream: true }); if (output.length > 60000) throw new OmniqoraError('Omniqora response is too large.');
  } output += decoder.decode(); } finally { await reader.cancel(); }
  const result = JSON.parse(output);
  if (typeof result.reply !== 'string' || !result.reply.trim()) throw new OmniqoraError('Omniqora returned an invalid response.');
  // Compatibility envelope for existing UI consumers; never fall back to another provider.
  return new Response(JSON.stringify({ choices: [{ message: { content: result.reply } }], requestId }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
