import {createClient} from '@supabase/supabase-js';
import {ImapFlow} from 'imapflow';
import nodemailer from 'nodemailer';
import {simpleParser} from 'mailparser';
import {importMailDocuments} from './lib/comms-documents.mjs';
import {hostedMailConfig,imapEnvelope,smtpMessage} from './lib/comms-imap.mjs';
const env=process.env;
if(env.UNIPATHWAY_COMMS_ENABLED!=='true')throw Error('Communications connector disabled');
if(!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(env.UNIPATHWAY_TENANT_ID||''))throw Error('Centre UUID required');
const endpoint=new URL(env.SUPABASE_URL);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.pathname!=='/')throw Error('Invalid database origin');
if(!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Server database credential required');
const configs=JSON.parse(env.UNIPATHWAY_IMAP_ACCOUNTS_JSON||'{}');
const db=createClient(endpoint.origin,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const check=r=>{if(r.error)throw Error('comms_database_failure');return r.data;};
const rpc=async(name,args)=>check(await db.rpc(name,args));
await rpc('remind_uni_mail_tasks',{p_tenant:env.UNIPATHWAY_TENANT_ID});
const boxes=check(await db.from('uni_mailboxes').select('*').eq('tenant_id',env.UNIPATHWAY_TENANT_ID).eq('provider','imap').eq('enabled',true));
let failure=false;
for(const box of boxes){
 let client;
 try{
  const config=hostedMailConfig(configs[box.id],box.address);client=new ImapFlow(config.imap);client.on('error',()=>{});await client.connect();
  const cursors=check(await db.from('uni_mail_cursors').select('*').eq('mailbox_id',box.id));
  const folders=(await client.list()).filter(f=>!f.flags.has('\\Noselect')).sort((a,b)=>Date.parse(cursors.find(c=>c.folder===a.path)?.last_synced_at||'1970-01-01')-Date.parse(cursors.find(c=>c.folder===b.path)?.last_synced_at||'1970-01-01')).slice(0,50);
  for(const folder of folders){
   const lock=await client.getMailboxLock(folder.path);
   try{
    const validity=String(client.mailbox.uidValidity);let saved;
    try{saved=JSON.parse(cursors.find(c=>c.folder===folder.path)?.cursor_url||'{}');}catch{saved={};}
    const first=saved.validity===validity&&Number.isSafeInteger(saved.next)?saved.next:1;
    const last=Math.min(first+99,Number(client.mailbox.uidNext)-1);
    if(last>=first){
     const rows=await client.fetchAll(`${first}:${last}`,{uid:true,size:true,flags:true},{uid:true});
     for(const row of rows){
      if(row.uid<first||row.uid>last||row.flags.has('\\Draft'))continue;
      if(row.size>25*1024*1024)throw Error('message_exceeds_import_limit_review_required');
      const full=await client.fetchOne(row.uid,{source:true},{uid:true});if(!full?.source)continue;
      const parsed=await simpleParser(full.source,{skipHtmlToText:false,skipTextToHtml:true,skipImageLinks:true});
      const messageId=await rpc('ingest_uni_mail',imapEnvelope(parsed,box,`imap:${folder.path}:${validity}:${row.uid}`));
      await importMailDocuments(db,messageId,parsed.attachments||[]);
     }
    }
    check(await db.from('uni_mail_cursors').upsert({mailbox_id:box.id,folder:folder.path,cursor_url:JSON.stringify({validity,next:Math.max(first,last+1)}),last_synced_at:new Date().toISOString()}));
   }finally{lock.release();}
  }
 }catch{failure=true;console.error('Hosted mailbox sync failed; review server configuration, message limits and connectivity.');}
 finally{if(client)await client.logout().catch(()=>client.close());}
}
if(env.UNIPATHWAY_COMMS_SEND_ENABLED==='true'){
 const job=await rpc('claim_uni_mail_send',{p_tenant:env.UNIPATHWAY_TENANT_ID,p_provider:'imap'});
 if(job){let transport;try{
  const config=hostedMailConfig(configs[job.mailbox.id],job.mailbox.address);transport=nodemailer.createTransport(config.smtp);
  const receipt=await transport.sendMail(smtpMessage(job));
  const accepted=receipt.accepted?.length===job.message.to_addresses.length&&!receipt.rejected?.length;
  await rpc('finish_uni_mail_send',{p_message:job.message.id,p_accepted:!!accepted});
  if(!accepted){failure=true;console.error('Partial or unconfirmed SMTP acceptance requires review; do not automatically resend.');}
 }catch{failure=true;await rpc('finish_uni_mail_send',{p_message:job.message.id,p_accepted:false});console.error('SMTP delivery uncertain; manual review required.');}finally{transport?.close();}}
}
if(failure)process.exitCode=1;else console.log('Hosted mail sync completed. SMTP acceptance does not confirm recipient delivery.');
