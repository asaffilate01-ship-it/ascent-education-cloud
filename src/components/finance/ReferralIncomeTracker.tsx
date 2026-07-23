import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { Plus, Search, GraduationCap, Banknote, Clock, CheckCircle, Loader2 } from 'lucide-react';

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'received') return 'success';
  if (s === 'invoiced') return 'info';
  if (s === 'overdue') return 'danger';
  if (s === 'cancelled') return 'neutral';
  return 'warning';
};

interface Props {
  tenantId?: string | null;
}

export default function ReferralIncomeTracker({ tenantId }: Props) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const { data: referrals, loading, refetch } = useSupabaseQuery('referral_income' as any, {
    orderBy: { column: 'referral_date', ascending: false },
  });
  const { data: universities } = useSupabaseQuery('partner_universities');

  const list = (referrals || []) as any[];

  const [form, setForm] = useState({
    university_name: '', student_name: '', programme: '', referral_date: new Date().toISOString().slice(0, 10),
    commission_rate: '', commission_amount: '', currency: 'GBP', academic_year: new Date().getFullYear().toString(),
    intake: '', notes: '', university_id: '',
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const stats = useMemo(() => {
    const total = list.reduce((s, r) => s + Number(r.commission_amount), 0);
    const received = list.filter(r => r.payment_status === 'received').reduce((s, r) => s + Number(r.received_amount || r.commission_amount), 0);
    const pending = list.filter(r => r.payment_status === 'pending' || r.payment_status === 'invoiced').reduce((s, r) => s + Number(r.commission_amount), 0);
    const count = list.length;
    return { total, received, pending, count };
  }, [list]);

  const filtered = useMemo(() => list.filter(r => {
    if (statusFilter !== 'all' && r.payment_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.university_name || '').toLowerCase().includes(q) ||
        (r.student_name || '').toLowerCase().includes(q) ||
        (r.programme || '').toLowerCase().includes(q);
    }
    return true;
  }), [list, statusFilter, search]);

  const handleAdd = async () => {
    if (!form.university_name || !form.student_name || !form.programme || !form.commission_amount) {
      toast({ title: 'Required', description: 'University, student, programme, and amount are required.' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('referral_income' as any).insert({
        tenant_id: tenantId || null,
        university_id: form.university_id || null,
        university_name: form.university_name,
        student_name: form.student_name,
        programme: form.programme,
        referral_date: form.referral_date,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : 0,
        commission_amount: parseFloat(form.commission_amount),
        currency: form.currency,
        academic_year: form.academic_year,
        intake: form.intake || null,
        notes: form.notes || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
      toast({ title: 'Referral Recorded', description: `${form.currency} ${parseFloat(form.commission_amount).toLocaleString()} commission from ${form.university_name}` });
      refetch();
      setAddOpen(false);
      setForm({ university_name: '', student_name: '', programme: '', referral_date: new Date().toISOString().slice(0, 10), commission_rate: '', commission_amount: '', currency: 'GBP', academic_year: new Date().getFullYear().toString(), intake: '', notes: '', university_id: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const markReceived = async (r: any) => {
    const { error } = await supabase.from('referral_income' as any).update({
      payment_status: 'received',
      received_amount: r.commission_amount,
      received_date: new Date().toISOString().slice(0, 10),
    } as any).eq('id', r.id);
    if (error) toast({ title: 'Error', description: error.message });
    else { toast({ title: 'Marked Received' }); refetch(); }
  };

  const selectUniversity = (id: string) => {
    const uni = (universities || []).find((u: any) => u.id === id);
    if (uni) {
      set('university_id', id);
      set('university_name', uni.name);
      set('programme', uni.programme || '');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Referral Income" value={`£${stats.total.toLocaleString()}`} icon={GraduationCap} />
        <StatCard label="Received" value={`£${stats.received.toLocaleString()}`} icon={CheckCircle} />
        <StatCard label="Pending / Invoiced" value={`£${stats.pending.toLocaleString()}`} icon={Clock} />
        <StatCard label="Total Referrals" value={stats.count} icon={Banknote} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search university, student..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="invoiced">Invoiced</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Referral
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Date</th>
                <th className="text-label text-left px-4 py-3">University</th>
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Programme</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Rate</th>
                <th className="text-label text-left px-4 py-3">Commission</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No referral income records</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                  <td className="px-4 py-3 text-xs">{r.referral_date}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.university_name}</td>
                  <td className="px-4 py-3 text-sm">{r.student_name}</td>
                  <td className="px-4 py-3 text-xs hidden sm:table-cell">{r.programme}</td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell">{r.commission_rate ? `${r.commission_rate}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    {r.currency === 'GBP' ? '£' : r.currency === 'USD' ? '$' : 'Rs.'}{Number(r.commission_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.payment_status} variant={statusVariant(r.payment_status)} />
                  </td>
                  <td className="px-4 py-3">
                    {(r.payment_status === 'pending' || r.payment_status === 'invoiced') && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markReceived(r)}>
                        Received
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Referral Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record University Referral Income</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {(universities || []).length > 0 && (
              <div>
                <Label className="text-xs">Select Partner University</Label>
                <Select value={form.university_id} onValueChange={selectUniversity}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Choose university..." /></SelectTrigger>
                  <SelectContent>
                    {(universities || []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">University Name *</Label>
                <Input value={form.university_name} onChange={e => set('university_name', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Student Name *</Label>
                <Input value={form.student_name} onChange={e => set('student_name', e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Programme *</Label>
              <Input value={form.programme} onChange={e => set('programme', e.target.value)} className="h-9" placeholder="BSc Business Management Top-Up" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Commission Rate %</Label>
                <Input type="number" value={form.commission_rate} onChange={e => set('commission_rate', e.target.value)} className="h-9" placeholder="15" />
              </div>
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input type="number" value={form.commission_amount} onChange={e => set('commission_amount', e.target.value)} className="h-9" placeholder="1500" />
              </div>
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={form.currency} onValueChange={v => set('currency', v)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="PKR">PKR (Rs.)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Referral Date</Label>
                <Input type="date" value={form.referral_date} onChange={e => set('referral_date', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Academic Year</Label>
                <Input value={form.academic_year} onChange={e => set('academic_year', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Intake</Label>
                <Input value={form.intake} onChange={e => set('intake', e.target.value)} className="h-9" placeholder="Sep 2026" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
            </div>
            <Button onClick={handleAdd} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Referral Income
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
