import type {ReactNode} from 'react';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AdmissionsCRM from '@/pages/admissions/AdmissionsCRM';
import AdmissionsReviewDesk from '@/pages/admissions/AdmissionsReviewDesk';
import {admissionReadiness} from '@/components/admissions/AdmissionsJourney';
import {admissionsPath} from '@/lib/admissionsNavigation';

const mocks = vi.hoisted(() => ({
  user: {id: 'officer', tenantId: 'centre-a', role: 'admissions_admin', roles: ['admissions_admin']} as {id: string; tenantId?: string; role: string; roles: string[]} | null,
  rows: [] as Array<Record<string, unknown>>,
  loading: false,
  error: null as string | null,
  query: vi.fn(),
  refetch: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mocks.user})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: (table: string, options: unknown) => {
  mocks.query(table, options);
  return {data: mocks.rows, loading: mocks.loading, error: mocks.error, refetch: mocks.refetch};
}}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children, title, actions}: {children: ReactNode; title: string; actions?: ReactNode}) => <main><h1>{title}</h1>{actions}{children}</main>}));
vi.mock('@/components/admissions/AdmissionHandover', () => ({default: () => <section aria-label="Academic handover"/>}));
vi.mock('@/components/admissions/ServiceActivationQueue', () => ({default: () => null}));
vi.mock('@/components/admissions/KanbanBoard', () => ({default: () => <div>Kanban board</div>}));
vi.mock('@/components/modals/AddLeadModal', () => ({default: () => null}));
vi.mock('@/lib/db', () => ({db: {from: mocks.from}}));

const application = (id: string, student_name: string, stage = 'applied', tenant_id = 'centre-a') => ({
  id, student_name, stage, tenant_id,
  email: `${id}@example.invalid`, programme_name: 'Business programme', programme_id: null,
  user_id: null, intake: null, document_checklist: null, counsellor: null,
  source: 'ielts_preparation', destination: 'pakistan', updated_at: '2026-11-01T09:00:00Z',
});

function CurrentAddress() {
  const location = useLocation();
  return <output aria-label="Current address">{location.pathname}{location.search}</output>;
}

function mount(address: string) {
  return render(<MemoryRouter initialEntries={[address]} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
    <CurrentAddress/>
    <Routes>
      {['/admissions', '/admissions/applications', '/director/admissions'].map(path => <Route key={path} path={path} element={<AdmissionsCRM/>}/>)}
      {['/admissions/documents', '/admissions/eligibility', '/admissions/offers', '/admissions/allocations', '/director/allocations'].map(path => <Route key={path} path={path} element={<AdmissionsReviewDesk/>}/>)}
    </Routes>
  </MemoryRouter>);
}

const urlOf = (element: HTMLElement) => new URL(element.getAttribute('href')!, 'https://example.invalid');
const currentUrl = () => new URL(screen.getByLabelText('Current address').textContent!, 'https://example.invalid');
const selectedApplicant = () => within(screen.getByRole('region', {name: 'Selected applicant'}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = {id: 'officer', tenantId: 'centre-a', role: 'admissions_admin', roles: ['admissions_admin']};
  mocks.rows = [application('app-a', 'Aisha Khan', 'conditional_offer'), application('app-b', 'Usman Ali', 'under_review')];
  mocks.loading = false;
  mocks.error = null;
});
afterEach(cleanup);

