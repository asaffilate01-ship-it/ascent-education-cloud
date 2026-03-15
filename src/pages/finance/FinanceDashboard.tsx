import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { CreditCard, FileText, Clock, Handshake, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice } from '@/types/platform';
import { useState } from 'react';
import CreateInvoiceModal from '@/components/modals/CreateInvoiceModal';
import { useToast } from '@/hooks/use-toast';

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', studentName: 'Sara Ali', type: 'tuition', amount: 1200, paid: 1200, status: 'paid', dueDate: '2025-02-28', issuedDate: '2025-01-15', instalments: 4 },
  { id: 'INV-002', studentName: 'Omar Farooq', type: 'tuition', amount: 1200, paid: 600, status: 'partial', dueDate: '2025-03-15', issuedDate: '2025-01-15', instalments: 4 },
  { id: 'INV-003', studentName: 'Hassan Ali', type: 'tuition', amount: 1200, paid: 0, status: 'overdue', dueDate: '2025-03-01', issuedDate: '2025-01-20', instalments: 4 },
  { id: 'INV-004', studentName: 'Zara Sheikh', type: 'exam', amount: 150, paid: 150, status: 'paid', dueDate: '2025-03-10', issuedDate: '2025-03-01', instalments: 1 },
  { id: 'INV-005', studentName: 'Ayesha Khan', type: 'deposit', amount: 300, paid: 300, status: 'paid', dueDate: '2025-02-15', issuedDate: '2025-02-01', instalments: 1 },
  { id: 'INV-006', studentName: 'Ali Raza', type: 'tuition', amount: 1200, paid: 300, status: 'partial', dueDate: '2025-03-20', issuedDate: '2025-02-01', instalments: 4 },
  { id: 'INV-007', studentName: 'Bilal Recruitment (Agent)', type: 'commission', amount: 500, paid: 0, status: 'pending', dueDate: '2025-03-30', issuedDate: '2025-03-14', instalments: 1 },
];

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
  const totalBilled = MOCK_INVOICES.reduce((s, i) => s + i.amount, 0);
  const totalCollected = MOCK_INVOICES.reduce((s, i) => s + i.paid, 0);
  const overdue = MOCK_INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount - i.paid), 0);
  const commissionsDue = MOCK_INVOICES.filter(i => i.type === 'commission').reduce((s, i) => s + i.amount, 0);

  return (
    <DashboardLayout
      title="Finance Dashboard"
      subtitle="Invoices, payments, instalments, and commissions"
      actions={<Button size="sm" onClick={() => setInvoiceOpen(true)}><FileText className="w-3.5 h-3.5 mr-1.5" /> New Invoice</Button>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed" value={`£${totalBilled.toLocaleString()}`} icon={CreditCard} />
        <StatCard label="Collected" value={`£${totalCollected.toLocaleString()}`} change={`${Math.round(totalCollected/totalBilled*100)}% collection`} changeType="positive" icon={TrendingUp} />
        <StatCard label="Overdue" value={`£${overdue.toLocaleString()}`} change="action needed" changeType="negative" icon={AlertTriangle} />
        <StatCard label="Commissions Due" value={`£${commissionsDue.toLocaleString()}`} icon={Handshake} />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Revenue by Type</h3>
          <div className="space-y-3">
            {[
              { type: 'Tuition Fees', amount: 4800, pct: 80 },
              { type: 'Exam Fees', amount: 150, pct: 3 },
              { type: 'Deposits', amount: 300, pct: 5 },
              { type: 'Other', amount: 200, pct: 3 },
            ].map((r) => (
              <div key={r.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{r.type}</span>
                  <span className="font-medium">£{r.amount}</span>
                </div>
                <div className="w-full h-1.5 bg-border rounded-full">
                  <div className="h-full bg-primary rounded-full transition-default" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Payment Methods</h3>
          <div className="space-y-3">
            {[
              { method: 'Bank Transfer', count: 45, amount: '£3,200' },
              { method: 'JazzCash / Easypaisa', count: 28, amount: '£1,400' },
              { method: 'Stripe (Card)', count: 12, amount: '£850' },
              { method: 'Cash (Centre)', count: 5, amount: '£300' },
            ].map((p) => (
              <div key={p.method} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm">{p.method}</p>
                  <p className="text-xs text-muted-foreground">{p.count} transactions</p>
                </div>
                <span className="text-sm font-medium">{p.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h3 className="text-sm font-semibold mb-3">Instalment Plans</h3>
          <div className="space-y-3">
            {[
              { plan: '4 Monthly', students: 38, onTrack: 30, behind: 8 },
              { plan: '2 Semester', students: 15, onTrack: 12, behind: 3 },
              { plan: 'Full Payment', students: 22, onTrack: 22, behind: 0 },
            ].map((p) => (
              <div key={p.plan} className="surface-data p-3 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{p.plan}</span>
                  <span className="text-xs text-muted-foreground">{p.students} students</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-success">{p.onTrack} on track</span>
                  {p.behind > 0 && <span className="text-destructive">{p.behind} behind</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recent Invoices</h2>
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
              {MOCK_INVOICES.map((inv) => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-secondary/50 cursor-pointer transition-default">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-sm">{inv.studentName}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs capitalize bg-secondary px-2 py-0.5 rounded">{inv.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">£{inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-success font-medium hidden md:table-cell">£{inv.paid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium hidden md:table-cell">
                    {inv.amount - inv.paid > 0 ? (
                      <span className="text-destructive">£{(inv.amount - inv.paid).toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} variant={statusVariant(inv.status)} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{inv.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateInvoiceModal open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    </DashboardLayout>
  );
}
