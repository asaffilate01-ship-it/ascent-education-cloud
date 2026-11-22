import {useEffect, useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import TuitionReports from '@/components/tuition/TuitionReports';
import {useAuth} from '@/contexts/AuthContext';
import {db} from '@/lib/db';
import {canUseTuitionReportsRole, tuitionReportsEnabled} from '@/lib/tuitionReports';

type Plan = {id: string; module_title: string; student_name: string};

function roster(value: unknown): Plan[] {
  if (!Array.isArray(value)) throw Error('Unverified tuition roster');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id ||
      seen.has(item.id) || typeof item.module_title !== 'string' || typeof item.student_name !== 'string') {
      throw Error('Unverified tuition roster');
    }
    seen.add(item.id);
    return {id: item.id, module_title: item.module_title, student_name: item.student_name};
  });
}

export default function DirectorTuitionProgress() {
  const {user, loading} = useAuth();
  if (!tuitionReportsEnabled()) return <DashboardLayout title="Tuition progress"><p>Tuition session reports are not available yet.</p></DashboardLayout>;
  if (loading || !user?.tenantId || !canUseTuitionReportsRole(user, 'centre_director')) {
    return <DashboardLayout title="Tuition progress"><p role="status">{loading ? 'Checking centre access…' : 'A verified Centre Director account with an unambiguous centre role is required.'}</p></DashboardLayout>;
  }
  return <DirectorWorkspace key={JSON.stringify([user.id, user.tenantId, user.role, user.roles])}/>;
}

function DirectorWorkspace() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refresh, setRefresh] = useState(0);
  const reload = () => {setState('loading'); setPlans([]); setRefresh(value => value + 1);};
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await db.rpc('get_unipathway_tuition_director_roster');
        if (!active) return;
        if (result.error) throw result.error;
        const rows = roster(result.data);
        setPlans(rows);
        setSelected(previous => rows.some(p => p.id === previous) ? previous : '');
        setState('ready');
      } catch {
        if (active) {setPlans([]); setState('error');}
      }
    })();
    return () => {active = false;};
  }, [refresh]);

  return <DashboardLayout title="Tuition progress" subtitle="Read-only review of session reports for your centre">
    <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Review progress and tutor handoffs for active learning plans. Official assessment and grades are separate.</p>
    <Button type="button" variant="outline" disabled={state === 'loading'} onClick={reload}>
      {state === 'error' ? 'Retry loading learning plans' : 'Refresh learning plans'}
    </Button>
    {state === 'loading' && <p role="status" className="my-3 text-sm">Checking centre learning plans…</p>}
    {state === 'error' && <p role="alert" className="my-3 text-sm text-destructive">Learning plans could not be verified. Please retry.</p>}
    {state === 'ready' && (plans.length ? <label className="my-4 block text-sm font-medium">Learning plan
      <select className="mt-1 block min-h-11 w-full rounded-md border bg-background p-2 text-base" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">Choose a learning plan</option>
        {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.module_title} · {plan.student_name}</option>)}
      </select>
    </label> : <p className="my-4 text-sm">No active learning plans were found in this centre.</p>)}
    {state === 'ready' && plans.some(plan => plan.id === selected) && <TuitionReports plan={selected} view="director"/>}
  </DashboardLayout>;
}
