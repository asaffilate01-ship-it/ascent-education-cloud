import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, ChevronLeft, ChevronRight, MapPin, Clock, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useIsMobile } from '@/hooks/use-mobile';
import { activeRoleVerified, canUseActiveRole } from '@/lib/roleMembership';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  calendarDay, calendarDayLabel, calendarMonthDays, calendarMonthLabel, calendarInputToIso,
  eventDateSummary, eventIsUpcomingOrOngoing, eventOccursOnDay, shiftCalendarMonth, validateCalendarDraft,
} from '@/lib/academicCalendar';
import type { AcademicEvent, CalendarDraft, CalendarDraftErrors } from '@/lib/academicCalendar';

const EVENT_TYPES = [
  { value: 'event', label: 'Event', color: 'bg-primary' },
  { value: 'holiday', label: 'Holiday', color: 'bg-destructive' },
  { value: 'exam', label: 'Exam', color: 'bg-warning' },
  { value: 'deadline', label: 'Deadline', color: 'bg-accent' },
  { value: 'residential', label: 'Residential', color: 'bg-success' },
  { value: 'meeting', label: 'Meeting', color: 'bg-secondary' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMPTY_DRAFT: CalendarDraft = {
  title: '', description: '', event_type: 'event', start_date: '', end_date: '',
  all_day: true, location: '', color: '#3b82f6',
};
type CalendarUser = ReturnType<typeof useAuth>['user'];

function EventType({ type }: { type: string }) {
  const eventType = EVENT_TYPES.find(item => item.value === type);
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/20 ${eventType?.color || 'bg-primary'}`} />
    {eventType?.label || 'Event'}
  </span>;
}

export default function AcademicCalendar() {
  const { user, loading } = useAuth();
  // Remount dialogs/drafts on an account, centre or active-role change. Old requests
  // cannot announce success or refresh data in the next workspace.
  const scope = JSON.stringify([user?.id, user?.tenantId, user?.role, user?.roles]);
  return <CalendarWorkspace key={scope} user={user} authLoading={loading} />;
}

function CalendarWorkspace({ user, authLoading }: { user: CalendarUser; authLoading: boolean }) {
  const today = calendarDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [view, setView] = useState<'month' | 'agenda' | null>(null);
  const mobile = useIsMobile();
  const activeView = view ?? (mobile ? 'agenda' : 'month');
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState<CalendarDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<CalendarDraftErrors>({});
  const [saveError, setSaveError] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicEvent | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [pending, setPending] = useState<'save' | 'delete' | null>(null);
  const pendingRef = useRef<'save' | 'delete' | null>(null);
  const detailOpener = useRef<HTMLElement | null>(null);
  const detailContent = useRef<HTMLDivElement | null>(null);
  const deleteOpener = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  const [notice, setNotice] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const authorised = Boolean(user && activeRoleVerified(user));
  const centreId = user?.tenantId;
  const canRead = !authLoading && authorised && Boolean(centreId);
  const canManage = canRead && Boolean(user && canUseActiveRole(user, ['centre_director', 'programme_leader']));
  const { data: events, loading, error, refetch } = useSupabaseQuery('academic_events', {
    enabled: canRead,
    filters: [{ column: 'tenant_id', operator: 'eq', value: centreId || '' }],
    orderBy: { column: 'start_date', ascending: true },
  });
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const filteredEvents = useMemo(() => events.filter(event => filter === 'all' || event.event_type === filter), [events, filter]);
  const upcoming = filteredEvents.filter(event => eventIsUpcomingOrOngoing(event))
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const eventsByDay = useMemo(() => {
    const ranges = filteredEvents.map(event => ({ event, start: calendarDay(event.start_date), end: calendarDay(event.end_date || event.start_date) }));
    return new Map(days.map(day => [day.day, ranges.filter(range => range.start && range.end && day.day >= range.start && day.day <= range.end).map(range => range.event)]));
  }, [days, filteredEvents]);
  const agenda = days.filter(day => day.currentMonth).map(day => ({ ...day, events: eventsByDay.get(day.day) || [] })).filter(day => day.events.length);
  const dayEvents = useMemo(() => selectedDay ? events.filter(event => eventOccursOnDay(event, selectedDay)) : [], [events, selectedDay]);

  const openDay = (day: string, opener: HTMLElement) => { detailOpener.current = opener; setSelectedDay(day); };
  const openDelete = (event: AcademicEvent, opener: HTMLElement) => { deleteOpener.current = opener; setDeleteError(''); setDeleteTarget(event); };
  const closeAdd = (open: boolean) => { if (!pendingRef.current) setShowAdd(open); };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current || !canManage || !user || !centreId || !mounted.current) return;
    const errors = validateCalendarDraft(form);
    setFieldErrors(errors);
    setSaveError('');
    if (Object.keys(errors).length) {
      document.getElementById(`calendar-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    pendingRef.current = 'save';
    setPending('save');
    setNotice('');
    try {
      const { data, error: mutationError } = await supabase.from('academic_events').insert({
        ...form, title: form.title.trim(), description: form.description.trim(), location: form.location.trim(),
        start_date: calendarInputToIso(form.start_date, form.all_day)!,
        end_date: calendarInputToIso(form.end_date || form.start_date, form.all_day)!,
        tenant_id: centreId, created_by: user.id,
      }).select('id').single();
      if (!mounted.current) return;
      if (mutationError || !data?.id) {
        setSaveError('The event could not be confirmed as saved. Your entries are kept. Check the calendar before trying again.');
        void refetch();
        return;
      }
      setShowAdd(false);
      setForm(EMPTY_DRAFT);
      setNotice('Event added to the calendar.');
      toast.success('Event added');
      void refetch();
    } catch {
      if (mounted.current) {
        setSaveError('We could not confirm the save. Check your connection and the calendar before trying again. Your entries are kept.');
        void refetch();
      }
    } finally {
      pendingRef.current = null;
      if (mounted.current) setPending(null);
    }
  }

  async function handleDelete() {
    if (pendingRef.current || !canManage || !centreId || !deleteTarget || !mounted.current) return;
    pendingRef.current = 'delete';
    setPending('delete');
    setDeleteError('');
    setNotice('');
    try {
      const { data, error: mutationError } = await supabase.from('academic_events').delete()
        .eq('id', deleteTarget.id).eq('tenant_id', centreId).select('id').maybeSingle();
      if (!mounted.current) return;
      if (mutationError || data?.id !== deleteTarget.id) {
        setDeleteError('Deletion was not confirmed. The event may have changed or your access may have changed. Refresh the calendar and try again.');
        void refetch();
        return;
      }
      setDeleteTarget(null);
      setNotice('Event deleted from the calendar.');
      toast.success('Event deleted');
      void refetch();
    } catch {
      if (mounted.current) {
        setDeleteError('We could not confirm deletion. Check your connection and refresh the calendar before trying again.');
        void refetch();
      }
    } finally {
      pendingRef.current = null;
      if (mounted.current) setPending(null);
    }
  }

  const eventButton = (event: AcademicEvent, day = calendarDay(event.start_date)) => (
    <button type="button" onClick={click => openDay(day, click.currentTarget)}
      aria-label={`View ${event.title} and all events on ${calendarDayLabel(day)}`}
      className="w-full min-h-11 rounded-lg p-3 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <EventType type={event.event_type} />
      <span className="mt-1 block break-words text-sm font-semibold text-foreground">{event.title}</span>
      <span className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><Clock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{eventDateSummary(event)}</span>
      {event.location && <span className="mt-1 flex items-start gap-1.5 break-words text-xs leading-relaxed text-muted-foreground"><MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{event.location}</span>}
    </button>
  );

  return <DashboardLayout title="Academic Calendar" subtitle="Events, holidays, exams and deadlines"
    actions={canManage && <Dialog open={showAdd} onOpenChange={closeAdd}>
      <DialogTrigger asChild><Button className="min-h-11"><Plus aria-hidden="true" className="mr-2 h-4 w-4" />Add Event</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto [&>button]:h-11 [&>button]:w-11 [&>button]:right-1 [&>button]:top-1">
        <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle><DialogDescription>Dates and times use Pakistan time (UTC+5). Required fields are marked *.</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={pending === 'save'}>
          <div className="space-y-1.5"><Label htmlFor="calendar-title">Title *</Label><Input required id="calendar-title" className="min-h-11" value={form.title} disabled={pending === 'save'} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'calendar-title-error' : undefined} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />{fieldErrors.title && <p id="calendar-title-error" className="text-sm text-destructive">{fieldErrors.title}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="calendar-type">Event type</Label><Select value={form.event_type} disabled={pending === 'save'} onValueChange={value => setForm(f => ({ ...f, event_type: value }))}>
            <SelectTrigger id="calendar-type" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
          </Select></div>
          <Label htmlFor="calendar-all-day" className="flex min-h-11 cursor-pointer items-center gap-3"><Checkbox id="calendar-all-day" checked={form.all_day} disabled={pending === 'save'} onCheckedChange={checked => setForm(f => ({ ...f, all_day: checked === true,
            start_date: f.start_date ? checked ? f.start_date.slice(0, 10) : `${f.start_date.slice(0, 10)}T09:00` : '',
            end_date: f.end_date ? checked ? f.end_date.slice(0, 10) : `${f.end_date.slice(0, 10)}T09:00` : '',
          }))} />All-day event</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5"><Label htmlFor="calendar-start_date">{form.all_day ? 'Start date' : 'Start date and time'} *</Label><Input required id="calendar-start_date" className="min-h-11 min-w-0" type={form.all_day ? 'date' : 'datetime-local'} value={form.start_date} disabled={pending === 'save'} aria-invalid={Boolean(fieldErrors.start_date)} aria-describedby={fieldErrors.start_date ? 'calendar-start-error' : undefined} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />{fieldErrors.start_date && <p id="calendar-start-error" className="text-sm text-destructive">{fieldErrors.start_date}</p>}</div>
            <div className="min-w-0 space-y-1.5"><Label htmlFor="calendar-end_date">{form.all_day ? 'End date' : 'End date and time'}</Label><Input id="calendar-end_date" className="min-h-11 min-w-0" type={form.all_day ? 'date' : 'datetime-local'} value={form.end_date} disabled={pending === 'save'} min={form.start_date || undefined} aria-invalid={Boolean(fieldErrors.end_date)} aria-describedby="calendar-end-help" onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /><p id="calendar-end-help" className={`text-sm ${fieldErrors.end_date ? 'text-destructive' : 'text-muted-foreground'}`}>{fieldErrors.end_date || 'Leave blank for the same start and end.'}</p></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="calendar-location">Location</Label><Input id="calendar-location" className="min-h-11" value={form.location} disabled={pending === 'save'} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="calendar-description">Description</Label><Textarea id="calendar-description" value={form.description} disabled={pending === 'save'} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          {saveError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{saveError}</p>}
          <Button type="submit" className="min-h-11 w-full" disabled={pending === 'save'}>{pending === 'save' && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{pending === 'save' ? 'Saving event…' : 'Save Event'}</Button>
        </form>
      </DialogContent>
    </Dialog>}>
    <p className="mb-4 text-sm text-muted-foreground">Current centre · Pakistan time (UTC+5). Select a day or event to see its details.</p>
    {notice && <p role="status" className="mb-4 rounded-lg border border-success/30 bg-success/5 p-3 text-sm">{notice}</p>}
    {authLoading ? <p role="status" className="surface-card p-6">Checking calendar access…</p>
      : !authorised ? <p role="alert" className="surface-card p-6">Your active role could not be verified. Refresh your account or contact your centre.</p>
        : !centreId ? <p role="alert" className="surface-card p-6">A current centre is needed to view the calendar. Ask your administrator to verify your centre assignment.</p>
          : <>
            <section className="surface-card mb-5 p-3 sm:p-4" aria-label="Calendar controls">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-1"><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Previous month" onClick={() => setMonth(value => shiftCalendarMonth(value, -1))}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></Button><h2 id="calendar-month" tabIndex={-1} aria-live="polite" className="min-w-0 text-base font-semibold sm:text-lg">{calendarMonthLabel(month)}</h2><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Next month" onClick={() => setMonth(value => shiftCalendarMonth(value, 1))}><ChevronRight aria-hidden="true" className="h-4 w-4" /></Button></div>
                <Button variant="outline" className="min-h-11" onClick={() => setMonth(today.slice(0, 7))}>Today</Button>
                <div className="flex flex-wrap items-center gap-3">
                  <div role="group" aria-label="Calendar view" className="flex rounded-lg border p-1"><Button variant={activeView === 'agenda' ? 'secondary' : 'ghost'} className="min-h-11" aria-pressed={activeView === 'agenda'} onClick={() => setView('agenda')}>Agenda</Button><Button variant={activeView === 'month' ? 'secondary' : 'ghost'} className="min-h-11" aria-pressed={activeView === 'month'} onClick={() => setView('month')}>Month</Button></div>
                  <div className="min-w-[150px] flex-1"><Label htmlFor="calendar-filter" className="sr-only">Filter event type</Label><Select value={filter} onValueChange={setFilter}><SelectTrigger id="calendar-filter" className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All event types</SelectItem>{EVENT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
            </section>
            {loading ? <div role="status" className="surface-card flex items-center gap-3 p-6"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /><p>Loading this centre’s calendar…</p></div>
              : error ? <div role="alert" className="surface-card space-y-3 p-6"><h3 className="font-semibold">Calendar could not be loaded</h3><p className="text-sm text-muted-foreground">We could not check this centre’s events. Try again to load the calendar.</p><Button variant="outline" className="min-h-11" onClick={() => void refetch()}>Retry calendar</Button></div>
                : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                  <section className="min-w-0" aria-labelledby="calendar-month">
                    {activeView === 'month' ? <div className="surface-card overflow-x-auto p-2 sm:p-3"><div className="min-w-[42rem]">
                      <div className="grid grid-cols-7">{DAYS.map(day => <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}</div>
                      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">{days.map(day => {
                        const matching = eventsByDay.get(day.day) || [];
                        return <button key={day.day} type="button" onClick={click => openDay(day.day, click.currentTarget)} aria-current={day.day === today ? 'date' : undefined} aria-label={`${calendarDayLabel(day.day, true)}, ${matching.length} ${matching.length === 1 ? 'event' : 'events'}. View day details.`}
                          className={`flex min-h-[128px] min-w-0 flex-col gap-1.5 p-2 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-secondary/50 ${day.currentMonth ? 'bg-background' : 'bg-secondary/30 text-muted-foreground'} ${day.day === today ? 'ring-2 ring-inset ring-primary' : ''}`}>
                          <span className={`text-sm font-semibold ${day.day === today ? 'text-primary' : ''}`}>{Number(day.day.slice(-2))}{day.day === today && <span className="ml-1 text-[10px]">Today</span>}</span>
                          {matching.slice(0, 3).map(event => <span key={event.id} className="block w-full min-w-0 rounded border border-border bg-background px-1.5 py-1 text-xs"><EventType type={event.event_type} /><span className="block truncate font-medium text-foreground">{event.title}</span></span>)}
                          {matching.length > 3 && <span className="text-xs font-semibold text-primary">+{matching.length - 3} more</span>}
                        </button>;
                      })}</div>
                    </div></div> : <div className="space-y-4" aria-label="Monthly agenda">
                      {agenda.length ? agenda.map(day => <section key={day.day} className="surface-card overflow-hidden"><h3 className="border-b bg-secondary/30 px-4"><button type="button" className="min-h-11 py-2 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={click => openDay(day.day, click.currentTarget)} aria-label={`View all events on ${calendarDayLabel(day.day, true)}`}>{calendarDayLabel(day.day, true)}{day.day === today && <span className="ml-2 text-xs text-primary">Today</span>}</button></h3><ul className="divide-y">{day.events.map(event => <li key={event.id}>{eventButton(event, day.day)}</li>)}</ul></section>)
                        : <div className="surface-card space-y-2 p-6"><Calendar aria-hidden="true" className="mb-3 h-6 w-6 text-muted-foreground" /><h3 className="font-semibold">No {filter === 'all' ? '' : `${EVENT_TYPES.find(type => type.value === filter)?.label.toLowerCase()} `}events this month</h3><p className="text-sm text-muted-foreground">{filter === 'all' ? 'No events are recorded for this month. Choose another month to explore the calendar.' : 'Choose all event types or another month to see more of the calendar.'}</p>{filter !== 'all' && <Button variant="outline" className="min-h-11" onClick={() => setFilter('all')}>Show all event types</Button>}</div>}
                    </div>}
                    {activeView === 'month' && !agenda.length && <p role="status" className="mt-3 text-sm text-muted-foreground">No {filter === 'all' ? '' : 'matching '}events are recorded for this month.</p>}
                  </section>
                  <aside className="surface-card self-start p-4" aria-labelledby="calendar-upcoming"><h3 id="calendar-upcoming" className="font-semibold">Upcoming & ongoing</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">From today across all months{filter !== 'all' ? ', using the selected event type' : ''}.</p>
                    {upcoming.length ? <><ul className="mt-3 divide-y">{upcoming.slice(0, 8).map(event => <li key={event.id}>{eventButton(event, calendarDay(event.start_date) < today ? today : calendarDay(event.start_date))}</li>)}</ul>{upcoming.length > 8 && <p className="mt-3 text-xs text-muted-foreground">Showing the next 8 of {upcoming.length} events. Use the calendar to explore more.</p>}</>
                      : <p className="py-5 text-sm text-muted-foreground">No {filter === 'all' ? '' : 'matching '}upcoming events are recorded.</p>}
                  </aside>
                </div>}
          </>}
    <Dialog open={Boolean(selectedDay) && canRead} onOpenChange={open => { if (!open && !pendingRef.current) setSelectedDay(null); }}>
      <DialogContent ref={detailContent} onCloseAutoFocus={event => { event.preventDefault(); if (mounted.current) (detailOpener.current?.isConnected ? detailOpener.current : document.getElementById('calendar-month'))?.focus(); }} className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto [&>button]:h-11 [&>button]:w-11 [&>button]:right-1 [&>button]:top-1"><DialogHeader><DialogTitle className="pr-7 leading-relaxed">{selectedDay ? calendarDayLabel(selectedDay, true) : 'Day details'}</DialogTitle><DialogDescription>All event types for this day. Times use Pakistan time (UTC+5).</DialogDescription></DialogHeader>
        {loading ? <p role="status">Loading day details…</p> : error ? <div role="alert" className="space-y-3"><p>Day details could not be loaded.</p><Button variant="outline" className="min-h-11" onClick={() => void refetch()}>Retry day details</Button></div> : dayEvents.length ? <ul className="space-y-4">{dayEvents.map(event => <li key={event.id} className="rounded-lg border p-4"><EventType type={event.event_type} /><h3 className="mt-2 break-words font-semibold">{event.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{eventDateSummary(event)}</p>{event.location && <p className="mt-2 flex items-start gap-2 break-words text-sm"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{event.location}</p>}{event.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{event.description}</p>}{canManage && <Button variant="outline" className="mt-4 min-h-11 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${event.title}`} disabled={Boolean(pending)} onClick={click => openDelete(event, click.currentTarget)}><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Delete event</Button>}</li>)}</ul> : <p className="py-4 text-sm text-muted-foreground">No events are recorded for this day.</p>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(deleteTarget) && canManage} onOpenChange={open => { if (!open && !pendingRef.current) setDeleteTarget(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (mounted.current) (deleteOpener.current?.isConnected ? deleteOpener.current : detailContent.current)?.focus(); }} className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>Delete calendar event?</AlertDialogTitle><AlertDialogDescription>This removes “{deleteTarget?.title}” from your centre’s calendar. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
        <AlertDialogFooter><AlertDialogCancel className="min-h-11" disabled={pending === 'delete'}>Keep event</AlertDialogCancel><Button variant="destructive" className="min-h-11" disabled={pending === 'delete'} onClick={() => void handleDelete()}>{pending === 'delete' ? 'Deleting event…' : 'Delete event'}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DashboardLayout>;
}
