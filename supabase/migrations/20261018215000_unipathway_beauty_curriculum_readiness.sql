-- Source-only additive migration for the existing Lovable-connected Supabase project.
-- Deploy only after reconciliation against the live DB, backup and negative tenant tests.
-- Approval never flows from marketing pages or unauthenticated actions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.unipathway_accreditation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  scheme text NOT NULL CHECK (scheme IN ('cibtac_centre','cpduk_provider','cibtac_endorsed')),
  status text NOT NULL DEFAULT 'research' CHECK (status IN ('research','evidence','submitted','review','approved','declined','expired')),
  application_reference text,
  evidence_reference text,
  review_notes text,
  submitted_at timestamptz,
  decided_at timestamptz,
  valid_until date,
  verified_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unipathway_accreditation_unique_scheme UNIQUE(tenant_id,scheme),
  CONSTRAINT unipathway_accreditation_verified_evidence
    CHECK (status <> 'approved' OR
      (verified_by IS NOT NULL AND decided_at IS NOT NULL AND
       NULLIF(BTRIM(application_reference),'') IS NOT NULL AND
       NULLIF(BTRIM(evidence_reference),'') IS NOT NULL)),
  CONSTRAINT unipathway_accreditation_expiry
    CHECK (status <> 'approved' OR valid_until IS NULL OR valid_until >= decided_at::date)
);
CREATE INDEX IF NOT EXISTS unipathway_accreditation_tenant_status
  ON public.unipathway_accreditation_cases(tenant_id,status);
ALTER TABLE public.unipathway_accreditation_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accreditation staff read tenant cases"
  ON public.unipathway_accreditation_cases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
    (tenant_id=public.get_user_tenant_id(auth.uid()) AND
     (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
      public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
      public.has_role(auth.uid(),'iqa_officer'::public.app_role))));
CREATE POLICY "Accreditation leadership create preparations"
  ON public.unipathway_accreditation_cases FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
     (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
    AND status IN ('research','evidence') AND verified_by IS NULL AND decided_at IS NULL
  );
CREATE POLICY "Centre directors update unapproved applications"
  ON public.unipathway_accreditation_cases FOR UPDATE TO authenticated
  USING (status NOT IN ('approved','declined','expired') AND
    tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role))
  WITH CHECK (status IN ('research','evidence','submitted','review') AND
    verified_by IS NULL AND decided_at IS NULL AND
    tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role));
CREATE POLICY "Superadmins review accreditation cases"
  ON public.unipathway_accreditation_cases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'::public.app_role) AND
    (status <> 'approved' OR verified_by=auth.uid()));

CREATE TABLE IF NOT EXISTS public.unipathway_accreditation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  case_id uuid NOT NULL REFERENCES public.unipathway_accreditation_cases(id),
  from_status text,
  to_status text NOT NULL,
  evidence_reference text,
  changed_by uuid DEFAULT auth.uid(),
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS unipathway_accreditation_events_case ON public.unipathway_accreditation_events(case_id,changed_at DESC);
ALTER TABLE public.unipathway_accreditation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accreditation leadership read tenant event history"
  ON public.unipathway_accreditation_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
    (tenant_id=public.get_user_tenant_id(auth.uid()) AND
     (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
      public.has_role(auth.uid(),'iqa_officer'::public.app_role))));

CREATE OR REPLACE FUNCTION public.unipathway_touch_accreditation_case()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $touch_case$
BEGIN
 NEW.updated_at := now();
 RETURN NEW;
END;
$touch_case$;
CREATE OR REPLACE FUNCTION public.unipathway_track_accreditation_case()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $acc_event$
BEGIN
 IF TG_OP='INSERT' THEN
   INSERT INTO public.unipathway_accreditation_events
      (tenant_id,case_id,from_status,to_status,evidence_reference,changed_by)
   VALUES (NEW.tenant_id,NEW.id,NULL,NEW.status,NEW.evidence_reference,auth.uid());
 ELSIF OLD.status IS DISTINCT FROM NEW.status OR
       OLD.evidence_reference IS DISTINCT FROM NEW.evidence_reference THEN
   INSERT INTO public.unipathway_accreditation_events
      (tenant_id,case_id,from_status,to_status,evidence_reference,changed_by)
   VALUES (NEW.tenant_id,NEW.id,OLD.status,NEW.status,NEW.evidence_reference,auth.uid());
 END IF;
 RETURN NEW;
END;
$acc_event$;
CREATE TRIGGER trg_unipathway_touch_accreditation_case
 BEFORE INSERT OR UPDATE ON public.unipathway_accreditation_cases
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_touch_accreditation_case();
CREATE TRIGGER trg_unipathway_accreditation_case
 AFTER INSERT OR UPDATE ON public.unipathway_accreditation_cases
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_track_accreditation_case();

