import type {ReactNode} from 'react';
import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import LearningPlans from '@/pages/tuition/LearningPlans';
import GuardianLearning from '@/pages/tuition/GuardianLearning';
import DirectorTuitionProgress from '@/pages/tuition/DirectorTuitionProgress';
import type {UserRole} from '@/types/platform';

const mock = vi.hoisted(() => {
  const user = {id: 'actor', tenantId: 'centre', role: 'lecturer' as UserRole, roles: ['lecturer'] as UserRole[]};
  return {rpc: vi.fn(), from: vi.fn(), user, loading: false};
});
vi.mock('@/lib/db', () => ({db: {rpc: mock.rpc, from: mock.from}}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.loading})}));
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({title, children}: {title: string; children: ReactNode}) => <main><h1>{title}</h1>{children}</main>,
}));
vi.mock('@/components/assessment/ModuleJourney', () => ({default: () => null}));
vi.mock('@/components/guardian/ParentNavigation', () => ({default: () => null}));

const get = 'get_unipathway_tuition_reports';
const add = 'add_unipathway_tuition_report';
const withdraw = 'withdraw_unipathway_tuition_report';
const roster = 'get_unipathway_tuition_director_roster';
const parentPlans = 'get_unipathway_guardian_learning';
const shareOptions = 'get_unipathway_tuition_report_share_options';
const setShare = 'set_unipathway_tuition_report_share';
const shared = {
  id: 'report-1', created_at: '2026-11-20T09:00:00Z', audience: 'shared',
  summary: 'Practised comparing fractions', strength: 'Explained the model clearly',
  focus: 'Compare denominators', next_action: 'Solve two further examples', concern: 'practice_gap',
};
const staff = {...shared, id: 'report-staff', audience: 'staff', summary: 'Internal teaching context'};
const plans = [
  {id: 'plan-a', module_id: 'module-a', student_id: 'actor', goal: 'Understand equivalent fractions'},
  {id: 'plan-b', module_id: 'module-b', student_id: 'actor', goal: 'Explain sentence grammar'},
];
const guardianPlan = {id: 'plan-a', link_id: 'verified-link', student_name: 'Learner', module_title: 'Maths', goal: 'Understand equivalent fractions', skills: []};
const guardian = {id: 'verified-link', name: 'Verified guardian', shared: false};

function role(value: UserRole) {
  mock.user.role = value;
  mock.user.roles = [value];
}

function page(path: string) {
  return <MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes>
    <Route path="/lecturer/learning-plans" element={<LearningPlans teacher/>}/>
    <Route path="/student/learning-plan" element={<LearningPlans/>}/>
    <Route path="/parent/learning" element={<GuardianLearning/>}/>
    <Route path="/director/tuition-progress" element={<DirectorTuitionProgress/>}/>
  </Routes></MemoryRouter>;
}

function calls(name: string) {return mock.rpc.mock.calls.filter(call => call[0] === name);}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => resolve = done);
  return {promise, resolve};
}

function fillReport() {
  fireEvent.change(screen.getByLabelText('Session summary'), {target: {value: '  Practised comparing fractions  '}});
  fireEvent.change(screen.getByLabelText('Observed strength'), {target: {value: shared.strength}});
  fireEvent.change(screen.getByLabelText('Focus for improvement'), {target: {value: shared.focus}});
  fireEvent.change(screen.getByLabelText('Next action'), {target: {value: shared.next_action}});
  fireEvent.change(screen.getByLabelText('Who can read this report?'), {target: {value: 'shared'}});
}

beforeEach(() => {
  vi.stubEnv('VITE_UNIPATHWAY_TUITION_REPORTS_ENABLED', 'true');
  role('lecturer');
  mock.user.id = 'actor';
  mock.user.tenantId = 'centre';
  mock.loading = false;
  mock.rpc.mockReset().mockResolvedValue({data: []});
  mock.from.mockReset().mockImplementation((table: string) => {
    const rows: Record<string, unknown[]> = {
      modules: [
        {id: 'module-a', title: 'Maths', tenant_id: 'centre', lecturer_id: 'actor'},
        {id: 'module-b', title: 'English', tenant_id: 'centre', lecturer_id: 'actor'},
      ],
      unipathway_learning_plans: plans,
    };
    const query = {select: () => query, eq: () => query, in: () => query, order: () => query, range: async () => ({data: rows[table] || []})};
    return query;
  });
});

