import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentAdded?: () => void;
}

export default function AddStudentModal({ open, onOpenChange, onStudentAdded }: AddStudentModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [programme, setProgramme] = useState('');
  const [programmes, setProgrammes] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from('programmes').select('id, title').eq('status', 'active').then(({ data }) => {
        setProgrammes(data || []);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;

    setLoading(true);
    try {
      const studentName = `${firstName} ${lastName}`.trim();
      const selectedProg = programmes.find(p => p.id === programme);

      const { error } = await supabase.from('applications').insert({
        student_name: studentName,
        email,
        phone: phone || null,
        programme_id: programme || null,
        programme_name: selectedProg?.title || null,
        tenant_id: user?.tenantId || null,
        stage: 'lead',
        source: 'manual_entry',
      });

      if (error) throw error;

      toast({ title: 'Student Added', description: `${studentName} has been added as a new application.` });
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setProgramme('');
      onOpenChange(false);
      onStudentAdded?.();
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
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>Enter student details to create a new application record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ahmed" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Raza" className="mt-1" required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@example.com" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Phone (WhatsApp)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+92 300 1234567" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Programme</Label>
            <select
              value={programme}
              onChange={e => setProgramme(e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select programme...</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {loading ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
