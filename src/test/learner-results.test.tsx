import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {beforeEach, afterEach, it, expect, vi} from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn()}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: {id: 'learner', tenantId: 'centre'}})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: (...args: unknown[]) => mocks.query(...args)}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
import StudentGrades from '@/pages/student/StudentGrades';
beforeEach(() => vi.clearAllMocks());afterEach(cleanup);
const records = [{id: 's1', tenant_id: 'centre', student_id: 'learner', assignment_id: 'a1', grade: 0, status: 'graded', submitted_at: '2026-10-01', feedback: 'First feedback'}, {id: 's2', tenant_id: 'centre', student_id: 'learner', assignment_id: 'a2', grade: null, status: 'submitted', submitted_at: '2026-10-02'}];
function setup(submissions = records) {mocks.query.mockImplementation(table => ({data: table === 'submissions' ? submissions : table === 'assignments' ? [{id: 'a1', module_id: 'm1', title: 'Same title'}, {id: 'a2', module_id: 'm2', title: 'Same title'}] : [{id: 'm1', title: 'Module One'}, {id: 'm2', title: 'Module Two'}], loading: false, error: null}));}
it('preserves zero marks, unknown marks and distinct records with duplicate names', () => {
 setup();render(<StudentGrades/>);expect(screen.getByText('Recorded mark: 0%')).toBeInTheDocument();expect(screen.getByText('Recorded mark: Not graded')).toBeInTheDocument();expect(screen.getAllByText('Same title')).toHaveLength(2);expect(screen.queryByText('Total Credits')).not.toBeInTheDocument();
 expect(mocks.query.mock.calls[0][1].filters).toContainEqual({column: 'student_id', operator: 'eq', value: 'learner'});
});
it('does not expose another learner record and supports searching', () => {
 setup([...records, {...records[0], id: 'other', student_id: 'other'}]);render(<StudentGrades/>);expect(screen.queryByText('Submission reference: other')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Search results'), {target: {value: 'Module Two'}});expect(screen.queryByText('Module One')).not.toBeInTheDocument();expect(screen.getByText('Module Two')).toBeInTheDocument();
});
it('does not convert failed reads into empty results', () => {
 mocks.query.mockReturnValue({data: [], loading: false, error: 'denied'});render(<StudentGrades/>);expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByText('No matching submission results.')).not.toBeInTheDocument();
});
