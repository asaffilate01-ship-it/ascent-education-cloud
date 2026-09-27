import { corsHeaders,rateLimit,rateLimitResponse,getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});if(!rateLimit(getClientIp(req),20,60_000))return rateLimitResponse();
 try{const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;const {attemptId}=await req.json();
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data:evidence}=await sb.from('integrity_evidence').select('*').eq('submission_attempt_id',attemptId);
 const {data:declaration}=await sb.from('student_ai_declarations').select('*').eq('submission_attempt_id',attemptId).maybeSingle();
 const signals=(evidence||[]).map((e:any)=>({type:e.evidence_type,score:e.score,severity:e.severity,summary:e.summary,evidence:e.evidence}));
 const system='You are an academic-integrity triage assistant. Never conclude cheating or misconduct. AI-writing detectors and similarity percentages are not proof. Distinguish properly cited similarity from problematic matching when evidence permits. Return JSON {risk_level,summary,signals,recommended_action,questions_for_human}. recommended_action must be one of no_concern, human_review, student_discussion, formal_policy_review. Base conclusions only on supplied evidence and explicitly state uncertainty.'
 const resp=await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:'google/gemini-3-flash-preview',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({signals,declaration})}],temperature:0.1,response_format:{type:'json_object'}})});
 const raw=await resp.json();const out=JSON.parse(raw.choices?.[0]?.message?.content||'{}');
 return new Response(JSON.stringify(out),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}})