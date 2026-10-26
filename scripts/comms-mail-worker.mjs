// Server-only Microsoft 365 connector. Does not send anything unless explicitly enabled.
import {createClient} from '@supabase/supabase-js';
import {validateWorkerConfig} from './lib/worker-config.mjs';
import {importMailDocuments} from './lib/comms-documents.mjs';
import {mailboxMessageUrl,graphMailPayload,mailEnvelope,listMailFolders} from './lib/comms-mail.mjs';
validateWorkerConfig('recordings',process.env);
const env=process.env;if(env.UNIPATHWAY_COMMS_ENABLED!=='true')throw Error('Communications connector is not enabled');
const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const check=r=>{if(r.error)throw Error('comms_database_failure');return r.data;};
const rpc=async(name,args)=>check(await db.rpc(name,args));
const auth=await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),body:new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})});
if(!auth.ok)throw Error('microsoft_auth_failed');const token=(await auth.json()).access_token;if(!token)throw Error('missing_graph_token');
async function graph(url,method='GET',body){
 const u=new URL(url);if(u.origin!=='https://graph.microsoft.com'||u.username||u.password)throw Error('invalid_graph_url');
 const r=await fetch(u,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'outlook.body-content-type="text", IdType="ImmutableId"'},body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw Error(`graph_${r.status}`);return method==='POST'?r:await r.json();
}
await rpc('remind_uni_mail_tasks',{p_tenant:env.UNIPATHWAY_TENANT_ID});
const boxes=check(await db.from('uni_mailboxes').select('*').eq('tenant_id',env.UNIPATHWAY_TENANT_ID).eq('enabled',true).eq('provider','graph'));
for(const box of boxes){
 const root=`https://graph.microsoft.com/v1.0/users/${box.graph_user_id}`;
 const identity=await graph(root+'?$select=id,mail,userPrincipalName');
 if(identity.id!==box.graph_user_id||![identity.mail,identity.userPrincipalName].some(x=>x?.toLowerCase()===box.address))throw Error('mailbox_identity_mismatch');
 const folders=await listMailFolders(graph,box.graph_user_id);
 const stored=check(await db.from('uni_mail_cursors').select('folder,last_synced_at').eq('mailbox_id',box.id));
 const time=id=>Date.parse(stored.find(c=>c.folder===id)?.last_synced_at||'1970-01-01');
 for(const {id:folder} of folders.sort((a,b)=>time(a.id)-time(b.id)).slice(0,50)){
  const cursor=check(await db.from('uni_mail_cursors').select('cursor_url').eq('mailbox_id',box.id).eq('folder',folder).maybeSingle());
  let next=cursor?.cursor_url||`${root}/mailFolders/${encodeURIComponent(folder)}/messages/delta?$select=id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime,sentDateTime,isDraft,hasAttachments&$top=50`;
  // Bounded runs retain pagination so history backfills over subsequent invocations.
  for(let page=0;page<10;page++){
   const data=await graph(mailboxMessageUrl(next,box.graph_user_id,folder));
   if(!Array.isArray(data.value))throw Error('invalid_graph_messages');
   for(const mail of data.value){if(mail['@removed'])continue;const envelope=mailEnvelope(mail,box,folder);if(envelope){const messageId=await rpc('ingest_uni_mail',envelope);if(mail.hasAttachments){const files=await graph(`${root}/messages/${encodeURIComponent(mail.id)}/attachments?$top=50`);await importMailDocuments(db,messageId,(files.value||[]).filter(f=>f['@odata.type']==='#microsoft.graph.fileAttachment'&&f.size<=10485760).map(f=>({filename:f.name,contentType:f.contentType,content:Buffer.from(f.contentBytes||'','base64')})));}}}
   const advance=data['@odata.nextLink']||data['@odata.deltaLink'];if(!advance)throw Error('missing_graph_cursor');
   mailboxMessageUrl(advance,box.graph_user_id,folder);
   check(await db.from('uni_mail_cursors').upsert({mailbox_id:box.id,folder,cursor_url:advance,last_synced_at:new Date().toISOString()}));next=advance;
   if(!data['@odata.nextLink'])break;
  }
 }
}
if(env.UNIPATHWAY_COMMS_SEND_ENABLED==='true'){
 const job=await rpc('claim_uni_mail_send',{p_tenant:env.UNIPATHWAY_TENANT_ID});
 if(job){
  try{
   const identity=await graph(`https://graph.microsoft.com/v1.0/users/${job.mailbox.graph_user_id}?$select=id,mail,userPrincipalName`);
   if(![identity.mail,identity.userPrincipalName].some(x=>x?.toLowerCase()===job.mailbox.address))throw Error('mailbox_identity_mismatch');
   const payload=graphMailPayload(job);
   const response=job.reply_provider?await graph(`https://graph.microsoft.com/v1.0/users/${job.mailbox.graph_user_id}/messages/${encodeURIComponent(job.reply_provider)}/reply`,'POST',{message:{body:payload.message.body,toRecipients:payload.message.toRecipients}}):await graph(`https://graph.microsoft.com/v1.0/users/${job.mailbox.graph_user_id}/sendMail`,'POST',payload);
   if(response.status!==202)throw Error('unexpected_send_response');
   await rpc('finish_uni_mail_send',{p_message:job.message.id,p_accepted:true});
  }catch{await rpc('finish_uni_mail_send',{p_message:job.message.id,p_accepted:false});throw Error('delivery_unknown_manual_review_required');}
 }
}
console.log('Mailbox synchronisation completed. Provider acceptance does not confirm delivery.');
