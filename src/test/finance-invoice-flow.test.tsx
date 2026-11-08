import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import FinanceDashboard from '@/pages/finance/FinanceDashboard';

type Row = Record<string, unknown>;
const mock = vi.hoisted(() => ({
  user: {id: 'finance', tenantId: 'centre-a', role: 'finance_officer', roles: ['finance_officer']},
  authLoading: false, rows: [] as Row[], loading: false, error: null as string | null,
  refetch: vi.fn(), query: vi.fn(), invoke: vi.fn(), toast: vi.fn(), createUrl: vi.fn(), revokeUrl: vi.fn(),
  payment: null as null | {open: boolean; invoice: Row | null; onOpenChange: (value: boolean) => void},
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.authLoading})}));
vi.mock('@/hooks/useSupabaseQuery', () => ({useSupabaseQuery: (table: string, options: unknown) => {
  mock.query(table, options); return {data: mock.rows, loading: mock.loading, error: mock.error, refetch: mock.refetch};
}}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {functions: {invoke: (...args: unknown[]) => mock.invoke(...args)}}}));
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast: mock.toast})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({title, children, actions}: {title: string; children: ReactNode; actions?: ReactNode}) => <main><h1>{title}</h1>{actions}{children}</main>}));
vi.mock('@/components/modals/CreateInvoiceModal', () => ({default: () => null}));
vi.mock('@/components/modals/RecordPaymentModal', () => ({default: (props: NonNullable<typeof mock.payment>) => {
  mock.payment = props;
  return props.open ? <div role="dialog" aria-label="Payment mock"><button onClick={() => props.onOpenChange(false)}>Close payment mock</button></div> : null;
}}));
vi.mock('@/components/finance/ExpenseManagement', () => ({default: () => <p>Expense workspace</p>}));
vi.mock('@/components/finance/ReferralIncomeTracker', () => ({default: () => null}));
vi.mock('@/components/finance/UniversityCommissionLedger', () => ({default: () => null}));

