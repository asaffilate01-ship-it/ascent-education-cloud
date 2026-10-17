-- Controlled commission claims against actual signed university recruiting agreements.
-- Finance users can inspect only enrolled referral evidence in their own centre.
CREATE POLICY "finance enrolled referral read" ON public.international_partner_referrals FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND public.has_role(auth.uid(),'finance_officer'::public.app_role));

-- Claims are NOT invoices, payouts or realised revenue until evidenced and reconciled.
CREATE TABLE public.university_commission_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 referral_id uuid NOT NULL REFERENCES public.international_partner_referrals(id),
 agreement_id uuid NOT NULL REFERENCES public.international_partner_agreements(id),
 enrolment_confirmed_on date NOT NULL,
 tuition_amount numeric(14,2) CHECK(tuition_amount IS NULL OR tuition_amount>=0),
 commission_currency text NOT NULL CHECK(commission_currency ~ '^[A-Z]{3}$'),
 commission_due numeric(14,2) NOT NULL CHECK(commission_due>0),
 status text NOT NULL DEFAULT 'draft'
  CHECK(status IN ('draft','verified','invoiced','received','reversed','cancelled')),
 university_enrolment_evidence text,
 reviewed_by uuid REFERENCES auth.users(id),
 verified_at timestamptz,
 invoice_reference text,
 invoiced_at timestamptz,
 received_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(received_amount>=0),
 received_on date,
 receipt_reference text,
 reversal_reference text,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,referral_id),
 CHECK(status NOT IN ('verified','invoiced','received','reversed') OR
 (length(btrim(coalesce(university_enrolment_evidence,'')))>=8
 AND reviewed_by IS NOT NULL AND verified_at IS NOT NULL)),
 CHECK(status NOT IN ('invoiced','received','reversed') OR
 (length(btrim(coalesce(invoice_reference,'')))>=4 AND invoiced_at IS NOT NULL)),
 CHECK(status NOT IN ('received','reversed') OR
 (length(btrim(coalesce(receipt_reference,'')))>=4 AND received_on IS NOT NULL AND received_amount=commission_due)),
 CHECK(status<>'reversed' OR length(btrim(coalesce(reversal_reference,'')))>=4)
);
CREATE INDEX university_commission_queue ON public.university_commission_claims(tenant_id,status,created_at DESC);