afterEach(() => {cleanup(); vi.unstubAllEnvs(); vi.restoreAllMocks();});

it('keeps report and report-consent requests off by default on each role route', async () => {
  vi.stubEnv('VITE_UNIPATHWAY_TUITION_REPORTS_ENABLED', '');
  const lecturer = render(page('/lecturer/learning-plans'));
  await screen.findAllByText('Understand equivalent fractions');
  expect(screen.queryByText('Tuition session reports')).not.toBeInTheDocument();
  lecturer.unmount();
  role('student');
  const learner = render(page('/student/learning-plan'));
  await screen.findByText('Parent progress sharing');
  expect(screen.queryByText('Share session reports with a guardian')).not.toBeInTheDocument();
  learner.unmount();
  role('parent_guardian');
  mock.rpc.mockResolvedValueOnce({data: [guardianPlan]});
  const family = render(page('/parent/learning'));
  await screen.findByText('Understand equivalent fractions');
  family.unmount();
  role('centre_director');
  render(page('/director/tuition-progress'));
  await screen.findByText('Tuition session reports are not available yet.');
  expect([...calls(get), ...calls(shareOptions), ...calls(roster)]).toHaveLength(0);
});

it('preserves an uncertain tutor draft and retries with its original UUID and payload', async () => {
  mock.rpc.mockImplementation(async (name: string, payload: Record<string, string>) => {
    if (name === add) return calls(add).length === 1 ? {error: {message: 'connection interrupted'}} : {data: payload.p_id};
    return {data: []};
  });
  render(page('/lecturer/learning-plans'));
  await screen.findByText('No session reports have been recorded for this plan.');
  fillReport();
  fireEvent.click(screen.getByRole('button', {name: 'Save session report'}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Retry same report'})).toBeEnabled());
  const summary = screen.getByLabelText('Session summary');
  expect(summary).toHaveValue('  Practised comparing fractions  ');
  expect(summary).toBeDisabled();
  fireEvent.click(screen.getByRole('button', {name: 'Retry same report'}));
  await screen.findByText('Session report saved.');
  expect(calls(add)).toHaveLength(2);
  expect(calls(add)[0]).toEqual(calls(add)[1]);
  expect(calls(add)[0][1]).toMatchObject({p_id: expect.stringMatching(/^[0-9a-f-]{36}$/i), p_plan: 'plan-a', p_summary: shared.summary, p_concern: null, p_audience: 'shared'});
  expect(summary).toHaveValue('');
});

it('confirms a lost receipt from the exact report readback without a second write', async () => {
  mock.rpc.mockImplementation(async (name: string, payload: Record<string, string>) => {
    if (name === add) return {data: 'unexpected-receipt'};
    if (name === get && calls(add).length) {
      const request = calls(add)[0][1];
      return {data: [{...shared, id: request.p_id, concern: request.p_concern}]};
    }
    return {data: []};
  });
  render(page('/lecturer/learning-plans'));
  await screen.findByText('No session reports have been recorded for this plan.');
  fillReport();
  fireEvent.change(screen.getByLabelText('Educational concern (optional)'), {target: {value: 'practice_gap'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save session report'}));
  await screen.findByText('Session report saved.');
  expect(calls(add)).toHaveLength(1);
  expect(calls(add)[0][1].p_concern).toBe('practice_gap');
  expect(screen.queryByText('Retry same report')).not.toBeInTheDocument();
});

it('hides old tutor results on refresh and ignores a selected-plan response that arrives after switching', async () => {
  const delayed = deferred<{data: unknown[]}>();
  mock.rpc.mockImplementation((name: string, args: {p_plan?: string}) => {
    if (name !== get) return Promise.resolve({data: []});
    if (args.p_plan === 'plan-b') return Promise.resolve({data: [{...shared, id: 'current', summary: 'Current English report'}]});
    return calls(get).length === 1 ? Promise.resolve({data: [shared]}) : delayed.promise;
  });
  render(page('/lecturer/learning-plans'));
  await screen.findByText(shared.summary);
  fireEvent.change(screen.getByLabelText('Session summary'), {target: {value: 'Unsubmitted note'}});
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(screen.queryByText(shared.summary)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Session summary')).toHaveValue('Unsubmitted note');
  fireEvent.change(screen.getByLabelText('Learning plan'), {target: {value: 'plan-b'}});
  await screen.findByText('Current English report');
  await act(async () => delayed.resolve({data: [{...shared, summary: 'Late Maths report'}]}));
  expect(screen.queryByText('Late Maths report')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Session summary')).toHaveValue('');
});

it('offers a separate verified learner opt-in and revocation, never renders staff-only notes', async () => {
  role('student');
  let allowed = false;
  mock.rpc.mockImplementation(async (name: string, args: {p_share?: boolean}) => {
    if (name === get) return {data: [{...shared, focus: null, next_action: null}, staff]};
    if (name === shareOptions) return {data: [{...guardian, shared: allowed}]};
    if (name === setShare) allowed = !!args.p_share;
    return {data: []};
  });
  render(page('/student/learning-plan'));
  await screen.findByText(shared.summary);
  expect(screen.getAllByText('Not recorded')).toHaveLength(2);
  expect(screen.queryByText(staff.summary)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Save session report'})).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', {name: 'Enable report sharing for Verified guardian'}));
  await screen.findByText('Report sharing enabled.');
  fireEvent.click(await screen.findByRole('button', {name: 'Turn off report sharing for Verified guardian'}));
  await screen.findByText('Report sharing removed.');
  expect(calls(setShare).map(call => call[1])).toEqual([
    {p_plan: 'plan-a', p_link: 'verified-link', p_share: true},
    {p_plan: 'plan-a', p_link: 'verified-link', p_share: false},
  ]);
  expect(calls('set_unipathway_learning_share')).toHaveLength(0);
});

it('only reads guardian plans returned by the existing share list and hides reports when focused after revocation', async () => {
  role('parent_guardian');
  const revoked = deferred<{error: {message: string; code: string}}>();
  mock.rpc.mockImplementation((name: string) => {
    if (name === parentPlans) return Promise.resolve({data: [guardianPlan]});
    if (name === get) return calls(get).length === 1 ? Promise.resolve({data: [shared, staff]}) : revoked.promise;
    return Promise.resolve({data: []});
  });
  render(page('/parent/learning?learner=verified-link'));
  await screen.findByText(shared.summary);
  expect(screen.queryByText(staff.summary)).not.toBeInTheDocument();
  expect(calls(get)).toEqual([[get, {p_plan: 'plan-a'}]]);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(screen.queryByText(shared.summary)).not.toBeInTheDocument();
  await act(async () => revoked.resolve({error: {message: 'sharing revoked', code: '42501'}}));
  await screen.findByText(/The learner manages this permission separately/);
  expect(screen.queryByText(shared.summary)).not.toBeInTheDocument();
  expect(calls(shareOptions)).toHaveLength(0);
});

it('uses only the centre director RPCs for a read-only roster and hides them after an active role switch', async () => {
  role('centre_director');
  mock.rpc.mockImplementation(async (name: string) => ({data: name === roster ? [
    {id: 'plan-a', module_title: 'Maths', student_name: 'Verified learner'},
  ] : [shared, staff]}));
  const view = render(page('/director/tuition-progress'));
  await screen.findByRole('option', {name: 'Maths · Verified learner'});
  fireEvent.change(screen.getByLabelText('Learning plan'), {target: {value: 'plan-a'}});
  await screen.findByText(staff.summary);
  expect(mock.from).not.toHaveBeenCalled();
  expect(mock.rpc.mock.calls).toEqual([[roster], [get, {p_plan: 'plan-a'}]]);
  expect(screen.queryByText('Save session report')).not.toBeInTheDocument();
  expect(screen.queryByText('Withdraw report')).not.toBeInTheDocument();
  mock.user.roles = ['centre_director', 'superadmin'];
  view.rerender(page('/director/tuition-progress'));
  expect(screen.queryByText(staff.summary)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Learning plan')).not.toBeInTheDocument();
});

it('requires manual tutor confirmation to withdraw, keeps an unsaved draft and retries the same target', async () => {
  mock.rpc.mockImplementation(async (name: string, args: {p_id?: string}) => {
    if (name === withdraw) return calls(withdraw).length === 1 ? {error: {message: 'Lost receipt'}} : {data: args.p_id};
    return {data: name === get && calls(withdraw).length === 0 ? [shared] : []};
  });
  render(page('/lecturer/learning-plans'));
  await screen.findByText(shared.summary);
  fireEvent.change(screen.getByLabelText('Session summary'), {target: {value: 'Keep this another draft'}});
  const details = screen.getByText(shared.summary).closest('details')!;
  fireEvent.click(details.querySelector('summary')!);
  await waitFor(() => expect(details).toHaveAttribute('open'));
  fireEvent.click(within(details).getByRole('button', {name: 'Withdraw report'}));
  fireEvent.click(screen.getByRole('button', {name: 'Cancel withdrawal'}));
  expect(calls(withdraw)).toHaveLength(0);
  fireEvent.click(within(details).getByRole('button', {name: 'Withdraw report'}));
  fireEvent.click(screen.getByRole('button', {name: 'Confirm withdrawal'}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Retry same withdrawal'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button', {name: 'Retry same withdrawal'}));
  await screen.findByText('Session report withdrawn.');
  expect(calls(withdraw)).toEqual([[withdraw, {p_plan:'plan-a', p_id:'report-1'}], [withdraw, {p_plan:'plan-a', p_id:'report-1'}]]);
  expect(screen.queryByText(shared.summary)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Session summary')).toHaveValue('Keep this another draft');
});

it('refreshes separate options on the same page after base guardian sharing is enabled', async () => {
  role('student');
  let baseline = false;
  const oldOpt = 'get_unipathway_learning_share_options';
  const oldSet = 'set_unipathway_learning_share';
  mock.rpc.mockImplementation(async (name: string, args: {p_share?: boolean}) => {
    if (name === oldOpt) return {data: [{...guardian, verified: true, shared: baseline}]};
    if (name === oldSet) baseline = !!args.p_share;
    if (name === shareOptions) return {data: baseline ? [guardian] : []};
    return {data: []};
  });
  render(page('/student/learning-plan'));
  await screen.findByText(/No verified guardians currently have access/);
  expect(screen.queryByRole('button', {name: 'Enable report sharing for Verified guardian'})).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('checkbox', {name: 'Verified guardian'}));
  await screen.findByRole('button', {name: 'Enable report sharing for Verified guardian'});
  expect(calls(oldSet)).toEqual([[oldSet,{p_plan:'plan-a',p_link:'verified-link',p_share:true}]]);
  expect(calls(setShare)).toHaveLength(0);
});

it('ignores a tutor save result when the active role changes before acknowledgement', async () => {
  const write = deferred<{data: string}>();
  mock.rpc.mockImplementation((name: string) => name === add ? write.promise : Promise.resolve({data: []}));
  const view = render(page('/lecturer/learning-plans'));
  await screen.findByText('No session reports have been recorded for this plan.');
  fillReport();
  fireEvent.click(screen.getByRole('button', {name: 'Save session report'}));
  await waitFor(() => expect(calls(add)).toHaveLength(1));
  role('programme_leader');
  view.rerender(page('/lecturer/learning-plans'));
  await act(async () => write.resolve({data: calls(add)[0][1].p_id}));
  expect(screen.queryByText('Tuition session reports')).not.toBeInTheDocument();
  expect(screen.queryByText('Session report saved.')).not.toBeInTheDocument();
  expect(calls(get)).toHaveLength(1);
});
