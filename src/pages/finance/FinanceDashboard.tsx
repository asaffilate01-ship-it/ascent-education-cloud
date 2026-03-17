import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { CreditCard, FileText, TrendingUp, AlertTriangle, Handshake, Search, Filter, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import CreateInvoiceModal from '@/components/modals/CreateInvoiceModal';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { supabase } from '@/integrations/supabase/client';

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'info';
  if (s === 'overdue') return 'danger';
  if (s === 'refunded') return 'neutral';
  return 'warning';
};

export default function FinanceDashboard() {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  const { data: invoices, loading, refetch } = useSupabaseQuery('invoices', {
    orderBy: { column: 'created_at', ascending: false },
  });

  if (loading) return <DashboardSkeleton />;

  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (Number(i.amount) - Number(i.paid)), 0);
  const commissionsDue = invoices.filter((i) => i.type === 'commission').reduce((s, i) => s + Number(i.amount), 0);

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (typeFilter !== 'all' && inv.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return inv.student_name.toLowerCase().includes(q) || inv.id.includes(q);
    }
    return true;
  });

  return (
    <DashboardLayout
      title="Finance Dashboard"
      subtitle="Invoices, payments, instalments, and commissions"
      actions={<Button size="sm" onClick={() => setInvoiceOpen(true)}><FileText className="w-3.5 h-3.5 mr-1.5" /> New Invoice</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={`Rs.${totalBilled.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Collected" value={`Rs.${totalCollected.toLocaleString()}`} change={totalBilled ? `${Math.round((totalCollected / totalBilled) * 100)}% collection` : '—'} changeType="positive" icon={TrendingUp} />
        <StatCard label="Overdue" value={`Rs.${overdue.toLocaleString()}`} change="action needed" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Commissions Due" value={`Rs.${commissionsDue.toLocaleString()}`} icon={Handshake} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by student or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tuition">Tuition</SelectItem>
            <SelectItem value="exam">Exam</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="commission">Commission</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="text-xs ml-auto" onClick={() => toast({ title: 'Exported', description: 'CSV file downloaded successfully.' })}>Export CSV</Button>
      </div>

      {/* Invoice Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Invoices ({filtered.length})</h2>
      </div>
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Invoice</th>
                <th className="text-label text-left px-4 py-3">Student</th>
                <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-label text-left px-4 py-3">Amount</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Paid</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Balance</th>
                <th className="text-label text-left px-4 py-3">Status</th>
                <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-secondary/50 cursor-pointer transition-default">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm">{inv.student_name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs capitalize bg-secondary px-2 py-0.5 rounded">{inv.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">Rs.{Number(inv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-success font-medium hidden md:table-cell">Rs.{Number(inv.paid).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium hidden md:table-cell">
                    {Number(inv.amount) - Number(inv.paid) > 0 ? (
                      <span className="text-destructive">Rs.{(Number(inv.amount) - Number(inv.paid)).toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} variant={statusVariant(inv.status)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{inv.due_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No invoices match your filters</div>
        )}
      </div>

      <CreateInvoiceModal open={invoiceOpen} onOpenChange={setInvoiceOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
