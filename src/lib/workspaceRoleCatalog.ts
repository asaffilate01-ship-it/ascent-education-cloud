import type {UserRole} from '@/types/platform';

/** Navigation groups only; membership checks remain the authority. */
export const workspaceRoleFamilies=[
 {id:'management',label:'Platform management',roles:['superadmin','centre_director','office_admin','hr_officer','secretary']},
 {id:'learning',label:'Academic and learning',roles:['lecturer','student','programme_leader','assessor','iqa_officer','awarding_body_eqa','exams_officer']},
 {id:'operations',label:'Centre operations',roles:['admissions_admin','finance_officer','marketing_officer','security_officer','welfare_officer']},
 {id:'partners',label:'Partners and guardians',roles:['parent_guardian','agent','university_partner','employer_partner']},
] as const satisfies readonly {id:string;label:string;roles:readonly UserRole[]}[];

export function rolesInWorkspaceFamily(roles:readonly UserRole[],family:string):UserRole[]{
 if(family==='all')return [...roles];
 const group=workspaceRoleFamilies.find(g=>g.id===family);
 if(!group)return [];
 const allowed:readonly UserRole[]=group.roles;
 return roles.filter(role=>allowed.includes(role));
}
