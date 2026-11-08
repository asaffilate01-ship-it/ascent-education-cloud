import {Link, useLocation, useSearchParams} from 'react-router-dom';
import ModuleJourney from '@/components/assessment/ModuleJourney';
import ClassRecordingPlayer from '@/components/learning/ClassRecordingPlayer';
import {useEffect, useRef, useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {db} from '@/lib/db';
import {pagedRows, rowsByIds} from '@/lib/pagedRows';
import {classMediaUrl} from '@/lib/learning/classMedia';
import {archiveAudience, archiveMinimumEmbargoElapsed, publishedArchiveAssetAvailable} from '@/lib/learning/archiveAccess';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ShieldCheck} from 'lucide-react';
import {POST_CLASS_EXPLANATION, ACCOMMODATION_EXPLANATION} from '@/lib/learning/classRelease';
import {toast} from 'sonner';

type Session = {tenant_id: string; module_id: string | null; id: string; title: string; starts_at: string; ends_at: string; status: string; actual_ended_at: string | null};
type Artifact = {id: string; tenant_id: string; session_id: string; artifact_type: string; publication_status: string; storage_reference: string | null; available_at: string | null};
type CourseModule = {id: string; tenant_id: string; programme_id: string; lecturer_id: string | null};
type Enrolment = {id: string; tenant_id: string; programme_id: string; student_id: string; status: string};
type Pack = {id: string; tenant_id: string; session_id: string; summary: string | null; status: string};
type ReadState = 'ready' | 'missing-module' | 'missing-session' | 'failed';
const postClassEnabled = () => import.meta.env.VITE_UNIPATHWAY_CLASS_RELEASE_ENABLED === 'true';
const released = (a: Artifact, session: Session) => postClassEnabled() && publishedArchiveAssetAvailable(a,session);

export default function LessonArchive() {
  const {user} = useAuth();
  const [params] = useSearchParams();
  const moduleFilter = params.get('module') || '';
  const sessionFilter = params.get('session') || '';
  const scope = JSON.stringify([user?.id, user?.tenantId, user?.role, [...(user?.roles || [])].sort(), moduleFilter, sessionFilter]);
  return <ArchiveWorkspace key={scope} moduleFilter={moduleFilter} sessionFilter={sessionFilter}/>;
}

