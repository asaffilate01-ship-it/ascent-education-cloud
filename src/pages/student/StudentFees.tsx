import { useEffect, useState } from 'react';
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
  const { user } = useAuth();
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
    setInvoices([]);setLoadError('');setLoading(true);
    if(!user?.id){setLoading(false);setLoadError('Sign in to view your invoices.');return;}
    (async () => {
      try {
        const {data,error}=await supabase.from('invoices')
          .select('id, type, amount, paid, status, due_date, created_at')
          .eq('student_id',user.id).order('created_at',{ascending:false});
        if(error)throw error;
        if(active)setInvoices((data as Invoice[])??[]);
      }catch{if(active)setLoadError('Your invoices could not be verified. Balances and payment actions are unavailable until the records load successfully.');}
      finally{if(active)setLoading(false);}
    })();
    return () => { active = false; };
  }, [user?.id,refresh]);

  const billable=invoices.filter(i=>i.status!=='refunded');

  const totalBilled = billable.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = billable.reduce((s, i) => s + Number(i.paid ?? 0), 0);
  const outstanding = billable.reduce((sum,i)=>sum+Math.max(0,Number(i.amount)-Number(i.paid??0)),0);

  const payNow = async (invoice: Invoice) => {
    if(payingId||loadError||!['pending','partial','overdue'].includes(invoice.status))return;
    setPayingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error || 'Card payments are not available yet.');
    } catch (e) {
      toast.error('Could not start payment', {
        description: e instanceof Error ? e.message : 'Please try again or contact the finance office.',
      });
    } finally {
      setPayingId(null);
    }
  };

  return (
    <DashboardLayout title="Fees & Payments" subtitle="Your invoices, balance and payment options">
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
                {invoices.map((inv) => {
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
