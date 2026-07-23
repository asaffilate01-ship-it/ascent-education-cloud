import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const CATEGORIES = [
  { value: 'cloud_hosting', label: 'Cloud / Hosting' },
  { value: 'api_services', label: 'API Services' },
  { value: 'development', label: 'Development' },
  { value: 'staff_salary', label: 'Staff Salary' },
  { value: 'staff_bonus', label: 'Staff Bonus' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'utility', label: 'Utility Bills' },
  { value: 'rent', label: 'Rent' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone / Mobile' },
  { value: 'fuel', label: 'Fuel / Transport' },
  { value: 'travel', label: 'Travel' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'software_licenses', label: 'Software Licenses' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legal', label: 'Legal' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'agent_commission', label: 'Agent Commission' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'bank_charges', label: 'Bank Charges' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'raast', label: 'Raast' },
  { value: 'nayapay', label: 'NayaPay' },
  { value: 'sadapay', label: 'SadaPay' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'petty_cash', label: 'Petty Cash' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
  tenantId?: string | null;
}

export default function AddExpenseModal({ open, onOpenChange, onCreated, tenantId }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'miscellaneous',
    description: '',
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    vendor_name: '',
    expense_date: new Date().toISOString().slice(0, 10),
    paid_by_name: '',
    is_reimbursable: false,
    agent_name: '',
    student_name: '',
    commission_percentage: '',
    is_recurring: false,
    recurring_frequency: '' as string,
    notes: '',
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.description || !form.amount) {
      toast({ title: 'Required', description: 'Description and amount are required.' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('expenses' as any).insert({
        tenant_id: tenantId || null,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || null,
        vendor_name: form.vendor_name || null,
        expense_date: form.expense_date,
        paid_by_user_id: user?.id,
        paid_by_name: form.paid_by_name || user?.user_metadata?.full_name || user?.email,
        is_reimbursable: form.is_reimbursable,
        reimbursement_status: form.is_reimbursable ? 'pending' : 'not_applicable',
        agent_name: form.category === 'agent_commission' ? form.agent_name : null,
        student_name: form.category === 'agent_commission' ? form.student_name : null,
        commission_percentage: form.category === 'agent_commission' && form.commission_percentage ? parseFloat(form.commission_percentage) : null,
        is_recurring: form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency || null : null,
        notes: form.notes || null,
        created_by: user?.id,
        status: 'approved',
      } as any);
      if (error) throw error;
      toast({ title: 'Expense Added', description: `Rs.${parseFloat(form.amount).toLocaleString()} recorded.` });
      onCreated();
      onOpenChange(false);
      setForm({ category: 'miscellaneous', description: '', amount: '', payment_method: 'bank_transfer', payment_reference: '', vendor_name: '', expense_date: new Date().toISOString().slice(0, 10), paid_by_name: '', is_reimbursable: false, agent_name: '', student_name: '', commission_percentage: '', is_recurring: false, recurring_frequency: '', notes: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount (Rs.) *</Label>
              <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="h-9" placeholder="0.00" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Description *</Label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} className="h-9" placeholder="e.g. AWS monthly hosting fee" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference / Receipt #</Label>
              <Input value={form.payment_reference} onChange={e => set('payment_reference', e.target.value)} className="h-9" placeholder="TXN-12345" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vendor / Payee</Label>
              <Input value={form.vendor_name} onChange={e => set('vendor_name', e.target.value)} className="h-9" placeholder="AWS, Twilio, etc." />
            </div>
            <div>
              <Label className="text-xs">Expense Date</Label>
              <Input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Paid By (Person)</Label>
              <Input value={form.paid_by_name} onChange={e => set('paid_by_name', e.target.value)} className="h-9" placeholder="Name of person who paid" />
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_reimbursable} onCheckedChange={v => set('is_reimbursable', v)} />
                <Label className="text-xs">Reimbursable</Label>
              </div>
            </div>
          </div>

          {form.category === 'agent_commission' && (
            <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/30">
              <p className="text-xs font-semibold text-primary">Agent Commission Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Agent Name</Label>
                  <Input value={form.agent_name} onChange={e => set('agent_name', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Student Name</Label>
                  <Input value={form.student_name} onChange={e => set('student_name', e.target.value)} className="h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Commission %</Label>
                <Input type="number" value={form.commission_percentage} onChange={e => set('commission_percentage', e.target.value)} className="h-9" placeholder="e.g. 10" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={form.is_recurring} onCheckedChange={v => set('is_recurring', v)} />
            <Label className="text-xs">Recurring Expense</Label>
            {form.is_recurring && (
              <Select value={form.recurring_frequency} onValueChange={v => set('recurring_frequency', v)}>
                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Additional notes..." />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
