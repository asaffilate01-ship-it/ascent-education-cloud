import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const STAFF_ROLES = [
  { value: 'admissions_admin', label: 'Admissions Admin' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'programme_leader', label: 'Programme Leader' },
  { value: 'iqa_officer', label: 'IQA / QA Officer' },
  { value: 'exams_officer', label: 'Exams Officer' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'marketing_officer', label: 'Marketing Officer' },
  { value: 'agent', label: 'Agent' },
];

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffAdded?: () => void;
}

export default function AddStaffModal({ open, onOpenChange, onStaffAdded }: AddStaffModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('lecturer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !role) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('invite-staff', {
        body: { email, fullName, role },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to invite staff');
      if (res.data?.error) throw new Error(res.data.error);

      toast({ title: 'Staff Invited', description: `${fullName} has been invited as ${STAFF_ROLES.find(r => r.value === role)?.label}.` });
      setFullName('');
      setEmail('');
      setRole('lecturer');
      onOpenChange(false);
      onStaffAdded?.();
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
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>Invite a new staff member by email. They will receive an invitation to set up their account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Dr. Ahmed Khan" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Email Address</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@example.com" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              {STAFF_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {loading ? 'Inviting...' : 'Invite Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
