import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import CreateInvoiceModal from '@/components/modals/CreateInvoiceModal';
import {
  confirmedInvoiceReceipt, invoiceAmountInPaise, reviewInvoice, validInvoiceDate,
  type InvoiceForm, type ReviewedInvoice,
} from '@/lib/finance/invoiceCreation';

type Reply = {data: unknown; error: null | {message: string}};
type Query = {table: string; columns: string; filters: Array<[string, unknown]>; from: number; to: number; single: boolean; payload?: Record<string, unknown>};
const mock = vi.hoisted(() => ({
  user: {id: '10000000-0000-4000-8000-000000000001', tenantId: '20000000-0000-4000-8000-000000000001', role: 'finance_officer', roles: ['finance_officer']} as {id: string; tenantId?: string; role: string; roles: string[]} | null,
  authLoading: false,
  profiles: [] as Record<string, unknown>[],
  lookupFailure: false,
  lookupGate: null as Promise<Reply> | null,
  lookupPage: vi.fn(),
  profileCheck: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  readInvoice: vi.fn(),
  toast: vi.fn(),
  closed: vi.fn(),
  created: vi.fn(),
  queries: [] as Query[],
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.authLoading})}));
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast: mock.toast})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {
  rpc: mock.rpc,
  from: (table: string) => {
    const details: Query = {table, columns: '', filters: [], from: 0, to: Infinity, single: false};
    const run = async (): Promise<Reply> => {
      mock.queries.push({...details, filters: [...details.filters]});
      if (details.payload) return mock.insert(details.payload);
      if (table === 'invoices') return mock.readInvoice(details);
      if (table !== 'profiles') throw Error('Unexpected table: ' + table);
      if (details.single) {
        const override = mock.profileCheck(details);
        if (override !== undefined) return override;
      } else {
        const override = mock.lookupPage(details);
        if (override !== undefined) return override;
        if (mock.lookupGate) return mock.lookupGate;
        if (mock.lookupFailure) return {data: null, error: {message: 'Lookup interrupted'}};
      }
      const rows = mock.profiles.filter(row => details.filters.every(([key, value]) => row[key] === value));
      return {data: details.single ? rows[0] || null : rows.slice(details.from, details.to + 1), error: null};
    };
    const query = {
      select: (columns: string) => {details.columns = columns; return query;},
      eq: (column: string, value: unknown) => {details.filters.push([column, value]); return query;},
      order: () => query,
      range: (from: number, to: number) => {details.from = from; details.to = to; return query;},
      insert: (payload: Record<string, unknown>) => {details.payload = structuredClone(payload); return query;},
      maybeSingle: () => {details.single = true; return query;},
      then: (resolve: (result: Reply) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return query;
  },
}}));

const TENANT = '20000000-0000-4000-8000-000000000001';
const STUDENT = '30000000-0000-4000-8000-000000000001';
const OTHER = '30000000-0000-4000-8000-000000000002';
const INVOICE = '40000000-0000-4000-8000-000000000001';
const account = (id = STUDENT, name = 'Same Student') => ({user_id: id, full_name: name, tenant_id: TENANT});
function deferred<T>() {let resolve!: (value: T) => void; const promise = new Promise<T>(done => {resolve = done;}); return {promise, resolve};}
const props = (open = true) => ({open, onOpenChange: mock.closed, onCreated: mock.created});
const show = (open = true) => render(<CreateInvoiceModal {...props(open)}/>);

