import {corsHeaders} from '../_shared/cors.ts';
// Retired: this unauthenticated legacy endpoint trusted caller-supplied recipient and centre IDs.
// The current verified enquiry workflow owns admissions notifications; never send based on this payload.
Deno.serve(req=>req.method==='OPTIONS'?new Response(null,{headers:corsHeaders}):new Response(JSON.stringify({error:'Legacy notification endpoint retired. Use the verified application workflow and institutional Communications outbox.'}),{status:410,headers:{...corsHeaders,'Content-Type':'application/json'}}));
