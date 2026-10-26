import {randomBytes} from 'node:crypto';
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export function provisioningConfig(env){
 for(const key of ['UNIPATHWAY_TENANT_ID','MS_TENANT_ID','MS_CLIENT_ID','MS_STUDENT_LICENSE_SKU','MS_STAFF_LICENSE_SKU'])if(!uuid.test(env[key]||''))throw Error(`Invalid ${key}`);
 if(env.MS_PROVISIONING_ENABLED!=='true')throw Error('Microsoft provisioning is not enabled');
 if(!env.MS_CLIENT_SECRET)throw Error('MS_CLIENT_SECRET required');
 const domain=(env.MS_ACCOUNT_DOMAIN||'').toLowerCase();
 if(!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)||domain.length>180)throw Error('Invalid MS_ACCOUNT_DOMAIN');
 return {tenant:env.UNIPATHWAY_TENANT_ID,domain,studentSku:env.MS_STUDENT_LICENSE_SKU,staffSku:env.MS_STAFF_LICENSE_SKU};
}
// Graph client is injected for deterministic failure/retry testing. Never logs provider bodies/passwords.
export async function provisionMicrosoftAccount(graph,config,claimed){
 const {job,display_name}=claimed;
 if(job.tenant_id!==config.tenant||!uuid.test(job.user_id)||!['student','lecturer','staff'].includes(job.role_type))throw Error('invalid_job');
 const alias='u'+job.user_id.replaceAll('-','').toLowerCase(),upn=alias+'@'+config.domain;
 const marker=`unipathway:${job.tenant_id}:${job.user_id}`;
 const sku=job.role_type==='student'?config.studentSku:config.staffSku;
 const domain=await graph(`/domains/${encodeURIComponent(config.domain)}`);
 if(domain.isVerified!==true||domain.authenticationType!=='Managed')throw Error('verified_managed_domain_required');
 const path='/users/'+encodeURIComponent(upn)+'?$select=id,userPrincipalName,accountEnabled,onPremisesSyncEnabled,onPremisesExtensionAttributes,assignedLicenses';
 let account=await graph(path,'GET',undefined,true);
 if(!account){
  // Password is random, never stored or returned. Account remains disabled pending administrator onboarding.
  await graph('/users','POST',{accountEnabled:false,displayName:String(display_name||'UniPathway learner').slice(0,256),mailNickname:alias,userPrincipalName:upn,usageLocation:'PK',
   onPremisesExtensionAttributes:{extensionAttribute15:marker},passwordProfile:{forceChangePasswordNextSignIn:true,password:randomBytes(32).toString('base64url')+'aA1!'}});
  account=await graph(path);
 }
 if(!account||!uuid.test(account.id)||account.userPrincipalName?.toLowerCase()!==upn||account.onPremisesSyncEnabled===true||account.onPremisesExtensionAttributes?.extensionAttribute15!==marker)throw Error('identity_ownership_conflict');
 if(account.accountEnabled!==false)throw Error('account_already_enabled_review_required');
 if(!account.assignedLicenses?.some(l=>l.skuId.toLowerCase()===sku.toLowerCase())){
  await graph(`/users/${account.id}/assignLicense`,'POST',{addLicenses:[{skuId:sku,disabledPlans:[]}],removeLicenses:[]});
 }
 const confirmed=await graph(path);
 if(confirmed.id!==account.id||confirmed.accountEnabled!==false||confirmed.onPremisesExtensionAttributes?.extensionAttribute15!==marker||!confirmed.assignedLicenses?.some(l=>l.skuId.toLowerCase()===sku.toLowerCase()))throw Error('licence_receipt_unconfirmed');
 return {objectId:account.id,upn,sku};
}
