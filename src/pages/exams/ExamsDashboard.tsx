import DashboardLayout from '@/components/layout/DashboardLayout';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {useLocation, Link} from 'react-router-dom';
import {useState, useEffect} from 'react';

const sections = ['schedule', 'rooms', 'seating', 'entry', 'incidents', 'results'] as const;
export default function ExamsDashboard() {
  const {user} = useAuth();
  const {pathname} = useLocation();
  const section = pathname.split('/')[2] || 'schedule';
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [user?.id, user?.tenantId, section]);
  const events = useSupabaseQuery('academic_events', {
    enabled: !!user?.tenantId,
    filters: [{column: 'tenant_id', operator: 'eq', value: user?.tenantId}, {column: 'event_type', operator: 'eq', value: 'exam'}],
    orderBy: {column: 'start_date', ascending: true},
  });
  return <DashboardLayout title="Examinations" subtitle="Recorded exam events and operational readiness">
    <nav aria-label="Examination sections" className="flex flex-wrap gap-3 mb-5">{sections.map(item => <Link key={item} to={`/exams/${item}`} aria-current={section === item ? 'page' : undefined} className="capitalize underline">{item}</Link>)}</nav>
    {!user?.tenantId ? <p role="alert">A centre assignment is required.</p> : section === 'schedule' || section === 'rooms' ? <section className="surface-card p-5 space-y-4">
      <h2 className="font-semibold">{section === 'rooms' ? 'Recorded exam locations' : 'Recorded exam timetable'}</h2>
      <p>These are exam events from the academic calendar. Room capacity, invigilator assignments and candidate registration are not recorded here.</p>
      {events.loading ? <p role="status">Loading exam events…</p> : events.error ? <div><p role="alert">Exam events could not be loaded.</p><Button onClick={() => void events.refetch()}>Retry exam events</Button></div> : <>
        {!events.data.length && <p>No exam events have been recorded.</p>}
        {events.data.slice(page * 20, page * 20 + 20).map(event => <article key={event.id} className="border rounded p-3">
          <h3 className="font-medium">{event.title}</h3><p>{new Date(event.start_date).toLocaleString()} {event.all_day ? '(all day)' : ''}</p>
          <p>Location: {event.location || 'Not assigned'}</p>{event.description && <p>{event.description}</p>}
        </article>)}
        <div className="flex gap-2"><Button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous exams</Button><Button disabled={(page + 1) * 20 >= events.data.length} onClick={() => setPage(p => p + 1)}>Next exams</Button></div>
      </>}
    </section> : <section className="surface-card p-5 space-y-3">
      <h2 className="font-semibold capitalize">{section}</h2>
      <p role="status">{section === 'incidents' ? 'A persistent exam incident workflow is not connected. Use the centre’s approved incident reporting process.' : section === 'results' ? 'Verified examination results are not connected. Assignment grades are not examination results.' : section === 'seating' ? 'Approved seating plans are not connected.' : 'Candidate entry verification is not connected.'}</p>
    </section>}
  </DashboardLayout>;
}
