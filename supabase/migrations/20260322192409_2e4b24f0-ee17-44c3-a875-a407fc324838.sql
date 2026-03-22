
-- Add university_referral_commission to expense_category enum
ALTER TYPE public.expense_category ADD VALUE IF NOT EXISTS 'university_referral_income';

-- Create a dedicated table for university referral income tracking
CREATE TABLE public.referral_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  university_id UUID REFERENCES public.partner_universities(id),
  university_name TEXT NOT NULL,
  student_id UUID,
  student_name TEXT NOT NULL,
  programme TEXT NOT NULL,
  referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
  commission_rate NUMERIC DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'invoiced', 'received', 'overdue', 'cancelled')),
  payment_method TEXT,
  payment_reference TEXT,
  received_date DATE,
  received_amount NUMERIC DEFAULT 0,
  academic_year TEXT,
  intake TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance staff manage referral income" ON public.referral_income
  FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'finance_officer') OR has_role(auth.uid(), 'centre_director'))
    AND (tenant_id = get_user_tenant_id(auth.uid()))
  );

CREATE POLICY "Superadmins manage all referral income" ON public.referral_income
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "University partners view own referrals" ON public.referral_income
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'university_partner'));

CREATE TRIGGER update_referral_income_updated_at
  BEFORE UPDATE ON public.referral_income
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
