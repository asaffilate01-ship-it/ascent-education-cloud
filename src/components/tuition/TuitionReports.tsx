import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import type {UserRole} from '@/types/platform';
import {canUseTuitionReportsRole, tuitionReportsEnabled} from '@/lib/tuitionReports';
import {Button} from '@/components/ui/button';

type View = 'tutor' | 'director' | 'learner' | 'guardian';
type Audience = 'shared' | 'staff';
const roles: Record<View, UserRole> = {
  tutor: 'lecturer', director: 'centre_director', learner: 'student', guardian: 'parent_guardian',
};
const concernLabels = {
  practice_gap: 'Practice gap', attendance: 'Attendance', engagement: 'Engagement', follow_up: 'Follow-up needed',
} as const;
type Concern = keyof typeof concernLabels;
const fields = [
  ['summary', 'Session summary'], ['strength', 'Observed strength'],
  ['focus', 'Focus for improvement'], ['next_action', 'Next action'],
] as const;
type TextField = typeof fields[number][0];
type ReportContent = Record<TextField, string> & {concern: Concern | null; audience: Audience};
type Report = Omit<ReportContent, 'strength' | 'focus' | 'next_action'> & {id: string; created_at: string; strength: string | null; focus: string | null; next_action: string | null};
type Draft = Record<TextField, string> & {concern: string; audience: string};
type Request = {id: string; content: ReportContent};
type Withdrawal = {id: string; created_at: string; state: 'confirm' | 'uncertain'};
type Result = {kind: 'loading' | 'error' | 'unavailable'} | {kind: 'ready'; reports: Report[]};
const maxLength = 1000;
const refreshInterval = 60_000;
const empty: Draft = {summary: '', strength: '', focus: '', next_action: '', concern: '', audience: ''};
const fieldClass = 'mt-1 block min-h-11 w-full rounded-md border bg-background p-2 text-base';
const audienceLabels: Record<Audience, string> = {shared: 'Shared with learner and eligible guardians', staff: 'Staff only'};
const time = new Intl.DateTimeFormat('en-PK', {timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short'});

function isConcern(value: unknown): value is Concern {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(concernLabels, value);
}

function isAudience(value: unknown): value is Audience {
  return value === 'shared' || value === 'staff';
}

function isNote(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= maxLength;
}

function parseReports(value: unknown, staffView: boolean): Report[] {
  if (!Array.isArray(value) || value.length > 20) throw Error('Invalid report list');
  const reports: Report[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') throw Error('Invalid report');
    const report = item as Record<string, unknown>;
    if (!isAudience(report.audience)) throw Error('Invalid report audience');
    // The server is authoritative; do not render an out-of-scope row even if a response includes one.
    if (report.audience === 'staff' && !staffView) continue;
    if (typeof report.id !== 'string' || !report.id || seen.has(report.id) ||
      typeof report.created_at !== 'string' || !Number.isFinite(Date.parse(report.created_at)) ||
      (report.concern !== null && !isConcern(report.concern)) ||
      !isNote(report.summary) || fields.some(([key]) => key !== 'summary' && report[key] !== null && !isNote(report[key]))) {
      throw Error('Invalid report');
    }
    seen.add(report.id);
    reports.push({
      id: report.id, created_at: report.created_at, audience: report.audience, concern: report.concern as Concern | null,
      summary: report.summary, strength: report.strength as string | null, focus: report.focus as string | null, next_action: report.next_action as string | null,
    });
  }
  return reports;
}

async function readReports(plan: string, staffView: boolean) {
  const result = await db.rpc('get_unipathway_tuition_reports', {p_plan: plan});
  if (result.error) throw result.error;
  return parseReports(result.data, staffView);
}

function matches(report: Report, request: Request) {
  return report.id === request.id && report.audience === request.content.audience &&
    report.concern === request.content.concern && fields.every(([key]) => report[key] === request.content[key]);
}

export default function TuitionReports({plan, view}: {plan: string; view: View}) {
  const {user, loading} = useAuth();
  if (!tuitionReportsEnabled() || loading || !user?.id || !user.tenantId || !canUseTuitionReportsRole(user, roles[view]) || !plan) return null;
  return <ReportWorkspace key={JSON.stringify([user.id, user.tenantId, user.role, user.roles, view, plan])} plan={plan} view={view}/>;
}

function ReportWorkspace({plan, view}: {plan: string; view: View}) {
  const heading = useId(), help = useId();
  const writable = view === 'tutor';
  const staffView = writable || view === 'director';
  const [result, setResult] = useState<Result>({kind: 'loading'});
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [withdrawal, setWithdrawal] = useState<Withdrawal | null>(null);
  const active = useRef(false);
  const readVersion = useRef(0);
  const reading = useRef(false);
  const writeBusy = useRef(false);
  const pending = useRef<Request | null>(null);
  const dismissWithdrawal = useRef<HTMLButtonElement>(null);
  const withdrawalOpener = useRef<HTMLButtonElement | null>(null);

  const invalidateRead = useCallback(() => {readVersion.current++;}, []);
  useLayoutEffect(() => {
    active.current = true;
    return () => {active.current = false; reading.current = false; invalidateRead();};
  }, [invalidateRead]);

  useLayoutEffect(() => {if (withdrawal?.state === 'confirm') dismissWithdrawal.current?.focus();}, [withdrawal]);

  const confirmed = useCallback(() => {
    pending.current = null;
    setUncertain(false);
    setDraft(empty);
    setError('');
    setMessage('Session report saved.');
  }, []);

  const load = useCallback(async (checkAfterWrite = false) => {
    if (!active.current || (!checkAfterWrite && (writeBusy.current || reading.current))) return;
    reading.current = true;
    const version = ++readVersion.current;
    const current = () => active.current && version === readVersion.current;
    setResult({kind: 'loading'});
    try {
      const reports = await readReports(plan, staffView);
      if (!current()) return;
      setResult({kind: 'ready', reports});
      setOpened(previous => new Set([...previous].filter(id => reports.some(report => report.id === id))));
      setWithdrawal(previous => previous?.state === 'confirm' && !reports.some(report => report.id === previous.id) ? null : previous);
      if (pending.current && reports.some(report => pending.current && matches(report, pending.current))) confirmed();
    } catch (failure) {
      const denied = failure && typeof failure === 'object' && 'code' in failure && failure.code === '42501';
      if (current()) setResult({kind: denied ? 'unavailable' : 'error'});
    } finally {
      if (current()) reading.current = false;
    }
  }, [plan, staffView, confirmed]);

  useEffect(() => {
    void load();
    const checkVisible = () => {if (document.visibilityState === 'visible') void load();};
    window.addEventListener('focus', checkVisible);
    document.addEventListener('visibilitychange', checkVisible);
    const timer = window.setInterval(checkVisible, refreshInterval);
    return () => {
      window.removeEventListener('focus', checkVisible);
      document.removeEventListener('visibilitychange', checkVisible);
      window.clearInterval(timer);
    };
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writable || withdrawal || writeBusy.current || !active.current) return;
    let request = pending.current;
    if (!request) {
      const content = {
        summary: draft.summary.trim(), strength: draft.strength.trim(), focus: draft.focus.trim(),
        next_action: draft.next_action.trim(), concern: isConcern(draft.concern) ? draft.concern : null,
      };
      if (!isAudience(draft.audience) || fields.some(([key]) => !content[key] || content[key].length > maxLength) ||
        (draft.concern && !isConcern(draft.concern))) {
        setError('Enter all four learning notes, keep each within 1,000 characters and choose who can read the report.');
        return;
      }
      request = {id: crypto.randomUUID(), content: {...content, audience: draft.audience}};
      pending.current = request;
    }
    writeBusy.current = true;
    readVersion.current++;
    reading.current = false;
    setResult({kind: 'loading'});
    setBusy(true);
    setError('');
    setMessage('');
    const {id, content} = request;
    try {
      const saved = await db.rpc('add_unipathway_tuition_report', {
        p_plan: plan, p_id: id, p_summary: content.summary, p_strength: content.strength, p_focus: content.focus,
        p_next_action: content.next_action, p_concern: content.concern, p_audience: content.audience,
      });
      if (!active.current) return;
      if (saved.error || saved.data !== id) throw Error('Unverified receipt');
      confirmed();
    } catch {
      if (!active.current) return;
      setUncertain(true);
      setError('Save not confirmed. We’ll check the report list. You can safely retry the same report without creating a second copy.');
    } finally {
      if (active.current) {
        await load(true);
        if (active.current) setBusy(false);
      }
      writeBusy.current = false;
    }
  }

  async function withdraw() {
    if (!writable || !withdrawal || writeBusy.current || !active.current) return;
    if (withdrawal.state === 'confirm' && (result.kind !== 'ready' || !result.reports.some(report => report.id === withdrawal.id))) return;
    writeBusy.current = true;
    invalidateRead();
    reading.current = false;
    setResult({kind: 'loading'});
    setBusy(true);
    setMessage('');
    try {
      const receipt = await db.rpc('withdraw_unipathway_tuition_report', {p_plan: plan, p_id: withdrawal.id});
      if (!active.current) return;
      if (receipt.error || receipt.data !== withdrawal.id) throw Error('Unverified withdrawal');
      setWithdrawal(null);
      setMessage('Session report withdrawn.');
    } catch {
      if (active.current) setWithdrawal({...withdrawal, state: 'uncertain'});
    } finally {
      if (active.current) {
        await load(true);
        if (active.current) setBusy(false);
      }
      writeBusy.current = false;
    }
  }

  return <section aria-labelledby={heading} className="my-4 min-w-0 rounded-xl border bg-card p-4 sm:p-5">
    <h3 id={heading} className="text-lg font-bold">Tuition session reports</h3>
    <p className="mt-1 text-sm text-muted-foreground">Teaching feedback and next steps. These reports do not change official grades.</p>
    {writable && <form className="my-4 space-y-3 border-y py-4" onSubmit={event => void submit(event)}>
      <fieldset disabled={busy || uncertain} className="min-w-0 space-y-3">
        <legend className="font-semibold">Record a session report</legend>
        <p id={help} className="text-sm text-muted-foreground">Record learning observations only. Do not enter medical, safeguarding or other private information.</p>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {fields.map(([name, label]) => <label key={name} className="block min-w-0 text-sm font-medium">{label}
            <textarea required name={name} aria-describedby={help} maxLength={maxLength} rows={3} className={fieldClass}
              value={draft[name]} onChange={event => setDraft(previous => ({...previous, [name]: event.target.value}))}/>
          </label>)}
        </div>
        <label className="block text-sm font-medium">Educational concern (optional)
          <select className={fieldClass} value={draft.concern} onChange={event => setDraft(previous => ({...previous, concern: event.target.value}))}>
            <option value="">None</option>{Object.entries(concernLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Who can read this report?
          <select required className={fieldClass} value={draft.audience} onChange={event => setDraft(previous => ({...previous, audience: event.target.value}))}>
            <option value="">Choose an audience</option>{Object.entries(audienceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">Shared reports are visible to the learner and to verified guardians whose separate session report permission is enabled for this plan, including reports shared before permission was given. Staff-only reports are not shown to learners or guardians.</p>
      </fieldset>
      <Button type="submit" disabled={busy || !!withdrawal}>{busy ? 'Checking save…' : uncertain ? 'Retry same report' : 'Save session report'}</Button>
    </form>}
    {writable && withdrawal && <div role="group" aria-label="Withdraw session report" className="my-4 space-y-2 rounded-lg border p-3">
      <p className="text-sm font-semibold">Session report from {time.format(new Date(withdrawal.created_at))} PKT</p>
      <p className="text-sm">Withdrawal hides this report from learners, guardians and normal staff report lists. It does not delete the audit record or change grades.</p>
      {withdrawal.state === 'uncertain' && <p role="alert" className="text-sm text-destructive">Withdrawal was not confirmed. You can safely retry the same report.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="destructive" disabled={busy || (withdrawal.state === 'confirm' && result.kind !== 'ready')} onClick={() => void withdraw()}>
          {withdrawal.state === 'confirm' ? 'Confirm withdrawal' : 'Retry same withdrawal'}
        </Button>
        <Button ref={dismissWithdrawal} type="button" variant="outline" disabled={busy} onClick={() => {
          setWithdrawal(null);
          window.requestAnimationFrame(() => {if (active.current) withdrawalOpener.current?.focus();});
        }}>
          {withdrawal.state === 'confirm' ? 'Cancel withdrawal' : 'Close withdrawal check'}
        </Button>
      </div>
    </div>}
    {error && <p role="alert" className="my-2 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="my-2 text-sm">{message}</p>}
    <Button type="button" variant="outline" className="my-3 min-h-11" disabled={busy || result.kind === 'loading'} onClick={() => void load()}>
      {result.kind === 'error' ? 'Retry loading session reports' : 'Refresh session reports'}
    </Button>
    {result.kind === 'loading' && <p role="status" className="text-sm">Checking access to session reports…</p>}
    {result.kind === 'unavailable' && <p role="status" className="text-sm">{view === 'guardian' ? 'Session reports are not available to you for this plan. The learner manages this permission separately.' : 'Session report access is not available for this plan.'}</p>}
    {result.kind === 'error' && <p role="alert" className="text-sm text-destructive">Session reports could not be verified. Use Retry to check again.</p>}
    {result.kind === 'ready' && (result.reports.length === 0
      ? <p className="text-sm">{staffView ? 'No session reports have been recorded for this plan.' : 'No session reports are shared with you for this plan.'}</p>
      : <ul aria-label="Recent tuition session reports" className="space-y-2">{result.reports.map(report => <li key={report.id}>
        <details className="min-w-0 rounded-lg border p-3" open={opened.has(report.id)} onToggle={event => {
          const open = event.currentTarget.open;
          setOpened(previous => {
            if (previous.has(report.id) === open) return previous;
            const next = new Set(previous);
            if (open) next.add(report.id); else next.delete(report.id);
            return next;
          });
        }}>
          <summary className="cursor-pointer break-words py-2 text-sm font-semibold">
            {staffView ? audienceLabels[report.audience] : 'Shared report'} · <time dateTime={report.created_at}>{time.format(new Date(report.created_at))} PKT</time>
          </summary>
          <dl className="space-y-2 p-1 text-sm">
            {fields.map(([name, label]) => <div key={name}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words">{report[name] ?? 'Not recorded'}</dd></div>)}
            {report.concern && <div><dt className="font-semibold">Educational concern</dt><dd>{concernLabels[report.concern]}</dd></div>}
          </dl>
          {writable && <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={busy || uncertain || !!withdrawal}
            onClick={event => {withdrawalOpener.current = event.currentTarget; setWithdrawal({id: report.id, created_at: report.created_at, state: 'confirm'});}}>
            Withdraw report
          </Button>}
        </details>
      </li>)}</ul>)}
  </section>;
}
