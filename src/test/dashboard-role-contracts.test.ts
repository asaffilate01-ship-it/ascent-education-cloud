import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {DASHBOARD_SHORTCUTS,dashboardShortcutsFor} from '@/lib/dashboardNavigation';
import type {UserRole} from '@/types/platform';

const srcApp=readFileSync('src/App.tsx','utf8');
const srcAuth=readFileSync('src/contexts/AuthContext.tsx','utf8');
const routeMap=new Map([...srcApp.matchAll(/<Route path="([^"]+)" element=\{([^\n]+?)\} \/>/g)].map(m=>[m[1],m[2]]));
const homeSection=srcAuth.slice(srcAuth.indexOf('export const ROLE_HOME:'),srcAuth.indexOf('async function fetchAuthUser'));
const roleHomes=Object.fromEntries([...homeSection.matchAll(/(\w+):\s*'([^']+)'/g)].map(m=>[m[1],m[2]])) as Record<UserRole,string>;

describe('Phase 21: all-role dashboard route and next-step contracts',()=>{
 it('covers every configured role with a real, guarded home route',()=>{
  expect(KNOWN_UNIPATHWAY_ROLES).toHaveLength(21);
  expect(Object.keys(roleHomes).sort()).toEqual([...KNOWN_UNIPATHWAY_ROLES].sort());
  for(const role of KNOWN_UNIPATHWAY_ROLES){
   const route=routeMap.get(roleHomes[role]);
   expect(route,`${role} dashboard home missing`).toBeDefined();
   expect(route,`${role} home is not guarded`).toMatch(/^<(?:RoleGuard|Landlord|Director|Admissions|Office|LecturerR|AssessorR|Programme|QA|EQAR|Exams|Finance|Marketing|AgentR|StudentR|PartnerR|EmployerR|ParentR|WelfareR)\b/);
  }
 });
 it('provides three to four relevant, existing shortcut routes for all 21 roles',()=>{
  expect(Object.keys(DASHBOARD_SHORTCUTS).sort()).toEqual([...KNOWN_UNIPATHWAY_ROLES].sort());
  for(const role of KNOWN_UNIPATHWAY_ROLES){
   const entries=DASHBOARD_SHORTCUTS[role];
   expect(entries.length,`No shortcuts for ${role}`).toBeGreaterThanOrEqual(3);
   expect(entries.length,`Too many shortcuts for ${role}`).toBeLessThanOrEqual(4);
   const urls=entries.map(([,url])=>url);
   expect(new Set(urls).size,`Duplicate navigation for ${role}`).toBe(urls.length);
   for(const [label,url] of entries){
    expect(label.trim().length).toBeGreaterThan(2);
    expect(url.startsWith('/')).toBe(true);
    expect(routeMap.has(url),`${role} shortcut missing route: ${url}`).toBe(true);
   }
  }
 });
 it('keeps one verified active role and correct dashboard route required for shortcuts',()=>{
  for(const role of KNOWN_UNIPATHWAY_ROLES){
   const actor={role,roles:[role]};
   expect(dashboardShortcutsFor(actor,roleHomes[role],roleHomes)).toBe(DASHBOARD_SHORTCUTS[role]);
   expect(dashboardShortcutsFor({role,roles:[]},roleHomes[role],roleHomes)).toEqual([]);
   expect(dashboardShortcutsFor(actor,'/workspace',roleHomes)).toEqual([]);
  }
 });
 it('keeps the maintained assessor, learner and platform-owner routes rather than old pages',()=>{
  expect(routeMap.get('/assessor')).toContain('<IndependentMarkerQueue');
  expect(routeMap.get('/student/assignments')).toContain('<StudentCoursework');
  expect(routeMap.get('/landlord')).toContain('<LandlordDashboard');
  expect(routeMap.get('/assessor')).not.toContain('<AssessorDashboard');
  expect(routeMap.get('/student/assignments')).not.toContain('<StudentAssignments');
  expect(routeMap.get('/landlord')).not.toContain('<SuperadminDashboard');
 });
});
