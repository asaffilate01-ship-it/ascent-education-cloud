import DashboardLayout from '@/components/layout/DashboardLayout';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {useLocation, Link} from 'react-router-dom';
import {useState, useEffect} from 'react';
import {examEventChecks,examReadinessSummary,verifiedExamCalendarSnapshot} from '@/lib/exams/examReadiness';
import {eventDateSummary} from '@/lib/academicCalendar';

const sections = ['schedule', 'rooms', 'seating', 'entry', 'incidents', 'results'] as const;
export default function ExamsDashboard() {
  const {user} = useAuth();
  const verified=!!user?.id&&!!user.tenantId&&user.role==='exams_officer'&&user.roles?.includes('exams_officer');
  const {pathname} = useLocation();
  const section = pathname.split('/')[2] || 'schedule';
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [user?.id, user?.tenantId, section]);
  const events = useSupabaseQuery('academic_events', {
    enabled: verified,
    filters: [{column: 'tenant_id', operator: 'eq', value: user?.tenantId}, {column: 'event_type', operator: 'eq', value: 'exam'}],
    orderBy: {column: 'start_date', ascending: true},
  });
  // An inconsistent, cross-centre or duplicated backend response is an
  // unavailable source, not an empty/no-exams result.
  let safeEvents:typeof events.data=[];
  let snapshotError=false;
  if(verified&&!events.loading&&!events.error){
    try{safeEvents=verifiedExamCalendarSnapshot(events.data,user!.tenantId!);}
    catch{snapshotError=true;}
  }
  const readiness=examReadinessSummary(safeEvents);
  const effectivePage=Math.min(page,Math.max(0,Math.ceil(safeEvents.length/20)-1));
  return <DashboardLayout title="Examinations" subtitle="Recorded exam events and operational readiness">
    <p className="mb-4 text-sm"><Link to="/exams/session-plans" className="font-semibold underline">Exam session preparation and Centre Director handoff</Link> · internal planning service (activation gated)</p>
    <p className="mb-4 text-sm"><Link to="/exams/candidate-seating" className="font-semibold underline">Programme-linked candidate and provisional seating workflow</Link> · activation gated</p>
    <nav aria-label="Examination sections" className="mb-5 flex flex-wrap gap-2">{sections.map(item => <Link key={item} to={`/exams/${item}`} aria-current={section === item ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${section===item?'bg-primary text-primary-foreground':'bg-card hover:bg-accent'}`}>{item}</Link>)}</nav>
    {!verified ? <p role="alert">An active, verified Exams Officer role and assigned centre are required.</p> : section === 'schedule' || section === 'rooms' ? <section className="surface-card p-5 space-y-4">
      <h2 className="font-semibold">{section === 'rooms' ? 'Recorded exam locations' : 'Recorded exam timetable'}</h2>
      <p>These are exam events from the academic calendar, shown in Pakistan time. Room capacity, invigilator assignments and candidate registration are not recorded here. A date warning is not an examination invitation.</p>
      {events.loading ? <p role="status">Loading exam events…</p> : events.error||snapshotError ? <div><p role="alert">Exam events could not be verified. Timetable and readiness counts are unavailable.</p><Button onClick={() => void events.refetch()}>Retry exam events</Button></div> : <>
        <aside aria-label="Exam preparation checks" className="rounded-xl border bg-background p-4 space-y-2"><h3 className="font-semibold">Recorded calendar preparation</h3><p className="text-sm text-muted-foreground">Read-only warnings. Candidate registration, identity, invigilators and official board approval must be verified separately.</p><div className="flex flex-wrap gap-4 text-sm"><span>Events: {readiness.total}</span><span>Missing venue: {readiness.missingVenue}</span><span>Invalid dates: {readiness.invalidDates}</span><span>Possible venue clashes: {readiness.overlapPairs}</span></div></aside>
        {!safeEvents.length && <p>No exam events have been recorded.</p>}
        {safeEvents.slice(effectivePage * 20, effectivePage * 20 + 20).map(event => {
          const issues=examEventChecks(event,safeEvents);
          return <article key={event.id} className="min-w-0 rounded-lg border p-3">
           <h3 className="break-words font-medium">{event.title}</h3>
           <p className="text-sm">{issues.includes('invalid start or finish date')?'Date unavailable — verify start and finish in the academic calendar':`${eventDateSummary(event)} · Pakistan time`}</p>
           <p>Location: {event.location || 'Not assigned'}</p>
           {issues.map(issue=><p key={issue} className="text-sm text-amber-700 dark:text-amber-300">Review needed: {issue}</p>)}
           {event.description && <p className="break-words">{event.description}</p>}
          </article>;
        })}
        <div className="flex flex-wrap gap-2"><Button disabled={effectivePage === 0} onClick={() => setPage(p => Math.max(0,p-1))}>Previous exams</Button><Button disabled={(effectivePage + 1) * 20 >= safeEvents.length} onClick={() => setPage(effectivePage+1)}>Next exams</Button></div>
      </>}
    </section> : <section className="surface-card p-5 space-y-3">
      <h2 className="font-semibold capitalize">{section}</h2>
      <p role="status">{section === 'incidents' ? 'A persistent exam incident workflow is not connected. Use the centre’s approved incident reporting process.' : section === 'results' ? 'Verified examination results are not connected. Assignment grades are not examination results.' : section === 'seating' ? 'Approved seating plans are not connected.' : 'Candidate entry verification is not connected.'}</p>
    </section>}
  </DashboardLayout>;
}
