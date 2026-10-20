// DEPRECATED: the previous test-user endpoint provisioned 17 privileged roles
// with one shared password and allowed an arbitrary first-tenant fallback.
// That approach is no longer acceptable for staging or production.
// Use scripts/bootstrap-unipathway-staging-accounts.mjs from the protected
// unipathway-staging GitHub environment with 19 unique credentials instead.
//
// Intentionally no service-role client, account creation, default tenant
// selection, password access or privileged user modification in this function.
import {corsHeaders} from '../_shared/cors.ts';
Deno.serve(async (req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 return new Response(JSON.stringify({
  error:'Legacy shared-password test account seeding is disabled.',
  code:'UNIPATHWAY_STAGING_CLI_ONLY'
 }),{
  status:410,headers:{...corsHeaders,'Content-Type':'application/json',
   'Cache-Control':'no-store'}
 });
});
