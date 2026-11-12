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

 it('organises learner pages around learning, assessment, progress and support without losing specialist tools',()=>{
  const sections=getNavigationSections('student');
  expect(sections.map(s=>s.title)).toEqual([
   'Everyday','Learn & practise','Assessments & feedback','Progress & planning','Support & opportunities',
  ]);
  expect(sections[0].items.map(i=>i.path)).toContain('/student');
  expect(sections.find(s=>s.title==='Learn & practise')?.items.map(i=>i.path)).toContain('/student/materials');
  expect(sections.find(s=>s.title==='Assessments & feedback')?.items.map(i=>i.path)).toContain('/student/appeals');
  expect(sections.find(s=>s.title==='Progress & planning')?.items.map(i=>i.path)).toContain('/student/attendance');
  expect(sections.find(s=>s.title==='Support & opportunities')?.items.map(i=>i.path)).toContain('/student/wellbeing');
 });
 it('separates teaching, marking and learner communication but keeps every lecturer route available',()=>{
  const sections=getNavigationSections('lecturer');
  const titles=sections.map(s=>s.title);
  expect(titles).toContain('Plan & teach');
  expect(titles).toContain('Assess & feedback');
  expect(titles).toContain('Students & communication');
  expect(sections.find(s=>s.title==='Plan & teach')?.items.map(i=>i.path)).toContain('/lecturer/whiteboards');
  expect(sections.find(s=>s.title==='Assess & feedback')?.items.map(i=>i.path)).toContain('/lecturer/gradebook');
  expect(sections.find(s=>s.title==='Students & communication')?.items.map(i=>i.path)).toContain('/lecturer/students');
  expect(getNavigationSections('lecturer','whiteboard')[0].items.map(i=>i.path)).toContain('/lecturer/whiteboards');
 });
 