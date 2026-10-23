import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {workflowRows} from '@/lib/workflowRows';
import {Button} from '@/components/ui/button';

type Cohort = {id: string; course_id: string; cohort_reference: string};
type Kind = 'student' | 'cohort' | 'executive';
const functions = {student: 'omniqora-student-intelligence', cohort: 'omniqora-cohort-intelligence', executive: 'omniqora-executive-snapshot'};
const fallback = 'Calculation could not be confirmed. Reload the records before retrying; a snapshot may already have been saved.';

async function calculationError(error: unknown) {
  const status = (error as {context?: {status?: number}})?.context?.status;
  if (status === 422) return 'No recorded attendance is available. Record and verify attendance before calculating this learner’s signal.';
  if (status === 401 || status === 403) return 'Calculation access denied. Check your signed-in account and centre assignment.';
  if (status === 404) return 'The learner or cohort is unavailable. Reload the choices and check the deployed function.';
  if (status === 429) return 'Too many calculations. Wait a minute before trying again.';
  return fallback;
}

export default function IntelligenceCalculations({tenant, onCalculated}: {tenant: string; onCalculated: () => void}) {
  const [learners, setLearners] = useState<string[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [student, setStudent] = useState(''), [cohortId, setCohortId] = useState('');
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<Kind | null>(null), [message, setMessage] = useState(''), [error, setError] = useState('');
  const generation = useRef(0), operation = useRef(0), processing = useRef(false);
  const load = useCallback(async () => {
    const token = ++generation.current;
    const current = () => token === generation.current;
    setLoading(true); setLoadError(''); setLearners([]); setCohorts([]); setStudent(''); setCohortId('');
    const [programmes, courses, groups] = await Promise.all([
      workflowRows(supabase, 'student_enrolments', tenant, current, 'id,student_id,status', 'id'),
      workflowRows(supabase, 'course_enrolment_requests', tenant, current, 'id,student_id,status', 'id'),
      workflowRows(supabase, 'course_cohorts', tenant, current, 'id,course_id,cohort_reference', 'id'),
    ]);
    if (!current()) return;
    if (programmes.error || courses.error || groups.error) setLoadError('Calculation choices could not be loaded. Check centre access and retry.');
    else {
      setLearners([...new Set([...programmes.data.filter(r => r.status === 'active'), ...courses.data.filter(r => r.status === 'enrolled')].map(r => r.student_id).filter((id): id is string => typeof id === 'string'))].sort());
      setCohorts(groups.data as Cohort[]);
    }
    setLoading(false);
  }, [tenant]);
  useEffect(() => {
    const reads = generation, calculations = operation;
    void load();
    return () => {reads.current++; calculations.current++;};
  }, [load]);

  async function calculate(kind: Kind) {
    if (processing.current || loading || loadError) return;
    const cohort = cohorts.find(c => c.id === cohortId);
    if ((kind === 'student' && !learners.includes(student)) || (kind === 'cohort' && !cohort)) return;
    const body = kind === 'student' ? {student_id: student} : kind === 'cohort' ? {course_id: cohort!.course_id, cohort_reference: cohort!.cohort_reference} : {};
    const token = ++operation.current;
    const current = () => token === operation.current;
    processing.current = true; setBusy(kind); setError(''); setMessage('');
    try {
      const {data, error: invokeError} = await supabase.functions.invoke(functions[kind], {body});
      if (!current()) return;
      if (invokeError) throw new Error(await calculationError(invokeError));
      const row = data?.[kind === 'student' ? 'intelligence' : kind === 'cohort' ? 'cohort' : 'snapshot'];
      const date = kind === 'executive' ? row?.snapshot_date : row?.calculated_at;
      if (!row || typeof row.id !== 'string' || row.tenant_id !== tenant || typeof date !== 'string' || !Number.isFinite(Date.parse(date)) ||
          (kind === 'student' && row.student_id !== student) ||
          (kind === 'cohort' && (row.course_id !== cohort?.course_id || row.cohort_reference !== cohort?.cohort_reference))) throw new Error(fallback);
      setMessage('Snapshot saved. Records are being reloaded. Review the calculation date and evidence before taking action.');
      onCalculated();
    } catch (e) {if (current()) setError(e instanceof Error ? e.message : fallback);}
    finally {if (current()) {processing.current = false; setBusy(null);}}
  }

  return <section className="surface-card p-4 space-y-4 mb-4" aria-label="Calculate intelligence">
    <h2 className="font-semibold">Calculate recorded signals</h2>
    <p className="text-sm text-muted-foreground">Learner calculations use recorded attendance only. Cohort and centre summaries use existing learner signals; they do not recalculate every learner. Missing metrics remain unavailable and all signals require staff review.</p>
    {loading ? <p role="status">Loading calculation choices…</p> : loadError ? <div><p role="alert">{loadError}</p><Button onClick={() => void load()}>Retry calculation choices</Button></div> : <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">Enrolled learner<select className="border rounded p-2 max-w-full" value={student} disabled={!!busy} onChange={e => setStudent(e.target.value)}><option value="">Select learner</option>{learners.map(id => <option key={id} value={id}>{id}</option>)}</select></label>
        <Button disabled={!!busy || !student} onClick={() => void calculate('student')}>Calculate learner signal</Button>
      </div>
      {!learners.length && <p>No active enrolled learners are available.</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">Course cohort<select className="border rounded p-2 max-w-full" value={cohortId} disabled={!!busy} onChange={e => setCohortId(e.target.value)}><option value="">Select cohort</option>{cohorts.map(c => <option key={c.id} value={c.id}>{c.cohort_reference}</option>)}</select></label>
        <Button disabled={!!busy || !cohortId} onClick={() => void calculate('cohort')}>Calculate cohort signals</Button>
      </div>
      {!cohorts.length && <p>No course cohorts are available.</p>}
      <div className="flex flex-wrap gap-3"><Button disabled={!!busy} onClick={() => void calculate('executive')}>Calculate centre summary</Button><Button variant="outline" disabled={!!busy} onClick={() => void load()}>Reload calculation choices</Button></div>
    </>}
    {busy && <p role="status">Calculating {busy} snapshot…</p>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