-- Course-specific authorisation / CPD review; CPD membership never implies course approval.
CREATE TABLE IF NOT EXISTS public.unipathway_curriculum_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  awarding_body text NOT NULL CHECK (awarding_body IN ('OTHM','Qualifi','CIBTAC','CPD UK')),
  qualification_code text NOT NULL,
  qualification_title text NOT NULL,
  qualification_source_url text NOT NULL,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  spec_version text,
  required_unit_count integer NOT NULL DEFAULT 0 CHECK (required_unit_count>=0),
  mapped_unit_count integer NOT NULL DEFAULT 0 CHECK (mapped_unit_count>=0 AND mapped_unit_count<=required_unit_count),
  delivery_plan_reference text,
  trainer_evidence_reference text,
  assessment_evidence_reference text,
  centre_permission_reference text,
  approval_evidence_reference text,
  review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft','units_mapped','qa_review','authorisation_pending','approved','suspended')),
  approved_at timestamptz,
  approved_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unipathway_curriculum_per_tenant UNIQUE(tenant_id,awarding_body,qualification_code),
  CONSTRAINT unipathway_curriculum_approval_gate CHECK (
    review_status <> 'approved' OR
    (approved_by IS NOT NULL AND approved_at IS NOT NULL AND required_unit_count>0
      AND mapped_unit_count=required_unit_count
      AND NULLIF(BTRIM(centre_permission_reference),'') IS NOT NULL
      AND NULLIF(BTRIM(approval_evidence_reference),'') IS NOT NULL
      AND NULLIF(BTRIM(trainer_evidence_reference),'') IS NOT NULL
      AND NULLIF(BTRIM(assessment_evidence_reference),'') IS NOT NULL
      AND NULLIF(BTRIM(delivery_plan_reference),'') IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS unipathway_curriculum_tenant_status
 ON public.unipathway_curriculum_reviews(tenant_id,review_status);
ALTER TABLE public.unipathway_curriculum_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curriculum staff read reviewed qualifications"
 ON public.unipathway_curriculum_reviews FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
    public.has_role(auth.uid(),'iqa_officer'::public.app_role))));
CREATE POLICY "Curriculum managers draft mappings"
 ON public.unipathway_curriculum_reviews FOR INSERT TO authenticated
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'programme_leader'::public.app_role)) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
   AND review_status='draft' AND approved_by IS NULL AND approved_at IS NULL);
CREATE POLICY "Curriculum managers edit unapproved mappings"
 ON public.unipathway_curriculum_reviews FOR UPDATE TO authenticated
 USING (review_status NOT IN ('approved','suspended') AND tenant_id=public.get_user_tenant_id(auth.uid()) AND
  (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role)))
 WITH CHECK (review_status IN ('draft','units_mapped','qa_review','authorisation_pending') AND
  approved_by IS NULL AND approved_at IS NULL AND tenant_id=public.get_user_tenant_id(auth.uid()) AND
  (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role)));
CREATE POLICY "Superadmin approves curriculum evidence"
 ON public.unipathway_curriculum_reviews FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role))
 WITH CHECK (public.has_role(auth.uid(),'superadmin'::public.app_role) AND
  (review_status <> 'approved' OR approved_by=auth.uid()));

CREATE TABLE IF NOT EXISTS public.unipathway_curriculum_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 review_id uuid NOT NULL REFERENCES public.unipathway_curriculum_reviews(id) ON DELETE CASCADE,
 unit_reference text NOT NULL,
 unit_title text NOT NULL,
 credits numeric(7,2) CHECK (credits IS NULL OR credits>=0),
 guided_learning_hours numeric(8,2) CHECK (guided_learning_hours IS NULL OR guided_learning_hours>=0),
 specification_source_url text NOT NULL,
 lms_module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
 material_manifest_reference text,
 approval_status text NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft','reviewed','approved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(review_id,unit_reference)
);
CREATE INDEX IF NOT EXISTS unipathway_unit_review ON public.unipathway_curriculum_units(review_id);
ALTER TABLE public.unipathway_curriculum_units ENABLE ROW LEVEL SECURITY;
-- Pair each unit with its parent tenant to stop forged tenant linkage.
CREATE OR REPLACE FUNCTION public.unipathway_assert_unit_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $unit_tenant$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.unipathway_curriculum_reviews p
               WHERE p.id=NEW.review_id AND p.tenant_id=NEW.tenant_id)
 THEN RAISE EXCEPTION 'Unit mapping tenant mismatch'; END IF;
 RETURN NEW;
END;
$unit_tenant$;
CREATE TRIGGER trg_unipathway_unit_tenant
 BEFORE INSERT OR UPDATE ON public.unipathway_curriculum_units
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_assert_unit_tenant();

CREATE POLICY "Curriculum staff read tenant units"
 ON public.unipathway_curriculum_units FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
    public.has_role(auth.uid(),'iqa_officer'::public.app_role))));
CREATE POLICY "Curriculum managers draft unit mappings"
 ON public.unipathway_curriculum_units FOR INSERT TO authenticated
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role))))
  AND approval_status='draft' AND EXISTS(SELECT 1 FROM public.unipathway_curriculum_reviews p
    WHERE p.id=review_id AND p.tenant_id=unipathway_curriculum_units.tenant_id
    AND p.review_status<>'approved'));
