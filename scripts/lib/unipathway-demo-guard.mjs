import {verifiedStagingConfig,validFixtureUuid,STAGING_ACK} from './unipathway-staging-guard.mjs';

/** Independent acceptance configuration. No service-role key is accepted.
 * The named environment must refer to a disposable synthetic-data project. */
export const DEMO_ACK='UNIPATHWAY_ISOLATED_DEMO_ONLY';
export const DEMO_EMAIL='demo@unipathway.pk';
export const DEMO_TAG='unipathway-demo-v1';
export const DEMO_ROLES=Object.freeze([
 'superadmin','centre_director','admissions_admin','office_admin','hr_officer','secretary',
 'lecturer','assessor','programme_leader','iqa_officer','awarding_body_eqa','welfare_officer',
 'security_officer','exams_officer','finance_officer','marketing_officer','agent','student',
 'parent_guardian','university_partner','employer_partner'
]);
function required(env,key){
 const value=env[key];
 if(typeof value!=='string'||!value.trim())throw Error('Missing protected demo configuration: '+key);
 return value;
}
function publicKey(key,ref){
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
 try{
  const parts=key.split('.');
  if(parts.length!==3)return false;
  const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  // This is only a key-type configuration check, not JWT authentication.
  return payload.role==='anon'&&payload.ref===ref;
 }catch{return false;}
}
export function verifiedDemoConfig(env=process.env){
 if(env.DEMO_RUN_ACK!==DEMO_ACK)throw Error('Explicit isolated demo acknowledgement required');
 if(env.APP_ENV!=='demo')throw Error('Demo acceptance requires a dedicated demo environment');
 const project=verifiedStagingConfig({
  STAGING_RUN_ACK:STAGING_ACK,STAGING_PROJECT_REF:required(env,'DEMO_PROJECT_REF'),
  UNIPATHWAY_PRODUCTION_PROJECT_REF:required(env,'UNIPATHWAY_PRODUCTION_PROJECT_REF'),
  STAGING_SUPABASE_URL:required(env,'DEMO_SUPABASE_URL')
 });
 const api=new URL(project.url);
 if(api.port)throw Error('Unexpected demo API port');
 const host=new URL(required(env,'DEMO_ORIGIN'));
 if(host.origin!=='https://demo.unipathway.pk'||host.pathname!=='/'||host.search||host.hash||host.username||host.password)throw Error('Demo must use its approved separate origin');
 const key=required(env,'DEMO_PUBLISHABLE_KEY');
 if(!publicKey(key,project.stagingRef))throw Error('Only a demo publishable or matching anonymous key is accepted');
 const userId=required(env,'DEMO_USER_ID'),tenantId=required(env,'DEMO_TENANT_ID');
 if(!validFixtureUuid(userId)||!validFixtureUuid(tenantId)||userId===tenantId)throw Error('Verified synthetic account and centre identifiers required');
 const password=required(env,'DEMO_ACCOUNT_PASSWORD');
 return {ref:project.stagingRef,url:project.url,origin:host.origin,key,userId,tenantId,password};
}
export function verifyDemoMemberships({user,profile,memberships,centre},config){
 if(!user||user.id!==config.userId||user.email?.toLowerCase()!==DEMO_EMAIL||!user.email_confirmed_at||
  user.app_metadata?.fixture_namespace!==DEMO_TAG)throw Error('Demonstration identity was not verified as the approved synthetic fixture');
 if(!profile||profile.user_id!==config.userId||profile.tenant_id!==config.tenantId||
  profile.email?.toLowerCase()!==DEMO_EMAIL)throw Error('Demonstration profile is not assigned to the approved synthetic centre');
 if(!centre||centre.id!==config.tenantId||centre.slug!=='unipathway-demo')throw Error('Demonstration centre reference does not match the approved fixture');
 if(!Array.isArray(memberships)||memberships.length!==DEMO_ROLES.length)throw Error('Expected exactly 21 verified demo role records');
 const seen=new Set();
 for(const row of memberships){
  if(!row||!DEMO_ROLES.includes(row.role)||seen.has(row.role)||row.user_id!==config.userId||
   row.tenant_id!==(row.role==='superadmin'?null:config.tenantId))throw Error('Unexpected, duplicate or foreign demo role membership');
  seen.add(row.role);
 }
 if(DEMO_ROLES.some(role=>!seen.has(role)))throw Error('A required demonstration role is missing');
 return {verifiedRoles:seen.size,centreVerified:true,accountVerified:true};
}
