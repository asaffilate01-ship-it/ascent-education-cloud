import {acceptedTurnstileOutcome} from './unipathway-turnstile.ts';

function assert(value:boolean,expected:boolean,label:string){
 if(value!==expected)throw new Error(label+' — expected '+expected+' got '+value);
}
Deno.test('UniPathway rejects missing or forged challenge responses',()=>{
 assert(acceptedTurnstileOutcome(null,['staging.example.org']),false,'null');
 assert(acceptedTurnstileOutcome({success:'true',hostname:'staging.example.org',action:'unipathway-enquiry'},['staging.example.org']),false,'string success');
 assert(acceptedTurnstileOutcome({success:true,hostname:'staging.example.org',action:'unipathway-enquiry'},[]),false,'empty allowlist');
});
Deno.test('UniPathway accepts only the exact, approved siteverify host and action',()=>{
 const approved=['staging.example.org'];
 const valid={success:true,hostname:'staging.example.org',action:'unipathway-enquiry'};
 assert(acceptedTurnstileOutcome(valid,approved),true,'real matching evidence');
 assert(acceptedTurnstileOutcome({...valid,action:'login'},approved),false,'wrong widget action');
 assert(acceptedTurnstileOutcome({...valid,hostname:'attacker.example.org'},approved),false,'attacker host');
 assert(acceptedTurnstileOutcome({...valid,hostname:'staging.example.org.attacker.com'},approved),false,'domain suffix spoof');
 assert(acceptedTurnstileOutcome({...valid,success:false},approved),false,'provider rejected token');
});
Deno.test('normalises exact host casing but does not accept substring matches',()=>{
 assert(acceptedTurnstileOutcome({success:true,hostname:'Staging.Example.Org',action:'unipathway-enquiry'},['staging.example.org']),true,'case normalisation');
 assert(acceptedTurnstileOutcome({success:true,hostname:'notstaging.example.org',action:'unipathway-enquiry'},['staging.example.org']),false,'near-hostname spoof');
});
