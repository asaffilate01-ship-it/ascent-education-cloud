/** Manual, read-only database acceptance of a provisioned isolated demo.
 * Auth creates/revokes a local session; no application rows are changed.
 * Never print credentials, session tokens, provider responses or personal records.
 */
import {createClient} from '@supabase/supabase-js';
import {verifiedDemoConfig,verifyDemoMemberships,DEMO_EMAIL} from './lib/unipathway-demo-guard.mjs';

async function main(){
 const config=verifiedDemoConfig(process.env);
 const response=await fetch(config.origin+'/login?demo=1',{redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html')||
  !/\bnoindex\b/i.test(response.headers.get('x-robots-tag')||''))throw Error('Demo hosting must serve the login page with a server-side noindex header');
 await response.body?.cancel();
 const client=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data,error}=await client.auth.signInWithPassword({email:DEMO_EMAIL,password:config.password});
  if(error||!data.session||data.user?.id!==config.userId)throw Error('Approved demo login was not verified');
  const authenticated=await client.auth.getUser();
  if(authenticated.error||!authenticated.data.user)throw Error('Demo identity could not be verified');
  const [profile,memberships,centre]=await Promise.all([
   client.from('profiles').select('user_id,tenant_id,email').eq('user_id',config.userId).single(),
   client.from('user_roles').select('user_id,role,tenant_id').eq('user_id',config.userId),
   client.from('tenants').select('id,slug').eq('id',config.tenantId).single(),
  ]);
  if(profile.error||memberships.error||centre.error)throw Error('Demo profile, centre or role records could not be read');
  const result=verifyDemoMemberships({user:authenticated.data.user,profile:profile.data,memberships:memberships.data,centre:centre.data},config);
  console.log(JSON.stringify({status:'verified',...result,hostingNoindex:true,applicationWrites:0}));
  console.log('Scope: authentication, role records and hosting header only. Dashboard operations, MFA, synthetic data content and external providers require separate acceptance.');
 }finally{
  await client.auth.signOut({scope:'local'}).catch(()=>{});
 }
}
main().catch(error=>{
 // Only locally authored, allowlisted errors may be printed. Unexpected
 // transport/provider errors can contain credentials or endpoint details.
 const message=error instanceof Error?error.message:'';
 const allowed=/^(Missing protected demo configuration: [A-Z_]+|Explicit isolated demo acknowledgement required|Demo acceptance requires a dedicated demo environment|Staging and production Supabase refs must be validated 20-character refs|Refusing production or ambiguous Supabase repository project|A verified staging API URL is required|Staging API hostname must match its independently verified Supabase ref|Unexpected demo API port|Demo must use its approved separate origin|Only a demo publishable or matching anonymous key is accepted|Verified synthetic account and centre identifiers required|Demo hosting must serve the login page with a server-side noindex header|Approved demo login was not verified|Demo identity could not be verified|Demo profile, centre or role records could not be read|Demonstration identity was not verified as the approved synthetic fixture|Demonstration profile is not assigned to the approved synthetic centre|Demonstration centre reference does not match the approved fixture|Expected exactly 21 verified demo role records|Unexpected, duplicate or foreign demo role membership|A required demonstration role is missing)$/;
 console.error('Demo acceptance blocked: '+(allowed.test(message)?message:'configuration or connection could not be verified'));
 process.exitCode=1;
});
