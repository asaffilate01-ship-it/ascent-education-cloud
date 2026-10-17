-- Verified academic recognition does not imply a recruitment/commission agreement.
-- Store official, attributable progression references independently of commercial partners.
CREATE TABLE public.academic_progression_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 awarding_body text NOT NULL CHECK(awarding_body IN ('OTHM','Qualifi','Other')),
 qualification_name text NOT NULL CHECK(length(btrim(qualification_name)) BETWEEN 3 AND 200),
 qualification_level text NOT NULL CHECK(length(btrim(qualification_level)) BETWEEN 1 AND 60),
 destination_country text NOT NULL CHECK(length(btrim(destination_country)) BETWEEN 2 AND 60),
 destination_institution text NOT NULL CHECK(length(btrim(destination_institution)) BETWEEN 3 AND 200),
 destination_programme text NOT NULL CHECK(length(btrim(destination_programme)) BETWEEN 3 AND 200),
 entry_stage text,
 grade_requirements text,
 english_requirements text,
 source_kind text NOT NULL DEFAULT 'awarding_body_directory'
   CHECK(source_kind IN ('awarding_body_directory','university_official_page')),
 source_url text CHECK(source_url IS NULL OR source_url ~* '^https://[^[:space:]]+$'),
 review_status text NOT NULL DEFAULT 'proposed'
   CHECK(review_status IN ('proposed','under_review','verified','withdrawn')),
 student_visible boolean NOT NULL DEFAULT false,
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 recheck_due date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(review_status<>'verified' OR (source_url IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(NOT student_visible OR review_status='verified'),
 UNIQUE(id,tenant_id)
);
CREATE INDEX academic_progression_tenant_lookup ON public.academic_progression_evidence
 (tenant_id,awarding_body,destination_country,review_status,student_visible);

-- Only an authorised manager can change records through RLS. Any change to the
-- qualification, accepting university/programme, or source revokes verification
-- until a *separate* human re-review is recorded. Students never see expired records.
CREATE FUNCTION public.guard_academic_progression_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE changed boolean := false;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Academic evidence ownership is immutable' USING ERRCODE='42501';
  END IF;
  changed:=ROW(NEW.awarding_body,NEW.qualification_name,NEW.qualification_level,
   NEW.destination_country,NEW.destination_institution,NEW.destination_programme,
   NEW.entry_stage,NEW.grade_requirements,NEW.english_requirements,
   NEW.source_kind,NEW.source_url)
   IS DISTINCT FROM ROW(OLD.awarding_body,OLD.qualification_name,OLD.qualification_level,
   OLD.destination_country,OLD.destination_institution,OLD.destination_programme,
   OLD.entry_stage,OLD.grade_requirements,OLD.english_requirements,
   OLD.source_kind,OLD.source_url);
  IF changed AND OLD.review_status='verified' THEN
   NEW.review_status:='under_review';
   NEW.student_visible:=false;
   NEW.reviewed_by:=NULL;
   NEW.reviewed_at:=NULL;
  END IF;
 END IF;
 IF NEW.review_status='verified'
   AND (TG_OP='INSERT' OR OLD.review_status IS DISTINCT FROM NEW.review_status) THEN
  IF NEW.source_url IS NULL OR length(btrim(NEW.source_url))<12
   OR (NEW.recheck_due IS NOT NULL AND NEW.recheck_due<current_date) THEN
   RAISE EXCEPTION 'A current original official evidence URL is required for verification';
  END IF;
  NEW.reviewed_by:=auth.uid();
  NEW.reviewed_at:=now();
 ELSIF NEW.review_status<>'verified' THEN
  NEW.student_visible:=false;
  NEW.reviewed_by:=NULL;
  NEW.reviewed_at:=NULL;
 END IF;
 IF NEW.student_visible AND (NEW.review_status<>'verified'
   OR (NEW.recheck_due IS NOT NULL AND NEW.recheck_due<current_date)) THEN
  RAISE EXCEPTION 'Cannot publish an expired or unverified academic route';
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
CREATE TRIGGER academic_progression_guard BEFORE INSERT OR UPDATE ON public.academic_progression_evidence
 FOR EACH ROW EXECUTE FUNCTION public.guard_academic_progression_evidence();
REVOKE ALL ON FUNCTION public.guard_academic_progression_evidence() FROM PUBLIC;

ALTER TABLE public.academic_progression_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic sources management read" ON public.academic_progression_evidence
 FOR SELECT TO authenticated USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 OR public.has_role(auth.uid(),'programme_leader'::public.app_role)));
CREATE POLICY "academic reviewed student read" ON public.academic_progression_evidence
 FOR SELECT TO authenticated USING(public.same_tenant(tenant_id)
 AND public.has_role(auth.uid(),'student'::public.app_role)
 AND review_status='verified' AND student_visible
 AND (recheck_due IS NULL OR recheck_due>=current_date));
CREATE POLICY "academic sources staff insert" ON public.academic_progression_evidence
 FOR INSERT TO authenticated WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "academic sources staff update" ON public.academic_progression_evidence
 FOR UPDATE TO authenticated USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT,INSERT,UPDATE ON public.academic_progression_evidence TO authenticated;
REVOKE DELETE ON public.academic_progression_evidence FROM authenticated;

CREATE TABLE public.academic_progression_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 evidence_id uuid NOT NULL,
 changed_by uuid,
 old_status text,new_status text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_progression_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic audit manager read" ON public.academic_progression_audit FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT ON public.academic_progression_audit TO authenticated;

CREATE FUNCTION public.log_academic_progression_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.academic_progression_audit(tenant_id,evidence_id,changed_by,old_status,new_status)
 VALUES(NEW.tenant_id,NEW.id,auth.uid(),CASE WHEN TG_OP='UPDATE' THEN OLD.review_status END,NEW.review_status);
 RETURN NEW;
END $$;
CREATE TRIGGER academic_progression_audit AFTER INSERT OR UPDATE ON public.academic_progression_evidence
 FOR EACH ROW EXECUTE FUNCTION public.log_academic_progression_change();
REVOKE ALL ON FUNCTION public.log_academic_progression_change() FROM PUBLIC;

COMMENT ON TABLE public.academic_progression_evidence IS
 'Evidence-reviewed academic pathways. No claim of university agent appointment or referral commission.';
