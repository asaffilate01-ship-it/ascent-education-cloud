import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

export interface AuthResult {
  userId: string;
  email: string;
  claims: Record<string, unknown>;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Validates the Authorization header and returns user claims.
 * Uses getClaims() for fast JWT verification, falls back to getUser() if needed.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorizedResponse();
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  
  // Try getClaims first (fast, no network call)
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return unauthorizedResponse();
  }

  return {
    userId: data.claims.sub as string,
    email: (data.claims.email as string) || '',
    claims: data.claims as Record<string, unknown>,
  };
}
