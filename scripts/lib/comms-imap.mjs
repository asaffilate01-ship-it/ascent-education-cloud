export function hostedMailConfig(config,address){
 if(!config||config.address!==address||!address.endsWith('@unipathway.pk'))throw Error('hosted_mailbox_configuration_missing');
 for(const field of ['imapHost','smtpHost'])if(typeof config[field]!=='string'||!/^[a-z0-9.-]+$/i.test(config[field])||!config[field].includes('.'))throw Error('invalid_mail_host');
 if(!config.user||!config.password||![465,587].includes(config.smtpPort||465))throw Error('invalid_mail_credentials_or_port');
 return {imap:{host:config.imapHost,port:993,secure:true,auth:{user:config.user,pass:config.password},tls:{rejectUnauthorized:true},logger:false,socketTimeout:60000},smtp:{host:config.smtpHost,port:config.smtpPort||465,secure:(config.smtpPort||465)===465,requireTLS:true,auth:{user:config.smtpUser||config.user,pass:config.smtpPassword||config.password},tls:{rejectUnauthorized:true},logger:false,debug:false,connectionTimeout:20000,socketTimeout:60000,disableFileAccess:true,disableUrlAccess:true}};
}
const addresses=value=>(Array.isArray(value)?value:[value]).flatMap(v=>v?.value||[]).map(x=>x.address).filter(Boolean);
export function imapEnvelope(parsed,box,fallback){
 const provider=parsed.messageId||fallback;
 const references=Array.isArray(parsed.references)?parsed.references:parsed.references?[parsed.references]:[];
 return {p_box:box.id,p_provider:provider.slice(0,2000),p_conversation:(references[0]||parsed.inReplyTo||provider).slice(0,2000),p_subject:parsed.subject||'(No subject)',p_from:addresses(parsed.from)[0]||'(unknown)',p_to:addresses(parsed.to),p_cc:addresses(parsed.cc),p_body:(parsed.text||'[No plain-text body available; open the original message in webmail.]').slice(0,100000),p_direction:addresses(parsed.from)[0]?.toLowerCase()===box.address?'outbound':'inbound',p_at:parsed.date instanceof Date&&!Number.isNaN(parsed.date.getTime())?parsed.date.toISOString():null,p_has_documents:!!parsed.attachments?.length};
}
export function smtpMessage(job){
 if(!/^[a-z0-9._+-]+@unipathway\.pk$/.test(job.mailbox.address)||job.message.from_address!==job.mailbox.address)throw Error('institutional_sender_required');
 const references=job.references?.startsWith('<')?job.references:undefined;
 return {from:job.mailbox.address,replyTo:job.mailbox.address,to:job.message.to_addresses.map(address=>({address})),subject:job.subject,text:job.message.body_text,messageId:`<${job.message.id}@unipathway.pk>`,references,inReplyTo:references,disableFileAccess:true,disableUrlAccess:true};
}
