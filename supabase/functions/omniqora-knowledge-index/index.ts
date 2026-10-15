import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
// Indexing happens atomically during human document approval. This endpoint reports actual index state.
Deno.serve(async req=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),20,60000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data,error}=await sb.from('omniqora_knowledge_documents').select('id,title,content_revision,approval_status,indexed_at').eq('source_type','reviewed_text').eq('approval_status','approved').limit(100);
 if(error)return reply({error:'Knowledge index unavailable'},503);
 return reply({documents:data||[],index_mode:'postgresql_full_text',index_on:'human_approval',embedding_provider_configured:false});
});
