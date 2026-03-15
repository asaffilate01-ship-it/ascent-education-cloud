import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateInvoiceModal({ open, onOpenChange }: CreateInvoiceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      toast({
        title: 'Invoice Created',
        description: 'Invoice INV-008 has been generated and sent.',
      });
    }, 800);
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
            <Label className="text-xs">Student</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select student...</option>
              <option value="sara">Sara Ali</option>
              <option value="omar">Omar Farooq</option>
              <option value="hassan">Hassan Ali</option>
              <option value="zara">Zara Sheikh</option>
              <option value="ayesha">Ayesha Khan</option>
              <option value="ali">Ali Raza</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Invoice Type</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="tuition">Tuition Fee</option>
              <option value="exam">Exam Fee</option>
              <option value="deposit">Deposit</option>
              <option value="commission">Agent Commission</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (£)</Label>
              <Input type="number" placeholder="1200" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Instalments</Label>
              <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="1">Full payment</option>
                <option value="2">2 payments</option>
                <option value="4">4 monthly</option>
                <option value="6">6 monthly</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input type="date" className="mt-1" required />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input placeholder="E.g. Term 1 tuition" className="mt-1" />
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
