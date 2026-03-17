
-- Create payment method enum
CREATE TYPE public.payment_method AS ENUM ('bank_transfer', 'raast', 'nayapay', 'sadapay', 'bank_alfalah', 'stripe', 'other');

-- Create payments table to record payments against invoices
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  method public.payment_method NOT NULL DEFAULT 'bank_transfer',
  reference_number TEXT,
  bank_name TEXT,
  sender_account TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Finance staff manage payments
CREATE POLICY "Finance staff manage payments"
ON public.payments FOR ALL
TO authenticated
USING (
  (has_role(auth.uid(), 'finance_officer'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role))
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- Students view payments on their invoices
CREATE POLICY "Students view own payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = payments.invoice_id AND i.student_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update invoice paid amount and status when payment is verified
CREATE OR REPLACE FUNCTION public.sync_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_paid NUMERIC;
  inv_amount NUMERIC;
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'verified';
    
    SELECT amount INTO inv_amount FROM invoices WHERE id = NEW.invoice_id;
    
    UPDATE invoices SET
      paid = total_paid,
      status = CASE
        WHEN total_paid >= inv_amount THEN 'paid'::invoice_status
        WHEN total_paid > 0 THEN 'partial'::invoice_status
        ELSE status
      END
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_payment_to_invoice
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment();
