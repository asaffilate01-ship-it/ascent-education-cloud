import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, useNavigate, type NavigateFunction} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import LiveClassScheduler from '@/pages/classroom/LiveClassScheduler';
import {pakistanClassInput, validateClassTimes} from '@/lib/liveClassScheduling';

type Row = Record<string, unknown>;
type Response = {data: unknown; error: {message: string} | null};
const classId = '11111111-2222-4333-8444-555555555555';
const mock = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(),
  user: {id: 'teacher', tenantId: 'centre', role: 'lecturer', roles: ['lecturer']},
  tables: {} as Record<string, Row[]>,
  errors: {} as Record<string, {message: string}>,
  candidates: {students: [{id: 'student', name: 'Learner'}], organisers: [{id: 'teacher', name: 'Teacher'}]} as unknown,
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: false})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children, title}: {children: ReactNode; title: string}) => <main><h1>{title}</h1>{children}</main>}));
vi.mock('@/lib/db', () => ({db: {rpc: mock.rpc, from: mock.from}}));

beforeEach(() => {
  mock.user = {id: 'teacher', tenantId: 'centre', role: 'lecturer', roles: ['lecturer']};
  mock.tables = {modules: [{id: 'module', title: 'English', tenant_id: 'centre', lecturer_id: 'teacher'}], live_class_sessions: [], uni_calendar_jobs: [], live_class_invitations: []};
  mock.errors = {};
  mock.candidates = {students: [{id: 'student', name: 'Learner'}], organisers: [{id: 'teacher', name: 'Teacher'}]};
  mock.rpc.mockReset(); mock.from.mockReset();
  mock.rpc.mockImplementation(async (name: string, args: Row) => ({data: name === 'uni_calendar_candidates' ? mock.candidates : name === 'save_uni_calendar_class' ? args.p_id : null, error: null}));
  mock.from.mockImplementation((table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let offset = 0, count = Infinity;
    const query: Record<string, unknown> = {};
    query.select = () => query;
    query.eq = (column: string, value: unknown) => { filters.push(row => row[column] === value); return query; };
    query.in = (column: string, values: unknown[]) => { filters.push(row => values.includes(row[column])); return query; };
    query.order = () => query;
    query.limit = (limit: number) => { count = limit; return query; };
    query.range = (first: number, last: number) => { offset = first; count = last - first + 1; return query; };
    query.then = (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve({
      data: mock.errors[table] ? null : (mock.tables[table] || []).filter(row => filters.every(filter => filter(row))).slice(offset, offset + count),
      error: mock.errors[table] || null,
    }).then(resolve, reject);
    return query;
  });
});
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });
function show(path = '/lecturer/class-scheduler?module=module') {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}}); clients.push(client);
  let navigate!: NavigateFunction;
  function Navigation() { navigate = useNavigate(); return null; }
  const page = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Navigation/><LiveClassScheduler/></MemoryRouter></QueryClientProvider>;
  const view = render(page());
  return {...view, rerenderPage: () => view.rerender(page()), navigate: (to: string) => act(() => navigate(to))};
}
function fillDraft() {
  fireEvent.change(screen.getByLabelText('Class title'), {target: {value: 'Writing'}});
  fireEvent.change(screen.getByLabelText('Meeting organiser'), {target: {value: 'teacher'}});
  fireEvent.change(screen.getByLabelText('Starts (Pakistan time)'), {target: {value: '2030-12-01T09:00'}});
  fireEvent.change(screen.getByLabelText('Ends (Pakistan time)'), {target: {value: '2030-12-01T10:00'}});
  fireEvent.click(screen.getByLabelText('Learner'));
}
function savedCalls() { return mock.rpc.mock.calls.filter(call => call[0] === 'save_uni_calendar_class'); }
function cancellationCalls() { return mock.rpc.mock.calls.filter(call => call[0] === 'cancel_uni_calendar_class'); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => { resolve = complete; });
  return {promise, resolve};
}
function existingClass() {
  mock.tables.live_class_sessions = [{id: classId, tenant_id: 'centre', module_id: 'module', organiser_user_id: 'teacher', title: 'Existing writing class', starts_at: '2030-12-01T04:00:00Z', ends_at: '2030-12-01T05:00:00Z', status: 'scheduled', teams_sync_status: 'queued', join_url: null}];
  mock.tables.uni_calendar_jobs = [{session_id: classId, tenant_id: 'centre', status: 'queued', revision: 3, error_code: null}];
  mock.tables.live_class_invitations = [{session_id: classId, user_id: 'student', tenant_id: 'centre', status: 'invited'}];
}

