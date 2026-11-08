import {pakistanClassTime, classJoinState} from '@/lib/classroomExperience';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import TeamsLink from '@/components/native/TeamsLink';
import {useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import {Button} from '@/components/ui/button';
import {isTeamsMeetingUrl as isTeamsUrl} from '@/lib/teamsTeaching';
import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from '@/lib/pagedRows';
import {useAuth} from '@/contexts/AuthContext';
import {AlertTriangle, BookOpen, Calendar, ExternalLink, Film, Hand, PenTool, ShieldCheck, Video, Users} from 'lucide-react';

type Session = {
  id: string; tenant_id: string; title: string; module_id: string | null; starts_at: string; ends_at: string;
  class_mode: string; status: string; join_url: string | null; recording_enabled: boolean; capacity: number;
};
type Board = {id: string; tenant_id: string; session_id: string; title: string; created_at: string};
const pageSize = 20;

export default function TeamsClassroom() {
  const {user} = useAuth();
  const [params] = useSearchParams();
  const moduleId = params.get('module') || '';
  const sessionId = params.get('session') || '';
  const scope = JSON.stringify([user?.id, user?.tenantId, user?.role, [...(user?.roles || [])].sort(), moduleId, sessionId]);
  return <ClassroomWorkspace key={scope} moduleId={moduleId} sessionId={sessionId}/>;
}

function ClassroomWorkspace({moduleId, sessionId}: {moduleId: string; sessionId: string}) {
  const {user} = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [boardError, setBoardError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(0);
  const showPast = params.get('view') === 'past';
  const uid = user?.id, tenant = user?.tenantId;
  const verified = !!user?.id && !!user.tenantId && !!user.role && !!user.roles?.includes(user.role);
  const teacher = verified && ['lecturer', 'programme_leader', 'centre_director', 'superadmin'].includes(user!.role);
  const accessMessage = !user?.id || !user.tenantId
    ? 'A verified centre assignment is required to load class invitations.'
    : 'Your active role could not be verified. Choose an assigned role or sign in again.';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let current = true;
    setSessions([]); setBoards([]); setError(false); setBoardError(false); setPage(0);
    if (!verified || !uid || !tenant) {setLoading(false); return;}
    setLoading(true);
    void (async () => {
      try {
        // RLS decides invitations and staff allocations. URL filters narrow that
        // authorised result; they never replace permission checks or discard
        // valid general classes when no module was requested.
        const rows = await pagedRows<Session>(() => {
          let query = db.from('live_class_sessions')
            .select('id,tenant_id,title,module_id,starts_at,ends_at,class_mode,status,join_url,recording_enabled,capacity')
            .eq('tenant_id', tenant).order('starts_at', {ascending: false});
          if (moduleId) query = query.eq('module_id', moduleId);
          if (sessionId) query = query.eq('id', sessionId);
          return query;
        }, () => current);
        if (!current) return;
        const scoped = rows.filter(row => row.tenant_id === tenant && (!moduleId || row.module_id === moduleId) && (!sessionId || row.id === sessionId));
        setSessions(scoped);
        try {
          const allowed = new Set(scoped.map(row => row.id));
          const whiteboards = await rowsByIds<Board>([...allowed], ids => () => db.from('lesson_whiteboards')
            .select('id,tenant_id,session_id,title,created_at').eq('tenant_id', tenant)
            .in('session_id', ids).order('created_at', {ascending: false}), () => current);
          if (current) setBoards(whiteboards.filter(board => board.tenant_id === tenant && allowed.has(board.session_id)));
        } catch {
          if (current) {setBoardError(true); setBoards([]);}
        }
      } catch {
        if (current) {setError(true); setSessions([]); setBoards([]);}
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {current = false;};
  }, [uid, tenant, verified, moduleId, sessionId, refresh]);

  const selected = sessionId ? sessions.find(session => session.id === sessionId) : undefined;
  const visible = useMemo(() => [...sessions].filter(session => sessionId || (session.status !== 'cancelled' &&
    (showPast ? classJoinState(session, now) === 'ended' : classJoinState(session, now) !== 'ended')))
    .sort((a, b) => (showPast ? -1 : 1) * (Date.parse(a.starts_at) - Date.parse(b.starts_at)) || a.id.localeCompare(b.id)),
  [sessions, sessionId, showPast, now]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / pageSize) - 1));
  const contextModule = selected?.module_id || moduleId;
  const archiveQuery = new URLSearchParams();
  if (contextModule) archiveQuery.set('module', contextModule);
  if (selected) archiveQuery.set('session', selected.id);
  const archivePath = (teacher ? '/lecturer/lesson-archive' : '/student/lesson-archive') + (archiveQuery.toString() ? `?${archiveQuery}` : '');
  const materialsPath = (teacher ? '/lecturer/materials' : '/student/materials') + (contextModule ? `?${new URLSearchParams({module: contextModule})}` : '');
  const allParams = new URLSearchParams(params);
  allParams.delete('session');
  if (selected && classJoinState(selected, now) === 'ended') allParams.set('view', 'past');
  const allClassesPath = location.pathname + (allParams.toString() ? `?${allParams}` : '');
  const changeView = (past: boolean) => {
    const next = new URLSearchParams(params);
    if (past) next.set('view', 'past'); else next.delete('view');
    setPage(0); setParams(next);
  };

  const classCard = (s: Session) => {
    const state = classJoinState(s, now);
    const board = boards.find(item => item.session_id === s.id);
    const time = Number.isFinite(Date.parse(s.starts_at)) ? `${pakistanClassTime(s.starts_at)} PKT` : 'Class time unavailable';
    return <article key={s.id} className="min-w-0 rounded-xl border bg-card p-5 max-sm:px-[16px] [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 text-base font-bold">{s.title}</h3><StatusBadge status={s.status}/></div>
      <p className="mt-2 text-sm text-muted-foreground">{time} · {s.class_mode}</p>
      <p className="mt-1 flex items-start gap-2 text-xs text-muted-foreground"><Users aria-hidden="true" className="mt-1 size-4 shrink-0"/><span>Planned class capacity: {s.capacity}. Actual Teams licence/provider limits apply.</span></p>
      <p className="mt-2 text-xs text-muted-foreground">{s.recording_enabled ? 'Teams recording requested; successful capture and release are separate.' : 'Teams recording not requested.'}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 [&_a]:max-w-full">
        {state === 'open' && isTeamsUrl(s.join_url)
          ? <TeamsLink className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground max-sm:px-[16px] [overflow-wrap:normal]" href={s.join_url!} target="_blank" rel="noopener noreferrer">Join Teams <ExternalLink aria-hidden="true" className="size-4 shrink-0"/></TeamsLink>
          : <p className="text-xs font-semibold text-muted-foreground">{s.status === 'cancelled' ? 'Class cancelled' : state === 'ended' ? 'Class completed' : state === 'unavailable' ? 'Class time needs confirmation before joining' : state === 'scheduled' ? 'Teams join opens 20 minutes before start' : 'Verified Teams link not configured'}</p>}
        <Link className="inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-semibold max-sm:px-[16px] [overflow-wrap:normal]" to={'/classroom/teaching/'+s.id}>{teacher ? 'Teaching desk · groups & recordings' : 'Class resources & recordings'}</Link>
        <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold max-sm:px-[16px] [overflow-wrap:normal]" to={'/classroom/discussion/'+s.id}><Hand aria-hidden="true" className="size-4 shrink-0"/>Raise hand / Ask a question</Link>
        {board
          ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold max-sm:px-[16px] [overflow-wrap:normal]" to={'/classroom/whiteboard/'+board.id}><PenTool aria-hidden="true" className="size-4 shrink-0"/>Open live board & replay</Link>
          : <span className="text-xs text-muted-foreground">{boardError ? 'Board availability could not be checked' : 'No live board is available for this class'}</span>}
      </div>
    </article>;
  };

  return <DashboardLayout title="UniPathway Live Classroom" subtitle="Private lecture rooms with interactive whiteboard and on-demand materials">
    <ModuleJourney moduleId={contextModule || undefined} teacher={teacher}/>
    <section className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-4 max-sm:px-[16px]">
      <h2 className="flex items-start gap-2 text-base font-bold"><ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0"/>Invited students and allocated teachers only</h2>
      <p className="mt-2 text-sm text-muted-foreground">Only classes authorised for your signed-in centre and current role appear below. A valid invitation and permission are still required to join. The Teams link opens 20 minutes before the start. All times are Pakistan Standard Time (PKT). Have your microphone, headphones and course notes ready; your teacher controls access to the live board and released recordings.</p>
      {teacher && <p className="mt-2 text-xs text-muted-foreground">Microsoft Teams lobby, presenter and recording permissions must be configured separately.</p>}
      {teacher && <div className="mt-3 flex flex-wrap gap-4">
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline" to="/lecturer/class-scheduler"><Calendar aria-hidden="true" className="size-4 shrink-0"/>Class scheduling and bulk invitations</Link>
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline" to="/lecturer/whiteboards"><PenTool aria-hidden="true" className="size-4 shrink-0"/>Whiteboard Studio</Link>
      </div>}
    </section>

    {!verified ? <section role="alert" className="rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Classroom access is unavailable</h2><p className="mt-2 text-sm">{accessMessage}</p></section> : <>
      <div className="mb-5 flex flex-wrap gap-3">
        {sessionId ? <Button asChild variant="outline"><Link to={allClassesPath}>View all classes</Link></Button> : <>
          <Button variant={showPast ? 'outline' : 'secondary'} aria-pressed={!showPast} onClick={() => changeView(false)}>Upcoming classes</Button>
          <Button variant={showPast ? 'secondary' : 'outline'} aria-pressed={showPast} onClick={() => changeView(true)}>Past classes</Button>
        </>}
        <Button variant="outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh classes</Button>
      </div>
      {loading && <p role="status">Checking your class invitations…</p>}
      {!loading && error && <section role="alert" className="space-y-3 rounded-xl border border-destructive/50 p-5 max-sm:px-[16px]">
        <h2 className="flex items-start gap-2 text-base font-semibold"><AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0"/>Classes could not be loaded</h2>
        <p className="text-sm">Your class invitations could not be verified. Retry the read, or contact your centre if it remains unavailable.</p>
        <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>Retry classes</Button>
      </section>}
      {!loading && !error && boardError && <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">Whiteboards could not be checked. Your classes are still listed; use Refresh classes to retry board access.</p>}
      {!loading && !error && sessionId && (selected
        ? <section aria-label="Selected class" className="space-y-3"><h2 className="text-base font-semibold">Selected class</h2>{classCard(selected)}</section>
        : <section role="status" className="space-y-3 rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Requested class is unavailable</h2><p className="text-sm">This class could not be found within your current centre, module and permitted invitations. Its details or your access may have changed.</p><p className="text-sm">Use View all classes to return to this module’s list, or open your learning workspace to choose another module.</p><Button asChild variant="outline"><Link to="/workspace">Open learning workspace</Link></Button></section>)}
      {!loading && !error && !sessionId && <>
        {!visible.length ? <section role="status" className="rounded-xl border p-6 text-center max-sm:px-[16px]"><Video aria-hidden="true" className="mx-auto size-7 text-muted-foreground"/><h2 className="mt-3 text-base font-semibold">{showPast ? 'No past classes' : 'No upcoming classes'}</h2><p className="mt-2 text-sm text-muted-foreground">{moduleId ? 'No permitted classes are visible for this module and view.' : 'Eligible lectures will appear after enrolment and an approved invitation.'}</p>{moduleId && <Link className="mt-3 inline-flex min-h-11 items-center font-semibold underline" to={location.pathname + (showPast ? '?view=past' : '')}>Show all permitted modules</Link>}</section>
          : <><p role="status" className="mb-3 text-sm text-muted-foreground">{visible.length} {showPast ? 'past' : 'upcoming'} {visible.length === 1 ? 'class' : 'classes'}{moduleId ? ' in this module' : ''}</p><div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4">{visible.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(classCard)}</div></>}
        {visible.length > pageSize && <nav aria-label="Class pages" className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous classes</Button><span>Page {currentPage + 1} of {Math.ceil(visible.length / pageSize)}</span><Button variant="outline" disabled={(currentPage + 1) * pageSize >= visible.length} onClick={() => setPage(currentPage + 1)}>Next classes</Button></nav>}
      </>}
    </>}

    {verified && <section className="mt-6 rounded-xl border p-4 max-sm:px-[16px]"><h2 className="flex items-center gap-2 text-base font-semibold"><Film aria-hidden="true" className="size-5 shrink-0"/>Lesson archive</h2>
      <p className="mt-2 text-sm text-muted-foreground">Saved whiteboard drawings replay independently from Teams video. Private recordings, transcripts and approved learning packs appear only when received and published.</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><Link className="inline-flex min-h-11 items-center text-sm font-semibold underline" to={archivePath}>Open my class archive</Link><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline" to={materialsPath}><BookOpen aria-hidden="true" className="size-4 shrink-0"/>All enrolled course notes and materials</Link></div>
    </section>}
  </DashboardLayout>;
}
