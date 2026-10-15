import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {authenticateRequest} from '../_shared/auth.ts';
import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {factoryConnection,deliverFactoryEvent} from '../_shared/factory-delivery.ts';
Deno.serve(async req=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),5,60000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.tenantId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.tenantId))return reply({error:'Tenant required'},400);
 const userDb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 // This RPC enforces current tenant membership and director/superadmin role, in the DB.
 const permission=await userDb.rpc('process_local_education_events',{p_tenant:body.tenantId,p_limit:100});
 if(permission.error)return reply({error:'Forbidden or local event processing unavailable'},403);
 let connection,token;
 try {connection=factoryConnection(Deno.env.get('OMNIQORA_CONNECTIONS_JSON')||'[]',body.tenantId);token=Deno.env.get(connection.tokenEnv)||'';if(token.length<32)throw new Error();}
 catch{return reply({error:'Scoped Factory connection and credentials required',localProcessed:permission.data},409);}
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!serviceKey)return reply({error:'Worker configuration required'},503);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
 const claimed=await db.rpc('claim_factory_events',{p_tenant:body.tenantId,p_limit:5});
 if(claimed.error)return reply({error:'Queue unavailable'},503);
 let accepted=0,failed=0;
 for(const item of claimed.data||[]){
  let runId:string|null=null,error:string|null=null;
  try{runId=await deliverFactoryEvent(item,connection,token);}catch{error='Factory delivery failed; inspect scoped connection and retry after backoff';}
  const finished=await db.rpc('finish_factory_event',{p_id:item.id,p_lease:item.lease_token,p_run_id:runId,p_error:error});
  if(finished.error||!finished.data)return reply({error:'Receipt persistence failed; event will be retried idempotently'},503);
  if(runId)accepted++;else failed++;
 }
 return reply({localProcessed:permission.data,accepted,failed,meaning:'Accepted indicates Factory receipt, not completion of an intelligence job.'});
});