CREATE FUNCTION public.guard_university_commission_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.international_partner_agreements; r public.international_partner_referrals; computed numeric;
BEGIN
 SELECT * INTO r FROM public.international_partner_referrals WHERE id=NEW.referral_id;
 SELECT * INTO a FROM public.international_partner_agreements WHERE id=NEW.agreement_id;
 IF r.id IS NULL OR a.id IS NULL OR r.tenant_id<>NEW.tenant_id OR a.tenant_id<>NEW.tenant_id
 OR r.partner_id<>a.partner_id THEN
  RAISE EXCEPTION 'Referral, partner and signed agreement must match this centre' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' AND (r.status<>'enrolled' OR r.student_consent_at IS NULL OR
  length(btrim(coalesce(r.external_application_ref,'')))=0) THEN
  RAISE EXCEPTION 'University enrolment and consent evidence required before a commission claim' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' AND (a.status<>'signed' OR length(btrim(coalesce(a.document_reference,'')))<4
   OR a.starts_on>NEW.enrolment_confirmed_on
   OR (a.ends_on IS NOT NULL AND a.ends_on<NEW.enrolment_confirmed_on)) THEN
  RAISE EXCEPTION 'A signed eligible recruitment agreement is required' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' AND (a.commission_currency IS NULL OR a.commission_currency !~ '^[A-Z]{3}$'
  OR a.commission_amount IS NULL OR a.commission_basis NOT IN ('flat_per_enrolment','percentage_of_tuition')) THEN
  RAISE EXCEPTION 'Agreement lacks a directly calculable evidenced commission term' USING ERRCODE='22023';
 END IF;
 IF a.commission_basis='percentage_of_tuition' THEN
  IF TG_OP='INSERT' AND (NEW.tuition_amount IS NULL OR NEW.tuition_amount<=0 OR a.commission_amount>100) THEN
   RAISE EXCEPTION 'Valid tuition and agreed percentage are required' USING ERRCODE='22023';
  END IF;
  computed:=round(NEW.tuition_amount*a.commission_amount/100,2);
 ELSE
  computed:=round(a.commission_amount,2);
 END IF;
 IF TG_OP='INSERT' AND computed<=0 THEN RAISE EXCEPTION 'No positive eligible commission is due'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'draft' OR NEW.received_amount<>0 OR
   NEW.university_enrolment_evidence IS NOT NULL OR NEW.reviewed_by IS NOT NULL OR
   NEW.invoice_reference IS NOT NULL OR NEW.receipt_reference IS NOT NULL THEN
   RAISE EXCEPTION 'Commission claims must begin as draft evidence reviews' USING ERRCODE='42501';
  END IF;
  NEW.created_by:=auth.uid();
  NEW.commission_currency:=a.commission_currency;
  NEW.commission_due:=computed;
 ELSE
  IF ROW(NEW.id,NEW.tenant_id,NEW.referral_id,NEW.agreement_id,NEW.enrolment_confirmed_on,
    NEW.tuition_amount,NEW.commission_currency,NEW.commission_due,NEW.created_by,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.referral_id,OLD.agreement_id,OLD.enrolment_confirmed_on,
    OLD.tuition_amount,OLD.commission_currency,OLD.commission_due,OLD.created_by,OLD.created_at) THEN
   RAISE EXCEPTION 'Agreement-derived claim terms cannot be modified' USING ERRCODE='42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
   IF NOT (
    (OLD.status='draft' AND NEW.status IN ('verified','cancelled')) OR
    (OLD.status='verified' AND NEW.status IN ('invoiced','cancelled')) OR
    (OLD.status='invoiced' AND NEW.status IN ('received','cancelled')) OR
    (OLD.status='received' AND NEW.status='reversed')
   ) THEN RAISE EXCEPTION 'Invalid commission lifecycle transition' USING ERRCODE='42501'; END IF;
  END IF;
  IF OLD.status IN ('received','reversed','cancelled') AND
   ROW(NEW.university_enrolment_evidence,NEW.invoice_reference,NEW.receipt_reference,NEW.received_amount,NEW.reversal_reference)
   IS DISTINCT FROM
   ROW(OLD.university_enrolment_evidence,OLD.invoice_reference,OLD.receipt_reference,OLD.received_amount,OLD.reversal_reference)
   AND NOT (OLD.status='received' AND NEW.status='reversed') THEN
    RAISE EXCEPTION 'Closed financial evidence is immutable' USING ERRCODE='42501';
  END IF;
  IF (NEW.university_enrolment_evidence IS DISTINCT FROM OLD.university_enrolment_evidence
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.verified_at IS DISTINCT FROM OLD.verified_at)
      AND NOT (OLD.status='draft' AND NEW.status='verified' AND NEW.reviewed_by IS NOT DISTINCT FROM OLD.reviewed_by
        AND NEW.verified_at IS NOT DISTINCT FROM OLD.verified_at) THEN
    RAISE EXCEPTION 'University verification can only be recorded during draft review' USING ERRCODE='42501';
  END IF;
  IF NEW.invoice_reference IS DISTINCT FROM OLD.invoice_reference
      AND NOT (OLD.status='verified' AND NEW.status='invoiced') THEN
    RAISE EXCEPTION 'Invoice reference is immutable outside invoicing transition' USING ERRCODE='42501';
  END IF;
  IF (NEW.received_amount IS DISTINCT FROM OLD.received_amount OR
      NEW.received_on IS DISTINCT FROM OLD.received_on OR NEW.receipt_reference IS DISTINCT FROM OLD.receipt_reference)
      AND NOT (OLD.status='invoiced' AND NEW.status='received'
        AND NEW.received_amount IS NOT DISTINCT FROM OLD.received_amount
        AND NEW.received_on IS NOT DISTINCT FROM OLD.received_on) THEN
    RAISE EXCEPTION 'Receipt information is immutable outside payment confirmation' USING ERRCODE='42501';
  END IF;
  IF NEW.reversal_reference IS DISTINCT FROM OLD.reversal_reference
      AND NOT (OLD.status='received' AND NEW.status='reversed') THEN
    RAISE EXCEPTION 'Reversal reference is immutable outside reversal' USING ERRCODE='42501';
  END IF;
  IF OLD.status='draft' AND NEW.status='verified' THEN
   NEW.reviewed_by:=auth.uid();NEW.verified_at:=now();
  END IF;
  IF OLD.status='verified' AND NEW.status='invoiced' THEN NEW.invoiced_at:=now(); END IF;
  IF OLD.status='invoiced' AND NEW.status='received' THEN
    NEW.received_amount:=NEW.commission_due;NEW.received_on:=current_date;
  END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
CREATE TRIGGER university_claim_guard BEFORE INSERT OR UPDATE ON public.university_commission_claims
 FOR EACH ROW EXECUTE FUNCTION public.guard_university_commission_claim();
REVOKE ALL ON FUNCTION public.guard_university_commission_claim() FROM PUBLIC;

ALTER TABLE public.university_commission_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance claims read" ON public.university_commission_claims FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'finance_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "finance claims insert" ON public.university_commission_claims FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'finance_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "finance claims update" ON public.university_commission_claims FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'finance_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'finance_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT,INSERT,UPDATE ON public.university_commission_claims TO authenticated;

CREATE TABLE public.university_commission_claim_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 claim_id uuid NOT NULL REFERENCES public.university_commission_claims(id),
 from_status text,to_status text NOT NULL,
 actor_id uuid,occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.university_commission_claim_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance claim history" ON public.university_commission_claim_events FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'finance_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT ON public.university_commission_claim_events TO authenticated;
CREATE FUNCTION public.record_commission_claim_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
  INSERT INTO public.university_commission_claim_events(tenant_id,claim_id,from_status,to_status,actor_id)
   VALUES(NEW.tenant_id,NEW.id,CASE WHEN TG_OP='UPDATE' THEN OLD.status END,NEW.status,auth.uid());
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER commission_claim_history AFTER INSERT OR UPDATE ON public.university_commission_claims
 FOR EACH ROW EXECUTE FUNCTION public.record_commission_claim_status();
REVOKE ALL ON FUNCTION public.record_commission_claim_status() FROM PUBLIC;
COMMENT ON TABLE public.university_commission_claims IS
 'Agreement-linked eligible commission claims, manually reviewed. No bank settlement or accounting posting automatically occurs.';
