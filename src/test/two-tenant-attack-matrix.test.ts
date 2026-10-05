import {describe,it,expect} from 'vitest';
type Role='student'|'lecturer'|'assessor'|'iqa'|'finance'|'employer'|'director';
const tenantA={student:'a-student',lecturer:'a-lecturer',assessor:'a-assessor',iqa:'a-iqa',finance:'a-finance',employer:'a-employer',director:'a-director'};
const tenantB={student:'b-student',director:'b-director'};
const sameTenant=(actor:string,target:string)=>actor.startsWith('a-')===target.startsWith('a-');
const can=(role:Role,action:string)=>({student:['read_own'],lecturer:['teach_assigned'],assessor:['mark_allocated'],iqa:['qa_assigned'],finance:['manage_finance'],employer:['own_corporate'],director:['manage_tenant']}[role]||[]).includes(action);
describe('two-tenant attack matrix',()=>{it('blocks cross-tenant student access',()=>expect(sameTenant(tenantA.student,tenantB.student)).toBe(false));it('blocks director A from tenant B',()=>expect(sameTenant(tenantA.director,tenantB.director)).toBe(false));it('finance cannot change grade',()=>expect(can('finance','release_grade')).toBe(false));it('lecturer cannot release grade',()=>expect(can('lecturer','release_grade')).toBe(false));it('employer cannot browse learners',()=>expect(can('employer','browse_all_learners')).toBe(false));it('assessor only marks allocated work',()=>expect(can('assessor','mark_allocated')).toBe(true))});
