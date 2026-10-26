import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'POST required'},405);
 if(!rateLimit(getClientIp(req),10,60000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 let body;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!body||typeof body.userId!=='string'||! /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(body.userId))return json({error:'An existing LMS user is required'},400);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data,error}=await db.rpc('request_unipathway_microsoft_account',{p_user:body.userId});
 if(error)return json({error:'Account request denied or provisioning schema unavailable'},403);
 return json({status:'queued',jobId:data,message:'Queued for the configured Microsoft worker. No account is active yet.'},202);
});
