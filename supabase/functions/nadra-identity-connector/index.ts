import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response(null,{headers:corsHeaders})
 if(!rateLimit(getClientIp(req),10,60_000)) return rateLimitResponse()
 try{
  const auth=await authenticateRequest(req); if(auth instanceof Response)return auth
  const {kycCaseId,action}=await req.json()
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}})
  const {data:k}=await sb.from('student_kyc_cases').select('*').eq('id',kycCaseId).single()
  if(!k) return new Response(JSON.stringify({error:'KYC case unavailable'}),{status:404,headers:{...corsHeaders,'Content-Type':'application/json'}})
  if(!k.consent_nadra) return new Response(JSON.stringify({error:'Student consent required before NADRA verification'}),{status:409,headers:{...corsHeaders,'Content-Type':'application/json'}})
  const mode=Deno.env.get('NADRA_MODE')||'manual'
  if(mode!=='live'){
   await sb.from('identity_verification_events').insert({tenant_id:k.tenant_id,kyc_case_id:k.id,provider:'NADRA',method:'Nishan/Verisys',status:'manual_review',response_metadata:{mode:'connector_ready',note:'Awaiting approved NADRA production credentials'}})
   await sb.from('student_kyc_cases').update({identity_status:'manual_review'}).eq('id',k.id)
   return new Response(JSON.stringify({status:'manual_review',mode,message:'NADRA connector is ready; production API activation requires institutional onboarding/credentials.'}),{headers:{...corsHeaders,'Content-Type':'application/json'}})
  }
  // Do not invent NADRA endpoints. Configure only from the official institutional onboarding pack.
  const endpoint=Deno.env.get('NADRA_VERIFICATION_ENDPOINT'), token=Deno.env.get('NADRA_API_TOKEN')
  if(!endpoint||!token) throw new Error('NADRA production endpoint/credential not configured')
  const payload={identityType:k.identity_type,identityNumber:k.identity_number,consent:true,reference:k.id}
  const resp=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)})
  const data=await resp.json(); if(!resp.ok) throw new Error('NADRA verification request failed')
  // Store only minimum verification metadata; do not persist raw biometrics.
  const verified=Boolean(data.verified??data.status==='verified')
  await sb.from('identity_verification_events').insert({tenant_id:k.tenant_id,kyc_case_id:k.id,provider:'NADRA',method:action||'Nishan/Verisys',provider_reference:data.reference||null,status:verified?'verified':'manual_review',attributes_verified:data.attributes_verified||{},response_metadata:{status:data.status||null},verified_at:verified?new Date().toISOString():null})
  await sb.from('student_kyc_cases').update({identity_status:verified?'nadra_verified':'manual_review'}).eq('id',k.id)
  return new Response(JSON.stringify({verified,reference:data.reference||null}),{headers:{...corsHeaders,'Content-Type':'application/json'}})
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}
})