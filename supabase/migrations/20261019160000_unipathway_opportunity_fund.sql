-- UniPathway Foundation / Opportunity Fund: private merit-and-need cases.
-- Foundation status is a project designation only; this migration does NOT
-- claim charitable registration, collected money or an approved scholarship.
-- Install in reconciled Lovable Supabase after staging, backups and RLS tests.
BEGIN;
CREATE TABLE IF NOT EXISTS public.unipathway_foundation_programmes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 name text NOT NULL,
 academic_year text NOT NULL,
 status text NOT NULL DEFAULT 'planning' CHECK(status IN('planning','open','paused','closed')),
 approved_internal_budget_pkr numeric(15,2) NOT NULL DEFAULT 0 CHECK(approved_internal_budget_pkr>=0),
 policy_reference text,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,name,academic_year)
);
ALTER TABLE public.unipathway_foundation_programmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund leadership can inspect programmes" ON public.unipathway_foundation_programmes FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'finance_officer'::public.app_role) OR public.has_role(auth.uid(),'admissions_admin'::public.app_role))));
CREATE POLICY "Fund superadmins manage budgets" ON public.unipathway_foundation_programmes FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role))
 WITH CHECK(public.has_role(auth.uid(),'superadmin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.unipathway_foundation_sponsorships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 programme_id uuid NOT NULL REFERENCES public.unipathway_foundation_programmes(id),
 sponsor_type text NOT NULL CHECK(sponsor_type IN('employer','organisation','private_donor','institution')),
 sponsor_display_reference text NOT NULL,
 pledge_pkr numeric(15,2) NOT NULL CHECK(pledge_pkr>0),
 verified_received_pkr numeric(15,2) NOT NULL DEFAULT 0 CHECK(verified_received_pkr>=0 AND verified_received_pkr<=pledge_pkr),
 receipt_reference text,
 verified_by uuid,
 verified_at timestamptz,
 privacy_terms_reference text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT fund_sponsor_receipt CHECK(verified_received_pkr=0 OR
  (NULLIF(trim(receipt_reference),'') IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
ALTER TABLE public.unipathway_foundation_sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund finance team reads pledged and received sponsorships"
 ON public.unipathway_foundation_sponsorships FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'finance_officer'::public.app_role)));
CREATE POLICY "Fund superadmin records verified sponsorship"
 ON public.unipathway_foundation_sponsorships FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role))
 WITH CHECK(public.has_role(auth.uid(),'superadmin'::public.app_role) AND
  (verified_received_pkr=0 OR verified_by=auth.uid()));

CREATE TABLE IF NOT EXISTS public.unipathway_foundation_scholarship_cases(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 programme_id uuid NOT NULL REFERENCES public.unipathway_foundation_programmes(id),
 applicant_reference text NOT NULL CHECK(length(trim(applicant_reference)) BETWEEN 8 AND 180),
 applicant_user_id uuid,
 age_category text NOT NULL CHECK(age_category IN('adult','minor')),
 academic_stage text NOT NULL,
 academic_score numeric(5,2) CHECK(academic_score IS NULL OR academic_score BETWEEN 0 AND 100),
 academic_evidence_reference text,
 financial_need_band text CHECK(financial_need_band IN('critical','high','moderate','unverified')),
 financial_evidence_reference text,
 exceptional_context_reference text,
 guardian_consent_reference text,
 applicant_consent_reference text,
 applicant_requested_pkr numeric(15,2) NOT NULL CHECK(applicant_requested_pkr>0),
 awarded_pkr numeric(15,2) NOT NULL DEFAULT 0 CHECK(awarded_pkr>=0 AND awarded_pkr<=applicant_requested_pkr),
 status text NOT NULL DEFAULT 'draft'
  CHECK(status IN('draft','evidence_review','panel_review','approved','declined','withdrawn')),
 selection_notes text,
 selection_policy_reference text,
 independently_reviewed_by uuid,
 approved_by uuid,
 approved_at timestamptz,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,applicant_reference,programme_id),
 CONSTRAINT scholarship_minor_guardian CHECK(age_category<>'minor' OR
  NULLIF(trim(guardian_consent_reference),'') IS NOT NULL),
 CONSTRAINT scholarship_award_evidence CHECK(status<>'approved' OR
  (awarded_pkr>0 AND academic_score IS NOT NULL AND
   NULLIF(trim(academic_evidence_reference),'') IS NOT NULL AND
   financial_need_band IN('critical','high','moderate') AND
   NULLIF(trim(financial_evidence_reference),'') IS NOT NULL AND
   NULLIF(trim(applicant_consent_reference),'') IS NOT NULL AND
   NULLIF(trim(selection_policy_reference),'') IS NOT NULL AND
   independently_reviewed_by IS NOT NULL AND independently_reviewed_by<>approved_by AND
   approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
ALTER TABLE public.unipathway_foundation_scholarship_cases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS foundation_case_tenant_status
 ON public.unipathway_foundation_scholarship_cases(tenant_id,status,programme_id);

CREATE POLICY "Fund leadership reviews protected scholarship cases"
 ON public.unipathway_foundation_scholarship_cases FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'admissions_admin'::public.app_role) OR
    public.has_role(auth.uid(),'finance_officer'::public.app_role))));