const row = (id = 'invoice-a', changes: Row = {}): Row => ({
  id, tenant_id: 'centre-a', student_id: 'learner-a', student_name: 'Sara Ali', type: 'tuition',
  amount: 1000.5, paid: 100, sponsor_amount: 300, sponsor_paid: 50, status: 'partial', due_date: '2026-11-20',
  created_at: '2026-11-08T12:00:00Z', ...changes,
});
const mount = () => render(<MemoryRouter><FinanceDashboard/></MemoryRouter>);
const summary = (label: string) => screen.getByText(label, {selector: 'dt'}).parentElement;
function deferred() {
  let finish!: (value: unknown) => void;
  const promise = new Promise(resolve => {finish = resolve;});
  return {promise, finish};
}
beforeEach(() => {
  vi.clearAllMocks(); mock.rows = [row()]; mock.loading = false; mock.error = null; mock.authLoading = false; mock.payment = null;
  mock.user = {id: 'finance', tenantId: 'centre-a', role: 'finance_officer', roles: ['finance_officer']};
  mock.invoke.mockResolvedValue({data: 'student_name,amount\nSara Ali,1000.50', error: null});
  mock.createUrl.mockReturnValue('blob:synthetic-report');
  const OriginalURL = globalThis.URL;
  vi.stubGlobal('URL', class extends OriginalURL {static createObjectURL = mock.createUrl; static revokeObjectURL = mock.revokeUrl;});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe('finance invoice handoff', () => {
  it('requires a verified active finance membership and completed authentication', () => {
    mock.user.role = 'lecturer'; mock.user.roles = ['finance_officer', 'lecturer'];
    const view = mount(); expect(screen.getByRole('alert')).toHaveTextContent('verified finance');
    expect(mock.query).toHaveBeenLastCalledWith('invoices', expect.objectContaining({enabled: false}));
    mock.user.role = 'finance_officer'; mock.authLoading = true;
    view.rerender(<MemoryRouter><FinanceDashboard/></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Verifying');
    expect(screen.queryByRole('button', {name: 'New student invoice'})).toBeNull();
    expect(mock.query).toHaveBeenLastCalledWith('invoices', expect.objectContaining({enabled: false}));
  });
  it('scopes the read and passes the unmodified student/sponsor balance to the payment form', () => {
    mount();
    expect(mock.query).toHaveBeenCalledWith('invoices', expect.objectContaining({enabled: true, filters: [{column: 'tenant_id', operator: 'eq', value: 'centre-a'}]}));
    fireEvent.click(screen.getAllByRole('button', {name: /Record student payment for Sara Ali/})[0]);
    expect(mock.payment?.invoice).toMatchObject({id: 'invoice-a', amount: 1000.5, paid: 100, sponsor_amount: 300, sponsor_paid: 50, student_id: 'learner-a', status: 'partial'});
    expect(summary('Recorded payments')).toHaveTextContent('PKR 150.00');
  });
  it('keeps standalone platform-owner invoice access readable without unsupported write actions', () => {
    mock.user = {...mock.user, role: 'superadmin', roles: ['superadmin']};
    mount();
    expect(mock.query).toHaveBeenCalledWith('invoices', expect.objectContaining({enabled: true}));
    expect(summary('Student charges billed')).toHaveTextContent('PKR 1,000.50');
    expect(screen.getByRole('status')).toHaveTextContent('Platform Owner access alone does not grant those writes');
    expect(screen.getByRole('button', {name: 'New student invoice'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: /Record student payment for/})).toBeNull();
  });
  it.each(['finance_officer', 'centre_director'])('allows the existing platform-owner write path with verified %s membership', membership => {
    mock.user = {...mock.user, role: 'superadmin', roles: ['superadmin', membership]};
    mount();
    expect(screen.getByRole('button', {name: 'New student invoice'})).toBeEnabled();
    fireEvent.click(screen.getAllByRole('button', {name: /Record student payment for Sara Ali/})[0]);
    expect(mock.payment?.invoice).toMatchObject({id: 'invoice-a', student_id: 'learner-a'});
  });
  it('separates legacy commissions and refunded amounts from student charge totals', () => {
    mock.rows = [row(), row('commission', {type: 'commission', amount: 9000, paid: 500, sponsor_amount: 0, sponsor_paid: 0}), row('refund', {status: 'refunded', amount: 5000, paid: 5000, sponsor_amount: 0, sponsor_paid: 0})];
    mount();
    expect(summary('Student charges billed')).toHaveTextContent('PKR 1,000.50');
    expect(summary('Recorded payments')).toHaveTextContent('PKR 150.00');
    expect(summary('Recorded commission invoices')).toHaveTextContent('PKR 9,000.00');
    expect(screen.getAllByRole('button', {name: /Record student payment for/})).toHaveLength(2);
  });
  it('flags unlinked invoices without offering payment against a name alone', () => {
    mock.rows = [row('unlinked', {student_id: null})]; mount();
    expect(screen.getByRole('status')).toHaveTextContent('no linked account');
    expect(screen.queryByRole('button', {name: /Record student payment for/})).toBeNull();
  });
  it.each([
    {tenant_id: 'centre-b'}, {amount: Number.NaN}, {sponsor_amount: 1500}, {student_name: ''}, {status: 'unknown'},
  ])('fails closed on malformed or foreign records: %j', changes => {
    mock.rows = [row('invalid', changes)]; mount();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be verified');
    expect(screen.queryByLabelText('Recorded invoice summary')).toBeNull();
    expect(screen.getByRole('button', {name: 'New student invoice'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: /Record student payment for/})).toBeNull();
  });
  it('distinguishes a failed read from an empty list and retries', () => {
    mock.error = 'offline'; const view = mount();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('No invoices yet')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Retry invoices'})); expect(mock.refetch).toHaveBeenCalledOnce();
    mock.error = null; mock.rows = []; view.rerender(<MemoryRouter><FinanceDashboard/></MemoryRouter>);
    expect(screen.getByText('No invoices yet')).toBeInTheDocument();
  });
  it('paginates the loaded queue and searches all words beyond the current page', () => {
    mock.rows = Array.from({length: 21}, (_, index) => row('invoice-' + index, {student_name: index === 20 ? 'Zara Farah' : 'Learner ' + index}));
    mount(); expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', {name: 'Next invoices'})); expect(screen.getByRole('status')).toHaveTextContent('Page 2 of 2');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search by learner or invoice reference'), {target: {value: 'farah zara'}});
    expect(screen.getByRole('heading', {name: 'Invoices (1)'})).toBeInTheDocument();
    expect(screen.queryByText('Learner 0', {selector: 'h3'})).toBeNull();
    fireEvent.change(screen.getByLabelText('Invoice status'), {target: {value: 'paid'}});
    expect(screen.getByText('No invoices match these filters')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Show all invoices'}));
    expect(screen.getByRole('status')).toHaveTextContent('Page 1 of 2');
    expect(screen.getByLabelText('Search by learner or invoice reference')).toHaveFocus();
  });
  it('keeps a payment workspace mounted through invoice refresh', () => {
    const view = mount(); fireEvent.click(screen.getAllByRole('button', {name: /Record student payment for/})[0]);
    mock.loading = true; mock.rows = [];
    view.rerender(<MemoryRouter><FinanceDashboard/></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.getByRole('dialog', {name: 'Payment mock'})).toBeInTheDocument();
    expect(mock.payment?.invoice?.id).toBe('invoice-a');
  });
});

describe('scoped invoice report export', () => {
  it('states the server filter scope and blocks duplicate pending exports', async () => {
    const pending = deferred(); mock.invoke.mockReturnValue(pending.promise); mount();
    fireEvent.change(screen.getByLabelText('Invoice status'), {target: {value: 'partial'}});
    const button = screen.getByRole('button', {name: 'Export centre invoice report'});
    fireEvent.click(button); fireEvent.click(button);
    expect(mock.invoke).toHaveBeenCalledExactlyOnceWith('export-report', {body: {reportType: 'invoices', tenantId: 'centre-a', filters: {status: 'partial'}}});
    expect(screen.getByText(/export follows the status filter only/)).toBeInTheDocument();
    await act(async () => pending.finish({data: 'student_name,amount\nSara Ali,1000.50', error: null}));
    expect(mock.createUrl).toHaveBeenCalledOnce(); expect(mock.toast).toHaveBeenCalledOnce();
  });
  it('does not download a report after an active-role switch', async () => {
    const pending = deferred(); mock.invoke.mockReturnValue(pending.promise); const view = mount();
    fireEvent.click(screen.getByRole('button', {name: 'Export centre invoice report'}));
    mock.user = {...mock.user, role: 'lecturer', roles: ['finance_officer', 'lecturer']};
    view.rerender(<MemoryRouter><FinanceDashboard/></MemoryRouter>);
    await act(async () => pending.finish({data: 'student_name,amount\nPrivate learner,1000.50', error: null}));
    expect(mock.createUrl).not.toHaveBeenCalled(); expect(mock.toast).not.toHaveBeenCalled();
  });
  it('retains an explicit export error instead of announcing a download', async () => {
    mock.invoke.mockResolvedValue({data: {error: 'unavailable'}, error: null}); mount();
    fireEvent.click(screen.getByRole('button', {name: 'Export centre invoice report'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('verified CSV');
    expect(mock.createUrl).not.toHaveBeenCalled(); expect(mock.toast).not.toHaveBeenCalled();
  });
  it('does not offer a known truncated report for more than the service limit', () => {
    mock.rows = Array.from({length: 5001}, (_, index) => row('invoice-' + index)); mount();
    expect(screen.getByRole('button', {name: 'Export centre invoice report'})).toBeDisabled();
    expect(screen.getByText(/up to 5,000 invoices/)).toBeInTheDocument();
  });
});
