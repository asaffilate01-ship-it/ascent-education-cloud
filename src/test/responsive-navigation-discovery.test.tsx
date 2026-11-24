import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import MobileBottomNav,{BOTTOM_NAV} from '@/components/MobileBottomNav';
import {activeDashboardTab,isPublicMobilePath,isMobileTabActive} from '@/lib/mobileTabRoutes';
import {combineWorkspaceGroups} from '@/lib/workspaceDirectory';
const state=vi.hoisted(()=>({user:{role:'student',roles:['student']} as {role:string;roles:string[]},loading:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>state,ROLE_HOME:{student:'/student',lecturer:'/lecturer'}}));
afterEach(()=>{cleanup();state.user={role:'student',roles:['student']};state.loading=false;});
describe('responsive route and service navigation',()=>{
 it('recognises course, international, application and public verification routes without confusing protected pages',()=>{
  for(const route of ['/education-centre','/tuition','/tech-academy','/tenant/unipathway/courses','/verify','/wellbeing/anonymous'])expect(isPublicMobilePath(route)).toBe(true);
  for(const route of ['/student/courses','/director/admissions','/tenant/unipathway/admin','/lecturer/lessons','/workspace'])expect(isPublicMobilePath(route)).toBe(false);
  for(const route of ['/education-centre','/ielts-preparation','/tuition','/pakistan','/tenant/unipathway/courses'])expect(isMobileTabActive('/study',route)).toBe(true);
  expect(isMobileTabActive('/international-study','/europe/france')).toBe(true);
  expect(isMobileTabActive('/study','/europe/france')).toBe(false);
  expect(isMobileTabActive('/apply','/tenant/unipathway/apply/uk')).toBe(true);
 });
 it('picks a single relevant task tab, not the dashboard home for an arbitrary nested route',()=>{
  const student=BOTTOM_NAV.student.map(i=>i.path),lecturer=BOTTOM_NAV.lecturer.map(i=>i.path);
  expect(activeDashboardTab('student',student,'/student/lessons')).toBe('/student/courses');
  expect(activeDashboardTab('student',student,'/student/grades')).toBe('/student/grades');
  expect(activeDashboardTab('student',student,'/student/finance')).toBeUndefined();
  expect(activeDashboardTab('lecturer',lecturer,'/classroom/teaching/session')).toBe('/lecturer/classroom');
  expect(activeDashboardTab('lecturer',lecturer,'/student/lessons')).toBeUndefined();
 });
 it('keeps only one role tab bar and preserves module context for relevant destinations',()=>{
  render(<MemoryRouter initialEntries={['/student/lessons?module=math&learner=private']}><MobileBottomNav/></MemoryRouter>);
  const nav=screen.getByRole('navigation',{name:'Dashboard mobile tabs'});
  expect(nav.className).toContain('lg:hidden');
  expect(within(nav).getByRole('link',{name:'Courses'})).toHaveAttribute('aria-current','location');
  expect(within(nav).getByRole('link',{name:'Tasks'})).toHaveAttribute('href','/student/assignments?module=math');
  expect(within(nav).getByRole('link',{name:'Home'})).toHaveAttribute('href','/student');
  expect(nav.querySelectorAll('[aria-current]')).toHaveLength(1);
 });
 it('does not render authenticated tabs on the public education centre or for an unverified role',()=>{
  const view=render(<MemoryRouter initialEntries={['/education-centre']}><MobileBottomNav/></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();view.unmount();
  state.user={role:'lecturer',roles:['student']};
  render(<MemoryRouter initialEntries={['/lecturer']}><MobileBottomNav/></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
 });
 it('keeps curated names and descriptions and deduplicates service paths across overlapping areas',()=>{
  const curated=[{title:'Learn',items:[{label:'Course guide',to:'/course',description:'Curated'}]}];
  const extra=[{title:'learn',items:[{label:'Other name',to:'/course',description:'Extra'},{label:'Labs',to:'/labs',description:'Lab tools'}]},{title:'Other',items:[{label:'Duplicate lab',to:'/labs',description:'Duplicate'}]}];
  expect(combineWorkspaceGroups(curated,extra)).toEqual([{title:'Learn',items:[...curated[0].items,extra[0].items[1]]}]);
  expect(curated[0].items).toHaveLength(1);
 });
});