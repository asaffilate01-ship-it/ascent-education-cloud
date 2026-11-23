ALTER TABLE public.applications ADD CONSTRAINT international_service_application_key UNIQUE (id, tenant_id);

CREATE TABLE public.international_service_enrolments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 enquiry_id uuid NOT NULL,
 student_id uuid NOT NULL,
 service_type text NOT NULL CHECK (service_type IN ('ielts_preparation','university_counselling')),
 billing_mode text NOT NULL CHECK (billing_mode IN ('included','complimentary','quoted')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
 assigned_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id, enquiry_id),
 FOREIGN KEY (enquiry_id, tenant_id) REFERENCES public.applications(id, tenant_id)
);
CREATE INDEX international_service_student_idx ON public.international_service_enrolments(tenant_id, student_id, service_type);
GRANT SELECT, UPDATE ON public.international_service_enrolments TO authenticated;
GRANT ALL ON public.international_service_enrolments TO service_role;
ALTER TABLE public.international_service_enrolments ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.guard_international_service_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF ROW(NEW.id, NEW.tenant_id, NEW.enquiry_id, NEW.student_id, NEW.service_type, NEW.billing_mode, NEW.assigned_by, NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id, OLD.tenant_id, OLD.enquiry_id, OLD.student_id, OLD.service_type, OLD.billing_mode, OLD.assigned_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Service identity, agreement and billing classification are immutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'Completed service needs a new approved case' USING ERRCODE = '42501';
  END IF;
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER guard_international_service_change BEFORE UPDATE ON public.international_service_enrolments
 FOR EACH ROW EXECUTE FUNCTION public.guard_international_service_change();

CREATE POLICY "international service student read" ON public.international_service_enrolments FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid());
CREATE POLICY "international service staff read" ON public.international_service_enrolments FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "international service staff lifecycle" ON public.international_service_enrolments FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));

CREATE FUNCTION public.activate_international_service_from_lead(p_enquiry uuid, p_student uuid, p_billing_mode text DEFAULT 'complimentary')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lead public.applications; expected_service text; account_email text; service_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
 SELECT * INTO lead FROM public.applications WHERE id = p_enquiry FOR UPDATE;
 IF lead.id IS NULL OR lead.tenant_id IS NULL OR NOT public.same_tenant(lead.tenant_id)
 OR NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()
  AND (r.tenant_id = lead.tenant_id OR r.role = 'superadmin'::public.app_role)
  AND r.role IN ('admissions_admin'::public.app_role,'centre_director'::public.app_role,'superadmin'::public.app_role))
 THEN RAISE EXCEPTION 'Centre admissions authorisation required' USING ERRCODE = '42501'; END IF;
 expected_service := CASE
  WHEN lead.source = 'ielts_preparation' THEN 'ielts_preparation'
  WHEN lead.source LIKE 'university_progression_%' OR lead.source IN ('consultancy_uk','consultancy_germany') THEN 'university_counselling'
  ELSE NULL END;
 IF expected_service IS NULL THEN RAISE EXCEPTION 'Lead is not an eligible education-service request' USING ERRCODE = '22023'; END IF;
 SELECT lower(btrim(u.email)) INTO account_email FROM auth.users u WHERE u.id = p_student AND u.email_confirmed_at IS NOT NULL;
 IF account_email IS NULL OR account_email <> lower(btrim(lead.email)) OR NOT EXISTS (
   SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.user_id
   WHERE p.user_id = p_student AND p.tenant_id = lead.tenant_id AND r.role = 'student'::public.app_role) THEN
  RAISE EXCEPTION 'Use an email-verified learner account matching this enquiry in the same centre' USING ERRCODE = '42501';
 END IF;
 IF lead.user_id IS NOT NULL AND lead.user_id <> p_student THEN
  RAISE EXCEPTION 'This enquiry is already associated with another user' USING ERRCODE = '42501';
 END IF;
 IF p_billing_mode NOT IN ('complimentary','included') THEN
  RAISE EXCEPTION 'Only documented included or complimentary counselling is currently available' USING ERRCODE = '22023';
 END IF;
 IF p_billing_mode = 'included' AND NOT EXISTS (SELECT 1 FROM public.student_enrolments se WHERE se.student_id = p_student
   AND se.tenant_id = lead.tenant_id AND se.status = 'active') THEN
  RAISE EXCEPTION 'Bundled services require an active academic course enrolment' USING ERRCODE = '42501';
 END IF;
 SELECT id INTO service_id FROM public.international_service_enrolments WHERE tenant_id = lead.tenant_id AND enquiry_id = lead.id;
 IF service_id IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM public.international_service_enrolments WHERE id = service_id AND student_id = p_student AND service_type = expected_service) THEN
   RAISE EXCEPTION 'Lead is already matched to another student or service' USING ERRCODE = '42501';
  END IF;
  RETURN service_id;
 END IF;
 INSERT INTO public.international_service_enrolments(tenant_id, enquiry_id, student_id, service_type, billing_mode, assigned_by)
 VALUES (lead.tenant_id, lead.id, p_student, expected_service, p_billing_mode, auth.uid()) RETURNING id INTO service_id;
 UPDATE public.applications SET user_id = p_student WHERE id = lead.id AND tenant_id = lead.tenant_id;
 RETURN service_id;