beforeEach(() => {
  mock.user = {id: '10000000-0000-4000-8000-000000000001', tenantId: TENANT, role: 'finance_officer', roles: ['finance_officer']};
  mock.authLoading = false; mock.profiles = [account(), account(OTHER)];
  mock.lookupFailure = false; mock.lookupGate = null; mock.queries = [];
  mock.profileCheck.mockReset(); mock.lookupPage.mockReset(); mock.rpc.mockReset().mockResolvedValue({data: true, error: null});
  mock.insert.mockReset().mockImplementation(async (payload: Record<string, unknown>) => ({data: {...payload}, error: null}));
  mock.readInvoice.mockReset().mockResolvedValue({data: null, error: null});
  mock.toast.mockReset(); mock.closed.mockReset(); mock.created.mockReset();
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(INVOICE);
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

async function chooseStudent(id = STUDENT) {
  await waitFor(() => expect(screen.getByLabelText('Student account')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Student account'), {target: {value: id}});
  await screen.findByText(/Student account verified:/);
}
async function prepare() {
  await chooseStudent();
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: '1250.50'}});
  fireEvent.change(screen.getByLabelText('Instalments'), {target: {value: '2'}});
  fireEvent.change(screen.getByLabelText('Due date (optional)'), {target: {value: '2026-12-10'}});
  fireEvent.click(screen.getByRole('button', {name: 'Review invoice'}));
  await screen.findByRole('heading', {name: 'Review student invoice'});
}
async function uncertainInvoice() {
  mock.insert.mockResolvedValue({data: null, error: null});
  const view = show(); await prepare();
  fireEvent.click(screen.getByRole('button', {name: 'Create reviewed invoice'}));
  await screen.findByText(/returned no matching receipt/);
  return view;
}

it('uses only scoped profile fields, distinguishes duplicate names by account reference and reviews before creating', async () => {
  show(); await waitFor(() => expect(screen.getByLabelText('Student account')).toBeEnabled());
  expect(screen.getByRole('option', {name: 'Same Student — ' + STUDENT})).toBeInTheDocument();
  expect(screen.getByRole('option', {name: 'Same Student — ' + OTHER})).toBeInTheDocument();
  expect(screen.queryByRole('option', {name: /commission/i})).toBeNull();
  expect(screen.getByText(/Commission records are managed under University Referrals/)).toBeInTheDocument();
  await chooseStudent(OTHER);
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: '42.75'}});
  fireEvent.click(screen.getByRole('button', {name: 'Review invoice'}));
  const review = await screen.findByRole('region', {name: 'Reviewed student invoice'});
  expect(within(review).getByText(OTHER)).toBeInTheDocument();
  expect(within(review).getByText(/42.75/)).toBeInTheDocument();
  expect(mock.insert).not.toHaveBeenCalled();
  expect(mock.rpc).toHaveBeenCalledWith('has_role', {_user_id: OTHER, _role: 'student'});
  expect(mock.queries.filter(query => query.table === 'profiles').every(query => query.columns === 'user_id,full_name,tenant_id' && query.filters.some(([key, value]) => key === 'tenant_id' && value === TENANT))).toBe(true);
  expect(mock.queries.some(query => ['student_enrolments', 'user_roles'].includes(query.table))).toBe(false);
});

it('creates a charge only after a matching receipt with student id, centre, exact amount and reviewed terms', async () => {
  show(); await prepare();
  fireEvent.click(screen.getByRole('button', {name: 'Create reviewed invoice'}));
  await waitFor(() => expect(mock.created).toHaveBeenCalledTimes(1));
  expect(mock.insert).toHaveBeenCalledExactlyOnceWith({
    id: INVOICE, tenant_id: TENANT, student_id: STUDENT, student_name: 'Same Student',
    type: 'tuition', amount: 1250.5, instalments: 2, due_date: '2026-12-10',
  });
  expect(mock.closed).toHaveBeenCalledWith(false);
  expect(mock.toast).toHaveBeenCalledWith(expect.objectContaining({title: 'Invoice created'}));
});

it('keeps a standalone superadmin read-only without looking up student accounts or creating invoices', async () => {
  mock.user = {...mock.user!, role: 'superadmin', roles: ['superadmin']};
  show();
  expect(screen.getByRole('alert')).toHaveTextContent('Superadmin access alone is read-only.');
  expect(screen.queryByLabelText('Student account')).toBeNull();
  expect(screen.queryByRole('button', {name: 'Review invoice'})).toBeNull();
  await act(async () => {});
  expect(mock.queries).toHaveLength(0); expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.insert).not.toHaveBeenCalled();
});

it.each(['finance_officer', 'centre_director'])('allows an active superadmin with verified %s membership to create a reviewed invoice', async membership => {
  mock.user = {...mock.user!, role: 'superadmin', roles: ['superadmin', membership]};
  show(); await prepare();
  fireEvent.click(screen.getByRole('button', {name: 'Create reviewed invoice'}));
  await waitFor(() => expect(mock.created).toHaveBeenCalledTimes(1));
  expect(mock.insert).toHaveBeenCalledExactlyOnceWith({
    id: INVOICE, tenant_id: TENANT, student_id: STUDENT, student_name: 'Same Student',
    type: 'tuition', amount: 1250.5, instalments: 2, due_date: '2026-12-10',
  });
});

