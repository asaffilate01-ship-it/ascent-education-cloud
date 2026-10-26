import {createHash} from 'node:crypto';
const allowed=new Set(['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
export async function importMailDocuments(db,messageId,attachments){
 const result=await db.from('uni_mail_messages').select('thread_id').eq('id',messageId).single();if(result.error)throw Error('attachment_message_unavailable');
 const thread=result.data.thread_id;
 for(const file of attachments.slice(0,50)){
  if(!allowed.has(file.contentType)||!file.content?.length||file.content.length>10485760)continue;
  const digest=createHash('sha256').update(file.content).digest('hex');
  const path=`${thread}/provider/${messageId}/${digest}`;
  const existing=await db.from('uni_mail_documents').select('id').eq('object_path',path).maybeSingle();if(existing.error)throw Error('document_lookup_failed');if(existing.data)continue;
  const upload=await db.storage.from('unipathway-comms').upload(path,file.content,{contentType:file.contentType,upsert:true});if(upload.error)throw Error('document_upload_failed');
  const record=await db.from('uni_mail_documents').upsert({thread_id:thread,name:String(file.filename||'Email document').slice(0,200),object_path:path},{onConflict:'object_path',ignoreDuplicates:true}).select('id');if(record.error)throw Error('document_register_failed');

 }
}
