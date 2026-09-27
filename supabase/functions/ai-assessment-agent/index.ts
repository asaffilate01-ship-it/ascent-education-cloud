import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null,{headers:corsHeaders})
  if (!rateLimit(getClientIp(req),10,60_000)) return rateLimitResponse()
  try {
    const auth=await authenticateRequest(req); if (auth instanceof Response) return auth
    const { attemptId }=await req.json()
    if (!attemptId) return new Response(JSON.stringify({error:'attemptId required'}),{status:400,headers:{...corsHeaders,'Content-Type':'application/json'}})
    const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}})
    const {data:attempt,error:aerr}=await sb.from('submission_attempts').select('*').eq('id',attemptId).single()
    if(aerr||!attempt) return new Response(JSON.stringify({error:'Attempt unavailable'}),{status:404,headers:{...corsHeaders,'Content-Type':'application/json'}})
    const {data:submission}=await sb.from('submissions').select('*, assignments(*, modules(*))').eq('id',attempt.submission_id).single()
    const moduleId=submission?.assignments?.module_id
    const {data:outcomes}=await sb.from('curriculum_outcomes').select('*').eq('module_id',moduleId)
    if(!outcomes?.length) return new Response(JSON.stringify({error:'Controlled learning outcomes/criteria are required before AI assessment'}),{status:409,headers:{...corsHeaders,'Content-Type':'application/json'}})

    const criteria=outcomes.flatMap((o:any)=>(o.assessment_criteria||[]).map((ac:any)=>({learningOutcome:o.learning_outcome_code,criterion:ac})))
    const system='You are an assessment decision-support agent. You do not issue final grades. Assess only against the supplied controlled criteria. Never infer misconduct. Return strict JSON with criteria_results, suggested_grade, suggested_outcome, confidence, integrity_flags. Every criterion result must include criterion_code, recommendation, evidence_location, rationale, confidence, missing_evidence, suggested_feedback. If learner evidence is unavailable, say insufficient_evidence rather than inventing it.'
    const evidence=String(submission?.content || submission?.submission_text || submission?.notes || '').slice(0,30000)
    const prompt=JSON.stringify({assignment:submission?.assignments?.title,module:submission?.assignments?.modules?.title,specification:outcomes.map((o:any)=>({version:o.specification_version,lo:o.learning_outcome_code,text:o.learning_outcome,criteria:o.assessment_criteria})),learnerEvidence:evidence,attempt:{number:attempt.attempt_number,submittedAt:attempt.submitted_at,deadlineAt:attempt.deadline_at,isLate:attempt.is_late}})
    const resp=await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:'google/gemini-3-flash-preview',messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.1,max_tokens:4000,response_format:{type:'json_object'}})})
    if(!resp.ok) throw new Error('AI provider error')
    const raw=await resp.json(); const parsed=JSON.parse(raw.choices?.[0]?.message?.content||'{}')
    const version=outcomes.map((o:any)=>o.specification_version).filter(Boolean).join(',')||'controlled'
    const {data:draft,error:derr}=await sb.from('ai_assessment_drafts').insert({tenant_id:attempt.tenant_id,submission_attempt_id:attempt.id,specification_version:version,rubric_version:'criteria-v1',model_provider:'gateway',model_name:'google/gemini-3-flash-preview',prompt_version:'criteria-v1',criteria_results:parsed.criteria_results||[],suggested_grade:parsed.suggested_grade??null,suggested_outcome:parsed.suggested_outcome??null,confidence:parsed.confidence??null,integrity_flags:parsed.integrity_flags||[]}).select().single()
    if(derr) throw derr
    await sb.from('submission_attempts').update({status:'ai_drafted'}).eq('id',attempt.id)
    return new Response(JSON.stringify({draft}),{headers:{...corsHeaders,'Content-Type':'application/json'}})
  } catch(e) {
    return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})
  }
})