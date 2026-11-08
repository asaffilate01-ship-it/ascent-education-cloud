import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useLocation, useNavigate} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import IndependentMarkerQueue from '@/pages/assessor/IndependentMarkerQueue';
import {confirmedMarkReceipt} from '@/lib/assessment/markReceipt';

type Row = Record<string, unknown>;
type Reply = {data?: unknown; error: null | {message: string}};
type Query = {table: string; columns: string; filters: {column: string; value: unknown; kind: 'eq' | 'in'}[]; start: number; end: number; limit: number; order: string};
const mock = vi.hoisted(() => ({
  user: {id: 'marker', tenantId: 'centre', role: 'assessor', roles: ['assessor']} as {id: string; tenantId: string; role: string; roles: string[]} | null,
  loading: false, tables: {} as Record<string, Row[]>, queries: [] as Query[], override: vi.fn(),
  rpc: vi.fn(), invoke: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.loading})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children, title}: {children: React.ReactNode; title: string}) => <main><h1>{title}</h1>{children}</main>}));
vi.mock('@/components/assessment/CourseworkFiles', () => ({default: () => null}));
vi.mock('@/components/assessment/EvidenceReview', () => ({default: ({text}: {text: string}) => <p>{text}</p>}));
vi.mock('@/components/assessment/MarkHistory', () => ({default: () => <p>Submitted marking history</p>}));
vi.mock('@/components/assessment/PrivateDraftHistory', () => ({default: () => null}));
vi.mock('@/components/assessment/CentreFeedbackLibrary', () => ({default: () => null}));
vi.mock('@/components/assessment/FeedbackLibrary', () => ({default: () => null}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {functions: {invoke: mock.invoke}}}));
vi.mock('sonner', () => ({toast: {success: mock.success, error: mock.error}}));
vi.mock('@/lib/db', () => ({db: {
  rpc: mock.rpc,
  from: (table: string) => {
    const query: Query = {table, columns: '', filters: [], start: 0, end: Infinity, limit: Infinity, order: ''};
    const run = async (): Promise<Reply> => {
      const captured = structuredClone(query); mock.queries.push(captured);
      const override = mock.override(captured); if (override !== undefined) return override;
      const rows = (mock.tables[table] || []).filter(row => query.filters.every(filter => filter.kind === 'eq'
        ? row[filter.column] === filter.value : (filter.value as unknown[]).includes(row[filter.column])));
      rows.sort((a, b) => String(a[query.order] || '').localeCompare(String(b[query.order] || '')));
      return {data: structuredClone(rows.slice(query.start, query.end + 1).slice(0, query.limit)), error: null};
    };
    const builder = {
      select: (columns: string) => {query.columns = columns; return builder;},
      eq: (column: string, value: unknown) => {query.filters.push({column, value, kind: 'eq'}); return builder;},
      in: (column: string, value: unknown[]) => {query.filters.push({column, value, kind: 'in'}); return builder;},
      order: (column: string) => {query.order = column; return builder;},
      limit: (value: number) => {query.limit = value; return builder;},
      range: (start: number, end: number) => {query.start = start; query.end = end; return builder;},
      then: (resolve: (reply: Reply) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return builder;
  },
}}));
const ATTEMPTS = 'unipathway_assessment_attempts', ALLOCATIONS = 'unipathway_assessment_allocations', AI = 'unipathway_assessment_ai_drafts';
const ONE = '00000000-0000-4000-8000-000000000001', TWO = '00000000-0000-4000-8000-000000000002';
const feedback = 'Your explanation supports the stated method. Compare the alternative approaches and support each conclusion with evidence from your tests.';
const guidance = 'Add the missing boundary tests, compare expected and actual output, and explain how each result supports the learning outcomes.';
const criterion = (code: string) => ({code, points: 0, evidence: 'Submitted text, line 1', reason: 'The stated evidence does not yet demonstrate a complete explanation of this criterion.', missing: 'The required explanation is absent.'});
const attempt = (id: string, index = 1): Row => ({id, tenant_id: 'centre', brief_id: 'brief', student_id: `learner-${index}`, attempt_no: index,
  evidence_text: `Original evidence for submission ${index}`, status: 'submitted', submitted_at: '2026-11-08T08:00:00Z', resubmission_guidance: null});
const savedDraft = (id = ONE, content = feedback): Row => ({attempt_id: id, tenant_id: 'centre', marker_id: 'marker', revision: 3, updated_at: '2026-11-08T09:00:00Z',
  criteria: {A: criterion('A'), B: criterion('B')}, feedback: content, guidance});
const aiDraft = (): Row => ({id: 'advisory', attempt_id: ONE, tenant_id: 'centre', criteria_results: [], suggested_raw_score: 0, strengths: 'Example', missing_work: 'Boundary tests', feedback: 'Advisory feedback', created_at: '2026-11-08T10:00:00Z'});
function deferred<T>() {let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}
function Navigation() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(`/assessor/queue?attempt=${TWO}`)}>Force other selection</button>
    <button onClick={() => navigate(`/assessor/queue?attempt=${ONE}`)}>Force original selection</button></>;
}
function App() {return <MemoryRouter initialEntries={[`/assessor/queue?attempt=${ONE}`]}><Navigation/><IndependentMarkerQueue/></MemoryRouter>;}
async function open() {const view = render(<App/>); await screen.findByLabelText('Individual written feedback'); return view;}
async function review() {fireEvent.click(screen.getByRole('button', {name: 'Send independent human mark to IQA'})); return screen.findByRole('dialog', {name: 'Review mark'});}
async function submit() {const dialog = await review(); await act(async () => {fireEvent.click(within(dialog).getByRole('button', {name: 'Submit mark for IQA'}));});}
const send = () => screen.getByRole('button', {name: 'Send independent human mark to IQA'});
const hasFilter = (query: Query, column: string, value: unknown) => query.filters.some(filter => filter.column === column && filter.value === value);
function draftReceipt(payload: Record<string, unknown>): Reply {return {data: {attempt_id: payload.p_attempt, marker_id: 'marker', tenant_id: 'centre', revision: Number(payload.p_revision) + 1,
  updated_at: '2026-11-08T10:00:00Z', criteria: payload.p_criteria, feedback: payload.p_feedback, guidance: payload.p_guidance}, error: null};}