it('separates failed and empty account lookups and retries without losing invoice details', async () => {
  mock.lookupFailure = true; show();
  await screen.findByText(/Centre accounts could not be loaded/);
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: '500.25'}});
  expect(screen.getByRole('button', {name: 'Review invoice'})).toBeDisabled();
  mock.lookupFailure = false; mock.profiles = [];
  fireEvent.click(screen.getByRole('button', {name: 'Retry account lookup'}));
  await screen.findByText(/No centre accounts are available/);
  expect(screen.queryByText(/Centre accounts could not be loaded/)).toBeNull();
  expect(screen.getByLabelText('Amount (PKR)')).toHaveValue('500.25');
  expect(mock.insert).not.toHaveBeenCalled();
});

it('fails closed when a later profile page is unavailable instead of offering an incomplete account list', async () => {
  mock.profiles = Array.from({length: 251}, (_, index) => account('30000000-0000-4000-8000-' + String(index + 1).padStart(12, '0')));
  const first = mock.profiles.slice(0, 250);
  const second = deferred<Reply>();
  mock.lookupPage.mockImplementation((query: Query) => query.from === 0 ? {data: first, error: null} : second.promise);
  show();
  await waitFor(() => expect(mock.queries.some(query => query.from === 250)).toBe(true));
  await act(async () => second.resolve({data: null, error: {message: 'Profile page unavailable'}}));
  await screen.findByText(/Centre accounts could not be loaded/);
  expect(within(screen.getByLabelText('Student account')).getAllByRole('option')).toHaveLength(1);
  expect(mock.insert).not.toHaveBeenCalled();
});