CREATE POLICY "Centre directors can submit documented draft cases"
 ON public.unipathway_foundation_scholarship_cases FOR INSERT TO authenticated
 WITH CHECK(tenant_id=public.get_user_tenant_id(auth.uid()) AND
  public.has_role(auth.uid(),'centre_director'::public.app_role) AND
  status IN('draft','evidence_review') AND awarded_pkr=0 AND approved_by IS NULL);
CREATE POLICY "Centre directors may edit only unapproved cases"
 ON public.unipathway_foundation_scholarship_cases FOR UPDATE TO authenticated
 USING(tenant_id=public.get_user_tenant_id(auth.uid()) AND
  public.has_role(auth.uid(),'centre_director'::public.app_role) AND
  status IN('draft','evidence_review','panel_review'))
 WITH CHECK(tenant_id=public.get_user_tenant_id(auth.uid()) AND
  public.has_role(auth.uid(),'centre_director'::public.app_role) AND
  status IN('draft','evidence_review','panel_review') AND approved_by IS NULL AND awarded_pkr=0);
CREATE POLICY "Fund superadmin manages final awards"
 ON public.unipathway_foundation_scholarship_cases FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role))
 WITH CHECK(public.has_role(auth.uid(),'superadmin'::public.app_role) AND
  (status<>'approved' OR approved_by=auth.uid()));

-- Independently signed review evidence, never a UUID typed by the approver.
CREATE TABLE IF NOT EXISTS public.unipathway_foundation_case_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 scholarship_case_id uuid NOT NULL REFERENCES public.unipathway_foundation_scholarship_cases(id),
 reviewer_id uuid NOT NULL DEFAULT auth.uid(),
 recommendation text NOT NULL CHECK(recommendation IN('eligible','needs_information','not_eligible')),
 merit_assessment text NOT NULL CHECK(length(trim(merit_assessment)) BETWEEN 10 AND 2000),
 financial_need_assessment text NOT NULL CHECK(length(trim(financial_need_assessment)) BETWEEN 10 AND 2000),
 review_evidence_reference text NOT NULL CHECK(length(trim(review_evidence_reference))>0),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scholarship_case_id,reviewer_id)
);
ALTER TABLE public.unipathway_foundation_case_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorised fund staff read scoped scholarship reviews"
 ON public.unipathway_foundation_case_reviews FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'finance_officer'::public.app_role))));
CREATE POLICY "Independent reviewer signs their own case review"
 ON public.unipathway_foundation_case_reviews FOR INSERT TO authenticated
 WITH CHECK(reviewer_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND
  (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'finance_officer'::public.app_role)));
CREATE OR REPLACE FUNCTION public.unipathway_validate_signed_scholarship_review()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
 AS $review_check$
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.unipathway_foundation_scholarship_cases c
    WHERE c.id=NEW.scholarship_case_id AND c.tenant_id=NEW.tenant_id
     AND c.created_by<>NEW.reviewer_id AND c.status='panel_review')
  THEN RAISE EXCEPTION 'Independent review requires an open panel case in the same tenant'; END IF;
  RETURN NEW;
 END;$review_check$;
CREATE TRIGGER trg_unipathway_case_review_signature
 BEFORE INSERT ON public.unipathway_foundation_case_reviews
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_validate_signed_scholarship_review();
REVOKE ALL ON public.unipathway_foundation_case_reviews FROM anon;
GRANT SELECT,INSERT ON public.unipathway_foundation_case_reviews TO authenticated;

