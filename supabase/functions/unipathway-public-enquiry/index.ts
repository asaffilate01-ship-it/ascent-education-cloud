import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, getClientIp, rateLimit, rateLimitResponse } from '../_shared/cors.ts';
import { acceptedTurnstileOutcome } from '../_shared/unipathway-turnstile.ts';

// Dedicated public enquiry endpoint for UniPathway. No student records are returned.
// Cloudflare Turnstile verification and a durable, service-role-only per-email quota
// are required. A missing configuration fails closed, never falls back to an open form.
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}
});
const destinations=['UK','USA','Canada','Australia','Germany','Pakistan'];
const testTypes=['academic','general','unsure'];
const origins=['current_student','external_student'];
const priorities=['OTHM','Qualifi','Direct entry','Unsure'];
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
async function validateChallenge(token:string):Promise<boolean|null>{
 const secret=Deno.env.get('TURNSTILE_SECRET_KEY');
 const allowed=(Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES')||'')
  .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!secret||!allowed.length)return null; // Environment not ready; reject all.
 const form=new FormData();
 form.set('secret',secret);form.set('response',token);
 try{
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body:form,signal:AbortSignal.timeout(7000)
  });
  if(!response.ok)return false;
  const checked=await response.json() as unknown;
  return acceptedTurnstileOutcome(checked,allowed);
 }catch{return false;}
}
async function digestApplicantEmail(email:string):Promise<string|null>{
 const pepper=Deno.env.get('ENQUIRY_QUOTA_PEPPER');
 if(!pepper||pepper.length<32)return null; // Required secret, not client-accessible.
 const bytes=new TextEncoder().encode(pepper+':'+email.toLowerCase().trim());
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const bodyBytes=Number(req.headers.get('content-length')||0);
 if(bodyBytes>16000)return json({error:'Request exceeds maximum allowed size'},413);
 if(!rateLimit(getClientIp(req),4,60_000))return rateLimitResponse();
 let body:Record<string,unknown>;
 try{const parsed=await req.json();if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return json({error:'Invalid request'},400);body=parsed;}
 catch{return json({error:'Invalid JSON request'},400);}
 const kind=body.kind==='ielts'?'ielts':body.kind==='university'?'university':null;
 if(!kind||body.tenant_slug!=='unipathway')return json({error:'Unsupported enquiry'},400);
 const name=text(body.name,200),email=text(body.email,254),phone=text(body.phone,35),
   message=text(body.message,1800),destination=text(body.destination,25),
   testType=text(body.test_type,25),origin=text(body.student_origin,30),
   priority=text(body.prior_qualification,30);
 if(name.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || message.length>1800 || body.consent!==true || (phone&&phone.length<7)){
   return json({error:'Check your name, email, contact details and privacy acknowledgement.'},400);
 }
 if(!origins.includes(origin)|| (kind==='university'&&!destinations.includes(destination))
    || (kind==='ielts'&&!testTypes.includes(testType))
    || (kind==='university'&&!priorities.includes(priority))){
   return json({error:'Please choose a valid study route.'},400);
 }
 const challengeToken=text(body.captcha_token,2500);
 if(challengeToken.length<20)return json({error:'Complete the security challenge and retry.'},403);
 const accepted=await validateChallenge(challengeToken);
 if(accepted===null)return json({error:'The enquiry service is not configured for secure submissions.'},503);
 if(!accepted)return json({error:'Security verification failed. Please retry.'},403);
 try{
   const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   if(!url||!secret)return json({error:'Enquiries are temporarily unavailable.'},503);
   const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const hashed=await digestApplicantEmail(email);
   if(!hashed)return json({error:'Secure enquiry throttling is not configured.'},503);
   const quota=await admin.rpc('consume_unipathway_enquiry_quota',{
    p_digest:hashed,p_limit:4
   });
   if(quota.error){
    console.error('UniPathway enquiry quota unavailable',quota.error.code);
    return json({error:'Please try again later.'},503);
   }
   if(quota.data!==true)return json({error:'Too many enquiries. Please try again later.'},429);
   const t=await admin.from('tenants').select('id').eq('slug','unipathway').maybeSingle();
   if(t.error||!t.data?.id)return json({error:'Admissions are temporarily unavailable; please try again later.'},503);
   const classification=kind==='ielts'?'IELTS '+testType:'University '+destination+' / '+priority;
   const notes=[
     'UniPathway independent admissions interest',
     'Route: '+(kind==='ielts'?'IELTS preparation':'University progression'),
     'Existing UniPathway student: '+(origin==='current_student'?'yes (not identity-verified)':'no'),
     kind==='ielts'?'Requested test: '+testType:'Destination: '+destination,
     kind==='university'?'Qualification interest: '+priority:'',
     'Applicant message: '+(message||'No additional message supplied'),
     'Privacy notice acknowledged: yes'
   ].filter(Boolean).join('\n').slice(0,4500);
   const created=await admin.from('applications').insert({
     tenant_id:t.data.id,
     student_name:name,email,phone:phone||null,
     source:kind==='ielts'?'ielts_preparation':'university_progression_'+destination.toLowerCase(),
     stage:'lead',
     programme_name:classification,
     notes
   });
   if(created.error){
     console.error('UniPathway public enquiry insert failed:',created.error.code);
     return json({error:'Your enquiry could not be recorded. Please retry later.'},503);
   }
   return json({ok:true,message:'Enquiry received. Our admissions team can review it.'});
 }catch(e){
   console.error('UniPathway public enquiry failure',e instanceof Error?e.name:'unknown');
   return json({error:'The enquiry service is temporarily unavailable.'},503);
 }
});
