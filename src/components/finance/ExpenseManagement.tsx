import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import { Plus, Search, Download, Loader2, Receipt, TrendingDown, RefreshCw, Wallet } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

const CATEGORY_LABELS: Record<string, string> = {
  cloud_hosting: 'Cloud/Hosting', api_services: 'API Services', development: 'Development',
  staff_salary: 'Staff Salary', staff_bonus: 'Staff Bonus', marketing: 'Marketing',
  advertising: 'Advertising', utility: 'Utility', rent: 'Rent', internet: 'Internet',
  phone: 'Phone', fuel: 'Fuel', travel: 'Travel', office_supplies: 'Office Supplies',
  software_licenses: 'Software', insurance: 'Insurance', legal: 'Legal', accounting: 'Accounting',
  agent_commission: 'Agent Commission', maintenance: 'Maintenance', equipment: 'Equipment',
  training: 'Training', subscriptions: 'Subscriptions', bank_charges: 'Bank Charges',
  taxes: 'Taxes', miscellaneous: 'Misc',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', credit_card: 'Credit Card',
  debit_card: 'Debit Card', cheque: 'Cheque', raast: 'Raast', nayapay: 'NayaPay',
  sadapay: 'SadaPay', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', petty_cash: 'Petty Cash', other: 'Other',
};

const reimburseVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  if (s === 'reimbursed') return 'success';
  if (s === 'approved') return 'info';
  if (s === 'pending') return 'warning';
  if (s === 'rejected') return 'danger';
  return 'neutral';
};

interface Props {
  tenantId?: string | null;
  totalRevenue?: number;
}

export default function ExpenseManagement({ tenantId, totalRevenue = 0 }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const { toast } = useToast();

  const { data: expenses, loading, refetch } = useSupabaseQuery('expenses' as any, {
    orderBy: { column: 'expense_date', ascending: false },
  });

  const expenseList = (expenses || []) as any[];

  const stats = useMemo(() => {
    const totalExpenses = expenseList.reduce((s, e) => s + Number(e.amount), 0);
    const pendingReimburse = expenseList.filter(e => e.reimbursement_status === 'pending').reduce((s, e) => s + Number(e.amount), 0);
    const commissions = expenseList.filter(e => e.category === 'agent_commission').reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    return { totalExpenses, pendingReimburse, commissions, netProfit };
  }, [expenseList, totalRevenue]);

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenseList.forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenseList]);

  const filtered = useMemo(() => {
    return expenseList.filter(e => {
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      if (methodFilter !== 'all' && e.payment_method !== methodFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (e.description || '').toLowerCase().includes(q) ||
          (e.vendor_name || '').toLowerCase().includes(q) ||
          (e.paid_by_name || '').toLowerCase().includes(q) ||
          (e.agent_name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [expenseList, catFilter, methodFilter, search]);

  const handleReimburse = async (expense: any) => {
    const { error } = await supabase.from('expenses' as any).update({
      reimbursement_status: 'reimbursed',
      reimbursed_amount: expense.amount,
      reimbursed_at: new Date().toISOString(),
    } as any).eq('id', expense.id);
    if (error) {
      toast({ title: 'Error', description: error.message });
    } else {
      toast({ title: 'Reimbursed', description: `Rs.${Number(expense.amount).toLocaleString()} marked as reimbursed.` });
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Expenses" value={`Rs.${stats.totalExpenses.toLocaleString()}`} icon={TrendingDown} />
        <StatCard label="Net Profit" value={`Rs.${stats.netProfit.toLocaleString()}`} change={stats.netProfit >= 0 ? 'positive' : 'loss'} changeType={stats.netProfit >= 0 ? 'positive' : 'negative'} icon={Wallet} />
        <StatCard label="Pending Reimbursements" value={`Rs.${stats.pendingReimburse.toLocaleString()}`} icon={RefreshCw} />
        <StatCard label="Agent Commissions" value={`Rs.${stats.commissions.toLocaleString()}`} icon={Receipt} />
      </div>

      {/* Category Breakdown */}
      {byCategory.length > 0 && (
        <div className="surface-card p-4">
          <h3 className="text-sm font-semibold mb-3">Top Expense Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byCategory.map(([cat, amt]) => (
              <div key={cat} className="surface-data p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">{CATEGORY_LABELS[cat] || cat}</p>
                <p className="text-sm font-semibold">Rs.{amt.toLocaleString()}</p>
                <div className="w-full h-1 bg-border rounded-full mt-2">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${stats.totalExpenses ? (amt / stats.totalExpenses) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="ml-auto text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Expense
        </Button>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="surface-data">
                <th className="text-label text-left px-4 py-3">Date</th>
                <th className="text-label text-left px-4 py-3">Description</th>
                <th className="text-label text-left px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-label text-left px-4 py-3">Amount</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Payment</th>
                <th className="text-label text-left px-4 py-3 hidden md:table-cell">Paid By</th>
                <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Vendor</th>
                <th className="text-label text-left px-4 py-3 hidden lg:table-cell">Reimburse</th>
                <th className="text-label text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No expenses found</td></tr>
              ) : (
                filtered.map(exp => (
                  <tr key={exp.id} className="border-t border-border/50 hover:bg-secondary/50 transition-default">
                    <td className="px-4 py-3 text-xs">{exp.expense_date}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="font-medium">{exp.description}</p>
                      {exp.category === 'agent_commission' && exp.agent_name && (
                        <p className="text-xs text-muted-foreground">Agent: {exp.agent_name} · Student: {exp.student_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded">{CATEGORY_LABELS[exp.category] || exp.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-destructive">Rs.{Number(exp.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{PAYMENT_LABELS[exp.payment_method] || exp.payment_method}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{exp.paid_by_name || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">{exp.vendor_name || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {exp.is_reimbursable ? (
                        <StatusBadge status={exp.reimbursement_status?.replace(/_/g, ' ')} variant={reimburseVariant(exp.reimbursement_status)} />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {exp.is_reimbursable && exp.reimbursement_status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleReimburse(exp)}>
                          Reimburse
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal open={addOpen} onOpenChange={setAddOpen} onCreated={refetch} tenantId={tenantId} />
    </div>
  );
}
