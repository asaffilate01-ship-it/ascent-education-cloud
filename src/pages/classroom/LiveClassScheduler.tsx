import {useState, useEffect, useRef} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {pakistanClassTime} from '@/lib/classroomExperience';
import {calendarInputToIso} from '@/lib/academicCalendar';
import {canUseActiveRole} from '@/lib/roleMembership';
import {confirmedClassSave, pakistanClassInput, readClassCandidates, validateClassTimes, type ClassTimeErrors} from '@/lib/liveClassScheduling';

type TeachingModule = {id: string; title: string; tenant_id: string; lecturer_id: string | null};
type Class = {id: string; tenant_id: string; module_id: string; organiser_user_id: string; title: string; starts_at: string; ends_at: string; status: string; teams_sync_status: string; join_url: string | null};
type Job = {session_id: string; status: string; revision: number; error_code: string | null};
type Invitation = {session_id: string; user_id: string};
type Operation = 'save' | 'cancel' | 'review' | 'check-cancellation';
type OperationTicket = {type: Operation; module: string};

export default function LiveClassScheduler() {
  const {user} = useAuth();
  return <Scheduler key={JSON.stringify([user?.id, user?.tenantId, user?.role, user?.roles])}/>;
}

function Scheduler() {
  const {user, loading: authLoading} = useAuth(), cache = useQueryClient();
  const [params, setParams] = useSearchParams(), module = params.get('module') || '';
  const active = !authLoading && !!user?.id && !!user?.tenantId
    && canUseActiveRole(user, ['lecturer', 'programme_leader', 'centre_director', 'superadmin']);
  const pendingEdit = useRef<Class | null>(null), mounted = useRef(true), operation = useRef<OperationTicket | null>(null);
  const currentModule = useRef(module); currentModule.current = module;
  const cancelOpener = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState<Operation | null>(null), busy = pending !== null;
  const [editing, setEditing] = useState<Class | null>(null), [editRevision, setEditRevision] = useState(0);
  const [id, setId] = useState<string>(() => crypto.randomUUID()), [title, setTitle] = useState('');
  const [organiser, setOrganiser] = useState(''), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [students, setStudents] = useState<string[]>([]), [notice, setNotice] = useState(''), [saveError, setSaveError] = useState('');
  const [timeErrors, setTimeErrors] = useState<ClassTimeErrors>({});
  const [cancelTarget, setCancelTarget] = useState<Class | null>(null), [cancelError, setCancelError] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const key = ['calendar-scheduler', user?.id, user?.tenantId, user?.role, user?.roles?.join(',')];
  const state = useQuery({queryKey: key, enabled: active, refetchInterval: 30000, queryFn: async () => {
    async function pages<T>(makeQuery: () => {range: (from: number, to: number) => PromiseLike<{data: T[] | null; error: unknown}>}): Promise<T[]> {
      const rows: T[] = [];
      for (let offset = 0; ; offset += 200) {
        const response = await makeQuery().range(offset, offset + 199);
        if (response.error || !Array.isArray(response.data)) throw Error('Scheduling could not be loaded. Check your module assignment and try again.');
        rows.push(...response.data);
        if (response.data.length < 200) return rows;
      }
    }
    const modules = await pages<TeachingModule>(() => {
      let query = db.from('modules').select('id,title,tenant_id,lecturer_id').eq('tenant_id', user!.tenantId);
      if (user!.role === 'lecturer') query = query.eq('lecturer_id', user!.id);
      return query.order('id');
    });
    const allowedModules = modules.filter(item => item.tenant_id === user!.tenantId
      && (user!.role !== 'lecturer' || item.lecturer_id === user!.id));
    const moduleIds = new Set(allowedModules.map(item => item.id));
    const sessions: Class[] = [];
    // Scope before paging so another module's recent classes cannot hide an assigned class.
    for (let offset = 0; offset < allowedModules.length; offset += 100) {
      const ids = allowedModules.slice(offset, offset + 100).map(item => item.id);
      sessions.push(...await pages<Class>(() => db.from('live_class_sessions')
        .select('id,tenant_id,module_id,organiser_user_id,title,starts_at,ends_at,status,teams_sync_status,join_url')
        .eq('tenant_id', user!.tenantId).in('module_id', ids).order('starts_at', {ascending: false}).order('id')));
    }
    const classes = sessions.filter(item => item.tenant_id === user!.tenantId && moduleIds.has(item.module_id))
      .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at) || a.id.localeCompare(b.id));
    const classIds = new Set(classes.map(item => item.id)), jobs: Job[] = [], invites: Invitation[] = [];
    for (let offset = 0; offset < classes.length; offset += 100) {
      const ids = classes.slice(offset, offset + 100).map(item => item.id);
      const [jobRows, inviteRows] = await Promise.all([
        pages<Job>(() => db.from('uni_calendar_jobs').select('session_id,status,revision,error_code').eq('tenant_id', user!.tenantId).in('session_id', ids).order('session_id')),
        pages<Invitation>(() => db.from('live_class_invitations').select('session_id,user_id,status').eq('tenant_id', user!.tenantId).in('session_id', ids).in('status', ['invited', 'accepted']).order('session_id').order('user_id')),
      ]);
      jobs.push(...jobRows); invites.push(...inviteRows);
    }
    return {modules: allowedModules, classes, jobs: jobs.filter(item => classIds.has(item.session_id)), invites: invites.filter(item => classIds.has(item.session_id))};
  }});
  const selectedModule = state.data?.modules.find(item => item.id === module);
  const candidates = useQuery({queryKey: [...key, 'candidates', module], enabled: active && state.isSuccess && !!selectedModule, queryFn: async () => {
    const response = await db.rpc('uni_calendar_candidates', {p_module: module});
    const data = readClassCandidates(response.data);
    if (response.error || !data) throw Error('Learners and organisers could not be checked. Try again before scheduling this class.');
    return data;
  }});
  const candidateReady = candidates.isSuccess && !candidates.isFetching;
  const organiserAvailable = candidateReady && candidates.data.organisers.some(item => item.id === organiser);
  const visibleClasses = state.data?.classes.filter(item => !module || item.module_id === module) || [];

  function reset() {
    setEditing(null); setEditRevision(0); setId(crypto.randomUUID()); setTitle(''); setOrganiser('');
    setStart(''); setEnd(''); setStudents([]); setTimeErrors({}); setSaveError('');
  }
  function loadEdit(item: Class) {
    if (!state.data || operation.current) return;
    setEditing(item); setEditRevision(state.data.jobs.find(job => job.session_id === item.id)?.revision || 0);
    setId(item.id); setTitle(item.title); setOrganiser(item.organiser_user_id);
    setStart(pakistanClassInput(item.starts_at)); setEnd(pakistanClassInput(item.ends_at));
    setStudents(state.data.invites.filter(invite => invite.session_id === item.id).map(invite => invite.user_id));
    setTimeErrors({}); setSaveError(''); setNotice('');
  }
  useEffect(() => {
    operation.current = null; setPending(null); setCancelTarget(null); setCancelError(''); setNotice('');
    if (pendingEdit.current?.module_id === module) {
      const item = pendingEdit.current; pendingEdit.current = null; loadEdit(item);
    } else reset();
    // Module navigation resets the editor; background refreshes must preserve the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);
  function edit(item: Class) {
    if (operation.current) return;
    if (item.module_id !== module) {
      pendingEdit.current = item;
      const next = new URLSearchParams(params); next.set('module', item.module_id); setParams(next);
    } else loadEdit(item);
  }
  function begin(next: Operation) {
    if (!active || !mounted.current || operation.current) return null;
    const ticket = {type: next, module}; operation.current = ticket; setPending(next); return ticket;
  }
  function isCurrent(ticket: OperationTicket) { return mounted.current && operation.current === ticket && currentModule.current === ticket.module; }
  function finish(ticket: OperationTicket) {
    if (operation.current !== ticket) return;
    operation.current = null; if (mounted.current) setPending(null);
  }

  async function save() {
    if (operation.current || !active || !selectedModule || !candidateReady || state.isFetching) return;
    setNotice(''); setSaveError('');
    const errors = validateClassTimes(start, end); setTimeErrors(errors);
    if (!title.trim()) { setSaveError('Enter a class title.'); document.getElementById('class-title')?.focus(); return; }
    if (!organiserAvailable) { setSaveError('Choose a connected organiser before saving.'); return; }
    if (Object.keys(errors).length) { document.getElementById(errors.start ? 'class-start' : 'class-end')?.focus(); return; }
    if (students.length > 300 || students.some(student => !candidates.data.students.some(item => item.id === student))) {
      setSaveError('Check the learner selection. Choose up to 300 learners currently enrolled in this programme.'); return;
    }
    const ticket = begin('save'); if (!ticket) return;
    try {
      const response = await db.rpc('save_uni_calendar_class', {
        p_id: id, p_module: module, p_organiser: organiser, p_title: title.trim(),
        p_start: calendarInputToIso(start, false), p_end: calendarInputToIso(end, false),
        p_students: students, p_revision: editing ? editRevision : 0, p_cancel: false,
      });
      if (!isCurrent(ticket)) return;
      if (response.error) throw Error('Class could not be saved. Your draft has been kept. Refresh classes and check for a timetable clash or changed class details before retrying.');
      if (!confirmedClassSave(response.data, id)) throw Error('Save could not be confirmed. Your draft has been kept. Refresh classes and check whether this class was saved before retrying.');
      reset(); setNotice('Class saved. Microsoft invitation delivery is queued, not yet confirmed.');
      await cache.invalidateQueries({queryKey: key});
    } catch (error) {
      if (isCurrent(ticket)) setSaveError(error instanceof Error ? error.message : 'Class could not be saved. Your draft has been kept.');
    } finally { finish(ticket); }
  }
  function openCancellation(item: Class, opener: HTMLElement) {
    if (operation.current) return;
    cancelOpener.current = opener; setCancelTarget(item); setCancelError(''); setNotice('');
  }
  async function checkCancellation(item: Class, ticket: OperationTicket) {
    const result = await state.refetch();
    if (!isCurrent(ticket)) return;
    if (result.isError || !result.data?.classes.some(current => current.id === item.id && current.status === 'cancelled')) {
      throw Error('Cancellation could not be confirmed. Refresh the class status before trying again.');
    }
    if (editing?.id === item.id) reset();
    setCancelTarget(null); setCancelError('');
    setNotice(`“${item.title}” is cancelled in UniPathway. Microsoft cancellation delivery is confirmed separately.`);
  }
  async function cancelClass() {
    if (!cancelTarget) return;
    const ticket = begin('cancel'); if (!ticket) return;
    try {
      const response = await db.rpc('cancel_uni_calendar_class', {p_session: cancelTarget.id});
      if (!isCurrent(ticket)) return;
      if (response.error) throw Error('Cancellation could not be saved. Your class details have been kept. Refresh the class status before retrying.');
      await checkCancellation(cancelTarget, ticket);
    } catch (error) {
      if (isCurrent(ticket)) setCancelError(error instanceof Error ? error.message : 'Cancellation could not be confirmed. Refresh the class status before retrying.');
    } finally { finish(ticket); }
  }
  async function refreshCancellation() {
    if (!cancelTarget) return;
    const ticket = begin('check-cancellation'); if (!ticket) return;
    try { await checkCancellation(cancelTarget, ticket); }
    catch { if (isCurrent(ticket)) setCancelError('The class is not confirmed as cancelled. Check its current status before retrying cancellation.'); }
    finally { finish(ticket); }
  }
  async function review(session: string) {
    const ticket = begin('review'); if (!ticket) return;
    setNotice(''); setSaveError('');
    try {
      const response = await db.rpc('review_uni_calendar_delivery', {p_session: session});
      if (!isCurrent(ticket)) return;
      if (response.error) throw response.error;
      setNotice('Provider verification queued. An uncertain creation will not be sent again automatically.');
      await state.refetch();
    } catch { if (isCurrent(ticket)) setSaveError('Verification could not be queued. Refresh and retry.'); }
    finally { finish(ticket); }
  }

  return <DashboardLayout title="Schedule a live class" subtitle="Choose the class and learners; track Microsoft invitation delivery here">
    <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link className="underline" to={`/lecturer/classroom${module ? `?module=${encodeURIComponent(module)}` : ''}`}>View classroom</Link>
      <Button variant="outline" disabled={!active || busy || state.isFetching} onClick={() => void state.refetch()}>Refresh classes</Button>
    </div>
    {!active ? <p role="alert" className="mt-5">A verified teaching role and centre are required to schedule a class.</p>
      : state.isLoading ? <p role="status" className="mt-5">Loading your teaching modules…</p>
      : state.isError ? <div role="alert" className="mt-5 space-y-3"><p>{state.error.message}</p><Button variant="outline" onClick={() => void state.refetch()}>Retry scheduling</Button></div>
      : <div className="mt-5 space-y-6">
        <section className="min-w-0 space-y-4 rounded-xl border bg-card p-5 max-sm:px-[16px]">
          <h2 className="text-xl font-bold">{editing ? 'Update class' : 'New class'}</h2>
          <label className="block min-w-0">Module
            <select className="mt-1 min-h-11 w-full min-w-0 max-w-full rounded border bg-background p-2" value={module} disabled={busy} onChange={event => {
              const next = new URLSearchParams(params); next.set('module', event.target.value); setParams(next);
            }}>
              <option value="">Choose a module</option>
              {state.data?.modules.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          {!state.data?.modules.length && <p>No teaching modules are available in your current role. Ask your centre team to check your module assignment.</p>}
          {module && !selectedModule && <p role="alert">This module is not available in your current teaching role. Choose an assigned module.</p>}
          {selectedModule && <>
            <p className="text-sm text-muted-foreground">Use a connected @unipathway.pk organiser. Saving a class queues its invitations; Microsoft delivery is confirmed separately below.</p>
            {candidates.isFetching && <p role="status">Checking enrolled learners and connected organisers…</p>}
            {candidates.isError && <div role="alert" className="space-y-3"><p>{candidates.error.message}</p><Button variant="outline" disabled={busy || candidates.isFetching} onClick={() => void candidates.refetch()}>Retry learners and organisers</Button></div>}
            {candidateReady && !candidates.data.organisers.length && <p role="alert">No enabled Microsoft organiser is connected. Ask your centre administrator to complete Teams setup before scheduling.</p>}
            <fieldset disabled={busy} className="min-w-0 max-w-full space-y-4">
              <legend className="sr-only">Class details</legend>
              <label className="block" htmlFor="class-title">Class title</label>
              <Input id="class-title" className="min-w-0 max-w-full max-sm:px-[12px]" value={title} maxLength={120} onChange={event => setTitle(event.target.value)}/>
              <label className="block min-w-0">Meeting organiser
                <select id="class-organiser" disabled={!!editing || !candidateReady} value={organiser} onChange={event => setOrganiser(event.target.value)} className="mt-1 min-h-11 w-full min-w-0 max-w-full rounded border bg-background p-2">
                  <option value="">Choose connected organiser</option>
                  {candidates.data?.organisers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
                <div className="min-w-0"><label htmlFor="class-start">Starts (Pakistan time)</label><Input id="class-start" className="min-w-0 max-w-full max-sm:px-[8px]" type="datetime-local" value={start} aria-invalid={!!timeErrors.start} aria-describedby={timeErrors.start ? 'class-start-error class-time-zone' : 'class-time-zone'} onChange={event => setStart(event.target.value)}/>{timeErrors.start && <p id="class-start-error" role="alert" className="mt-1 text-sm text-destructive">{timeErrors.start}</p>}</div>
                <div className="min-w-0"><label htmlFor="class-end">Ends (Pakistan time)</label><Input id="class-end" className="min-w-0 max-w-full max-sm:px-[8px]" type="datetime-local" value={end} aria-invalid={!!timeErrors.end} aria-describedby={timeErrors.end ? 'class-end-error class-time-zone' : 'class-time-zone'} onChange={event => setEnd(event.target.value)}/>{timeErrors.end && <p id="class-end-error" role="alert" className="mt-1 text-sm text-destructive">{timeErrors.end}</p>}</div>
              </div>
              <p id="class-time-zone" className="text-sm text-muted-foreground">All class times use Pakistan time (Asia/Karachi, UTC+5), regardless of your device timezone. Classes can last up to 12 hours.</p>
              <fieldset disabled={!candidateReady} className="min-w-0 max-w-full rounded-lg border p-3 max-sm:px-[12px]">
                <legend className="max-w-full">Invited learners ({students.length})</legend>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" className="max-sm:px-[12px]" disabled={!candidateReady || !candidates.data.students.length || candidates.data.students.length > 300} onClick={() => { if (candidateReady) setStudents(candidates.data.students.map(item => item.id)); }}>Select all enrolled learners</Button>
                  <Button type="button" variant="ghost" className="max-sm:px-[12px]" disabled={!candidateReady || !students.length} onClick={() => setStudents([])}>Clear learner selection</Button>
                </div>
                {candidateReady && <>
                  <div className="max-h-64 min-w-0 overflow-auto">{candidates.data.students.map(item => <label key={item.id} className="flex min-h-11 min-w-0 items-center gap-3 py-1">
                    <input type="checkbox" checked={students.includes(item.id)} onChange={event => setStudents(current => event.target.checked ? [...current, item.id] : current.filter(student => student !== item.id))}/><span className="min-w-0 break-words">{item.name}</span>
                  </label>)}</div>
                  {!candidates.data.students.length && <p>No active learners are enrolled in this programme.</p>}
                  {candidates.data.students.length > 300 && <p className="mt-2 text-sm text-muted-foreground">Choose up to 300 learners for this class.</p>}
                </>}
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <Button disabled={state.isFetching || !candidateReady || !organiserAvailable || !title.trim() || !start || !end} onClick={() => void save()}>{pending === 'save' ? 'Saving class…' : editing ? 'Queue calendar update' : 'Schedule and invite'}</Button>
                {editing && <><Button variant="outline" onClick={reset}>New class</Button><Button variant="outline" aria-label={`Cancel ${editing.title}`} onClick={event => openCancellation(editing, event.currentTarget)}>Cancel class</Button></>}
              </div>
            </fieldset>
          </>}
          {saveError && <p role="alert">{saveError}</p>}
        </section>
        {notice && <p role="status">{notice}</p>}
        <section className="space-y-3" aria-labelledby="class-delivery-heading">
          <h2 id="class-delivery-heading" tabIndex={-1} className="text-xl font-bold">Classes and delivery status</h2>
          {state.isFetching && <p role="status">Refreshing class status…</p>}
          {visibleClasses.map(item => {
            const job = state.data!.jobs.find(current => current.session_id === item.id);
            return <article key={item.id} className="min-w-0 rounded-xl border bg-card p-4 max-sm:px-[16px]">
              <h3 className="break-words font-semibold">{item.title}</h3>
              <p className="my-2 text-sm">{pakistanClassTime(item.starts_at)} PKT · {item.status} · {job?.status?.replace(/_/g, ' ') || 'Existing manual meeting'}</p>
              {job?.error_code && <p className="text-sm" role="alert">Delivery needs attention: {job.error_code.replace(/_/g, ' ')}. No delivery success has been assumed.</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                {job && <Button variant="outline" aria-label={`Edit class / invitees: ${item.title}`} disabled={busy || ['processing', 'needs_review'].includes(job.status) || item.status === 'cancelled'} onClick={() => edit(item)}>Edit class / invitees</Button>}
                {job && item.status !== 'cancelled' && <Button variant="outline" disabled={busy} aria-label={`Cancel ${item.title}`} onClick={event => openCancellation(item, event.currentTarget)}>Cancel class</Button>}
                {job?.status === 'needs_review' && <Button variant="outline" aria-label={`Verify provider status: ${item.title}`} disabled={busy} onClick={() => void review(item.id)}>Verify provider status</Button>}
              </div>
            </article>;
          })}
          {!visibleClasses.length && <p>{module ? 'No live classes have been scheduled for this module.' : 'No live classes have been scheduled.'}</p>}
        </section>
      </div>}
    <AlertDialog open={!!cancelTarget && active} onOpenChange={open => { if (!open && !operation.current) { setCancelTarget(null); setCancelError(''); } }}>
      <AlertDialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] min-w-0 overflow-y-auto text-sm [overflow-wrap:anywhere] max-sm:w-[calc(100%_-_32px)] max-sm:px-[16px]" onCloseAutoFocus={event => {
        event.preventDefault();
        if (cancelOpener.current?.isConnected) cancelOpener.current.focus();
        else document.getElementById('class-delivery-heading')?.focus();
      }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel live class?</AlertDialogTitle>
          <AlertDialogDescription>Cancel “{cancelTarget?.title}” in UniPathway and queue Microsoft cancellation notices. Microsoft delivery is confirmed separately in the class status.</AlertDialogDescription>
        </AlertDialogHeader>
        {cancelError && <div className="space-y-3"><p role="alert">{cancelError}</p><Button variant="outline" disabled={busy} onClick={() => void refreshCancellation()}>{pending === 'check-cancellation' ? 'Checking class status…' : 'Refresh cancellation status'}</Button></div>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep class</AlertDialogCancel>
          <Button disabled={busy} onClick={() => void cancelClass()}>{pending === 'cancel' ? 'Cancelling class…' : 'Confirm cancellation'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  </DashboardLayout>;
}
