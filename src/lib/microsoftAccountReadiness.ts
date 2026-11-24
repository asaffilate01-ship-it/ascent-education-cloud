export type MicrosoftAccountRole='student'|'lecturer';
export type MicrosoftAccountRecord={id:string;tenant_id:string;user_id:string;role_type:MicrosoftAccountRole;institutional_email:string|null;license_sku:string|null;provisioning_status:string;provisioned_at:string|null;disabled_at:string|null};
export const microsoftAccountFields='id,tenant_id,user_id,role_type,institutional_email,license_sku,provisioning_status,provisioned_at,disabled_at';
const id=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const time=(x:unknown):x is string|null=>x===null||(typeof x==='string'&&Number.isFinite(Date.parse(x)));
const email=(x:unknown):x is string|null=>x===null||(typeof x==='string'&&x.length<=254&&/^[^\s@<>]+@[a-z0-9.-]+\.[a-z0-9-]+$/i.test(x));
const text=(x:unknown):x is string|null=>x===null||(typeof x==='string'&&x.trim().length>0&&x.length<=254);
export function readOwnMicrosoftAccount(rows:unknown,uid:string,tenant:string,role:MicrosoftAccountRole):MicrosoftAccountRecord|null{
 if(!Array.isArray(rows)||rows.length>1)throw Error('Account mapping not verified');
 if(!rows.length)return null;
 const r=rows[0];
 if(!r||typeof r!=='object'||!id(r.id)||r.user_id!==uid||r.tenant_id!==tenant||r.role_type!==role||!email(r.institutional_email)||!text(r.license_sku)||!text(r.provisioning_status)||r.provisioning_status===null||!time(r.provisioned_at)||!time(r.disabled_at))throw Error('Account mapping not verified');
 return {id:r.id,tenant_id:tenant,user_id:uid,role_type:role,institutional_email:r.institutional_email,license_sku:r.license_sku,provisioning_status:r.provisioning_status,provisioned_at:r.provisioned_at,disabled_at:r.disabled_at};
}
export function microsoftReadiness(a:MicrosoftAccountRecord|null){
 if(!a)return {state:'no_record',title:'No account mapping found',detail:'An institutional account may not have been requested or provisioned yet. Ask your centre to check the account request queue.',created:false,licensed:false,recordedReady:false};
 const created=Boolean(a.provisioned_at&&a.institutional_email),licensed=created&&!!a.license_sku;
 const result={created,licensed,recordedReady:false};
 if(a.disabled_at||['provisioned_disabled','disabled','suspended'].includes(a.provisioning_status))return {...result,state:'disabled',title:'Sign-in disabled',detail:'Your centre’s Microsoft administrator must complete approved sign-in setup, security checks and activation. Do not share or request passwords here.'};
 if(a.provisioning_status==='ready'&&created&&licensed)return {...result,state:'recorded_ready',title:'Recorded as ready',detail:'The saved account mapping is marked ready. This screen does not verify live Microsoft sign-in, Teams, mailbox access or licence entitlement.',recordedReady:true};
 if(a.provisioning_status==='pending'||a.provisioning_status==='requested')return {...result,state:'pending',title:'Provisioning pending',detail:'The account mapping is not recorded as ready. Check with your centre before attempting to sign in.'};
 if(a.provisioning_status==='failed')return {...result,state:'failed',title:'Account requires attention',detail:'Ask your centre to reconcile the account request. Do not create another Microsoft account yourself.'};
 return {...result,state:'review',title:'Account status requires review',detail:'The recorded account fields do not establish readiness. Ask the centre to check the Microsoft identity and licence.'};
}
