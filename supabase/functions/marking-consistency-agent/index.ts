import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});if(!rateLimit(getClientIp(req),20,60_000))return rateLimitResponse();
 try{const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;const {assessorDecisionId}=await req.json();
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data:d}=await sb.from('assessor_decisions').select('*').eq('id',assessorDecisionId).single();if(!d)throw new Error('Decision unavailable');
 const {data:ai}=d.ai_draft_id?await sb.from('ai_assessment_drafts').select('*').eq('id',d.ai_draft_id).single():{data:null};
 const variance=(d.raw_grade!=null&&ai?.suggested_grade!=null)?Math.abs(Number(d.raw_grade)-Number(ai.suggested_grade)):null;
 const flags:any[]=[];if(variance!=null&&variance>=15)flags.push({type:'large_ai_human_variance',value:variance,severity:'review'});
 if(ai?.confidence!=null&&Number(ai.confidence)<0.65)flags.push({type:'low_ai_confidence',value:ai.confidence,severity:'review'});
 const second=flags.some(f=>f.severity==='review');
 await sb.from('assessor_decisions').update({ai_variance:variance,consistency_flags:flags,second_read_required:second}).eq('id',d.id);
 return new Response(JSON.stringify({variance,flags,secondReadRequired:second}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}})