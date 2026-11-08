import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';

type Row = Record<string, unknown>;
type Filter = [string, unknown];
const state = vi.hoisted(() => ({
  user: {id: 'student', tenantId: 'centre', role: 'student', roles: ['student', 'lecturer']},
  data: {} as Record<string, Row[]>, calls: [] as {table: string; filters: Filter[]; from: number}[],
  failure: '', unfilteredResponse: false, deferTable: '', resolve: undefined as (() => void) | undefined,
  media: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: state.user})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney', () => ({default: () => null}));
vi.mock('@/components/learning/ClassRecordingPlayer', () => ({default: ({title}: {title: string}) => <div role="dialog">Recording: {title}</div>}));
vi.mock('@/lib/learning/classMedia', () => ({classMediaUrl: state.media}));
vi.mock('@/lib/db', () => ({db: {from: (table: string) => {
  const filters: Filter[] = [];
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {filters.push([column, value]); return query;},
    in: (column: string, values: unknown[]) => {filters.push([column, values]); return query;},
    order: () => query,
    range: (from: number, to: number) => {
      state.calls.push({table, filters: [...filters], from});
      const raw = state.data[table] || [];
      const rows = state.unfilteredResponse ? raw : raw.filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
      const result = {data: state.failure === table ? null : rows.slice(from, to + 1), error: state.failure === table ? {message: 'private provider details'} : null};
      if (state.deferTable === table) {
        state.deferTable = '';
        return new Promise<typeof result>(resolve => {state.resolve = () => resolve(result);});
      }
      return Promise.resolve(result);
    },
  };
  return query;
}}}));
import LessonArchive from '@/pages/student/LessonArchive';

const session = (overrides: Row = {}): Row => ({
  id: 'session-a', tenant_id: 'centre', module_id: 'module-a', title: 'My completed lesson',
  starts_at: '2020-01-01T10:00:00Z', ends_at: '2020-01-01T11:00:00Z', status: 'ended', actual_ended_at: '2020-01-01T11:00:00Z', ...overrides,
});
const artifact = (overrides: Row = {}): Row => ({
  id: 'recording-a', tenant_id: 'centre', session_id: 'session-a', artifact_type: 'recording',
  publication_status: 'published', storage_reference: 'private/recording-a', available_at: '2020-01-02T11:00:00Z', ...overrides,
});
beforeEach(() => {
  vi.stubEnv('VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED', 'true');
  state.user = {id: 'student', tenantId: 'centre', role: 'student', roles: ['student', 'lecturer']};
  state.calls = []; state.failure = ''; state.unfilteredResponse = false; state.deferTable = ''; state.resolve = undefined; state.media.mockReset();
  state.data = {
    student_enrolments: [
      {id: 'enrolment-a', tenant_id: 'centre', student_id: 'student', programme_id: 'programme-a', status: 'active'},
      {id: 'enrolment-b', tenant_id: 'other-centre', student_id: 'other', programme_id: 'programme-b', status: 'active'},
    ],
    modules: [
      {id: 'module-a', tenant_id: 'centre', programme_id: 'programme-a', lecturer_id: 'lecturer'},
      {id: 'module-b', tenant_id: 'other-centre', programme_id: 'programme-b', lecturer_id: 'other-lecturer'},
    ],
    live_class_sessions: [session(), session({id: 'other-session', tenant_id: 'other-centre', module_id: 'module-b', title: 'Other centre lesson'})],
    live_class_artifacts: [artifact()],
    lesson_ai_packs: [{id: 'pack-a', tenant_id: 'centre', session_id: 'session-a', status: 'published', summary: 'Reviewed revision notes'}],
  };
});
afterEach(() => {cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks();});
const show = (path = '/student/lesson-archive') => render(<MemoryRouter initialEntries={[path]}><LessonArchive/></MemoryRouter>);

it('keeps the disabled service distinct from a failed read and preserves return context without any data or signing calls', async () => {
  vi.stubEnv('VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED', 'false');
  show('/student/lesson-archive?module=module-a&session=session-a');
  expect(await screen.findByRole('heading', {name: 'Recordings are awaiting activation'})).toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Return to classroom'})).toHaveAttribute('href', '/student/classroom?module=module-a&session=session-a');
  expect(screen.getByRole('link', {name: 'Open course materials'})).toHaveAttribute('href', '/student/materials?module=module-a');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('button', {name: /Retry|Refresh/})).toBeNull();
  expect(state.calls).toEqual([]);
  expect(state.media).not.toHaveBeenCalled();
});

