import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AppStreamClient, CreateStreamingURLCommand } from 'npm:@aws-sdk/client-appstream';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders, rateLimit } from '../_shared/cors.ts';

/**
 * UniPathway AWS lab gateway: authenticated student-owned AppStream/
 * Amazon WorkSpaces Applications streaming URL.
 *
 * This is NOT an EC2 instance allocator and does not expose AWS credentials.
 * A dedicated, tested AWS fleet/stack and restricted IAM principal must exist
 * before AWS_LAB_ENABLED=true. No private AWS URL is stored in Supabase.
 * AWS Academy Learner Lab is separate (institutional invitation, no fake API).
 */
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}
});
type Action='readiness'|'request_and_launch'|'launch_existing';
const uid=(id:string)=>'u'+id.replaceAll('-','').slice(0,30);
const validId=(id:unknown):id is string=>typeof id==='string'&&
 /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const awsReady=()=>Deno.env.get('AWS_LAB_ENABLED')==='true'
 && !!Deno.env.get('AWS_LAB_TENANT_ID')
 && !!Deno.env.get('AWS_LAB_STACK_NAME')
 && !!Deno.env.get('AWS_LAB_FLEET_NAME')
 && !!Deno.env.get('AWS_REGION')
 && !!Deno.env.get('AWS_ACCESS_KEY_ID')
 && !!Deno.env.get('AWS_SECRET_ACCESS_KEY');

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'POST required'},405);
 try{
  const authenticated=await authenticateRequest(req);
  if(authenticated instanceof Response)return authenticated;
  const actor=authenticated.userId;
  if(!rateLimit('unipathway-lab:'+actor,8,60_000))
   return json({error:'Too many lab requests; wait one minute.'},429);
  const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body!=='object'||Array.isArray(body))
   return json({error:'A valid JSON request is required'},400);
  const action=body.action as Action|undefined;
  if(!action||!['readiness','request_and_launch','launch_existing'].includes(action))
   return json({error:'Invalid lab gateway operation'},400);
  if(action==='readiness')
   return json({aws_managed_configured:awsReady(),code:awsReady()?'configured':'connector_setup_required',
    note:'This checks configured server credentials, not fleet capacity, billing or a completed AWS lab session.'});

  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!serviceKey)return json({error:'Lab service environment incomplete'},503);
  const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
  const userClient=createClient(url,anon,{
   global:{headers:{Authorization:req.headers.get('Authorization')||''}},
   auth:{persistSession:false}
  });
  const {data:profile,error:profileError}=await admin.from('profiles')
   .select('tenant_id').eq('user_id',actor).maybeSingle();
  if(profileError||!profile?.tenant_id)return json({error:'Approved centre assignment required'},403);
  const {data:isStudent,error:roleError}=await admin.rpc('has_role',
    {_user_id:actor,_role:'student'});
  if(roleError||isStudent!==true)return json({error:'Enrolled student role required'},403);
  let sessionId:unknown=body.sessionId;
  if(action==='request_and_launch'){
   if(!validId(body.offeringId))return json({error:'Invalid course lab reference'},400);
   if(!['self_study','online','in_centre'].includes(String(body.mode||'')))
    return json({error:'Invalid lab attendance mode'},400);
   if(body.classRunId!==undefined&&body.classRunId!==null&&!validId(body.classRunId))
    return json({error:'Invalid lecture lab reference'},400);
   // Check AWS provider activation BEFORE reserving a lab session.
   if(!awsReady()||Deno.env.get('AWS_LAB_TENANT_ID')!==profile.tenant_id)
    return json({error:'AWS lab workspace is not yet activated for this centre'},409);
   const {data:offering,error:offeringError}=await admin.from('lms_lab_offerings')
    .select('id,tenant_id,module_id,template_id,published,launch_enabled')
    .eq('id',body.offeringId).maybeSingle();
   if(offeringError||!offering||offering.tenant_id!==profile.tenant_id
     ||!offering.published||!offering.launch_enabled)
    return json({error:'Lab is not approved for this centre'},403);
   const {data:template,error:templateError}=await admin.from('lab_templates')
    .select('id,tenant_id,provider,active').eq('id',offering.template_id).maybeSingle();
   if(templateError||!template||template.provider!=='aws_managed'||!template.active)
    return json({error:'Direct launch is only available for a verified managed AWS lab'},409);
   const {data:cfg,error:cfgError}=await admin.from('lab_provider_configs')
    .select('enabled,credential_status').eq('tenant_id',profile.tenant_id)
    .eq('provider','aws_managed').maybeSingle();
   if(cfgError||!cfg?.enabled||cfg.credential_status!=='verified')
    return json({error:'AWS provider approval is incomplete'},409);
   const {data:reserved,error:reserveError}=await userClient.rpc(
    'request_unipathway_managed_lab',{
     p_offering:body.offeringId,p_mode:body.mode,
     p_class_run:body.classRunId||null
    });
   if(reserveError)return json({error:reserveError.message||'Lab access was denied'},403);
   sessionId=reserved;
  }
  if(!validId(sessionId))return json({error:'Invalid owned lab attempt'},400);
  const {data:session,error:sessionError}=await admin.from('lab_sessions')
   .select('id,tenant_id,student_id,template_id,offering_id,class_run_id,launch_mode,status,expires_at,stop_requested_at')
   .eq('id',sessionId).maybeSingle();
  if(sessionError||!session||session.student_id!==actor||session.tenant_id!==profile.tenant_id)
   return json({error:'No permitted lab session found'},403);
  if(!session.offering_id||!['provisioning','ready','active','paused'].includes(session.status)
     ||session.stop_requested_at || !session.expires_at
     ||Date.parse(session.expires_at)<Date.now())
   return json({error:'Lab attempt is inactive or expired'},409);
  const {data:offering,error:offeringError}=await admin.from('lms_lab_offerings')
   .select('id,template_id,module_id,tenant_id,published,launch_enabled')
   .eq('id',session.offering_id).maybeSingle();
  if(offeringError||!offering||offering.tenant_id!==profile.tenant_id
    ||session.template_id!==offering.template_id
    ||!offering.published||!offering.launch_enabled)
   return json({error:'Lab was withdrawn or is no longer active'},403);
  const {data:module,error:moduleError}=await admin.from('modules')
   .select('programme_id,tenant_id').eq('id',offering.module_id).maybeSingle();
  if(moduleError||!module||module.tenant_id!==profile.tenant_id)
   return json({error:'Lab course record unavailable'},403);
  const {data:enrolment,error:enrolError}=await admin.from('student_enrolments')
   .select('id').eq('tenant_id',profile.tenant_id).eq('student_id',actor)
   .eq('programme_id',module.programme_id).eq('status','active').limit(1);
  if(enrolError||!enrolment?.length)return json({error:'Active programme enrolment required'},403);
  const {data:template,error:templateError}=await admin.from('lab_templates')
   .select('provider,active,tenant_id').eq('id',session.template_id).maybeSingle();
  if(templateError||!template||!template.active||template.provider!=='aws_managed'
    ||template.tenant_id!==profile.tenant_id)
   return json({error:'Managed AWS lab provider not available'},409);
  const {data:cfg,error:cfgError}=await admin.from('lab_provider_configs')
   .select('enabled,credential_status').eq('tenant_id',profile.tenant_id)
   .eq('provider','aws_managed').maybeSingle();
  if(cfgError||!cfg?.enabled||cfg.credential_status!=='verified'
    ||!awsReady()||Deno.env.get('AWS_LAB_TENANT_ID')!==profile.tenant_id)
   return json({error:'Approved AWS managed lab is not configured'},409);

  // Revalidate invitations, class window and enrolment on every relaunch too.
  const {data:authorisedSession,error:accessError}=await userClient.rpc(
   'request_unipathway_managed_lab',{
    p_offering:session.offering_id,p_mode:session.launch_mode,p_class_run:session.class_run_id
   });
  if(accessError||authorisedSession!==session.id)
   return json({error:'Lab access or class invitation is no longer valid'},403);

  // WorkSpaces Applications is an AWS-hosted streamed lab, not the public EC2
  // console. UserId is derived solely from the signed-in user's stable UUID.
  // The URL is a 60-second bearer capability: don't log or persist it.
  const client=new AppStreamClient({region:Deno.env.get('AWS_REGION')!});
  let streamingURL:string|undefined;
  try{
   const outcome=await client.send(new CreateStreamingURLCommand({
    FleetName:Deno.env.get('AWS_LAB_FLEET_NAME')!,
    StackName:Deno.env.get('AWS_LAB_STACK_NAME')!,
    UserId:uid(actor),
    Validity:60,
    SessionContext:'unipathway-lab:'+session.id
   }));
   streamingURL=outcome.StreamingURL;
  }catch{
   return json({error:'AWS streaming capacity or provider access unavailable; retry later'},503);
  }finally{client.destroy();}
  if(!streamingURL || !streamingURL.startsWith('https://'))
   return json({error:'AWS did not issue a secure streaming session link'},503);
  const {error:updateError}=await admin.from('lab_sessions').update({
   status:'ready',broker_ready_at:new Date().toISOString(),
   last_activity_at:new Date().toISOString()
  }).eq('id',session.id).eq('student_id',actor).eq('tenant_id',profile.tenant_id);
  if(updateError)return json({error:'Lab access could not be audited; retry launch'},503);
  return json({status:'launch_url_issued',url:streamingURL,validitySeconds:60,
    sessionId:session.id,note:'Session link issued; actual AWS streaming connection and task completion are not yet verified.'});
 }catch{
  return json({error:'Lab gateway unavailable. Contact course administration.'},503);
 }
});
