// SECURITY: The previous implementation accepted caller-supplied instance_id and
// used the wrong AWS JSON protocol for EC2 actions, without verifying VM ownership.
// It cannot be used to start/stop arbitrary infrastructure. A provider adapter
// must use server-resolved resource IDs, temporary least-privilege AWS credentials,
// spending limits, and an independent scheduled expiry/shutdown controller.
// Until then this legacy endpoint fails closed. No AWS resources are launched.
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
 if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
 if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}), {
  status:405, headers:{...corsHeaders,'Content-Type':'application/json'},
 });
 const auth=await authenticateRequest(req);
 if (auth instanceof Response) return auth;
 // Do not parse VM IDs or tenant IDs from the untrusted payload at all.
 return new Response(JSON.stringify({
  status:'not_configured',
  code:'AWS_LAB_ADAPTER_REQUIRED',
  error:'Legacy VM operations are disabled. Open the UniPathway LMS Lab Hub to request a governed course lab. An authorised AWS provider adapter, account policies and cost controls must be activated by the centre before cloud resources can start.',
  activeResources:false,
 }),{ status:409, headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
});
