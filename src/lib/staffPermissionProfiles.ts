/**
 * Explicit allowlist for office, HR and secretary workflows. A visible control
 * is not authorisation; server-side role membership, centre and a capability
 * override must be verified again on every protected API/RLS operation.
 */
export const STAFF_ROLES=['office_admin','hr_officer','secretary'] as const;
export type StaffRole=typeof STAFF_ROLES[number];
export const STAFF_CAPABILITIES=[
 {key:'staff_directory',label:'Staff directory',description:'View limited, centre-only names, roles and contact details; no medical, identity or payroll records.'},
 {key:'invite_limited_staff',label:'Invite permitted staff',description:'Prepare centre-scoped invitations for an approved non-privileged role; requires separate server activation.'},
 {key:'view_schedule',label:'Read classroom schedule',description:'View non-sensitive module/room/day information within this centre.'},
 {key:'view_own_tasks',label:'View assigned admin tasks',description:'View the signed-in user’s own work queue and due dates, never everyone’s private tasks.'},
 {key:'prepare_compliance',label:'Prepare compliance evidence',description:'Read public checklist templates and draft internal references; no approval or certification rights.'},
 {key:'view_leave_summary',label:'HR leave counts',description:'See aggregate time-off totals but no individual medical reasons or private applications.'},
 {key:'view_lab_inventory',label:'Check laboratory equipment availability',description:'Read asset counts only, never student VM credentials or provisioning secrets.'},
] as const;
export type StaffCapability=typeof STAFF_CAPABILITIES[number]['key'];
export type CapabilityEffect='allow'|'deny';
export const CAPABILITY_KEYS:readonly StaffCapability[]=STAFF_CAPABILITIES.map(x=>x.key);
export const STAFF_DEFAULTS:Record<StaffRole,readonly StaffCapability[]>={
 office_admin:['staff_directory','invite_limited_staff','view_schedule','view_own_tasks','prepare_compliance'],
 hr_officer:['staff_directory','view_leave_summary','view_own_tasks'],
 secretary:['view_schedule','view_own_tasks','prepare_compliance'],
};
export function staffRoleValid(v:unknown):v is StaffRole{return typeof v==='string'&&(STAFF_ROLES as readonly string[]).includes(v);}
export function parseCapabilityOverrides(raw:unknown):Partial<Record<StaffCapability,CapabilityEffect>>{
 if(raw===null||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid permission changes');
 const entries=Object.entries(raw);
 if(entries.length>STAFF_CAPABILITIES.length)throw Error('Too many capability changes');
 const allowed=new Set<string>(CAPABILITY_KEYS);
 const result:Partial<Record<StaffCapability,CapabilityEffect>>={};
 for(const [key,value] of entries){
  if(!allowed.has(key)||(value!=='allow'&&value!=='deny'))throw Error('Unapproved capability change');
  result[key as StaffCapability]=value;
 }
 return result;
}
export function effectiveStaffPermissions(role:StaffRole,overrides:Partial<Record<StaffCapability,CapabilityEffect>>){
 const safe=parseCapabilityOverrides(overrides);
 const permissions=new Set<StaffCapability>(STAFF_DEFAULTS[role]);
 for(const key of CAPABILITY_KEYS){
  if(safe[key]==='deny')permissions.delete(key);
  else if(safe[key]==='allow')permissions.add(key);
 }
 return CAPABILITY_KEYS.filter(key=>permissions.has(key));
}
export function staffCan(role:StaffRole,overrides:Partial<Record<StaffCapability,CapabilityEffect>>,cap:StaffCapability){
 return effectiveStaffPermissions(role,overrides).includes(cap);
}
export const UNIPATHWAY_SIGN_IN='https://unipathway.pk/login';
