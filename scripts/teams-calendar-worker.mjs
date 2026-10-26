// Server-only worker: one leased class calendar operation per invocation. Graph sends invitations.
import {createClient} from '@supabase/supabase-js';
import {validateWorkerConfig} from './lib/worker-config.mjs';
import {calendarConfig,syncTeamsCalendar} from './lib/teams-calendar.mjs';
validateWorkerConfig('recordings',process.env);
const env=process.env,config=calendarConfig(env);
const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const rpc=async(name,args)=>{const r=await db.rpc(name,args);if(r.error)throw Error('database_operation_failed');return r.data;};
const signal=AbortSignal.timeout(300000);
let token;
async function graph(path,method='GET',body,allow404=false){
 if(!path.startsWith('/')||path.startsWith('//'))throw Error('invalid_graph_path');
 if(!token){
  const r=await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',redirect:'error',signal,body:new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})});
  if(!r.ok)throw Error(`microsoft_auth_${r.status}`);token=(await r.json()).access_token;if(!token)throw Error('microsoft_auth_missing_token');
 }
 const r=await fetch('https://graph.microsoft.com/v1.0'+path,{method,redirect:'error',signal,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'IdType="ImmutableId"'},body:body?JSON.stringify(body):undefined});
 if(r.status===404&&allow404)return null;
 if(!r.ok)throw Error(`graph_${r.status}`);
 return r.status===204||r.status===202?null:r.json();
}
const claimed=await rpc('claim_uni_calendar_job',{p_tenant:config.tenant});
if(!claimed)console.log('No eligible Teams calendar job queued.');
else{
 try{
  const result=await syncTeamsCalendar(graph,config,claimed);
  await rpc('finish_uni_calendar_job',{p_session:claimed.session.id,p_lease:claimed.job.lease,p_event:result.eventId,p_join:result.joinUrl});
  console.log('Teams calendar operation confirmed by Microsoft.');
 }catch(e){
  const code=/^[a-z0-9_]{1,80}$/.test(e.message||'')?e.message:'provider_receipt_unknown';
  await rpc('finish_uni_calendar_job',{p_session:claimed.session.id,p_lease:claimed.job.lease,p_error:code});
  console.error('Teams calendar operation requires review:',code);process.exitCode=1;
 }
}
