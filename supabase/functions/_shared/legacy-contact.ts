/** Compatibility handler for public tenant contact forms. Service-role writes must
 * resolve an active centre server-side; callers never choose a database tenant ID.
 */
export const MAX_CONTACT_BYTES=32768;
export type LegacyContact={tenantSlug:string;name:string;email:string;phone:string|null;subject:string;message:string};
export type ContactLead={tenant_id:string;student_name:string;email:string;phone:string|null;source:'contact_form';notes:string;stage:'lead'};
type PublicResult={status:number;body:{success:true;id:string}|{error:string}};
type ContactStore={resolveActiveTenant:(slug:string)=>Promise<string|null>;insertLead:(lead:ContactLead)=>Promise<string|null>};
const field=(value:unknown,max:number):string|null=>typeof value==='string'&&value.length<=max?value.trim():null;
const singleLine=(value:string)=>!/[\r\n]/.test(value);
const cleanText=(value:string)=>Array.from(value).every(c=>{const n=c.charCodeAt(0);return n===9||n===10||n===13||(n>=32&&n!==127);});
export function validateLegacyContact(input:unknown):LegacyContact|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const v=input as Record<string,unknown>;
 const tenantSlug=field(v.tenant_slug,100),name=field(v.name,200),email=field(v.email,254);
 const phone=field(v.phone??'',35),subject=field(v.subject??'',200),message=field(v.message,5000);
 if(!tenantSlug||!(/^[a-z0-9][a-z0-9_-]*$/.test(tenantSlug))||!name||!singleLine(name)||!cleanText(name)||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!cleanText(email)||phone===null||!singleLine(phone)||!cleanText(phone)||subject===null||!singleLine(subject)||!cleanText(subject)||!message||!cleanText(message))return null;
 return {tenantSlug,name,email:email.toLowerCase(),phone:phone||null,subject:subject||'General Enquiry',message};
}
export async function processLegacyContact(input:unknown,store:ContactStore,requireSecureUniPathway=false):Promise<PublicResult>{
 const data=validateLegacyContact(input);
 if(!data)return {status:400,body:{error:'Check your contact details and enquiry message.'}};
 if(requireSecureUniPathway&&data.tenantSlug==='unipathway')return {status:403,body:{error:'Please use the secure UniPathway enquiry form.'}};
 try{
  const tenant=await store.resolveActiveTenant(data.tenantSlug);
  if(!tenant)return {status:503,body:{error:'Admissions are temporarily unavailable.'}};
  const id=await store.insertLead({tenant_id:tenant,student_name:data.name,email:data.email,phone:data.phone?.slice(0,20)??null,source:'contact_form',notes:'Subject: '+data.subject+'\n\n'+data.message,stage:'lead'});
  if(!id)return {status:503,body:{error:'Your enquiry could not be confirmed. Please try again later.'}};
  return {status:200,body:{success:true,id}};
 }catch{
  // Never return database error text, schema names, personal data or secret configuration.
  return {status:503,body:{error:'Enquiries are temporarily unavailable.'}};
 }
}
export async function readBoundedContactBody(req:Request):Promise<{ok:true;value:unknown}|{ok:false;status:number}>{
 const length=Number(req.headers.get('content-length')||0);
 if(length>MAX_CONTACT_BYTES)return {ok:false,status:413};
 const reader=req.body?.getReader();
 if(!reader)return {ok:false,status:400};
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let bytes=0,text='';
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>MAX_CONTACT_BYTES){await reader.cancel().catch(()=>{});return {ok:false,status:413};}
   text+=decoder.decode(value,{stream:true});
  }
  text+=decoder.decode();
  return {ok:true,value:JSON.parse(text)};
 }catch{return {ok:false,status:400};}
 finally{reader.releaseLock();}
}