-- Verify tenant ownership, dual human review, confirmed funding and spending.
-- Lock the parent programme to serialize simultaneous award decisions.
CREATE OR REPLACE FUNCTION public.unipathway_verify_scholarship_case()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
 AS $award_gate$
 DECLARE _internal numeric; _received numeric; _allocated numeric;
 BEGIN
  SELECT approved_internal_budget_pkr INTO _internal
   FROM public.unipathway_foundation_programmes
   WHERE id=NEW.programme_id AND tenant_id=NEW.tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Scholarship programme and tenant must match'; END IF;
  IF TG_OP='UPDATE' AND (OLD.tenant_id<>NEW.tenant_id OR OLD.programme_id<>NEW.programme_id OR OLD.applicant_reference<>NEW.applicant_reference)
  THEN RAISE EXCEPTION 'Scholarship case identity cannot be reassigned'; END IF;
  IF NEW.status='approved' THEN
   IF NOT EXISTS(SELECT 1 FROM public.unipathway_foundation_programmes p
     WHERE p.id=NEW.programme_id AND p.tenant_id=NEW.tenant_id AND p.status='open') THEN
     RAISE EXCEPTION 'Funding programme must be open before any award';
   END IF;
   IF NOT EXISTS(
      SELECT 1 FROM public.unipathway_foundation_case_reviews r
      WHERE r.scholarship_case_id=NEW.id AND r.tenant_id=NEW.tenant_id
        AND r.reviewer_id=NEW.independently_reviewed_by
        AND r.reviewer_id<>auth.uid() AND r.recommendation='eligible'
        AND r.reviewed_at<=NEW.approved_at
   ) THEN RAISE EXCEPTION 'A real, independent positive case review is required';
   END IF;
   SELECT COALESCE(SUM(s.verified_received_pkr),0) INTO _received
     FROM public.unipathway_foundation_sponsorships s
     WHERE s.tenant_id=NEW.tenant_id AND s.programme_id=NEW.programme_id;
   SELECT COALESCE(SUM(c.awarded_pkr),0) INTO _allocated
     FROM public.unipathway_foundation_scholarship_cases c
     WHERE c.tenant_id=NEW.tenant_id AND c.programme_id=NEW.programme_id
      AND c.status='approved' AND c.id<>NEW.id;
   IF NEW.awarded_pkr+_allocated>_internal+_received THEN
    RAISE EXCEPTION 'Cannot award beyond authorised budget and verified received funding';
   END IF;
   IF NOT public.has_role(auth.uid(),'superadmin'::public.app_role)
   THEN RAISE EXCEPTION 'Scholarship awards require independent foundation approval'; END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
 END;$award_gate$;
CREATE TRIGGER trg_unipathway_verify_scholarship
 BEFORE INSERT OR UPDATE ON public.unipathway_foundation_scholarship_cases
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_verify_scholarship_case();

CREATE OR REPLACE FUNCTION public.unipathway_check_sponsor_fund()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
 AS $pledge_tenant$
 BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.unipathway_foundation_programmes p
    WHERE p.id=NEW.programme_id AND p.tenant_id=NEW.tenant_id)
  THEN RAISE EXCEPTION 'Sponsor and fund tenant mismatch'; END IF;
  IF TG_OP='UPDATE' AND (OLD.tenant_id<>NEW.tenant_id OR OLD.programme_id<>NEW.programme_id)
  THEN RAISE EXCEPTION 'Cannot move sponsorship funds to another tenant or programme'; END IF;
  RETURN NEW;
 END;$pledge_tenant$;
CREATE TRIGGER trg_unipathway_check_sponsor
 BEFORE INSERT OR UPDATE ON public.unipathway_foundation_sponsorships
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_check_sponsor_fund();

-- Employers never receive access to scholarship application dossiers.
REVOKE ALL ON public.unipathway_foundation_programmes,
 public.unipathway_foundation_sponsorships,
 public.unipathway_foundation_scholarship_cases FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_foundation_programmes,
 public.unipathway_foundation_sponsorships,
 public.unipathway_foundation_scholarship_cases TO authenticated;
COMMIT;
