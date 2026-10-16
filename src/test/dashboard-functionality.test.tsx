import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
const mocks = vi.hoisted(() => ({query: vi.fn()}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: {id: 'staff', tenantId: 'centre'}})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: (...args: unknown[]) => mocks.query(...args)}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
import ExamsDashboard from '@/pages/exams/ExamsDashboard';
import QADashboard from '@/pages/qa/QADashboard';
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.query.mockReturnValue({data: [], loading: false, error: null, refetch: vi.fn()});});
it('shows recorded exams without manufactured dates, halls or invigilators', () => {
  mocks.query.mockReturnValue({data: [{id: 'exam', title: 'Recorded exam', start_date: '2026-11-01T09:00:00Z', location: null}], loading: false, error: null});
  render(<MemoryRouter initialEntries={['/exams']}><ExamsDashboard/></MemoryRouter>);
  expect(screen.getByText('Recorded exam')).toBeInTheDocument(); expect(screen.getByText('Location: Not assigned')).toBeInTheDocument(); expect(screen.queryByText('Hall A')).not.toBeInTheDocument();
  expect(mocks.query.mock.calls[0][1].filters).toContainEqual({column: 'tenant_id', operator: 'eq', value: 'centre'});
});
it('opens requested exam sections and does not falsely claim to save incidents', () => {
  render(<MemoryRouter initialEntries={['/exams/incidents']}><ExamsDashboard/></MemoryRouter>);
  expect(screen.getByText(/persistent exam incident workflow is not connected/)).toBeInTheDocument(); expect(screen.queryByRole('button', {name: /Log Incident/})).not.toBeInTheDocument();
});
it('does not present failed exam queries as no exams', () => {
  mocks.query.mockReturnValue({data: [], error: 'denied', loading: false});render(<MemoryRouter><ExamsDashboard/></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded'); expect(screen.queryByText('No exam events have been recorded.')).not.toBeInTheDocument();
});
it('QA review opens actual details without inventing AI or moderation decisions', () => {
  mocks.query.mockImplementation(table => ({data: table === 'submissions' ? [{id: 's', assignment_id: 'a', student_name: 'Learner', status: 'graded', grade: 75, plagiarism_score: null, submitted_at: '2026-10-01', feedback: 'Recorded feedback'}] : [{id: 'a', title: 'Assignment'}], loading: false, error: null}));
  render(<QADashboard/>); expect(screen.getByText('Not available')).toBeInTheDocument(); expect(screen.queryByText('AI Detected')).not.toBeInTheDocument(); expect(screen.queryByText('approved')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Review Learner'})); expect(screen.getByRole('dialog')).toHaveTextContent('Recorded feedback');
});
it('QA paginates rather than silently hiding later submissions', () => {
  mocks.query.mockImplementation(table => ({data: table === 'submissions' ? Array.from({length: 21}, (_, i) => ({id: String(i), student_name: `Learner ${i}`, status: 'submitted', grade: null, plagiarism_score: null})) : [], loading: false, error: null}));
  render(<QADashboard/>); expect(screen.queryByText('Learner 20')).not.toBeInTheDocument(); fireEvent.click(screen.getByText('Next submissions')); expect(screen.getByText('Learner 20')).toBeInTheDocument();
});