beforeEach(() => {
  mock.user = {id: 'marker', tenantId: 'centre', role: 'assessor', roles: ['assessor']}; mock.loading = false; mock.queries = [];
  mock.override.mockReset(); mock.rpc.mockReset().mockResolvedValue({data: 0, error: null}); mock.invoke.mockReset().mockResolvedValue({data: {}, error: null}); mock.success.mockReset(); mock.error.mockReset();
  mock.tables = {
    [ATTEMPTS]: [attempt(ONE), attempt(TWO, 2)], [ALLOCATIONS]: [ONE, TWO].map(id => ({attempt_id: id, marker_id: 'marker', tenant_id: 'centre'})), [AI]: [],
    unipathway_assessment_briefs: [{id: 'brief', tenant_id: 'centre', title: 'Boundary testing assessment', lecturer_id: 'lecturer', learning_outcomes: 'Test and explain', teaching_summary: 'Test methods', student_expectations: 'Provide explanation', required_evidence: 'Test results', policy_reference: 'Policy 4', max_attempts: 3, submission_cutoff: '2099-12-01T00:00:00Z'}],
    unipathway_assessment_criteria: ['A', 'B'].map((code, index) => ({id: code, tenant_id: 'centre', brief_id: 'brief', criterion_code: code, criterion_description: `Criterion ${code}`, learning_outcome: 'Explain the evidence', scoring_guidance: 'Award for evidence', max_points: 50, display_order: index})),
    uni_marking_drafts: [savedDraft(), savedDraft(TWO, 'Saved feedback for the second learner')],
  };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

describe('numeric mark receipt contract', () => {
  it.each([0, 0.5, 75, 99.999, 100])('confirms finite numeric %s', value => expect(confirmedMarkReceipt(value)).toBe(true));
  it.each([null, undefined, '', '0', '75', NaN, Infinity, -Infinity, -1, 100.01, {}, [], {score: 75}])('rejects a non-receipt %s', value => expect(confirmedMarkReceipt(value)).toBe(false));
});
it('reviews the named exact attempt and accepts zero only as a private IQA receipt', async () => {
  await open(); const dialog = await review();
  expect(within(dialog).getByText('Boundary testing assessment')).toBeInTheDocument(); expect(within(dialog).getByText('Attempt 1')).toBeInTheDocument(); expect(within(dialog).getByText(ONE)).toBeInTheDocument();
  expect(within(dialog).getByText(feedback)).toBeInTheDocument(); expect(mock.rpc).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Keep editing'})); expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback); expect(mock.rpc).not.toHaveBeenCalled();
  await submit(); await screen.findByText('Mark submitted for IQA review');
  expect(screen.getByText('Recorded private score: 0/100')).toBeInTheDocument(); expect(screen.getByText(ONE)).toBeInTheDocument();
  expect(screen.getByText(/Independent IQA review and the separate release step/)).toBeInTheDocument(); expect(screen.getByTestId('location')).toHaveTextContent('/assessor/queue'); expect(screen.getByTestId('location')).not.toHaveTextContent('attempt=');
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('record_unipathway_human_mark', {p_attempt: ONE, p_criteria: [criterion('A'), criterion('B')], p_feedback: feedback});
});
it.each([null, undefined, '0', NaN, -1, 101, {score: 50}])('retains the selected draft and blocks another mark after malformed receipt %s', async data => {
  mock.rpc.mockResolvedValue({data, error: null}); await open();
  fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: feedback + ' Retain this edit.'}});
  await submit(); await screen.findByText('Mark not confirmed');
  expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback + ' Retain this edit.'); expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${ONE}`);
  expect(send()).toBeDisabled(); expect(screen.getByRole('button', {name: 'Save private draft'})).toBeDisabled();
  fireEvent.click(send()); expect(mock.rpc).toHaveBeenCalledTimes(1); expect(mock.success).not.toHaveBeenCalled();
});
it('checks a fresh exact allocation and submitted attempt before permitting the same reviewed payload to be retried', async () => {
  mock.rpc.mockResolvedValueOnce({data: null, error: null}).mockResolvedValueOnce({data: 0, error: null}); await open(); await submit(); await screen.findByText('Mark not confirmed');
  const queryCount = mock.queries.length; fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await waitFor(() => expect(send()).toBeEnabled());
  const checks = mock.queries.slice(queryCount); expect(checks.map(query => query.table)).toEqual([ALLOCATIONS, ATTEMPTS]);
  expect(checks.every(query => hasFilter(query, 'tenant_id', 'centre') && query.limit === 2)).toBe(true);
  expect(hasFilter(checks[0], 'attempt_id', ONE) && hasFilter(checks[0], 'marker_id', 'marker')).toBe(true); expect(hasFilter(checks[1], 'id', ONE)).toBe(true);
  expect(mock.rpc).toHaveBeenCalledTimes(1); expect(screen.getByText(/No mark was sent by this check/)).toBeInTheDocument();
  await submit(); await screen.findByText('Mark submitted for IQA review'); expect(mock.rpc.mock.calls[1]).toEqual(mock.rpc.mock.calls[0]);
});
it.each(['human_marked', 'qa_approved', 'released', 'resubmission_requested'])('keeps progressed %s truthful without claiming this payload or score was confirmed', async status => {
  mock.rpc.mockResolvedValue({data: null, error: null}); await open(); await submit(); await screen.findByText('Mark not confirmed'); mock.tables[ATTEMPTS][0].status = status;
  fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await screen.findByText(/earlier response did not confirm this exact draft/);
  expect(screen.queryByText('Mark submitted for IQA review')).toBeNull(); expect(screen.queryByText(/Recorded private score/)).toBeNull(); expect(screen.queryByRole('button', {name: 'Send independent human mark to IQA'})).toBeNull();
  fireEvent.click(screen.getByText('Retained reviewed draft')); expect(screen.getByText(feedback)).toBeInTheDocument(); expect(mock.rpc).toHaveBeenCalledTimes(1); expect(mock.success).not.toHaveBeenCalled();
});
it.each(['allocation missing', 'allocation mismatched', 'duplicate allocation', 'wrong learner', 'wrong brief', 'wrong attempt number', 'wrong tenant', 'unknown status', 'status read error'])('keeps retry blocked after %s in fresh authorized verification', async defect => {
  mock.rpc.mockResolvedValue({data: null, error: null}); await open(); await submit(); await screen.findByText('Mark not confirmed');
  mock.override.mockImplementation((query: Query) => {
    if (query.limit !== 2) return undefined;
    if (query.table === ALLOCATIONS) {
      if (defect === 'allocation missing') return {data: [], error: null};
      if (defect === 'allocation mismatched') return {data: [{...mock.tables[ALLOCATIONS][0], marker_id: 'different'}], error: null};
      if (defect === 'duplicate allocation') return {data: [mock.tables[ALLOCATIONS][0], mock.tables[ALLOCATIONS][0]], error: null};
    }
    if (query.table === ATTEMPTS) {
      if (defect === 'status read error') return {data: null, error: {message: 'Lookup unavailable'}};
      const row = {...mock.tables[ATTEMPTS][0]};
      if (defect === 'wrong learner') row.student_id = 'other'; if (defect === 'wrong brief') row.brief_id = 'other'; if (defect === 'wrong attempt number') row.attempt_no = 2;
      if (defect === 'wrong tenant') row.tenant_id = 'other'; if (defect === 'unknown status') row.status = 'probably-submitted'; return {data: [row], error: null};
    }
  });
  fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await screen.findByText(/another mark is still blocked/);
  expect(send()).toBeDisabled(); expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback); expect(mock.rpc).toHaveBeenCalledTimes(1); expect(mock.success).not.toHaveBeenCalled();
});
it('retains separate uncertainty while switching A to B and back to A', async () => {
  mock.rpc.mockResolvedValue({data: null, error: null}); await open(); await submit(); await screen.findByText('Mark not confirmed');
  fireEvent.click(screen.getByRole('button', {name: /Anonymised ref 00000000 · attempt 2/})); await waitFor(() => expect(screen.getByLabelText('Individual written feedback')).toHaveValue('Saved feedback for the second learner'));
  expect(screen.queryByText('Mark not confirmed')).toBeNull(); fireEvent.click(screen.getByRole('button', {name: /Anonymised ref 00000000 · attempt 1/}));
  await screen.findByText('Mark not confirmed'); await waitFor(() => expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback)); expect(send()).toBeDisabled(); expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it.each(['read error', 'null data', 'null row', 'duplicate rows', 'invalid revision', 'invalid timestamp'])('keeps the reviewed draft after A to B to A when metadata has %s, then recovers it without discard', async defect => {
  mock.rpc.mockResolvedValue({data: null, error: null}); await open();
  const localFeedback = feedback + ' Private additions still to save.', localGuidance = guidance + ' Keep this guidance.';
  fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: localFeedback}});
  fireEvent.change(screen.getByLabelText('Resubmission guidance'), {target: {value: localGuidance}});
  fireEvent.change(screen.getAllByLabelText('Awarded points (not a final student grade)')[0], {target: {value: '7'}});
  await submit(); await screen.findByText('Mark not confirmed'); fireEvent.click(screen.getByText('Force other selection'));
  await waitFor(() => expect(screen.getByLabelText('Individual written feedback')).toHaveValue('Saved feedback for the second learner'));
  mock.override.mockImplementation((query: Query) => {
    if (query.table !== 'uni_marking_drafts' || !hasFilter(query, 'attempt_id', ONE)) return undefined;
    if (query.limit === 1 || defect === 'read error') return {data: null, error: {message: 'Saved-draft connection interrupted'}};
    if (defect === 'null data') return {data: null, error: null};
    if (defect === 'null row') return {data: [null], error: null};
    if (defect === 'duplicate rows') return {data: [savedDraft(), savedDraft()], error: null};
    if (defect === 'invalid revision') return {data: [{...savedDraft(), revision: '3'}], error: null};
    return {data: [{...savedDraft(), updated_at: 'invalid'}], error: null};
  });
  fireEvent.click(screen.getByText('Force original selection')); await screen.findByText(/Saved draft could not be checked/);
  fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await screen.findByText(/another mark is still blocked/);
  expect(screen.getByText('Mark not confirmed')).toBeInTheDocument(); expect(screen.queryByLabelText('Individual written feedback')).toBeNull(); expect(mock.rpc).toHaveBeenCalledTimes(1);
  mock.override.mockReset(); fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await waitFor(() => expect(send()).toBeEnabled());
  expect(screen.getByLabelText('Individual written feedback')).toHaveValue(localFeedback); expect(screen.getByLabelText('Resubmission guidance')).toHaveValue(localGuidance);
  expect(screen.getAllByLabelText('Awarded points (not a final student grade)')[0]).toHaveValue(7); expect(screen.getByRole('button', {name: 'Save private draft'})).toBeEnabled();
  expect(screen.queryByText('Mark not confirmed')).toBeNull(); expect(mock.rpc).toHaveBeenCalledTimes(1); expect(window.confirm).not.toHaveBeenCalled();
});
it('takes one synchronous shared lock across duplicate confirmation and the other mutation controls', async () => {
  const pending = deferred<Reply>(); mock.rpc.mockReturnValue(pending.promise); await open(); const dialog = await review(); const confirm = within(dialog).getByRole('button', {name: 'Submit mark for IQA'});
  act(() => {fireEvent.click(confirm); fireEvent.click(confirm);}); expect(mock.rpc).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Save private draft')); fireEvent.click(screen.getByText('Request permitted revision')); fireEvent.click(screen.getByText('Analyse criteria')); expect(mock.rpc).toHaveBeenCalledTimes(1); expect(mock.invoke).not.toHaveBeenCalled();
  await act(async () => pending.resolve({data: 0, error: null})); await screen.findByText('Mark submitted for IQA review');
});
it('retains an uncertain mark and releases the lock when the marking promise throws', async () => {
  mock.rpc.mockRejectedValue(Error('Network response lost')); await open(); await submit(); await screen.findByText(/Network response lost/); expect(send()).toBeDisabled();
  expect(screen.getByRole('button', {name: 'Check marking status'})).toBeEnabled(); expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback);
});
it.each(['account', 'centre', 'active role', 'membership removal', 'auth loading', 'selection', 'unmount'])('suppresses late marking effects after %s changes', async boundary => {
  const pending = deferred<Reply>(); mock.rpc.mockReturnValue(pending.promise); const view = await open(); await submit(); expect(mock.rpc).toHaveBeenCalledTimes(1);
  if (boundary === 'account') mock.user = {...mock.user!, id: 'other-marker'};
  if (boundary === 'centre') mock.user = {...mock.user!, tenantId: 'other-centre'};
  if (boundary === 'active role') mock.user = {...mock.user!, role: 'programme_leader', roles: ['assessor', 'programme_leader']};
  if (boundary === 'membership removal') mock.user = {...mock.user!, roles: []};
  if (boundary === 'auth loading') mock.loading = true;
  if (boundary === 'selection') {fireEvent.click(screen.getByText('Force other selection')); await screen.findByText('Original evidence for submission 2');}
  else if (boundary === 'unmount') view.unmount(); else view.rerender(<App/>);
  const queriesBefore = mock.queries.length; await act(async () => pending.resolve({data: 0, error: null}));
  expect(mock.success).not.toHaveBeenCalled(); expect(mock.error).not.toHaveBeenCalled(); expect(screen.queryByText('Mark submitted for IQA review')).toBeNull();
  if (boundary === 'selection') {expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${TWO}`); expect(mock.queries.length).toBe(queriesBefore); fireEvent.click(screen.getByText('Force original selection')); await screen.findByText('Mark not confirmed'); expect(send()).toBeDisabled();}
});
it('ignores a late failed mark after the selected attempt changed', async () => {
  const pending = deferred<Reply>(); mock.rpc.mockReturnValue(pending.promise); await open(); await submit(); fireEvent.click(screen.getByText('Force other selection')); await screen.findByLabelText('Individual written feedback');
  fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: 'New work for the second learner'}});
  await act(async () => pending.reject(Error('Old submission error'))); expect(mock.error).not.toHaveBeenCalled(); expect(screen.getByLabelText('Individual written feedback')).toHaveValue('New work for the second learner'); expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${TWO}`);
});
it('ignores a late status check after selection changes and leaves the original uncertainty recoverable', async () => {
  mock.rpc.mockResolvedValue({data: null, error: null}); await open(); await submit(); await screen.findByText('Mark not confirmed');
  const pending = deferred<Reply>(); mock.override.mockImplementation((query: Query) => query.table === ATTEMPTS && query.limit === 2 ? pending.promise : undefined);
  fireEvent.click(screen.getByRole('button', {name: 'Check marking status'})); await waitFor(() => expect(mock.queries.some(query => query.table === ATTEMPTS && query.limit === 2)).toBe(true));
  fireEvent.click(screen.getByText('Force other selection')); await screen.findByText('Original evidence for submission 2'); await act(async () => pending.resolve({data: [attempt(ONE)], error: null}));
  expect(screen.queryByText(/Current status verified/)).toBeNull(); fireEvent.click(screen.getByText('Force original selection')); await screen.findByText('Mark not confirmed'); expect(send()).toBeDisabled();
});
it('prevents reads and mutations while authentication is loading or the active role is unverified', async () => {
  mock.loading = true; const view = render(<App/>); expect(screen.getByText('Checking assessment access…')).toBeInTheDocument(); expect(mock.queries).toEqual([]);
  mock.loading = false; mock.user = {...mock.user!, roles: []}; view.rerender(<App/>); await screen.findByText(/A verified active assessment role/); expect(mock.queries).toEqual([]); expect(mock.rpc).not.toHaveBeenCalled();
});
it('does not treat an inactive assessor membership as an active assessment role', async () => {
  mock.user = {...mock.user!, role: 'student', roles: ['student', 'assessor']}; render(<App/>); await screen.findByText(/A verified active assessment role/); expect(mock.queries).toEqual([]);
});
it('preserves an open review when the same verified memberships arrive in a different order', async () => {
  mock.user = {...mock.user!, roles: ['assessor', 'programme_leader']}; const view = await open(); await review(); mock.user = {...mock.user!, roles: ['programme_leader', 'assessor']}; view.rerender(<App/>);
  const dialog = screen.getByRole('dialog', {name: 'Review mark'}); expect(dialog).toBeInTheDocument(); expect(within(dialog).getByText(feedback)).toBeInTheDocument(); expect(mock.rpc).not.toHaveBeenCalled();
});
it.each([null, undefined])('preserves the successful void resubmission contract with data %s', async data => {
  mock.rpc.mockResolvedValue({data, error: null}); await open(); fireEvent.click(screen.getByRole('button', {name: 'Request permitted revision'}));
  await waitFor(() => expect(mock.success).toHaveBeenCalledWith('Individual guidance sent for a permitted resubmission, no score released.'));
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('request_unipathway_assessment_resubmission', {p_attempt: ONE, p_guidance: guidance}); expect(screen.getByTestId('location')).not.toHaveTextContent('attempt=');
});
it('retains guidance and releases the lock when resubmission throws', async () => {
  mock.rpc.mockRejectedValue(Error('Revision request unavailable')); await open(); fireEvent.click(screen.getByRole('button', {name: 'Request permitted revision'})); await screen.findByText('Revision request unavailable');
  expect(screen.getByLabelText('Resubmission guidance')).toHaveValue(guidance); expect(screen.getByRole('button', {name: 'Request permitted revision'})).toBeEnabled(); expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${ONE}`);
});
it.each([undefined, null, {}])('does not mistake a missing resubmission response %s for the successful void contract', async response => {
  mock.rpc.mockResolvedValue(response); await open(); fireEvent.click(screen.getByRole('button', {name: 'Request permitted revision'})); await screen.findByText(/The resubmission response was not confirmed/);
  expect(screen.getByLabelText('Resubmission guidance')).toHaveValue(guidance); expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${ONE}`); expect(mock.success).not.toHaveBeenCalled();
});
it('ignores late resubmission completion after the selected attempt changes', async () => {
  const pending = deferred<Reply>(); mock.rpc.mockReturnValue(pending.promise); await open(); fireEvent.click(screen.getByRole('button', {name: 'Request permitted revision'})); fireEvent.click(screen.getByText('Force other selection')); await screen.findByText('Original evidence for submission 2');
  await act(async () => pending.resolve({data: null, error: null})); expect(mock.success).not.toHaveBeenCalled(); expect(screen.getByTestId('location')).toHaveTextContent(`attempt=${TWO}`);
});
it('keeps manual edits while refreshing only the authorized AI draft', async () => {
  mock.invoke.mockImplementation(async () => {mock.tables[AI] = [aiDraft()]; return {data: {}, error: null};}); await open(); fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: feedback + ' Manual addition.'}});
  const before = mock.queries.length; fireEvent.click(screen.getByRole('button', {name: 'Analyse criteria'})); await screen.findByText(/Model suggestion/);
  expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback + ' Manual addition.'); expect(mock.queries.slice(before).map(query => query.table)).toEqual([AI]); expect(mock.rpc).not.toHaveBeenCalled();
});
it('releases the shared lock after an AI invocation throws and keeps human marking available', async () => {
  mock.invoke.mockRejectedValue(Error('Advisory service unavailable')); await open(); fireEvent.click(screen.getByRole('button', {name: 'Analyse criteria'})); await screen.findByText('Advisory service unavailable'); expect(send()).toBeEnabled(); expect(screen.getByRole('button', {name: 'Analyse criteria'})).toBeEnabled(); expect(screen.getByLabelText('Individual written feedback')).toHaveValue(feedback);
});
it('suppresses a late AI invocation before it starts any draft read for the previous selection', async () => {
  const pending = deferred<Reply>(); mock.invoke.mockReturnValue(pending.promise); await open(); fireEvent.click(screen.getByRole('button', {name: 'Analyse criteria'})); fireEvent.click(screen.getByText('Force other selection')); await screen.findByText('Original evidence for submission 2');
  const reads = mock.queries.filter(query => query.table === AI).length; await act(async () => pending.resolve({data: {}, error: null})); expect(mock.queries.filter(query => query.table === AI)).toHaveLength(reads); expect(mock.success).not.toHaveBeenCalled(); expect(mock.error).not.toHaveBeenCalled();
});
it('suppresses a late AI draft read after selection changes', async () => {
  await open(); const pending = deferred<Reply>(); mock.override.mockImplementation((query: Query) => query.table === AI ? pending.promise : undefined);
  fireEvent.click(screen.getByRole('button', {name: 'Analyse criteria'})); await waitFor(() => expect(mock.queries.filter(query => query.table === AI).length).toBe(2));
  fireEvent.click(screen.getByText('Force other selection')); await screen.findByText('Original evidence for submission 2'); await act(async () => pending.resolve({data: [aiDraft()], error: null}));
  expect(screen.queryByText(/Model suggestion/)).toBeNull(); expect(mock.success).not.toHaveBeenCalled(); expect(mock.error).not.toHaveBeenCalled();
});
it('does not clear the next submission draft after a late exact private-draft receipt', async () => {
  const pending = deferred<Reply>(); mock.rpc.mockReturnValue(pending.promise); await open(); fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: 'Changed first learner wording'}}); fireEvent.click(screen.getByRole('button', {name: 'Save private draft'}));
  const payload = mock.rpc.mock.calls[0][1]; fireEvent.click(screen.getByText('Force other selection')); await waitFor(() => expect(screen.getByLabelText('Individual written feedback')).toHaveValue('Saved feedback for the second learner'));
  fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: 'Changed second learner wording'}}); await act(async () => pending.resolve(draftReceipt(payload)));
  expect(screen.getByLabelText('Individual written feedback')).toHaveValue('Changed second learner wording'); expect(screen.getByRole('button', {name: 'Save private draft'})).toBeEnabled(); expect(mock.success).not.toHaveBeenCalled();
});
it('does not replace the next submission fields with an older in-flight draft read', async () => {
  const pending = deferred<Reply>(); mock.override.mockImplementation((query: Query) => query.table === 'uni_marking_drafts' && hasFilter(query, 'attempt_id', ONE) ? pending.promise : undefined);
  render(<App/>); await screen.findByText('Original evidence for submission 1'); fireEvent.click(screen.getByText('Force other selection')); await waitFor(() => expect(screen.getByLabelText('Individual written feedback')).toHaveValue('Saved feedback for the second learner'));
  fireEvent.change(screen.getByLabelText('Individual written feedback'), {target: {value: 'New second learner draft'}}); await act(async () => pending.resolve({data: [savedDraft(ONE, 'Stale first learner draft')], error: null}));
  expect(screen.getByLabelText('Individual written feedback')).toHaveValue('New second learner draft'); expect(screen.queryByDisplayValue('Stale first learner draft')).toBeNull();
});
