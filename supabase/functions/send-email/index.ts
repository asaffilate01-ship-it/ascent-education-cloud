import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
// All interactive email enters the audited institutional outbox; never accept an arbitrary From address.
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 if(req.method!=='POST')return json({error:'POST required'},405);
 if(!rateLimit(getClientIp(req),10,60000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 try{
  const {mailboxId,to,subject,text,threadId,requestId}=await req.json();
  if(!mailboxId||!requestId||!text||!subject)return json({error:'mailboxId, requestId, subject and plain text are required'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
  const saved=await db.rpc('save_uni_mail_draft',{p_box:mailboxId,p_subject:subject,p_to:Array.isArray(to)?to:[to],p_body:text,p_thread:threadId||null,p_request:requestId});
  if(saved.error)return json({error:'Draft denied or invalid'},403);
  // Saving is not authority to send; the dashboard presents the draft for explicit queuing.
  return json({status:'draft',messageId:saved.data,message:'Saved to Communications. Review and queue it in your dashboard.'},201);
 }catch{return json({error:'Unable to save email draft'},400);}
});