it('denies an unverified active role before reading even when release is enabled', async () => {
  state.user = {...state.user, role: 'lecturer', roles: ['student']};
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Archive access is unavailable');
  expect(screen.queryByRole('heading', {name: 'Recordings are awaiting activation'})).toBeNull();
  expect(state.calls).toEqual([]);
});

it('opens the selected permitted class and keeps the module on all archive return paths', async () => {
  state.data.live_class_sessions.push(session({id: 'another-session', title: 'Another permitted lesson'}));
  show('/student/lesson-archive?module=module-a&session=session-a');
  const selected = await screen.findByRole('region', {name: 'Selected archived class'});
  expect(within(selected).getByText('My completed lesson')).toBeInTheDocument();
  expect(screen.queryByText('Another permitted lesson')).toBeNull();
  expect(screen.queryByText('Other centre lesson')).toBeNull();
  expect(state.calls.find(call => call.table === 'live_class_sessions')?.filters).toEqual(expect.arrayContaining([['tenant_id', 'centre'], ['module_id', ['module-a']], ['id', 'session-a']]));
  expect(screen.getByRole('link', {name: 'View all archived classes'})).toHaveAttribute('href', '/student/lesson-archive?module=module-a');
  expect(screen.getByRole('link', {name: 'Return to classroom'})).toHaveAttribute('href', '/student/classroom?module=module-a&session=session-a');
  expect(screen.getByRole('button', {name: 'Watch recording'})).toBeInTheDocument();
});

it('does not query classes for a module outside current enrolment or allocation', async () => {
  show('/student/lesson-archive?module=module-b');
  expect(await screen.findByRole('heading', {name: 'Requested module is unavailable'})).toBeInTheDocument();
  expect(screen.queryByRole('heading', {name: 'No authorised classes are available'})).toBeNull();
  expect(state.calls.map(call => call.table)).toEqual(['student_enrolments', 'modules']);
  expect(screen.getByRole('link', {name: 'Show all permitted modules'})).toHaveAttribute('href', '/student/lesson-archive');
});

it.each(['missing', 'other-session', 'general-session'])('does not replace an unavailable selected class or broaden archive scope: %s', async id => {
  state.data.live_class_sessions.push(session({id: 'general-session', module_id: null, title: 'General invited class'}));
  show(`/student/lesson-archive?module=module-a&session=${id}`);
  expect(await screen.findByRole('heading', {name: 'Requested class is unavailable'})).toBeInTheDocument();
  expect(screen.queryByText('My completed lesson')).toBeNull();
  expect(state.calls.some(call => call.table === 'live_class_artifacts' || call.table === 'lesson_ai_packs')).toBe(false);
});

it('filters unexpected response rows and enforces published release and actual-end checks', async () => {
  state.unfilteredResponse = true;
  state.data.live_class_artifacts.push(
    artifact({id: 'foreign', tenant_id: 'other-centre', artifact_type: 'foreign-file'}),
    artifact({id: 'draft', publication_status: 'draft', artifact_type: 'draft-file'}),
    artifact({id: 'not-released', available_at: null, artifact_type: 'unreleased-file'}),
    artifact({id: 'too-early', available_at: '2020-01-01T12:00:00Z', artifact_type: 'early-file'}),
  );
  state.data.lesson_ai_packs.push({id: 'foreign-pack', tenant_id: 'other-centre', session_id: 'session-a', status: 'published', summary: 'Private foreign notes'});
  show();
  await screen.findByText('My completed lesson');
  expect(screen.queryByText('Other centre lesson')).toBeNull();
  expect(screen.getAllByRole('button', {name: /^Open .* file$/})).toHaveLength(1);
  expect(screen.getByRole('button', {name: 'Open recording file'})).toBeInTheDocument();
  expect(screen.queryByText('Private foreign notes')).toBeNull();
  expect(state.calls.every(call => call.filters.some(([key, value]) => key === 'tenant_id' && value === 'centre'))).toBe(true);
  expect(state.media).not.toHaveBeenCalled();
});

