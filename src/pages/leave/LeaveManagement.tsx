import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'study', 'other'];

export default function LeaveManagement() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: leaves, refetch } = useSupabaseQuery('leave_requests' as any);
  const isDirector = user?.role === 'centre_director' || user?.role === 'superadmin';

  const filtered = useMemo(() => {
    if (!leaves) return [];
    let list = leaves as any[];
    if (statusFilter !== 'all') list = list.filter(l => l.status === statusFilter);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [leaves, statusFilter]);

  const stats = useMemo(() => {
    const all = (leaves as any[]) || [];
    return {
      pending: all.filter(l => l.status === 'pending').length,
      approved: all.filter(l => l.status === 'approved').length,
      rejected: all.filter(l => l.status === 'rejected').length,
      totalDays: all.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days_count || 0), 0),
    };
  }, [leaves]);

  const calcDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Dates required'); return; }
    const profile = await supabase.from('profiles').select('tenant_id, full_name').eq('user_id', user!.id).single();
    const { error } = await supabase.from('leave_requests' as any).insert({
      ...form,
      tenant_id: (profile.data as any)?.tenant_id,
      user_id: user!.id,
      user_name: (profile.data as any)?.full_name || user!.email,
      days_count: calcDays(form.start_date, form.end_date),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Leave request submitted');
    setShowForm(false);
    setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
    refetch();
  };

  const handleAction = async (id: string, action: 'approved' | 'rejected', reason?: string) => {
    const { error } = await supabase.from('leave_requests' as any).update({
      status: action,
      approved_by: user!.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason || null,
    } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Leave ${action}`);
    refetch();
  };

  return (
    <DashboardLayout
      title="Leave Management"
      subtitle="Submit and manage leave requests"
      actions={
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Request Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Leave Type</Label>
                <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAVE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              {form.start_date && form.end_date && (
                <p className="text-xs text-muted-foreground">Duration: <span className="font-bold text-foreground">{calcDays(form.start_date, form.end_date)} day(s)</span></p>
              )}
              <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason..." /></div>
              <Button className="w-full" onClick={handleSubmit}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} change="↑" changeType="positive" />
        <StatCard label="Rejected" value={stats.rejected} icon={XCircle} change="↓" changeType="negative" />
        <StatCard label="Days Taken" value={stats.totalDays} icon={Calendar} />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Staff</th>
                <th className="text-label text-left px-4 py-3">Type</th>
                <th className="text-label text-left px-4 py-3">From</th>
                <th className="text-label text-left px-4 py-3">To</th>
                <th className="text-label text-left px-4 py-3">Days</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                {isDirector && <th className="text-label text-left px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((leave: any) => (
                <tr key={leave.id} className="border-t border-border/50 hover:bg-secondary/50 transition-all">
                  <td className="px-4 py-3 text-sm font-medium">{leave.user_name}</td>
                  <td className="px-4 py-3 text-xs capitalize">{leave.leave_type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(leave.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(leave.end_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{leave.days_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={leave.status} variant={leave.status === 'approved' ? 'success' : leave.status === 'rejected' ? 'danger' : 'warning'} /></td>
                  {isDirector && (
                    <td className="px-4 py-3">
                      {leave.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleAction(leave.id, 'approved')}><CheckCircle className="w-3.5 h-3.5 text-success" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleAction(leave.id, 'rejected')}><XCircle className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No leave requests found</div>}
      </div>
    </DashboardLayout>
  );
}
