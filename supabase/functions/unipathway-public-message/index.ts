import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {corsHeaders,getClientIp,rateLimit,rateLimitResponse} from '../_shared/cors.ts';
import {readBoundedContactBody} from '../_shared/legacy-contact.ts';
import {acceptedTurnstileOutcome} from '../_shared/unipathway-turnstile.ts';
import {parsePublicMessage,publicMessageEmails} from '../_shared/unipathway-public-message.ts';

const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
async function digest(pepper:string,value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pepper+':'+value));
 return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function verifyCaptcha(token:string,secret:string,hosts:string[]){
 try{
  const form=new FormData();form.set('secret',secret);form.set('response',token);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form,signal:AbortSignal.timeout(7000)});
  return response.ok&&acceptedTurnstileOutcome(await response.json(),hosts,'unipathway-enquiry');
 }catch{return false;}
}
async function sendMail(apiKey:string,key:string,body:unknown):Promise<string|null>{
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(9000),headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
  if(!response.ok)return null;
  const receipt=await response.json();
  return typeof receipt?.id==='string'&&receipt.id.length>0&&receipt.id.length<=120?receipt.id:null;
 }catch{return null;}
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(Deno.env.get('UNIPATHWAY_PUBLIC_MESSAGES_ENABLED')!=='true')return json({error:'The secure messaging service is not yet available.'},503);
 if(!rateLimit(getClientIp(req),4,60000))return rateLimitResponse();
 const input=await readBoundedContactBody(req);
 if(!input.ok)return json({error:input.status===413?'Request too large':'Invalid request'},input.status);
 const message=parsePublicMessage(input.value);
 if(!message)return json({error:'Check your contact details, enquiry fields and security verification.'},400);
 const secret=Deno.env.get('TURNSTILE_SECRET_KEY'),pepper=Deno.env.get('ENQUIRY_QUOTA_PEPPER'),apiKey=Deno.env.get('RESEND_API_KEY');
 const hosts=(Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES')||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!pepper||pepper.length<32||!apiKey||!hosts.length||!url||!key)return json({error:'Secure messaging is temporarily unavailable.'},503);
 if(!await verifyCaptcha(message.captchaToken,secret,hosts))return json({error:'Security verification failed or expired. Please retry.'},403);
 try{
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const stored=await admin.rpc('prepare_unipathway_public_message',{
   p_request:message.requestId,p_channel:message.channel,p_payload:message.payload,
   p_email_digest:await digest(pepper,message.payload.email),
   p_global_digest:await digest(pepper,'unipathway-global-message-intake'),
  });
  if(stored.error||!stored.data)return json({error:'Your message could not be confirmed. Retry the same reference or contact the team.'},503);
  if(stored.data.allowed===false)return json({error:'Too many enquiries. Please try again later.'},429);
  const row=stored.data;
  if(row.allowed!==true||row.request_id!==message.requestId||row.channel!==message.channel||typeof row.team_accepted!=='boolean'||typeof row.receipt_accepted!=='boolean')return json({error:'Message acknowledgement could not be verified.'},503);
  let team=row.team_accepted,receipt=row.receipt_accepted;
  const created=Date.parse(row.created_at);
  // Resend idempotency keys expire after 24h. Never blindly retry an uncertain
  // send outside a conservative 23h window; retain the request for reconciliation.
  const retryWindow=Number.isFinite(created)&&created<=Date.now()&&Date.now()-created<23*3600000;
  if(retryWindow){
   const messages=publicMessageEmails(message);
   async function deliver(kind:'team'|'receipt'){
    const id=await sendMail(apiKey!, 'unipathway/'+message!.requestId+'/'+kind,messages[kind]);
    if(!id)return false;
    const result=await admin.rpc('confirm_unipathway_public_message_mail',{p_request:message!.requestId,p_kind:kind,p_email_id:id});
    return !result.error&&result.data===true;
   }
   if(!team)team=await deliver('team');
   if(!receipt)receipt=await deliver('receipt');
  }
  return json({ok:true,request_id:message.requestId,channel:message.channel,recorded:true,team_accepted:team,receipt_accepted:receipt,retry_available:retryWindow});
 }catch{return json({error:'Your message could not be confirmed. Retry the same reference or contact the team.'},503);}
});
