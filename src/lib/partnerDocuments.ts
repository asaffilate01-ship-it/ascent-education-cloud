import type {SupabaseClient} from '@supabase/supabase-js';
export const MAX_AGREEMENT_BYTES=10*1024*1024;
export async function validateAgreementFile(file:File) {
 if(file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf'))throw new Error('Choose a PDF agreement.');
 if(file.size===0||file.size>MAX_AGREEMENT_BYTES)throw new Error('The PDF must be between 1 byte and 10 MB.');
 if(await file.slice(0,5).text()!=='%PDF-')throw new Error('The selected file does not have a PDF header.');
}
export async function uploadAgreement(db:SupabaseClient,tenant:string,partner:string,file:File) {
 await validateAgreementFile(file);
 const path=`${tenant}/${partner}/${crypto.randomUUID()}.pdf`;
 const uploaded=await db.storage.from('partner-agreements').upload(path,file,{contentType:'application/pdf',upsert:false});
 if(uploaded.error)throw new Error('Agreement upload failed. Check your access and try again.');
 const registered=await db.rpc('register_partner_document',{p_partner:partner,p_path:path,p_name:file.name});
 if(registered.error||!registered.data)throw new Error('The PDF uploaded, but registration failed. Ask an administrator to reconcile the private upload before retrying.');
 return {id:registered.data as string,reference:`partner-agreements/${path}`};
}
