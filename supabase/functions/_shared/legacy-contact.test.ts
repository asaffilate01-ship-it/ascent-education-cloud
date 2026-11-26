import {MAX_CONTACT_BYTES,validateLegacyContact,processLegacyContact,readBoundedContactBody,type ContactLead} from './legacy-contact.ts';

const valid={tenant_slug:'unipathway',name:' Example Learner ',email:'USER@EXAMPLE.INVALID',phone:'+92 123 4567890',subject:'',message:'I would like course information.'};
const check=(value:boolean,message:string)=>{if(!value)throw Error(message);};
Deno.test('legacy contact accepts only bounded typed fields and explicit tenant slugs',()=>{
 const result=validateLegacyContact(valid);
 check(result?.email==='user@example.invalid'&&result.name==='Example Learner'&&result.subject==='General Enquiry','Normalisation failed');
 for(const value of [null,[],{...valid,tenant_slug:undefined},{...valid,tenant_slug:'../other'},{...valid,email:42},{...valid,phone:{}},{...valid,subject:'Admissions\nInjected header'},{...valid,message:'x'.repeat(5001)},{...valid,name:' '}]){
  check(validateLegacyContact(value)===null,'Invalid contact data was accepted');
 }
});
Deno.test('unknown or unavailable centres cannot create orphan leads',async()=>{
 let writes=0;
 const result=await processLegacyContact(valid,{resolveActiveTenant:async()=>null,insertLead:async()=>{writes++;return 'unexpected';}});
 check(result.status===503&&writes===0,'Unresolved tenant was allowed to insert');
});
Deno.test('resolved tenant exclusively controls the destination of a lead',async()=>{
 const writes:ContactLead[]=[];
 const result=await processLegacyContact({...valid,tenant_id:'forged',stage:'enrolled'},{resolveActiveTenant:async slug=>slug==='unipathway'?'resolved-centre':null,insertLead:async lead=>{writes.push(lead);return 'new-lead';}});
 check(result.status===200&&writes.length===1&&writes[0].tenant_id==='resolved-centre'&&writes[0].stage==='lead','Unsafe lead assignment');
});
Deno.test('secure-only enforcement blocks direct legacy requests and database failures do not leak details',async()=>{
 let lookups=0;
 const store={resolveActiveTenant:async()=>{lookups++;return 'centre';},insertLead:async()=>{throw Error('private_schema secret details');}};
 const blocked=await processLegacyContact(valid,store,true);
 check(blocked.status===403&&lookups===0,'Legacy endpoint bypassed secure-only mode');
 const failed=await processLegacyContact(valid,store);
 check(failed.status===503&&!JSON.stringify(failed.body).includes('private_schema'),'Unsafe error disclosure');
});
Deno.test('bounded body reader rejects oversized streamed input and malformed JSON',async()=>{
 const request=(body:string)=>new Request('https://example.invalid/contact',{method:'POST',body});
 const oversized=await readBoundedContactBody(request('x'.repeat(MAX_CONTACT_BYTES+1)));
 check(!oversized.ok&&oversized.status===413,'Oversized body was accepted');
 const malformed=await readBoundedContactBody(request('{'));
 check(!malformed.ok&&malformed.status===400,'Malformed body was accepted');
 const parsed=await readBoundedContactBody(request(JSON.stringify(valid)));
 check(parsed.ok&&validateLegacyContact(parsed.value)!==null,'Valid request rejected');
});
