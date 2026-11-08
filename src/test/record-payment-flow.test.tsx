import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import RecordPaymentModal, {type InvoicePaymentTarget} from '@/components/modals/RecordPaymentModal';
import {paymentMinorUnits, reviewedPaymentAmount} from '@/lib/finance/paymentReceipt';

type Filters = Record<string, string>;
const mock = vi.hoisted(() => ({
  user: {id: 'finance-a', tenantId: 'centre-a', role: 'finance_officer', roles: ['finance_officer']},
  loading: false, invoices: [] as InvoicePaymentTarget[], sequence: 0,
  invoiceRead: vi.fn(), insert: vi.fn(), receiptRead: vi.fn(), invoke: vi.fn(), recorded: vi.fn(), open: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({useAuth: () => ({user: mock.user, loading: mock.loading})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {
  functions: {invoke: (...args: unknown[]) => mock.invoke(...args)},
  from: (table: string) => {
    const filters: Filters = {}; let payload: unknown;
    const query = {
      select: () => query,
      eq: (column: string, value: string) => {filters[column] = value; return query;},
      maybeSingle: () => table === 'invoices' ? mock.invoiceRead({...filters}) : mock.receiptRead({...filters}),
      insert: (value: unknown) => {payload = value; return query;},
      single: () => mock.insert(payload),
    };
    return query;
  },
}}));
const invoice = (changes: Partial<InvoicePaymentTarget> = {}): InvoicePaymentTarget => ({
  id: 'invoice-a', tenant_id: 'centre-a', student_id: 'learner-a', student_name: 'Sara Ali',
  amount: 1000.50, paid: 100, sponsor_amount: 300, sponsor_paid: 50, status: 'partial', ...changes,
});
const props = (target = invoice(), open = true) => ({open, invoice: target, onOpenChange: mock.open, onRecorded: mock.recorded});
const mount = (target = invoice()) => render(<RecordPaymentModal {...props(target)} />);
const review = (amount = '', reference = 'TRANSFER-A') => {
  fireEvent.change(screen.getByLabelText('Amount (PKR)'), {target: {value: amount}});
  fireEvent.change(screen.getByLabelText('Transaction reference'), {target: {value: reference}});
  fireEvent.click(screen.getByRole('button', {name: 'Review pending payment'}));
};
const record = () => fireEvent.click(screen.getByRole('button', {name: 'Record pending payment'}));
function deferred() {
  let finish!: (value: unknown) => void;
  const promise = new Promise(resolve => {finish = resolve;});
  return {promise, finish};
}
beforeEach(() => {
  vi.resetAllMocks(); mock.loading = false; mock.sequence = 0;
  mock.user = {id: 'finance-a', tenantId: 'centre-a', role: 'finance_officer', roles: ['finance_officer']};
  mock.invoices = [invoice()];
  mock.invoiceRead.mockImplementation(async (filters: Filters) => ({data: mock.invoices.find(row => row.id === filters.id && row.tenant_id === filters.tenant_id) ?? null, error: null}));
  mock.insert.mockImplementation(async payload => ({data: {...payload}, error: null}));
  mock.receiptRead.mockResolvedValue({data: null, error: null});
  vi.stubGlobal('crypto', {randomUUID: () => `00000000-0000-4000-8000-${String(++mock.sequence).padStart(12, '0')}`});
});
afterEach(() => {cleanup(); vi.unstubAllGlobals();});

describe('manual student payment review', () => {
  it('requires an existing finance or director membership even for an active superadmin', () => {
    mock.user = {...mock.user, role: 'superadmin', roles: ['superadmin']}; mount();
    expect(screen.getByRole('alert')).toHaveTextContent('finance officer or centre director membership');
    expect(screen.queryByLabelText('Amount (PKR)')).toBeNull(); expect(mock.invoiceRead).not.toHaveBeenCalled(); expect(mock.insert).not.toHaveBeenCalled();
  });
  it.each(['finance_officer', 'centre_director'])('allows an active superadmin with an additional verified %s membership', async membership => {
    mock.user = {...mock.user, role: 'superadmin', roles: ['superadmin', membership]}; mount(); review('50'); record();
    await screen.findByText('Pending payment recorded'); expect(mock.insert).toHaveBeenCalledOnce(); expect(mock.recorded).toHaveBeenCalledOnce();
  });
  it('reviews the raw student share and confirms an exact pending receipt without settling the invoice', async () => {
    mount();
    expect(screen.getByRole('dialog', {name: 'Record student payment'})).toHaveTextContent('Sara Ali');
    expect(screen.getByText('Invoice reference: invoice-a')).toBeInTheDocument();
    expect(screen.getByText('Student balance:').parentElement).toHaveTextContent('600.50');
    expect(screen.queryByRole('option', {name: /Stripe|Card/})).toBeNull();
    review();
    expect(mock.insert).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', {name: 'Review pending payment'})).toHaveFocus();
    record(); await screen.findByRole('heading', {name: 'Pending payment recorded'});
    expect(mock.invoiceRead).toHaveBeenCalledExactlyOnceWith({tenant_id: 'centre-a', id: 'invoice-a'});
    expect(mock.insert).toHaveBeenCalledExactlyOnceWith({
      id: '00000000-0000-4000-8000-000000000001', invoice_id: 'invoice-a', tenant_id: 'centre-a',
      amount: 600.50, method: 'bank_transfer', reference_number: 'TRANSFER-A', bank_name: null, sender_account: null, notes: null, status: 'pending',
    });
    expect(screen.getByText(/invoice balance is unchanged/)).toBeInTheDocument();
    expect(mock.recorded).toHaveBeenCalledOnce(); expect(mock.open).not.toHaveBeenCalled(); expect(mock.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Done'})); expect(mock.open).toHaveBeenCalledWith(false);
  });
  it.each(['0', '-1', '600.51', '1.001', '1e2', 'Infinity', 'NaN', '1,000'])('rejects invalid or excessive student amount %s before sending', value => {
    mount(); review(value); expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Record pending payment'})).toBeNull(); expect(mock.invoiceRead).not.toHaveBeenCalled(); expect(mock.insert).not.toHaveBeenCalled();
  });
  it('distinguishes empty amount from zero and preserves valid paisa amounts', () => {
    expect(reviewedPaymentAmount('', 0.15)).toBe(0.15); expect(reviewedPaymentAmount('.05', 0.15)).toBe(0.05);
    expect(() => reviewedPaymentAmount('0', 0.15)).toThrow('greater than zero');
    expect(() => reviewedPaymentAmount('0.151', 0.15)).toThrow('two decimal places');
    expect(() => reviewedPaymentAmount('', Number.POSITIVE_INFINITY)).toThrow('verified student balance');
  });
  it('accepts valid large two-decimal values without rounding extra precision into a payment', async () => {
    expect(paymentMinorUnits(10000000.03)).toBe(1000000003);
    expect(paymentMinorUnits(9999999999.99)).toBe(999999999999);
    expect(paymentMinorUnits(10000000.031)).toBeNull();
    expect(paymentMinorUnits(9999999999.991)).toBeNull();
    expect(() => reviewedPaymentAmount('10000000.031', 10000001)).toThrow('two decimal places');
    const target = invoice({amount: 10000000.03, paid: 0.01, sponsor_amount: 0.01, sponsor_paid: 0});
    mock.invoices = [target]; mount(target); review(); record(); await screen.findByText('Pending payment recorded');
    expect(mock.insert.mock.calls[0][0].amount).toBe(10000000.01);
  });
  it('records the exact one-paisa student share when large sponsor and invoice amounts nearly cancel', async () => {
    const target = invoice({amount: 9000000000.99, paid: 0, sponsor_amount: 9000000000.98, sponsor_paid: 0});
    mock.invoices = [target]; mount(target);
    expect(screen.getByText('Student balance:')).toHaveTextContent('Rs. 0.01');
    review(); record(); await screen.findByText('Pending payment recorded');
    expect(mock.insert.mock.calls[0][0].amount).toBe(0.01);
  });
  it('requires the transfer reference and includes only reviewed transfer details', async () => {
    mount(); review('50.25', ' '); expect(screen.getByRole('alert')).toHaveTextContent('transaction reference');
    fireEvent.change(screen.getByLabelText('Bank name (optional)'), {target: {value: ' HBL '}});
    fireEvent.change(screen.getByLabelText('Sender account (optional)'), {target: {value: ' Account A '}});
    fireEvent.change(screen.getByLabelText('Notes (optional)'), {target: {value: ' Learner transfer '}});
    review('50.25', ' TRANSFER-123 '); record(); await screen.findByText('Pending payment recorded');
    expect(mock.insert.mock.calls[0][0]).toMatchObject({amount: 50.25, reference_number: 'TRANSFER-123', bank_name: 'HBL', sender_account: 'Account A', notes: 'Learner transfer'});
  });
  it.each([{status: 'paid'}, {status: 'refunded'}, {student_id: null}, {student_id: ''}, {paid: 700.50}, {amount: Number.NaN}])('blocks a non-payable original target %j', changes => {
    mount(invoice(changes)); expect(screen.getByRole('alert')).toHaveTextContent('not available');
    expect(screen.queryByLabelText('Amount (PKR)')).toBeNull(); expect(mock.invoiceRead).not.toHaveBeenCalled();
  });
  it.each([{status: 'paid'}, {status: 'refunded'}, {student_id: 'learner-b'}, {student_name: 'Different learner'}, {paid: 200}, {amount: 1001}, {sponsor_amount: 400}])('rechecks the exact intended invoice before inserting when it changed: %j', changes => {
    mock.invoices = [invoice(changes)]; mount(); review('50'); record();
    return screen.findByRole('alert').then(alert => {expect(alert).toHaveTextContent('has changed'); expect(mock.insert).not.toHaveBeenCalled();});
  });
  it('blocks an invoice from another centre before any read', () => {
    mount(invoice({tenant_id: 'centre-b'})); expect(screen.getByRole('alert')).toHaveTextContent('current account'); expect(mock.invoiceRead).not.toHaveBeenCalled();
  });
  it('locks the submit synchronously while invoice verification is pending', async () => {
    const pending = deferred(); mock.invoiceRead.mockReturnValue(pending.promise); mount(); review('50');
    const button = screen.getByRole('button', {name: 'Record pending payment'});
    fireEvent.click(button); fireEvent.click(button); expect(mock.invoiceRead).toHaveBeenCalledOnce();
    await act(async () => pending.finish({data: invoice(), error: null})); await screen.findByText('Pending payment recorded'); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it.each([{status: 'paid'}, {student_id: 'learner-b', student_name: 'Hina Khan'}])('ignores an outdated preflight result when the current same-ID invoice changes: %j', async changes => {
    const pending = deferred(); mock.invoiceRead.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    view.rerender(<RecordPaymentModal {...props(invoice(changes))} />);
    await act(async () => pending.finish({data: invoice(), error: null}));
    expect(screen.getByRole('alert')).toHaveTextContent(/ha(?:s|ve) changed/); expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe('pending payment receipt recovery', () => {
  it.each([null, {}, {status: 'verified'}, {amount: 12}])('does not report success for an absent or mismatching insert receipt: %j', async result => {
    mock.insert.mockImplementation(async payload => ({data: result === null ? null : {...payload, ...result, ...(Object.keys(result).length ? {} : {id: 'wrong-reference'})}, error: null}));
    mount(); review('50'); record(); await screen.findByRole('heading', {name: 'Payment record not confirmed'});
    expect(mock.recorded).not.toHaveBeenCalled(); expect(screen.queryByRole('button', {name: 'Edit details'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Check payment record'})).toBeEnabled();
  });
  it('recovers a matching pending row by exact payment, invoice and centre reference', async () => {
    mock.insert.mockResolvedValue({data: null, error: {message: 'lost response'}}); mount(); review('50.25'); record();
    await screen.findByRole('button', {name: 'Check payment record'}); const payload = mock.insert.mock.calls[0][0];
    mock.receiptRead.mockResolvedValue({data: {...payload}, error: null}); fireEvent.click(screen.getByRole('button', {name: 'Check payment record'}));
    await screen.findByText('Pending payment recorded');
    expect(mock.receiptRead).toHaveBeenCalledExactlyOnceWith({tenant_id: 'centre-a', invoice_id: 'invoice-a', id: payload.id});
    expect(mock.insert).toHaveBeenCalledOnce(); expect(mock.recorded).toHaveBeenCalledOnce();
  });
  it('keeps an uncertain payload frozen across invoice A to B to A and retries the same UUID', async () => {
    const targetB = invoice({id: 'invoice-b', student_id: 'learner-b', student_name: 'Hina Khan'}); mock.invoices.push(targetB);
    mock.insert.mockResolvedValueOnce({data: null, error: {message: 'network'}});
    const view = mount(); review('50.25'); record(); await screen.findByRole('button', {name: 'Retry same payment'});
    const original = mock.insert.mock.calls[0][0]; expect(Object.isFrozen(original)).toBe(true);
    view.rerender(<RecordPaymentModal {...props(targetB)} />);
    expect(screen.getByLabelText('Amount (PKR)')).toHaveValue(''); expect(screen.getByLabelText('Transaction reference')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Transaction reference'), {target: {value: 'TRANSFER-B'}});
    view.rerender(<RecordPaymentModal {...props()} />);
    expect(screen.getByText('TRANSFER-A')).toBeInTheDocument(); expect(screen.queryByText('TRANSFER-B')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Check payment record'})); await screen.findByRole('status');
    expect(screen.getByRole('status')).toHaveTextContent('does not prove the earlier attempt failed');
    fireEvent.click(screen.getByRole('button', {name: 'Retry same payment'})); await screen.findByText('Pending payment recorded');
    expect(mock.insert).toHaveBeenCalledTimes(2); expect(mock.insert.mock.calls[1][0]).toBe(original); expect(mock.sequence).toBe(1);
  });
  it('retains the unresolved identity if closed during insert and ignores the late response', async () => {
    const pending = deferred(); mock.insert.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    await waitFor(() => expect(mock.insert).toHaveBeenCalledOnce()); const original = mock.insert.mock.calls[0][0];
    view.rerender(<RecordPaymentModal {...props(invoice(), false)} />);
    await act(async () => pending.finish({data: {...original}, error: null})); expect(mock.recorded).not.toHaveBeenCalled();
    view.rerender(<RecordPaymentModal {...props()} />);
    expect(screen.getByRole('heading', {name: 'Payment record not confirmed'})).toBeInTheDocument();
    mock.receiptRead.mockResolvedValue({data: {...original}, error: null}); fireEvent.click(screen.getByRole('button', {name: 'Check payment record'}));
    await screen.findByText('Pending payment recorded'); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it('does not let invoice A completion clear invoice B or confirm the wrong student', async () => {
    const pending = deferred(); mock.insert.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    await waitFor(() => expect(mock.insert).toHaveBeenCalledOnce()); const original = mock.insert.mock.calls[0][0];
    view.rerender(<RecordPaymentModal {...props(invoice({id: 'invoice-b', student_id: 'learner-b', student_name: 'Hina Khan'}))} />);
    fireEvent.change(screen.getByLabelText('Transaction reference'), {target: {value: 'TRANSFER-B'}});
    await act(async () => pending.finish({data: original, error: null})); expect(mock.recorded).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Transaction reference')).toHaveValue('TRANSFER-B'); expect(screen.queryByText('Pending payment recorded')).toBeNull();
  });
  it.each([{student_name: 'Sara Ahmed'}, {student_id: 'learner-b', student_name: 'Hina Khan'}])('preserves attribution and recoverable uncertainty after a same-ID change during INSERT: %j', async changes => {
    const pending = deferred(); mock.insert.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    await waitFor(() => expect(mock.insert).toHaveBeenCalledOnce()); const original = mock.insert.mock.calls[0][0];
    view.rerender(<RecordPaymentModal {...props(invoice(changes))} />);
    await act(async () => pending.finish({data: original, error: null}));
    expect(mock.recorded).not.toHaveBeenCalled(); expect(screen.queryByText('Pending payment recorded')).toBeNull();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument(); expect(screen.queryByText(changes.student_name)).toBeNull();
    expect(screen.getByRole('button', {name: 'Check payment record'})).toBeEnabled();
    expect(screen.getByText(`Payment reference: ${original.id}`)).toBeInTheDocument();
    mock.receiptRead.mockResolvedValue({data: original, error: null});
    fireEvent.click(screen.getByRole('button', {name: 'Check payment record'})); await screen.findByText('Pending payment recorded');
    expect(screen.getByText('Sara Ali')).toBeInTheDocument(); expect(screen.queryByText(changes.student_name)).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('originally reviewed student');
    expect(mock.recorded).toHaveBeenCalledOnce(); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it.each(['Check payment record', 'Retry same payment'])('ignores a matching recovery response when student identity changes during %s', async action => {
    mock.insert.mockResolvedValue({data: null, error: {message: 'lost'}}); const view = mount(); review('50'); record();
    await screen.findByRole('button', {name: 'Check payment record'}); const original = mock.insert.mock.calls[0][0];
    const pending = deferred(); mock.receiptRead.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole('button', {name: action}));
    view.rerender(<RecordPaymentModal {...props(invoice({student_id: 'learner-b', student_name: 'Hina Khan'}))} />);
    await act(async () => pending.finish({data: original, error: null}));
    expect(mock.recorded).not.toHaveBeenCalled(); expect(screen.queryByText('Pending payment recorded')).toBeNull();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument(); expect(screen.queryByText('Hina Khan')).toBeNull();
    expect(screen.getByRole('button', {name: 'Check payment record'})).toBeEnabled(); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it('releases the request lock when current student details become unavailable, retaining recovery for their return', async () => {
    const pending = deferred(); mock.insert.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    await waitFor(() => expect(mock.insert).toHaveBeenCalledOnce()); const original = mock.insert.mock.calls[0][0];
    view.rerender(<RecordPaymentModal {...props(invoice({student_name: ''}))} />);
    await act(async () => pending.finish({data: original, error: null})); expect(mock.recorded).not.toHaveBeenCalled();
    view.rerender(<RecordPaymentModal {...props()} />);
    expect(screen.getByRole('button', {name: 'Check payment record'})).toBeEnabled();
    expect(screen.getByText(`Payment reference: ${original.id}`)).toBeInTheDocument();
  });
  it('keeps a confirmed receipt under the reviewed student and balance after its invoice is reassigned', async () => {
    const view = mount(); review('50'); record(); await screen.findByText('Pending payment recorded');
    view.rerender(<RecordPaymentModal {...props(invoice({student_id: 'learner-b', student_name: 'Hina Khan', paid: 400}))} />);
    expect(screen.getByText('Pending payment recorded')).toBeInTheDocument();
    expect(screen.getByText('Sara Ali')).toBeInTheDocument(); expect(screen.queryByText('Hina Khan')).toBeNull();
    expect(screen.getByText('Student balance at review:')).toHaveTextContent('600.50');
    expect(screen.getByRole('alert')).toHaveTextContent('student details have changed'); expect(mock.recorded).toHaveBeenCalledOnce();
  });
  it('directs finance review when an uncertain payment cannot be retried against a changed balance', async () => {
    mock.insert.mockResolvedValue({data: null, error: {message: 'lost'}}); mount(); review('50'); record();
    await screen.findByRole('button', {name: 'Retry same payment'}); mock.invoices = [invoice({paid: 200})];
    fireEvent.click(screen.getByRole('button', {name: 'Retry same payment'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Keep the original payment reference and ask finance');
    expect(screen.queryByRole('button', {name: 'Edit details'})).toBeNull(); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it('recovers a duplicate UUID response only through a matching stored pending row', async () => {
    mock.insert.mockImplementation(async payload => {mock.receiptRead.mockResolvedValue({data: {...payload}, error: null}); return {data: null, error: {code: '23505'}};});
    mount(); review('50'); record(); await screen.findByText('Pending payment recorded'); expect(mock.receiptRead).toHaveBeenCalledOnce(); expect(mock.recorded).toHaveBeenCalledOnce();
  });
  it.each([{status: 'verified'}, {tenant_id: 'centre-b'}, {invoice_id: 'invoice-b'}])('blocks a retry when the saved record has another scope or status: %j', async changes => {
    mock.insert.mockResolvedValue({data: null, error: {message: 'lost'}}); mount(); review('50'); record();
    await screen.findByRole('button', {name: 'Check payment record'});
    mock.receiptRead.mockResolvedValue({data: {...mock.insert.mock.calls[0][0], ...changes}, error: null});
    fireEvent.click(screen.getByRole('button', {name: 'Check payment record'})); await screen.findByText(/different details or a different verification status/);
    expect(screen.getByRole('button', {name: 'Retry same payment'})).toBeDisabled(); expect(mock.recorded).not.toHaveBeenCalled(); expect(mock.insert).toHaveBeenCalledOnce();
  });
  it('allows editing after an explicit first-write rejection, but never after an uncertain earlier attempt', async () => {
    mock.insert.mockResolvedValueOnce({data: null, error: {code: '42501'}}); const view = mount(); review('50'); record();
    await screen.findByText(/rejected and was not recorded/); fireEvent.click(screen.getByRole('button', {name: 'Edit details'}));
    expect(screen.getByLabelText('Amount (PKR)')).toHaveValue('50');
    mock.insert.mockResolvedValueOnce({data: null, error: {message: 'lost'}}).mockResolvedValueOnce({data: null, error: {code: '42501'}});
    review('50'); record(); await screen.findByRole('button', {name: 'Retry same payment'});
    fireEvent.click(screen.getByRole('button', {name: 'Retry same payment'})); await waitFor(() => expect(mock.insert).toHaveBeenCalledTimes(3));
    await screen.findByText(/Keep the reviewed details/); expect(screen.queryByRole('button', {name: 'Edit details'})).toBeNull(); view.unmount();
  });
});

describe('payment scope lifetime', () => {
  it.each(['account', 'centre', 'role', 'membership', 'auth-loading', 'unmount'])('does not start a write after %s changes during the invoice read', async change => {
    const pending = deferred(); mock.invoiceRead.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    if (change === 'account') mock.user = {...mock.user, id: 'finance-b'};
    if (change === 'centre') mock.user = {...mock.user, tenantId: 'centre-b'};
    if (change === 'role') mock.user = {...mock.user, role: 'lecturer', roles: ['finance_officer', 'lecturer']};
    if (change === 'membership') mock.user = {...mock.user, roles: ['lecturer']};
    if (change === 'auth-loading') mock.loading = true;
    if (change === 'unmount') view.unmount(); else view.rerender(<RecordPaymentModal {...props()} />);
    await act(async () => pending.finish({data: invoice(), error: null})); expect(mock.insert).not.toHaveBeenCalled(); expect(mock.recorded).not.toHaveBeenCalled();
  });
  it('clears all cached payment details when authentication starts again', async () => {
    mock.insert.mockResolvedValue({data: null, error: {message: 'lost'}}); const view = mount(); review('50', 'PRIVATE-TRANSFER'); record();
    await screen.findByRole('button', {name: 'Retry same payment'});
    mock.loading = true; view.rerender(<RecordPaymentModal {...props()} />);
    expect(screen.queryByText('PRIVATE-TRANSFER')).toBeNull(); expect(screen.queryByLabelText('Transaction reference')).toBeNull();
    mock.loading = false; view.rerender(<RecordPaymentModal {...props()} />);
    expect(screen.getByLabelText('Transaction reference')).toHaveValue(''); expect(screen.getByLabelText('Amount (PKR)')).toHaveValue('');
  });
  it.each(['account', 'role', 'auth-loading'])('ignores a completed INSERT receipt after %s changes', async change => {
    const pending = deferred(); mock.insert.mockReturnValue(pending.promise); const view = mount(); review('50'); record();
    await waitFor(() => expect(mock.insert).toHaveBeenCalledOnce()); const original = mock.insert.mock.calls[0][0];
    if (change === 'account') mock.user = {...mock.user, id: 'finance-b'};
    if (change === 'role') mock.user = {...mock.user, role: 'lecturer', roles: ['finance_officer', 'lecturer']};
    if (change === 'auth-loading') mock.loading = true;
    view.rerender(<RecordPaymentModal {...props()} />);
    await act(async () => pending.finish({data: original, error: null}));
    expect(mock.recorded).not.toHaveBeenCalled(); expect(mock.open).not.toHaveBeenCalled(); expect(screen.queryByText('Pending payment recorded')).toBeNull();
  });
});
