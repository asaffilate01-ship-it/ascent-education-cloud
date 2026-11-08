import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AssessmentManager from '@/pages/programme/AssessmentManager';
import {managerRubricTotal, publicationBlockers, type ManagerBrief, type ManagerCriterion} from '@/lib/assessment/managerWorkspace';

type Row = Record<string, unknown>;
type Reply = {data: unknown; error: null | {message: string}};
type Query = {table: string; columns: string; filters: {column: string; value: unknown; kind: 'eq' | 'in'}[]; from: number; to: number; order: string; calls: string[]};
const mock = vi.hoisted(() => ({
  user: {id: 'manager', tenantId: 'centre', role: 'programme_leader', roles: ['programme_leader']} as {id: string; tenantId?: string; role: string; roles: string[]} | null,
  loading: false,
  tables: {} as Record<string, Row[]>, queries: [] as Query[], override: vi.fn(), rpc: vi.fn(), success: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.loading})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children, title}: {children: React.ReactNode; title: string}) => <main><h1>{title}</h1>{children}</main>}));
vi.mock('sonner', () => ({toast: {success: mock.success}}));
vi.mock('@/lib/db', () => ({db: {
  rpc: mock.rpc,
  from: (table: string) => {
    const query: Query = {table, columns: '', filters: [], from: 0, to: Infinity, order: '', calls: []};
    const run = async (): Promise<Reply> => {
      const captured = structuredClone(query); mock.queries.push(captured);
      const override = mock.override(captured);
      if (override !== undefined) return override;
      const rows = (mock.tables[table] || []).filter(row => query.filters.every(filter => filter.kind === 'eq'
        ? row[filter.column] === filter.value : (filter.value as unknown[]).includes(row[filter.column])));
      rows.sort((a, b) => String(a[query.order] || '').localeCompare(String(b[query.order] || '')));
      return {data: structuredClone(rows.slice(query.from, query.to + 1)), error: null};
    };
    const builder = {
      select: (columns: string) => {query.columns = columns; query.calls.push('select'); return builder;},
      eq: (column: string, value: unknown) => {query.filters.push({column, value, kind: 'eq'}); query.calls.push('eq:' + column); return builder;},
      in: (column: string, value: unknown[]) => {query.filters.push({column, value, kind: 'in'}); query.calls.push('in:' + column); return builder;},
      order: (column: string) => {query.order = column; query.calls.push('order'); return builder;},
      range: (from: number, to: number) => {query.from = from; query.to = to; query.calls.push('range'); return builder;},
      then: (resolve: (reply: Reply) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return builder;
  },
}}));

const BRIEFS = 'unipathway_assessment_briefs', CRITERIA = 'unipathway_assessment_criteria', ATTEMPTS = 'unipathway_assessment_attempts', ALLOCATIONS = 'unipathway_assessment_allocations';
const uuid = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const BRIEF = uuid(1), PUBLISHED = uuid(2), ATTEMPT = uuid(3), STUDENT = uuid(4), LECTURER = uuid(5), MARKER = uuid(6), IQA = uuid(7), MODULE = uuid(8);
const brief = (id = BRIEF, extra: Partial<ManagerBrief> = {}): ManagerBrief => ({
  id, tenant_id: 'centre', lecturer_id: LECTURER, module_id: MODULE, title: 'Boundary testing coursework',
  status: 'draft', assessment_type: 'coursework', created_at: '2026-11-01T09:00:00Z', updated_at: '2026-11-01T09:00:00Z',
  teaching_summary: 'We demonstrated ordinary and boundary inputs and compared the observed results with expected outcomes.',
  learning_outcomes: 'Design, test and explain a reliable solution using evidence.',
  student_expectations: 'Explain your own approach and connect every conclusion to specific test evidence.',
  required_evidence: 'Submit source code, a reproducible test table and a written explanation.',
  teaching_date: '2026-11-01T09:00:00Z', due_at: '2099-02-15T08:00:00Z', submission_cutoff: '2099-02-20T08:00:00Z',
  max_attempts: 2, penalty_points_per_resubmission: 2.5, policy_reference: 'Assessment policy / section 4', rubric_version: 'v3',
  published_at: null, published_by: null, ...extra,
});
const criterion = (index: number, briefId = BRIEF, points = 50): ManagerCriterion => ({
  id: uuid(100 + index), tenant_id: 'centre', brief_id: briefId, criterion_code: `LO${index}.P1`,
  learning_outcome: `Learning outcome ${index}: explain the evidence and observed result.`,
  criterion_description: `Criterion ${index}: demonstrate a clear design and accurate evidence from the tests.`,
  scoring_guidance: `Guidance ${index}: explain full, partial and zero credit using the submitted evidence.`,
  max_points: points, display_order: index,
});
const attempt = (id = ATTEMPT, extra: Row = {}) => ({id, tenant_id: 'centre', brief_id: PUBLISHED, student_id: STUDENT, attempt_no: 1, status: 'submitted', submitted_at: '2026-11-01T09:00:00Z', ...extra});
const allocation = (id = ATTEMPT, extra: Row = {}) => ({attempt_id: id, tenant_id: 'centre', marker_id: MARKER, qa_reviewer_id: IQA, ...extra});
const hasFilter = (query: Query, column: string, value: unknown) => query.filters.some(filter => filter.column === column && filter.value === value);
const selectedBrief = (query: Query) => query.table === BRIEFS && hasFilter(query, 'id', BRIEF);
function deferred<T>() {let resolve!: (value: T) => void; const promise = new Promise<T>(done => {resolve = done;}); return {promise, resolve};}

beforeEach(() => {
  mock.user = {id: 'manager', tenantId: 'centre', role: 'programme_leader', roles: ['programme_leader']}; mock.loading = false;
  mock.tables = {
    [BRIEFS]: [brief(), brief(PUBLISHED, {title: 'Older published coursework', status: 'published'})],
    [CRITERIA]: [criterion(2), criterion(1)], [ATTEMPTS]: [attempt()], [ALLOCATIONS]: [],
    user_roles: [MARKER, LECTURER, STUDENT].map(user_id => ({user_id, tenant_id: 'centre', role: 'assessor'}))
      .concat([MARKER, IQA, LECTURER, STUDENT].map(user_id => ({user_id, tenant_id: 'centre', role: 'iqa_officer'}))),
  };
  mock.queries = []; mock.override.mockReset(); mock.success.mockReset();
  mock.rpc.mockReset().mockImplementation(async (name: string, args: Record<string, string>) => {
    if (name === 'publish_unipathway_assessment_brief') mock.tables[BRIEFS].find(row => row.id === args.p_brief)!.status = 'published';
    if (name === 'allocate_unipathway_independent_marker') mock.tables[ALLOCATIONS].push(allocation(args.p_attempt, {marker_id: args.p_marker, qa_reviewer_id: args.p_quality_reviewer}));
    return {data: null, error: null};
  });
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

async function openPublication() {
  const button = await screen.findByRole('button', {name: `Review brief: ${brief().title} (${BRIEF})`});
  fireEvent.click(button);
  const dialog = await screen.findByRole('dialog', {name: 'Review assessment: ' + brief().title});
  await within(dialog).findByRole('region', {name: 'Reviewed assessment brief'});
  return dialog;
}
async function openAllocation() {
  const marker = await screen.findByLabelText('Independent assessor for submission ' + ATTEMPT);
  await waitFor(() => expect(marker).toBeEnabled());
  fireEvent.change(marker, {target: {value: MARKER}});
  fireEvent.change(screen.getByLabelText('IQA reviewer for submission ' + ATTEMPT), {target: {value: IQA}});
  fireEvent.click(screen.getByRole('button', {name: `Review allocation: Older published coursework, attempt 1 (${ATTEMPT})`}));
  const dialog = await screen.findByRole('dialog', {name: 'Review allocation: Older published coursework'});
  await within(dialog).findByRole('region', {name: 'Reviewed independent allocation'});
  return dialog;
}

it('shows the complete named brief, ordered rubric and Pakistan policy before publishing, including a permitted fractional penalty', async () => {
  render(<AssessmentManager/>);
  expect(screen.queryByRole('button', {name: 'Publish reviewed assessment'})).toBeNull();
  const dialog = await openPublication();
  for (const text of [brief().teaching_summary, brief().learning_outcomes, brief().student_expectations, brief().required_evidence,
    brief().policy_reference, criterion(1).learning_outcome, criterion(1).criterion_description, criterion(1).scoring_guidance,
    criterion(2).learning_outcome, criterion(2).criterion_description, criterion(2).scoring_guidance, BRIEF, MODULE, LECTURER]) {
    expect(within(dialog).getByText(text)).toBeInTheDocument();
  }
  expect(within(dialog).getByText('2.5 points per resubmission')).toBeInTheDocument();
  expect(within(dialog).getByText(/Pakistan time \(Asia\/Karachi\)/)).toBeInTheDocument();
  expect(within(dialog).getAllByRole('article').map(article => article.getAttribute('aria-label'))).toEqual(['Rubric criterion LO1.P1', 'Rubric criterion LO2.P1']);
  expect(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'})).toBeEnabled();
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.queries.filter(query => query.table === CRITERIA).every(query => hasFilter(query, 'tenant_id', 'centre') && hasFilter(query, 'brief_id', BRIEF))).toBe(true);
});

it('accepts successful void publication and prevents duplicate clicks while keeping the reviewed identity', async () => {
  const response = deferred<Reply>(); mock.rpc.mockReturnValue(response.promise);
  render(<AssessmentManager/>); const dialog = await openPublication();
  const publish = within(dialog).getByRole('button', {name: 'Publish reviewed assessment'});
  fireEvent.click(publish); fireEvent.click(publish);
  await waitFor(() => expect(mock.rpc).toHaveBeenCalledTimes(1));
  expect(mock.rpc).toHaveBeenCalledWith('publish_unipathway_assessment_brief', {p_brief: BRIEF});
  expect(within(dialog).getByText(brief().teaching_summary)).toBeInTheDocument();
  expect(publish).toBeDisabled();
  await act(async () => response.resolve({data: null, error: null}));
  await within(dialog).findByText(/Assessment published\. Enrolled students/);
  expect(within(dialog).getByRole('status')).toHaveTextContent('Assessment published.');
  expect(within(dialog).queryByRole('button', {name: 'Publish reviewed assessment'})).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Close review'}));
  expect(screen.getByRole('region', {name: 'Retained assessment review'})).toHaveTextContent('Assessment published.');
});

it('blocks a changed same-ID brief before RPC and requires an explicit new review', async () => {
  render(<AssessmentManager/>); const dialog = await openPublication();
  const changed = 'The lecturer added a new required boundary case and changed the teaching explanation after this review.';
  mock.tables[BRIEFS][0].teaching_summary = changed;
  fireEvent.click(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'}));
  await within(dialog).findByText(/assessment or rubric changed since this review/i);
  expect(within(dialog).getByText(brief().teaching_summary)).toBeInTheDocument();
  expect(within(dialog).queryByText(changed)).toBeNull(); expect(mock.rpc).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Reload current review'}));
  await within(dialog).findByText(changed);
  expect(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'})).toBeEnabled();
});

it.each(['error reply', 'interrupted reply', 'missing reply'])('retains an uncertain publication after %s and checks status before any retry', async failure => {
  if (failure === 'error reply') mock.rpc.mockResolvedValue({data: null, error: {message: 'Request could not be completed'}});
  else if (failure === 'interrupted reply') mock.rpc.mockRejectedValue(Error('Connection lost'));
  else mock.rpc.mockResolvedValue(undefined);
  render(<AssessmentManager/>); let dialog = await openPublication();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'}));
  await within(dialog).findByRole('button', {name: 'Check publication status'});
  expect(mock.success).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Close and keep review'}));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', {name: /Review brief:/})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Resume assessment review'}));
  dialog = screen.getByRole('dialog');
  mock.tables[BRIEFS][0].status = 'published';
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check publication status'}));
  await within(dialog).findByText(/Publication verified\./);
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByText(brief().teaching_summary)).toBeInTheDocument();
});

it('retains a failed status check, then permits only the same reviewed publication after a verified draft read', async () => {
  mock.rpc.mockRejectedValueOnce(Error('Connection lost'));
  render(<AssessmentManager/>); const dialog = await openPublication();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'}));
  await within(dialog).findByRole('button', {name: 'Check publication status'});
  mock.override.mockImplementation((query: Query) => selectedBrief(query) ? {data: null, error: {message: 'Read failed'}} : undefined);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check publication status'}));
  await within(dialog).findByText(/current records could not be verified/);
  expect(within(dialog).queryByRole('button', {name: 'Publish reviewed assessment'})).toBeNull();
  mock.override.mockReset();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check publication status'}));
  await within(dialog).findByText(/still a draft with the same reviewed content/);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'}));
  await within(dialog).findByText(/Assessment published\./);
  expect(mock.rpc.mock.calls).toEqual([
    ['publish_unipathway_assessment_brief', {p_brief: BRIEF}], ['publish_unipathway_assessment_brief', {p_brief: BRIEF}],
  ]);
});

it('pages complete filtered queues, finds older drafts and resolves an older submission outside the draft list', async () => {
  const drafts = Array.from({length: 260}, (_, index) => brief(uuid(1000 + index), {title: `Draft assessment ${index}`, created_at: '2026-10-01T08:00:00Z'}));
  const published = brief(PUBLISHED, {title: 'Old published brief outside the draft filter', status: 'published'});
  const submitted = Array.from({length: 305}, (_, index) => attempt(uuid(2000 + index)));
  mock.tables[BRIEFS] = [...drafts, ...Array.from({length: 300}, (_, index) => brief(uuid(5000 + index), {status: 'published'})), published];
  mock.tables[ATTEMPTS] = [...submitted, ...Array.from({length: 310}, (_, index) => attempt(uuid(6000 + index), {status: 'human_marked'}))];
  mock.tables[ALLOCATIONS] = submitted.slice(0, -1).map(row => allocation(String(row.id)));
  render(<AssessmentManager/>);
  await screen.findByText('260 matching briefs · 260 in the selected status');
  await screen.findByText('1 matching submissions · 1 awaiting independent allocation');
  expect(screen.getAllByRole('button', {name: /Review brief:/})).toHaveLength(25);
  expect(screen.getByRole('heading', {name: published.title + ' · attempt 1'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Next briefs'}));
  expect(screen.getByText('Page 2 of 11')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Find a brief'), {target: {value: '259 Draft'}});
  expect(screen.getByRole('button', {name: `Review brief: Draft assessment 259 (${uuid(1259)})`})).toBeInTheDocument();
  expect(screen.getAllByRole('button', {name: /Review brief:/})).toHaveLength(1);
  expect(mock.queries.some(query => query.table === BRIEFS && query.from === 250 && hasFilter(query, 'status', 'draft'))).toBe(true);
  expect(mock.queries.some(query => query.table === ATTEMPTS && query.from === 250 && hasFilter(query, 'status', 'submitted'))).toBe(true);
  for (const query of mock.queries) {
    expect(hasFilter(query, 'tenant_id', 'centre')).toBe(true);
    expect(query.calls.indexOf('eq:tenant_id')).toBeLessThan(query.calls.indexOf('range'));
    for (const filter of query.filters.filter(filter => filter.kind === 'in' && filter.column !== 'role')) expect((filter.value as unknown[]).length).toBeLessThanOrEqual(50);
  }
  fireEvent.change(screen.getByLabelText('Brief status'), {target: {value: 'published'}});
  fireEvent.change(screen.getByLabelText('Find a brief'), {target: {value: published.title}});
  await screen.findByRole('button', {name: `Review brief: ${published.title} (${PUBLISHED})`});
  expect(mock.queries.some(query => query.table === BRIEFS && hasFilter(query, 'status', 'published') && query.calls.indexOf('eq:status') < query.calls.indexOf('range'))).toBe(true);
});

it('does not show partial briefs or reassuring counts when a later page fails, and offers retry', async () => {
  mock.tables[BRIEFS] = Array.from({length: 251}, (_, index) => brief(uuid(1000 + index)));
  mock.tables[ATTEMPTS] = [];
  mock.override.mockImplementation((query: Query) => query.table === BRIEFS && query.from === 250 ? {data: null, error: {message: 'Second page unavailable'}} : undefined);
  render(<AssessmentManager/>);
  await screen.findByText(/Assessment briefs could not be verified/);
  expect(screen.queryAllByRole('button', {name: /Review brief:/})).toHaveLength(0);
  expect(screen.queryByText(/matching briefs/)).toBeNull();
  mock.override.mockReset(); fireEvent.click(screen.getByRole('button', {name: 'Retry briefs'}));
  await screen.findByText('251 matching briefs · 251 in the selected status');
});

it('withholds the allocation count when a later related-record batch fails instead of showing a partial queue', async () => {
  const submissions = Array.from({length: 61}, (_, index) => attempt(uuid(2000 + index)));
  mock.tables[ATTEMPTS] = submissions;
  mock.override.mockImplementation((query: Query) => query.table === ALLOCATIONS && query.filters.some(filter => filter.column === 'attempt_id' && (filter.value as string[]).includes(uuid(2060)))
    ? {data: null, error: {message: 'Later allocation batch unavailable'}} : undefined);
  render(<AssessmentManager/>);
  await screen.findByText(/allocation queue could not be verified/);
  expect(screen.queryByText(/matching submissions/)).toBeNull();
  expect(screen.queryAllByRole('button', {name: /Review allocation:/})).toHaveLength(0);
  expect(screen.getByRole('button', {name: /Review brief:/})).toBeEnabled();
  mock.override.mockReset(); fireEvent.click(screen.getByRole('button', {name: 'Retry allocation queue'}));
  await screen.findByText('61 matching submissions · 61 awaiting independent allocation');
  expect(screen.getAllByRole('button', {name: /Review allocation:/})).toHaveLength(25);
  fireEvent.change(screen.getByLabelText('Find a submission'), {target: {value: uuid(2060)}});
  expect(screen.getAllByRole('button', {name: /Review allocation:/})).toHaveLength(1);
});

it('keeps directory failure and visible-empty distinct without preventing publication review', async () => {
  mock.override.mockImplementation((query: Query) => query.table === 'user_roles' ? {data: null, error: {message: 'Directory unavailable'}} : undefined);
  render(<AssessmentManager/>);
  await screen.findByText(/assessor and IQA directory could not be verified/);
  const dialog = await openPublication();
  expect(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'})).toBeEnabled();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Close review'}));
  mock.override.mockReset(); mock.tables.user_roles = [];
  fireEvent.click(screen.getByRole('button', {name: 'Retry staff lookup'}));
  await screen.findByText(/No eligible assessor and IQA choices are visible to your account/);
  expect(screen.queryByText(/directory could not be verified/)).toBeNull();
  expect(screen.getByRole('button', {name: /Review allocation:/})).toBeDisabled();
  expect(mock.rpc).not.toHaveBeenCalled();
});

it('excludes teacher, student and the selected marker from IQA and accepts the separate void allocation contract', async () => {
  render(<AssessmentManager/>);
  const marker = await screen.findByLabelText('Independent assessor for submission ' + ATTEMPT);
  await waitFor(() => expect(marker).toBeEnabled());
  expect(within(marker).queryByRole('option', {name: 'Assessor · ' + LECTURER})).toBeNull();
  expect(within(marker).queryByRole('option', {name: 'Assessor · ' + STUDENT})).toBeNull();
  fireEvent.change(marker, {target: {value: MARKER}});
  const reviewer = screen.getByLabelText('IQA reviewer for submission ' + ATTEMPT);
  for (const id of [MARKER, STUDENT, LECTURER]) expect(within(reviewer).queryByRole('option', {name: 'IQA · ' + id})).toBeNull();
  const dialog = await openAllocation();
  const confirm = within(dialog).getByRole('button', {name: 'Confirm reviewed allocation'});
  fireEvent.click(confirm); fireEvent.click(confirm);
  await within(dialog).findByText(/Independent assessor and IQA allocated to this submission/);
  expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('allocate_unipathway_independent_marker', {p_attempt: ATTEMPT, p_marker: MARKER, p_quality_reviewer: IQA});
  expect(within(dialog).getByText(STUDENT)).toBeInTheDocument();
  expect(within(dialog).getByRole('status')).toHaveTextContent('Independent assessor and IQA allocated');
  fireEvent.click(within(dialog).getByRole('button', {name: 'Close review'}));
  expect(screen.getByRole('region', {name: 'Retained assessment review'})).toHaveTextContent('Independent assessor and IQA allocated');
});

it('blocks stale staff membership and changed same-ID submission context before allocating', async () => {
  render(<AssessmentManager/>); const dialog = await openAllocation();
  mock.tables[ATTEMPTS][0].student_id = uuid(90);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm reviewed allocation'}));
  await within(dialog).findByText(/submission or assessment changed since this review/i);
  expect(within(dialog).getByText(STUDENT)).toBeInTheDocument(); expect(mock.rpc).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Reload current review'}));
  await within(dialog).findByText(uuid(90));
  mock.tables.user_roles = mock.tables.user_roles.filter(row => row.user_id !== IQA);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm reviewed allocation'}));
  await within(dialog).findByText(/reviewed independent staff roles could not be verified/);
  expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.success).not.toHaveBeenCalled();
});

it.each([true, false])('recovers an uncertain allocation using its exact submission and staff (matching=%s)', async matches => {
  mock.rpc.mockRejectedValue(Error('Response lost'));
  render(<AssessmentManager/>); const dialog = await openAllocation();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Confirm reviewed allocation'}));
  await within(dialog).findByRole('button', {name: 'Check allocation status'});
  mock.tables[ALLOCATIONS] = [allocation(ATTEMPT, matches ? {} : {marker_id: uuid(99)})];
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check allocation status'}));
  await within(dialog).findByText(matches ? /Allocation verified\./ : /already allocated to different staff/);
  expect(mock.rpc).toHaveBeenCalledTimes(1);
  expect(within(dialog).queryByRole('button', {name: 'Confirm reviewed allocation'})).toBeNull();
});

it('fails the selected review without substituting another brief when its related rubric read fails or the brief disappears', async () => {
  mock.override.mockImplementation((query: Query) => query.table === CRITERIA ? {data: null, error: {message: 'Rubric unavailable'}} : undefined);
  render(<AssessmentManager/>);
  fireEvent.click(await screen.findByRole('button', {name: /Review brief:/}));
  const dialog = await screen.findByRole('dialog', {name: 'Review assessment: ' + brief().title});
  await within(dialog).findByRole('button', {name: 'Retry assessment review'});
  expect(within(dialog).queryByRole('button', {name: 'Publish reviewed assessment'})).toBeNull();
  mock.override.mockReset(); mock.tables[BRIEFS] = [brief(PUBLISHED, {status: 'published'})];
  fireEvent.click(within(dialog).getByRole('button', {name: 'Retry assessment review'}));
  await within(dialog).findByText(/No other brief has been selected/);
  expect(within(dialog).queryByRole('region', {name: 'Reviewed assessment brief'})).toBeNull();
  expect(mock.rpc).not.toHaveBeenCalled();
});

it('rejects a returned foreign-centre brief without displaying its content or enabling publication', async () => {
  mock.override.mockImplementation((query: Query) => selectedBrief(query) ? {data: [brief(BRIEF, {tenant_id: 'other-centre', teaching_summary: 'Private other-centre summary'})], error: null} : undefined);
  render(<AssessmentManager/>); fireEvent.click(await screen.findByRole('button', {name: /Review brief:/}));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText(/centre of these assessment records could not be verified/);
  expect(screen.queryByText('Private other-centre summary')).toBeNull();
  expect(within(dialog).queryByRole('button', {name: 'Publish reviewed assessment'})).toBeNull();
  expect(mock.rpc).not.toHaveBeenCalled();
});

describe('scope changes and denied access', () => {
  it.each(['account', 'centre', 'role', 'membership', 'auth loading'])('ignores late publication completion after an %s change', async change => {
    const response = deferred<Reply>(); mock.rpc.mockReturnValue(response.promise);
    const view = render(<AssessmentManager/>); const dialog = await openPublication();
    fireEvent.click(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'}));
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledTimes(1));
    if (change === 'account') mock.user = {...mock.user!, id: 'other-manager'};
    if (change === 'centre') mock.user = {...mock.user!, tenantId: 'other-centre'};
    if (change === 'role') mock.user = {...mock.user!, role: 'centre_director', roles: ['programme_leader', 'centre_director']};
    if (change === 'membership') mock.user = {...mock.user!, roles: []};
    if (change === 'auth loading') mock.loading = true;
    view.rerender(<AssessmentManager/>);
    await act(async () => response.resolve({data: null, error: null}));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(mock.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/Assessment published\./)).toBeNull();
  });

  it('ignores a late selected-brief read through an A → B → A centre change', async () => {
    const selected = deferred<Reply>();
    mock.override.mockImplementation((query: Query) => selectedBrief(query) ? selected.promise : undefined);
    const view = render(<AssessmentManager/>);
    fireEvent.click(await screen.findByRole('button', {name: /Review brief:/}));
    await waitFor(() => expect(mock.queries.some(selectedBrief)).toBe(true));
    mock.user = {...mock.user!, tenantId: 'other-centre'}; view.rerender(<AssessmentManager/>);
    mock.user = {...mock.user!, tenantId: 'centre'}; view.rerender(<AssessmentManager/>);
    await act(async () => selected.resolve({data: [brief(BRIEF, {title: 'Stale selected identity'})], error: null}));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.queryByText('Stale selected identity')).toBeNull();
    expect(mock.queries.filter(query => query.table === CRITERIA)).toHaveLength(0);
  });

  it.each(['inactive manager', 'unverified role', 'no centre', 'auth loading'])('performs no assessment or directory reads with %s', async state => {
    if (state === 'inactive manager') mock.user = {...mock.user!, role: 'student', roles: ['student', 'programme_leader']};
    if (state === 'unverified role') mock.user = {...mock.user!, roles: ['student']};
    if (state === 'no centre') mock.user = {...mock.user!, tenantId: undefined};
    if (state === 'auth loading') mock.loading = true;
    render(<AssessmentManager/>); await act(async () => {});
    expect(mock.queries).toHaveLength(0); expect(mock.rpc).not.toHaveBeenCalled();
  });
});

it('preserves SQL numeric precision: 99.992 is not 100, while fractional criteria totalling 100 and a 2.5-point policy are valid', () => {
  const incomplete = [criterion(1, BRIEF, 49.996), criterion(2, BRIEF, 49.996)];
  expect(managerRubricTotal(incomplete)).toBe(99.992);
  expect(publicationBlockers({brief: brief(), criteria: incomplete})).toContain('At least two rubric criteria totalling 100 points are required.');
  const fractional = [criterion(1, BRIEF, 33.333), criterion(2, BRIEF, 33.333), criterion(3, BRIEF, 33.334)];
  expect(managerRubricTotal(fractional)).toBe(100);
  expect(publicationBlockers({brief: brief(), criteria: fractional})).toEqual([]);
});

it.each(['closed deadline', 'missing guidance', 'incomplete points'])('prevents publication with %s and explains the missing requirement', async scenario => {
  if (scenario === 'closed deadline') mock.tables[BRIEFS][0].due_at = '2020-01-01T08:00:00Z';
  if (scenario === 'missing guidance') mock.tables[CRITERIA][0].scoring_guidance = '';
  if (scenario === 'incomplete points') mock.tables[CRITERIA][0].max_points = 49.996;
  render(<AssessmentManager/>); const dialog = await openPublication();
  expect(within(dialog).getByRole('region', {name: 'Publication requirements'})).toBeInTheDocument();
  expect(within(dialog).getByRole('button', {name: 'Publish reviewed assessment'})).toBeDisabled();
  expect(mock.rpc).not.toHaveBeenCalled();
});