it('requires successful selected-account role verification, with a recoverable failure state', async () => {
  mock.rpc.mockResolvedValue({data: null, error: {message: 'Role lookup failed'}});
  show(); await waitFor(() => expect(screen.getByLabelText('Student account')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Student account'), {target: {value: STUDENT}});
  await screen.findByText(/student role could not be verified/);
  expect(screen.getByRole('button', {name: 'Review invoice'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: '25.50'}});
  mock.rpc.mockResolvedValue({data: true, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Retry student check'}));
  await screen.findByText(/Student account verified:/);
  expect(screen.getByLabelText('Amount (PKR)')).toHaveValue('25.50');
});

it('never offers review for a centre staff account without the student role', async () => {
  mock.rpc.mockResolvedValue({data: false, error: null});
  show(); await waitFor(() => expect(screen.getByLabelText('Student account')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Student account'), {target: {value: STUDENT}});
  await screen.findByText(/does not have a verified student role/);
  expect(screen.getByRole('button', {name: 'Review invoice'})).toBeDisabled();
  expect(mock.insert).not.toHaveBeenCalled();
});

it('ignores a late role result for an account that is no longer selected', async () => {
  const gate = deferred<Reply>();
  mock.rpc.mockImplementation((_name: string, args: {_user_id: string}) => args._user_id === STUDENT ? gate.promise : Promise.resolve({data: false, error: null}));
  show(); await waitFor(() => expect(screen.getByLabelText('Student account')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Student account'), {target: {value: STUDENT}});
  await screen.findByText(/Checking the selected student's account/);
  expect(screen.getByRole('button', {name: 'Review invoice'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Student account'), {target: {value: OTHER}});
  await screen.findByText(/does not have a verified student role/);
  await act(async () => gate.resolve({data: true, error: null}));
  expect(screen.queryByText(/Student account verified:/)).toBeNull();
  expect(screen.getByRole('button', {name: 'Review invoice'})).toBeDisabled();
});

it('checks account membership again at creation and keeps the reviewed details if it was revoked', async () => {
  show(); await prepare();
  mock.rpc.mockResolvedValue({data: false, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Create reviewed invoice'}));
  await screen.findByText(/does not have a verified student role/);
  expect(mock.insert).not.toHaveBeenCalled();
  expect(screen.getByRole('region', {name: 'Reviewed student invoice'})).toHaveTextContent('1,250.50');
  expect(screen.getByRole('button', {name: 'Back to details'})).toBeEnabled();
});

it('rejects a selected profile that no longer belongs to the current centre', async () => {
  show(); await chooseStudent();
  mock.profileCheck.mockReturnValue({data: {...account(), tenant_id: 'another-centre'}, error: null});
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: '20'}});
  fireEvent.click(screen.getByRole('button', {name: 'Review invoice'}));
  await screen.findByText(/no longer available in the selected centre/);
  expect(mock.insert).not.toHaveBeenCalled();
});

it('keeps an empty creation response uncertain, locks reviewed details and retains identity across close and reopen', async () => {
  const view = await uncertainInvoice();
  expect(mock.created).not.toHaveBeenCalled(); expect(mock.toast).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Amount (PKR)')).toBeNull();
  expect(screen.queryByRole('button', {name: 'Back to details'})).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Close and keep recovery'}));
  expect(mock.closed).toHaveBeenCalledWith(false);
  view.rerender(<CreateInvoiceModal {...props(false)}/>);
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(<CreateInvoiceModal {...props()}/>);
  const review = await screen.findByRole('region', {name: 'Reviewed student invoice'});
  expect(review).toHaveTextContent(INVOICE);
  expect(review).toHaveTextContent('1,250.50');
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  expect(mock.insert).toHaveBeenCalledTimes(1);
});

it('recovers a confirmed invoice by exact id, student and centre without inserting again', async () => {
  await uncertainInvoice();
  const payload = mock.insert.mock.calls[0][0] as ReviewedInvoice;
  mock.readInvoice.mockResolvedValue({data: {...payload, amount: '1250.50'}, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Check invoice status'}));
  await waitFor(() => expect(mock.created).toHaveBeenCalledTimes(1));
  expect(mock.insert).toHaveBeenCalledTimes(1);
  expect(mock.readInvoice).toHaveBeenCalledWith(expect.objectContaining({
    columns: 'id,tenant_id,student_id,student_name,type,amount,instalments,due_date',
    filters: [['tenant_id', TENANT], ['student_id', STUDENT], ['id', INVOICE]],
  }));
});

it('checks status before retrying and reuses the exact reviewed UUID and payload', async () => {
  await uncertainInvoice();
  const original = structuredClone(mock.insert.mock.calls[0][0]);
  mock.insert.mockImplementation(async (payload: Record<string, unknown>) => ({data: payload, error: null}));
  fireEvent.click(screen.getByRole('button', {name: 'Retry same invoice'}));
  await waitFor(() => expect(mock.created).toHaveBeenCalledTimes(1));
  expect(mock.readInvoice).toHaveBeenCalledTimes(1);
  expect(mock.insert).toHaveBeenCalledTimes(2);
  expect(mock.insert.mock.calls[1][0]).toEqual(original);
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
});

it('does not retry a write if the status read fails, and does not call a missing record a failed creation', async () => {
  await uncertainInvoice();
  mock.readInvoice.mockResolvedValue({data: null, error: {message: 'Read failed'}});
  fireEvent.click(screen.getByRole('button', {name: 'Retry same invoice'}));
  await screen.findByText(/Invoice status could not be checked/);
  expect(mock.insert).toHaveBeenCalledTimes(1);
  mock.readInvoice.mockResolvedValue({data: null, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Check invoice status'}));
  await screen.findByText(/No matching invoice is visible yet/);
  expect(mock.insert).toHaveBeenCalledTimes(1); expect(mock.created).not.toHaveBeenCalled();
});

it('rejects a mismatched recovered invoice without overwriting it or creating a new identity', async () => {
  await uncertainInvoice();
  mock.readInvoice.mockResolvedValue({data: {...mock.insert.mock.calls[0][0], student_id: OTHER}, error: null});
  fireEvent.click(screen.getByRole('button', {name: 'Retry same invoice'}));
  await screen.findByText(/returned invoice does not match/);
  expect(mock.insert).toHaveBeenCalledTimes(1); expect(mock.created).not.toHaveBeenCalled();
  expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
});

it('guards duplicate creation and closing while an invoice write is pending', async () => {
  const gate = deferred<Reply>(); mock.insert.mockReturnValue(gate.promise);
  show(); await prepare();
  const create = screen.getByRole('button', {name: 'Create reviewed invoice'});
  act(() => {fireEvent.click(create); fireEvent.click(create);});
  await waitFor(() => expect(mock.insert).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', {name: 'Close'}));
  expect(mock.closed).not.toHaveBeenCalled();
  const payload = mock.insert.mock.calls[0][0];
  await act(async () => gate.resolve({data: payload, error: null}));
  expect(mock.created).toHaveBeenCalledTimes(1);
});

it.each([
  ['account', () => {mock.user = {...mock.user!, id: OTHER};}],
  ['centre', () => {mock.user = {...mock.user!, tenantId: '20000000-0000-4000-8000-000000000002'};}],
  ['active role', () => {mock.user = {...mock.user!, role: 'student', roles: ['finance_officer', 'student']};}],
  ['membership', () => {mock.user = {...mock.user!, roles: []};}],
  ['auth loading', () => {mock.authLoading = true;}],
] as const)('drops private review state and ignores a late create after the %s boundary changes', async (_label, changeScope) => {
  const gate = deferred<Reply>(); mock.insert.mockReturnValue(gate.promise);
  const view = show(); await prepare();
  fireEvent.click(screen.getByRole('button', {name: 'Create reviewed invoice'}));
  await waitFor(() => expect(mock.insert).toHaveBeenCalledTimes(1));
  const payload = mock.insert.mock.calls[0][0]; changeScope();
  view.rerender(<CreateInvoiceModal {...props()}/>);
  await act(async () => gate.resolve({data: payload, error: null}));
  expect(screen.queryByRole('region', {name: 'Reviewed student invoice'})).toBeNull();
  expect(mock.created).not.toHaveBeenCalled(); expect(mock.toast).not.toHaveBeenCalled(); expect(mock.closed).not.toHaveBeenCalled();
});

it.each([
  ['closed modal', () => {}, false],
  ['loading auth', () => {mock.authLoading = true;}, true],
  ['missing identity', () => {mock.user = null;}, true],
  ['unverified active role', () => {mock.user = {...mock.user!, roles: []};}, true],
  ['different active role', () => {mock.user = {...mock.user!, role: 'lecturer', roles: ['lecturer', 'finance_officer']};}, true],
  ['missing centre', () => {mock.user = {...mock.user!, tenantId: undefined};}, true],
] as const)('makes no account or invoice calls for %s', async (_label, configure, open) => {
  configure(); show(open);
  await act(async () => {});
  expect(mock.queries).toHaveLength(0); expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.insert).not.toHaveBeenCalled();
});

describe('reviewed invoice validation', () => {
  const validForm: InvoiceForm = {studentId: STUDENT, type: 'tuition', amount: '1250.50', instalments: '2', dueDate: '2026-12-10'};
  it('rejects non-positive, over-precision and out-of-range amounts without rounding or accepting exponent notation', () => {
    for (const value of ['', '0', '-1', '0.001', '12.345', '1e3', '10000000000', Infinity, NaN, null]) expect(invoiceAmountInPaise(value)).toBeNull();
    expect(invoiceAmountInPaise('0.01')).toBe(1);
    expect(invoiceAmountInPaise('9999999999.99')).toBe(999999999999);
    expect(invoiceAmountInPaise('1250.50')).toBe(125050);
  });
  it('validates real optional dates and the supported integer payment counts', () => {
    expect(validInvoiceDate('')).toBe(true); expect(validInvoiceDate('2028-02-29')).toBe(true);
    for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', '0000-01-01', '2026-1-01']) expect(validInvoiceDate(value)).toBe(false);
    for (const instalments of ['0', '-1', '1.5', '3', 'NaN']) expect(() => reviewInvoice({...validForm, instalments}, account(), TENANT, INVOICE)).toThrow(/whole number/);
    expect(() => reviewInvoice({...validForm, dueDate: '2026-02-31'}, account(), TENANT, INVOICE)).toThrow(/valid due date/);
  });
  it('requires all reviewed receipt fields and does not accept another account, amount or term', () => {
    const request = reviewInvoice(validForm, account(), TENANT, INVOICE);
    expect(confirmedInvoiceReceipt({...request, amount: '1250.50'}, request)).toBe(true);
    for (const receipt of [null, [], {id: INVOICE}, {...request, amount: 1250.51}, {...request, student_id: OTHER}, {...request, tenant_id: 'elsewhere'}, {...request, due_date: null}, {...request, instalments: 4}, {...request, type: 'commission'}]) expect(confirmedInvoiceReceipt(receipt, request)).toBe(false);
  });
});
