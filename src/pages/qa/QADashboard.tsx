import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {useAuth} from '@/contexts/AuthContext';
import {useState} from 'react';
import type {Tables} from '@/integrations/supabase/types';

export default function QADashboard() {
  const {user} = useAuth();
  return <DashboardLayout title="Quality Assurance" subtitle="Recorded submissions for quality review">
    {!user?.tenantId ? <p role="alert">A centre assignment is required.</p> : <ReviewQueue key={`${user.id}:${user.tenantId}`} tenant={user.tenantId}/>}
  </DashboardLayout>;
}
function ReviewQueue({tenant}: {tenant: string}) {
  const filters = [{column: 'tenant_id', operator: 'eq' as const, value: tenant}];
  const submissions = useSupabaseQuery('submissions', {filters, orderBy: {column: 'submitted_at', ascending: false}});
  const assignments = useSupabaseQuery('assignments', {filters});
  const [selected, setSelected] = useState<Tables<'submissions'> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const failed = submissions.error || assignments.error;
  const loading = submissions.loading || assignments.loading;
  const rows = submissions.data.filter(row => (status === 'all' || row.status === status) && `${row.student_name} ${assignments.data.find(a => a.id === row.assignment_id)?.title || ''}`.toLowerCase().includes(search.toLowerCase()));
  const review = selected && submissions.data.find(row => row.id === selected.id);
  return <div className="space-y-4">
    <p>Submission status and recorded similarity scores are shown below. A similarity score does not establish plagiarism or AI use. A graded submission is not proof of moderation approval.</p>
    <p className="text-sm text-muted-foreground">Automatic sampling, evidence-pack generation and moderation decisions are not connected on this screen.</p>
    {loading ? <p role="status">Loading review queue…</p> : failed ? <div><p role="alert">The review queue could not be loaded completely.</p><Button onClick={() => {void submissions.refetch(); void assignments.refetch();}}>Retry review queue</Button></div> : <>
      <div className="flex flex-wrap gap-3">
        <label>Search submissions<input className="block border rounded p-2" value={search} onChange={e => {setSearch(e.target.value); setPage(0);}}/></label>
        <label>Submission status<select className="block border rounded p-2" value={status} onChange={e => {setStatus(e.target.value); setPage(0);}}><option value="all">All statuses</option>{[...new Set(submissions.data.map(row => row.status))].map(value => <option key={value}>{value}</option>)}</select></label>
      </div>
      <p>{rows.length} matching submissions</p>
      <div className="surface-card overflow-x-auto"><table className="w-full"><thead><tr><th>Student</th><th>Assignment</th><th>Recorded grade</th><th>Similarity</th><th>Status</th><th>Details</th></tr></thead><tbody>
        {rows.slice(page * 20, page * 20 + 20).map(row => <tr key={row.id} className="border-t"><td className="p-3">{row.student_name}</td><td>{assignments.data.find(a => a.id === row.assignment_id)?.title || 'Unknown assignment'}</td><td>{row.grade === null ? 'Not graded' : `${row.grade}%`}</td><td>{row.plagiarism_score === null ? 'Not available' : `${row.plagiarism_score}%`}</td><td>{row.status}</td><td><Button variant="outline" onClick={() => setSelected(row)} aria-label={`Review ${row.student_name}`}>Review</Button></td></tr>)}
      </tbody></table>{!rows.length && <p className="p-4">No matching submissions.</p>}</div>
      <div className="flex gap-2"><Button disabled={!page} onClick={() => setPage(p => p - 1)}>Previous submissions</Button><Button disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(p => p + 1)}>Next submissions</Button></div>
    </>}
    <Dialog open={!!review && !loading && !failed} onOpenChange={open => {if (!open) setSelected(null);}}><DialogContent><DialogHeader><DialogTitle>Submission review details</DialogTitle></DialogHeader>{review && <div className="space-y-2"><p>Student: {review.student_name}</p><p>Reference: {review.id}</p><p>Submitted: {new Date(review.submitted_at).toLocaleString()}</p><p>Status: {review.status}</p><p>Recorded feedback: {review.feedback || 'Not provided'}</p><p>Read-only review. No moderation decision or grade release is recorded here.</p></div>}</DialogContent></Dialog>
  </div>;
}
