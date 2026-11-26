/** Browser switches only. These values do not prove backend installation or provider health. */
export const activationDefinitions=[
 {key:'VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED',label:'Secure public enquiries',area:'Admissions',requires:[],needsSiteKey:true,evidence:'Active tenant, deployed contact handlers, durable quota, Turnstile acceptance and coordinated server-side secure-only enforcement.'},
 {key:'VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED',label:'Private student application planning',area:'Admissions',requires:[],evidence:'Reviewed student-planner forward patch, disabled-gate and two-centre hosted RLS acceptance; then authorised server gate.'},
 {key:'VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED',label:'Physical security operations',area:'Security',requires:[],evidence:'Approved physical security schema, centre-bound roles, hosted read acceptance and hardware gateway checks.'},
 {key:'VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED',label:'Visitor arrival and departure writes',area:'Security',requires:['VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED'],evidence:'Verified physical reads, visitor write gate, officer authorisation, duplicate and uncertain-result recovery tests.'},
 {key:'VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED',label:'Persistent facilities register',area:'Security',requires:['VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED'],evidence:'Reviewed facilities forward patches, centre-specific reader and writer tests, server gate and actual inspection evidence.'},
 {key:'VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED',label:'Assigned technology lab access',area:'Learning',requires:[],evidence:'Hosted module enrolment and lab-entitlement RLS tests, assigned learner and lecturer accounts, gateway acceptance for managed resources.'},
 {key:'VITE_UNIPATHWAY_PRIVATE_MESSAGING_ENABLED',label:'Private messaging',area:'Learning',requires:[],evidence:'Hosted sender/recipient and centre isolation, safeguarding policy, message persistence and authorised participant acceptance.'},
 {key:'VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED',label:'Scheduled class release',area:'Learning',requires:[],evidence:'Hosted class release rules, assigned module enrolments, correct Pakistan-time windows and direct-access negative tests.'},
 {key:'VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED',label:'Office role access',area:'Operations',requires:[],evidence:'Approved centre assignments, active role checks, office data RLS and cross-centre negative tests.'},
 {key:'VITE_UNIPATHWAY_STAFF_INVITES_ENABLED',label:'Staff invitation workflow',area:'Operations',requires:[],evidence:'Hosted invitation authorisation, approved roles, expiry, replay prevention and staff onboarding acceptance.'},
] as const;

export type ActivationKey=typeof activationDefinitions[number]['key'];
export type ActivationState='not_set'|'off'|'invalid'|'blocked'|'enabled_unverified';
export type ActivationInputs=Partial<Record<ActivationKey,unknown>>&{VITE_TURNSTILE_SITE_KEY?:unknown};
export function describeActivationState(inputs:ActivationInputs){
 return activationDefinitions.map(definition=>{
  const raw=inputs[definition.key];
  const missing=definition.requires.filter(key=>inputs[key]!=='true');
  const siteKeyMissing='needsSiteKey' in definition&&definition.needsSiteKey&&!(typeof inputs.VITE_TURNSTILE_SITE_KEY==='string'&&inputs.VITE_TURNSTILE_SITE_KEY.trim().length>0);
  const blockers=[...missing,...(siteKeyMissing?['VITE_TURNSTILE_SITE_KEY']:[])];
  const state:ActivationState=raw===undefined||raw===null||raw===''?'not_set':raw==='false'?'off':raw!=='true'?'invalid':blockers.length?'blocked':'enabled_unverified';
  return {definition,state,blockers};
 });
}
/** Explicit references preserve Vite's static replacement and never return public key values. */
export function currentActivationInputs():ActivationInputs{
 return {
  VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED:import.meta.env.VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED,
  VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED:import.meta.env.VITE_UNIPATHWAY_STUDENT_PLANS_ENABLED,
  VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED:import.meta.env.VITE_UNIPATHWAY_PHYSICAL_SECURITY_ENABLED,
  VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED:import.meta.env.VITE_UNIPATHWAY_PHYSICAL_VISITOR_WRITES_ENABLED,
  VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED:import.meta.env.VITE_UNIPATHWAY_FACILITIES_REGISTER_ENABLED,
  VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED:import.meta.env.VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED,
  VITE_UNIPATHWAY_PRIVATE_MESSAGING_ENABLED:import.meta.env.VITE_UNIPATHWAY_PRIVATE_MESSAGING_ENABLED,
  VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED:import.meta.env.VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED,
  VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED:import.meta.env.VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED,
  VITE_UNIPATHWAY_STAFF_INVITES_ENABLED:import.meta.env.VITE_UNIPATHWAY_STAFF_INVITES_ENABLED,
  VITE_TURNSTILE_SITE_KEY:typeof import.meta.env.VITE_TURNSTILE_SITE_KEY==='string'&&import.meta.env.VITE_TURNSTILE_SITE_KEY.trim()?'configured':'',
 };
}
