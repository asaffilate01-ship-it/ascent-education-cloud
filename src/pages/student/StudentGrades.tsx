import DashboardLayout from '@/components/layout/DashboardLayout';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {Button} from '@/components/ui/button';
import {useState} from 'react';

export default function StudentGrades() {
  const {user} = useAuth();
  return <DashboardLayout title="Grades & Results" subtitle="Your recorded submission results">
    {!user?.tenantId ? <p role="alert">A centre assignment is required.</p> : <Results key={`${user.id}:${user.tenantId}`} tenant={user.tenantId} student={user.id}/>}
  </DashboardLayout>;
}
function Results({tenant, student}: {tenant: string; student: string}) {
  const scope = [{column: 'tenant_id', operator: 'eq' as const, value: tenant}];
  const submissions = useSupabaseQuery('submissions', {filters: [...scope, {column: 'student_id', operator: 'eq', value: student}], orderBy: {column: 'submitted_at', ascending: false}});
  const assignments = useSupabaseQuery('assignments', {filters: scope});
  const modules = useSupabaseQuery('modules', {filters: scope});
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const sources = [submissions, assignments, modules];
  if (sources.some(source => source.loading)) return <p role="status">Loading recorded grades…</p>;
  if (sources.some(source => source.error)) return <div><p role="alert">Results could not be loaded completely. No grade summary is available.</p><Button onClick={() => sources.forEach(source => void source.refetch())}>Retry results</Button></div>;
  // Match by IDs: identical module/assignment titles must never merge results.
  const rows = submissions.data.filter(s => s.student_id === student && s.tenant_id === tenant).map(s => {
    const assignment = assignments.data.find(a => a.id === s.assignment_id);
    const module = modules.data.find(m => m.id === assignment?.module_id);
    return {...s, title: assignment?.title || 'Assignment unavailable', module: module?.title || 'Module unavailable'};
  }).filter(s => `${s.title} ${s.module}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4">
    <p>These are recorded submission marks, not an official transcript or award decision. Module weighting, credit awards and classification are not inferred from these marks.</p>
    <p>For a grade appeal, contact the centre through its approved appeals process. Online appeal submission is not connected.</p>
    <label className="block">Search results<input className="block border rounded p-2" value={search} onChange={e => {setSearch(e.target.value); setPage(0);}}/></label>
    {!rows.length && <p>No matching submission results.</p>}
    {rows.slice(page * 20, page * 20 + 20).map(row => <article key={row.id} className="surface-card p-4 space-y-2">
      <h2 className="font-semibold">{row.title}</h2><p>{row.module}</p>
      <p>Recorded mark: {row.grade === null ? 'Not graded' : `${row.grade}%`}</p>
      <p>Submission status: {row.status}</p><p>Submitted: {new Date(row.submitted_at).toLocaleString()}</p>
      <p>Feedback: {row.feedback || 'Not provided'}</p><p className="text-xs">Submission reference: {row.id}</p>
    </article>)}
    <div className="flex gap-2"><Button disabled={!page} onClick={() => setPage(p => p - 1)}>Previous results</Button><Button disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(p => p + 1)}>Next results</Button></div>
  </div>;
}
