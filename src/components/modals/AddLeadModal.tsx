import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddLeadModal({ open, onOpenChange }: AddLeadModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onOpenChange(false);
      toast({
        title: 'Lead Created',
        description: 'New lead has been added to the pipeline.',
      });
    }, 800);
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
              <Input placeholder="Fatima Noor" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input placeholder="+92 301 2345678" className="mt-1" required />
            </div>
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" placeholder="fatima@example.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Interested Programme</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">Select...</option>
              <option value="l4-business">Level 4 Business Management</option>
              <option value="l5-business">Level 5 Business Management</option>
              <option value="l4-computing">Level 4 Computing</option>
              <option value="l5-computing">Level 5 Computing</option>
              <option value="l3-accounting">Level 3 Accounting</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Lead Source</Label>
            <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="facebook">Facebook Ad</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="walkin">Walk-in</option>
              <option value="referral">Agent Referral</option>
              <option value="webinar">Webinar</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Input placeholder="E.g. Wants instalment plan" className="mt-1" />
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
