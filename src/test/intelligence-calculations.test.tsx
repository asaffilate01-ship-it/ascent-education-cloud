import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import IntelligenceCalculations from '@/components/progression/IntelligenceCalculations';
const mocks = vi.hoisted(() => ({rows: vi.fn(), invoke: vi.fn(), changed: vi.fn()}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {functions: {invoke: mocks.invoke}}}));
vi.mock('@/lib/workflowRows', () => ({workflowRows: (...args: unknown[]) => mocks.rows(...args)}));
const tenant = 'tenant-a';
const data = {
  student_enrolments: [{id: 'e1', student_id: 'learner-a', status: 'active'}, {id: 'e2', student_id: 'inactive', status: 'withdrawn'}],
  course_enrolment_requests: [{id: 'e3', student_id: 'learner-a', status: 'enrolled'}, {id: 'e4', student_id: 'learner-b', status: 'enrolled'}, {id: 'e5', student_id: 'pending', status: 'pending'}],
  course_cohorts: [{id: 'cohort-a', course_id: 'course-a', cohort_reference: 'Autumn'}],
};
const show = () => render(<IntelligenceCalculations tenant={tenant} onCalculated={mocks.changed}/>);
const receipt = (extra = {}) => ({data: {intelligence: {id: 'snapshot', tenant_id: tenant, student_id: 'learner-a', calculated_at: '2026-10-23T12:00:00Z', ...extra}}, error: null});
async function selectLearner() {await screen.findByRole('option', {name: 'learner-a'}); fireEvent.change(screen.getByLabelText('Enrolled learner'), {target: {value: 'learner-a'}});}
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.rows.mockImplementation(async (_db, table: keyof typeof data) => ({data: data[table], error: null})); mocks.invoke.mockResolvedValue(receipt());});
it('loads scoped, deduplicated active choices and sends no client tenant authority', async () => {
  show(); await selectLearner();
  expect(screen.getAllByRole('option', {name: 'learner-a'})).toHaveLength(1);
  expect(screen.queryByRole('option', {name: 'inactive'})).not.toBeInTheDocument();
  expect(screen.queryByRole('option', {name: 'pending'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Calculate learner signal'}));
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledOnce());
  expect(mocks.invoke).toHaveBeenCalledWith('omniqora-student-intelligence', {body: {student_id: 'learner-a'}});
  expect(mocks.rows.mock.calls.every(args => args[2] === tenant)).toBe(true);
});
it('connects a selected cohort to the cohort calculation contract', async () => {
  mocks.invoke.mockResolvedValue({data: {cohort: {id: 'snapshot', tenant_id: tenant, course_id: 'course-a', cohort_reference: 'Autumn', calculated_at: '2026-10-23T12:00:00Z'}}});
  show(); await screen.findByRole('option', {name: 'Autumn'});
  fireEvent.change(screen.getByLabelText('Course cohort'), {target: {value: 'cohort-a'}});
  fireEvent.click(screen.getByRole('button', {name: 'Calculate cohort signals'}));
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledOnce());
  expect(mocks.invoke).toHaveBeenCalledWith('omniqora-cohort-intelligence', {body: {course_id: 'course-a', cohort_reference: 'Autumn'}});
});
it('connects centre summaries without passing a requested tenant', async () => {
  mocks.invoke.mockResolvedValue({data: {snapshot: {id: 'snapshot', tenant_id: tenant, snapshot_date: '2026-10-23'}}});
  show(); await screen.findByRole('option', {name: 'Autumn'});
  fireEvent.click(screen.getByRole('button', {name: 'Calculate centre summary'}));
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledOnce());
  expect(mocks.invoke).toHaveBeenCalledWith('omniqora-executive-snapshot', {body: {}});
});
it.each([{}, {intelligence: {id: 'x', tenant_id: 'other'}}, receipt({student_id: 'other'}).data])('does not announce success for malformed or mismatched receipts %j', async response => {
  mocks.invoke.mockResolvedValue({data: response}); show(); await selectLearner();
  fireEvent.click(screen.getByRole('button', {name: 'Calculate learner signal'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
  expect(mocks.changed).not.toHaveBeenCalled();
});
it('shows missing attendance as unavailable and allows retry', async () => {
  mocks.invoke.mockResolvedValueOnce({error: {context: {status: 422}}}); show(); await selectLearner();
  fireEvent.click(screen.getByRole('button', {name: 'Calculate learner signal'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('No recorded attendance');
  expect(mocks.changed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Calculate learner signal'}));
  await waitFor(() => expect(mocks.changed).toHaveBeenCalledOnce());
});
it('blocks all actions after incomplete choice reads and supports retry', async () => {
  mocks.rows.mockResolvedValue({data: [], error: {message: 'denied'}}); show();
  expect(await screen.findByRole('alert')).toHaveTextContent('choices could not be loaded');
  expect(screen.queryByRole('button', {name: 'Calculate centre summary'})).not.toBeInTheDocument();
  mocks.rows.mockImplementation(async (_db, table: keyof typeof data) => ({data: data[table], error: null}));
  fireEvent.click(screen.getByRole('button', {name: 'Retry calculation choices'}));
  await screen.findByRole('option', {name: 'Autumn'});
});
it('prevents duplicate calculations and ignores responses after the account scope unmounts', async () => {
  let finish!: (value: unknown) => void;
  mocks.invoke.mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  const view = show(); await selectLearner();
  const button = screen.getByRole('button', {name: 'Calculate learner signal'});
  fireEvent.click(button); fireEvent.click(button);
  expect(mocks.invoke).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', {name: 'Calculate centre summary'})).toBeDisabled();
  view.unmount(); await act(async () => {finish(receipt());});
  expect(mocks.changed).not.toHaveBeenCalled();
});
