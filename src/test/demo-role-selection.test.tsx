import {useState} from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import type {UserRole} from '@/types/platform';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {demoLoginUrl} from '@/lib/demoAccess';
import WorkspaceRolePicker,{verifiedWorkspaceChoices} from '@/components/auth/WorkspaceRolePicker';
import DemoPage from '@/pages/auth/DemoPage';

const fixture=vi.hoisted(()=>({roles:['lecturer','student'] as UserRole[],logout:vi.fn(),setRole:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>{
 const roleLabels=Object.fromEntries(['superadmin','centre_director','admissions_admin','office_admin','hr_officer','secretary','lecturer','assessor','programme_leader','iqa_officer','awarding_body_eqa','welfare_officer','security_officer','exams_officer','finance_officer','marketing_officer','agent','student','parent_guardian','university_partner','employer_partner'].map(role=>[role,role]));
 return {ROLE_LABELS:roleLabels,ROLE_HOME:{lecturer:'/lecturer',student:'/student'},useAuth:()=>{
  const [active,setActive]=useState<UserRole>('lecturer');
  return {user:{id:'demo-fixture',tenantId:'isolated-fixture',role:active,roles:fixture.roles},loading:false,setRole:(role:UserRole)=>{fixture.setRole(role);if(fixture.roles.includes(role))setActive(role);},logout:fixture.logout};
 }};
});
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.clearAllMocks();});
describe('role selection and isolated demo entry',()=>{
 it('exposes the known role catalogue but restricts authenticated choices to verified memberships',()=>{
  expect(KNOWN_UNIPATHWAY_ROLES).toHaveLength(21);
  expect(verifiedWorkspaceChoices(['lecturer','student','lecturer'])).toEqual(['lecturer','student']);
  expect(verifiedWorkspaceChoices(undefined)).toEqual([]);
 });
 it('does not allow a URL hint to promote a user into an unassigned role',()=>{
  render(<MemoryRouter initialEntries={['/login?role=superadmin']}><WorkspaceRolePicker/></MemoryRouter>);
  expect(screen.queryByRole('radio',{name:/superadmin/})).toBeNull();
  expect(screen.getByRole('button',{name:'Open selected workspace'})).toBeDisabled();
 });
 it('honours a verified role preference only after confirmation and changes the active role',async()=>{
  render(<MemoryRouter initialEntries={['/login?role=student']}><Routes><Route path="/login" element={<WorkspaceRolePicker/>}/><Route path="/student" element={<p>Student workspace opened</p>}/></Routes></MemoryRouter>);
  expect(screen.getByRole('radio',{name:/student Learning/})).toBeChecked();
  expect(fixture.setRole).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Open selected workspace'}));
  expect(await screen.findByText('Student workspace opened')).toBeInTheDocument();
  expect(fixture.setRole).toHaveBeenCalledWith('student');
 });
 it('shows the 21-role selector without granting access when the demo host is unconfigured',()=>{
  vi.stubEnv('VITE_UNIPATHWAY_DEMO_ORIGIN','');
  render(<MemoryRouter><DemoPage/></MemoryRouter>);
  expect(screen.getAllByRole('radio')).toHaveLength(21);
  expect(screen.getByRole('button',{name:'Continue to demo'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Find a demo role'),{target:{value:'finance'}});
  expect(screen.getByRole('radio',{name:/finance_officer/})).toBeInTheDocument();
 });
 it('only accepts the fixed isolated demo origin and never embeds credentials',()=>{
  for(const input of [undefined,'','https://unipathway.pk','https://demo.unipathway.pk.evil.example','http://demo.unipathway.pk','https://demo.unipathway.pk/path','https://user:secret@demo.unipathway.pk/'])expect(demoLoginUrl(input,'student')).toBeNull();
  expect(demoLoginUrl('https://demo.unipathway.pk','finance_officer')).toBe('https://demo.unipathway.pk/login?role=finance_officer&demo=1');
 });
});
