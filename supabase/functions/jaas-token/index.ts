import {corsHeaders} from '../_shared/cors.ts';
// Retired: UniPathway uses scheduled, invitation-scoped Microsoft Teams classrooms.
// Never issue legacy room tokens or accept browser-supplied moderator/identity claims.
Deno.serve((req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 return new Response(JSON.stringify({error:'Legacy classroom retired. Open your scheduled Microsoft Teams class in UniPathway.'}),{
  status:410,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'},
 });
});