describe('Admissions record navigation', () => {
  it('opens the exact application from mobile and desktop actions for each pipeline stage', () => {
    const expected = [
      ['lead', 'documents', 'Review documents'],
      ['contacted', 'documents', 'Review documents'],
      ['applied', 'documents', 'Review documents'],
      ['qualified', 'eligibility', 'Review eligibility'],
      ['under_review', 'eligibility', 'Review eligibility'],
      ['conditional_offer', 'offers', 'Review offer'],
      ['unconditional_offer', 'offers', 'Review offer'],
      ['deposit_paid', 'offers', 'Review offer'],
      ['enrolled', 'allocations', 'Review allocation'],
      ['lost', 'documents', 'Review application'],
      ['deferred', 'documents', 'Review application'],
    ];
    mocks.rows = expected.map(([stage], index) => application(`app-${index}`, `Applicant ${index}`, stage));
    mount('/admissions');
    const mobile = within(screen.getByRole('region', {name: 'Application task cards'}));
    const desktop = within(screen.getByRole('table'));
    expected.forEach(([, section, label], index) => {
      for (const surface of [mobile, desktop]) {
        const link = surface.getByRole('link', {name: `${label} for Applicant ${index}`});
        expect(urlOf(link).pathname).toBe(`/admissions/${section}`);
        expect(urlOf(link).searchParams.get('application')).toBe(`app-${index}`);
      }
    });
    expect(mocks.query).toHaveBeenCalledWith('applications', expect.objectContaining({enabled: true, filters: [{column: 'tenant_id', operator: 'eq', value: 'centre-a'}]}));
  });

  it('keeps the selected applicant across all four sections and restores pipeline filters', async () => {
    mount('/admissions?q=Aisha&stage=conditional_offer&source=ielts&destination=pakistan');
    const cards = within(screen.getByRole('region', {name: 'Application task cards'}));
    fireEvent.click(cards.getByRole('link', {name: 'Review offer for Aisha Khan'}));
    expect(selectedApplicant().getByRole('heading', {name: 'Aisha Khan'})).toBeInTheDocument();
    expect(selectedApplicant().getByText('Business programme')).toBeInTheDocument();
    expect(selectedApplicant().getByText('app-a@example.invalid')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'One application, nine evidence checks'})).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Choose an applicant'})).not.toBeInTheDocument();
    await screen.findByRole('link', {name: 'Open related workflow: Offer review and acceptance'});

    for (const section of ['Documents', 'Eligibility', 'Offers', 'Allocations']) {
      const nav = within(screen.getByRole('navigation', {name: 'Application review sections'}));
      fireEvent.click(nav.getByRole('link', {name: section}));
      expect(nav.getByRole('link', {name: section})).toHaveAttribute('aria-current', 'page');
      expect(currentUrl().searchParams.get('application')).toBe('app-a');
      expect(currentUrl().searchParams.get('q')).toBe('Aisha');
      expect(selectedApplicant().getByRole('heading', {name: 'Aisha Khan'})).toBeInTheDocument();
    }
    const back = screen.getByRole('link', {name: 'Back to pipeline'});
    expect(urlOf(back).searchParams.has('application')).toBe(false);
    fireEvent.click(back);
    expect(screen.getByRole('textbox', {name: 'Search applications'})).toHaveValue('Aisha');
    expect(screen.getByRole('combobox', {name: 'Filter by application stage'})).toHaveTextContent('Conditional');
    expect(screen.getByRole('combobox', {name: 'Filter by lead source'})).toHaveTextContent('IELTS enquiries');
    expect(screen.getByRole('combobox', {name: 'Filter by study destination'})).toHaveTextContent('Pakistan');
    expect(screen.queryByRole('link', {name: 'Review eligibility for Usman Ali'})).not.toBeInTheDocument();
  });

  it('preserves a separate applicant search when changing the selected record and section', async () => {
    mount('/admissions/documents?application=app-a&q=Business&stage=applied');
    fireEvent.click(screen.getByRole('button', {name: 'Change applicant'}));
    fireEvent.change(screen.getByRole('textbox', {name: 'Find student, programme or current stage'}), {target: {value: 'Usman'}});
    expect(currentUrl().searchParams.get('application')).toBe('app-a');
    fireEvent.click(screen.getByRole('button', {name: /Usman Ali Business programme/}));
    expect(selectedApplicant().getByRole('heading', {name: 'Usman Ali'})).toBeInTheDocument();
    expect(selectedApplicant().getByRole('heading', {name: 'Usman Ali'})).toHaveFocus();
    expect(currentUrl().searchParams.get('q')).toBe('Business');
    expect(currentUrl().searchParams.get('stage')).toBe('applied');
    expect(currentUrl().searchParams.get('reviewSearch')).toBe('Usman');
    fireEvent.click(screen.getByRole('link', {name: 'Eligibility'}));
    expect(currentUrl().searchParams.get('application')).toBe('app-b');
    fireEvent.click(screen.getByRole('button', {name: 'Change applicant'}));
    expect(screen.getByRole('textbox', {name: 'Find student, programme or current stage'})).toHaveValue('Usman');
    await waitFor(() => expect(screen.getByRole('button', {name: 'Recheck source records'})).toBeEnabled());
  });

  it('adds record context to supported journey links without sending IDs to unrelated workflows', async () => {
    mount('/admissions/offers?application=app-a&q=Business&source=ielts&reviewSearch=Aisha');
    const eligibility = await screen.findByRole('link', {name: 'Open related workflow: Entry and awarding-body eligibility'});
    expect(urlOf(eligibility).searchParams.get('application')).toBe('app-a');
    expect(urlOf(eligibility).searchParams.get('reviewSearch')).toBe('Aisha');
    expect(urlOf(screen.getByRole('link', {name: 'Open related workflow: Offer review and acceptance'})).searchParams.get('application')).toBe('app-a');
    for (const label of ['Identity and academic evidence', 'Funding, fee schedule and payment', 'Correct modules and lecturer allocation', 'Intake dates, sessions and invitations', 'Student ID card and document issuance']) {
      expect(urlOf(screen.getByRole('link', {name: `Open related workflow: ${label}`})).search).toBe('');
    }
    const handover = urlOf(screen.getByRole('link', {name: 'Open related workflow: Academic enrolment'}));
    expect(handover.searchParams.get('q')).toBe('Business');
    expect(handover.searchParams.has('application')).toBe(false);
    expect(handover.searchParams.has('reviewSearch')).toBe(false);
    expect(admissionsPath('/director/allocations', '?application=app-a')).toBe('/director/allocations?application=app-a');
  });

  it('keeps list search and view in the URL for refresh and return navigation', () => {
    mount('/admissions');
    fireEvent.change(screen.getByRole('textbox', {name: 'Search applications'}), {target: {value: 'Aisha'}});
    expect(currentUrl().searchParams.get('q')).toBe('Aisha');
    fireEvent.click(screen.getByRole('button', {name: 'Kanban view'}));
    expect(currentUrl().searchParams.get('view')).toBe('kanban');
    expect(screen.getByRole('button', {name: 'Kanban view'})).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'Table view'}));
    expect(currentUrl().searchParams.has('view')).toBe(false);
    expect(screen.getByRole('button', {name: 'Table view'})).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Admissions selection boundaries', () => {
  for (const user of [
    {id: 'officer', role: 'admissions_admin', roles: ['admissions_admin']},
    {id: 'officer', tenantId: 'centre-a', role: 'student', roles: ['student', 'admissions_admin']},
    {id: 'officer', tenantId: 'centre-a', role: 'admissions_admin', roles: ['student']},
    null,
  ]) it(`does not expose applicant details for an unassigned or denied session: ${JSON.stringify(user)}`, () => {
    mocks.user = user;
    mount('/admissions/documents?application=app-a');
    expect(screen.getByRole('alert')).toHaveTextContent('A verified Admissions Admin or Centre Director role and a centre assignment are required.');
    expect(screen.queryByText('Aisha Khan')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', {name: 'Application review sections'})).not.toBeInTheDocument();
    expect(mocks.query).toHaveBeenCalledWith('applications', expect.objectContaining({enabled: false}));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('does not disclose an application from another centre or propagate its ID after a complete read', () => {
    mocks.rows.push(application('foreign-app', 'Foreign applicant', 'applied', 'centre-b'));
    mount('/admissions/documents?application=foreign-app');
    expect(screen.getByText('This application is not available in your assigned centre. Choose an application below.')).toBeInTheDocument();
    expect(screen.queryByText('Foreign applicant')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Selected applicant'})).not.toBeInTheDocument();
    for (const link of within(screen.getByRole('navigation', {name: 'Application review sections'})).getAllByRole('link')) {
      expect(urlOf(link).searchParams.has('application')).toBe(false);
    }
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each(['loading', 'error'])('withholds stale applicant details during a %s state and retains the requested selection for recovery', state => {
    mocks.loading = state === 'loading';
    mocks.error = state === 'error' ? 'Read failed' : null;
    mount('/admissions/documents?application=app-a');
    expect(screen.queryByRole('region', {name: 'Selected applicant'})).not.toBeInTheDocument();
    expect(screen.queryByText('Aisha Khan')).not.toBeInTheDocument();
    expect(urlOf(screen.getByRole('link', {name: 'Offers'})).searchParams.get('application')).toBe('app-a');
    expect(mocks.from).not.toHaveBeenCalled();
    if (state === 'error') {
      fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
      expect(mocks.refetch).toHaveBeenCalledOnce();
    }
  });

  it('leaves nine evidence checks and exact academic handover requirements intact', () => {
    const app = {...application('app-a', 'Aisha Khan', 'deposit_paid'), programme_id: 'programme-a'};
    const evidence = {kyc: [], signatures: [], modules: [], lectures: [], enrolments: [{id: 'other', status: 'active', application_id: 'other-application', programme_id: 'programme-a'}], invoices: [{id: 'invoice', amount: 100, paid: 100, status: 'paid', sponsor_amount: null, sponsor_paid: null, sponsor_reference: null}]};
    const checks = admissionReadiness(app, evidence);
    expect(checks).toHaveLength(9);
    expect(checks.find(check => check.key === 'enrolment')?.status).toBe('review');
    expect(checks.find(check => check.key === 'funding')?.detail).toContain('do not prove funding approval or payment settlement');
    expect(checks.find(check => check.key === 'offer')?.status).toBe('review');
  });
});
