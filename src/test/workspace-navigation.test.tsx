import {describe,it,expect,vi} from 'vitest';
vi.mock('@/contexts/AuthContext',async importOriginal=>({...await importOriginal<typeof import('@/contexts/AuthContext')>(),useAuth:()=>({user:null})}));
import {NAV_CONFIG,getNavigationSections} from '@/components/layout/DashboardSidebar';
import type {UserRole} from '@/types/platform';
describe('Focused workspace navigation',()=>{
 it('keeps every authorised destination available exactly once for every role',()=>{
  for(const role of Object.keys(NAV_CONFIG) as UserRole[]){
   const before=[...NAV_CONFIG[role].flatMap(s=>s.items.map(i=>i.path)),'/workspace'];
   const after=getNavigationSections(role).flatMap(s=>s.items.map(i=>i.path));
   expect(after.slice().sort()).toEqual(before.slice().sort());
   expect(new Set(after).size).toBe(after.length);
  }
 });
 it('starts the main roles at their overview with at most six daily destinations',()=>{
  for(const [role,home] of [['student','/student'],['lecturer','/lecturer'],['centre_director','/director'],['superadmin','/landlord']] as const){
   const sections=getNavigationSections(role);expect(sections[0].items[0].path).toBe(home);expect(sections[0].items.length).toBeLessThanOrEqual(6);
  }
 });
 it('searches additional tools without exposing another role’s destinations',()=>{
  expect(getNavigationSections('student','record').flatMap(s=>s.items).every(i=>i.path.startsWith('/student/'))).toBe(true);
  expect(getNavigationSections('student','grade').flatMap(s=>s.items).length).toBeGreaterThan(0);
  expect(getNavigationSections('student','All Centres')[0].items).toEqual([]);
 });
});
