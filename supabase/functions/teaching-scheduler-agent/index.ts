import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async(req)=>{if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});if(!rateLimit(getClientIp(req),10,60_000))return rateLimitResponse();
 try{const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;const {moduleId,cohortReference,requiredSlots=[]}=await req.json();
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
 const {data:eligible}=await sb.from('module_staff_eligibility').select('*').eq('module_id',moduleId).eq('active',true).order('eligibility_score',{ascending:false});
 if(!eligible?.length)return new Response(JSON.stringify({error:'No academically approved lecturers for this module'}),{status:409,headers:{...corsHeaders,'Content-Type':'application/json'}});
 const ids=eligible.map((x:any)=>x.user_id);const {data:availability}=await sb.from('staff_availability').select('*').in('user_id',ids).eq('active',true);
 const candidates=eligible.map((e:any)=>({userId:e.user_id,eligibilityScore:e.eligibility_score,reasons:e.reasons,availability:(availability||[]).filter((a:any)=>a.user_id===e.user_id)}));
 // AI suggests only from academically approved candidates; human approval remains required.
 const prompt=JSON.stringify({moduleId,cohortReference,requiredSlots,candidates,rules:['Do not select outside availability','Prefer best competency fit','Balance weekly workload','Avoid timetable clashes','Return ranked assignments with reasons']});
 const resp=await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:'google/gemini-3-flash-preview',messages:[{role:'system',content:'You are a teaching timetable optimisation agent. Only schedule lecturers supplied as academically eligible. Return JSON {proposals:[{userId,slot,score,reasons}]}. Never approve or publish a timetable.'},{role:'user',content:prompt}],temperature:0.1,response_format:{type:'json_object'}})});
 const data=await resp.json();return new Response(JSON.stringify(JSON.parse(data.choices?.[0]?.message?.content||'{}')),{headers:{...corsHeaders,'Content-Type':'application/json'}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}})