END $$;
REVOKE ALL ON FUNCTION public.activate_international_service_from_lead(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_international_service_from_lead(uuid, uuid, text) TO authenticated;

-- Staff training credentials
CREATE TABLE public.education_staff_credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 staff_id uuid NOT NULL,
 credential_name text NOT NULL CHECK (length(btrim(credential_name)) BETWEEN 5 AND 200),
 provider_name text NOT NULL CHECK (length(btrim(provider_name)) BETWEEN 3 AND 200),
 credential_number text, issued_on date, expires_on date, evidence_reference text,
 status text NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified','reviewed','expired','rejected')),
 verified_by uuid, verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_on IS NULL OR issued_on IS NULL OR expires_on >= issued_on),
 CHECK (status <> 'reviewed' OR (evidence_reference IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL)),
 UNIQUE (tenant_id, staff_id, provider_name, credential_name)
);
CREATE INDEX education_credential_tenant ON public.education_staff_credentials(tenant_id, staff_id, status, expires_on);
GRANT SELECT, INSERT, UPDATE ON public.education_staff_credentials TO authenticated;
GRANT ALL ON public.education_staff_credentials TO service_role;
ALTER TABLE public.education_staff_credentials ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.guard_staff_training_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE p.tenant_id = NEW.tenant_id AND p.user_id = NEW.staff_id AND r.role <> 'student'::public.app_role) THEN
  RAISE EXCEPTION 'Credential must belong to a staff account in this centre' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_staff_training_ownership() FROM PUBLIC, anon;
CREATE TRIGGER staff_training_ownership BEFORE INSERT OR UPDATE ON public.education_staff_credentials
 FOR EACH ROW EXECUTE FUNCTION public.guard_staff_training_ownership();

CREATE FUNCTION public.guard_education_credential()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' AND (NEW.status <> 'unverified' OR NEW.verified_by IS NOT NULL OR NEW.verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Staff training evidence must start as unverified' USING ERRCODE = '42501';
 END IF;
 IF TG_OP = 'UPDATE' THEN
  IF ROW(NEW.id, NEW.tenant_id, NEW.staff_id, NEW.created_at) IS DISTINCT FROM ROW(OLD.id, OLD.tenant_id, OLD.staff_id, OLD.created_at) THEN
   RAISE EXCEPTION 'Credential ownership is immutable' USING ERRCODE = '42501'; END IF;
  IF ROW(NEW.credential_name, NEW.provider_name, NEW.credential_number, NEW.issued_on, NEW.expires_on, NEW.evidence_reference)
    IS DISTINCT FROM ROW(OLD.credential_name, OLD.provider_name, OLD.credential_number, OLD.issued_on, OLD.expires_on, OLD.evidence_reference)
    AND OLD.status = 'reviewed' THEN NEW.status := 'unverified'; END IF;
 END IF;
 IF NEW.status = 'reviewed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  IF length(btrim(coalesce(NEW.evidence_reference, ''))) < 5 OR (NEW.expires_on IS NOT NULL AND NEW.expires_on < current_date) THEN
   RAISE EXCEPTION 'Current supporting training evidence is needed' USING ERRCODE = '42501'; END IF;
  NEW.verified_by := auth.uid(); NEW.verified_at := now();
 ELSIF NEW.status <> 'reviewed' THEN NEW.verified_by := NULL; NEW.verified_at := NULL; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER education_credential_guard BEFORE INSERT OR UPDATE ON public.education_staff_credentials
 FOR EACH ROW EXECUTE FUNCTION public.guard_education_credential();

