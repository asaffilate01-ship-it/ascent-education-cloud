import {useState} from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import type {UserRole} from '@/types/platform';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';
import {workspaceRoleFamilies,rolesInWorkspaceFamily} from '@/lib/workspaceRoleCatalog';
import {canRegisterAppWorker} from '@/lib/appServiceWorker';
import {demoLoginUrl,isDemoAccount,isolatedDemoDeployment,demoRolePreference,signInBoundary,demoDeploymentBlocked,demoAccountActionsBlocked} from '@/lib/demoAccess';
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

it('blocks demonstration identity from the known production project and other origins',()=>{
 const ref='abcdefghijklmnopqrst';
 expect(isDemoAccount(' DEMO@unipathway.pk ')).toBe(true);
 expect(isDemoAccount('learner@unipathway.pk')).toBe(false);
 expect(isolatedDemoDeployment('demo.unipathway.pk','https://'+ref+'.supabase.co',ref)).toBe(true);
 expect(isolatedDemoDeployment('unipathway.pk','https://'+ref+'.supabase.co',ref)).toBe(false);
 expect(isolatedDemoDeployment('demo.unipathway.pk','https://sthrhcmjypwuorlbscfw.supabase.co','sthrhcmjypwuorlbscfw')).toBe(false);
 expect(isolatedDemoDeployment('demo.unipathway.pk','https://wrong.supabase.co',ref)).toBe(false);
});

describe('role categories, deep links and shared demo boundaries',()=>{
 it('covers every configured role exactly once without creating additional memberships',()=>{
  const all=workspaceRoleFamilies.flatMap(group=>[...group.roles]);
  expect(all).toHaveLength(21);
  expect(new Set(all).size).toBe(21);
  expect([...all].sort()).toEqual([...KNOWN_UNIPATHWAY_ROLES].sort());
  expect(rolesInWorkspaceFamily(['lecturer','student'],'operations')).toEqual([]);
  expect(rolesInWorkspaceFamily(['student','finance_officer'],'operations')).toEqual(['finance_officer']);
  expect(rolesInWorkspaceFamily(['student'],'invalid')).toEqual([]);
 });
 it('preserves selected role in the demo link and filters all 21 entries by functional area',()=>{
  vi.stubEnv('VITE_UNIPATHWAY_DEMO_ORIGIN','https://demo.unipathway.pk');
  render(<MemoryRouter initialEntries={['/demo?role=finance_officer']}><DemoPage/></MemoryRouter>);
  expect(screen.getByRole('radio',{name:/finance_officer/})).toBeChecked();
  expect(screen.getByRole('link',{name:'Continue to demo'})).toHaveAttribute('href','https://demo.unipathway.pk/login?role=finance_officer&demo=1');
  fireEvent.change(screen.getByLabelText('Workspace area'),{target:{value:'partners'}});
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  fireEvent.click(screen.getByRole('radio',{name:/parent_guardian/}));
  expect(screen.getByRole('link',{name:'Continue to demo'})).toHaveAttribute('href','https://demo.unipathway.pk/login?role=parent_guardian&demo=1');
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  expect(screen.getAllByRole('radio')).toHaveLength(21);
  expect(screen.getByRole('radio',{name:/parent_guardian/})).toBeChecked();
 });
 it('accepts every known role preference and rejects unrecognised or injected role values',()=>{
  for(const role of KNOWN_UNIPATHWAY_ROLES){
   expect(demoRolePreference(role)).toBe(role);
   expect(new URL(demoLoginUrl('https://demo.unipathway.pk',role)!).searchParams.get('role')).toBe(role);
  }
  for(const invalid of ['','owner','../landlord','student&role=superadmin','https://example.com']){
   expect(demoRolePreference(invalid)).toBeNull();
   expect(demoLoginUrl('https://demo.unipathway.pk',invalid)).toBeNull();
  }
 });
 it('blocks misconfigured demo startup, real credentials on the demo host and shared account mutations',()=>{
  const ref='abcdefghijklmnopqrst',url='https://'+ref+'.supabase.co';
  expect(demoDeploymentBlocked('demo.unipathway.pk',url,ref)).toBe(false);
  expect(demoDeploymentBlocked('demo.unipathway.pk','https://sthrhcmjypwuorlbscfw.supabase.co',ref)).toBe(true);
  expect(demoDeploymentBlocked('unipathway.pk',undefined,undefined)).toBe(false);
  expect(signInBoundary('demo@unipathway.pk','demo.unipathway.pk',url,ref)).toBe(true);
  expect(signInBoundary('real@unipathway.pk','demo.unipathway.pk',url,ref)).toBe(false);
  expect(signInBoundary('demo@unipathway.pk','unipathway.pk',url,ref)).toBe(false);
  expect(signInBoundary('real@unipathway.pk','unipathway.pk',url,ref)).toBe(true);
  expect(demoAccountActionsBlocked('real@unipathway.pk','demo.unipathway.pk')).toBe(true);
  expect(demoAccountActionsBlocked(' DEMO@unipathway.pk ','unipathway.pk')).toBe(true);
  expect(demoAccountActionsBlocked('real@unipathway.pk','unipathway.pk')).toBe(false);
  expect(canRegisterAppWorker({production:true,framed:false,hostname:'demo.unipathway.pk',search:''})).toBe(false);
  expect(canRegisterAppWorker({production:true,framed:false,hostname:'unipathway.pk',search:''})).toBe(true);
 });
});