it('distinguishes a failed artifact read from an empty archive and retries the complete authorised read', async () => {
  state.failure = 'live_class_artifacts';
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Archive could not be loaded');
  expect(screen.queryByText('My completed lesson')).toBeNull();
  expect(screen.queryByRole('heading', {name: 'No authorised classes are available'})).toBeNull();
  expect(screen.queryByText('private provider details')).toBeNull();
  state.failure = '';
  fireEvent.click(screen.getByRole('button', {name: 'Retry archive'}));
  expect(await screen.findByText('My completed lesson')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('reports an empty authorised snapshot without pretending that access or activation failed', async () => {
  state.data.live_class_sessions = [];
  show();
  expect(await screen.findByRole('heading', {name: 'No authorised classes are available'})).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('heading', {name: 'Recordings are awaiting activation'})).toBeNull();
  expect(state.calls.some(call => call.table === 'live_class_artifacts')).toBe(false);
});

it('clears search and availability filters with keyboard focus returned to class search', async () => {
  show(); await screen.findByText('My completed lesson');
  fireEvent.change(screen.getByRole('textbox', {name: 'Search classes'}), {target: {value: 'Missing title'}});
  fireEvent.change(screen.getByRole('combobox', {name: 'Show'}), {target: {value: 'packs'}});
  expect(screen.getByRole('heading', {name: 'No classes match these filters'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Clear archive filters'}));
  expect(screen.getByText('My completed lesson')).toBeInTheDocument();
  expect(screen.getByRole('textbox', {name: 'Search classes'})).toHaveValue('');
  expect(screen.getByRole('textbox', {name: 'Search classes'})).toHaveFocus();
  expect(screen.getByRole('combobox', {name: 'Show'})).toHaveValue('all');
});

it('keeps the active lecturer restricted to allocated modules and lecturer return routes', async () => {
  state.user = {id: 'lecturer', tenantId: 'centre', role: 'lecturer', roles: ['lecturer']};
  show('/lecturer/lesson-archive?module=module-a&session=session-a');
  await screen.findByText('My completed lesson');
  expect(state.calls[0]).toMatchObject({table: 'modules'});
  expect(state.calls[0].filters).toContainEqual(['lecturer_id', 'lecturer']);
  expect(state.calls.some(call => call.table === 'student_enrolments')).toBe(false);
  expect(screen.getByRole('link', {name: 'Return to classroom'})).toHaveAttribute('href', '/lecturer/classroom?module=module-a&session=session-a');
});

it('clears released assets immediately when the verified role is revoked', async () => {
  const rendered = show();
  await screen.findByRole('button', {name: 'Watch recording'});
  const previousReads = state.calls.length;
  state.user = {...state.user, roles: []};
  rendered.rerender(<MemoryRouter><LessonArchive/></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('Archive access is unavailable');
  expect(screen.queryByRole('button', {name: 'Watch recording'})).toBeNull();
  expect(screen.queryByText('My completed lesson')).toBeNull();
  expect(state.calls).toHaveLength(previousReads);
});

it('discards a late session response when the account and centre change', async () => {
  state.deferTable = 'live_class_sessions';
  const rendered = show();
  await waitFor(() => expect(state.resolve).toBeTypeOf('function'));
  state.user = {id: 'other', tenantId: 'other-centre', role: 'student', roles: ['student']};
  rendered.rerender(<MemoryRouter><LessonArchive/></MemoryRouter>);
  expect(await screen.findByText('Other centre lesson')).toBeInTheDocument();
  await act(async () => {state.resolve?.();});
  expect(screen.queryByText('My completed lesson')).toBeNull();
  expect(screen.queryByRole('button', {name: 'Watch recording'})).toBeNull();
  expect(screen.getByText('Other centre lesson')).toBeInTheDocument();
});

it('closes a pending private download and never navigates its late URL after role revocation', async () => {
  let resolveMedia: (url: string) => void;
  state.media.mockImplementation(() => new Promise<string>(resolve => {resolveMedia = resolve;}));
  const target = {opener: {}, close: vi.fn(), location: {replace: vi.fn()}};
  vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window);
  const rendered = show();
  fireEvent.click(await screen.findByRole('button', {name: 'Open recording file'}));
  await waitFor(() => expect(state.media).toHaveBeenCalledWith('private/recording-a'));
  expect(target.opener).toBeNull();
  state.user = {...state.user, roles: []};
  rendered.rerender(<MemoryRouter><LessonArchive/></MemoryRouter>);
  expect(target.close).toHaveBeenCalled();
  await act(async () => {resolveMedia!('https://private.example.test/signed-recording');});
  expect(target.location.replace).not.toHaveBeenCalled();
});
