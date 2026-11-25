import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.1';
import { authenticateRequest } from '../_shared/auth.ts';
import { corsHeaders,rateLimit,rateLimitResponse } from '../_shared/cors.ts';
import {cameraIdValid,cameraScope,canViewCamera} from '../_shared/cctv-policy.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:corsHeaders});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const auth=await authenticateRequest(req);if(auth instanceof Response)return auth;
  if(!rateLimit(`cctv:${auth.userId}`,20,60000))return rateLimitResponse();
  const body=await req.json();
  if(!body||!['live','playback'].includes(body.mode)||!cameraIdValid(body.cameraId)||!cameraIdValid(body.tenantId))return json({error:'Choose a centre, camera and viewing mode'},400);
  const service=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Resolve exact current database memberships; a supplied role or JWT label alone never authorises access.
  const [p,r,t]=await Promise.all([
   service.from('profiles').select('user_id,tenant_id').eq('user_id',auth.userId).maybeSingle(),
   service.from('user_roles').select('user_id,role,tenant_id').eq('user_id',auth.userId),
   service.from('tenants').select('id,status').eq('id',body.tenantId).maybeSingle(),
  ]);
  if(p.error||r.error||t.error||!cameraScope(auth.userId,body.tenantId,body.role,p.data,r.data,t.data))return json({error:'Verified centre viewing membership required'},403);
  const {data:camera,error}=await service.from('unipathway_cctv_cameras').select('id,tenant_id,provider_camera_id,enabled,security_live,security_playback').eq('tenant_id',body.tenantId).eq('id',body.cameraId).maybeSingle();
  if(error||!camera||!canViewCamera(camera,body.tenantId,body.cameraId,body.role,body.mode))return json({error:'Camera unavailable to this account'},403);
  let start:string|null=null,end:string|null=null,reason:string|null=null;
  if(body.mode==='playback'){
   const a=Date.parse(body.startsAt),b=Date.parse(body.endsAt);
   if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b>Date.now()||b-a>86400000||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>500)return json({error:'Choose a past period up to 24 hours and give a reason'},400);
   start=new Date(a).toISOString();end=new Date(b).toISOString();reason=body.reason.trim();
  }
  const gateway=Deno.env.get('CCTV_GATEWAY_URL'),token=Deno.env.get('CCTV_GATEWAY_TOKEN');
  const kind=Deno.env.get('CCTV_GATEWAY_PROVIDER')||'generic';
  if(!gateway||!token||!['generic','hikvision_hikcentral','hikvision_isapi_gateway'].includes(kind))return json({error:'CCTV gateway is not connected. Ask your administrator to configure the approved provider.'},503);
  const endpoint=new URL(gateway);
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)return json({error:'Secure CCTV gateway configuration required'},503);
  const provider=await fetch(endpoint.href,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({tenantId:camera.tenant_id,cameraId:camera.provider_camera_id,mode:body.mode,startsAt:start,endsAt:end,viewerId:auth.userId,provider:kind})});
  if(!provider.ok)return json({error:'Video provider could not open this session'},502);
  const session=await provider.json();const url=new URL(session.url);
  const allowed=(Deno.env.get('CCTV_MEDIA_HOSTS')||'').split(',').map(s=>s.trim()).filter(Boolean);
  const expires=Date.parse(session.expiresAt);
  if(url.protocol!=='https:'||url.username||url.password||!allowed.includes(url.hostname)||!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+15*60000||!['video/mp4','application/vnd.apple.mpegurl'].includes(session.mimeType))return json({error:'Provider returned an invalid or unsupported video session'},502);
  const audit=await service.from('cctv_access_events').insert({tenant_id:camera.tenant_id,camera_id:camera.id,user_id:auth.userId,mode:body.mode,reason,starts_at:start,ends_at:end});
  if(audit.error)return json({error:'Viewing audit could not be recorded; session not released'},503);
  return json({url:url.href,mimeType:session.mimeType,expiresAt:session.expiresAt});
 }catch{return json({error:'Video service unavailable. Please retry.'},503);}
});
