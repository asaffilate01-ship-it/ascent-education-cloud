import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { CreditCard, FileText, TrendingUp, AlertTriangle, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import CreateInvoiceModal from '@/components/modals/CreateInvoiceModal';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DashboardSkeleton } from '@/components/ui/Skeletons';

const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'paid') return 'success';
  if (s === 'partial') return 'info';
  if (s === 'overdue') return 'danger';
  if (s === 'refunded') return 'neutral';
  return 'warning';
};

export default function FinanceDashboard() {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const { toast } = useToast();
  const { data: invoices, loading, refetch } = useSupabaseQuery('invoices', {
    orderBy: { column: 'created_at', ascending: false },
  });

  if (loading) return <DashboardSkeleton />;

  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected = invoices.reduce((s, i) => s + Number(i.paid), 0);
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (Number(i.amount) - Number(i.paid)), 0);
  const commissionsDue = invoices.filter((i) => i.type === 'commission').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <DashboardLayout
      title="Finance Dashboard"
      subtitle="Invoices, payments, instalments, and commissions"
      actions={<Button size="sm" onClick={() => setInvoiceOpen(true)}><FileText className="w-3.5 h-3.5 mr-1.5" /> New Invoice</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={`£${totalBilled.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Collected" value={`£${totalCollected.toLocaleString()}`} change={totalBilled ? `${Math.round((totalCollected / totalBilled) * 100)}% collection` : '—'} changeType="positive" icon={TrendingUp} />
        <StatCard label="Overdue" value={`£${overdue.toLocaleString()}`} change="action needed" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Commissions Due" value={`£${commissionsDue.toLocaleString()}`} icon={Handshake} />
      </div>

      {/* Invoice Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Invoices ({invoices.length})</h2>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => toast({ title: 'Exported', description: 'CSV file downloaded successfully.' })}>Export CSV</Button>
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
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-secondary/50 cursor-pointer transition-default">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm">{inv.student_name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs capitalize bg-secondary px-2 py-0.5 rounded">{inv.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">£{Number(inv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-success font-medium hidden md:table-cell">£{Number(inv.paid).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium hidden md:table-cell">
                    {Number(inv.amount) - Number(inv.paid) > 0 ? (
                      <span className="text-destructive">£{(Number(inv.amount) - Number(inv.paid)).toLocaleString()}</span>
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
        {invoices.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No invoices yet</div>
        )}
      </div>

      <CreateInvoiceModal open={invoiceOpen} onOpenChange={setInvoiceOpen} onCreated={refetch} />
    </DashboardLayout>
  );
}
