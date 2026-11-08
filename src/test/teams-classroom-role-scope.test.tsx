import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

type Row = Record<string, unknown>;
type Filter = [string, unknown];
const state = vi.hoisted(() => ({
  user: {id: 'learner', tenantId: 'centre-a', role: 'student', roles: ['student', 'lecturer']} as {id: string; tenantId?: string; role: string; roles: string[]},
  calls: [] as {table: string; filters: Filter[]; from: number; to: number}[],
  classes: [] as Row[], boards: [] as Row[],
  failure: null as {table: string; offset?: number} | null,
  unfilteredResponse: false, deferNext: false,
  resolve: undefined as (() => void) | undefined,
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: state.user})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney', () => ({default: () => null}));
vi.mock('@/components/native/TeamsLink', () => ({default: ({children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>}));
vi.mock('@/lib/db', () => ({db: {from: (table: string) => {
  const filters: Filter[] = [], orders: [string, boolean][] = [];
  const q = {
    select: () => q,
    eq: (column: string, value: unknown) => {filters.push([column, value]); return q;},
    in: (column: string, values: unknown[]) => {filters.push([column, values]); return q;},
    order: (column: string, options?: {ascending?: boolean}) => {orders.push([column, options?.ascending !== false]); return q;},
    range: (from: number, to: number) => {
      state.calls.push({table, filters: [...filters], from, to});
      const failed = state.failure?.table === table && (state.failure.offset === undefined || state.failure.offset === from);
      let rows = table === 'live_class_sessions' ? state.classes : state.boards;
      if (!state.unfilteredResponse) rows = rows.filter(row => filters.every(([key, value]) => Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
      rows = [...rows].sort((a, b) => {
        for (const [key, ascending] of orders) {
          const comparison = String(a[key]).localeCompare(String(b[key]));
          if (comparison) return ascending ? comparison : -comparison;
        }
        return 0;
      });
      const result = {data: failed ? null : rows.slice(from, to + 1), error: failed ? {message: 'private provider failure'} : null};
      if (table === 'live_class_sessions' && state.deferNext) {
        state.deferNext = false;
        return new Promise<typeof result>(resolve => {state.resolve = () => resolve(result);});
      }
      return Promise.resolve(result);
    },
  };
  return q;
}}}));
import TeamsClassroom from '@/pages/classroom/TeamsClassroom';

const session = (overrides: Row = {}): Row => ({
  id: 's1', tenant_id: 'centre-a', module_id: 'module-a', title: 'My authorised workshop',
  starts_at: '2099-01-01T10:00:00Z', ends_at: '2099-01-01T11:00:00Z', status: 'scheduled',
  join_url: null, class_mode: 'seminar', recording_enabled: false, capacity: 15, ...overrides,
});
const board = (overrides: Row = {}): Row => ({id: 'board-a', tenant_id: 'centre-a', session_id: 's1', title: 'Notes', created_at: '2026-11-01T10:00:00Z', ...overrides});
beforeEach(() => {
  state.calls = []; state.boards = []; state.failure = null; state.unfilteredResponse = false; state.deferNext = false; state.resolve = undefined;
  state.user = {id: 'learner', tenantId: 'centre-a', role: 'student', roles: ['student', 'lecturer']};
  state.classes = [session(), session({id: 's2', tenant_id: 'centre-b', module_id: 'module-b', title: 'Private other centre class'})];
});
afterEach(cleanup);
const view = () => <TeamsClassroom/>;
const show = (path = '/student/classroom') => render(<MemoryRouter initialEntries={[path]}>{view()}</MemoryRouter>);

it('reads current-centre sessions and boards and rejects unexpected foreign response rows', async () => {
  state.unfilteredResponse = true;
  state.boards = [board(), board({id: 'foreign-board', tenant_id: 'centre-b', session_id: 's1', created_at: '2099-01-01'})];
  show();
  expect(await screen.findByText('My authorised workshop')).toBeInTheDocument();
  expect(screen.queryByText('Private other centre class')).toBeNull();
  expect(state.calls.map(x => x.table)).toEqual(['live_class_sessions', 'lesson_whiteboards']);
  expect(state.calls.every(x => x.filters.some(([key, value]) => key === 'tenant_id' && value === 'centre-a'))).toBe(true);
  expect(screen.getByRole('link', {name: 'Open live board & replay'})).toHaveAttribute('href', '/classroom/whiteboard/board-a');
});

it('opens the exact agenda session and retains module and session context in next steps', async () => {
  state.classes.push(session({id: 's3', title: 'Another class in the same module'}));
  state.boards = [board()];
  show('/student/classroom?module=module-a&session=s1');
  const selected = await screen.findByRole('region', {name: 'Selected class'});
  expect(within(selected).getByText('My authorised workshop')).toBeInTheDocument();
  expect(screen.queryByText('Another class in the same module')).toBeNull();
  expect(state.calls[0].filters).toEqual(expect.arrayContaining([['module_id', 'module-a'], ['id', 's1']]));
  expect(state.calls[1].filters).toContainEqual(['session_id', ['s1']]);
  expect(screen.getByRole('link', {name: 'Open my class archive'})).toHaveAttribute('href', '/student/lesson-archive?module=module-a&session=s1');
  expect(screen.getByRole('link', {name: 'All enrolled course notes and materials'})).toHaveAttribute('href', '/student/materials?module=module-a');
  expect(screen.getByRole('link', {name: 'View all classes'})).toHaveAttribute('href', '/student/classroom?module=module-a');
});

it.each(['/student/classroom?module=module-a&session=missing', '/student/classroom?module=module-b&session=s1'])('does not substitute another class for an unavailable selection: %s', async path => {
  state.unfilteredResponse = true;
  show(path);
  expect(await screen.findByRole('heading', {name: 'Requested class is unavailable'})).toBeInTheDocument();
  expect(screen.queryByText('My authorised workshop')).toBeNull();
  expect(screen.queryByText('No upcoming classes')).toBeNull();
  expect(state.calls.filter(call => call.table === 'lesson_whiteboards')).toHaveLength(0);
});

it('shows an explicitly selected ended class and returns to its past-class list', async () => {
  state.classes = [session({status: 'ended', starts_at: '2020-01-01T10:00:00Z', ends_at: '2020-01-01T11:00:00Z', join_url: 'https://teams.microsoft.com/l/meetup-join/private'})];
  show('/student/classroom?module=module-a&session=s1');
  await screen.findByRole('region', {name: 'Selected class'});
  expect(screen.getByText('Class completed')).toBeInTheDocument();
  expect(screen.queryByRole('link', {name: /Join Teams/})).toBeNull();
  expect(screen.getByRole('link', {name: 'View all classes'})).toHaveAttribute('href', '/student/classroom?module=module-a&view=past');
});

it('retains authorised general classes without a module filter', async () => {
  state.classes = [session({module_id: null, title: 'General study support'})];
  show();
  expect(await screen.findByText('General study support')).toBeInTheDocument();
  expect(state.calls[0].filters.some(([key]) => key === 'module_id')).toBe(false);
});

it('reads beyond the first 250 classes and pages the complete permitted result', async () => {
  state.classes = Array.from({length: 251}, (_, index) => session({id: `s${String(index).padStart(3, '0')}`, title: `Class ${String(index).padStart(3, '0')}`}));
  show();
  expect(await screen.findByText('251 upcoming classes')).toBeInTheDocument();
  expect(state.calls.filter(call => call.table === 'live_class_sessions').map(call => call.from)).toEqual([0, 250]);
  expect(state.calls.filter(call => call.table === 'lesson_whiteboards').map(call => (call.filters.find(([key]) => key === 'session_id')![1] as string[]).length)).toEqual([50, 50, 50, 50, 50, 1]);
  expect(screen.queryByText('Class 020')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Next classes'}));
  expect(screen.getByText('Class 020')).toBeInTheDocument();
  expect(screen.getByText('Page 2 of 13')).toBeInTheDocument();
});

it('pages boards within the returned sessions and keeps the most recent available board', async () => {
  state.boards = Array.from({length: 251}, (_, index) => board({id: `board-${index}`, created_at: index === 250 ? '2099-01-01' : '2026-11-01'}));
  show('/student/classroom?session=s1');
  expect(await screen.findByRole('link', {name: 'Open live board & replay'})).toHaveAttribute('href', '/classroom/whiteboard/board-250');
  expect(state.calls.filter(call => call.table === 'lesson_whiteboards').map(call => call.from)).toEqual([0, 250]);
});

it('rejects a partial class snapshot when a later page fails and offers a real retry', async () => {
  state.classes = Array.from({length: 251}, (_, index) => session({id: `s${index}`}));
  state.failure = {table: 'live_class_sessions', offset: 250};
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Classes could not be loaded');
  expect(screen.queryByText('My authorised workshop')).toBeNull();
  expect(screen.queryByText('No upcoming classes')).toBeNull();
  expect(state.calls.some(call => call.table === 'lesson_whiteboards')).toBe(false);
  state.failure = null; state.classes = [session()];
  fireEvent.click(screen.getByRole('button', {name: 'Retry classes'}));
  expect(await screen.findByText('My authorised workshop')).toBeInTheDocument();
});

it('preserves classes when boards fail and recovers board availability on refresh', async () => {
  state.failure = {table: 'lesson_whiteboards'};
  state.boards = [board()];
  show();
  expect(await screen.findByText('My authorised workshop')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Whiteboards could not be checked');
  expect(screen.getByText('Board availability could not be checked')).toBeInTheDocument();
  expect(screen.queryByText('No live board is available for this class')).toBeNull();
  state.failure = null;
  fireEvent.click(screen.getByRole('button', {name: 'Refresh classes'}));
  expect(await screen.findByRole('link', {name: 'Open live board & replay'})).toBeInTheDocument();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('a secondary lecturer membership never unlocks active student teaching links', async () => {
  show(); await screen.findByText('My authorised workshop');
  expect(screen.queryByRole('link', {name: /Class scheduling/})).toBeNull();
  expect(screen.getByRole('link', {name: /Class resources & recordings/})).toBeInTheDocument();
});

it('keeps verified active staff teaching links and lecturer archive paths', async () => {
  state.user.role = 'lecturer';
  show('/lecturer/classroom?module=module-a&session=s1');
  await screen.findByText('My authorised workshop');
  expect(screen.getByRole('link', {name: /Class scheduling/})).toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Teaching desk · groups & recordings'})).toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Open my class archive'})).toHaveAttribute('href', '/lecturer/lesson-archive?module=module-a&session=s1');
});

it('a missing assigned centre refuses class queries and shows explicit recovery', async () => {
  state.user = {id: 'learner', role: 'student', roles: ['student'], tenantId: undefined};
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('verified centre assignment');
  expect(state.calls).toEqual([]);
});

it('clears already loaded classes when the current role is revoked', async () => {
  const rendered = show();
  await screen.findByText('My authorised workshop');
  const previousReads = state.calls.length;
  state.user = {...state.user, roles: ['lecturer']};
  rendered.rerender(<MemoryRouter>{view()}</MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('active role could not be verified');
  expect(screen.queryByText('My authorised workshop')).toBeNull();
  expect(state.calls).toHaveLength(previousReads);
});

it('discards a late response from the previous account after switching centre', async () => {
  state.deferNext = true;
  const rendered = show();
  await waitFor(() => expect(state.resolve).toBeTypeOf('function'));
  state.user = {id: 'other', tenantId: 'centre-b', role: 'student', roles: ['student']};
  rendered.rerender(<MemoryRouter>{view()}</MemoryRouter>);
  expect(await screen.findByText('Private other centre class')).toBeInTheDocument();
  await act(async () => {state.resolve?.();});
  expect(screen.queryByText('My authorised workshop')).toBeNull();
  expect(screen.getByText('Private other centre class')).toBeInTheDocument();
});
