import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type InvoiceType = Database['public']['Enums']['invoice_type'];

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function CreateInvoiceModal({ open, onOpenChange, onCreated }: CreateInvoiceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentName: '',
    type: 'tuition' as InvoiceType,
    amount: '',
    instalments: '1',
    dueDate: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('invoices').insert({
        student_name: form.studentName,
        type: form.type,
        amount: Number(form.amount),
        instalments: Number(form.instalments),
        due_date: form.dueDate || null,
        tenant_id: user?.tenantId || null,
      });
      if (error) throw error;
      onOpenChange(false);
      setForm({ studentName: '', type: 'tuition', amount: '', instalments: '1', dueDate: '' });
      toast({ title: 'Invoice Created', description: 'Invoice has been generated successfully.' });
      onCreated?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>Generate a new invoice for a student.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Student Name</Label>
            <Input placeholder="Sara Ali" className="mt-1" required value={form.studentName} onChange={(e) => handleChange('studentName', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Invoice Type</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.type} onChange={(e) => handleChange('type', e.target.value)}>
              <option value="tuition">Tuition Fee</option>
              <option value="exam">Exam Fee</option>
              <option value="deposit">Deposit</option>
              <option value="commission">Agent Commission</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (£)</Label>
              <Input type="number" placeholder="1200" className="mt-1" required value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Instalments</Label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.instalments} onChange={(e) => handleChange('instalments', e.target.value)}>
                <option value="1">Full payment</option>
                <option value="2">2 payments</option>
                <option value="4">4 monthly</option>
                <option value="6">6 monthly</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" className="mt-1" value={form.dueDate} onChange={(e) => handleChange('dueDate', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
