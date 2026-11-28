import DashboardLayout from '@/components/layout/DashboardLayout';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {useLocation, Link} from 'react-router-dom';
import {useState, useEffect, useMemo} from 'react';
import {matchesLocalSearch} from '@/lib/localSearch';
import {examReadinessIndex,verifiedExamCalendarSnapshot} from '@/lib/exams/examReadiness';
import {eventDateSummary} from '@/lib/academicCalendar';

const sections = ['schedule', 'rooms', 'seating', 'entry', 'incidents', 'results'] as const;
export default function ExamsDashboard() {
  const {user} = useAuth();
  const verified=!!user?.id&&!!user.tenantId&&user.role==='exams_officer'&&user.roles?.includes('exams_officer');
  const {pathname} = useLocation();
  const section = pathname.split('/')[2] || 'schedule';
  const [page, setPage] = useState(0);
  const [search,setSearch]=useState(''),[issuesOnly,setIssuesOnly]=useState(false);
  useEffect(() => {setPage(0);setSearch('');setIssuesOnly(false);}, [user?.id, user?.tenantId, user?.role, section]);
  const events = useSupabaseQuery('academic_events', {
    enabled: verified,
    filters: [{column: 'tenant_id', operator: 'eq', value: user?.tenantId}, {column: 'event_type', operator: 'eq', value: 'exam'}],
    orderBy: {column: 'start_date', ascending: true},
  });
  // An inconsistent, cross-centre or duplicated backend response is an
  // unavailable source, not an empty/no-exams result.
  const snapshot=useMemo(()=>{
    if(verified&&!events.loading&&!events.error){
      try{
        const rows=verifiedExamCalendarSnapshot(events.data,user!.tenantId!);
        return {rows,index:examReadinessIndex(rows),error:false};
      }catch{return {rows:[],index:examReadinessIndex([]),error:true};}
    }
    return {rows:[],index:examReadinessIndex([]),error:false};
  },[verified,events.loading,events.error,events.data,user?.tenantId]);
  const safeEvents=snapshot.rows,readiness=snapshot.index.summary,snapshotError=snapshot.error;
  const filtered=useMemo(()=>safeEvents.filter(event=>(!issuesOnly||!!snapshot.index.checks.get(event.id)?.length)&&matchesLocalSearch([event.title,event.location||'',event.start_date||'',event.id].join(' '),search)),[safeEvents,snapshot.index,issuesOnly,search]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/20)),effectivePage=Math.min(page,pageCount-1);
  return <DashboardLayout title="Examinations" subtitle="Recorded exam events and operational readiness">
    <p className="mb-4 text-sm"><Link to="/exams/session-plans" className="font-semibold underline">Exam session preparation and Centre Director handoff</Link> · internal planning service (activation gated)</p>
    <p className="mb-4 text-sm"><Link to="/exams/candidate-seating" className="font-semibold underline">Programme-linked candidate and provisional seating workflow</Link> · activation gated</p>
    <nav aria-label="Examination sections" className="mb-5 flex flex-wrap gap-2">{sections.map(item => <Link key={item} to={`/exams/${item}`} aria-current={section === item ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${section===item?'bg-primary text-primary-foreground':'bg-card hover:bg-accent'}`}>{item}</Link>)}</nav>
    {!verified ? <p role="alert">An active, verified Exams Officer role and assigned centre are required.</p> : section === 'schedule' || section === 'rooms' ? <section className="surface-card min-w-0 p-3 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{section === 'rooms' ? 'Recorded exam locations' : 'Recorded exam timetable'}</h2><Button variant="outline" disabled={events.loading} onClick={()=>void events.refetch()}>Refresh exam events</Button></div>
      <p>These are exam events from the academic calendar, shown in Pakistan time. Room capacity, invigilator assignments and candidate registration are not recorded here. A date warning is not an examination invitation.</p>
      {events.loading ? <p role="status">Loading exam events…</p> : events.error||snapshotError ? <div><p role="alert">Exam events could not be verified. Timetable and readiness counts are unavailable.</p><Button onClick={() => void events.refetch()}>Retry exam events</Button></div> : <>
        <aside aria-label="Exam preparation checks" className="rounded-xl border bg-background p-4 space-y-2"><h3 className="font-semibold">Recorded calendar preparation</h3><p className="text-sm text-muted-foreground">Read-only warnings. Candidate registration, identity, invigilators and official board approval must be verified separately.</p><div className="flex flex-wrap gap-4 text-sm"><span>Events: {readiness.total}</span><span>Missing venue: {readiness.missingVenue}</span><span>Invalid dates: {readiness.invalidDates}</span><span>Possible venue clashes: {readiness.overlapPairs}</span></div></aside>
        {safeEvents.length>0&&<div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-[1_1_14rem] text-sm font-medium">Search examinations<input type="search" maxLength={120} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-3 py-2" placeholder="Title, venue, date or event reference"/></label><Button variant={issuesOnly?'default':'outline'} aria-pressed={issuesOnly} onClick={()=>{setIssuesOnly(v=>!v);setPage(0);}}>Needs review only</Button>{(search||issuesOnly)&&<Button variant="ghost" onClick={()=>{setSearch('');setIssuesOnly(false);setPage(0);}}>Clear exam filters</Button>}</div>}
        {safeEvents.length>0&&<p role="status" aria-label="Exam calendar results" className="text-sm text-muted-foreground">{filtered.length} of {safeEvents.length} recorded events match. Readiness totals cover the full verified calendar.</p>}
        {!safeEvents.length && <p>No exam events have been recorded.</p>}
        {safeEvents.length>0&&!filtered.length&&<p>No examination events match these filters.</p>}
        {filtered.slice(effectivePage * 20, effectivePage * 20 + 20).map(event => {
          const issues=snapshot.index.checks.get(event.id)||[];
          return <article key={event.id} className="min-w-0 rounded-lg border p-3 [overflow-wrap:anywhere]">
           <h3 className="break-words font-medium">{event.title}</h3>
           <p className="text-sm">{issues.includes('invalid start or finish date')?'Date unavailable — verify start and finish in the academic calendar':`${eventDateSummary(event)} · Pakistan time`}</p>
           <p>Location: {event.location || 'Not assigned'}</p>
           {issues.map(issue=><p key={issue} className="text-sm text-amber-700 dark:text-amber-300">Review needed: {issue}</p>)}
           {event.description && <p className="break-words">{event.description}</p>}
          </article>;
        })}
        <nav aria-label="Exam calendar pages" className="flex flex-wrap items-center gap-2"><Button disabled={effectivePage === 0} onClick={() => setPage(effectivePage-1)}>Previous exams</Button><span className="text-sm">Page {effectivePage+1} of {pageCount}</span><Button disabled={effectivePage+1>=pageCount} onClick={() => setPage(effectivePage+1)}>Next exams</Button></nav>
      </>}
    </section> : <section className="surface-card min-w-0 p-3 sm:p-5 space-y-3">
      <h2 className="font-semibold capitalize">{section}</h2>
      <p role="status">{section === 'incidents' ? 'A persistent exam incident workflow is not connected. Use the centre’s approved incident reporting process.' : section === 'results' ? 'Verified examination results are not connected. Assignment grades are not examination results.' : section === 'seating' ? 'Approved seating plans are not connected.' : 'Candidate entry verification is not connected.'}</p>
    </section>}
  </DashboardLayout>;
}
