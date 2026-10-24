import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
import {Button} from '@/components/ui/button';
type Brief = {id: string; title: string; due_at: string; submission_cutoff: string};
type Attempt = {brief_id: string; attempt_no: number; status: string};
type Session = {id: string; title: string; starts_at: string; ends_at: string};
export default function StudentLearningAgenda({tenant, student, moduleIds}: {tenant: string; student: string; moduleIds: string[]}) {
  const [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([tenant, student, moduleIds, refresh]);
  const [state, setState] = useState<{key: string; briefs: Brief[]; attempts: Attempt[]; sessions: Session[]; error: boolean} | null>(null);
  useEffect(() => {
    let active = true;
    async function allRows(table: string, columns: string, isBrief: boolean) {
      const rows = [];
      for (let offset = 0; active; offset += 250) {
        let query = db.from(table).select(columns).eq('tenant_id', tenant);
        query = isBrief ? query.eq('status', 'published').in('module_id', moduleIds) : query.eq('student_id', student);
        const result = await query.order('id').range(offset, offset + 249);
        if (result.error || !Array.isArray(result.data)) throw Error('Unavailable');
        rows.push(...result.data); if (result.data.length < 250) break;
      }
      return rows;
    }
    void (async () => {
      try {
        const [briefs, attempts, sessions] = await Promise.all([
          moduleIds.length ? allRows('unipathway_assessment_briefs', 'id,title,due_at,submission_cutoff', true) : [],
          moduleIds.length ? allRows('unipathway_assessment_attempts', 'id,brief_id,attempt_no,status', false) : [],
          db.from('live_class_sessions').select('id,title,starts_at,ends_at').eq('tenant_id', tenant).in('status', ['scheduled', 'live'])
            .gte('ends_at', new Date().toISOString()).order('starts_at').order('id').limit(5),
        ]);
        if (sessions.error || !Array.isArray(sessions.data)) throw Error('Unavailable');
        if (active) setState({key, briefs, attempts, sessions: sessions.data, error: false});
      } catch {if (active) setState({key, briefs: [], attempts: [], sessions: [], error: true});}
    })();
    return () => {active = false;};
  // key contains the complete request scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = state?.key === key ? state : null;
  const pending = current?.briefs.filter(brief => {
    const latest = current.attempts.filter(a => a.brief_id === brief.id).sort((a,b) => b.attempt_no - a.attempt_no)[0];
    return !latest || latest.status === 'resubmission_requested';
  }).sort((a,b) => Date.parse(a.due_at) - Date.parse(b.due_at)) || [];
  return <section className="surface-card p-5 mb-6 space-y-3" aria-label="Current learning agenda">
    <h3 className="font-semibold">Coursework and invited classes</h3>
    {!current ? <p role="status">Loading your learning agenda…</p> : current.error ? <p role="alert">Your current coursework and classes could not be verified.</p> : <>
      <h4 className="text-sm font-semibold">{pending.length} coursework tasks needing attention</h4>
      {!pending.length && <p className="text-sm text-muted-foreground">No published coursework currently needs a submission.</p>}
      {pending.slice(0,5).map(brief => <div className="border rounded p-3" key={brief.id}><p>{brief.title}</p><p className="text-sm text-muted-foreground">Due {new Date(brief.due_at).toLocaleString()} · {Date.parse(brief.submission_cutoff) < Date.now() ? 'Submission window closed—contact your programme team' : Date.parse(brief.due_at) < Date.now() ? 'Overdue—check submission rules' : 'Upcoming'}</p></div>)}
      <h4 className="text-sm font-semibold">Next invited classes</h4>
      {!current.sessions.length && <p className="text-sm text-muted-foreground">No upcoming class invitations are available.</p>}
      {current.sessions.map(session => <p className="text-sm" key={session.id}>{session.title} · {new Date(session.starts_at).toLocaleString()}</p>)}
    </>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setRefresh(x => x + 1)}>Refresh agenda</Button><Button asChild variant="outline"><Link to="/student/assignments">Open coursework</Link></Button><Button asChild variant="outline"><Link to="/student/classroom">View class invitations</Link></Button><Button asChild variant="outline"><Link to="/student/ielts">IELTS and audio lab</Link></Button></div>
  </section>;
}
