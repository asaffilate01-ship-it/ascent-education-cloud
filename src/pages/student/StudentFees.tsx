import {db} from '@/lib/db';
import {feeLiability} from '@/lib/feeLiability';
import {canUseActiveRole} from '@/lib/roleMembership';
import {paymentMinorUnits} from '@/lib/finance/paymentReceipt';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { CreditCard, Receipt, Landmark, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

interface Invoice {
  sponsor_amount?:number;sponsor_paid?:number;sponsor_name?:string;
  id: string;
  type: string | null;
  amount: number;
  paid: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

const fmt = (n: number) => `Rs. ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-primary/10 text-primary',
  partial: 'bg-accent text-accent-foreground',
  pending: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

export default function StudentFees() {
  const {user,loading}=useAuth();
  return <FeesWorkspace key={`${user?.id}:${user?.tenantId}:${user?.role}:${user?.roles?.join(',')}:${loading}`}/>;
}
function FeesWorkspace(){
  const { user, loading:authLoading } = useAuth();
  const allowed=!authLoading&&!!user?.id&&!!user.tenantId&&canUseActiveRole(user,['student']);
  const alive=useRef(true),starting=useRef(false);
  const filter=useRef<HTMLSelectElement>(null);
  useLayoutEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [page,setPage]=useState(0),[status,setStatus]=useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const outcome = params.get('payment');
    if (outcome === 'success') {
      toast('Payment verification pending', { description: 'Returning from checkout does not confirm payment. Your invoice updates after the payment provider and finance records are verified.' });
      const next=new URLSearchParams(params);next.delete('payment');
      setParams(next, { replace: true });
    } else if (outcome === 'cancelled') {
      toast('Checkout closed', { description: 'Payment status has not been confirmed. Check your invoice and payment provider before trying again.' });
      const next=new URLSearchParams(params);next.delete('payment');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    let active = true;
    setInvoices([]);setLoadError('');setLoading(true);setPage(0);
    if(!allowed){setLoading(!!authLoading);setLoadError(authLoading?'':'Sign in with your verified student account and active student role to view your invoices.');return;}
    (async () => {
      try {
        const records:Invoice[]=[];
        for(let offset=0;;offset+=250){
          const r=await db.rpc('get_unipathway_my_fee_invoices').range(offset,offset+249);
          if(!active||!alive.current)return;
          if(r.error||!Array.isArray(r.data))throw Error('Fee data unavailable');
          records.push(...r.data);if(r.data.length<250)break;
        }
        records.forEach(feeLiability);
        if(records.some(i=>!i||typeof i.id!=='string'||!i.id||typeof i.amount!=='number'||[i.amount,i.paid??0,i.sponsor_amount??0,i.sponsor_paid??0].some(n=>paymentMinorUnits(n)===null)||!['paid','partial','pending','overdue','refunded'].includes(i.status)))throw Error('Unverified invoices');
        if(new Set(records.map(i=>i.id)).size!==records.length)throw Error('Duplicate invoice references');
        if(active)setInvoices(records.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')||a.id.localeCompare(b.id)));
      }catch{if(active)setLoadError('Your invoices could not be verified. Balances and payment actions are unavailable until the records load successfully.');}
      finally{if(active)setLoading(false);}
    })();
    return () => { active = false; };
  }, [user?.id,user?.tenantId,allowed,authLoading,refresh]);

  const visible=invoices.filter(i=>!status||i.status===status);
  const billable=invoices.filter(i=>i.status!=='refunded');
  const currentPage=Math.min(page,Math.max(0,Math.ceil(visible.length/20)-1));
  const resetFilter=()=>{setStatus('');setPage(0);filter.current?.focus();};

  const totalBilled = billable.reduce((s, i) => s + feeLiability(i).studentTotal, 0);
  const totalPaid = billable.reduce((s, i) => s + Number(i.paid ?? 0), 0);
  const outstanding = billable.reduce((sum,i)=>sum+feeLiability(i).studentDue,0);

  const payNow = async (invoice: Invoice) => {
    if(!allowed||!alive.current||starting.current||loading||payingId||loadError||Number(invoice.sponsor_amount)||feeLiability(invoice).studentDue<=0||!['pending','partial','overdue'].includes(invoice.status))return;
    starting.current=true;setPayingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { invoiceId: invoice.id },
      });
      if(!alive.current)return;
      if (error) throw error;
      if (typeof data?.url==='string') {
        const target=new URL(data.url);
        if(target.origin!=='https://checkout.stripe.com'||target.username||target.password)throw new Error('Payment destination could not be verified. Contact finance.');
        window.location.href = target.href;
        return;
      }
      throw new Error(data?.error || 'Card payments are not available yet.');
    } catch (e) {
      if(!alive.current)return;
      toast.error('Could not start payment', {
        description: e instanceof Error ? e.message : 'Please try again or contact the finance office.',
      });
    } finally {
      starting.current=false;if(alive.current)setPayingId(null);
    }
  };

  return (
    <DashboardLayout title="Fees & Payments" subtitle="Your invoices, balance and payment options">
      <p className="mb-3 text-sm text-muted-foreground">These totals show your agreed share of recorded, non-refunded invoices. Approved sponsor funding is excluded from your debt even when the sponsor has not yet paid. Your agreed course fee may include charges not yet invoiced; contact finance for the full fee agreement.</p>
      <Button className="mb-4 h-auto min-h-11 whitespace-normal" variant="outline" disabled={!allowed||loading||!!payingId} onClick={()=>setRefresh(v=>v+1)}>Refresh invoices</Button>
      {loading ? (
        <DashboardSkeleton />
      ) : loadError ? (<div role="alert" className="rounded-xl border border-destructive p-4"><p>{loadError}</p>{allowed&&<Button className="mt-3 h-auto min-h-11 whitespace-normal" variant="outline" onClick={()=>setRefresh(x=>x+1)}>Retry invoices</Button>}</div>) : (
        <div className="space-y-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
            {[
              { label: 'Your agreed share', value: fmt(totalBilled), icon: Receipt },
              { label: 'Paid to date', value: fmt(totalPaid), icon: CheckCircle2 },
              { label: 'Your outstanding balance', value: fmt(outstanding), icon: AlertTriangle },
            ].map((s) => (
              <div key={s.label} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
                <p className="break-words text-2xl font-bold text-foreground mt-2">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Your invoices</h2>
            </div>
            <div className="space-y-2 p-4"><label htmlFor="student-invoice-status" className="block text-sm font-medium">Invoice status</label><select ref={filter} id="student-invoice-status" className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:max-w-xs" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All invoices</option>{['pending','partial','overdue','paid','refunded'].map(s=><option key={s}>{s}</option>)}</select><p role="status" className="text-sm text-muted-foreground">{visible.length} {visible.length===1?'invoice':'invoices'} {status?'match this status':'available'}</p></div>
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No invoices yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invoices appear here once the finance office raises them.
                </p>
              </div>
            ) : !visible.length ? <div className="space-y-3 border-t p-4"><p>No invoices match this status.</p><Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={resetFilter}>Show all invoices</Button></div> : (
              <ul className="divide-y divide-border">
                {visible.slice(currentPage*20,currentPage*20+20).map((inv) => {
                  const balance = feeLiability(inv).studentDue;
                  return (
                    <li key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {inv.type ?? 'tuition'} invoice
                        </p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">Invoice reference: {inv.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(Number(inv.amount))}
                          {balance > 0 && balance !== Number(inv.amount) && ` · ${fmt(balance)} outstanding`}
                          {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString('en-GB')}`}
                        </p>
                        {!!Number(inv.sponsor_amount)&&<p className="mt-2 text-sm">{inv.sponsor_name}: {fmt(Number(inv.sponsor_amount))} agreed funding · {fmt(feeLiability(inv).sponsorDue)} awaiting sponsor payment. Your remaining share: {fmt(balance)}. Contact finance to arrange payment of your share.</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${STATUS_STYLES[Number(inv.sponsor_amount)>0&&balance<=0?'paid':inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {Number(inv.sponsor_amount)>0&&balance<=0?'Your share settled':inv.status}
                        </span>
                        {balance > 0 && !Number(inv.sponsor_amount) && ['pending','partial','overdue'].includes(inv.status) && (
                          <Button size="sm" className="h-auto min-h-11 whitespace-normal" disabled={!!payingId} onClick={() => payNow(inv)}>
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            {payingId === inv.id ? 'Starting…' : 'Pay now'}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {visible.length>20&&<nav aria-label="Invoice pages" className="flex flex-wrap items-center gap-3"><Button className="h-auto min-h-11 whitespace-normal" variant="outline" disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>Previous invoices</Button><span role="status" className="text-sm">Page {currentPage+1} of {Math.ceil(visible.length/20)}</span><Button className="h-auto min-h-11 whitespace-normal" variant="outline" disabled={(currentPage+1)*20>=visible.length} onClick={()=>setPage(currentPage+1)}>Next invoices</Button></nav>}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Prefer a local transfer?</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contact the finance office for the payment methods and verified account details available for your centre.
              Confirm your invoice reference and currency before transferring. A transfer reference alone does not
              confirm that payment has been received or applied to your invoice.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
