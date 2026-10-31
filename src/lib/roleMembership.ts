import type {UserRole} from '@/types/platform';

/** Current UI role is a selected, verified membership, not any role the user ever held. */
export const KNOWN_UNIPATHWAY_ROLES: readonly UserRole[] = [
 'superadmin','centre_director','admissions_admin','lecturer','assessor','programme_leader',
 'iqa_officer','awarding_body_eqa','welfare_officer','security_officer','exams_officer',
 'finance_officer','marketing_officer','agent','student','parent_guardian',
 'university_partner','employer_partner',
];

export function verifiedRoleMemberships(rows: unknown): UserRole[] {
 if(!Array.isArray(rows) || rows.length===0) throw Error('No verified role membership');
 const known=new Set<string>(KNOWN_UNIPATHWAY_ROLES);
 const roles: UserRole[]=[];
 for(const row of rows) {
  const role=(row && typeof row==='object' && 'role' in row)?(row as {role:unknown}).role:null;
  if(typeof role!=='string'||!known.has(role)) throw Error('Unknown role membership');
  if(!roles.includes(role as UserRole))roles.push(role as UserRole);
 }
 if(!roles.length) throw Error('No verified role membership');
 return roles;
}

export function canUseActiveRole(user: {role:UserRole;roles:readonly UserRole[]}, allowed:readonly UserRole[]): boolean {
 return user.roles.includes(user.role) && allowed.includes(user.role);
}

export function activeRoleVerified(user: {role:UserRole;roles:readonly UserRole[]}):boolean {
 return user.roles.includes(user.role);
}
