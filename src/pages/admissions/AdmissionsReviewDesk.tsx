import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/contexts/AuthContext';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import AdmissionsJourney from '@/components/admissions/AdmissionsJourney';
import {admissionsPath} from '@/lib/admissionsNavigation';

const content = {
  documents: {
    label: 'Documents',
    title: 'Document and identity verification',
    description: 'Inspect matching KYC document statuses and signed records. Verification must be performed by an authorised officer, not inferred from an upload.',
  },
  eligibility: {
    label: 'Eligibility',
    title: 'Programme and entry eligibility',
    description: 'Verify the exact programme, admission requirements, awarding-body scope and recorded evidence before an unconditional offer.',
  },
  offers: {
    label: 'Offers',
    title: 'Offers, acceptance and finance',
    description: 'Track offers and student acceptance. An application pipeline stage or invoice balance is not legal acceptance or a funding decision.',
  },
  allocations: {
    label: 'Allocations',
    title: 'Enrolment, modules and scheduling',
    description: 'Check the confirmed handover, programme-linked modules, lecturer allocations, schedules and learner ID-card requirements.',
  },
} as const;

export default function AdmissionsReviewDesk() {
  const {user} = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [choosingApplicant, setChoosingApplicant] = useState(false);
  const applicantHeading = useRef<HTMLHeadingElement>(null);
  const applicantSearch = useRef<HTMLInputElement>(null);
  const focusApplicant = useRef(false);
  const search = params.get('reviewSearch') || '';
  const kind = location.pathname.endsWith('/documents') ? 'documents'
    : location.pathname.endsWith('/eligibility') ? 'eligibility'
      : location.pathname.endsWith('/offers') ? 'offers' : 'allocations';
  const spec = content[kind];
  const authorised = !!user?.id && !!user.tenantId && ['admissions_admin', 'centre_director'].includes(user.role) && user.roles?.includes(user.role);
  const scoped = useSupabaseQuery('applications', {
    enabled: authorised,
    filters: user?.tenantId ? [{column: 'tenant_id', operator: 'eq', value: user.tenantId}] : [],
    orderBy: {column: 'updated_at', ascending: false},
  });
  const apps = scoped.data.filter(a => a.tenant_id === user?.tenantId);
  const term = search.trim().toLowerCase();
  const filtered = apps.filter(a => !term || [a.student_name, a.email, a.programme_name || '', a.stage.replace(/_/g, ' ')].some(v => v.toLowerCase().includes(term)));
  const ready = authorised && !scoped.loading && !scoped.error;
  const selected = ready ? apps.find(a => a.id === params.get('application')) : undefined;
  const applicationContext = selected?.id ?? (ready ? null : params.get('application'));
  const showPicker = !selected || choosingApplicant;
  useEffect(() => {
    if (selected && focusApplicant.current) {
      applicantHeading.current?.focus();
      focusApplicant.current = false;
    }
  }, [selected, showPicker]);
  const pipeline = user?.role === 'centre_director' ? '/director/admissions' : '/admissions';
  const updateParam = (key: 'application' | 'reviewSearch', value: string) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, {replace: true});
  };

  return <DashboardLayout title={spec.title} subtitle={spec.description}>
    <div className="space-y-5">
      {!authorised ? <p role="alert" className="rounded-xl border p-5">A verified Admissions Admin or Centre Director role and a centre assignment are required.</p> : <>
        <Button asChild variant="outline">
          <Link to={admissionsPath(pipeline, params.toString())}>Back to pipeline</Link>
        </Button>
        <section className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold">One application, nine evidence checks</h2>
          <p className="text-sm text-muted-foreground">These workflows show actual recorded source evidence, not automatically awarded qualifications, reviewed finance, payment settlement or issued ID cards. The final enrolment action must be confirmed by the authorised server transaction.</p>
          <nav className="flex flex-wrap gap-2" aria-label="Application review sections">
            {Object.entries(content).map(([key, section]) => <Link
              key={key}
              to={admissionsPath(`/admissions/${key}`, params.toString(), applicationContext)}
              aria-current={kind === key ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${kind === key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >{section.label}</Link>)}
          </nav>
        </section>

        {scoped.loading && <p role="status">Verifying assigned-centre applications…</p>}
        {scoped.error && <p role="alert">Applications could not be loaded. No source decisions are available. <Button variant="outline" onClick={() => void scoped.refetch()}>Retry</Button></p>}
        {selected && <section className="rounded-xl border bg-card p-4 sm:p-5" aria-label="Selected applicant">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 break-words">
              <p className="text-sm text-muted-foreground">Selected applicant</p>
              <h2 ref={applicantHeading} tabIndex={-1} className="mt-1 text-xl font-semibold">{selected.student_name}</h2>
              <p className="mt-1 text-sm">{selected.programme_name || 'Programme not assigned'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{selected.email}</p>
              <p className="mt-2 text-sm">Current stage: <span className="font-medium">{selected.stage.replace(/_/g, ' ')}</span></p>
            </div>
            <Button variant="outline" className="w-full whitespace-normal sm:w-auto" aria-expanded={showPicker} aria-controls="admissions-applicant-picker" onClick={() => setChoosingApplicant(value => !value)}>
              {showPicker ? 'Hide applicant list' : 'Change applicant'}
            </Button>
          </div>
        </section>}

        {ready && !selected && params.has('application') && <p role="status" className="rounded-xl border p-4">This application is not available in your assigned centre. Choose an application below.</p>}
        {ready && showPicker && <section id="admissions-applicant-picker" className="rounded-xl border bg-card p-4 sm:p-5 space-y-3" aria-label="Choose an applicant">
          <h2 className="font-semibold">Select an application</h2>
          <label className="block max-w-md text-sm">Find student, programme or current stage
            <Input ref={applicantSearch} value={search} onChange={event => updateParam('reviewSearch', event.target.value)} className="mt-1 min-h-11" maxLength={120}/>
          </label>
          <p role="status" className="text-sm text-muted-foreground">{filtered.length} of {apps.length} centre applications</p>
          <div className="grid max-h-80 gap-2 overflow-y-auto lg:grid-cols-2">
            {filtered.map(a => <Button
              key={a.id}
              variant={selected?.id === a.id ? 'default' : 'outline'}
              aria-pressed={selected?.id === a.id}
              className="h-auto min-h-11 flex-col items-start whitespace-normal break-words py-3 text-left"
              onClick={() => {focusApplicant.current = true; updateParam('application', a.id); setChoosingApplicant(false);}}
            >
              <span className="font-semibold">{a.student_name}</span>
              <span className="text-sm">{a.programme_name || 'Programme not assigned'} · {a.stage.replace(/_/g, ' ')}</span>
            </Button>)}
            {!filtered.length && <p className="text-sm text-muted-foreground">{apps.length ? 'No applications match this search. Try another student, programme or stage.' : 'No applications are available for your assigned centre.'}</p>}
          </div>
          {search && <Button variant="outline" onClick={() => {updateParam('reviewSearch', ''); applicantSearch.current?.focus();}}>Clear applicant search</Button>}
        </section>}
        {selected && <AdmissionsJourney key={[user?.id, user?.role, user?.tenantId, selected.id].join(':')} application={selected}/>}
        {ready && !selected && <p role="status">Choose an applicant above to inspect identity, funding, offer, enrolment and allocation evidence.</p>}
      </>}
    </div>
  </DashboardLayout>;
}
