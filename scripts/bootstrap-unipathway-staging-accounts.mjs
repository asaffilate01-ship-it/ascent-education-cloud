/** Explicit, staging-only UniPathway test-account provisioning.
 * Usage without credentials: node scripts/bootstrap-unipathway-staging-accounts.mjs --plan
 *
 * To write: protected environment must provide the independently verified
 * staging ref/URL, production ref, service role key, two EXISTING tenant IDs,
 * unique passwords for all test accounts, and two distinct acknowledgements.
 * No production, shared password, account takeover or password reset path.
 */
import {createClient} from '@supabase/supabase-js';
import {
 STAGING_WRITE_ACK,STAGING_ACK,verifiedStagingConfig,validatedStagingTenantIds
} from './lib/unipathway-staging-guard.mjs';

export const ROLE_FIXTURES=Object.freeze([
 {key:'superadmin',role:'superadmin',email:'dev.superadmin@educloud.test'},
 {key:'director',role:'centre_director',email:'dev.director@educloud.test'},
 {key:'admissions',role:'admissions_admin',email:'dev.admissions@educloud.test'},
 {key:'lecturer',role:'lecturer',email:'dev.lecturer@educloud.test'},
 {key:'programme',role:'programme_leader',email:'dev.programme@educloud.test'},
 {key:'qa',role:'iqa_officer',email:'dev.qa@educloud.test'},
 {key:'exams',role:'exams_officer',email:'dev.exams@educloud.test'},
 {key:'finance',role:'finance_officer',email:'dev.finance@educloud.test'},
 {key:'marketing',role:'marketing_officer',email:'dev.marketing@educloud.test'},
 {key:'agent',role:'agent',email:'dev.agent@educloud.test'},
 {key:'student',role:'student',email:'dev.student@educloud.test'},
 {key:'unipartner',role:'university_partner',email:'dev.unipartner@educloud.test'},
 {key:'employer',role:'employer_partner',email:'dev.employer@educloud.test'},
 {key:'assessor',role:'assessor',email:'dev.asses@educloud.test'},
 {key:'eqa',role:'awarding_body_eqa',email:'dev.eqa@educloud.test'},
 {key:'welfare',role:'welfare_officer',email:'dev.welf@educloud.test'},
 {key:'parent',role:'parent_guardian',email:'dev.parent@educloud.test'},
 {key:'studentB',role:'student',email:'dev.studentb@educloud.test',tenantKey:'b'},
 {key:'uninvitedStudentA',role:'student',email:'dev.uninvited@educloud.test',tenantKey:'a'},
]);
const TAG='unipathway-staging-fixture-v1';
function getCredentials(env){
 let values;
 try{values=JSON.parse(String(env.STAGING_ROLE_CREDENTIALS_JSON||''));}
 catch{throw Error('Protected STAGING_ROLE_CREDENTIALS_JSON must be provided for 19 test identities');}
 if(!values||typeof values!=='object')throw Error('Invalid credential object');
 const passwords=[];
 for(const x of ROLE_FIXTURES){
  const p=values[x.key];
  if(typeof p!=='string'||p.length<24||p.length>128||/\s/.test(p))
   throw Error('Each staging fixture needs a distinct 24–128 character password, including '+x.key);
  passwords.push(p);
 }
 if(new Set(passwords).size!==passwords.length)
  throw Error('Staging fixture passwords must be unique per role');
 return values;
}
async function findUserByEmail(admin,email){
 for(let page=1;page<=20;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});
  if(error)throw Error('Cannot inspect staging fixture identities');
  const found=data?.users?.find(x=>x.email?.toLowerCase()===email);
  if(found)return found;
  if(!data?.users||data.users.length<200)break;
 }
 return null;
}
const stop=(message)=>{throw Error(message);};
export async function stageAccountBootstrap(env=process.env,{apply=false}={}){
 const guard=verifiedStagingConfig(env,{write:apply});
 if(!apply){
  return {mode:'plan',stagingRef:guard.stagingRef,accounts:ROLE_FIXTURES.map(x=>({
   fixture:x.key,email:x.email,role:x.role,scope:x.key==='superadmin'?'global':x.tenantKey==='b'?'tenantB':'tenantA'
  })),writes:0};
 }
 if(env.APP_ENV!=='staging'||env.UNIPATHWAY_ISOLATED_STAGING_SEED!=='true')
  stop('Account changes require isolated staging application environment');
 const tenants=validatedStagingTenantIds(env.STAGING_TENANTS_JSON);
 const credentials=getCredentials(env);
 const serviceKey=String(env.STAGING_SERVICE_ROLE_KEY||'');
 if(!serviceKey||serviceKey.length<30)stop('Missing protected staging service role key');
 const admin=createClient(guard.url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const [name,id] of Object.entries(tenants)){
  const result=await admin.from('tenants').select('id').eq('id',id).maybeSingle();
  if(result.error||result.data?.id!==id)stop('Expected isolated '+name+' fixture tenant does not exist');
 }
 for(const table of ['profiles','user_roles']){
  const result=await admin.from(table).select(table==='profiles'?'user_id':'role').limit(1);
  if(result.error)stop('Staging role schema missing: '+table);
 }
 const results=[];
 for(const item of ROLE_FIXTURES){
  const tenantId=item.key==='superadmin'?null:tenants[item.tenantKey||'a'];
  try{
   let user=await findUserByEmail(admin,item.email);
   let status='reconciled';
   if(user){
    if(user.app_metadata?.fixture_namespace!==TAG)
     stop('Refusing to alter an existing non-fixture auth identity: '+item.key);
   }else{
    const created=await admin.auth.admin.createUser({
      email:item.email,password:credentials[item.key],email_confirm:true,
      app_metadata:{fixture_namespace:TAG},
      user_metadata:{full_name:'UniPathway '+item.key+' test account'},
    });
    if(created.error||!created.data?.user)stop('Cannot create '+item.key+' staging account');
    user=created.data.user;
    status='created';
   }
   // The only existing users we modify are explicitly tagged fixture accounts.
   const profile=await admin.from('profiles').upsert({
    user_id:user.id,email:item.email,
    full_name:'UniPathway '+item.key+' test account',
    tenant_id:tenantId
   },{onConflict:'user_id'});
   if(profile.error)stop('Profile assignment failed for '+item.key);
   const existing=await admin.from('user_roles').select('role,tenant_id').eq('user_id',user.id);
   if(existing.error)stop('Role inspection failed for '+item.key);
   const aligned=existing.data?.length===1 &&
     existing.data[0].role===item.role &&
     existing.data[0].tenant_id===tenantId;
   if(!aligned){
    const remove=await admin.from('user_roles').delete().eq('user_id',user.id);
    if(remove.error)stop('Cannot replace staging-only role for '+item.key);
    const add=await admin.from('user_roles').insert({user_id:user.id,role:item.role,tenant_id:tenantId});
    if(add.error)stop('Cannot apply staging-only role for '+item.key);
   }
   const checked=await admin.from('user_roles').select('role,tenant_id').eq('user_id',user.id);
   if(checked.error||checked.data?.length!==1||checked.data[0].role!==item.role||
      checked.data[0].tenant_id!==tenantId)stop('Role verification failed for '+item.key);
   results.push({fixture:item.key,id:user.id,tenantId,status});
  }catch(err){
   // Fail immediately to prevent a false "all accounts ready" result.
   stop('Staging account bootstrap stopped at '+item.key+': '+err.message);
  }
 }
 return {mode:'applied',stagingRef:guard.stagingRef,accounts:results,writes:results.length,
  warning:'Store generated IDs with existing protected staging credential values; no passwords were printed or reset.'};
}

import {fileURLToPath} from 'node:url';
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const mode=process.argv.includes('--apply');
 if(process.argv.includes('--plan')===mode){
  console.error('Choose exactly one of --plan or --apply');process.exitCode=2;
 }else{
  stageAccountBootstrap(process.env,{apply:mode}).then(result=>{
   // Never print private passwords or tokens.
   console.log(JSON.stringify(result,null,2));
  }).catch(e=>{console.error('Account bootstrap blocked: '+e.message);process.exitCode=2;});
 }
}