CREATE POLICY "credential own or manager read" ON public.education_staff_credentials FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (staff_id = auth.uid() OR public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "credential manager create" ON public.education_staff_credentials FOR INSERT TO authenticated
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "credential manager edit" ON public.education_staff_credentials FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));

-- UniPathway's own applications to third-party partner programmes
CREATE TABLE public.education_partner_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 organisation_name text NOT NULL CHECK (length(btrim(organisation_name)) BETWEEN 3 AND 200),
 country text NOT NULL CHECK (country IN ('Pakistan','UK','USA','Canada','Australia','Germany','Global')),
 programme text NOT NULL CHECK (programme IN ('ielts_registration_partner','ielts_test_venue','university_recruitment_agent','academic_articulation','education_agent_network','other')),
 stage text NOT NULL DEFAULT 'research' CHECK (stage IN ('research','contacted','submitted','due_diligence','approved','rejected','withdrawn','expired')),
 owner_id uuid,
 official_application_url text CHECK (official_application_url IS NULL OR official_application_url ~ '^https://[^[:space:]]+$'),
 documents_checklist text, notes text, next_action text, next_action_at timestamptz, submitted_at timestamptz,
 approval_reference text, approval_verified_by uuid, approval_verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id, organisation_name, country, programme),
 CHECK (stage <> 'approved' OR (approval_reference IS NOT NULL AND approval_verified_by IS NOT NULL AND approval_verified_at IS NOT NULL))
);
CREATE INDEX partner_application_pipeline ON public.education_partner_applications(tenant_id, programme, stage, next_action_at);
GRANT SELECT, INSERT, UPDATE ON public.education_partner_applications TO authenticated;
GRANT ALL ON public.education_partner_applications TO service_role;
ALTER TABLE public.education_partner_applications ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.guard_education_partner_application()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' AND (NEW.stage NOT IN ('research','contacted') OR NEW.approval_verified_by IS NOT NULL OR NEW.approval_verified_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Partner applications must begin as unapproved prospects' USING ERRCODE = '42501'; END IF;
 IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.tenant_id, NEW.organisation_name, NEW.country, NEW.programme, NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id, OLD.tenant_id, OLD.organisation_name, OLD.country, OLD.programme, OLD.created_at) THEN
  RAISE EXCEPTION 'Partner application identity is immutable' USING ERRCODE = '42501'; END IF;
 IF NEW.stage = 'approved' AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
  IF length(btrim(coalesce(NEW.approval_reference, ''))) < 8 THEN
   RAISE EXCEPTION 'Formal third-party approval reference required' USING ERRCODE = '42501'; END IF;
  NEW.approval_verified_by := auth.uid(); NEW.approval_verified_at := now();
 ELSIF NEW.stage <> 'approved' THEN
  NEW.approval_verified_by := NULL; NEW.approval_verified_at := NULL;
 END IF;
 IF NEW.stage = 'submitted' AND NEW.submitted_at IS NULL THEN NEW.submitted_at := now(); END IF;
 NEW.updated_at := now(); RETURN NEW;
END $$;
CREATE TRIGGER education_partner_application_guard BEFORE INSERT OR UPDATE ON public.education_partner_applications
 FOR EACH ROW EXECUTE FUNCTION public.guard_education_partner_application();

CREATE POLICY "partner applications staff read" ON public.education_partner_applications FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "partner applications manager insert" ON public.education_partner_applications FOR INSERT TO authenticated
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "partner applications manager update" ON public.education_partner_applications FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));