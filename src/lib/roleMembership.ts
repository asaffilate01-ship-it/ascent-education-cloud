import type {UserRole} from '@/types/platform';

/** Current UI role is a selected, verified membership, not any role the user ever held. */
export const KNOWN_UNIPATHWAY_ROLES: readonly UserRole[] = [
 'superadmin','centre_director','admissions_admin','office_admin','hr_officer','secretary','lecturer','assessor','programme_leader',
 'iqa_officer','awarding_body_eqa','welfare_officer','security_officer','exams_officer',
 'finance_officer','marketing_officer','agent','student','parent_guardian',
 'university_partner','employer_partner',
];

/**
 * When a centre is supplied, only role memberships explicitly assigned to
 * that same centre are usable. Superadmin must be a global membership.
 * Unknown roles fail closed. Legacy NULL-tenant office/student roles must be
 * reconciled by a trusted administrator, never promoted by the browser.
 *
 * Omit the centre argument only in pure role-list contract tests; application
 * authentication must ALWAYS pass the verified profile centre (or null).
 */
export function verifiedRoleMemberships(rows:unknown, centreId?:string|null):UserRole[]{
 if(!Array.isArray(rows)||rows.length===0)throw Error('No verified role membership');
 const known=new Set<string>(KNOWN_UNIPATHWAY_ROLES);
 const roles:UserRole[]=[];
 for(const row of rows){
  const record=row&&typeof row==='object'?row as {role?:unknown;tenant_id?:unknown}:null;
  const role=record?.role;
  if(typeof role!=='string'||!known.has(role))throw Error('Unknown role membership');
  if(centreId!==undefined){
   const globallyApproved=role==='superadmin'&&record?.tenant_id===null;
   const centreApproved=role!=='superadmin'&&typeof centreId==='string'&&centreId.length>0&&record?.tenant_id===centreId;
   if(!globallyApproved&&!centreApproved)continue;
  }
  if(!roles.includes(role as UserRole))roles.push(role as UserRole);
 }
 if(!roles.length)throw Error('No centre-verified role membership');
 return roles;
}

export function canUseActiveRole(user:{role:UserRole;roles:readonly UserRole[]},allowed:readonly UserRole[]):boolean{
 return Array.isArray(user.roles)&&user.roles.includes(user.role)&&allowed.includes(user.role);
}
export function activeRoleVerified(user:{role:UserRole;roles:readonly UserRole[]}):boolean{
 return Array.isArray(user.roles)&&user.roles.includes(user.role);
}
