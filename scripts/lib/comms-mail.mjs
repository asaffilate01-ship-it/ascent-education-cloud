export function mailboxMessageUrl(value,objectId,folder){
 const url=new URL(value);
 const path=`/v1.0/users/${encodeURIComponent(objectId)}/mailFolders/${encodeURIComponent(folder)}/messages/delta`;
 if(url.origin!=='https://graph.microsoft.com'||url.username||url.password||url.pathname!==path||url.hash)throw Error('invalid_graph_cursor');return url.href;
}
export function graphMailPayload(claimed){
 const {message:m,mailbox:b,subject}=claimed;
 if(!/^[a-z0-9._+-]+@unipathway\.pk$/.test(b.address)||m.from_address!==b.address)throw Error('institutional_sender_required');
 return {message:{subject,body:{contentType:'Text',content:m.body_text},from:{emailAddress:{address:b.address}},replyTo:[{emailAddress:{address:b.address}}],toRecipients:m.to_addresses.map(address=>({emailAddress:{address}})),internetMessageHeaders:[{name:'x-unipathway-message-id',value:m.id}]},saveToSentItems:true};
}
export function mailEnvelope(mail,box,folder){
 if(!mail.id||!mail.conversationId||mail.isDraft)return null;
 return {p_box:box.id,p_provider:mail.id,p_conversation:mail.conversationId,p_subject:mail.subject||'(No subject)',p_from:mail.from?.emailAddress?.address||'(unknown)',p_to:(mail.toRecipients||[]).map(x=>x.emailAddress.address),p_cc:(mail.ccRecipients||[]).map(x=>x.emailAddress.address),p_body:mail.body?.content||'',p_direction:mail.from?.emailAddress?.address?.toLowerCase()===box.address?'outbound':'inbound',p_at:mail.receivedDateTime||mail.sentDateTime||null,p_has_documents:!!mail.hasAttachments};
}

export async function listMailFolders(graph,objectId){
 const root=`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(objectId)}/mailFolders`;
 const pending=[root+'?$top=100'],folders=[],seen=new Set();
 while(pending.length){
  if(seen.size>=1000)throw Error('mail_folder_limit_review_required');
  const next=pending.shift(),url=new URL(next);
  if(url.origin!=='https://graph.microsoft.com'||url.username||url.password||url.hash||!(url.pathname===new URL(root).pathname||url.pathname.startsWith(new URL(root).pathname+'/')&&url.pathname.endsWith('/childFolders')))throw Error('invalid_folder_pagination');
  if(seen.has(url.href))throw Error('repeated_folder_page');seen.add(url.href);
  const page=await graph(url.href);if(!Array.isArray(page.value))throw Error('invalid_folder_list');
  for(const folder of page.value){if(typeof folder.id!=='string')throw Error('invalid_folder_id');if(!folders.some(f=>f.id===folder.id))folders.push(folder);if(folder.childFolderCount>0)pending.push(root+'/'+encodeURIComponent(folder.id)+'/childFolders?$top=100');}
  if(page['@odata.nextLink'])pending.push(page['@odata.nextLink']);
 }
 return folders;
}
