import {pagedRows} from '@/lib/pagedRows';
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { CreditCard, Receipt, Landmark, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

interface Invoice {
  id: string;
  type: string | null;
  amount: number;
  paid: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

const fmt = (n: number) => `Rs. ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-primary/10 text-primary',
  partial: 'bg-accent text-accent-foreground',
  pending: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
};

export default function StudentFees() {
  const {user}=useAuth();
  return <FeesWorkspace key={`${user?.id}:${user?.tenantId}:${user?.roles?.join(',')}`}/>;
}
function FeesWorkspace(){
  const { user } = useAuth();
  const alive=useRef(true),starting=useRef(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
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
      params.delete('payment');
      setParams(params, { replace: true });
    } else if (outcome === 'cancelled') {
      toast('Checkout closed', { description: 'Payment status has not been confirmed. Check your invoice and payment provider before trying again.' });
      params.delete('payment');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    let active = true;
    setInvoices([]);setLoadError('');setLoading(true);setPage(0);
    if(!user?.id||!user?.tenantId){setLoading(false);setLoadError('Sign in to view your invoices.');return;}
    (async () => {
      try {
        const records=await pagedRows<Invoice>(()=>supabase.from('invoices')
          .select('id, type, amount, paid, status, due_date, created_at')
          .eq('student_id',user.id).eq('tenant_id',user.tenantId),()=>active);
        if(records.some(i=>!i||typeof i.id!=='string'||!Number.isFinite(i.amount)||i.amount<0||(i.paid!=null&&(!Number.isFinite(i.paid)||i.paid<0))||!['paid','partial','pending','overdue','refunded'].includes(i.status)))throw Error('Unverified invoices');
        if(active)setInvoices(records.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')||a.id.localeCompare(b.id)));
      }catch{if(active)setLoadError('Your invoices could not be verified. Balances and payment actions are unavailable until the records load successfully.');}
      finally{if(active)setLoading(false);}
    })();
    return () => { active = false; };
  }, [user?.id,user?.tenantId,refresh]);

  const visible=invoices.filter(i=>!status||i.status===status);
  const billable=invoices.filter(i=>i.status!=='refunded');

  const totalBilled = billable.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = billable.reduce((s, i) => s + Number(i.paid ?? 0), 0);
  const outstanding = billable.reduce((sum,i)=>sum+Math.max(0,Number(i.amount)-Number(i.paid??0)),0);

  const payNow = async (invoice: Invoice) => {
    if(starting.current||loading||payingId||loadError||!['pending','partial','overdue'].includes(invoice.status))return;
    starting.current=true;setPayingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { invoiceId: invoice.id },
      });
      if(!alive.current)return;
      if (error) throw error;
      if (typeof data?.url==='string') {
        const target=new URL(data.url);
        if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com'||target.username||target.password)throw new Error('Payment destination could not be verified. Contact finance.');
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
      <p className="mb-3 text-sm text-muted-foreground">These totals cover recorded, non-refunded invoices only. Your agreed course fee may include charges not yet invoiced; contact finance for the full fee agreement.</p>
      <Button className="mb-4" variant="outline" disabled={loading||!!payingId} onClick={()=>setRefresh(v=>v+1)}>Refresh invoices</Button>
      {loading ? (
        <DashboardSkeleton />
      ) : loadError ? (<div role="alert" className="rounded-xl border border-destructive p-4"><p>{loadError}</p><Button className="mt-3" variant="outline" onClick={()=>setRefresh(x=>x+1)}>Retry invoices</Button></div>) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total billed', value: fmt(totalBilled), icon: Receipt },
              { label: 'Paid to date', value: fmt(totalPaid), icon: CheckCircle2 },
              { label: 'Outstanding', value: fmt(outstanding), icon: AlertTriangle },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-bold text-foreground">Your invoices</h2>
            </div>
            <label className="block p-4">Invoice status<select className="ml-3 rounded border bg-background p-2" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">All invoices</option>{['pending','partial','overdue','paid','refunded'].map(s=><option key={s}>{s}</option>)}</select></label>
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground">No invoices yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invoices appear here once the finance office raises them.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visible.slice(page*20,page*20+20).map((inv) => {
                  const balance = Number(inv.amount) - Number(inv.paid ?? 0);
                  return (
                    <li key={inv.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {inv.type ?? 'tuition'} invoice
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(Number(inv.amount))}
                          {balance > 0 && balance !== Number(inv.amount) && ` · ${fmt(balance)} outstanding`}
                          {inv.due_date && ` · due ${new Date(inv.due_date).toLocaleDateString('en-GB')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${STATUS_STYLES[inv.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {inv.status}
                        </span>
                        {balance > 0 && ['pending','partial','overdue'].includes(inv.status) && (
                          <Button size="sm" disabled={!!payingId} onClick={() => payNow(inv)}>
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

          {!!invoices.length&&!visible.length&&<p>No invoices match this status.</p>}
          {visible.length>20&&<nav aria-label="Invoice pages" className="flex items-center gap-3"><Button disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous invoices</Button><span>Page {page+1} of {Math.ceil(visible.length/20)}</span><Button disabled={(page+1)*20>=visible.length} onClick={()=>setPage(p=>p+1)}>Next invoices</Button></nav>}
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
