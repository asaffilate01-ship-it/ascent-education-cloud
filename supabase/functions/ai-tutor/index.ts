import {corsHeaders} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {tutorMessages,tutorEndpoint} from '../_shared/study-tutor.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
  if(auth.claims.is_anonymous===true)return json({error:'Sign in to use your study tutor.'},401);
  const scoped=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
  const {data:profile,error}=await scoped.from('profiles').select('tenant_id').eq('user_id',auth.userId).single();
  if(error||!profile?.tenant_id)return json({error:'A centre-linked account is required.'},403);
  const raw=await req.text();if(raw.length>50000)return json({error:'Conversation is too long. Start a new chat.'},413);
  let messages;try{messages=tutorMessages(JSON.parse(raw).messages);}catch(e){return json({error:e instanceof Error?e.message:'Invalid request'},400);}
  const endpoint=Deno.env.get('OMNIQORA_TUTOR_URL'),token=Deno.env.get('OMNIQORA_TUTOR_TOKEN'),tenant=Deno.env.get('OMNIQORA_TUTOR_TENANT_ID');
  if(!endpoint||!token||token.length<32||tenant!==profile.tenant_id)return json({error:'Omniqora Study Tutor is not connected for your centre yet. Please contact your teacher.'},503);
  const url=tutorEndpoint(endpoint);
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const quota=await service.rpc('consume_study_tutor_quota',{p_user:auth.userId});
  if(quota.error||!quota.data)return json({error:'Usage allowance could not be checked. Please try again later.'},503);
  if(!quota.data.allowed)return json({error:quota.data.reason==='minute'?'Please wait a minute before asking another question.':'Your daily study allowance is used. It resets at midnight Pakistan time.',usage:quota.data},429);
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({product:'unipathway',purpose:'study_tutor',userId:auth.userId,tenantId:profile.tenant_id,messages,maxOutputTokens:1000})});
  if(!response.ok)return json({error:'Omniqora is temporarily unavailable. Please try again later.',usage:quota.data},503);
  const reader=response.body?.getReader();if(!reader)throw Error('Missing response');let output='';const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;output+=decoder.decode(value,{stream:true});if(output.length>24000)throw Error('Oversized response');}output+=decoder.decode();}finally{await reader.cancel();}
  const result=JSON.parse(output);if(typeof result.reply!=='string'||!result.reply.trim()||result.reply.length>12000)throw Error('Invalid response');
  return json({reply:result.reply,usage:quota.data});
 }catch{return json({error:'Study tutor unavailable. Please try again later.'},503);}
});
