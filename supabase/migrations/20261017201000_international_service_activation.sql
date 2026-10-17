-- International admissions: convert an existing public enquiry to a service enrolment
-- ONLY after the applicant has verified an auth email and a centre admissions officer
-- has checked the candidate's identity. This does not create OTHM/Qualifi enrolment.
ALTER TABLE public.applications ADD CONSTRAINT international_service_application_key UNIQUE(id,tenant_id);

CREATE TABLE public.international_service_enrolments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 enquiry_id uuid NOT NULL,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 service_type text NOT NULL CHECK(service_type IN ('ielts_preparation','university_counselling')),
 billing_mode text NOT NULL CHECK(billing_mode IN ('included','complimentary','quoted')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
 assigned_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,enquiry_id),
 FOREIGN KEY(enquiry_id,tenant_id) REFERENCES public.applications(id,tenant_id)
);
CREATE INDEX international_service_student_idx ON public.international_service_enrolments(tenant_id,student_id,service_type);

CREATE FUNCTION public.guard_international_service_change()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.id,NEW.tenant_id,NEW.enquiry_id,NEW.student_id,NEW.service_type,NEW.billing_mode,NEW.assigned_by,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.enquiry_id,OLD.student_id,OLD.service_type,OLD.billing_mode,OLD.assigned_by,OLD.created_at) THEN
    RAISE EXCEPTION 'Service identity, agreement and billing classification are immutable' USING ERRCODE='42501';
  END IF;
  IF OLD.status='completed' AND NEW.status<>'completed' THEN
    RAISE EXCEPTION 'Completed service needs a new approved case' USING ERRCODE='42501';
  END IF;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
CREATE TRIGGER guard_international_service_change BEFORE UPDATE ON public.international_service_enrolments
 FOR EACH ROW EXECUTE FUNCTION public.guard_international_service_change();
REVOKE ALL ON FUNCTION public.guard_international_service_change() FROM PUBLIC;

ALTER TABLE public.international_service_enrolments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "international service student read" ON public.international_service_enrolments FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND student_id=auth.uid());
CREATE POLICY "international service staff read" ON public.international_service_enrolments FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)
 ));
CREATE POLICY "international service staff lifecycle" ON public.international_service_enrolments FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)
 ))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)
 ));
GRANT SELECT,UPDATE ON public.international_service_enrolments TO authenticated;

CREATE FUNCTION public.activate_international_service_from_lead(p_enquiry uuid,p_student uuid,p_billing_mode text DEFAULT 'complimentary')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE lead public.applications; expected_service text; account_email text;
 service_id uuid; finance_class text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO lead FROM public.applications WHERE id=p_enquiry FOR UPDATE;
 IF lead.id IS NULL OR lead.tenant_id IS NULL OR NOT public.same_tenant(lead.tenant_id)
 OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=lead.tenant_id
 AND r.role IN ('admissions_admin'::public.app_role,'centre_director'::public.app_role,'superadmin'::public.app_role))
 THEN RAISE EXCEPTION 'Centre admissions authorisation required' USING ERRCODE='42501'; END IF;
 expected_service:=CASE
  WHEN lead.source='ielts_preparation' THEN 'ielts_preparation'
  WHEN lead.source LIKE 'university_progression_%' OR lead.source IN ('consultancy_uk','consultancy_germany') THEN 'university_counselling'
  ELSE NULL END;
 IF expected_service IS NULL THEN
  RAISE EXCEPTION 'Lead is not an eligible education-service request' USING ERRCODE='22023';
 END IF;
 SELECT lower(btrim(u.email)) INTO account_email FROM auth.users u
  WHERE u.id=p_student AND u.email_confirmed_at IS NOT NULL;
 IF account_email IS NULL OR account_email<>lower(btrim(lead.email)) OR NOT EXISTS(
   SELECT 1 FROM public.profiles p JOIN public.user_roles r
     ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id
   WHERE p.user_id=p_student AND p.tenant_id=lead.tenant_id AND r.role='student'::public.app_role
 ) THEN
  RAISE EXCEPTION 'Use an email-verified learner account matching this enquiry in the same centre'
   USING ERRCODE='42501';
 END IF;
 IF lead.user_id IS NOT NULL AND lead.user_id<>p_student THEN
  RAISE EXCEPTION 'This enquiry is already associated with another user' USING ERRCODE='42501';
 END IF;
 IF p_billing_mode NOT IN ('complimentary','included') THEN
  RAISE EXCEPTION 'Only documented included or complimentary counselling is currently available' USING ERRCODE='22023';
 END IF;
 IF p_billing_mode='included' AND NOT EXISTS(
  SELECT 1 FROM public.student_enrolments se WHERE se.student_id=p_student
   AND se.tenant_id=lead.tenant_id AND se.status='active'
 ) THEN
  RAISE EXCEPTION 'Bundled services require an active academic course enrolment' USING ERRCODE='42501';
 END IF;
 finance_class:=p_billing_mode;
 SELECT id INTO service_id FROM public.international_service_enrolments
   WHERE tenant_id=lead.tenant_id AND enquiry_id=lead.id;
 IF service_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.international_service_enrolments
   WHERE id=service_id AND student_id=p_student AND service_type=expected_service) THEN
   RAISE EXCEPTION 'Lead is already matched to another student or service' USING ERRCODE='42501';
  END IF;
  RETURN service_id;
 END IF;
 INSERT INTO public.international_service_enrolments(tenant_id,enquiry_id,student_id,service_type,billing_mode,assigned_by)
 VALUES(lead.tenant_id,lead.id,p_student,expected_service,finance_class,auth.uid()) RETURNING id INTO service_id;
 UPDATE public.applications SET user_id=p_student WHERE id=lead.id AND tenant_id=lead.tenant_id;
 RETURN service_id;
END $$;
REVOKE ALL ON FUNCTION public.activate_international_service_from_lead(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_international_service_from_lead(uuid,uuid,text) TO authenticated;

COMMENT ON TABLE public.international_service_enrolments IS
 'Centre-approved counselling/IELTS service enrolment; not an OTHM or Qualifi course, admission offer, or paid purchase.';
