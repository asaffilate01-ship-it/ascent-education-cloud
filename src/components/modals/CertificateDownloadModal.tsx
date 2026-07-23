import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Loader2 } from 'lucide-react';

interface CertificateDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  programmeName?: string;
}

export default function CertificateDownloadModal({ open, onOpenChange, studentName = '', programmeName = '' }: CertificateDownloadModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentName,
    programmeName,
    awardingBody: 'OTHM',
    grade: '',
    completionDate: '',
    certificateType: 'completion',
  });

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await supabase.functions.invoke('generate-certificate', {
        body: {
          studentName: form.studentName,
          programmeName: form.programmeName,
          awardingBody: form.awardingBody,
          grade: form.grade || undefined,
          completionDate: form.completionDate || undefined,
          certificateType: form.certificateType,
        },
      });
      if (resp.error) throw resp.error;
      const { html, certificateId } = resp.data;

      // Open certificate HTML in a new tab for printing/saving as PDF
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.onload = () => {
          setTimeout(() => win.print(), 500);
        };
      }
      URL.revokeObjectURL(url);
      toast({ title: 'Certificate Generated', description: `Certificate ${certificateId} is ready. Use your browser's print dialog to save as PDF.` });
      onOpenChange(false);
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
          <DialogTitle>Generate Certificate</DialogTitle>
          <DialogDescription>Create an official certificate for download / print.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleGenerate} className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Student Name</Label>
            <Input required className="mt-1" value={form.studentName} onChange={e => handleChange('studentName', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Programme Name</Label>
            <Input required className="mt-1" value={form.programmeName} onChange={e => handleChange('programmeName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Awarding Body</Label>
              <Select value={form.awardingBody} onValueChange={v => handleChange('awardingBody', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OTHM">OTHM</SelectItem>
                  <SelectItem value="Qualifi">Qualifi</SelectItem>
                  <SelectItem value="ATHE">ATHE</SelectItem>
                  <SelectItem value="NCFE">NCFE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Certificate Type</Label>
              <Select value={form.certificateType} onValueChange={v => handleChange('certificateType', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="merit">Merit</SelectItem>
                  <SelectItem value="distinction">Distinction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Grade (optional)</Label>
              <Input placeholder="e.g. 78%" className="mt-1" value={form.grade} onChange={e => handleChange('grade', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Completion Date</Label>
              <Input type="date" className="mt-1" value={form.completionDate} onChange={e => handleChange('completionDate', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Generate & Print
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
