import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {corsHeaders,getClientIp,rateLimit,rateLimitResponse} from '../_shared/cors.ts';
import {acceptedTurnstileOutcome} from '../_shared/unipathway-turnstile.ts';
import {validateSecureContact} from '../_shared/unipathway-secure-contact.ts';

// Stage-only hardened replacement for general UniPathway contact. Do not activate
// its frontend flag until Turnstile, durable quota RPC and hosted auth tests pass.
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...corsHeaders,'content-type':'application/json','cache-control':'no-store'}
});
async function validateChallenge(token:string):Promise<boolean|null>{
 const secret=Deno.env.get('TURNSTILE_SECRET_KEY');
 const hosts=(Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!secret||!hosts.length)return null;
 const form=new FormData();form.set('secret',secret);form.set('response',token);
 try{
  const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body:form,signal:AbortSignal.timeout(7000)
  });
  return result.ok&&acceptedTurnstileOutcome(await result.json(),hosts,'unipathway-enquiry');
 }catch{return false;}
}
async function contactDigest(email:string):Promise<string|null>{
 const pepper=Deno.env.get('ENQUIRY_QUOTA_PEPPER');
 if(!pepper||pepper.length<32)return null;
 const bytes=new TextEncoder().encode(pepper+':'+email);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(Number(req.headers.get('content-length')||0)>16000)return json({error:'Request too large'},413);
 if(!rateLimit(getClientIp(req),4,60000))return rateLimitResponse();
 let input:unknown;
 try{
  const body=await req.text();
  if(body.length>16000)return json({error:'Request too large'},413);
  input=JSON.parse(body);
 }catch{return json({error:'Invalid request'},400);}
 const data=validateSecureContact(input);
 if(!data)return json({error:'Check your contact details, message, privacy acknowledgement and security challenge.'},400);
 const challenge=await validateChallenge(data.captchaToken);
 if(challenge===null)return json({error:'Secure enquiry service is not configured.'},503);
 if(!challenge)return json({error:'Security verification failed or expired. Please retry.'},403);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const digest=await contactDigest(data.email);
 if(!url||!key||!digest)return json({error:'Secure enquiry service is temporarily unavailable.'},503);
 try{
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const quota=await admin.rpc('consume_unipathway_enquiry_quota',{p_digest:digest,p_limit:4});
  if(quota.error||quota.data===null)return json({error:'Unable to verify enquiry quota. Retry later.'},503);
  if(quota.data!==true)return json({error:'Too many enquiries. Please try again later.'},429);
  const tenant=await admin.from('tenants').select('id').eq('slug','unipathway').maybeSingle();
  if(tenant.error||!tenant.data?.id)return json({error:'Admissions are temporarily unavailable.'},503);
  const notes=[
    'Subject: '+data.subject,
    'Applicant message: '+data.message,
    'Privacy notice acknowledged: yes',
  ].join('\n\n').slice(0,5500);
  const stored=await admin.from('applications').insert({
   tenant_id:tenant.data.id,student_name:data.name,email:data.email,
   phone:data.phone||null,source:'contact_form',stage:'lead',notes,
  }).select('id').single();
  if(stored.error||!stored.data?.id)return json({error:'Your enquiry could not be confirmed. Please try again later.'},503);
  return json({ok:true,message:'Your course enquiry has been recorded for admissions review.'});
 }catch(e){
  console.error('Secure UniPathway contact failure',e instanceof Error?e.name:'unknown');
  return json({error:'Enquiries are temporarily unavailable.'},503);
 }
});
