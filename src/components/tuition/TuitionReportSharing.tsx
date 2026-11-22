import {useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {canUseTuitionReportsRole, tuitionReportsEnabled} from '@/lib/tuitionReports';
import {Button} from '@/components/ui/button';

type Option = {id: string; name: string; shared: boolean};
type Outcome = {status: 'loading' | 'error'} | {status: 'ready'; options: Option[]};

function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) throw Error('Unverified guardian options');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id ||
        seen.has(item.id) || typeof item.name !== 'string' || typeof item.shared !== 'boolean') throw Error('Unverified guardian options');
    seen.add(item.id);
    return {id: item.id, name: item.name, shared: item.shared};
  });
}

export default function TuitionReportSharing({plan}: {plan: string}) {
  const {user, loading} = useAuth();
  if (!tuitionReportsEnabled() || loading || !user?.id || !user.tenantId || !canUseTuitionReportsRole(user, 'student')) return null;
  return <SharingWorkspace plan={plan} key={JSON.stringify([user.id, user.tenantId, user.role, user.roles, plan])}/>;
}

function SharingWorkspace({plan}: {plan: string}) {
  const heading = useId();
  const [result, setResult] = useState<Outcome>({status: 'loading'});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{text: string; error?: boolean} | null>(null);
  const active = useRef(false);
  const version = useRef(0);
  const saving = useRef(false);
  const invalidateRead = useCallback(() => {version.current++;}, []);
  useLayoutEffect(() => {
    active.current = true;
    return () => {active.current = false; invalidateRead();};
  }, [invalidateRead]);
  const read = useCallback(async () => {
    const request = ++version.current;
    const current = () => active.current && version.current === request;
    setResult({status: 'loading'});
    try {
      const r = await db.rpc('get_unipathway_tuition_report_share_options', {p_plan: plan});
      if (!current()) return null;
      if (r.error) throw r.error;
      const options = parseOptions(r.data);
      setResult({status: 'ready', options});
      return options;
    } catch {
      if (current()) setResult({status: 'error'});
      return null;
    }
  }, [plan]);
  useEffect(() => {void read();}, [read]);

  async function change(option: Option) {
    if (!active.current || saving.current || result.status !== 'ready') return;
    saving.current = true;
    setBusy(true);
    setFeedback(null);
    setResult({status: 'loading'});
    const shared = !option.shared;
    try {
      // The confirmation below comes from re-reading the exact permission, not merely the write response.
      await db.rpc('set_unipathway_tuition_report_share', {p_plan: plan, p_link: option.id, p_share: shared});
    } catch {
      // A transport error can happen after a committed write. Verify before offering another action.
    } finally {
      if (active.current) {
        const options = await read();
        if (active.current) {
          const current = options?.find(row => row.id === option.id);
          setFeedback(current?.shared === shared
            ? {text: shared ? 'Report sharing enabled.' : 'Report sharing removed.'}
            : {text: 'The change could not be confirmed. Check the current permission before trying again.', error: true});
          setBusy(false);
        }
      }
      saving.current = false;
    }
  }

  return <section aria-labelledby={heading} className="my-4 min-w-0 rounded-xl border p-4">
    <h3 id={heading} className="font-semibold">Share session reports with a guardian</h3>
    <p className="mt-1 text-sm text-muted-foreground">This is separate from learning-plan sharing. Enabling it for a verified guardian gives them access to this plan’s earlier and future shared session reports, including the learning notes. They never see staff-only reports. Turning it off removes their access to the report history without changing your learning-plan sharing.</p>
    {result.status === 'loading' && <p role="status" className="mt-3 text-sm">Checking report-sharing permissions…</p>}
    {result.status === 'error' && <><p role="alert" className="mt-3 text-sm text-destructive">Report-sharing permissions could not be verified.</p>
      <Button type="button" variant="outline" disabled={busy} className="mt-2 min-h-11" onClick={() => {setFeedback(null); void read();}}>Retry report-sharing permissions</Button></>}
    {result.status === 'ready' && <Button type="button" variant="outline" disabled={busy} className="mt-2 min-h-11" onClick={() => {setFeedback(null); void read();}}>Refresh report-sharing permissions</Button>}
    {result.status === 'ready' && (result.options.length === 0
      ? <p className="mt-3 text-sm">No verified guardians currently have access to this learning plan. You can manage learning-plan sharing separately below.</p>
      : <ul className="mt-3 space-y-2">{result.options.map(option => <li key={option.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
        <p className="min-w-0 break-words text-sm">{option.name} · {option.shared ? 'Report sharing on' : 'Report sharing off'}</p>
        <Button type="button" variant="outline" disabled={busy} className="h-auto min-h-11 min-w-0 whitespace-normal text-left" onClick={() => void change(option)}
          aria-label={`${option.shared ? 'Turn off' : 'Enable'} report sharing for ${option.name}`}>
          {option.shared ? 'Turn off report sharing' : 'Enable report sharing'}
        </Button>
      </li>)}</ul>)}
    {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`mt-3 text-sm ${feedback.error ? 'text-destructive' : ''}`}>{feedback.text}</p>}
  </section>;
}
