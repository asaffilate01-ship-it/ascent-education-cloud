import type {ReactNode} from 'react';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ScheduleManager from '@/pages/schedule/ScheduleManager';
import type {LectureWithModule} from '@/hooks/useScheduledLectures';

const mock = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  history: vi.fn(),
  lectures: [] as LectureWithModule[],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({user: {id: 'operator', tenantId: 'centre', role: 'programme_leader'}}),
}));
vi.mock('@tanstack/react-query', () => ({useQuery: () => ({data: [], refetch: mock.history})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({
  useSupabaseQuery: () => ({data: [{id: 'module', title: 'Synthetic module', lecturer_id: 'lecturer'}]}),
}));
vi.mock('@/hooks/useScheduledLectures', () => ({
  DAY_NAMES: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  TIME_SLOTS: [{start: '09:00', end: '10:30', label: '09:00–10:30'}],
  useScheduledLectures: () => ({lectures: mock.lectures, addLecture: mock.add, updateLecture: mock.update}),
}));
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

const stored: LectureWithModule = {
  id: 'saved',
  tenant_id: 'centre',
  module_id: 'module',
  lecturer_id: 'lecturer',
  module_title: 'Synthetic module',
  module_code: null,
  programme_title: 'Synthetic programme',
  lecturer_name: 'Synthetic lecturer',
  day_of_week: 1,
  start_time: '09:00:00',
  end_time: '10:30:00',
  academic_year: '2026/27',
  semester: 1,
  effective_from: '2026-09-07',
  effective_until: '2027-06-30',
  room: 'Room 1',
  is_active: true,
  cohort_reference: null,
  recurrence: 'weekly',
  color: '#3b82f6',
  notes: null,
  created_at: '2026-08-12T08:00:00.000Z',
  updated_at: '2026-08-12T08:00:00.000Z',
};

beforeEach(() => {
  mock.lectures = [];
  mock.add.mockReset().mockResolvedValue(true);
  mock.update.mockReset().mockResolvedValue(true);
  vi.useFakeTimers({toFake: ['Date']});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('weekly timetable calendar dates', () => {
  it.each([
    ['2026-12-31T18:59:00Z', '2026-12-31'],
    ['2026-12-31T19:00:00Z', '2027-01-01'],
    ['2027-07-05T10:05:00Z', '2027-07-05'],
  ])('defaults a fresh form at %s to the Pakistan date %s', (instant, expected) => {
    vi.setSystemTime(new Date(instant));
    render(<ScheduleManager />);
    expect(screen.getByLabelText('Starts on')).toHaveValue(expected);
  });

  it('keeps a deliberate date and academic year through rerenders and in the create payload', async () => {
    vi.setSystemTime(new Date('2026-12-31T18:59:00Z'));
    const view = render(<ScheduleManager />);
    fireEvent.change(screen.getByLabelText('Module'), {target: {value: 'module'}});
    fireEvent.change(screen.getByLabelText('Starts on'), {target: {value: '2027-01-04'}});
    fireEvent.change(screen.getByLabelText('Academic year'), {target: {value: '2026/27'}});
    vi.setSystemTime(new Date('2026-12-31T19:00:00Z'));
    view.rerender(<ScheduleManager />);
    expect(screen.getByLabelText('Starts on')).toHaveValue('2027-01-04');
    expect(screen.getByLabelText('Academic year')).toHaveValue('2026/27');
    fireEvent.click(screen.getByRole('button', {name: 'Save weekly class'}));
    await waitFor(() => expect(mock.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      effective_from: '2027-01-04',
      academic_year: '2026/27',
    })));
    await screen.findByText('Weekly class saved.');
  });

  it('reopens and saves the existing dates and academic year without replacing them with today', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.setSystemTime(new Date('2026-12-31T19:15:00Z'));
    mock.lectures = [stored];
    render(<ScheduleManager />);
    const open = () => fireEvent.click(screen.getByRole('button', {name: /Change or cancel/}));
    open();
    expect(screen.getByLabelText('Starts on')).toHaveValue(stored.effective_from);
    expect(screen.getByLabelText('Ends on (optional)')).toHaveValue(stored.effective_until);
    expect(screen.getByLabelText('Academic year')).toHaveValue(stored.academic_year);
    fireEvent.click(screen.getByRole('button', {name: 'Close editor'}));
    expect(screen.getByLabelText('Starts on')).toHaveValue(stored.effective_from);
    expect(mock.update).not.toHaveBeenCalled();
    open();
    fireEvent.change(screen.getByLabelText(/Reason for change or cancellation/), {target: {value: 'Confirm teaching dates'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save timetable change'}));
    await waitFor(() => expect(mock.update).toHaveBeenCalledExactlyOnceWith(stored.id, stored.updated_at, expect.objectContaining({
      effective_from: stored.effective_from,
      effective_until: stored.effective_until,
      academic_year: stored.academic_year,
    })));
    expect(mock.add).not.toHaveBeenCalled();
    await screen.findByText(/Timetable updated/);
  });
});
