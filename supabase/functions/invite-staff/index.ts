import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),30,60000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 try{
  const {email,fullName,role,tenantId}=await req.json();
  const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}}});
  const prepared=await caller.rpc('prepare_unipathway_account_invitation',{p_email:email,p_name:fullName,p_role:role,p_tenant:tenantId||null});
  if(prepared.error)return json({error:prepared.error.message},403);
  const invitation=prepared.data;
  if(invitation.status==='assigned')return json({success:true,status:'already_assigned',emailSent:false,previousEmailSent:invitation.email_sent});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  let userId=invitation.existing_user_id;let emailSent=false;
  if(!userId){
   const result=await admin.auth.admin.inviteUserByEmail(invitation.email,{data:{full_name:invitation.full_name},redirectTo:'https://unipathway.pk/reset-password'});
   if(result.error)return json({error:'Invitation email could not be issued. Check email delivery configuration; no access assignment was confirmed.'},502);
   userId=result.data.user.id;emailSent=true;
  }
  const completed=await admin.rpc('complete_unipathway_account_invitation',{p_invitation:invitation.id,p_user:userId,p_email_sent:emailSent});
  if(completed.error)return json({error:emailSent?'Invitation email issued, but access assignment failed. Retry the same account; do not create a duplicate.':'Account access could not be assigned. Check centre identity and administrator permissions.'},409);
  return json({success:true,status:emailSent?'invited':'access_assigned',emailSent});
 }catch{return json({error:'Account invitation failed. Check the submitted fields and retry.'},400);}
});
