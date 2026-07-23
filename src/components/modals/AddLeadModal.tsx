import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export default function AddLeadModal({ open, onOpenChange, onCreated }: AddLeadModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentName: '',
    phone: '',
    email: '',
    programme: '',
    source: 'facebook',
    notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('applications').insert({
        student_name: form.studentName,
        email: form.email || `${form.studentName.toLowerCase().replace(/\s/g, '.')}@placeholder.com`,
        phone: form.phone,
        programme_name: form.programme,
        source: form.source,
        notes: form.notes || null,
        stage: 'lead',
        tenant_id: user?.tenantId || null,
      });
      if (error) throw error;
      onOpenChange(false);
      setForm({ studentName: '', phone: '', email: '', programme: '', source: 'facebook', notes: '' });
      toast({ title: 'Lead Created', description: 'New lead has been added to the pipeline.' });
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
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Capture a new prospective student inquiry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input placeholder="Fatima Noor" className="mt-1" required value={form.studentName} onChange={(e) => handleChange('studentName', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input placeholder="+92 301 2345678" className="mt-1" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" placeholder="fatima@example.com" className="mt-1" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Interested Programme</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required value={form.programme} onChange={(e) => handleChange('programme', e.target.value)}>
              <option value="">Select...</option>
              <option value="Level 4 Business Management">Level 4 Business Management</option>
              <option value="Level 5 Business Management">Level 5 Business Management</option>
              <option value="Level 4 Computing">Level 4 Computing</option>
              <option value="Level 5 Computing">Level 5 Computing</option>
              <option value="Level 3 Accounting">Level 3 Accounting</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Lead Source</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.source} onChange={(e) => handleChange('source', e.target.value)}>
              <option value="Facebook Ad">Facebook Ad</option>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Agent Referral">Agent Referral</option>
              <option value="Webinar">Webinar</option>
              <option value="Website">Website</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input placeholder="E.g. Wants instalment plan" className="mt-1" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
