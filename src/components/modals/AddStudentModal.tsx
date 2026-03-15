import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddStudentModal({ open, onOpenChange }: AddStudentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      toast({
        title: 'Student Added',
        description: 'New student record has been created successfully.',
      });
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>Enter student details to create a new record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input placeholder="Ahmed" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input placeholder="Raza" className="mt-1" required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" placeholder="ahmed@example.com" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Phone (WhatsApp)</Label>
            <Input placeholder="+92 300 1234567" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Programme</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select programme...</option>
              <option value="l4-business">Level 4 Business Management (OTHM)</option>
              <option value="l5-business">Level 5 Business Management (OTHM)</option>
              <option value="l4-computing">Level 4 Computing (QUALIFI)</option>
              <option value="l5-computing">Level 5 Computing (QUALIFI)</option>
              <option value="l3-accounting">Level 3 Accounting (IAB)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">CNIC Number</Label>
            <Input placeholder="12345-1234567-1" className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
