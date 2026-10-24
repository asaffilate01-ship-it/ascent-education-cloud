-- Deploy with webhook-stripe only after isolated staging acceptance and live drift review.
-- No existing balances are rewritten. Unreconciled legacy balances fail closed.
CREATE TABLE public.unipathway_stripe_receipts (
 event_id text PRIMARY KEY,
 intent_id text NOT NULL UNIQUE,
 invoice_id uuid NOT NULL REFERENCES public.invoices(id),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor > 0),
 currency text NOT NULL CHECK(currency = 'pkr'),
 live boolean NOT NULL,
 payment_id uuid NOT NULL REFERENCES public.payments(id),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_stripe_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_stripe_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.unipathway_stripe_receipts TO service_role;
CREATE INDEX unipathway_stripe_receipts_invoice_idx ON public.unipathway_stripe_receipts(invoice_id);
CREATE INDEX unipathway_verified_payments_invoice_idx ON public.payments(invoice_id) WHERE status='verified';

CREATE FUNCTION public.record_unipathway_stripe_payment(
 p_event_id text, p_intent_id text, p_invoice_id uuid, p_tenant_id uuid,
 p_student_id uuid, p_amount_minor bigint, p_currency text, p_live boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
 inv public.invoices%ROWTYPE;
 receipt public.unipathway_stripe_receipts%ROWTYPE;
 ledger_total numeric;
 payment uuid;
 amount_paid numeric;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^evt_[A-Za-z0-9]+$' OR p_intent_id IS NULL OR p_intent_id !~ '^pi_[A-Za-z0-9]+$'
    OR p_invoice_id IS NULL OR p_tenant_id IS NULL OR p_student_id IS NULL OR p_live IS NULL
    OR p_amount_minor IS NULL OR p_amount_minor <= 0 OR p_amount_minor > 9007199254740991
    OR p_currency IS DISTINCT FROM 'pkr' THEN RAISE EXCEPTION 'Invalid invoice payment'; END IF;
 -- Same PaymentIntent may arrive under distinct event IDs. Serialize by intent as well as invoice.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_intent_id, 0));
 SELECT * INTO receipt FROM public.unipathway_stripe_receipts WHERE intent_id=p_intent_id;
 IF FOUND THEN
   IF receipt.invoice_id IS DISTINCT FROM p_invoice_id OR receipt.tenant_id IS DISTINCT FROM p_tenant_id
      OR receipt.student_id IS DISTINCT FROM p_student_id OR receipt.amount_minor IS DISTINCT FROM p_amount_minor
      OR receipt.currency IS DISTINCT FROM p_currency OR receipt.live IS DISTINCT FROM p_live THEN
     RAISE EXCEPTION 'Payment identity mismatch';
   END IF;
   RETURN jsonb_build_object('status','duplicate','payment_id',receipt.payment_id);
 END IF;
 IF EXISTS(SELECT 1 FROM public.unipathway_stripe_receipts WHERE event_id=p_event_id) THEN
   RAISE EXCEPTION 'Event identity mismatch';
 END IF;
 SELECT * INTO inv FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
 IF NOT FOUND OR inv.tenant_id IS DISTINCT FROM p_tenant_id OR inv.student_id IS DISTINCT FROM p_student_id THEN
   RAISE EXCEPTION 'Invoice scope mismatch';
 END IF;
 IF inv.status::text NOT IN ('pending','partial','overdue') OR inv.amount IS NULL OR inv.amount <= 0
    OR inv.paid IS NULL OR inv.paid < 0 OR inv.paid >= inv.amount
    OR inv.amount*100 <> trunc(inv.amount*100) OR inv.paid*100 <> trunc(inv.paid*100) THEN
   RAISE EXCEPTION 'Invoice requires finance review';
 END IF;
 SELECT coalesce(sum(amount),0) INTO ledger_total FROM public.payments WHERE invoice_id=p_invoice_id AND status='verified';
 IF ledger_total <> inv.paid OR EXISTS(SELECT 1 FROM public.payments WHERE invoice_id=p_invoice_id AND status='verified'
    AND (tenant_id IS DISTINCT FROM p_tenant_id OR amount <= 0)) THEN
   RAISE EXCEPTION 'Invoice ledger requires reconciliation';
 END IF;
 amount_paid := p_amount_minor::numeric / 100;
 IF amount_paid > inv.amount-inv.paid THEN RAISE EXCEPTION 'Overpayment requires finance review'; END IF;
 INSERT INTO public.payments(invoice_id,tenant_id,amount,method,reference_number,status,verified_at,notes)
 VALUES(p_invoice_id,p_tenant_id,amount_paid,'stripe',p_intent_id,'verified',now(),'Verified Stripe payment_intent.succeeded') RETURNING id INTO payment;
 -- Existing payment trigger updates paid/status from the verified ledger in this same transaction.
 INSERT INTO public.unipathway_stripe_receipts(event_id,intent_id,invoice_id,tenant_id,student_id,amount_minor,currency,live,payment_id)
 VALUES(p_event_id,p_intent_id,p_invoice_id,p_tenant_id,p_student_id,p_amount_minor,p_currency,p_live,payment);
 INSERT INTO public.notifications(user_id,tenant_id,title,message,type,severity)
 VALUES(p_student_id,p_tenant_id,'Payment Received','Your payment of PKR '||amount_paid::text||' has been recorded.','finance','success');
 INSERT INTO public.audit_logs(tenant_id,action,entity_type,entity_id,details)
 VALUES(p_tenant_id,'stripe_payment_recorded','invoice',p_invoice_id,jsonb_build_object('event_id',p_event_id,'intent_id',p_intent_id,'payment_id',payment,'amount_minor',p_amount_minor,'currency',p_currency,'live',p_live));
 RETURN jsonb_build_object('status','recorded','payment_id',payment);
END;
$$;
REVOKE ALL ON FUNCTION public.record_unipathway_stripe_payment(text,text,uuid,uuid,uuid,bigint,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_unipathway_stripe_payment(text,text,uuid,uuid,uuid,bigint,text,boolean) TO service_role;
GRANT SELECT,UPDATE ON public.invoices TO service_role;
GRANT SELECT,INSERT ON public.payments TO service_role;
GRANT INSERT ON public.notifications,public.audit_logs TO service_role;
