import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Banknote, Building2, Smartphone, CreditCard } from 'lucide-react';

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: { id: string; student_name: string; amount: number; paid: number; tenant_id: string | null } | null;
  onRecorded?: () => void;
}

const METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, desc: 'Manual bank wire' },
  { value: 'raast', label: 'Raast', icon: Banknote, desc: 'SBP Raast ID transfer' },
  { value: 'nayapay', label: 'NayaPay', icon: Smartphone, desc: 'NayaPay wallet' },
  { value: 'sadapay', label: 'SadaPay', icon: Smartphone, desc: 'SadaPay wallet' },
  { value: 'bank_alfalah', label: 'Bank Alfalah', icon: Building2, desc: 'Alfalah gateway' },
  { value: 'stripe', label: 'Stripe (Card)', icon: CreditCard, desc: 'International card' },
] as const;

export default function RecordPaymentModal({ open, onOpenChange, invoice, onRecorded }: RecordPaymentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<string>('bank_transfer');
  const [form, setForm] = useState({ amount: '', reference: '', bankName: '', senderAccount: '', notes: '' });

  const balance = invoice ? Number(invoice.amount) - Number(invoice.paid) : 0;

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setLoading(true);
    try {
      if (method === 'stripe') {
        // Invoke Stripe checkout for this invoice
        const resp = await supabase.functions.invoke('create-checkout', {
          body: { invoiceId: invoice.id, amount: Number(form.amount) || balance },
        });
        if (resp.error) throw resp.error;
        if (resp.data?.url) {
          window.open(resp.data.url, '_blank');
          onOpenChange(false);
          toast({ title: 'Redirecting to Stripe', description: 'Complete payment in the new tab.' });
          return;
        }
      }

      // For all non-Stripe methods, record the payment manually
      const { error } = await supabase.from('payments').insert({
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        amount: Number(form.amount) || balance,
        method: method as any,
        reference_number: form.reference || null,
        bank_name: form.bankName || null,
        sender_account: form.senderAccount || null,
        notes: form.notes || null,
        status: 'pending',
      });
      if (error) throw error;
      onOpenChange(false);
      setForm({ amount: '', reference: '', bankName: '', senderAccount: '', notes: '' });
      toast({ title: 'Payment Recorded', description: 'Payment recorded and pending verification by finance team.' });
      onRecorded?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {invoice.student_name} — Balance: Rs.{balance.toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        {/* Method selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {METHODS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                method === m.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground'
              }`}
            >
              <m.icon className="w-4 h-4" />
              <span className="font-medium">{m.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Amount (Rs.)</Label>
            <Input
              type="number"
              placeholder={balance.toString()}
              className="mt-1"
              value={form.amount}
              onChange={e => handleChange('amount', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Leave empty to pay full balance</p>
          </div>

          {method !== 'stripe' && (
            <>
              <div>
                <Label className="text-xs">
                  {method === 'raast' ? 'Raast ID / IBAN' : method === 'nayapay' || method === 'sadapay' ? 'Transaction ID' : 'Reference Number'}
                </Label>
                <Input
                  placeholder={method === 'raast' ? 'PK00XXXX...' : 'TXN-XXXXX'}
                  className="mt-1"
                  required
                  value={form.reference}
                  onChange={e => handleChange('reference', e.target.value)}
                />
              </div>

              {(method === 'bank_transfer' || method === 'bank_alfalah') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bank Name</Label>
                    <Input
                      placeholder={method === 'bank_alfalah' ? 'Bank Alfalah' : 'HBL, MCB...'}
                      className="mt-1"
                      value={form.bankName}
                      onChange={e => handleChange('bankName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sender Account</Label>
                    <Input placeholder="Account number" className="mt-1" value={form.senderAccount} onChange={e => handleChange('senderAccount', e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea placeholder="Any additional details..." rows={2} className="mt-1" value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : method === 'stripe' ? 'Pay with Card' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
