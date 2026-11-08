import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useToast} from '@/hooks/use-toast';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {canWriteFinanceRecords} from '@/lib/finance/access';
import {pagedRows} from '@/lib/pagedRows';
import {
  confirmedInvoiceReceipt, formatInvoiceAmount, invoiceAccount, reviewInvoice,
  INVOICE_ACCOUNT_COLUMNS, INVOICE_RECEIPT_COLUMNS, STUDENT_INVOICE_TYPES,
  type InvoiceAccount, type InvoiceForm, type ReviewedInvoice,
} from '@/lib/finance/invoiceCreation';

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

type Verification = {status: 'idle' | 'checking' | 'verified' | 'error'; account?: InvoiceAccount; message?: string};
type Pending = 'review' | 'create' | 'check';
const emptyForm = (): InvoiceForm => ({studentId: '', type: 'tuition', amount: '', instalments: '1', dueDate: ''});

export default function CreateInvoiceModal(props: CreateInvoiceModalProps) {
  const {user, loading} = useAuth();
  return <InvoiceWorkspace key={JSON.stringify([user?.id, user?.tenantId, user?.role, user?.roles, loading])} {...props}/>;
}

function InvoiceWorkspace({open, onOpenChange, onCreated}: CreateInvoiceModalProps) {
  const {toast} = useToast();
  const {user, loading: authLoading} = useAuth();
  const active = !authLoading && !!user?.id && !!user?.tenantId
    && canWriteFinanceRecords(user);
  const tenant = user?.tenantId || '';
  const fieldId = useId();
  const [form, setForm] = useState<InvoiceForm>(emptyForm);
  const [accounts, setAccounts] = useState<InvoiceAccount[]>([]);
  const [lookup, setLookup] = useState<'loading' | 'ready' | 'error'>('loading');
  const [lookupError, setLookupError] = useState('');
  const [lookupRetry, setLookupRetry] = useState(0), [verificationRetry, setVerificationRetry] = useState(0);
  const [verification, setVerification] = useState<Verification>({status: 'idle'});
  const [search, setSearch] = useState('');
  const [reviewed, setReviewed] = useState<ReviewedInvoice | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [issue, setIssue] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const mounted = useRef(true), operation = useRef<object | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null), heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  useEffect(() => {
    if (open && reviewed) {
      if (content.current) content.current.scrollTop = 0;
      heading.current?.focus({preventScroll: true});
    }
  }, [open, reviewed]);

  useEffect(() => {
    if (!open || !active || reviewed) return;
    let current = true;
    setLookup('loading'); setLookupError(''); setAccounts([]); setVerification({status: 'idle'});
    void pagedRows<unknown>(() => supabase.from('profiles').select(INVOICE_ACCOUNT_COLUMNS).eq('tenant_id', tenant), () => current, 'user_id')
      .then(rows => {
        if (!current) return;
        const parsed = rows.map(row => invoiceAccount(row, tenant));
        if (parsed.some(row => row === null) || new Set(parsed.map(row => row?.user_id)).size !== parsed.length) {
          throw Error('The centre account list could not be verified.');
        }
        setAccounts((parsed as InvoiceAccount[]).sort((a, b) => a.full_name.localeCompare(b.full_name) || a.user_id.localeCompare(b.user_id)));
        setLookup('ready');
      })
      .catch(() => {if (current) {setAccounts([]); setLookup('error'); setLookupError('Centre accounts could not be loaded. Retry the lookup before choosing a student.');}});
    return () => {current = false;};
  }, [open, active, tenant, lookupRetry, reviewed]);

  const verifyStudent = useCallback(async (id: string): Promise<InvoiceAccount> => {
    const [profile, membership] = await Promise.all([
      supabase.from('profiles').select(INVOICE_ACCOUNT_COLUMNS).eq('tenant_id', tenant).eq('user_id', id).maybeSingle(),
      supabase.rpc('has_role', {_user_id: id, _role: 'student'}),
    ]);
    if (profile.error) throw Error('The selected account details could not be checked. Retry the account check.');
    const account = invoiceAccount(profile.data, tenant);
    if (!account || account.user_id !== id) throw Error('This account is no longer available in the selected centre. Choose another account.');
    if (membership.error || typeof membership.data !== 'boolean') throw Error('The student role could not be verified. Retry the account check.');
    if (!membership.data) throw Error('This account does not have a verified student role. Choose the student who should receive this charge.');
    return account;
  }, [tenant]);

  useEffect(() => {
    if (!open || !active || reviewed || lookup !== 'ready' || !form.studentId) return;
    let current = true;
    const selected = accounts.find(account => account.user_id === form.studentId);
    if (!selected) {setVerification({status: 'error', message: 'The selected account is no longer in this centre. Choose an available account.'}); return;}
    setVerification({status: 'checking'});
    void verifyStudent(selected.user_id).then(account => {
      if (current) setVerification({status: 'verified', account});
    }).catch(error => {
      if (current) setVerification({status: 'error', message: error instanceof Error ? error.message : 'The student account could not be verified. Retry the account check.'});
    });
    return () => {current = false;};
  }, [open, active, tenant, reviewed, lookup, accounts, form.studentId, verificationRetry, verifyStudent]);

  const change = (field: keyof InvoiceForm, value: string) => {
    if (operation.current || reviewed) return;
    setIssue('');
    if (field === 'studentId') setVerification({status: 'idle'});
    setForm(previous => ({...previous, [field]: value}));
  };
  const close = (next: boolean) => {
    if (!next && operation.current) return;
    // An unresolved request remains available when this modal is reopened in the same workspace.
    onOpenChange(next);
  };

  async function prepareReview(event: React.FormEvent) {
    event.preventDefault();
    if (!active || operation.current || reviewed || lookup !== 'ready' || verification.status !== 'verified' || !verification.account) return;
    const snapshot = {...form};
    const ticket = {}; operation.current = ticket; setPending('review'); setIssue('');
    try {
      // Validate before reading again; then bind the review to fresh account details.
      const id = crypto.randomUUID();
      reviewInvoice(snapshot, verification.account, tenant, id);
      const account = await verifyStudent(snapshot.studentId);
      if (!mounted.current || operation.current !== ticket) return;
      setReviewed(reviewInvoice(snapshot, account, tenant, id));
      setUncertain(false);
    } catch (error) {
      if (mounted.current && operation.current === ticket) setIssue(error instanceof Error ? error.message : 'The invoice could not be reviewed. Check the student account and try again.');
    } finally {
      if (mounted.current && operation.current === ticket) {operation.current = null; setPending(null);}
    }
  }

  async function createOrCheck(checkOnly = false) {
    if (!active || operation.current || !reviewed || reviewed.tenant_id !== tenant) return;
    const target = reviewed, wasUncertain = uncertain;
    const ticket = {}; operation.current = ticket; setPending(checkOnly ? 'check' : 'create'); setIssue('');
    const current = () => mounted.current && operation.current === ticket;
    let confirmed = false;
    try {
      let found = false;
      if (wasUncertain || checkOnly) {
        const existing = await supabase.from('invoices').select(INVOICE_RECEIPT_COLUMNS)
          .eq('tenant_id', target.tenant_id).eq('student_id', target.student_id).eq('id', target.id).maybeSingle();
        if (!current()) return;
        if (existing.error) throw Error('Invoice status could not be checked. The reviewed invoice is kept; retry the status check.');
        if (existing.data !== null) {
          if (!confirmedInvoiceReceipt(existing.data, target)) throw Error('The returned invoice does not match the reviewed student and charge. Keep this reference and ask your finance lead to check it.');
          confirmed = true; found = true;
        } else if (checkOnly) {
          setIssue('No matching invoice is visible yet. Creation is still unconfirmed. Retry the same invoice to keep the original reference and avoid another charge.');
        }
      }
      if (!found && !checkOnly) {
        const account = await verifyStudent(target.student_id);
        if (!current()) return;
        if (account.full_name !== target.student_name) throw Error('The student account details have changed since review. Check the account before creating this invoice.');
        // Once sent, keep this UUID and payload even if the response is lost or incomplete.
        setUncertain(true);
        const result = await supabase.from('invoices').insert(target).select(INVOICE_RECEIPT_COLUMNS).maybeSingle();
        if (!current()) return;
        if (result.error) throw Error('Invoice creation was not confirmed. Check its status before retrying the same invoice.');
        if (!confirmedInvoiceReceipt(result.data, target)) throw Error('Invoice creation returned no matching receipt. Your reviewed charge is kept; check its status or retry the same invoice.');
        confirmed = true;
      }
    } catch (error) {
      if (current()) setIssue(error instanceof Error ? error.message : 'Invoice creation could not be confirmed. Your reviewed details are kept.');
    } finally {
      if (current()) {operation.current = null; setPending(null);}
    }
    if (confirmed && mounted.current) {
      setReviewed(null); setUncertain(false); setIssue(''); setForm(emptyForm()); setSearch(''); setVerification({status: 'idle'});
      toast({title: 'Invoice created', description: formatInvoiceAmount(target.amount) + ' is linked to ' + target.student_name + "'s student account."});
      onOpenChange(false);
      onCreated?.();
    }
  }

  const filtered = accounts.filter(account => (account.full_name + ' ' + account.user_id).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  // Keep the selected option visible when a subsequent search no longer matches it.
  const selectedAccount = accounts.find(account => account.user_id === form.studentId);
  const options = selectedAccount && !filtered.some(account => account.user_id === selectedAccount.user_id) ? [selectedAccount, ...filtered] : filtered;
  const busy = pending !== null;

  return <Dialog open={open} onOpenChange={close}>
    <DialogContent ref={content} className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-lg p-4 text-sm sm:p-6 [&>button:last-child]:grid [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11 [&>button:last-child]:place-items-center [&>button:last-child]:right-1 [&>button:last-child]:top-1"
      onOpenAutoFocus={() => {if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;}}
      onCloseAutoFocus={event => {if (opener.current?.isConnected) {event.preventDefault(); opener.current.focus();}}}
      onEscapeKeyDown={event => {if (operation.current) event.preventDefault();}}
      onInteractOutside={event => {if (operation.current) event.preventDefault();}}>
      <DialogHeader className="pr-12 text-left">
        <DialogTitle ref={heading} tabIndex={-1} className="leading-snug">{reviewed ? 'Review student invoice' : 'Create student invoice'}</DialogTitle>
        <DialogDescription>Link the charge to the correct student account so it appears in their fees.</DialogDescription>
      </DialogHeader>
      {!active ? <div className="space-y-4"><p role={authLoading ? 'status' : 'alert'}>{authLoading ? 'Verifying your finance access…' : 'Invoice creation requires verified finance officer or centre director membership in your assigned centre and an active finance, director or superadmin role. Superadmin access alone is read-only.'}</p><Button variant="outline" onClick={() => close(false)}>Close</Button></div>
        : reviewed ? <section aria-label="Reviewed student invoice" className="min-w-0 space-y-4">
          <div className="rounded-lg border p-3">
            <p className="font-semibold">{reviewed.student_name}</p>
            <dl className="mt-3 space-y-3">
              <div><dt className="text-muted-foreground">Student account reference</dt><dd className="break-all">{reviewed.student_id}</dd></div>
              <div><dt className="text-muted-foreground">Charge</dt><dd>{STUDENT_INVOICE_TYPES[reviewed.type]}</dd></div>
              <div><dt className="text-muted-foreground">Amount</dt><dd className="break-words font-semibold">{formatInvoiceAmount(reviewed.amount)}</dd></div>
              <div><dt className="text-muted-foreground">Instalments</dt><dd>{reviewed.instalments} {reviewed.instalments === 1 ? 'payment' : 'payments'}</dd></div>
              <div><dt className="text-muted-foreground">Due date</dt><dd>{reviewed.due_date || 'No due date set'}</dd></div>
              <div><dt className="text-muted-foreground">Invoice reference</dt><dd className="break-all">{reviewed.id}</dd></div>
            </dl>
          </div>
          <p>{uncertain ? 'Creation is not confirmed. These reviewed details are kept with the same invoice reference while you check or retry.' : 'Confirm the student, charge and payment terms before creating the invoice.'}</p>
          {issue && <p role="alert" className="rounded-lg border border-destructive p-3">{issue}</p>}
          {busy && <p role="status">{pending === 'check' ? 'Checking the reviewed invoice…' : 'Verifying and creating the reviewed invoice…'}</p>}
          <div className="flex flex-wrap gap-2">
            {uncertain ? <>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={busy} onClick={() => void createOrCheck(true)}>Check invoice status</Button>
              <Button type="button" className="w-full sm:w-auto" disabled={busy} onClick={() => void createOrCheck()}>Retry same invoice</Button>
              <Button type="button" variant="ghost" className="w-full sm:w-auto" disabled={busy} onClick={() => close(false)}>Close and keep recovery</Button>
            </> : <>
              <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={busy} onClick={() => {setReviewed(null); setIssue('');}}>Back to details</Button>
              <Button type="button" className="w-full sm:w-auto" disabled={busy} onClick={() => void createOrCheck()}>Create reviewed invoice</Button>
            </>}
          </div>
        </section> : <form onSubmit={event => void prepareReview(event)} aria-label="New student invoice" className="min-w-0 space-y-4">
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <legend className="sr-only">Invoice details</legend>
            <div className="space-y-2">
              <Label htmlFor={fieldId + '-search'} className="text-sm">Find a centre account</Label>
              <Input id={fieldId + '-search'} type="search" value={search} maxLength={120} disabled={lookup !== 'ready'} onChange={event => setSearch(event.target.value)} placeholder="Name or account reference"/>
              <Label htmlFor={fieldId + '-student'} className="block text-sm">Student account</Label>
              <select id={fieldId + '-student'} className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base" value={form.studentId} disabled={lookup !== 'ready'} required onChange={event => change('studentId', event.target.value)} aria-describedby={fieldId + '-account-status'}>
                <option value="">Choose the student's account</option>
                {options.map(account => <option key={account.user_id} value={account.user_id}>{account.full_name} — {account.user_id}</option>)}
              </select>
              <div id={fieldId + '-account-status'} className="space-y-2">
                {lookup === 'loading' && <p role="status">Loading centre accounts…</p>}
                {lookup === 'error' && <><p role="alert">{lookupError}</p><Button type="button" variant="outline" onClick={() => setLookupRetry(value => value + 1)}>Retry account lookup</Button></>}
                {lookup === 'ready' && !accounts.length && <p>No centre accounts are available. Ask your centre administrator to add the student account.</p>}
                {lookup === 'ready' && !!accounts.length && !filtered.length && <p>No accounts match this search. Try the student's name or account reference.</p>}
                {verification.status === 'checking' && <p role="status">Checking the selected student's account…</p>}
                {verification.status === 'error' && <><p role="alert">{verification.message}</p><Button type="button" variant="outline" onClick={() => setVerificationRetry(value => value + 1)}>Retry student check</Button></>}
                {verification.status === 'verified' && <div><p role="status">Student account verified: <strong>{verification.account?.full_name}</strong>.</p><p className="mt-1 break-all text-muted-foreground">Account reference: {verification.account?.user_id}</p></div>}
              </div>
              <p className="text-muted-foreground">The selected account's student role is checked. Course enrolment and fee approval must be checked separately.</p>
            </div>
            <div>
              <Label htmlFor={fieldId + '-type'} className="text-sm">Invoice type</Label>
              <select id={fieldId + '-type'} className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base" value={form.type} onChange={event => change('type', event.target.value)}>
                {Object.entries(STUDENT_INVOICE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p className="mt-2 text-muted-foreground">Commission records are managed under University Referrals.</p>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0"><Label htmlFor={fieldId + '-amount'} className="text-sm">Amount (PKR)</Label><Input id={fieldId + '-amount'} className="mt-1" inputMode="decimal" autoComplete="off" placeholder="1200.00" required maxLength={13} value={form.amount} onChange={event => change('amount', event.target.value)}/></div>
              <div className="min-w-0"><Label htmlFor={fieldId + '-instalments'} className="text-sm">Instalments</Label><select id={fieldId + '-instalments'} className="mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base" value={form.instalments} onChange={event => change('instalments', event.target.value)}>
                <option value="1">Full payment</option><option value="2">2 payments</option><option value="4">4 payments</option><option value="6">6 payments</option>
              </select></div>
            </div>
            <div><Label htmlFor={fieldId + '-due'} className="text-sm">Due date (optional)</Label><Input id={fieldId + '-due'} className="mt-1 [color-scheme:light] dark:[color-scheme:dark]" type="date" value={form.dueDate} onChange={event => change('dueDate', event.target.value)}/></div>
          </fieldset>
          {issue && <p role="alert" className="rounded-lg border border-destructive p-3">{issue}</p>}
          {pending === 'review' && <p role="status">Checking the student account before review…</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={busy} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={busy || lookup !== 'ready' || verification.status !== 'verified'}>Review invoice</Button>
          </div>
        </form>}
    </DialogContent>
  </Dialog>;
}
