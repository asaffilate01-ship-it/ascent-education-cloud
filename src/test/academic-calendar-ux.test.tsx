import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicEvent } from '@/lib/academicCalendar';

const mocks = vi.hoisted(() => ({
  user: { id: 'director-1', tenantId: 'centre-1', role: 'centre_director', roles: ['centre_director'], name: 'Director', email: 'director@example.test' },
  mobile: false, authLoading: false,
  read: { data: [] as unknown[], loading: false, error: null as string | null },
  query: vi.fn(), refetch: vi.fn(), insert: vi.fn(), remove: vi.fn(), eq: vi.fn(),
  saveResponse: vi.fn(), deleteResponse: vi.fn(), success: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mocks.mobile }));
vi.mock('@/hooks/useSupabaseQuery', () => ({ useSupabaseQuery: (...args: unknown[]) => {
  mocks.query(...args); return { ...mocks.read, refetch: mocks.refetch };
} }));
vi.mock('@/components/layout/DashboardLayout', () => ({ default: ({ title, actions, children }: { title: string; actions: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{actions}{children}</main> }));
vi.mock('sonner', () => ({ toast: { success: mocks.success } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const chain = {
    insert: (payload: unknown) => { mocks.insert(payload); return chain; },
    delete: () => { mocks.remove(); return chain; },
    eq: (...args: unknown[]) => { mocks.eq(...args); return chain; },
    select: () => chain,
    single: () => mocks.saveResponse(),
    maybeSingle: () => mocks.deleteResponse(),
  };
  return chain;
} } }));

import AcademicCalendar from '@/pages/calendar/AcademicCalendar';
import {
  calendarDay, calendarInputToIso, calendarMonthDays, eventDateSummary,
  eventIsUpcomingOrOngoing, eventOccursOnDay, shiftCalendarMonth, validateCalendarDraft,
} from '@/lib/academicCalendar';

