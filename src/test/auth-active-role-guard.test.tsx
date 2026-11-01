import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import {KNOWN_UNIPATHWAY_ROLES,verifiedRoleMemberships,activeRoleVerified,canUseActiveRole} from '@/lib/roleMembership';

const state=vi.hoisted(()=>({user:{role:'lecturer',roles:['lecturer','assessor']} as any,loading:false}));
vi.mock('@/contexts/AuthContext',()=>({
 useAuth:()=>state,
 ROLE_HOME:{lecturer:'/lecturer',assessor:'/assessor',student:'/student'}
}));
import RoleGuard from '@/components/RoleGuard';
beforeEach(()=>{state.user={role:'lecturer',roles:['lecturer','assessor']};state.loading=false;});
afterEach(cleanup);
it('uses the verified selected role rather than permitting every secondary membership',()=>{
 const view=render(<MemoryRouter initialEntries={['/assessor']}>
  <Routes>
   <Route path="/assessor" element={<RoleGuard allowed={['assessor']}><p>Assessor assessment records</p></RoleGuard>}/>
   <Route path="/lecturer" element={<p>Lecturer landing</p>}/>
  </Routes>
 </MemoryRouter>);
 expect(screen.getByText('Lecturer landing')).toBeInTheDocument();
 expect(screen.queryByText('Assessor assessment records')).toBeNull();
 view.unmount();
 state.user={role:'assessor',roles:['lecturer','assessor']};
 render(<MemoryRouter initialEntries={['/assessor']}><RoleGuard allowed={['assessor']}><p>Assessor assessment records</p></RoleGuard></MemoryRouter>);
 expect(screen.getByText('Assessor assessment records')).toBeInTheDocument();
});
it('refuses a selected role that is no longer in the verified memberships',()=>{
 state.user={role:'assessor',roles:['lecturer']};
 render(<MemoryRouter><RoleGuard allowed={['assessor']}><p>Restricted</p></RoleGuard></MemoryRouter>);
 expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
 expect(screen.queryByText('Restricted')).toBeNull();
});
it('never manufactures a student role when memberships are missing or invalid',()=>{
 for(const input of [[],null,[{role:'unknown'}],[{role:null}],[{}]]){
  expect(()=>verifiedRoleMemberships(input)).toThrow();
 }
 expect(verifiedRoleMemberships([{role:'lecturer'},{role:'lecturer'},{role:'assessor'}])).toEqual(['lecturer','assessor']);
 expect(new Set(KNOWN_UNIPATHWAY_ROLES).size).toBe(KNOWN_UNIPATHWAY_ROLES.length);
  expect(verifiedRoleMemberships([{role:'student',tenant_id:'centre-a'},{role:'finance_officer',tenant_id:'centre-b'}],'centre-a')).toEqual(['student']);
  expect(()=>verifiedRoleMemberships([{role:'finance_officer',tenant_id:'centre-b'}],'centre-a')).toThrow();
  expect(()=>verifiedRoleMemberships([{role:'office_admin',tenant_id:null}],'centre-a')).toThrow();
  expect(verifiedRoleMemberships([{role:'superadmin',tenant_id:null}],null)).toEqual(['superadmin']);
  for(const role of ['office_admin','hr_officer','secretary'])expect(KNOWN_UNIPATHWAY_ROLES).toContain(role);
 expect(activeRoleVerified({role:'student',roles:[]})).toBe(false);
 expect(canUseActiveRole({role:'lecturer',roles:['lecturer','assessor']},['assessor'])).toBe(false);
});
