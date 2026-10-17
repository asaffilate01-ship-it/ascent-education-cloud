import {render, screen, cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, it, expect, vi} from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn()}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: {id: 'learner', tenantId: 'centre', name: 'Learner'}})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: (...args: unknown[]) => mocks.query(...args)}));
// The integration panel is tested in its own contract suite; keep this
// learner-dashboard unit test independent of live Supabase credentials.
vi.mock('@/components/student/STEMCoachLearningAccess', () => ({default: () => null}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
import StudentDashboard from '@/pages/student/StudentDashboard';
afterEach(cleanup);
it('queries enrolled programmes and modules, and removes already-submitted deadlines', () => {
 const records: Record<string, unknown[]> = {student_enrolments: [{programme_id: 'p1'}], programmes: [{id: 'p1'}], modules: [{id: 'm1', title: 'Enrolled module', programme_id: 'p1'}], assignments: [{id: 'a1', title: 'Already submitted', module_id: 'm1', deadline: '2099-01-01'}], submissions: [{id: 's1', assignment_id: 'a1', student_id: 'learner', status: 'submitted', grade: null}]};
 mocks.query.mockImplementation(table => ({data: records[table] || [], loading: false, error: null}));
 render(<MemoryRouter><StudentDashboard/></MemoryRouter>);
 expect(mocks.query.mock.calls.find(c => c[0] === 'programmes')?.[1].filters).toContainEqual({column: 'id', operator: 'in', value: ['p1']});
 expect(mocks.query.mock.calls.find(c => c[0] === 'assignments')?.[1].filters).toContainEqual({column: 'module_id', operator: 'in', value: ['m1']});
 expect(screen.queryByText('Already submitted')).not.toBeInTheDocument();
});
