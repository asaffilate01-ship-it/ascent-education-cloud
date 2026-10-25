import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response(null,{headers:corsHeaders})
 if(!rateLimit(getClientIp(req),10,60_000)) return rateLimitResponse()
 try{
  const auth=await authenticateRequest(req); if(auth instanceof Response)return auth
  const {action}=await req.json()
  if(action==='status')return new Response(JSON.stringify({live:false,message:'NADRA is not connected for live verification. Institutional onboarding, approved API documentation and consent/OTP integration are required. Uploaded identity documents remain subject to admissions review.'}),{headers:{...corsHeaders,'Content-Type':'application/json'}})
  return new Response(JSON.stringify({error:'Live NADRA verification is not activated. Contact admissions for document review.'}),{status:503,headers:{...corsHeaders,'Content-Type':'application/json'}})

 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Unknown error'}),{status:500,headers:{...corsHeaders,'Content-Type':'application/json'}})}
})