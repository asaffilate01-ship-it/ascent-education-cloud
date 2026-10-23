import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import PaymentOperations from '@/pages/finance/PaymentOperations';
const mocks = vi.hoisted(() => ({from: vi.fn(), user: {id: 'finance', role: 'finance_officer', tenantId: 'centre-a'} as {id: string; role: string; tenantId?: string}}));
vi.mock('@/lib/db', () => ({db: {from: mocks.from}}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mocks.user})}));
vi.mock('@/components/layout/DashboardLayout', () => ({default: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
const row = {id: 'payment-1', invoice_id: 'invoice-1', amount: 25, method: 'stripe', reference_number: 'pi_received', status: 'verified', created_at: '2026-10-23T12:00:00Z', verified_at: '2026-10-23T12:00:00Z'};
let range: ReturnType<typeof vi.fn>, eq: ReturnType<typeof vi.fn>, order: ReturnType<typeof vi.fn>;
function mount() {return render(<MemoryRouter><PaymentOperations /></MemoryRouter>);}
beforeEach(() => {
  mocks.user = {id: 'finance', role: 'finance_officer', tenantId: 'centre-a'};
  range = vi.fn().mockResolvedValue({data: [row], count: 1, error: null});
  const query = {select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range};
  eq = query.eq; order = query.order; mocks.from.mockReset().mockReturnValue(query);
});
afterEach(cleanup);
describe('finance payment ledger', () => {
  it('loads actual invoice payments with a centre scope and stable ordering', async () => {
    mount(); expect(screen.getByRole('status')).toHaveTextContent('Loading');
    await screen.findByText('pi_received');
    expect(mocks.from).toHaveBeenCalledWith('payments'); expect(eq).toHaveBeenCalledWith('tenant_id', 'centre-a');
    expect(order).toHaveBeenCalledWith('id', {ascending: false}); expect(range).toHaveBeenCalledWith(0, 24);
    expect(screen.getByText('PKR 25.00')).toBeInTheDocument(); expect(screen.getByText('invoice-1')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Next page'})).toBeDisabled();
  });
  it('shows an error without a fabricated zero count and retries', async () => {
    range.mockResolvedValueOnce({data: null, count: null, error: {message: 'private detail'}});
    mount(); await screen.findByRole('alert'); expect(screen.queryByText(/0 matching/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry payments')); await screen.findByText('pi_received');
  });
  it('treats missing counts and thrown network failures as unavailable', async () => {
    range.mockResolvedValueOnce({data: [], count: null}).mockRejectedValueOnce(new Error('network'));
    mount(); await screen.findByRole('alert'); fireEvent.click(screen.getByText('Retry payments'));
    await waitFor(() => expect(range).toHaveBeenCalledTimes(2)); await screen.findByRole('alert');
  });
  it('shows an explicit empty state only after a successful read', async () => {
    range.mockResolvedValue({data: [], count: 0}); mount(); await screen.findByText('No payment records match this ledger and status.');
  });
  it('paginates and resets page when status changes', async () => {
    range.mockResolvedValue({data: [row], count: 30}); mount(); await screen.findByText('pi_received');
    fireEvent.click(screen.getByText('Next page')); await screen.findByText('30 matching records · Page 2');
    expect(range).toHaveBeenLastCalledWith(25, 49);
    fireEvent.change(screen.getByLabelText('Status'), {target: {value: 'pending'}});
    await screen.findByText('30 matching records · Page 1'); expect(eq).toHaveBeenCalledWith('status', 'pending'); expect(range).toHaveBeenLastCalledWith(0, 24);
  });
  it('keeps institutional records separate and preserves their currency and bank reference', async () => {
    mount(); await screen.findByText('pi_received');
    range.mockResolvedValue({data: [{...row, invoice_id: undefined, reference_number: null, bank_reference: 'bank-123', currency: 'USD'}], count: 1});
    fireEvent.change(screen.getByLabelText('Ledger'), {target: {value: 'institutional'}});
    await screen.findByText('USD 25.00'); expect(mocks.from).toHaveBeenLastCalledWith('education_payment_transactions');
    expect(screen.getByText('bank-123')).toBeInTheDocument(); expect(screen.queryByText('pi_received')).not.toBeInTheDocument();
  });
  it('blocks unassigned and non-finance users without querying', () => {
    mocks.user.tenantId = undefined; const view = mount(); expect(screen.getByRole('alert')).toHaveTextContent('centre assignment');
    mocks.user = {id: 'student', role: 'student', tenantId: 'centre-a'}; view.rerender(<MemoryRouter><PaymentOperations /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('finance role'); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('discards a late result after an account switch', async () => {
    let finish!: (value: unknown) => void;
    range.mockReturnValueOnce(new Promise(resolve => {finish = resolve;})); const view = mount();
    mocks.user = {id: 'other', role: 'finance_officer', tenantId: 'centre-b'};
    range.mockResolvedValue({data: [], count: 0}); view.rerender(<MemoryRouter><PaymentOperations /></MemoryRouter>);
    await screen.findByText('No payment records match this ledger and status.');
    finish({data: [row], count: 1}); await waitFor(() => expect(screen.queryByText('pi_received')).not.toBeInTheDocument());
    expect(eq).toHaveBeenCalledWith('tenant_id', 'centre-b');
  });
  it('hides previous records during refresh and after role loss', async () => {
    const view = mount(); await screen.findByText('pi_received'); range.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByText('Refresh payments')); expect(screen.queryByText('pi_received')).not.toBeInTheDocument();
    mocks.user.role = 'student'; view.rerender(<MemoryRouter><PaymentOperations /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('finance role');
  });
});
