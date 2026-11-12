import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useNavigate} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {UserRole} from '@/types/platform';
import LecturerAssessmentBriefs from '@/pages/lecturer/LecturerAssessmentBriefs';
import {
  confirmedLecturerCreation, emptyBriefForm, lecturerBrief, reviewLecturerBrief, reviewLecturerCriterion,
  type BriefForm, type LecturerBrief, type LecturerCriterion, type TeachingModule,
} from '@/lib/assessment/lecturerBriefs';

type Row = Record<string, unknown>;
type Query = {table: string; kind: 'read' | 'insert'; columns: string; filters: Record<string, string | string[]>; single: boolean; start: number; end: number; payload?: Row};
type Result = {data: unknown; error: unknown};
type Actor = {id: string; tenantId?: string; role: UserRole; roles: UserRole[]};
const state = vi.hoisted(() => ({
  user: null as Actor | null, loading: false, tables: {} as Record<string, Row[]>, requests: [] as Query[],
  read: vi.fn<(query: Query) => Promise<Result> | Result | undefined>(),
  insert: vi.fn<(query: Query) => Promise<Result> | Result>(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: state.user, loading: state.loading})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney', () => ({default: () => null}));
vi.mock('@/lib/db', () => ({db: {from: (table: string) => {
  const request: Query = {table, kind: 'read', columns: '', filters: {}, single: false, start: 0, end: 999999};
  const query = {
    select: (columns: string) => {request.columns = columns; return query;},
    eq: (column: string, value: string) => {request.filters[column] = value; return query;},
    in: (column: string, values: string[]) => {request.filters[column] = values; return query;},
    order: () => query,
    range: (start: number, end: number) => {request.start = start; request.end = end; return query;},
    maybeSingle: () => {request.single = true; return query;},
    insert: (payload: Row) => {request.kind = 'insert'; request.payload = structuredClone(payload); return query;},
    then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => {
      const copy = structuredClone(request); state.requests.push(copy);
      if (request.kind === 'insert') return Promise.resolve(state.insert(copy)).then(resolve, reject);
      const override = state.read(copy);
      if (override !== undefined) return Promise.resolve(override).then(resolve, reject);
      const rows = (state.tables[table] || []).filter(row => Object.entries(request.filters).every(([key, value]) => Array.isArray(value) ? value.includes(row[key] as string) : row[key] === value)).slice(request.start, request.end + 1);
      return Promise.resolve({data: structuredClone(request.single ? rows[0] || null : rows), error: null}).then(resolve, reject);
    },
  };
  return query;
}}}));

const uuid = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const uid = uuid(1), tenant = uuid(2), moduleA = uuid(10), moduleB = uuid(11), briefA = uuid(20), briefB = uuid(21);
const briefSavedMessage = 'Assessment brief saved as an unpublished draft. Complete its rubric for programme-leader approval.';
const scope = {userId: uid, tenantId: tenant};
const modules: TeachingModule[] = [
  {id: moduleA, title: 'Physics mechanics', tenant_id: tenant, lecturer_id: uid},
  {id: moduleB, title: 'Chemistry foundations', tenant_id: tenant, lecturer_id: uid},
];
const brief = (id = briefA, module = moduleA, title = 'Forces and motion assessment'): LecturerBrief => ({
  id, tenant_id: tenant, lecturer_id: uid, module_id: module, title, status: 'draft', assessment_type: 'coursework',
  due_at: '2026-12-01T05:00:00Z', submission_cutoff: '2026-12-08T05:00:00Z', max_attempts: 2,
  penalty_points_per_resubmission: 5, policy_reference: 'APPROVED-POLICY-2026', rubric_version: 'v1',
});
const criterion = (): LecturerCriterion => ({id: uuid(30), tenant_id: tenant, brief_id: briefA, criterion_code: 'LO1.P1', learning_outcome: 'Use correct units in force calculations.', criterion_description: 'Show two complete numerical force calculations.', scoring_guidance: 'Award full credit only when the method and units are both explained.', max_points: 25, display_order: 1});
const form = (): BriefForm => ({...emptyBriefForm(moduleA), title: 'Review force and acceleration', teaching: 'We demonstrated force, mass and acceleration calculations with complete worked examples.', outcomes: 'Calculate a force using the correct units and justify the method.', expectations: 'Explain your calculations step by step and compare the two worked examples independently.', required: 'Provide calculations, observations and an evidence-based explanation.', due: '2026-12-01T10:00', cutoff: '2026-12-08T10:00', attempts: '2', penalty: '5', policy: 'APPROVED-POLICY-2026'});
const criterionForm = () => ({code: 'LO2.P1', outcome: 'Explain a force calculation with correct units.', description: 'Provide two worked examples with an attributable method.', guidance: 'Award full points for justified methods and correct calculations.', points: '25'});
const writes = () => state.requests.filter(request => request.kind === 'insert');
function deferred<T>() {let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};}

beforeEach(() => {
  state.user = {id: uid, tenantId: tenant, role: 'lecturer', roles: ['lecturer', 'programme_leader']}; state.loading = false;
  state.tables = {modules: structuredClone(modules), unipathway_assessment_briefs: [brief(), brief(briefB, moduleB, 'Chemical reactions assessment')], unipathway_assessment_criteria: [criterion()]};
  state.requests = []; state.read.mockReset();
  state.insert.mockReset().mockImplementation(request => {const row = structuredClone(request.payload!); state.tables[request.table].push(row); return {data: row, error: null};});
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-08T09:00:00Z'));
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

const show = (path = '/lecturer/assessments') => render(<MemoryRouter initialEntries={[path]}><LecturerAssessmentBriefs/></MemoryRouter>);
async function ready() {await screen.findByRole('button', {name: 'Open assessment Forces and motion assessment'});}
function fillBrief(values = form()) {
  fireEvent.change(screen.getByLabelText('Assigned teaching module'), {target: {value: values.moduleId}});
  for (const [label, field] of [
    ['Assessment title', 'title'], ['Lessons taught and progress', 'teaching'], ['Learning outcomes', 'outcomes'], ['Student expectations', 'expectations'],
    ['Required evidence and deliverables', 'required'], ['First submission due (Pakistan time)', 'due'], ['Final submission cutoff (Pakistan time)', 'cutoff'],
    ['Allowed attempts', 'attempts'], ['Approved penalty points per resubmission', 'penalty'], ['Awarding-body or centre-approved assessment policy reference', 'policy'],
  ] as const) fireEvent.change(screen.getByLabelText(label), {target: {value: values[field]}});
}
function fillCriterion() {
  const values = criterionForm();
  for (const [label, field] of [['Criterion code', 'code'], ['Criterion learning outcome', 'outcome'], ['Criterion evidence standard', 'description'], ['Criterion marking guidance', 'guidance'], ['Maximum points', 'points']] as const) fireEvent.change(screen.getByLabelText(label), {target: {value: values[field]}});
}
async function reviewBrief() {await ready(); fillBrief(); fireEvent.click(screen.getByRole('button', {name: 'Review assessment brief'})); return screen.findByRole('dialog', {name: 'Review brief'});}
async function reviewCriterion() {await ready(); fireEvent.click(screen.getByRole('button', {name: 'Open assessment Forces and motion assessment'})); fillCriterion(); fireEvent.click(screen.getByRole('button', {name: 'Review criterion'})); return screen.findByRole('dialog', {name: 'Review criterion'});}

it.each(['loading', 'missing membership', 'unapproved active role', 'missing centre', 'signed out'] as const)('does not read or offer edits with %s', async reason => {
  if (reason === 'loading') state.loading = true;
  if (reason === 'missing membership') state.user!.roles = ['programme_leader'];
  if (reason === 'unapproved active role') state.user = {...state.user!, role: 'student', roles: ['lecturer', 'student']};
  if (reason === 'missing centre') state.user!.tenantId = undefined;
  if (reason === 'signed out') state.user = null;
  show();
  expect(screen.queryByLabelText('Assessment title')).toBeNull();
  expect(screen.getByText(reason === 'loading' ? /Verifying your teaching access/ : /A verified active lecturer/)).toBeInTheDocument();
  await act(async () => {}); expect(state.requests).toEqual([]);
});

it('loads complete assigned rows beyond the former 180-brief limit with explicit tenant and ownership filters', async () => {
  state.tables.unipathway_assessment_briefs = Array.from({length: 251}, (_, index) => brief(uuid(1000 + index), moduleA, `Assessment ${index + 1}`));
  state.tables.unipathway_assessment_criteria = [];
  show(); await screen.findByText('My assessment briefs (251)');
  expect(screen.getAllByRole('button', {name: /^Open assessment /})).toHaveLength(251);
  const reads = state.requests.filter(request => request.table === 'unipathway_assessment_briefs');
  expect(reads.map(request => request.start)).toEqual([0, 250]);
  expect(reads.every(request => request.filters.tenant_id === tenant && request.filters.lecturer_id === uid)).toBe(true);
});

it('does not display a failed or malformed lookup as an empty or editable assessment list, and supports a targeted retry', async () => {
  state.read.mockImplementation(query => query.table === 'unipathway_assessment_criteria' ? {data: null, error: {message: 'Unavailable'}} : undefined);
  show(); await screen.findByRole('button', {name: 'Retry assessment list'});
  expect(screen.queryByLabelText('Assessment title')).toBeNull(); expect(screen.queryByText(/No teaching briefs drafted/)).toBeNull();
  state.read.mockReset(); fireEvent.click(screen.getByRole('button', {name: 'Retry assessment list'})); await ready();
  expect(screen.getByLabelText('Assessment title')).toBeEnabled();
});

it('rejects returned rows outside the requested lecturer and centre instead of trusting a successful response', async () => {
  state.read.mockImplementation(query => query.table === 'modules' ? {data: [{...modules[0], lecturer_id: uuid(99)}], error: null} : undefined);
  show(); await screen.findByRole('button', {name: 'Retry assessment list'});
  expect(screen.queryByLabelText('Assigned teaching module')).toBeNull(); expect(state.requests).toHaveLength(1);
});

it('keeps criterion fields with their selected brief and never transfers them to another assessment', async () => {
  show(); await ready(); fireEvent.click(screen.getByRole('button', {name: 'Open assessment Forces and motion assessment'})); fillCriterion();
  fireEvent.click(screen.getByRole('button', {name: 'Open assessment Chemical reactions assessment'}));
  expect(screen.getByLabelText('Criterion code')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Criterion code'), {target: {value: 'CH1.P1'}});
  fireEvent.click(screen.getByRole('button', {name: 'Open assessment Forces and motion assessment'}));
  expect(screen.getByLabelText('Criterion code')).toHaveValue('LO2.P1'); expect(screen.getByLabelText('Criterion evidence standard')).toHaveValue(criterionForm().description);
  fireEvent.click(screen.getByRole('button', {name: 'Open assessment Chemical reactions assessment'})); expect(screen.getByLabelText('Criterion code')).toHaveValue('CH1.P1');
  expect(writes()).toEqual([]);
});

it('does not discard a draft when the same verified memberships are returned in another order', async () => {
  const view = show(); await ready(); fillBrief(); const reads = state.requests.length;
  state.user = {...state.user!, roles: ['programme_leader', 'lecturer']};
  view.rerender(<MemoryRouter><LecturerAssessmentBriefs/></MemoryRouter>);
  expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title); expect(state.requests).toHaveLength(reads);
});

it('reviews the named module and Pakistan deadline, writes the exact payload, and only clears after a matching returned row', async () => {
  show(); const dialog = await reviewBrief();
  expect(writes()).toEqual([]); expect(within(dialog).getByText('Physics mechanics')).toBeInTheDocument();
  expect(within(dialog).getByText(/named module and unpublished assessment details/)).toBeInTheDocument();
  expect(within(dialog).getByText(/01 Dec 2026, 10:00 PKT/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await screen.findByRole('button', {name: 'Open assessment Review force and acceleration'});
  expect(writes()).toHaveLength(1);
  expect(writes()[0].payload).toMatchObject({tenant_id: tenant, lecturer_id: uid, module_id: moduleA, due_at: '2026-12-01T05:00:00.000Z', submission_cutoff: '2026-12-08T05:00:00.000Z', status: 'draft', published_by: null, published_at: null});
  expect(screen.getByLabelText('Assessment title')).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent(briefSavedMessage); expect(screen.getByRole('status')).toBeVisible();
  expect(screen.getByRole('button', {name: 'Open assessment Review force and acceleration'})).toHaveAttribute('aria-pressed', 'true');
});

it('locks review and mutation synchronously, freezes target and fields, and preserves the original payload', async () => {
  const moduleCheck = deferred<Result>(), save = deferred<Result>();
  state.read.mockImplementation(query => query.table === 'modules' && query.single ? moduleCheck.promise : undefined);
  show(); await ready(); fillBrief();
  const reviewButton = screen.getByRole('button', {name: 'Review assessment brief'});
  act(() => {fireEvent.click(reviewButton); fireEvent.click(reviewButton);});
  await waitFor(() => expect(state.requests.filter(query => query.table === 'modules' && query.single)).toHaveLength(1));
  expect(screen.getByLabelText('Assigned teaching module')).toBeDisabled(); expect(screen.getByLabelText('Assessment title')).toBeDisabled();
  await act(async () => moduleCheck.resolve({data: modules[0], error: null}));
  const dialog = await screen.findByRole('dialog', {name: 'Review brief'});
  state.read.mockReset(); state.insert.mockReturnValue(save.promise);
  const saveButton = within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'});
  act(() => {fireEvent.click(saveButton); fireEvent.click(saveButton);});
  await waitFor(() => expect(writes()).toHaveLength(1));
  fireEvent.change(screen.getByLabelText('Assessment title'), {target: {value: 'Must not replace the reviewed title'}});
  expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title);
  expect(screen.getByRole('button', {name: 'Open assessment Chemical reactions assessment', hidden: true})).toBeDisabled();
  await act(async () => save.resolve({data: writes()[0].payload, error: null}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(writes()).toHaveLength(1);
});

it('recovers a rejected preflight promise without losing the lecturer draft or leaving the controls busy', async () => {
  state.read.mockImplementation(query => query.table === 'modules' && query.single ? Promise.reject(Error('Module check interrupted')) : undefined);
  show(); await ready(); fillBrief(); fireEvent.click(screen.getByRole('button', {name: 'Review assessment brief'}));
  await screen.findByText('Module check interrupted'); expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title);
  expect(screen.getByRole('button', {name: 'Review assessment brief'})).toBeEnabled(); expect(writes()).toEqual([]);
});

 it('uses explicit viewport bounds while preserving scrollable assessment details and actions', async () => {
   show(); const dialog = await reviewBrief();
   expect(dialog.getAttribute('style')).toContain('width: calc(100vw - 32px)');
   expect(dialog.getAttribute('style')).toContain('max-height: calc(100dvh - 32px)');
   expect(dialog.className).toContain('overflow-y-auto');
   expect(dialog.className).toContain('overscroll-contain');
   expect(within(dialog).getByText(form().title)).toBeInTheDocument();
   expect(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'})).toBeEnabled();
   expect(writes()).toHaveLength(0);
 });

it('moves keyboard focus into the named review and returns it to the initiating action without losing edits', async () => {
  show(); await ready(); fillBrief(); const button = screen.getByRole('button', {name: 'Review assessment brief'}); button.focus(); fireEvent.click(button);
  const dialog = await screen.findByRole('dialog', {name: 'Review brief'});
  expect(within(dialog).getByRole('heading', {name: 'Review brief'})).toHaveFocus();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Back to details'}));
  await waitFor(() => expect(button).toHaveFocus()); expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title); expect(writes()).toEqual([]);
});

it('retains editable draft wording after a definite database rejection', async () => {
  state.insert.mockResolvedValue({data: null, error: {code: '23514', message: 'A check constraint rejected this draft'}});
  show(); const dialog = await reviewBrief(); fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await within(dialog).findByText(/The save was rejected/);
  expect(within(dialog).queryByRole('button', {name: 'Check saved record'})).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Back to details'}));
  expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title); expect(screen.getByLabelText('Lessons taught and progress')).toHaveValue(form().teaching);
  expect(screen.getByLabelText('Assessment title')).toBeEnabled(); expect(screen.queryByText(briefSavedMessage)).toBeNull();
});

it.each([null, undefined, [], {}, {id: uuid(99)}])('does not accept an incomplete or mismatched creation receipt: %j', async receipt => {
  state.insert.mockResolvedValue({data: receipt, error: null}); show(); const dialog = await reviewBrief();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await within(dialog).findByText(/no matching receipt/);
  expect(screen.getByLabelText('Assessment title')).toHaveValue(form().title); expect(screen.queryByText(briefSavedMessage)).toBeNull();
  expect(within(dialog).getByRole('button', {name: 'Check saved record'})).toBeEnabled(); expect(writes()).toHaveLength(1);
});

it('recovers a lost response by reading the original scoped UUID and never inserts a duplicate', async () => {
  state.insert.mockImplementation(request => {state.tables[request.table].push(structuredClone(request.payload!)); return Promise.reject(Error('Connection interrupted'));});
  show(); const dialog = await reviewBrief(); fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await within(dialog).findByText(/Connection interrupted/);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Close and keep save check'}));
  expect(screen.getByLabelText('Assessment title')).toBeDisabled(); expect(screen.getByRole('button', {name: 'Review assessment brief'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Continue save check'}));
  fireEvent.click(screen.getByRole('button', {name: 'Check saved record'}));
  await screen.findByRole('button', {name: 'Open assessment Review force and acceleration'});
  expect(writes()).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent(briefSavedMessage); expect(screen.getByRole('status')).toBeVisible();
  expect(state.requests.some(query => query.kind === 'read' && query.single && query.table === 'unipathway_assessment_briefs'
    && query.filters.id === writes()[0].payload!.id && query.filters.tenant_id === tenant && query.filters.lecturer_id === uid && query.filters.module_id === moduleA)).toBe(true);
});

it('checks before retrying an uncertain insert and keeps its UUID and payload exactly unchanged', async () => {
  state.insert.mockResolvedValueOnce({data: null, error: null});
  show(); const dialog = await reviewBrief(); fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await within(dialog).findByText(/no matching receipt/);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check saved record'})); await within(dialog).findByText(/No matching record is visible/);
  expect(writes()).toHaveLength(1);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Retry same assessment brief'}));
  await screen.findByRole('button', {name: 'Open assessment Review force and acceleration'});
  expect(writes()).toHaveLength(2); expect(writes()[1].payload).toEqual(writes()[0].payload);
  const secondWrite = state.requests.lastIndexOf(writes()[1]);
  expect(state.requests.slice(0, secondWrite).some(query => query.kind === 'read' && query.filters.id === writes()[0].payload!.id)).toBe(true);
});

it('blocks retry if readback finds conflicting content, and does not discard the reviewed target', async () => {
  state.insert.mockImplementation(request => {state.tables[request.table].push({...request.payload!, title: 'Different saved wording'}); return {data: null, error: null};});
  show(); const dialog = await reviewBrief(); fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'})); await within(dialog).findByText(/no matching receipt/);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Retry same assessment brief'}));
  await within(dialog).findByText(/does not match these reviewed details/);
  expect(within(dialog).getByRole('button', {name: 'Retry same assessment brief'})).toBeDisabled(); expect(writes()).toHaveLength(1); expect(screen.queryByText(briefSavedMessage)).toBeNull();
  expect(within(dialog).getByText(form().title)).toBeInTheDocument();
});

it('does not send another insert when the uncertain record cannot be rechecked', async () => {
  state.insert.mockResolvedValue({data: null, error: null}); show(); const dialog = await reviewBrief();
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'})); await within(dialog).findByText(/no matching receipt/);
  const requestId = writes()[0].payload!.id;
  state.read.mockImplementation(query => query.filters.id === requestId ? {data: null, error: {message: 'Read interrupted'}} : undefined);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Retry same assessment brief'})); await within(dialog).findByText(/saved record could not be checked/);
  expect(writes()).toHaveLength(1); expect(screen.queryByText(briefSavedMessage)).toBeNull();
  expect(within(dialog).getByRole('button', {name: 'Check saved record'})).toBeEnabled();
});

it('blocks a new mutation when the module assignment is lost after review', async () => {
  show(); const dialog = await reviewBrief(); state.tables.modules = [];
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await within(dialog).findByText(/no longer available to your account/); expect(writes()).toEqual([]);
  expect(within(dialog).getByRole('button', {name: 'Back to details'})).toBeEnabled();
});

it('rechecks draft status and rubric before a criterion insert and retains wording if either changed', async () => {
  show(); const dialog = await reviewCriterion(); state.tables.unipathway_assessment_criteria.push({...criterion(), id: uuid(31), criterion_code: 'LO3.P1', display_order: 2});
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed criterion'}));
  await within(dialog).findByText(/assessment or rubric changed after review/); expect(writes()).toEqual([]);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Back to details'}));
  expect(screen.getByLabelText('Criterion code')).toHaveValue('LO2.P1');
  state.tables.unipathway_assessment_briefs[0].status = 'published'; fireEvent.click(screen.getByRole('button', {name: 'Review criterion'}));
  await screen.findByText(/no longer an available unpublished draft/); expect(screen.getByLabelText('Criterion code')).toHaveValue('LO2.P1'); expect(writes()).toEqual([]);
});

it('recovers the exact criterion without clearing a different brief’s saved local draft', async () => {
  show(); await ready(); fireEvent.click(screen.getByRole('button', {name: 'Open assessment Chemical reactions assessment'}));
  fireEvent.change(screen.getByLabelText('Criterion code'), {target: {value: 'CH1.P1'}});
  const dialog = await reviewCriterion(); expect(within(dialog).getByText(briefA)).toBeInTheDocument();
  state.insert.mockImplementation(request => {state.tables[request.table].push(structuredClone(request.payload!)); return {data: null, error: null};});
  fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed criterion'})); await within(dialog).findByText(/no matching receipt/);
  fireEvent.click(within(dialog).getByRole('button', {name: 'Check saved record'}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); await ready();
  expect(writes()).toHaveLength(1); expect(writes()[0].payload).toMatchObject({brief_id: briefA, tenant_id: tenant, criterion_code: 'LO2.P1', display_order: 2});
  expect(screen.getByRole('status')).toHaveTextContent('Criterion LO2.P1 saved to Forces and motion assessment.'); expect(screen.getByRole('status')).toBeVisible();
  expect(screen.getByLabelText('Criterion code')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', {name: 'Open assessment Chemical reactions assessment'})); expect(screen.getByLabelText('Criterion code')).toHaveValue('CH1.P1');
});

it.each(['account', 'centre', 'active role', 'membership', 'auth loading'] as const)('suppresses a late save and its follow-up reads after the %s boundary changes', async boundary => {
  const save = deferred<Result>(); state.insert.mockReturnValue(save.promise);
  const view = show(); const dialog = await reviewBrief(); fireEvent.click(within(dialog).getByRole('button', {name: 'Save reviewed assessment brief'}));
  await waitFor(() => expect(writes()).toHaveLength(1));
  if (boundary === 'account') state.user = {...state.user!, id: uuid(99)};
  if (boundary === 'centre') state.user = {...state.user!, tenantId: uuid(99)};
  if (boundary === 'active role') state.user = {...state.user!, role: 'programme_leader'};
  if (boundary === 'membership') state.user = {...state.user!, roles: ['programme_leader']};
  if (boundary === 'auth loading') state.loading = true;
  view.rerender(<MemoryRouter><LecturerAssessmentBriefs/></MemoryRouter>);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  if (boundary === 'active role') await ready();
  else if (boundary === 'account' || boundary === 'centre') await screen.findByText(/No teaching modules are currently assigned/);
  const reads = state.requests.length;
  await act(async () => save.resolve({data: writes()[0].payload, error: null}));
  expect(screen.queryByText(briefSavedMessage)).toBeNull(); expect(state.requests).toHaveLength(reads);
  expect(screen.queryByDisplayValue(form().title)).toBeNull();
});

it('ignores a delayed old module read when the URL selects another module', async () => {
  const old = deferred<Result>(); state.read.mockImplementation(query => query.table === 'modules' && query.filters.id === moduleA ? old.promise : undefined);
  let navigate!: ReturnType<typeof useNavigate>;
  function Workspace() {navigate = useNavigate(); return <LecturerAssessmentBriefs/>;}
  render(<MemoryRouter initialEntries={[`/lecturer/assessments?module=${moduleA}`]}><Workspace/></MemoryRouter>);
  await waitFor(() => expect(state.requests).toHaveLength(1));
  await act(async () => navigate(`/lecturer/assessments?module=${moduleB}`));
  await screen.findByRole('button', {name: 'Open assessment Chemical reactions assessment'});
  await act(async () => old.resolve({data: [modules[0]], error: null}));
  expect(screen.queryByRole('button', {name: 'Open assessment Forces and motion assessment'})).toBeNull();
  expect(screen.getByLabelText('Assigned teaching module')).toHaveValue(moduleB); expect(screen.queryByText(briefSavedMessage)).toBeNull();
});

describe('lecturer payload and receipt contracts', () => {
  it('rejects impossible, expired and reversed Pakistan deadlines and invalid numeric fields before a write', () => {
    for (const patch of [{due: ''}, {due: '2026-02-30T10:00'}, {due: '2026-01-01T10:00'}, {cutoff: '2026-11-30T10:00'}, {attempts: '1.5'}, {attempts: '6'}, {penalty: ''}, {penalty: 'NaN'}, {penalty: 'Infinity'}, {penalty: '-1'}, {penalty: '31'}, {attempts: '1', penalty: '1'}, {moduleId: moduleB}]) expect(() => reviewLecturerBrief({...form(), ...patch}, modules[0], scope, uuid(90))).toThrow();
    const payload = reviewLecturerBrief(form(), modules[0], scope, uuid(90)); expect(payload.due_at).toBe('2026-12-01T05:00:00.000Z');
  });
  it('requires the full expected payload while allowing equivalent SQL timestamp and numeric normalization', () => {
    const payload = reviewLecturerBrief(form(), modules[0], scope, uuid(90));
    expect(confirmedLecturerCreation({...payload, due_at: '2026-12-01T10:00:00+05:00', penalty_points_per_resubmission: '5.00'}, payload)).toBe(true);
    for (const patch of [{id: uuid(91)}, {tenant_id: uuid(91)}, {lecturer_id: uuid(91)}, {module_id: moduleB}, {status: 'published'}, {published_by: uid}, {teaching_summary: 'Different content'}, {due_at: null}, {penalty_points_per_resubmission: null}, {max_attempts: '2'}]) expect(confirmedLecturerCreation({...payload, ...patch}, payload)).toBe(false);
  });
  it('rejects invalid criterion points, duplicates, excessive totals and published briefs, preserving valid order gaps', () => {
    for (const points of ['', 'NaN', 'Infinity', '-1', '0', '101']) expect(() => reviewLecturerCriterion({...criterionForm(), points}, brief(), [criterion()], scope, uuid(90))).toThrow();
    expect(() => reviewLecturerCriterion({...criterionForm(), code: 'lo1.p1'}, brief(), [criterion()], scope, uuid(90))).toThrow(/already has/);
    expect(() => reviewLecturerCriterion({...criterionForm(), points: '76'}, brief(), [criterion()], scope, uuid(90))).toThrow(/exceed 100/);
    expect(() => reviewLecturerCriterion(criterionForm(), {...brief(), status: 'published'}, [criterion()], scope, uuid(90))).toThrow(/unpublished/);
    expect(reviewLecturerCriterion(criterionForm(), brief(), [{...criterion(), display_order: 3}], scope, uuid(90)).display_order).toBe(4);
    expect(reviewLecturerCriterion({...criterionForm(), points: '1e-7'}, brief(), [], scope, uuid(90)).max_points).toBe(0.0000001);
    expect(lecturerBrief({...brief(), max_attempts: null}, scope, [moduleA])).toBeNull();
  });
});
