-- UniPathway staff development and formal third-party application tracking.
-- Internal records only. No British Council, IDP or university approval is conferred.
CREATE TABLE public.education_staff_credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 credential_name text NOT NULL CHECK(length(btrim(credential_name)) BETWEEN 5 AND 200),
 provider_name text NOT NULL CHECK(length(btrim(provider_name)) BETWEEN 3 AND 200),
 credential_number text,
 issued_on date,
 expires_on date,
 evidence_reference text,
 status text NOT NULL DEFAULT 'unverified' CHECK(status IN ('unverified','reviewed','expired','rejected')),
 verified_by uuid REFERENCES auth.users(id),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_on IS NULL OR issued_on IS NULL OR expires_on>=issued_on),
 CHECK(status<>'reviewed' OR (evidence_reference IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL)),
 UNIQUE(tenant_id,staff_id,provider_name,credential_name)
);
CREATE INDEX education_credential_tenant ON public.education_staff_credentials(tenant_id,staff_id,status,expires_on);

CREATE FUNCTION public.guard_education_credential()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' AND (NEW.status<>'unverified' OR NEW.verified_by IS NOT NULL OR NEW.verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Staff training evidence must start as unverified' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.tenant_id,NEW.staff_id,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.staff_id,OLD.created_at) THEN
   RAISE EXCEPTION 'Credential ownership is immutable' USING ERRCODE='42501'; END IF;
  IF ROW(NEW.credential_name,NEW.provider_name,NEW.credential_number,NEW.issued_on,NEW.expires_on,NEW.evidence_reference)
    IS DISTINCT FROM ROW(OLD.credential_name,OLD.provider_name,OLD.credential_number,OLD.issued_on,OLD.expires_on,OLD.evidence_reference)
    AND OLD.status='reviewed' THEN NEW.status:='unverified'; END IF;
 END IF;
 IF NEW.status='reviewed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  IF length(btrim(coalesce(NEW.evidence_reference,'')))<5
    OR (NEW.expires_on IS NOT NULL AND NEW.expires_on<current_date) THEN
   RAISE EXCEPTION 'Current supporting training evidence is needed' USING ERRCODE='42501'; END IF;
  NEW.verified_by:=auth.uid();NEW.verified_at:=now();
 ELSIF NEW.status<>'reviewed' THEN NEW.verified_by:=NULL;NEW.verified_at:=NULL; END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
CREATE TRIGGER education_credential_guard BEFORE INSERT OR UPDATE ON public.education_staff_credentials
 FOR EACH ROW EXECUTE FUNCTION public.guard_education_credential();
REVOKE ALL ON FUNCTION public.guard_education_credential() FROM PUBLIC;

ALTER TABLE public.education_staff_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credential own or manager read" ON public.education_staff_credentials FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (staff_id=auth.uid()
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "credential manager create" ON public.education_staff_credentials FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "credential manager edit" ON public.education_staff_credentials FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT,INSERT,UPDATE ON public.education_staff_credentials TO authenticated;

CREATE TABLE public.education_partner_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 organisation_name text NOT NULL CHECK(length(btrim(organisation_name)) BETWEEN 3 AND 200),
 country text NOT NULL CHECK(country IN ('Pakistan','UK','USA','Canada','Australia','Germany','Global')),
 programme text NOT NULL CHECK(programme IN (
  'ielts_registration_partner','ielts_test_venue','university_recruitment_agent',
  'academic_articulation','education_agent_network','other')),
 stage text NOT NULL DEFAULT 'research' CHECK(stage IN (
  'research','contacted','submitted','due_diligence','approved','rejected','withdrawn','expired')),
 owner_id uuid REFERENCES auth.users(id),
 official_application_url text CHECK(official_application_url IS NULL OR official_application_url ~ '^https://[^[:space:]]+$'),
 documents_checklist text,
 notes text,
 next_action text,
 next_action_at timestamptz,
 submitted_at timestamptz,
 approval_reference text,
 approval_verified_by uuid REFERENCES auth.users(id),
 approval_verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,organisation_name,country,programme),
 CHECK(stage<>'approved' OR (approval_reference IS NOT NULL
   AND approval_verified_by IS NOT NULL AND approval_verified_at IS NOT NULL))
);
CREATE INDEX partner_application_pipeline ON public.education_partner_applications(tenant_id,programme,stage,next_action_at);

CREATE FUNCTION public.guard_education_partner_application()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' AND (NEW.stage NOT IN ('research','contacted')
 OR NEW.approval_verified_by IS NOT NULL OR NEW.approval_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Partner applications must begin as unapproved prospects' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND ROW(NEW.id,NEW.tenant_id,NEW.organisation_name,NEW.country,NEW.programme,NEW.created_at)
  IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.organisation_name,OLD.country,OLD.programme,OLD.created_at) THEN
  RAISE EXCEPTION 'Partner application identity is immutable' USING ERRCODE='42501'; END IF;
 IF NEW.stage='approved' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
  IF length(btrim(coalesce(NEW.approval_reference,'')))<8 THEN
   RAISE EXCEPTION 'Formal third-party approval reference required' USING ERRCODE='42501'; END IF;
  NEW.approval_verified_by:=auth.uid();NEW.approval_verified_at:=now();
 ELSIF NEW.stage<>'approved' THEN
  NEW.approval_verified_by:=NULL;NEW.approval_verified_at:=NULL;
 END IF;
 IF NEW.stage='submitted' AND NEW.submitted_at IS NULL THEN NEW.submitted_at:=now(); END IF;
 NEW.updated_at:=now();RETURN NEW;
END $$;
CREATE TRIGGER education_partner_application_guard BEFORE INSERT OR UPDATE ON public.education_partner_applications
 FOR EACH ROW EXECUTE FUNCTION public.guard_education_partner_application();
REVOKE ALL ON FUNCTION public.guard_education_partner_application() FROM PUBLIC;

ALTER TABLE public.education_partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner applications staff read" ON public.education_partner_applications FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "partner applications manager insert" ON public.education_partner_applications FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "partner applications manager update" ON public.education_partner_applications FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT,INSERT,UPDATE ON public.education_partner_applications TO authenticated;
COMMENT ON TABLE public.education_partner_applications IS
 'Internal onboarding, not evidence of external agent registration or British Council IELTS recognition.';
