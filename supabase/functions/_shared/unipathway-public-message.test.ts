import {parsePublicMessage,publicMessageEmails} from './unipathway-public-message.ts';
const base={tenant_slug:'unipathway',privacy_acknowledged:true,request_id:'12345678-1234-4234-8234-123456789abc',channel:'admissions',captcha_token:'synthetic-turnstile-token-not-live',name:'Example Learner',email:'student@example.invalid',phone:'',subject:'Admissions Enquiry',message:'Please tell me about the course.'};
function assert(value:unknown,message:string){if(!value)throw Error(message);}
Deno.test('public admissions email uses personal contact and fixed admissions mailbox',()=>{
 const message=parsePublicMessage(base);
 assert(message,'Valid personal email rejected');
 const emails=publicMessageEmails(message!);
 assert(emails.team.to[0]==='admissions@unipathway.pk','Wrong recipient');
 assert(emails.receipt.to[0]===base.email&&emails.receipt.from.includes('@unipathway.pk'),'Wrong confirmation');
 assert(!emails.receipt.html.includes(base.message),'Receipt reflected user message');
});
Deno.test('recruitment has separate mailbox, role and delivery mode',()=>{
 const message=parsePublicMessage({...base,channel:'recruitment',role:'Lecturer',mode:'Hybrid',subjects:'Accounting',qualifications:'Example qualification',availability:'Monday afternoon',message:'I teach <script>alert(1)</script>.'});
 assert(message,'Valid recruitment details rejected');
 const mail=publicMessageEmails(message!);
 assert(mail.team.to[0]==='jobs@unipathway.pk','Wrong recruitment mailbox');
 assert(mail.team.html.includes('&lt;script&gt;')&&!mail.team.html.includes('<script>'),'Unescaped user HTML');
 assert(!mail.receipt.html.includes('alert(1)'),'Receipt reflected user text');
});
Deno.test('rejects arbitrary destinations, malformed recipients, missing challenge and unknown roles',()=>{
 for(const candidate of [{...base,recipient:'attacker@example.invalid'},{...base,email:'one@example.invalid,two@example.invalid'},{...base,email:'Name <user@example.invalid>'},{...base,channel:['admissions']},{...base,privacy_acknowledged:false},{...base,captcha_token:'fake'},{...base,channel:'recruitment',role:'Administrator',mode:'Hybrid'}]){
  assert(parsePublicMessage(candidate)===null,'Unexpected request accepted');
 }
});
