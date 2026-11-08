import {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {Banknote, Download, FileText, Loader2, Search} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import CreateInvoiceModal from '@/components/modals/CreateInvoiceModal';
import RecordPaymentModal, {type InvoicePaymentTarget} from '@/components/modals/RecordPaymentModal';
import ExpenseManagement from '@/components/finance/ExpenseManagement';
import ReferralIncomeTracker from '@/components/finance/ReferralIncomeTracker';
import UniversityCommissionLedger from '@/components/finance/UniversityCommissionLedger';
import {useAuth} from '@/contexts/AuthContext';
import {useToast} from '@/hooks/use-toast';
import {useSupabaseQuery} from '@/hooks/useSupabaseQuery';
import {supabase} from '@/integrations/supabase/client';
import type {Tables} from '@/integrations/supabase/types';
import {feeLiability} from '@/lib/feeLiability';
import {matchesLocalSearch} from '@/lib/localSearch';
import {canWriteFinanceRecords} from '@/lib/finance/access';

type Invoice = Tables<'invoices'>;
const PAGE_SIZE = 20;
const STATUSES = ['pending', 'partial', 'overdue', 'paid', 'refunded'];
const TYPES = ['tuition', 'exam', 'deposit', 'commission'];
const fmt = (amount: number) => 'PKR ' + amount.toLocaleString('en-PK', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' =>
  status === 'paid' ? 'success' : status === 'partial' ? 'info' : status === 'overdue' ? 'danger' : status === 'refunded' ? 'neutral' : 'warning';

function dueDate(value: string | null) {
  if (!value) return 'Not specified';
  const date = new Date(value + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? 'Date requires review' :
    date.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
}

export default function FinanceDashboard() {
  const {user, loading: authLoading}=useAuth();
  return <FinanceWorkspace key={[user?.id,user?.tenantId,user?.role,user?.roles?.join(','),authLoading].join(':')}/>;
}

function FinanceWorkspace() {
  const {user, loading: authLoading}=useAuth();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoicePaymentTarget | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true), exportLock = useRef(false);
  const {toast} = useToast();
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  const allowed=!authLoading&&!!user?.id&&!!user.tenantId&&user.roles?.includes(user.role)&&['finance_officer','centre_director','superadmin'].includes(user.role);
  const canWrite = allowed && canWriteFinanceRecords(user);
  const {data: invoices, loading, error, refetch} = useSupabaseQuery('invoices', {
    enabled:allowed,
    select:'id,student_id,student_name,tenant_id,type,amount,paid,sponsor_amount,sponsor_paid,status,due_date,created_at',
    filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId||''}],
    orderBy: {column: 'created_at', ascending: false},
  });

  const verified = useMemo(() => {
    if (!allowed || loading || error) return {rows: [] as Invoice[], error: ''};
    try {
      const seen = new Set<string>();
      for (const invoice of invoices) {
        if (!invoice || typeof invoice.id !== 'string' || !invoice.id || seen.has(invoice.id) ||
          invoice.tenant_id !== user?.tenantId || typeof invoice.student_name !== 'string' ||
          !invoice.student_name.trim() || !STATUSES.includes(invoice.status) || !TYPES.includes(invoice.type) ||
          typeof invoice.amount !== 'number' || typeof invoice.paid !== 'number' ||
          (invoice.student_id !== null && typeof invoice.student_id !== 'string')) throw new Error('Unverified invoice');
        feeLiability(invoice);
        seen.add(invoice.id);
      }
      return {rows: invoices, error: ''};
    } catch {
      return {rows: [] as Invoice[], error: 'Some invoice identities or balances could not be verified. Totals and payment actions are unavailable until finance reviews the records.'};
    }
  }, [allowed, invoices, loading, error, user?.tenantId]);
  const rows = verified.rows;
  const dataError = error ? 'Invoice data could not be loaded. Balances are unavailable.' : verified.error;
  const active = rows.filter(invoice => invoice.status !== 'refunded');
  const studentCharges = active.filter(invoice => invoice.type !== 'commission');
  const totalBilled = studentCharges.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalCollected = studentCharges.reduce((sum, invoice) => sum + invoice.paid + Number(invoice.sponsor_paid || 0), 0);
  // Keep the existing expense-view input separate from the new student-charge summary.
  const expenseViewReceipts = rows.reduce((sum, invoice) => sum + invoice.paid + Number(invoice.sponsor_paid || 0), 0);
  const overdue = studentCharges.filter(invoice => invoice.status === 'overdue').reduce((sum, invoice) => sum + feeLiability(invoice).totalDue, 0);
  const recordedCommissions = active.filter(invoice => invoice.type === 'commission').reduce((sum, invoice) => sum + invoice.amount, 0);
  const missingAccounts = studentCharges.filter(invoice => !invoice.student_id).length;
  const filtered = rows.filter(invoice =>
    (statusFilter === 'all' || invoice.status === statusFilter) &&
    (typeFilter === 'all' || invoice.type === typeFilter) &&
    matchesLocalSearch(invoice.student_name + ' ' + invoice.id, search));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pageIndex, pageCount - 1);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const reportCount = rows.filter(invoice => statusFilter === 'all' || invoice.status === statusFilter).length;
  const reportTooLarge = reportCount > 5000;

  function resetFilters() {
    setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setPageIndex(0);
    searchRef.current?.focus();
  }
  function canRecord(invoice: Invoice) {
    return canWrite && !!invoice.student_id && invoice.type !== 'commission' &&
      ['pending', 'partial', 'overdue'].includes(invoice.status) && feeLiability(invoice).studentDue > 0;
  }
  function openPayment(invoice: Invoice) {
    if (!canRecord(invoice) || invoice.tenant_id !== user?.tenantId) return;
    // Preserve the stored student/sponsor split; the payment form verifies it again before a write.
    setSelectedInvoice({
      id: invoice.id, student_id: invoice.student_id, student_name: invoice.student_name,
      tenant_id: invoice.tenant_id, amount: invoice.amount, paid: invoice.paid,
      sponsor_amount: invoice.sponsor_amount, sponsor_paid: invoice.sponsor_paid, status: invoice.status,
    });
    setPaymentOpen(true);
  }
  async function handleExportCSV() {
    if (!allowed || !user?.tenantId || loading || dataError || reportTooLarge || !reportCount || exportLock.current) return;
    exportLock.current = true; setExporting(true); setExportError('');
    try {
      const response = await supabase.functions.invoke('export-report', {
        body: {reportType: 'invoices', tenantId:user.tenantId, filters: statusFilter !== 'all' ? {status: statusFilter} : undefined},
      });
      if (!alive.current) return;
      if (response.error) throw response.error;
      const value = response.data;
      const csv = typeof value === 'string' ? value : value instanceof Blob ? await value.text() :
        value instanceof ArrayBuffer ? new TextDecoder().decode(value) : typeof value?.csv === 'string' ? value.csv : '';
      if (!alive.current) return;
      if (!csv.includes(',') || !csv.includes('\n') || csv.trimStart().startsWith('{') || csv.trimStart().startsWith('[')) {
        throw new Error('The report service did not return a verified CSV document.');
      }
      const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
      const link = document.createElement('a');
      link.href = url; link.download = 'invoices-export-' + new Date().toISOString().slice(0, 10) + '.csv';
      link.click(); URL.revokeObjectURL(url);
      toast({title: 'Invoice report downloaded', description: 'The centre report follows the selected status. Search, invoice type and page filters apply to this screen only.'});
    } catch (reason) {
      if (alive.current) setExportError(reason instanceof Error ? reason.message : 'The invoice report could not be downloaded. Try again.');
    } finally {
      exportLock.current = false;
      if (alive.current) setExporting(false);
    }
  }

  if (authLoading) return <DashboardLayout title="Finance"><p role="status">Verifying your finance workspace…</p></DashboardLayout>;
  if (!allowed) return <DashboardLayout title="Finance"><p role="alert">A verified finance or centre leadership role with an assigned centre is required.</p></DashboardLayout>;

  const paymentAction = (invoice: Invoice) => canRecord(invoice) ?
    <Button variant="outline" className="w-full xl:w-auto" onClick={() => openPayment(invoice)} aria-label={'Record student payment for ' + invoice.student_name + ', invoice ' + invoice.id}>
      <Banknote aria-hidden="true"/>Record student payment
    </Button> : invoice.type === 'commission' ?
      <p className="text-sm text-muted-foreground">Review through commission operations.</p> : !invoice.student_id ?
        <p className="text-sm text-muted-foreground">Account link missing. Finance review required before recording a student payment.</p> :
        !canWrite && ['pending', 'partial', 'overdue'].includes(invoice.status) && feeLiability(invoice).studentDue > 0 ?
        <p className="text-sm text-muted-foreground">Read-only access. Ask an authorised finance officer or centre director to record payment evidence.</p> :
        <p className="text-sm text-muted-foreground">{invoice.status === 'refunded' ? 'Refunded invoice' : 'No student payment due'}</p>;

  return <DashboardLayout title="Finance Dashboard" subtitle="Student invoices, payment evidence and recorded commission invoices"
    actions={<Button onClick={() => setInvoiceOpen(true)} disabled={!canWrite || loading || !!dataError}><FileText aria-hidden="true"/>New student invoice</Button>}>
    <div className="space-y-5 text-base">
      <p className="max-w-prose text-sm text-muted-foreground">Link each new student invoice to the correct account. A recorded payment reference stays pending until verified; it does not reduce a learner’s balance by itself.</p>
      {!canWrite && <p role="status" className="rounded-lg border p-4 text-sm">Your current account can review centre invoices. Creating invoices or recording payments requires a verified Finance Officer or Centre Director membership in this centre; Platform Owner access alone does not grant those writes.</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void refetch()} disabled={loading}>Refresh invoices</Button>
        {user?.role === 'finance_officer' && <Button asChild variant="outline"><Link to="/finance/payments">Review payment records</Link></Button>}
        {user?.role !== 'superadmin' && <Button asChild variant="outline"><Link to={user?.role === 'centre_director' ? '/director/funding' : '/finance/funding'}>Review sponsor funding</Link></Button>}
      </div>
      {loading ? <p role="status">Loading authorised centre invoices…</p> : dataError ?
        <section role="alert" className="space-y-3 rounded-xl border border-destructive p-4"><p>{dataError}</p><Button variant="outline" onClick={() => void refetch()}>Retry invoices</Button></section> :
        <Tabs defaultValue="revenue" className="space-y-5">
          <TabsList aria-label="Finance sections" className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="revenue" className="min-h-11 min-w-0 whitespace-normal px-3 py-2">Student invoices</TabsTrigger>
            <TabsTrigger value="expenses" className="min-h-11 min-w-0 whitespace-normal px-3 py-2">Expenses</TabsTrigger>
            <TabsTrigger value="referrals" className="min-h-11 min-w-0 whitespace-normal px-3 py-2">University referrals</TabsTrigger>
          </TabsList>
          <TabsContent value="revenue" className="space-y-5">
            <section aria-label="Recorded invoice summary" className="space-y-3">
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3">
                {[
                  {label: 'Student charges billed', value: totalBilled},
                  {label: 'Recorded payments', value: totalCollected},
                  {label: 'Overdue student invoices', value: overdue},
                  {label: 'Recorded commission invoices', value: recordedCommissions},
                ].map(item => <div key={item.label} className="min-w-0 rounded-xl border bg-card p-4">
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="mt-2 break-words text-2xl font-semibold tabular-nums">{fmt(item.value)}</dd>
                </div>)}
              </dl>
              <p className="text-sm text-muted-foreground">Totals cover all loaded, non-refunded invoices in this centre. Student charges and their payments exclude commission invoices. Commission invoices are recorded amounts, not proof of earned or payable commission.</p>
            </section>
            {missingAccounts > 0 && <p role="status" className="rounded-lg border p-4 text-sm">{missingAccounts} existing student invoice(s) have no linked account. A matching name alone cannot make them visible in a learner’s fees page. Finance must review those account links.</p>}
            <section aria-label="Find invoices" className="space-y-3">
              <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
                <label className="min-w-0 text-sm font-medium" htmlFor="invoice-search">Search by learner or invoice reference
                  <span className="relative mt-1 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"/>
                    <Input id="invoice-search" ref={searchRef} value={search} onChange={event => {setSearch(event.target.value); setPageIndex(0);}} className="pl-9" placeholder="Name or full invoice reference"/></span>
                </label>
                <div className="min-w-0 text-sm font-medium"><label htmlFor="finance-invoice-status">Invoice status</label>
                  <select id="finance-invoice-status" className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2" value={statusFilter} onChange={event => {setStatusFilter(event.target.value); setPageIndex(0);}}>
                    <option value="all">All statuses</option>{STATUSES.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
                <div className="min-w-0 text-sm font-medium"><label htmlFor="finance-invoice-type">Invoice type</label>
                  <select id="finance-invoice-type" className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 py-2" value={typeFilter} onChange={event => {setTypeFilter(event.target.value); setPageIndex(0);}}>
                    <option value="all">All types</option>{TYPES.map(value => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={resetFilters} disabled={!search && statusFilter === 'all' && typeFilter === 'all'}>Clear invoice filters</Button>
                <Button variant="outline" onClick={() => void handleExportCSV()} disabled={exporting || reportTooLarge || !reportCount}>
                  {exporting ? <Loader2 aria-hidden="true" className="animate-spin"/> : <Download aria-hidden="true"/>}Export centre invoice report
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">The export follows the status filter only. Search, invoice type and pagination apply to this screen.</p>
              {reportTooLarge && <p role="status" className="text-sm">The report service supports up to 5,000 invoices at a time. Choose a smaller status group or ask finance for a complete audited export.</p>}
              {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
            </section>
            <section aria-labelledby="invoice-list-title" className="space-y-3">
              <h2 id="invoice-list-title" className="text-lg font-semibold">Invoices ({filtered.length})</h2>
              {!rows.length ? <div className="space-y-2 rounded-xl border bg-card p-5"><h3 className="font-semibold">No invoices yet</h3><p className="text-sm text-muted-foreground">Create a student invoice after choosing a verified account in this centre.</p></div> :
                !filtered.length ? <div className="space-y-3 rounded-xl border bg-card p-5"><h3 className="font-semibold">No invoices match these filters</h3><p className="text-sm text-muted-foreground">Try another name or invoice reference, or clear the filters.</p><Button variant="outline" onClick={resetFilters}>Show all invoices</Button></div> : <>
                  <ul className="space-y-3 xl:hidden">{visible.map(invoice => {
                    const liability = feeLiability(invoice);
                    return <li key={invoice.id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{invoice.student_name}</h3><StatusBadge status={invoice.status} variant={statusVariant(invoice.status)}/></div>
                      <p className="text-sm text-muted-foreground">Invoice reference: <span className="break-all">{invoice.id}</span></p>
                      <p className="text-sm capitalize">{invoice.type} · due {dueDate(invoice.due_date)}</p>
                      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 text-sm">
                        <div><dt className="text-muted-foreground">{invoice.type === 'commission' ? 'Recorded amount' : 'Student share due'}</dt><dd className="mt-1 break-words font-semibold tabular-nums">{fmt(invoice.type === 'commission' ? invoice.amount : liability.studentDue)}</dd></div>
                        {invoice.type !== 'commission' && <div><dt className="text-muted-foreground">Sponsor share due</dt><dd className="mt-1 break-words font-semibold tabular-nums">{fmt(liability.sponsorDue)}</dd></div>}
                      </dl>
                      {paymentAction(invoice)}
                    </li>;
                  })}</ul>
                  <div className="hidden rounded-xl border bg-card xl:block">
                    <div className="overflow-x-auto" role="region" aria-label="Invoice table" tabIndex={0}>
                      <table className="w-full min-w-[68rem] table-fixed text-sm"><caption className="sr-only">Centre invoices, student and sponsor shares, and payment recording</caption>
                        <colgroup>{['24%', '9%', '14%', '14%', '15%', '24%'].map((width, index) => <col key={index} style={{width}}/>)}</colgroup>
                        <thead><tr className="border-b">{['Learner / invoice', 'Type', 'Student share due', 'Sponsor share due', 'Status / due date', 'Action'].map(label => <th key={label} scope="col" className="p-3 text-left font-semibold">{label}</th>)}</tr></thead>
                        <tbody>{visible.map(invoice => {
                          const liability = feeLiability(invoice);
                          return <tr key={invoice.id} className="border-b last:border-0">
                            <th scope="row" className="max-w-[20rem] p-3 text-left font-normal"><span className="block break-words font-semibold">{invoice.student_name}</span><span className="mt-1 block break-all text-sm text-muted-foreground">{invoice.id}</span>{!invoice.student_id && invoice.type !== 'commission' && <span className="mt-1 block text-sm">Account link missing</span>}</th>
                            <td className="p-3 capitalize">{invoice.type}</td>
                            <td className="p-3 tabular-nums">{invoice.type === 'commission' ? 'Separate commission record' : fmt(liability.studentDue)}</td>
                            <td className="p-3 tabular-nums">{invoice.type === 'commission' ? '—' : fmt(liability.sponsorDue)}</td>
                            <td className="p-3"><StatusBadge status={invoice.status} variant={statusVariant(invoice.status)}/><span className="mt-2 block">{dueDate(invoice.due_date)}</span></td>
                            <td className="min-w-[11rem] p-3">{paymentAction(invoice)}</td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                  {pageCount > 1 && <nav aria-label="Invoice pages" className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" disabled={page === 0} onClick={() => setPageIndex(page - 1)}>Previous invoices</Button>
                    <p role="status" className="text-sm">Page {page + 1} of {pageCount} · {filtered.length} matching invoices</p>
                    <Button variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPageIndex(page + 1)}>Next invoices</Button>
                  </nav>}
                </>}
            </section>
          </TabsContent>
          <TabsContent value="expenses"><ExpenseManagement tenantId={user?.tenantId || null} totalRevenue={expenseViewReceipts}/></TabsContent>
          <TabsContent value="referrals" className="space-y-4">
            {user?.tenantId && <UniversityCommissionLedger tenant={user.tenantId}/>}
            <details className="rounded-xl border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">Legacy referral records</summary>
              <p className="my-3 text-sm text-muted-foreground">Historical manually entered records are unverified and excluded from the signed-agreement commission ledger. Do not combine currencies or treat them as earned university commissions.</p>
              <ReferralIncomeTracker tenantId={user?.tenantId || null}/>
            </details>
          </TabsContent>
        </Tabs>}
    </div>
    <CreateInvoiceModal open={invoiceOpen} onOpenChange={setInvoiceOpen} onCreated={refetch}/>
    <RecordPaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} invoice={selectedInvoice} onRecorded={refetch}/>
  </DashboardLayout>;
}
