import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onSuccess: () => void;
  children?: React.ReactNode;
}

export default function OnboardTenantModal({ onSuccess, children }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    plan: 'starter' as 'starter' | 'professional' | 'enterprise',
    brand_name: '',
    primary_color: '#8B1538',
    accent_color: '#D4A853',
  });

  const handleSlug = (name: string) => {
    setForm(f => ({
      ...f,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) return;
    setSaving(true);
    const { error } = await supabase.from('tenants').insert({
      name: form.name,
      slug: form.slug,
      plan: form.plan,
      brand_name: form.brand_name || form.name,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      status: 'onboarding',
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Centre Created', description: `${form.name} is now onboarding.` });
      setOpen(false);
      setForm({ name: '', slug: '', plan: 'starter', brand_name: '', primary_color: '#8B1538', accent_color: '#D4A853' });
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button size="sm"><Building2 className="w-3.5 h-3.5 mr-1.5" />Onboard Centre</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Onboard New Centre</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Centre Name *</Label>
            <Input value={form.name} onChange={e => handleSlug(e.target.value)} placeholder="e.g. London Academy" />
          </div>
          <div>
            <Label>Slug</Label>
            <div className="flex items-center gap-1">
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">.educloud.pk</span>
            </div>
          </div>
          <div>
            <Label>Brand Name</Label>
            <Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="Display name" />
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v: any) => setForm(f => ({ ...f, plan: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter — Rs.80,000/mo</SelectItem>
                <SelectItem value="professional">Professional — Rs.200,000/mo</SelectItem>
                <SelectItem value="enterprise">Enterprise — Rs.400,000/mo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Primary Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                <span className="text-xs text-muted-foreground">{form.primary_color}</span>
              </div>
            </div>
            <div>
              <Label>Accent Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer" />
                <span className="text-xs text-muted-foreground">{form.accent_color}</span>
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={saving || !form.name}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Building2 className="w-4 h-4 mr-1.5" />}
            {saving ? 'Creating…' : 'Create Centre'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