it('requires the saved class UUID and converts labelled Pakistan times to UTC before queuing invitations', async () => {
  show(); await screen.findByText('Learner'); fillDraft();
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  await screen.findByText('Class saved. Microsoft invitation delivery is queued, not yet confirmed.');
  expect(savedCalls()).toHaveLength(1);
  expect(savedCalls()[0][1]).toEqual(expect.objectContaining({p_module: 'module', p_organiser: 'teacher', p_title: 'Writing', p_start: '2030-12-01T04:00:00.000Z', p_end: '2030-12-01T05:00:00.000Z', p_students: ['student'], p_revision: 0, p_cancel: false}));
  expect(savedCalls()[0][1].p_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(screen.getByLabelText('Class title')).toHaveValue('');
  expect(screen.queryByPlaceholderText(/teams.microsoft/)).toBeNull();
});

it('disables bulk learner selection during candidate loading without presenting an empty roster', async () => {
  const response = deferred<Response>(); mock.rpc.mockReturnValue(response.promise);
  show(); await screen.findByText('Checking enrolled learners and connected organisers…');
  expect(screen.getByRole('button', {name: 'Select all enrolled learners'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Select all enrolled learners'}));
  expect(screen.getByRole('button', {name: 'Schedule and invite'})).toBeDisabled();
  expect(screen.queryByText('No active learners are enrolled in this programme.')).not.toBeInTheDocument();
  await act(async () => response.resolve({data: mock.candidates, error: null}));
  expect(await screen.findByText('Learner')).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Select all enrolled learners'})).toBeEnabled();
});

it.each([
  {data: null, error: {message: 'Unavailable'}},
  {data: null, error: null},
  {data: {students: [], organisers: 'unavailable'}, error: null},
])('distinguishes failed or malformed candidate data from an empty roster and supports retry (%j)', async response => {
  mock.rpc.mockResolvedValueOnce(response);
  show(); await screen.findByText('Learners and organisers could not be checked. Try again before scheduling this class.');
  expect(screen.getByRole('button', {name: 'Select all enrolled learners'})).toBeDisabled();
  expect(screen.getByRole('button', {name: 'Schedule and invite'})).toBeDisabled();
  expect(screen.queryByText('No active learners are enrolled in this programme.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Retry learners and organisers'}));
  expect(await screen.findByText('Learner')).toBeInTheDocument();
});

it('presents verified empty learners and unavailable organisers without enabling scheduling', async () => {
  mock.candidates = {students: [], organisers: []};
  show(); await screen.findByText(/No enabled Microsoft organiser is connected/);
  expect(screen.getByText('No active learners are enrolled in this programme.')).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Select all enrolled learners'})).toBeDisabled();
  expect(screen.getByRole('button', {name: 'Schedule and invite'})).toBeDisabled();
});

it.each([null, 'class', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'])('keeps the draft when the save receipt is unconfirmed (%s)', async receipt => {
  show(); await screen.findByText('Learner'); fillDraft();
  mock.rpc.mockResolvedValueOnce({data: receipt, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  await screen.findByText(/Save could not be confirmed. Your draft has been kept/);
  expect(screen.getByLabelText('Class title')).toHaveValue('Writing');
  expect(screen.getByLabelText('Starts (Pakistan time)')).toHaveValue('2030-12-01T09:00');
  expect(screen.getByLabelText('Learner')).toBeChecked();
  expect(screen.queryByText(/^Class saved\./)).not.toBeInTheDocument();
  const firstId = savedCalls()[0][1].p_id;
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  await screen.findByText(/^Class saved\./);
  expect(savedCalls()[1][1].p_id).toBe(firstId);
});

it('locks the pending save and retains the draft after an RPC failure', async () => {
  show(); await screen.findByText('Learner'); fillDraft();
  const response = deferred<Response>(); mock.rpc.mockReturnValueOnce(response.promise);
  const save = screen.getByRole('button', {name: 'Schedule and invite'});
  act(() => { fireEvent.click(save); fireEvent.click(save); });
  expect(savedCalls()).toHaveLength(1);
  expect(screen.getByRole('button', {name: 'Saving class…'})).toBeDisabled();
  expect(screen.getByLabelText('Class title')).toBeDisabled();
  expect(screen.getByLabelText('Module')).toBeDisabled();
  await act(async () => response.resolve({data: null, error: {message: 'Timetable clash'}}));
  await screen.findByText(/Class could not be saved. Your draft has been kept/);
  expect(screen.getByLabelText('Class title')).toHaveValue('Writing');
  expect(screen.getByLabelText('Learner')).toBeChecked();
  expect(screen.getByRole('button', {name: 'Schedule and invite'})).toBeEnabled();
});

it('focuses the invalid end time and prevents reversed or overlong classes from reaching the RPC', async () => {
  show(); await screen.findByText('Learner'); fillDraft();
  const end = screen.getByLabelText('Ends (Pakistan time)');
  fireEvent.change(end, {target: {value: '2030-12-01T08:00'}});
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  expect(screen.getByText('End time must be after the start time.')).toBeInTheDocument();
  expect(end).toHaveFocus(); expect(end).toHaveAttribute('aria-invalid', 'true');
  fireEvent.change(end, {target: {value: '2030-12-01T22:00'}});
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  expect(screen.getByText('A live class can last no more than 12 hours.')).toBeInTheDocument();
  expect(savedCalls()).toHaveLength(0);
  expect(validateClassTimes('2030-02-30T09:00', '2030-03-01T10:00', 0)).toHaveProperty('start');
  expect(validateClassTimes('2020-01-01T09:00', '2020-01-01T10:00', Date.parse('2026-01-01'))).toHaveProperty('end', 'Choose a class that ends in the future.');
});

it('edits existing UTC instants as Pakistan time while preserving the revision and stored instant', async () => {
  existingClass(); show('/lecturer/class-scheduler');
  fireEvent.click(await screen.findByRole('button', {name: 'Edit class / invitees: Existing writing class'}));
  await screen.findByText('Learner');
  expect(screen.getByLabelText('Starts (Pakistan time)')).toHaveValue('2030-12-01T09:00');
  expect(screen.getByLabelText('Ends (Pakistan time)')).toHaveValue('2030-12-01T10:00');
  expect(screen.getByLabelText('Learner')).toBeChecked();
  expect(screen.getByLabelText('Meeting organiser')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Queue calendar update'}));
  await screen.findByText(/^Class saved\./);
  expect(savedCalls()[0][1]).toEqual(expect.objectContaining({p_id: classId, p_start: '2030-12-01T04:00:00.000Z', p_end: '2030-12-01T05:00:00.000Z', p_revision: 3}));
  expect(pakistanClassInput('2030-12-01T20:00:00Z')).toBe('2030-12-02T01:00');
});

it('names the cancellation, focuses the safe choice, restores focus, and makes no request on dismissal', async () => {
  existingClass(); show();
  const opener = await screen.findByRole('button', {name: 'Cancel Existing writing class'}); opener.focus(); fireEvent.click(opener);
  const dialog = await screen.findByRole('alertdialog', {name: 'Cancel live class?'});
  expect(within(dialog).getByText(/Cancel “Existing writing class”/)).toBeInTheDocument();
  await waitFor(() => expect(within(dialog).getByRole('button', {name: 'Keep class'})).toHaveFocus());
  fireEvent.keyDown(dialog, {key: 'Escape', code: 'Escape'});
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  expect(opener).toHaveFocus(); expect(cancellationCalls()).toHaveLength(0);
});

it('waits for cancellation readback, prevents duplicate requests, and keeps an unrelated draft', async () => {
  existingClass(); show(); await screen.findByText('Learner'); fillDraft();
  fireEvent.click(screen.getByRole('button', {name: 'Cancel Existing writing class'}));
  const dialog = await screen.findByRole('alertdialog', {name: 'Cancel live class?'});
  const response = deferred<Response>(); mock.rpc.mockReturnValueOnce(response.promise);
  const confirm = within(dialog).getByRole('button', {name: 'Confirm cancellation'});
  act(() => { fireEvent.click(confirm); fireEvent.click(confirm); });
  expect(cancellationCalls()).toHaveLength(1);
  expect(within(dialog).getByRole('button', {name: 'Keep class'})).toBeDisabled();
  fireEvent.keyDown(dialog, {key: 'Escape', code: 'Escape'});
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  mock.tables.live_class_sessions[0].status = 'cancelled';
  await act(async () => response.resolve({data: null, error: null}));
  await screen.findByText('“Existing writing class” is cancelled in UniPathway. Microsoft cancellation delivery is confirmed separately.');
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Class title')).toHaveValue('Writing');
  expect(screen.getByLabelText('Learner')).toBeChecked();
});

it('keeps cancellation open until a readback confirms the class is cancelled and can retry only the read', async () => {
  existingClass(); show(); await screen.findByText('Learner');
  fireEvent.click(screen.getByRole('button', {name: 'Cancel Existing writing class'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Confirm cancellation'}));
  await screen.findByText('Cancellation could not be confirmed. Refresh the class status before trying again.');
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(screen.queryByText(/is cancelled in UniPathway/)).not.toBeInTheDocument();
  mock.tables.live_class_sessions[0].status = 'cancelled';
  fireEvent.click(screen.getByRole('button', {name: 'Refresh cancellation status'}));
  await screen.findByText(/is cancelled in UniPathway/);
  expect(cancellationCalls()).toHaveLength(1);
});

it('ignores a pending save result when the active verified role changes', async () => {
  const view = show(); await screen.findByText('Learner'); fillDraft();
  const response = deferred<Response>(); mock.rpc.mockReturnValueOnce(response.promise);
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  const requestedId = savedCalls()[0][1].p_id;
  mock.user = {...mock.user, role: 'student', roles: ['student', 'lecturer']}; view.rerenderPage();
  expect(screen.getByText('A verified teaching role and centre are required to schedule a class.')).toBeInTheDocument();
  const reads = mock.from.mock.calls.length;
  await act(async () => response.resolve({data: requestedId, error: null}));
  expect(screen.queryByText(/^Class saved\./)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Class title')).not.toBeInTheDocument();
  expect(mock.from.mock.calls).toHaveLength(reads);
});

it('rejects an unassigned module before requesting its candidates', async () => {
  mock.tables.modules.push({id: 'other-module', tenant_id: 'centre', lecturer_id: 'other-teacher', title: 'Other teacher module'});
  show('/lecturer/class-scheduler?module=other-module');
  await screen.findByText('This module is not available in your current teaching role. Choose an assigned module.');
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(screen.queryByRole('option', {name: 'Other teacher module'})).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Class title')).not.toBeInTheDocument();
});

it('ignores a pending save after browser navigation to another module and preserves the new draft', async () => {
  mock.tables.modules.push({id: 'second-module', tenant_id: 'centre', lecturer_id: 'teacher', title: 'Second module'});
  const view = show(); await screen.findByText('Learner'); fillDraft();
  const response = deferred<Response>(); mock.rpc.mockReturnValueOnce(response.promise);
  fireEvent.click(screen.getByRole('button', {name: 'Schedule and invite'}));
  const requestedId = savedCalls()[0][1].p_id;
  view.navigate('/lecturer/class-scheduler?module=second-module');
  await screen.findByText('Learner');
  fireEvent.change(screen.getByLabelText('Class title'), {target: {value: 'Second module draft'}});
  await act(async () => response.resolve({data: requestedId, error: null}));
  expect(screen.getByLabelText('Class title')).toHaveValue('Second module draft');
  expect(screen.getByLabelText('Module')).toHaveValue('second-module');
  expect(screen.queryByText(/^Class saved\./)).not.toBeInTheDocument();
});

it('pages assigned classes before verifying cancellation even when another module has many recent classes', async () => {
  existingClass();
  const target = mock.tables.live_class_sessions[0];
  mock.tables.live_class_sessions = [
    ...Array.from({length: 210}, (_, index) => ({...target, id: `unassigned-${index}`, module_id: 'unassigned-module', title: `Unassigned ${index}`})),
    ...Array.from({length: 210}, (_, index) => ({...target, id: `assigned-${index}`, title: `Assigned ${index}`})),
    target,
  ];
  show();
  fireEvent.click(await screen.findByRole('button', {name: 'Cancel Existing writing class'}));
  mock.tables.live_class_sessions[mock.tables.live_class_sessions.length - 1].status = 'cancelled';
  fireEvent.click(await screen.findByRole('button', {name: 'Confirm cancellation'}));
  await screen.findByText(/is cancelled in UniPathway/);
  expect(screen.queryByText('Unassigned 0')).not.toBeInTheDocument();
  expect(screen.getByText('Assigned 209')).toBeInTheDocument();
  expect(mock.from.mock.calls.filter(call => call[0] === 'live_class_sessions').length).toBeGreaterThanOrEqual(4);
});
