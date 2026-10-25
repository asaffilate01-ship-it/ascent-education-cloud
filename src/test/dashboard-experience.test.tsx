import {describe,it,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {classJoinState,pakistanClassTime} from '@/lib/classroomExperience';
const account=vi.hoisted(()=>({role:'student'}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:account}),ROLE_HOME:{student:'/student',lecturer:'/lecturer',agent:'/agent',superadmin:'/landlord',centre_director:'/director'}}));
import WorkspaceShortcuts from '@/components/layout/WorkspaceShortcuts';
describe('dashboard experience',()=>{
 it('shows the appropriate student and teacher next actions',()=>{
  account.role='student';render(<MemoryRouter initialEntries={['/student']}><WorkspaceShortcuts/></MemoryRouter>);
  expect(screen.getByRole('link',{name:/Live classes/})).toHaveAttribute('href','/student/classroom');
  expect(screen.queryByRole('link',{name:/Schedule a class/})).not.toBeInTheDocument();cleanup();
  account.role='lecturer';render(<MemoryRouter initialEntries={['/lecturer']}><WorkspaceShortcuts/></MemoryRouter>);
  expect(screen.getByRole('link',{name:/Schedule a class/})).toHaveAttribute('href','/lecturer/class-scheduler');cleanup();
 });
 it('handles class join windows and ended sessions',()=>{
  const s={starts_at:'2026-10-25T10:00:00Z',ends_at:'2026-10-25T11:00:00Z',status:'scheduled'};
  expect(classJoinState(s,Date.parse('2026-10-25T09:39:00Z'))).toBe('scheduled');
  expect(classJoinState(s,Date.parse('2026-10-25T09:40:00Z'))).toBe('open');
  expect(classJoinState({...s,status:'ended'},Date.parse(s.starts_at))).toBe('ended');
  expect(classJoinState({...s,starts_at:'invalid'},Date.now())).toBe('unavailable');
  expect(pakistanClassTime(s.starts_at)).toMatch(/3:00/);
 });
});
