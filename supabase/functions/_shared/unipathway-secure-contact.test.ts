import {validateSecureContact} from './unipathway-secure-contact.ts';

const valid={
 tenant_slug:'unipathway',privacy_acknowledged:true,
 name:'Example Learner',email:'STUDENT@EXAMPLE.INVALID',phone:'+923001234567',
 subject:'Course Enquiry',message:'Please tell me about available Level 4 study.',
 captcha_token:'synthetic-turnstile-token-not-live',
};
Deno.test('secure contact parser accepts a restricted UniPathway enquiry only',()=>{
 const parsed=validateSecureContact(valid);
 if(!parsed||parsed.email!=='student@example.invalid'||parsed.subject!=='Course Enquiry'){
  throw new Error('Valid synthetic contact data was not normalised');
 }
});
Deno.test('invalid, cross-tenant, consentless, malformed and forged requests fail closed',()=>{
 const bad=[
  null,[],{}, {...valid,tenant_slug:'other-centre'},
  {...valid,privacy_acknowledged:false},
  {...valid,privacy_acknowledged:'true'},
  {...valid,captcha_token:'fake'},
  {...valid,name:'A'},
  {...valid,email:'not-an-email'},
  {...valid,subject:'Custom subject with invalid content'},
  {...valid,message:'hi'},
  {...valid,phone:'+1'},
  {...valid,phone:12345},
  {...valid,message:'x'.repeat(5100)},
 ];
 for(const value of bad)if(validateSecureContact(value)!==null)throw new Error('Invalid contact request was accepted');
});