function ArchiveWorkspace({moduleFilter, sessionFilter}: {moduleFilter: string; sessionFilter: string}) {
  const {user} = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const audience = archiveAudience(user);
  const uid = user?.id, tenant = user?.tenantId;
  const enabled = postClassEnabled();
  const teacher = !!user?.role && !!user.roles?.includes(user.role) && ['lecturer', 'programme_leader', 'centre_director', 'superadmin'].includes(user.role);
  const [sessions, setSessions] = useState<Session[]>([]), [artifacts, setArtifacts] = useState<Artifact[]>([]), [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true), [readState, setReadState] = useState<ReadState>('ready'), [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null), [playing, setPlaying] = useState('');
  const mounted = useRef(true), operation = useRef(false), popup = useRef<Window | null>(null), generation = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {mounted.current = true; return () => {mounted.current = false; popup.current?.close();};}, []);
  useEffect(() => {
    let active = true;
    generation.current++;
    setReadState('ready'); setSessions([]); setArtifacts([]); setPacks([]); setPlaying(''); setPage(0);
    if (audience === 'blocked' || !enabled || !uid || !tenant) {setLoading(false); return;}
    setLoading(true);
    void (async () => {
      try {
        // Module allocation narrows the read before RLS checks invitations and
        // private releases. A requested URL never supplies authority to read.
        let allowedModules: CourseModule[] = [];
        if (audience === 'student') {
          const enrolments = await pagedRows<Enrolment>(() => db.from('student_enrolments')
            .select('id,tenant_id,programme_id,student_id,status').eq('tenant_id',tenant).eq('student_id',uid).eq('status','active'), () => active);
          const programmeIds = enrolments.filter(e => e.tenant_id === tenant && e.student_id === uid && e.status === 'active').map(e => e.programme_id);
          allowedModules = await rowsByIds<CourseModule>(programmeIds, batch => () => db.from('modules')
            .select('id,tenant_id,programme_id,lecturer_id').eq('tenant_id',tenant).in('programme_id',batch), () => active);
          allowedModules = allowedModules.filter(m => m.tenant_id === tenant && programmeIds.includes(m.programme_id));
        } else {
          allowedModules = await pagedRows<CourseModule>(() => db.from('modules').select('id,tenant_id,programme_id,lecturer_id')
            .eq('tenant_id',tenant).eq('lecturer_id',uid), () => active);
          allowedModules = allowedModules.filter(m => m.tenant_id === tenant && m.lecturer_id === uid);
        }
        if (!active) return;
        const moduleIds = allowedModules.filter(m => !moduleFilter || m.id === moduleFilter).map(m => m.id);
        if (moduleFilter && !moduleIds.length) {setReadState('missing-module'); return;}
        const rows = await rowsByIds<Session>(moduleIds, batch => () => {
          let query = db.from('live_class_sessions').select('id,tenant_id,title,module_id,starts_at,ends_at,status,actual_ended_at')
            .eq('tenant_id',tenant).in('module_id',batch);
          if (sessionFilter) query = query.eq('id', sessionFilter);
          return query;
        }, () => active);
        if (!active) return;
        const classes = rows.filter(s => s.tenant_id === tenant && !!s.module_id && moduleIds.includes(s.module_id) && (!sessionFilter || s.id === sessionFilter));
        if (sessionFilter && !classes.length) {setReadState('missing-session'); return;}
        const ids = classes.map(s => s.id);
        const [assets, summaries] = await Promise.all([
          rowsByIds<Artifact>(ids, batch => () => db.from('live_class_artifacts')
            .select('id,tenant_id,session_id,artifact_type,publication_status,storage_reference,available_at')
            .eq('tenant_id',tenant).in('session_id',batch).eq('publication_status','published'), () => active),
          rowsByIds<Pack>(ids, batch => () => db.from('lesson_ai_packs')
            .select('id,tenant_id,session_id,summary,status').eq('tenant_id',tenant).in('session_id',batch).eq('status','published'), () => active),
        ]);
        if (!active) return;
        const bySession = new Map(classes.map(s => [s.id, s] as const));
        setSessions(classes.sort((a, b) => b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id)));
        setArtifacts(assets.filter(a => {
          const session = bySession.get(a.session_id);
          return a.tenant_id === tenant && !!session && released(a, session);
        }));
        // The server decides ordinary 24h versus approved exceptional 12h. The
        // client additionally blocks even a returned pack during its first 12h.
        setPacks(summaries.filter(p => {
          const session = bySession.get(p.session_id);
          return p.tenant_id === tenant && p.status === 'published' && !!session && archiveMinimumEmbargoElapsed(session);
        }));
      } catch {
        if (active) {setReadState('failed'); setSessions([]); setArtifacts([]); setPacks([]);}
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {active = false;};
  }, [uid, tenant, audience, enabled, moduleFilter, sessionFilter, refresh]);

  const openAsset = async (a: Artifact) => {
    const session = sessions.find(s => s.id === a.session_id);
    if (operation.current || !a.storage_reference || !session || !released(a, session)) return;
    operation.current = true; setDownloading(a.id); const request = generation.current;
    const target = window.open('about:blank', '_blank'); popup.current = target; if (target) target.opener = null;
    try {
      if (!target) throw Error('Allow pop-ups to open the private file, then retry.');
      const url = await classMediaUrl(a.storage_reference);
      if (!mounted.current || request !== generation.current) {target.close(); return;}
      target.location.replace(url); popup.current = null;
    } catch (e) {
      target?.close();
      if (mounted.current && request === generation.current) toast.error(e instanceof Error ? e.message : 'Media unavailable.');
    } finally {
      operation.current = false; if (mounted.current) setDownloading(null);
    }
  };
  const hasRecording = (id: string) => artifacts.some(a => a.session_id === id && a.artifact_type === 'recording' && a.storage_reference);
  const visible = sessions.filter(s => s.title.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'all' || filter === 'recordings' && hasRecording(s.id) || filter === 'packs' && packs.some(p => p.session_id === s.id && p.summary)));
  const selected = sessionFilter ? sessions.find(s => s.id === sessionFilter) : undefined;
  const contextModule = selected?.module_id || moduleFilter;
  const activeAsset = artifacts.find(a => a.id === playing), activeSession = sessions.find(s => s.id === activeAsset?.session_id);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / 10) - 1));
  const classroomQuery = new URLSearchParams();
  if (contextModule) classroomQuery.set('module', contextModule);
  if (sessionFilter) classroomQuery.set('session', sessionFilter);
  const classroomPath = (teacher ? '/lecturer/classroom' : '/student/classroom') + (classroomQuery.toString() ? `?${classroomQuery}` : '');
  const materialsPath = (teacher ? '/lecturer/materials' : '/student/materials') + (contextModule ? `?${new URLSearchParams({module: contextModule})}` : '');
  const allParams = new URLSearchParams(params); allParams.delete('session');
  const allClassesPath = location.pathname + (allParams.toString() ? `?${allParams}` : '');
  const clearFilters = () => {setSearch(''); setFilter('all'); setPage(0); searchInput.current?.focus();};
  const available = audience !== 'blocked' && enabled;

  return <DashboardLayout title="My lesson archive" subtitle="Find recordings and approved revision materials from your classes">
    <ModuleJourney moduleId={contextModule} teacher={teacher}/>
    <div className="mb-5 rounded-xl border bg-primary/5 p-4 max-sm:px-[16px]"><h2 className="flex items-start gap-2 text-base font-semibold"><ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0"/>Private class recordings</h2><p className="mt-2 text-sm text-muted-foreground">{POST_CLASS_EXPLANATION} {ACCOMMODATION_EXPLANATION} Only your authorised modules and private storage access are permitted.</p></div>
    <div className="mb-5 flex flex-wrap gap-3">
      {audience === 'blocked' ? <Button asChild variant="outline"><Link to="/workspace">Open learning workspace</Link></Button> : <>
        <Button asChild variant="outline"><Link to={classroomPath}>Return to classroom</Link></Button>
        <Button asChild variant="outline"><Link to={materialsPath}>Open course materials</Link></Button>
      </>}
      {available && sessionFilter && <Button asChild variant="outline"><Link to={allClassesPath}>View all archived classes</Link></Button>}
    </div>
    {audience === 'blocked' ? <section role="alert" className="space-y-2 rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Archive access is unavailable</h2><p className="text-sm">A verified student or lecturer role and centre assignment are required. Choose an assigned role or ask your centre to check your access.</p></section>
      : !enabled ? <section role="status" className="space-y-2 rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Recordings are awaiting activation</h2><p className="text-sm">Your centre has not yet activated the verified recording and revision-pack service. Continue with your classroom invitation or approved course materials. Released files will appear here after activation and the required checks.</p></section>
      : <>
        <div className="mb-5 flex flex-wrap items-end gap-3">
          {readState === 'ready' && <><label className="min-w-0 text-sm">Search classes<Input ref={searchInput} value={search} onChange={e => {setSearch(e.target.value); setPage(0);}} placeholder="Class title"/></label><label className="min-w-0 text-sm">Show<select className="block min-h-11 max-w-full rounded-lg border bg-background px-3" value={filter} onChange={e => {setFilter(e.target.value); setPage(0);}}><option value="all">All invited classes</option><option value="recordings">Recordings available</option><option value="packs">Revision packs available</option></select></label></>}
          <Button variant="outline" disabled={loading || !!downloading} onClick={() => setRefresh(n => n + 1)}>Refresh archive</Button>
        </div>
        {loading && <p role="status">Checking your lesson archive…</p>}
        {!loading && readState === 'failed' && <section role="alert" className="space-y-3 rounded-xl border border-destructive p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Archive could not be loaded</h2><p className="text-sm">Your class invitations and released materials could not be verified. Retry the read, or ask your centre for help if this continues.</p><Button variant="outline" onClick={() => setRefresh(n => n + 1)}>Retry archive</Button></section>}
        {!loading && readState === 'missing-module' && <section role="status" className="space-y-3 rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Requested module is unavailable</h2><p className="text-sm">This module is outside your current enrolled or allocated archive scope. Your enrolment or teaching allocation may have changed.</p><Button asChild variant="outline"><Link to={location.pathname}>Show all permitted modules</Link></Button></section>}
        {!loading && readState === 'missing-session' && <section role="status" className="space-y-3 rounded-xl border p-5 max-sm:px-[16px]"><h2 className="text-base font-semibold">Requested class is unavailable</h2><p className="text-sm">This class could not be found within your current archive scope and permitted invitations. Use View all archived classes to return to the available list.</p></section>}
        {activeAsset?.storage_reference && activeSession && <ClassRecordingPlayer key={activeAsset.id} recordingId={activeAsset.id} path={activeAsset.storage_reference} title={activeSession.title} onClose={() => setPlaying('')}/>}
        {!loading && readState === 'ready' && !visible.length && <section role="status" className="space-y-3 rounded-xl border p-6 text-sm text-muted-foreground max-sm:px-[16px]">{search || filter !== 'all' ? <><h2 className="text-base font-semibold text-foreground">No classes match these filters</h2><p>Try another title or clear the filters to see your available classes.</p><Button variant="outline" onClick={clearFilters}>Clear archive filters</Button></> : <><h2 className="text-base font-semibold text-foreground">No authorised classes are available</h2><p>Ask your lecturer to check your enrolment, module allocation and class invitations.</p></>}</section>}
        {!loading && readState === 'ready' && !!visible.length && <section aria-label={selected ? 'Selected archived class' : 'Archived classes'} className="space-y-4">
          {selected && <h2 className="text-base font-semibold">Selected archived class</h2>}
          {visible.slice(currentPage * 10, currentPage * 10 + 10).map(session => {
            const assets = artifacts.filter(a => a.session_id === session.id), pack = packs.find(p => p.session_id === session.id);
            const time = Number.isFinite(Date.parse(session.starts_at)) ? new Date(session.starts_at).toLocaleString('en-PK', {timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short'}) + ' · Pakistan time' : 'Class time unavailable';
            return <article className="min-w-0 rounded-xl border bg-card p-5 max-sm:px-[16px] [overflow-wrap:anywhere]" key={session.id}>
              <h3 className="text-base font-bold">{session.title}</h3><p className="mt-1 text-sm text-muted-foreground">{time}</p>
              {!assets.length && !pack && <p className="mt-3 text-sm text-muted-foreground">{session.status !== 'ended' ? 'This class is not confirmed as completed.' : !session.actual_ended_at ? 'The centre has not yet verified the actual class finish.' : 'No recording or revision material is released for this class yet. Release requires a received file, review and the waiting period described above.'}</p>}
              <div className="mt-3 flex flex-wrap gap-2">{assets.map(a => <div key={a.id} className="flex flex-wrap gap-2">{a.artifact_type === 'recording' && a.storage_reference && <Button onClick={() => setPlaying(a.id)}>{playing === a.id ? 'Recording open' : 'Watch recording'}</Button>}<Button variant="outline" disabled={!a.storage_reference || !!downloading} onClick={() => void openAsset(a)}>{downloading === a.id ? 'Opening…' : `Open ${a.artifact_type.replace(/_/g, ' ')} file`}</Button></div>)}</div>
              {pack?.summary && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-base font-semibold">Approved revision pack</summary><p className="mt-2 whitespace-pre-wrap text-sm">{pack.summary}</p></details>}
            </article>;
          })}
        </section>}
        {!loading && readState === 'ready' && visible.length > 10 && <nav aria-label="Lesson archive pages" className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous classes</Button><span>Page {currentPage + 1} of {Math.ceil(visible.length / 10)}</span><Button variant="outline" disabled={(currentPage + 1) * 10 >= visible.length} onClick={() => setPage(currentPage + 1)}>Next classes</Button></nav>}
      </>}
  </DashboardLayout>;
}
