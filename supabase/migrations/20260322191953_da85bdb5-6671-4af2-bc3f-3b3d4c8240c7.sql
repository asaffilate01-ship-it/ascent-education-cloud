
-- Expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'cloud_hosting', 'api_services', 'development', 'staff_salary', 'staff_bonus',
  'marketing', 'advertising', 'utility', 'rent', 'internet', 'phone', 'fuel',
  'travel', 'office_supplies', 'software_licenses', 'insurance', 'legal',
  'accounting', 'agent_commission', 'maintenance', 'equipment', 'training',
  'subscriptions', 'bank_charges', 'taxes', 'miscellaneous'
);

-- Payment method for expenses
CREATE TYPE public.expense_payment_method AS ENUM (
  'cash', 'bank_transfer', 'credit_card', 'debit_card', 'cheque',
  'raast', 'nayapay', 'sadapay', 'jazzcash', 'easypaisa', 'petty_cash', 'other'
);

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  category expense_category NOT NULL DEFAULT 'miscellaneous',
  subcategory TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  payment_method expense_payment_method NOT NULL DEFAULT 'bank_transfer',
  payment_reference TEXT,
  vendor_name TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Who paid and reimbursement
  paid_by_user_id UUID,
  paid_by_name TEXT,
  is_reimbursable BOOLEAN NOT NULL DEFAULT false,
  reimbursement_status TEXT DEFAULT 'not_applicable' CHECK (reimbursement_status IN ('not_applicable', 'pending', 'approved', 'reimbursed', 'rejected')),
  reimbursed_amount NUMERIC DEFAULT 0,
  reimbursed_at TIMESTAMPTZ,
  reimbursed_by UUID,
  
  -- Agent commission specifics
  agent_id UUID,
  agent_name TEXT,
  student_id UUID,
  student_name TEXT,
  commission_percentage NUMERIC,
  related_invoice_id UUID REFERENCES public.invoices(id),
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Recurring
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Finance staff and directors can manage expenses
CREATE POLICY "Finance staff manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'finance_officer') OR has_role(auth.uid(), 'centre_director'))
    AND (tenant_id = get_user_tenant_id(auth.uid()))
  );

-- Superadmins manage all (landlord expenses have tenant_id NULL)
CREATE POLICY "Superadmins manage all expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'));

-- Users view own reimbursable expenses
CREATE POLICY "Users view own expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (paid_by_user_id = auth.uid());

-- Users can submit expenses
CREATE POLICY "Users submit expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
