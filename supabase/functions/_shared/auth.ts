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

  if(Deno.env.get('UNIPATHWAY_INSTITUTIONAL_AUTH_ENABLED')==='true'){
    // A valid JWT alone does not establish ongoing access. The database checks
    // current institutional approval, centre membership, live session and AAL2.
    if(data.claims.aal!=='aal2'||data.claims.is_anonymous!==false)return unauthorizedResponse('Verified institutional session required');
    try{
      const access=await supabase.rpc('unipathway_institutional_access');
      if(access.error||access.data!==true)return unauthorizedResponse('Verified institutional session required');
    }catch{return unauthorizedResponse('Verified institutional session required');}
  }
  return {
    userId: data.claims.sub as string,
    email: (data.claims.email as string) || '',
    claims: data.claims as Record<string, unknown>,
  };
}