CREATE POLICY "Curriculum managers edit unapproved unit mappings"
 ON public.unipathway_curriculum_units FOR UPDATE TO authenticated
 USING (tenant_id=public.get_user_tenant_id(auth.uid()) AND
  (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role))
  AND approval_status<>'approved')
 WITH CHECK (tenant_id=public.get_user_tenant_id(auth.uid()) AND
  (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role))
  AND approval_status IN ('draft','reviewed') AND EXISTS(SELECT 1 FROM public.unipathway_curriculum_reviews p
    WHERE p.id=review_id AND p.tenant_id=unipathway_curriculum_units.tenant_id
    AND p.review_status<>'approved'));
CREATE POLICY "Superadmin verifies units"
 ON public.unipathway_curriculum_units FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role))
 WITH CHECK (public.has_role(auth.uid(),'superadmin'::public.app_role));

-- Prevent approval based on a hand-entered mapped-unit count or another
-- tenant's programme/module. Actual unit evidence and source links are required.
CREATE OR REPLACE FUNCTION public.unipathway_verify_curriculum_release()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $curriculum_release$
DECLARE
  _total integer;
  _ready integer;
  _scheme text;
BEGIN
  IF NEW.programme_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.programmes p WHERE p.id=NEW.programme_id AND p.tenant_id=NEW.tenant_id)
  THEN RAISE EXCEPTION 'Programme and review belong to different tenants'; END IF;
  IF NEW.review_status='approved' THEN
    SELECT COUNT(*),COUNT(*) FILTER(WHERE u.approval_status='approved'
       AND u.lms_module_id IS NOT NULL AND NULLIF(BTRIM(u.material_manifest_reference),'') IS NOT NULL
       AND NULLIF(BTRIM(u.specification_source_url),'') IS NOT NULL)
      INTO _total,_ready
    FROM public.unipathway_curriculum_units u
    WHERE u.review_id=NEW.id AND u.tenant_id=NEW.tenant_id;
    IF _total<>NEW.required_unit_count OR _ready<>_total OR _total<1 THEN
      RAISE EXCEPTION 'Approved qualification requires every mapped unit, LMS module, private material manifest and unit verification';
    END IF;
    IF NEW.awarding_body IN ('CIBTAC','CPD UK') THEN
      _scheme:=CASE WHEN NEW.awarding_body='CIBTAC' THEN 'cibtac_centre' ELSE 'cpduk_provider' END;
      IF NOT EXISTS(SELECT 1 FROM public.unipathway_accreditation_cases c
        WHERE c.tenant_id=NEW.tenant_id AND c.scheme=_scheme AND c.status='approved'
        AND (c.valid_until IS NULL OR c.valid_until>=CURRENT_DATE)) THEN
        RAISE EXCEPTION 'Organisation approval must be verified before curriculum release for %',NEW.awarding_body;
      END IF;
    END IF;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$curriculum_release$;
CREATE TRIGGER trg_unipathway_verify_curriculum_release
 BEFORE INSERT OR UPDATE ON public.unipathway_curriculum_reviews
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_verify_curriculum_release();

CREATE OR REPLACE FUNCTION public.unipathway_verify_unit_mapping()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $unit_guard$
DECLARE _p record;
BEGIN
  SELECT * INTO _p FROM public.unipathway_curriculum_reviews
   WHERE id=NEW.review_id AND tenant_id=NEW.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unit review is not in the same tenant'; END IF;
  IF _p.review_status='approved' THEN
    RAISE EXCEPTION 'Suspend programme authorisation before editing unit mappings';
  END IF;
  IF NEW.lms_module_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM public.modules m WHERE m.id=NEW.lms_module_id AND m.tenant_id=NEW.tenant_id
      AND (_p.programme_id IS NULL OR m.programme_id=_p.programme_id))
  THEN RAISE EXCEPTION 'LMS module does not belong to the same tenant and programme'; END IF;
  RETURN NEW;
END;
$unit_guard$;
DROP TRIGGER IF EXISTS trg_unipathway_unit_tenant ON public.unipathway_curriculum_units;
CREATE TRIGGER trg_unipathway_unit_tenant
 BEFORE INSERT OR UPDATE ON public.unipathway_curriculum_units
 FOR EACH ROW EXECUTE FUNCTION public.unipathway_verify_unit_mapping();

-- Explicit permissions: no anonymous access to accreditation or learner materials.
REVOKE ALL ON public.unipathway_accreditation_cases,
 public.unipathway_accreditation_events,
 public.unipathway_curriculum_reviews,
 public.unipathway_curriculum_units FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_accreditation_cases TO authenticated;
GRANT SELECT ON public.unipathway_accreditation_events TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_curriculum_reviews TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_curriculum_units TO authenticated;

COMMIT;
