import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import {corsHeaders,rateLimit,rateLimitResponse,getClientIp} from '../_shared/cors.ts';
import {authenticateRequest} from '../_shared/auth.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 ...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
const safeRoles=new Set([
 'office_admin','hr_officer','secretary','admissions_admin','lecturer',
 'programme_leader','iqa_officer','assessor','exams_officer','finance_officer',
 'marketing_officer','security_officer','welfare_officer'
]);
const officeRoles=new Set(['office_admin','hr_officer','secretary']);
const capabilities=new Set([
 'staff_directory','invite_limited_staff','view_schedule','view_own_tasks',
 'prepare_compliance','view_leave_summary','view_lab_inventory'
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validPermissions=(raw:unknown)=>{
 if(raw===undefined)return {};
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const entries=Object.entries(raw);
 if(entries.length>capabilities.size)return null;
 const result:Record<string,string>={};
 for(const [name,effect] of entries){
  if(!capabilities.has(name)||(effect!=='allow'&&effect!=='deny'))return null;
  result[name]=effect;
 }
 return result;
};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 if(!rateLimit(getClientIp(req),12,60_000))return rateLimitResponse();
 const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
 // This server-only flag is distinct from the frontend display flag.
 if(Deno.env.get('UNIPATHWAY_STAFF_INVITES_ENABLED')!=='true')
  return json({error:'UniPathway staff invitation is not yet activated for this centre.'},503);
 try{
  const raw=await req.text();
  if(raw.length>8000)return json({error:'Staff invitation request is too large'},413);
  const data=JSON.parse(raw);
  if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Invalid staff invitation'},400);
  const {email,fullName,role,tenantId,permissions}=data as Record<string,unknown>;
  const keys=Object.keys(data);
  if(keys.some(key=>!['email','fullName','role','tenantId','permissions'].includes(key))||
   typeof email!=='string'||email.length>254||!email.includes('@')||
   typeof fullName!=='string'||fullName.trim().length<2||fullName.length>120||
   typeof role!=='string'||!safeRoles.has(role)||
   (tenantId!==undefined&&tenantId!==null&&(typeof tenantId!=='string'||!uuid.test(tenantId))))
   return json({error:'Only an approved staff role and valid name, email and centre may be invited.'},400);
  const overrides=validPermissions(permissions);
  if(overrides===null||(!officeRoles.has(role)&&Object.keys(overrides).length))
   return json({error:'The requested personal permissions are not allowed for this role.'},400);
  const authHeader=req.headers.get('Authorization')||'';
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!anon)return json({error:'Invitation service configuration is missing'},503);
  const caller=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
  // Centre, inviter role, invited role and override approvals are all checked
  // in a privileged SQL transaction. No client-supplied role is trusted here.
  const prepared=await caller.rpc('prepare_unipathway_account_invitation',{
   p_email:email.trim().toLowerCase(),p_name:fullName.trim(),
   p_role:role,p_tenant:tenantId||null,p_permissions:overrides
  });
  if(prepared.error||!prepared.data||typeof prepared.data!=='object')
   return json({error:'The centre invitation was not authorised or confirmed.'},403);
  const invitation=prepared.data;
  if(invitation.status==='assigned')
   return json({success:true,status:'already_assigned',emailSent:false});
  if(typeof invitation.id!=='string'||!uuid.test(invitation.id)||typeof invitation.email!=='string')
   return json({error:'The centre did not issue a valid invitation receipt.'},503);

  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!secret)return json({error:'Invitation email service unavailable'},503);
  const admin=createClient(url,secret,{auth:{persistSession:false}});
  let userId=invitation.existing_user_id;let emailSent=false;
  if(!userId){
   const response=await admin.auth.admin.inviteUserByEmail(invitation.email,{
    data:{full_name:invitation.full_name},
    redirectTo:'https://unipathway.pk/reset-password',
   });
   if(response.error||!response.data?.user?.id)
    return json({error:'Invitation email could not be issued. The centre has not confirmed staff access.'},502);
   userId=response.data.user.id;emailSent=true;
  }
  if(typeof userId!=='string'||!uuid.test(userId))
   return json({error:'A verified invited account was not returned.'},503);
  const completed=await admin.rpc('complete_unipathway_account_invitation',{
   p_invitation:invitation.id,p_user:userId,p_email_sent:emailSent,
  });
  if(completed.error||completed.data?.status!=='assigned'||completed.data?.userId!==userId)
   return json({error:emailSent?
    'Invitation email issued, but centre role and permission assignment was not confirmed. Check the existing account before retrying.':
    'Existing account access was not confirmed. Check the centre before retrying.'},409);
  return json({success:true,status:emailSent?'invited':'access_assigned',emailSent});
 }catch{
  return json({error:'Staff invitation request could not be processed. Review the centre and email.'},400);
 }
});
