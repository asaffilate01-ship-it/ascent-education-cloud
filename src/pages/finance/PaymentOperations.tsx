import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {db} from '@/lib/db';
import {useAuth} from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import {Button} from '@/components/ui/button';

type Source = 'invoice' | 'institutional';
type Payment = {id: string; invoice_id?: string; amount: number; method: string; reference_number: string | null; status: string; created_at: string; verified_at?: string | null; currency?: string; bank_reference?: string | null};
const PAGE_SIZE = 25;

export default function PaymentOperations() {
  const {user} = useAuth();
  const permitted = user && ['finance_officer', 'centre_director', 'superadmin'].includes(user.role);
  return <DashboardLayout title="Payment Operations" subtitle="Recorded invoice payments and institutional transactions">
    {!permitted ? <p role="alert">A finance role is required to view payment records.</p> : !user.tenantId ?
      <p role="alert">A centre assignment is required to view payment records.</p> :
      <PaymentLedger key={`${user.id}:${user.tenantId}:${user.role}`} tenant={user.tenantId} />}
  </DashboardLayout>;
}

function PaymentLedger({tenant}: {tenant: string}) {
  const [source, setSource] = useState<Source>('invoice');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const requestKey = `${source}:${status}:${page}:${refresh}`;
  const [result, setResult] = useState<{key: string; rows: Payment[]; count: number; error: boolean} | null>(null);
  const current = result?.key === requestKey ? result : null;
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let query = db.from(source === 'invoice' ? 'payments' : 'education_payment_transactions')
          .select(source === 'invoice' ? 'id,invoice_id,amount,method,reference_number,status,created_at,verified_at' :
            'id,amount:amount_pkr,method:payment_rail,reference_number:provider_reference,status,created_at:initiated_at,currency,bank_reference', {count: 'exact'})
          .eq('tenant_id', tenant);
        if (status !== 'all') query = query.eq('status', status);
        const response = await query.order(source === 'invoice' ? 'created_at' : 'initiated_at', {ascending: false})
          .order('id', {ascending: false}).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (response.error || !Array.isArray(response.data) || !Number.isInteger(response.count) || response.count < 0) throw new Error('Unavailable');
        if (active) setResult({key: requestKey, rows: response.data, count: response.count, error: false});
      } catch {
        if (active) setResult({key: requestKey, rows: [], count: 0, error: true});
      }
    };
    void load();
    return () => {active = false;};
  }, [tenant, source, status, page, refresh, requestKey]);
  const statuses = source === 'invoice' ? ['pending', 'verified', 'rejected'] : ['initiated', 'pending', 'authorised', 'settled', 'failed', 'reversed', 'refunded'];
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3 items-end">
      <label className="text-sm">Ledger
        <select aria-label="Ledger" className="block rounded border bg-background p-2 mt-1" value={source} onChange={e => {setSource(e.target.value as Source); setStatus('all'); setPage(0);}}>
          <option value="invoice">Invoice payments</option><option value="institutional">Institutional transactions</option>
        </select>
      </label>
      <label className="text-sm">Status
        <select aria-label="Status" className="block rounded border bg-background p-2 mt-1" value={status} onChange={e => {setStatus(e.target.value); setPage(0);}}>
          <option value="all">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>Refresh payments</Button>
      <Button asChild variant="outline"><Link to="/finance">Review invoices</Link></Button>
    </div>
    <p className="text-sm text-muted-foreground">{source === 'invoice' ?
      'Invoice payments include manual records awaiting verification and payments recorded by the Stripe callback. Pending records do not confirm funds received.' :
      'Institutional transactions use a separate ledger. These records are not combined with invoice payments and do not confirm that a provider is connected.'}</p>
    {!current ? <p role="status">Loading payment records…</p> : current.error ?
      <div role="alert"><p>Payment records could not be loaded. Totals are unavailable.</p><Button variant="outline" onClick={() => setRefresh(value => value + 1)}>Retry payments</Button></div> : <>
        <p className="text-sm">{current.count} matching records · Page {page + 1}</p>
        {current.rows.length === 0 ? <p>{current.count === 0 ? 'No payment records match this ledger and status.' : 'No records remain on this page. Return to the previous page or refresh.'}</p> :
          <div className="surface-card overflow-x-auto"><table className="w-full text-sm">
            <caption className="sr-only">{source === 'invoice' ? 'Invoice payments' : 'Institutional transactions'}</caption>
            <thead><tr>{['Recorded', 'Invoice / transaction', 'Method', 'Reference', 'Amount', 'Status', 'Verified'].map(label => <th key={label} scope="col" className="p-3 text-left whitespace-nowrap">{label}</th>)}</tr></thead>
            <tbody>{current.rows.map(row => <tr key={row.id} className="border-t">
              <td className="p-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
              <td className="p-3 font-mono break-all">{row.invoice_id || row.id}</td>
              <td className="p-3">{row.method?.replace(/_/g, ' ') || 'Unavailable'}</td>
              <td className="p-3 break-all">{row.reference_number || row.bank_reference || 'No reference'}</td>
              <td className="p-3 whitespace-nowrap">{source === 'invoice' ? 'PKR' : row.currency || 'Currency unavailable'} {row.amount !== null && Number.isFinite(Number(row.amount)) ? Number(row.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'Unavailable'}</td>
              <td className="p-3"><StatusBadge status={row.status} /></td>
              <td className="p-3 whitespace-nowrap">{row.verified_at ? new Date(row.verified_at).toLocaleString() : '—'}</td>
            </tr>)}</tbody>
          </table></div>}
        <div className="flex gap-2"><Button variant="outline" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous page</Button>
          <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= current.count} onClick={() => setPage(value => value + 1)}>Next page</Button></div>
      </>}
  </div>;
}