const calendarEvent = (overrides: Partial<AcademicEvent> = {}): AcademicEvent => ({
  id: 'event-1', tenant_id: 'centre-1', title: 'Exam preparation', description: 'Bring the practice booklet.',
  start_date: '2026-11-07T04:00:00Z', end_date: '2026-11-07T06:00:00Z', all_day: false,
  event_type: 'exam', color: '#3b82f6', location: 'Room 4', visible_to: ['all'],
  created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', created_by: 'director-1',
  ...overrides,
});
function openForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));
  fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'New centre event' } });
  fireEvent.change(screen.getByLabelText('Start date *'), { target: { value: '2026-11-07' } });
}
function openDelete() {
  fireEvent.click(screen.getByRole('button', { name: /Saturday, 7 November 2026, 1 event\. View day details/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Exam preparation' }));
  return screen.getByRole('alertdialog', { name: 'Delete calendar event?' });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-07T08:00:00Z'));
  mocks.user = { id: 'director-1', tenantId: 'centre-1', role: 'centre_director', roles: ['centre_director'], name: 'Director', email: 'director@example.test' };
  mocks.mobile = false; mocks.authLoading = false;
  mocks.read = { data: [], loading: false, error: null };
  mocks.refetch.mockResolvedValue(undefined);
  mocks.saveResponse.mockResolvedValue({ data: { id: 'new-event' }, error: null });
  mocks.deleteResponse.mockResolvedValue({ data: { id: 'event-1' }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Calendar access and read feedback', () => {
  it.each([
    {role: 'centre_director', manage: true}, {role: 'programme_leader', manage: true},
    {role: 'student', manage: false}, {role: 'superadmin', manage: false},
  ])('matches the existing calendar write policy for an active $role', ({role, manage}) => {
    mocks.user = {...mocks.user, role, roles: [role]};
    mocks.read.data = [calendarEvent()];
    render(<AcademicCalendar />);
    expect(mocks.query).toHaveBeenLastCalledWith('academic_events', expect.objectContaining({enabled: true}));
    expect(Boolean(screen.queryByRole('button', {name: 'Add Event'}))).toBe(manage);
    fireEvent.click(screen.getByRole('button', {name: /Saturday, 7 November 2026, 1 event\. View day details/}));
    expect(Boolean(screen.queryByRole('button', {name: 'Delete Exam preparation'}))).toBe(manage);
  });

  it('uses the verified current centre and disables the read without centre membership', () => {
    const view = render(<AcademicCalendar />);
    expect(mocks.query).toHaveBeenLastCalledWith('academic_events', expect.objectContaining({
      enabled: true, filters: [{ column: 'tenant_id', operator: 'eq', value: 'centre-1' }],
    }));
    mocks.user = { ...mocks.user, roles: ['student'] };
    view.rerender(<AcademicCalendar />);
    expect(mocks.query).toHaveBeenLastCalledWith('academic_events', expect.objectContaining({ enabled: false }));
    expect(screen.getByRole('alert')).toHaveTextContent('active role could not be verified');
    expect(screen.queryByRole('button', { name: 'Add Event' })).not.toBeInTheDocument();
    mocks.user = { ...mocks.user, roles: ['centre_director'], tenantId: '' };
    view.rerender(<AcademicCalendar />);
    expect(mocks.query).toHaveBeenLastCalledWith('academic_events', expect.objectContaining({ enabled: false }));
    expect(screen.getByRole('alert')).toHaveTextContent('current centre is needed');
  });

  it('separates loading and failed reads from empty records and offers retry', () => {
    mocks.read.loading = true;
    const view = render(<AcademicCalendar />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading this centre’s calendar');
    expect(screen.queryByText(/No upcoming events/)).not.toBeInTheDocument();
    mocks.read = { data: [], loading: false, error: 'Network unavailable' };
    view.rerender(<AcademicCalendar />);
    expect(screen.getByRole('alert')).toHaveTextContent('Calendar could not be loaded');
    expect(screen.queryByText(/No upcoming events/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry calendar' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    mocks.read = { data: [], loading: false, error: null };
    view.rerender(<AcademicCalendar />);
    expect(screen.getByText('No upcoming events are recorded.')).toBeInTheDocument();
  });

  it('defaults mobile to a readable agenda and includes an ongoing event', () => {
    mocks.mobile = true;
    mocks.read.data = [calendarEvent({ start_date: '2026-11-06T04:00:00Z', end_date: '2026-11-08T06:00:00Z' })];
    render(<AcademicCalendar />);
    expect(screen.getByRole('button', { name: 'Agenda', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Month', pressed: false })).toBeInTheDocument();
    const upcoming = screen.getByRole('complementary', { name: 'Upcoming & ongoing' });
    expect(within(upcoming).getByRole('button', { name: /View Exam preparation and all events on 7 Nov 2026/ })).toBeInTheDocument();
  });

  it('makes a crowded day a native button and reveals every event with its type and description', () => {
    mocks.read.data = Array.from({ length: 5 }, (_, index) => calendarEvent({ id: `event-${index}`, title: `Event ${index + 1}`, description: `Full description ${index + 1}` }));
    render(<AcademicCalendar />);
    const day = screen.getByRole('button', { name: /Saturday, 7 November 2026, 5 events\. View day details/ });
    expect(day.tagName).toBe('BUTTON');
    expect(day.tabIndex).toBe(0);
    expect(within(day).getByText('+2 more')).toBeInTheDocument();
    fireEvent.click(day);
    const detail = screen.getByRole('dialog', { name: 'Saturday, 7 November 2026' });
    for (let index = 1; index <= 5; index++) {
      expect(within(detail).getByRole('heading', { name: `Event ${index}` })).toBeInTheDocument();
      expect(within(detail).getByText(`Full description ${index}`)).toBeInTheDocument();
    }
    expect(within(detail).getAllByText('Exam')).toHaveLength(5);
  });

  it('returns keyboard focus after day details and deletion confirmation close', async () => {
    mocks.read.data = [calendarEvent()];
    render(<AcademicCalendar />);
    const day = screen.getByRole('button', { name: /Saturday, 7 November 2026, 1 event\. View day details/ });
    day.focus(); fireEvent.click(day);
    const deleteButton = screen.getByRole('button', { name: 'Delete Exam preparation' });
    deleteButton.focus(); fireEvent.click(deleteButton);
    const confirmation = screen.getByRole('alertdialog', { name: 'Delete calendar event?' });
    const keep = within(confirmation).getByRole('button', { name: 'Keep event' });
    expect(keep).toHaveFocus();
    fireEvent.click(keep);
    await waitFor(() => expect(deleteButton).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(day).toHaveFocus());
  });
});

describe('Calendar mutation feedback', () => {
  it('rejects an end date before the start and focuses the invalid field', () => {
    render(<AcademicCalendar />); openForm();
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-11-06' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));
    expect(screen.getByText('End date must be on or after the start date.')).toBeInTheDocument();
    expect(screen.getByLabelText('End date')).toHaveFocus();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('keeps one save in flight and announces success only after a returned row', async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.saveResponse.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<AcademicCalendar />); openForm();
    const form = screen.getByRole('button', { name: 'Save Event' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(screen.getByRole('button', { name: 'Saving event…' })).toBeDisabled();
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'centre-1', created_by: 'director-1', all_day: true,
      start_date: '2026-11-06T19:00:00.000Z', end_date: '2026-11-06T19:00:00.000Z',
    }));
    await act(async () => resolve({ data: { id: 'saved-1' }, error: null }));
    expect(mocks.success).toHaveBeenCalledWith('Event added');
    expect(screen.queryByRole('dialog', { name: 'Add Calendar Event' })).not.toBeInTheDocument();
    expect(screen.getByText('Event added to the calendar.')).toBeInTheDocument();
  });

  it('saves a timed event as Pakistan time rather than browser-local time', async () => {
    render(<AcademicCalendar />); openForm();
    fireEvent.click(screen.getByRole('checkbox', { name: 'All-day event' }));
    fireEvent.change(screen.getByLabelText('Start date and time *'), { target: { value: '2026-11-07T15:30' } });
    fireEvent.change(screen.getByLabelText('End date and time'), { target: { value: '2026-11-07T16:45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Event added'));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      all_day: false, start_date: '2026-11-07T10:30:00.000Z', end_date: '2026-11-07T11:45:00.000Z',
    }));
  });

  it.each([
    ['permission failure', { data: null, error: { message: 'Permission denied' } }],
    ['missing affected row', { data: null, error: null }],
  ])('retains the draft and reports %s without success', async (_label, result) => {
    mocks.saveResponse.mockResolvedValue(result);
    render(<AcademicCalendar />); openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed as saved');
    expect(screen.getByLabelText('Title *')).toHaveValue('New centre event');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save Event' })).toBeEnabled();
  });

  it('confirms deletion explicitly and does not report a zero-row delete as success', async () => {
    mocks.read.data = [calendarEvent()];
    mocks.deleteResponse.mockResolvedValue({ data: null, error: null });
    render(<AcademicCalendar />);
    const confirmation = openDelete();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(within(confirmation).getByText(/Exam preparation/)).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete event' }));
    expect(await within(confirmation).findByRole('alert')).toHaveTextContent('Deletion was not confirmed');
    expect(mocks.eq).toHaveBeenCalledWith('tenant_id', 'centre-1');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'event-1');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(within(confirmation).getByRole('button', { name: 'Keep event' })).toBeEnabled();
  });

  it('holds deletion pending and handles a rejected request without losing the confirmation', async () => {
    mocks.read.data = [calendarEvent()];
    let reject: (value: unknown) => void = () => {};
    mocks.deleteResponse.mockReturnValue(new Promise((_done, fail) => { reject = fail; }));
    render(<AcademicCalendar />);
    const confirmation = openDelete();
    const button = within(confirmation).getByRole('button', { name: 'Delete event' });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(within(confirmation).getByRole('button', { name: 'Deleting event…' })).toBeDisabled();
    expect(within(confirmation).getByRole('button', { name: 'Keep event' })).toBeDisabled();
    await act(async () => reject(new Error('Offline')));
    expect(within(confirmation).getByRole('alert')).toHaveTextContent('could not confirm deletion');
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('announces a deletion only when the target ID is returned', async () => {
    mocks.read.data = [calendarEvent()];
    render(<AcademicCalendar />);
    fireEvent.click(within(openDelete()).getByRole('button', { name: 'Delete event' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Event deleted'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('discards an old centre’s draft and suppresses its delayed mutation feedback', async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.saveResponse.mockReturnValue(new Promise(done => { resolve = done; }));
    const view = render(<AcademicCalendar />); openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save Event' }));
    mocks.user = { ...mocks.user, tenantId: 'centre-2' };
    view.rerender(<AcademicCalendar />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await act(async () => resolve({ data: { id: 'old-centre-event' }, error: null }));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refetch).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenLastCalledWith('academic_events', expect.objectContaining({ filters: [{ column: 'tenant_id', operator: 'eq', value: 'centre-2' }] }));
  });
});

describe('Pakistan calendar dates', () => {
  it('excludes a timed event that ended earlier today while retaining an all-day event and an ongoing event', () => {
    const now = new Date('2026-11-07T08:00:00Z');
    expect(eventIsUpcomingOrOngoing(calendarEvent(), now)).toBe(false);
    expect(eventIsUpcomingOrOngoing(calendarEvent({ all_day: true }), now)).toBe(true);
    expect(eventIsUpcomingOrOngoing(calendarEvent({ start_date: '2026-11-06T04:00:00Z', end_date: '2026-11-07T09:00:00Z' }), now)).toBe(true);
    expect(eventIsUpcomingOrOngoing(calendarEvent({ start_date: '2026-11-06T04:00:00Z', end_date: '2026-11-06T06:00:00Z', all_day: true }), now)).toBe(false);
  });

  it('groups a UTC-evening event on the next Pakistan day and includes every day of a range', () => {
    expect(calendarDay('2026-11-06T20:00:00Z')).toBe('2026-11-07');
    const event = calendarEvent({ start_date: '2026-11-06T20:00:00Z', end_date: '2026-11-08T03:00:00Z' });
    expect(eventOccursOnDay(event, '2026-11-06')).toBe(false);
    expect(eventOccursOnDay(event, '2026-11-07')).toBe(true);
    expect(eventOccursOnDay(event, '2026-11-08')).toBe(true);
    expect(eventDateSummary({ ...event, all_day: true })).toBe('7 Nov 2026 – 8 Nov 2026 · All day');
  });

  it('rejects impossible dates and allows a same-day range', () => {
    expect(calendarInputToIso('2026-02-30', true)).toBeNull();
    expect(calendarInputToIso('2026-11-07T25:15', false)).toBeNull();
    expect(calendarInputToIso('2026-11-07T00:15', false)).toBe('2026-11-06T19:15:00.000Z');
    expect(validateCalendarDraft({ title: 'Exam', description: '', event_type: 'exam', color: '', location: '', all_day: true, start_date: '2026-11-07', end_date: '2026-11-07' })).toEqual({});
  });

  it('crosses year boundaries without depending on local date arithmetic', () => {
    expect(shiftCalendarMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftCalendarMonth('2026-01', -1)).toBe('2025-12');
    const days = calendarMonthDays('2026-11');
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({ day: '2026-10-26', currentMonth: false });
    expect(days.filter(day => day.currentMonth)).toHaveLength(30);
  });
});
