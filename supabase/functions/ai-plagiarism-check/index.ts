import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
// Retired: an LLM cannot verify plagiarism or authorship from writing style.
// Use evidence-backed, human-reviewed academic-integrity-agent instead.
Deno.serve(async req => {
 if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
 const auth = await authenticateRequest(req); if (auth instanceof Response) return auth;
 return new Response(JSON.stringify({ error: 'Use the academic integrity review workspace with source evidence. Automatic plagiarism and AI-authorship scoring is unavailable.' }),
 { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
