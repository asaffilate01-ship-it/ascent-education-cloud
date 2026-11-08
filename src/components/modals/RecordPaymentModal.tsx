import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { feeLiability } from '@/lib/feeLiability';
import { canWriteFinanceRecords } from '@/lib/finance/access';
import { MANUAL_PAYMENT_METHODS, definitePaymentRejection, matchesPendingPayment, paymentMinorUnits, reviewedPaymentAmount, type ManualPaymentMethod, type PendingPaymentRecord } from '@/lib/finance/paymentReceipt';

export type InvoicePaymentTarget = {
  id: string; student_name: string; student_id?: string | null; tenant_id: string | null;
  amount: number; paid: number | null; sponsor_amount?: number; sponsor_paid?: number; status: string;
};
interface RecordPaymentModalProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  invoice: InvoicePaymentTarget | null; onRecorded?: () => void;
}
type Form = { amount: string; reference: string; bankName: string; senderAccount: string; notes: string };
type ReviewedPayment = { payment: PendingPaymentRecord; invoice: InvoicePaymentTarget };
type Draft = {
  form: Form; method: ManualPaymentMethod; reviewed: ReviewedPayment | null;
  uncertain: boolean; conflict: boolean; receipt: ReviewedPayment | null;
};
const emptyForm = (): Form => ({ amount: '', reference: '', bankName: '', senderAccount: '', notes: '' });
const freshDraft = (): Draft => ({ form: emptyForm(), method: 'bank_transfer', reviewed: null, uncertain: false, conflict: false, receipt: null });
const PAYMENT_FIELDS = 'id,invoice_id,tenant_id,amount,method,reference_number,bank_name,sender_account,notes,status';
const INVOICE_FIELDS = 'id,tenant_id,student_id,student_name,amount,paid,sponsor_amount,sponsor_paid,status';
const OPEN_STATUSES = ['pending', 'partial', 'overdue'];
const money = (value: number) => `Rs. ${value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function studentShare(invoice: InvoicePaymentTarget): number | null {
  const minor = [invoice.amount, invoice.paid ?? 0, invoice.sponsor_amount ?? 0, invoice.sponsor_paid ?? 0].map(paymentMinorUnits);
  if (minor.some(value => value === null)) return null;
  try { feeLiability(invoice); return Math.max(0, minor[0]! - minor[1]! - minor[2]!) / 100; } catch { return null; }
}
function sameInvoiceIdentity(actual: InvoicePaymentTarget, reviewed: InvoicePaymentTarget): boolean {
  return actual.id === reviewed.id && actual.tenant_id === reviewed.tenant_id
    && (actual.student_id ?? null) === (reviewed.student_id ?? null)
    && actual.student_name === reviewed.student_name;
}
function sameInvoice(actual: InvoicePaymentTarget, reviewed: InvoicePaymentTarget): boolean {
  return sameInvoiceIdentity(actual, reviewed) && actual.status === reviewed.status
    && ['amount', 'paid', 'sponsor_amount', 'sponsor_paid'].every(key => {
      const field = key as 'amount' | 'paid' | 'sponsor_amount' | 'sponsor_paid';
      return paymentMinorUnits(actual[field] ?? 0) === paymentMinorUnits(reviewed[field] ?? 0);
    });
}

/** A scope remount drops every private draft as soon as auth, centre or active role changes. */
export default function RecordPaymentModal(props: RecordPaymentModalProps) {
  const { user, loading } = useAuth();
  const scope = `${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}:${loading}`;
  const allowed = !loading && !!user?.id && !!user.tenantId
    && canWriteFinanceRecords(user);
  return <ScopedPayments key={scope} {...props} allowed={allowed} tenantId={user?.tenantId ?? null} />;
}
function ScopedPayments(props: RecordPaymentModalProps & { allowed: boolean; tenantId: string | null }) {
  const drafts = useRef(new Map<string, Draft>());
  const { invoice } = props;
  if (!invoice) return null;
  const invoiceKey = `${invoice.tenant_id}:${invoice.id}`;
  return <PaymentWorkspace key={invoiceKey} {...props} invoice={invoice} drafts={drafts.current} invoiceKey={invoiceKey} />;
}
function PaymentWorkspace({ open, onOpenChange, invoice, onRecorded, allowed: hasRole, tenantId, drafts, invoiceKey }:
  Omit<RecordPaymentModalProps, 'invoice'> & { invoice: InvoicePaymentTarget; allowed: boolean; tenantId: string | null; drafts: Map<string, Draft>; invoiceKey: string }) {
  const [draft, setDraft] = useState<Draft>(() => drafts.get(invoiceKey) ?? freshDraft());
  const draftRef = useRef(draft);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const mounted = useRef(true), operation = useRef<symbol | null>(null), isOpen = useRef(open);
  const opener = useRef<HTMLElement | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const allowed = hasRole && !!tenantId && invoice.tenant_id === tenantId && !!invoice.id && !!invoice.student_name?.trim();
  const permission = useRef(allowed);
  const intendedInvoice = useRef(invoice);
  const operationInvoice = useRef<InvoicePaymentTarget | null>(null);
  isOpen.current = open; permission.current = allowed; intendedInvoice.current = invoice;
  const balance = studentShare(invoice);
  const payable = allowed && !!invoice.student_id?.trim() && OPEN_STATUSES.includes(invoice.status) && balance !== null && balance > 0;
  const replaceDraft = (next: Draft) => { draftRef.current = next; drafts.set(invoiceKey, next); setDraft(next); };
  const active = (token: symbol) => mounted.current && operation.current === token;
  const current = (token: symbol) => active(token) && isOpen.current && permission.current
    && !!operationInvoice.current && sameInvoiceIdentity(intendedInvoice.current, operationInvoice.current);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current = null; }; }, []);
  useLayoutEffect(() => { if (!open) { operation.current = null; setBusy(false); } }, [open]);
  useEffect(() => { if (open && (draft.reviewed || draft.receipt)) heading.current?.focus(); }, [open, draft.reviewed, draft.receipt]);

  const close = (next: boolean) => {
    if (!next) { operation.current = null; isOpen.current = false; setBusy(false); }
    onOpenChange(next);
  };
  const change = (field: keyof Form, value: string) => {
    if (draftRef.current.uncertain || operation.current) return;
    setError(''); setMessage('');
    replaceDraft({ ...draftRef.current, form: { ...draftRef.current.form, [field]: value } });
  };
  const review = (event: React.FormEvent) => {
    event.preventDefault();
    if (!payable || operation.current || draftRef.current.uncertain) return;
    try {
      const { form, method } = draftRef.current;
      const amount = reviewedPaymentAmount(form.amount, balance!);
      const reference = form.reference.trim();
      if (!reference) throw Error('Enter the transaction reference from the transfer receipt.');
      if (reference.length > 200 || form.bankName.trim().length > 200 || form.senderAccount.trim().length > 200 || form.notes.trim().length > 2000) {
        throw Error('Keep references and bank details within 200 characters, and notes within 2,000 characters.');
      }
      if (!MANUAL_PAYMENT_METHODS.some(item => item.value === method)) throw Error('Choose an available transfer method.');
      const bankTransfer = method === 'bank_transfer' || method === 'bank_alfalah';
      const payment: PendingPaymentRecord = Object.freeze({
        id: crypto.randomUUID(), invoice_id: invoice.id, tenant_id: tenantId!, amount, method,
        reference_number: reference, bank_name: bankTransfer ? form.bankName.trim() || null : null,
        sender_account: bankTransfer ? form.senderAccount.trim() || null : null,
        notes: form.notes.trim() || null, status: 'pending',
      });
      replaceDraft({ ...draftRef.current, reviewed: { payment, invoice: Object.freeze({ ...invoice }) }, conflict: false });
      setError(''); setMessage('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review the payment details and try again.'); }
  };
  const readReceipt = async (payment: PendingPaymentRecord) => supabase.from('payments').select(PAYMENT_FIELDS)
    .eq('tenant_id', payment.tenant_id).eq('invoice_id', payment.invoice_id).eq('id', payment.id).maybeSingle();
  const confirm = (reviewed: ReviewedPayment) => {
    replaceDraft({ ...draftRef.current, form: emptyForm(), reviewed: null, uncertain: false, conflict: false, receipt: reviewed });
    setError(''); setMessage(''); onRecorded?.();
  };
  const conflict = () => {
    replaceDraft({ ...draftRef.current, uncertain: true, conflict: true });
    setError('A record with this payment reference has different details or a different verification status. Ask finance to review the existing record before recording another payment.');
  };
  const checkReceipt = async () => {
    const reviewed = draftRef.current.reviewed;
    if (!reviewed || !allowed || !open || operation.current) return;
    const token = Symbol(); operation.current = token; operationInvoice.current = { ...intendedInvoice.current }; setBusy(true); setError(''); setMessage('');
    try {
      const result = await readReceipt(reviewed.payment);
      if (!current(token)) return;
      if (result.error) throw Error('read');
      if (matchesPendingPayment(result.data, reviewed.payment)) confirm(reviewed);
      else if (result.data) conflict();
      else setMessage('No matching pending record was returned. This does not prove the earlier attempt failed. Retry only this same reviewed payment, or ask finance to check the payment reference.');
    } catch { if (current(token)) setError('The payment record could not be checked. Keep this reference and try checking again before recording another payment.'); }
    finally { if (active(token)) { operation.current = null; setBusy(false); } }
  };
  const record = async () => {
    const reviewed = draftRef.current.reviewed;
    if (!reviewed || !allowed || !open || operation.current || draftRef.current.conflict) return;
    const wasUncertain = draftRef.current.uncertain;
    const token = Symbol(); operation.current = token; operationInvoice.current = { ...intendedInvoice.current }; setBusy(true); setError(''); setMessage('');
    let wrote = false;
    try {
      if (wasUncertain) {
        const existing = await readReceipt(reviewed.payment);
        if (!current(token)) return;
        if (existing.error) throw Error('The existing payment could not be checked. Try checking its record again.');
        if (matchesPendingPayment(existing.data, reviewed.payment)) { confirm(reviewed); return; }
        if (existing.data) { conflict(); return; }
      }
      const checked = await supabase.from('invoices').select(INVOICE_FIELDS)
        .eq('tenant_id', reviewed.payment.tenant_id).eq('id', reviewed.payment.invoice_id).maybeSingle();
      if (!current(token)) return;
      if (checked.error || !checked.data) throw Error('The selected invoice could not be verified. Refresh invoices before recording this payment.');
      const actual = checked.data;
      const currentBalance = studentShare(actual);
      if (!sameInvoice(actual, reviewed.invoice) || !sameInvoice(intendedInvoice.current, reviewed.invoice) || !OPEN_STATUSES.includes(actual.status)
        || currentBalance === null || currentBalance <= 0 || reviewed.payment.amount > currentBalance + 1e-9) {
        throw Error(wasUncertain
          ? 'The invoice or its student balance has changed. Keep the original payment reference and ask finance to review the existing payment before recording another one.'
          : 'The invoice or its student balance has changed. Close this dialog, refresh invoices, and review the payment again.');
      }
      // Persist the identity in this workspace before sending: a lost reply must never start a new payment.
      replaceDraft({ ...draftRef.current, uncertain: true }); wrote = true;
      const result = await supabase.from('payments').insert(reviewed.payment).select(PAYMENT_FIELDS).single();
      if (!current(token)) return;
      if (!result.error && matchesPendingPayment(result.data, reviewed.payment)) { confirm(reviewed); return; }
      if (result.error?.code === '23505') {
        const existing = await readReceipt(reviewed.payment);
        if (!current(token)) return;
        if (!existing.error && matchesPendingPayment(existing.data, reviewed.payment)) { confirm(reviewed); return; }
        if (!existing.error && existing.data) { conflict(); return; }
      }
      if (!wasUncertain && definitePaymentRejection(result.error)) {
        replaceDraft({ ...draftRef.current, uncertain: false });
        setError('The payment was rejected and was not recorded. Check your access and payment details before trying again.');
      } else {
        setError('The payment record was not confirmed. Keep the reviewed details and payment reference below; check the record before trying again.');
      }
    } catch (failure) {
      if (current(token)) setError(wrote ? 'The payment record was not confirmed. Check the existing record before trying again.'
        : failure instanceof Error ? failure.message : 'The invoice could not be verified. Try again.');
    } finally { if (active(token)) { operation.current = null; setBusy(false); } }
  };
  const reviewed = draft.reviewed, payment = draft.receipt?.payment ?? reviewed?.payment;
  const context = draft.receipt?.invoice ?? reviewed?.invoice ?? invoice;
  const contextBalance = studentShare(context), identityChanged = !sameInvoiceIdentity(invoice, context);
  const methodLabel = (method: string) => MANUAL_PAYMENT_METHODS.find(item => item.value === method)?.label ?? method;

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent className="w-[calc(100vw_-_2rem)] max-w-xl max-h-[calc(100dvh_-_2rem)] overflow-y-auto rounded-xl p-4 sm:p-6 [&>button:last-child]:grid [&>button:last-child]:place-items-center [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:right-1 [&>button:last-child]:top-1"
      onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); } }}>
      <DialogHeader className="pr-12 text-left">
        <DialogTitle>Record student payment</DialogTitle>
        <DialogDescription>Record an existing transfer for finance verification. A pending record does not settle the invoice or reduce its balance.</DialogDescription>
      </DialogHeader>
      <div className="min-w-0 rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="break-words font-semibold">{context.student_name}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">Invoice reference: {context.id}</p>
        {allowed && contextBalance !== null && <p className="mt-2">{draft.receipt || reviewed ? 'Student balance at review:' : 'Student balance:'} <strong>{money(contextBalance)}</strong></p>}
        {!!Number(context.sponsor_amount) && <p className="mt-1 text-xs text-muted-foreground">Agreed sponsor funding is excluded from this student balance.</p>}
      </div>
      {allowed && identityChanged && <p role="alert" className="text-sm text-destructive">The invoice's student details have changed. These payment details retain the originally reviewed student and reference. Check the existing record and ask finance to review the change before recording another payment.</p>}
      {!allowed ? <p role="alert">Your current account, centre and active role must be verified, with a finance officer or centre director membership, before recording a payment.</p>
        : draft.receipt ? <section className="space-y-3" aria-labelledby="payment-receipt-heading">
          <h2 id="payment-receipt-heading" ref={heading} tabIndex={-1} className="font-semibold focus:outline-none">Pending payment recorded</h2>
          <p className="text-sm">{money(draft.receipt.payment.amount)} · {methodLabel(draft.receipt.payment.method)}</p>
          <p className="break-words text-sm">Transaction reference: {draft.receipt.payment.reference_number}</p>
          <p className="break-all text-xs text-muted-foreground">Payment reference: {draft.receipt.payment.id}</p>
          <p className="text-sm text-muted-foreground">This confirms a pending entry only. The invoice balance is unchanged until the transfer is independently verified and applied.</p>
          <div className="flex flex-wrap gap-2"><Button className="h-auto min-h-11 whitespace-normal" onClick={() => close(false)}>Done</Button><Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => replaceDraft(freshDraft())}>New payment record</Button></div>
        </section>
        : reviewed && payment ? <section className="space-y-3" aria-labelledby="payment-review-heading">
          <h2 id="payment-review-heading" ref={heading} tabIndex={-1} className="font-semibold focus:outline-none">{draft.uncertain ? 'Payment record not confirmed' : 'Review pending payment'}</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">Amount</dt><dd className="font-semibold">{money(payment.amount)}</dd></div>
            <div><dt className="text-muted-foreground">Payment method</dt><dd>{methodLabel(payment.method)}</dd></div>
            <div><dt className="text-muted-foreground">Transaction reference</dt><dd className="break-words">{payment.reference_number}</dd></div>
            {payment.bank_name && <div><dt className="text-muted-foreground">Bank name</dt><dd className="break-words">{payment.bank_name}</dd></div>}
            {payment.sender_account && <div><dt className="text-muted-foreground">Sender account</dt><dd className="break-words">{payment.sender_account}</dd></div>}
            {payment.notes && <div><dt className="text-muted-foreground">Notes</dt><dd className="break-words whitespace-pre-wrap">{payment.notes}</dd></div>}
          </dl>
          <p className="break-all text-xs text-muted-foreground">Payment reference: {payment.id}</p>
          {draft.uncertain && <p className="text-sm text-muted-foreground">These details are kept for this invoice while you stay in this account, centre and role. Check or retry the same payment to avoid a duplicate. Keep the reference if you leave this workspace.</p>}
          <div className="flex flex-wrap gap-2">
            {draft.uncertain && <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={busy} onClick={checkReceipt}>Check payment record</Button>}
            <Button className="h-auto min-h-11 whitespace-normal" disabled={busy || draft.conflict} onClick={record}>{busy ? 'Checking payment…' : draft.uncertain ? 'Retry same payment' : 'Record pending payment'}</Button>
            {!draft.uncertain && <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={busy} onClick={() => { replaceDraft({ ...draftRef.current, reviewed: null }); setError(''); }}>Edit details</Button>}
          </div>
        </section>
        : !payable ? <p role="alert">This invoice is not available for a student payment. Refresh invoices to check its status and agreed student balance.</p>
        : <form onSubmit={review} noValidate className="space-y-4">
          <div><Label htmlFor="manual-payment-method">Payment method</Label><select id="manual-payment-method" className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={draft.method} onChange={event => replaceDraft({ ...draftRef.current, method: event.target.value as ManualPaymentMethod })}>{MANUAL_PAYMENT_METHODS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div><Label htmlFor="manual-payment-amount">Amount (PKR)</Label><Input id="manual-payment-amount" className="mt-1 min-h-11" type="text" inputMode="decimal" placeholder={balance?.toFixed(2)} value={draft.form.amount} onChange={event => change('amount', event.target.value)} aria-describedby="manual-payment-amount-help" /><p id="manual-payment-amount-help" className="mt-1 text-xs text-muted-foreground">Leave empty to record the full student balance. Use no more than two decimal places.</p></div>
          <div><Label htmlFor="manual-payment-reference">Transaction reference</Label><Input id="manual-payment-reference" className="mt-1 min-h-11" required maxLength={200} value={draft.form.reference} onChange={event => change('reference', event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Use the reference on the transfer receipt.</p></div>
          {(draft.method === 'bank_transfer' || draft.method === 'bank_alfalah') && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label htmlFor="manual-payment-bank">Bank name (optional)</Label><Input id="manual-payment-bank" className="mt-1 min-h-11" maxLength={200} value={draft.form.bankName} onChange={event => change('bankName', event.target.value)} /></div>
            <div><Label htmlFor="manual-payment-account">Sender account (optional)</Label><Input id="manual-payment-account" className="mt-1 min-h-11" maxLength={200} value={draft.form.senderAccount} onChange={event => change('senderAccount', event.target.value)} /></div>
          </div>}
          <div><Label htmlFor="manual-payment-note">Notes (optional)</Label><Textarea id="manual-payment-note" className="mt-1" maxLength={2000} rows={2} value={draft.form.notes} onChange={event => change('notes', event.target.value)} /></div>
          {!Number(invoice.sponsor_amount) && invoice.student_id && <p className="text-xs text-muted-foreground">For a card payment, the student can open this invoice from their own Fees &amp; Payments page.</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button className="h-auto min-h-11 whitespace-normal" type="button" variant="outline" onClick={() => close(false)}>Cancel</Button><Button className="h-auto min-h-11 whitespace-normal" type="submit">Review pending payment</Button></div>
        </form>}
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="break-words text-sm text-muted-foreground">{message}</p>}
    </DialogContent>
  </Dialog>;
}
