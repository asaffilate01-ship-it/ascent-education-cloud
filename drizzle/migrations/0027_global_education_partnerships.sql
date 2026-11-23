-- Careers organisations and university applications used by progression referrals
CREATE TABLE IF NOT EXISTS public.career_organisations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, name text NOT NULL,
 organisation_type text NOT NULL CHECK (organisation_type IN ('employer','recruiter','university','accommodation_partner','relocation_partner')),
 country text, city text, website text, verified boolean NOT NULL DEFAULT false, partner_status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.career_organisations TO authenticated;
GRANT ALL ON public.career_organisations TO service_role;
ALTER TABLE public.career_organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career org tenant read" ON public.career_organisations FOR SELECT TO authenticated USING (public.same_tenant(tenant_id));

CREATE TABLE IF NOT EXISTS public.international_university_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, student_id uuid NOT NULL,
 university_organisation_id uuid NOT NULL REFERENCES public.career_organisations(id),
 destination_country text NOT NULL, programme text NOT NULL, intake text, status text NOT NULL DEFAULT 'planning',
 counsellor_id uuid, documents jsonb NOT NULL DEFAULT '[]'::jsonb, offer_type text, offer_reference text, tuition_fee numeric, currency text,
 commission_expected numeric, commission_currency text, commission_status text NOT NULL DEFAULT 'not_earned',
 accommodation_status text NOT NULL DEFAULT 'not_started', predeparture_status text NOT NULL DEFAULT 'not_started', arrival_support_status text NOT NULL DEFAULT 'not_started',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT global_referral_application_identity UNIQUE (id, tenant_id, student_id),
 CONSTRAINT support_application_tenant_key UNIQUE (id, tenant_id)
);
GRANT SELECT ON public.international_university_applications TO authenticated;
GRANT ALL ON public.international_university_applications TO service_role;
ALTER TABLE public.international_university_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "international applications own read" ON public.international_university_applications FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (student_id = auth.uid() OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));
CREATE POLICY "admissions application read" ON public.international_university_applications FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND public.has_role(auth.uid(),'admissions_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.international_support_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 application_id uuid NOT NULL REFERENCES public.international_university_applications(id) ON DELETE CASCADE,
 task_type text NOT NULL CHECK (length(btrim(task_type)) BETWEEN 1 AND 80),
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
 owner_id uuid, due_at timestamptz,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
 notes text CHECK (notes IS NULL OR length(notes) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 CONSTRAINT support_same_tenant_application FOREIGN KEY (application_id, tenant_id) REFERENCES public.international_university_applications(id, tenant_id)
);
CREATE INDEX IF NOT EXISTS support_case_queue ON public.international_support_tasks(tenant_id, application_id, created_at, id);
GRANT SELECT, INSERT, UPDATE ON public.international_support_tasks TO authenticated;
GRANT ALL ON public.international_support_tasks TO service_role;
ALTER TABLE public.international_support_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support case read" ON public.international_support_tasks FOR SELECT TO authenticated USING (
 public.same_tenant(international_support_tasks.tenant_id) AND EXISTS (SELECT 1 FROM public.international_university_applications a
 WHERE a.id = international_support_tasks.application_id AND a.tenant_id = international_support_tasks.tenant_id AND
 (a.student_id = auth.uid() OR public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role))));
CREATE POLICY "support staff create" ON public.international_support_tasks FOR INSERT TO authenticated WITH CHECK (
 public.same_tenant(tenant_id) AND owner_id = auth.uid() AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE POLICY "support staff update" ON public.international_support_tasks FOR UPDATE TO authenticated USING (
 public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role))) WITH CHECK (
 public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));

-- Partner organisations (research leads until a signed agreement exists)
CREATE TABLE IF NOT EXISTS public.international_education_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 slug text NOT NULL, name text NOT NULL,
 partner_kind text NOT NULL CHECK (partner_kind IN ('recruitment_group','awarding_body','pathway_provider','application_platform','university','language_provider')),
 countries text[] NOT NULL DEFAULT '{}', website text,
 relationship_status text NOT NULL DEFAULT 'prospect' CHECK (relationship_status IN ('prospect','contacted','application_submitted','due_diligence','contracted','active','suspended','rejected')),
 agreement_signed_on date,
 accreditation_status text NOT NULL DEFAULT 'not_applied' CHECK (accreditation_status IN ('not_applied','applied','under_review','approved','expired','rejected','not_applicable')),
 notes text, next_action text, next_action_at timestamptz, owner_id uuid, last_reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agreement_required_to_claim_relationship CHECK (relationship_status NOT IN ('contracted','active') OR agreement_signed_on IS NOT NULL),
 UNIQUE (tenant_id, slug), UNIQUE (id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_global_education_partner_search ON public.international_education_partners(tenant_id, partner_kind, relationship_status);
GRANT SELECT, INSERT, UPDATE ON public.international_education_partners TO authenticated;
GRANT ALL ON public.international_education_partners TO service_role;
ALTER TABLE public.international_education_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global partners staff read" ON public.international_education_partners FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR
 public.has_role(auth.uid(),'admissions_admin'::app_role) OR public.has_role(auth.uid(),'marketing_officer'::app_role)));
CREATE POLICY "global partners management" ON public.international_education_partners FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE TABLE IF NOT EXISTS public.international_pathway_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL, awarding_body_id uuid, route_name text NOT NULL, qualification_level text, qualification_name text,
 destination_country text NOT NULL, destination_institution text NOT NULL, destination_programme text NOT NULL,
 entry_stage text, grade_requirements text, english_requirements text,
 pathway_type text NOT NULL DEFAULT 'progression_review' CHECK (pathway_type IN ('direct_entry','foundation','advanced_entry','top_up','credit_transfer','progression_review')),
 review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','under_review','verified','rejected','withdrawn')),
 evidence_url text, evidence_reviewed_at timestamptz, verified_by uuid, student_visible boolean NOT NULL DEFAULT false, notes text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, tenant_id),
 CONSTRAINT route_partner_identity UNIQUE (id, tenant_id, partner_id),
 CONSTRAINT route_same_tenant_partner FOREIGN KEY (partner_id, tenant_id) REFERENCES public.international_education_partners(id, tenant_id) ON DELETE CASCADE,
 CONSTRAINT route_same_tenant_awarder FOREIGN KEY (awarding_body_id, tenant_id) REFERENCES public.international_education_partners(id, tenant_id),
 CONSTRAINT verified_route_has_evidence CHECK (review_status <> 'verified' OR (evidence_url IS NOT NULL AND evidence_reviewed_at IS NOT NULL AND verified_by IS NOT NULL)),
 CONSTRAINT published_route_is_verified CHECK (student_visible = false OR review_status = 'verified')
);
CREATE INDEX IF NOT EXISTS idx_international_routes ON public.international_pathway_routes(tenant_id, destination_country, review_status);
GRANT SELECT, INSERT, UPDATE ON public.international_pathway_routes TO authenticated;
GRANT ALL ON public.international_pathway_routes TO service_role;
ALTER TABLE public.international_pathway_routes ENABLE ROW LEVEL SECURITY;

-- Private agreement documents
CREATE TABLE IF NOT EXISTS public.international_partner_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id), partner_id uuid NOT NULL,
 storage_path text NOT NULL UNIQUE, original_name text NOT NULL CHECK (length(original_name) BETWEEN 1 AND 200),
 uploaded_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, tenant_id, partner_id),
 FOREIGN KEY (partner_id, tenant_id) REFERENCES public.international_education_partners(id, tenant_id)
);
GRANT SELECT ON public.international_partner_documents TO authenticated;
GRANT ALL ON public.international_partner_documents TO service_role;
ALTER TABLE public.international_partner_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner document staff read" ON public.international_partner_documents FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'finance_officer'::app_role)));

CREATE TABLE IF NOT EXISTS public.international_partner_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL,
 agreement_type text NOT NULL CHECK (agreement_type IN ('recruitment','articulation','delivery_centre','affiliate','other')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','signed','expired','terminated')),
 document_reference text, document_id uuid, starts_on date, ends_on date, commission_currency text,
 commission_amount numeric CHECK (commission_amount IS NULL OR commission_amount >= 0),
 commission_basis text CHECK (commission_basis IS NULL OR commission_basis IN ('flat_per_enrolment','percentage_of_tuition','tiered','other')),
 clawback_days integer CHECK (clawback_days IS NULL OR clawback_days >= 0), notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agreements_partner_tenant FOREIGN KEY (partner_id, tenant_id) REFERENCES public.international_education_partners(id, tenant_id),
 CONSTRAINT agreement_document_tenant FOREIGN KEY (document_id, tenant_id, partner_id) REFERENCES public.international_partner_documents(id, tenant_id, partner_id),
 CONSTRAINT signed_agreement_has_document CHECK (status <> 'signed' OR (document_reference IS NOT NULL AND starts_on IS NOT NULL)),
 CONSTRAINT agreement_dates_valid CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
 CONSTRAINT signed_document_not_blank CHECK (status <> 'signed' OR length(btrim(document_reference)) > 0),
 CONSTRAINT percentage_commission_valid CHECK (commission_basis <> 'percentage_of_tuition' OR commission_amount <= 100)
);
GRANT SELECT, INSERT, UPDATE ON public.international_partner_agreements TO authenticated;
GRANT ALL ON public.international_partner_agreements TO service_role;
ALTER TABLE public.international_partner_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner agreements finance read" ON public.international_partner_agreements FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'finance_officer'::app_role)));
CREATE POLICY "partner agreements management" ON public.international_partner_agreements FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE TABLE IF NOT EXISTS public.international_partner_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL, route_id uuid, student_id uuid NOT NULL, international_application_id uuid,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','consented','submitted','acknowledged','offer','enrolled','withdrawn','rejected')),
 student_consent_at timestamptz, external_application_ref text, submitted_at timestamptz,
 recipient_name text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT referrals_same_tenant_partner FOREIGN KEY (partner_id, tenant_id) REFERENCES public.international_education_partners(id, tenant_id),
 CONSTRAINT referrals_same_tenant_route FOREIGN KEY (route_id, tenant_id) REFERENCES public.international_pathway_routes(id, tenant_id),
 CONSTRAINT referral_route_matches_partner FOREIGN KEY (route_id, tenant_id, partner_id) REFERENCES public.international_pathway_routes(id, tenant_id, partner_id),
 CONSTRAINT referrals_same_tenant_application FOREIGN KEY (international_application_id, tenant_id, student_id) REFERENCES public.international_university_applications(id, tenant_id, student_id),
 CONSTRAINT referral_submission_needs_consent CHECK (status NOT IN ('submitted','acknowledged','offer','enrolled') OR student_consent_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_international_referrals ON public.international_partner_referrals(tenant_id, student_id, status);
GRANT SELECT, INSERT, UPDATE ON public.international_partner_referrals TO authenticated;
GRANT ALL ON public.international_partner_referrals TO service_role;
ALTER TABLE public.international_partner_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals own student and staff read" ON public.international_partner_referrals FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (student_id = auth.uid() OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE POLICY "referrals staff management" ON public.international_partner_referrals FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE POLICY "student referral consent update" ON public.international_partner_referrals FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid())
 WITH CHECK (public.same_tenant(tenant_id) AND student_id = auth.uid() AND status IN ('consented','withdrawn'));

-- A partner is authorised only with a current signed agreement whose private file still exists
CREATE OR REPLACE FUNCTION public.global_partner_authorised(p_partner uuid, p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.same_tenant(p_tenant) AND EXISTS (
 SELECT 1 FROM public.international_education_partners p
 JOIN public.international_partner_agreements a ON a.partner_id = p.id AND a.tenant_id = p.tenant_id
 WHERE p.id = p_partner AND p.tenant_id = p_tenant AND p.relationship_status IN ('contracted','active')
 AND a.status = 'signed' AND length(btrim(a.document_reference)) > 0 AND a.starts_on <= current_date
 AND (a.ends_on IS NULL OR a.ends_on >= current_date)
 AND (a.document_id IS NULL OR EXISTS (SELECT 1 FROM public.international_partner_documents d JOIN storage.objects o
 ON o.name = d.storage_path AND o.bucket_id = 'partner-agreements'
 WHERE d.id = a.document_id AND d.tenant_id = a.tenant_id AND d.partner_id = a.partner_id)))
$$;
REVOKE ALL ON FUNCTION public.global_partner_authorised(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_partner_authorised(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "routes staff read" ON public.international_pathway_routes FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR
 public.has_role(auth.uid(),'admissions_admin'::app_role) OR public.has_role(auth.uid(),'programme_leader'::app_role)));
CREATE POLICY "routes verified student read" ON public.international_pathway_routes FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND student_visible AND review_status = 'verified' AND public.global_partner_authorised(partner_id, tenant_id));
CREATE POLICY "routes management" ON public.international_pathway_routes FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE OR REPLACE FUNCTION public.check_global_pathway_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.student_visible AND NOT public.global_partner_authorised(NEW.partner_id, NEW.tenant_id) THEN
 RAISE EXCEPTION 'A current signed agreement and active partner are required'; END IF;
 IF NEW.review_status = 'verified' AND (length(btrim(NEW.evidence_url)) = 0 OR NEW.verified_by IS DISTINCT FROM auth.uid()) THEN
 RAISE EXCEPTION 'Evidence and the current reviewer identity are required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_global_pathway_publication_before_write BEFORE INSERT OR UPDATE ON public.international_pathway_routes
 FOR EACH ROW EXECUTE FUNCTION public.check_global_pathway_publication();

-- Audit trail
CREATE TABLE IF NOT EXISTS public.international_partner_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 entity_table text NOT NULL, entity_id uuid NOT NULL, action text NOT NULL, actor_id uuid,
 old_status text, new_status text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.international_partner_audit TO authenticated;
GRANT ALL ON public.international_partner_audit TO service_role;
ALTER TABLE public.international_partner_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner audit staff" ON public.international_partner_audit FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE OR REPLACE FUNCTION public.audit_global_partner_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.international_partner_audit(tenant_id, entity_table, entity_id, action, actor_id, old_status, new_status)
 VALUES (NEW.tenant_id, TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(),
 CASE WHEN TG_OP = 'UPDATE' THEN coalesce(to_jsonb(OLD)->>'status', to_jsonb(OLD)->>'review_status', to_jsonb(OLD)->>'relationship_status') END,
 coalesce(to_jsonb(NEW)->>'status', to_jsonb(NEW)->>'review_status', to_jsonb(NEW)->>'relationship_status'));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_global_partner_change() FROM PUBLIC, anon;
CREATE TRIGGER global_partner_audit AFTER INSERT OR UPDATE ON public.international_education_partners FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();
CREATE TRIGGER global_partner_audit AFTER INSERT OR UPDATE ON public.international_partner_agreements FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();
CREATE TRIGGER global_partner_audit AFTER INSERT OR UPDATE ON public.international_pathway_routes FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();
CREATE TRIGGER global_partner_audit AFTER INSERT OR UPDATE ON public.international_partner_referrals FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();

CREATE OR REPLACE FUNCTION public.guard_partner_activation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.relationship_status IN ('contracted','active') AND NOT EXISTS (SELECT 1 FROM public.international_partner_agreements a
 WHERE a.partner_id = NEW.id AND a.tenant_id = NEW.tenant_id AND a.status = 'signed' AND a.starts_on <= current_date
 AND (a.ends_on IS NULL OR a.ends_on >= current_date)) THEN RAISE EXCEPTION 'A current signed agreement is required for activation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_partner_activation BEFORE INSERT OR UPDATE ON public.international_education_partners
 FOR EACH ROW EXECUTE FUNCTION public.guard_partner_activation();

CREATE OR REPLACE FUNCTION public.guard_global_referral() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  SELECT p.name INTO NEW.recipient_name FROM public.international_education_partners p WHERE p.id = NEW.partner_id AND p.tenant_id = NEW.tenant_id;
  IF NEW.status <> 'draft' OR NEW.student_consent_at IS NOT NULL THEN RAISE EXCEPTION 'Create a draft before requesting student consent'; END IF;
 ELSE
  IF (NEW.student_id, NEW.tenant_id, NEW.partner_id, NEW.route_id, NEW.international_application_id, NEW.recipient_name)
   IS DISTINCT FROM (OLD.student_id, OLD.tenant_id, OLD.partner_id, OLD.route_id, OLD.international_application_id, OLD.recipient_name) THEN
   RAISE EXCEPTION 'Referral identity cannot change; create a new draft'; END IF;
  IF NEW.student_consent_at IS DISTINCT FROM OLD.student_consent_at AND auth.uid() IS DISTINCT FROM NEW.student_id THEN
   RAISE EXCEPTION 'Only the student may record or revoke consent'; END IF;
  IF NEW.student_consent_at IS DISTINCT FROM OLD.student_consent_at AND NEW.student_consent_at IS NOT NULL THEN
   NEW.student_consent_at := now();
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
   (OLD.status = 'draft' AND NEW.status = 'consented' AND auth.uid() = NEW.student_id) OR
   (OLD.status = 'consented' AND NEW.status = 'submitted') OR
   (OLD.status = 'submitted' AND NEW.status IN ('acknowledged','offer','rejected')) OR
   (OLD.status = 'acknowledged' AND NEW.status IN ('offer','rejected')) OR
   (OLD.status = 'offer' AND NEW.status IN ('enrolled','rejected')) OR
   (NEW.status = 'withdrawn' AND OLD.status NOT IN ('withdrawn','rejected'))
  ) THEN RAISE EXCEPTION 'Invalid referral status transition'; END IF;
 END IF;
 IF NEW.international_application_id IS NULL OR NEW.route_id IS NULL THEN RAISE EXCEPTION 'Link a canonical application and pathway'; END IF;
 IF TG_OP = 'INSERT' AND NOT EXISTS (SELECT 1 FROM public.international_university_applications a
 JOIN public.international_pathway_routes r ON r.id = NEW.route_id AND r.tenant_id = a.tenant_id
 WHERE a.id = NEW.international_application_id AND a.tenant_id = NEW.tenant_id AND a.student_id = NEW.student_id
 AND lower(btrim(a.programme)) = lower(btrim(r.destination_programme)) AND a.destination_country = r.destination_country) THEN
 RAISE EXCEPTION 'Application programme and destination must match the pathway'; END IF;
 IF NEW.status IN ('consented','submitted','acknowledged','offer','enrolled') THEN
  IF NEW.student_consent_at IS NULL OR NOT public.global_partner_authorised(NEW.partner_id, NEW.tenant_id) THEN
   RAISE EXCEPTION 'Current agreement and student consent are required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.international_pathway_routes r WHERE r.id = NEW.route_id
    AND r.tenant_id = NEW.tenant_id AND r.partner_id = NEW.partner_id AND r.review_status = 'verified' AND r.student_visible) THEN
   RAISE EXCEPTION 'Verified published pathway required'; END IF;
 END IF;
 IF NEW.status IN ('submitted','acknowledged','offer','enrolled') THEN
  IF coalesce(length(btrim(NEW.external_application_ref)), 0) = 0 THEN RAISE EXCEPTION 'Record the external submission reference'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'consented' THEN NEW.submitted_at := now(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_global_referral BEFORE INSERT OR UPDATE ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.guard_global_referral();

CREATE OR REPLACE FUNCTION public.guard_student_referral_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF auth.uid() = OLD.student_id AND (NEW.external_application_ref, NEW.submitted_at, NEW.created_at)
  IS DISTINCT FROM (OLD.external_application_ref, OLD.submitted_at, OLD.created_at) THEN
 RAISE EXCEPTION 'Submission metadata is staff-controlled'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_student_referral_update BEFORE UPDATE ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.guard_student_referral_update();

CREATE OR REPLACE FUNCTION public.sync_global_referral_application() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 UPDATE public.international_university_applications SET status = CASE NEW.status
 WHEN 'submitted' THEN 'application' WHEN 'acknowledged' THEN 'application'
 WHEN 'offer' THEN 'offer' WHEN 'enrolled' THEN 'enrolled'
 WHEN 'withdrawn' THEN 'withdrawn' WHEN 'rejected' THEN 'rejected' ELSE status END, updated_at = now()
 WHERE id = NEW.international_application_id AND tenant_id = NEW.tenant_id AND student_id = NEW.student_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_global_referral_application() FROM PUBLIC, anon;
CREATE TRIGGER sync_global_referral_application AFTER UPDATE OF status ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.sync_global_referral_application();

CREATE OR REPLACE FUNCTION public.create_pathway_application(p_route uuid, p_student uuid, p_intake text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.international_pathway_routes; organisation uuid; application uuid; referral uuid;
BEGIN
 SELECT * INTO r FROM public.international_pathway_routes WHERE id = p_route;
 IF r.id IS NULL OR NOT public.same_tenant(r.tenant_id) OR NOT (
 public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::app_role)) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
 IF r.review_status <> 'verified' OR NOT r.student_visible OR NOT public.global_partner_authorised(r.partner_id, r.tenant_id) THEN
 RAISE EXCEPTION 'A current verified pathway is required'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.user_roles u ON u.user_id = p.user_id
 WHERE p.user_id = p_student AND p.tenant_id = r.tenant_id AND u.role = 'student'::app_role) THEN RAISE EXCEPTION 'Student unavailable in this centre'; END IF;
 IF length(coalesce(p_intake, '')) > 100 THEN RAISE EXCEPTION 'Intake is too long'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_route::text || p_student::text, 0));
 SELECT id INTO referral FROM public.international_partner_referrals WHERE route_id = p_route AND tenant_id = r.tenant_id AND student_id = p_student
 AND status NOT IN ('withdrawn','rejected') ORDER BY created_at DESC LIMIT 1;
 IF referral IS NOT NULL THEN RETURN referral; END IF;
 SELECT id INTO organisation FROM public.career_organisations WHERE tenant_id = r.tenant_id AND organisation_type = 'university'
 AND name = r.destination_institution AND country = r.destination_country ORDER BY created_at LIMIT 1;
 IF organisation IS NULL THEN
 INSERT INTO public.career_organisations(tenant_id, name, organisation_type, country, verified, partner_status)
 VALUES (r.tenant_id, r.destination_institution, 'university', r.destination_country, false, 'pending') RETURNING id INTO organisation;
 END IF;
 INSERT INTO public.international_university_applications(tenant_id, student_id, university_organisation_id, destination_country, programme, intake, status, counsellor_id)
 VALUES (r.tenant_id, p_student, organisation, r.destination_country, r.destination_programme, nullif(btrim(p_intake), ''), 'planning', auth.uid()) RETURNING id INTO application;
 INSERT INTO public.international_partner_referrals(tenant_id, partner_id, route_id, student_id, international_application_id)
 VALUES (r.tenant_id, r.partner_id, r.id, p_student, application) RETURNING id INTO referral;
 RETURN referral;
END $$;
REVOKE ALL ON FUNCTION public.create_pathway_application(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pathway_application(uuid, uuid, text) TO authenticated;

-- Private agreement file access
CREATE OR REPLACE FUNCTION public.can_access_partner_file(p_name text, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.international_education_partners p
 WHERE p.tenant_id::text = split_part(p_name, '/', 1) AND p.id::text = split_part(p_name, '/', 2)
 AND p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
 AND public.same_tenant(p.tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR (NOT p_write AND public.has_role(auth.uid(),'finance_officer'::app_role))))
$$;
REVOKE ALL ON FUNCTION public.can_access_partner_file(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_partner_file(text, boolean) TO authenticated;
CREATE POLICY "partner file insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-agreements' AND public.can_access_partner_file(name, true));
CREATE POLICY "partner file read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-agreements' AND public.can_access_partner_file(name, false));
CREATE POLICY "partner file boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id <> 'partner-agreements' OR public.can_access_partner_file(name, false))
WITH CHECK (bucket_id <> 'partner-agreements' OR public.can_access_partner_file(name, true));
CREATE POLICY "partner files immutable update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'partner-agreements') WITH CHECK (bucket_id <> 'partner-agreements');
CREATE POLICY "partner files immutable delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'partner-agreements');

CREATE OR REPLACE FUNCTION public.register_partner_document(p_partner uuid, p_path text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t uuid; result uuid;
BEGIN
 SELECT tenant_id INTO t FROM public.international_education_partners WHERE id = p_partner;
 IF t IS NULL OR NOT public.can_access_partner_file(p_path, true)
 OR split_part(p_path, '/', 2) <> p_partner::text OR split_part(p_path, '/', 1) <> t::text THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'partner-agreements' AND name = p_path) THEN RAISE EXCEPTION 'Upload the PDF before registering it'; END IF;
 INSERT INTO public.international_partner_documents(tenant_id, partner_id, storage_path, original_name, uploaded_by)
 VALUES (t, p_partner, p_path, left(btrim(p_name), 200), auth.uid()) ON CONFLICT (storage_path) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM public.international_partner_documents WHERE storage_path = p_path AND tenant_id = t AND partner_id = p_partner; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.register_partner_document(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_partner_document(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_agreement_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE path text;
BEGIN
 IF NEW.document_id IS NOT NULL THEN
 SELECT storage_path INTO path FROM public.international_partner_documents WHERE id = NEW.document_id AND tenant_id = NEW.tenant_id AND partner_id = NEW.partner_id;
 IF path IS NULL OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'partner-agreements' AND name = path) THEN RAISE EXCEPTION 'Private agreement document unavailable'; END IF;
 NEW.document_reference := 'partner-agreements/' || path;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_agreement_document() FROM PUBLIC, anon;
CREATE TRIGGER guard_agreement_document BEFORE INSERT OR UPDATE ON public.international_partner_agreements
FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_document();

-- Support task guard and audit
CREATE OR REPLACE FUNCTION public.guard_international_support_task() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.id, NEW.tenant_id, NEW.application_id, NEW.owner_id, NEW.created_at) IS DISTINCT FROM
 (OLD.id, OLD.tenant_id, OLD.application_id, OLD.owner_id, OLD.created_at) THEN RAISE EXCEPTION 'Task identity cannot change'; END IF;
 NEW.updated_at = clock_timestamp();
 IF TG_OP = 'INSERT' THEN
  IF NEW.status <> 'pending' THEN RAISE EXCEPTION 'New tasks must start pending'; END IF;
  NEW.created_at = now(); NEW.completed_at = NULL;
 ELSIF NEW.status = 'completed' THEN
  NEW.completed_at = CASE WHEN OLD.status = 'completed' THEN OLD.completed_at ELSE now() END;
 ELSE NEW.completed_at = NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER support_task_guard BEFORE INSERT OR UPDATE ON public.international_support_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_international_support_task();
CREATE TRIGGER support_task_audit AFTER INSERT OR UPDATE ON public.international_support_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();

-- Academic progression evidence (independent of commercial agreements)
CREATE TABLE IF NOT EXISTS public.academic_progression_evidence (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 awarding_body text NOT NULL CHECK (awarding_body IN ('OTHM','Qualifi','Other')),
 qualification_name text NOT NULL CHECK (length(btrim(qualification_name)) BETWEEN 3 AND 200),
 qualification_level text NOT NULL CHECK (length(btrim(qualification_level)) BETWEEN 1 AND 60),
 destination_country text NOT NULL CHECK (length(btrim(destination_country)) BETWEEN 2 AND 60),
 destination_institution text NOT NULL CHECK (length(btrim(destination_institution)) BETWEEN 3 AND 200),
 destination_programme text NOT NULL CHECK (length(btrim(destination_programme)) BETWEEN 3 AND 200),
 entry_stage text, grade_requirements text, english_requirements text,
 source_kind text NOT NULL DEFAULT 'awarding_body_directory' CHECK (source_kind IN ('awarding_body_directory','university_official_page')),
 source_url text CHECK (source_url IS NULL OR source_url ~* '^https://[^[:space:]]+$'),
 review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','under_review','verified','withdrawn')),
 student_visible boolean NOT NULL DEFAULT false,
 reviewed_by uuid, reviewed_at timestamptz, recheck_due date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (review_status <> 'verified' OR (source_url IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK (NOT student_visible OR review_status = 'verified'),
 UNIQUE (id, tenant_id)
);
CREATE INDEX IF NOT EXISTS academic_progression_tenant_lookup ON public.academic_progression_evidence (tenant_id, awarding_body, destination_country, review_status, student_visible);
GRANT SELECT, INSERT, UPDATE ON public.academic_progression_evidence TO authenticated;
GRANT ALL ON public.academic_progression_evidence TO service_role;
ALTER TABLE public.academic_progression_evidence ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.guard_academic_progression_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE changed boolean := false;
BEGIN
 IF TG_OP = 'INSERT' AND (NEW.review_status <> 'proposed' OR NEW.student_visible) THEN
  RAISE EXCEPTION 'Academic evidence must enter as an unpublished proposal' USING ERRCODE = '42501';
 END IF;
 IF TG_OP = 'UPDATE' THEN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Academic evidence ownership is immutable' USING ERRCODE = '42501';
  END IF;
  changed := ROW(NEW.awarding_body, NEW.qualification_name, NEW.qualification_level, NEW.destination_country, NEW.destination_institution, NEW.destination_programme,
   NEW.entry_stage, NEW.grade_requirements, NEW.english_requirements, NEW.source_kind, NEW.source_url, NEW.recheck_due)
   IS DISTINCT FROM ROW(OLD.awarding_body, OLD.qualification_name, OLD.qualification_level, OLD.destination_country, OLD.destination_institution, OLD.destination_programme,
   OLD.entry_stage, OLD.grade_requirements, OLD.english_requirements, OLD.source_kind, OLD.source_url, OLD.recheck_due);
  IF changed AND OLD.review_status = 'verified' THEN
   NEW.review_status := 'under_review'; NEW.student_visible := false; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
  END IF;
 END IF;
 IF NEW.review_status = 'verified' AND TG_OP = 'UPDATE' AND OLD.review_status IS DISTINCT FROM NEW.review_status THEN
  IF NEW.source_url IS NULL OR length(btrim(NEW.source_url)) < 12 OR (NEW.recheck_due IS NOT NULL AND NEW.recheck_due < current_date) THEN
   RAISE EXCEPTION 'A current original official evidence URL is required for verification';
  END IF;
  NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
 ELSIF NEW.review_status <> 'verified' THEN
  NEW.student_visible := false; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
 END IF;
 IF NEW.student_visible AND (NEW.review_status <> 'verified' OR (NEW.recheck_due IS NOT NULL AND NEW.recheck_due < current_date)) THEN
  RAISE EXCEPTION 'Cannot publish an expired or unverified academic route';
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END $$;
CREATE TRIGGER academic_progression_guard BEFORE INSERT OR UPDATE ON public.academic_progression_evidence
 FOR EACH ROW EXECUTE FUNCTION public.guard_academic_progression_evidence();
CREATE POLICY "academic sources management read" ON public.academic_progression_evidence FOR SELECT TO authenticated USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role)));
CREATE POLICY "academic reviewed student read" ON public.academic_progression_evidence FOR SELECT TO authenticated USING (public.same_tenant(tenant_id)
 AND public.has_role(auth.uid(),'student'::public.app_role) AND review_status = 'verified' AND student_visible AND (recheck_due IS NULL OR recheck_due >= current_date));
CREATE POLICY "academic sources staff insert" ON public.academic_progression_evidence FOR INSERT TO authenticated WITH CHECK (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "academic sources staff update" ON public.academic_progression_evidence FOR UPDATE TO authenticated USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));

CREATE TABLE IF NOT EXISTS public.academic_progression_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 evidence_id uuid NOT NULL, changed_by uuid, old_status text, new_status text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.academic_progression_audit TO authenticated;
GRANT ALL ON public.academic_progression_audit TO service_role;
ALTER TABLE public.academic_progression_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic audit manager read" ON public.academic_progression_audit FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE OR REPLACE FUNCTION public.log_academic_progression_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.academic_progression_audit(tenant_id, evidence_id, changed_by, old_status, new_status)
 VALUES (NEW.tenant_id, NEW.id, auth.uid(), CASE WHEN TG_OP = 'UPDATE' THEN OLD.review_status END, NEW.review_status);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_academic_progression_change() FROM PUBLIC, anon;
CREATE TRIGGER academic_progression_audit AFTER INSERT OR UPDATE ON public.academic_progression_evidence
 FOR EACH ROW EXECUTE FUNCTION public.log_academic_progression_change();

-- Internal outreach shortlist for each centre: unverified research leads, no affiliation claimed
INSERT INTO public.international_education_partners(tenant_id, slug, name, partner_kind, countries, website)
SELECT t.id, x.slug, x.name, x.kind, x.countries, x.website
FROM public.tenants t CROSS JOIN (VALUES
 ('gedu','GEDU Global Education','recruitment_group',ARRAY['UK','Germany','France','Malta','UAE','USA','Australia'],'https://gedu.global/'),
 ('navitas','Navitas','recruitment_group',ARRAY['UK','USA','Canada','Australia','Germany'],'https://www.navitas.com/'),
 ('kaplan','Kaplan International Pathways','recruitment_group',ARRAY['UK','USA','Canada','Australia'],'https://www.kaplanpathways.com/'),
 ('oxford-international','Oxford International Education Group','recruitment_group',ARRAY['UK','USA','Canada','Australia','Germany'],'https://www.oxfordinternational.com/'),
 ('cambridge-education-group','Cambridge Education Group / OnCampus','recruitment_group',ARRAY['UK','Ireland','Europe'],'https://www.cambridgeeducationgroup.com/'),
 ('study-group','Study Group','recruitment_group',ARRAY['UK','USA','Ireland'],'https://www.studygroup.com/'),
 ('shorelight','Shorelight','recruitment_group',ARRAY['USA'],'https://shorelight.com/'),
 ('gus','Global University Systems','recruitment_group',ARRAY['UK','Canada','Germany'],'https://www.globaluniversitysystems.com/'),
 ('applyboard','ApplyBoard','application_platform',ARRAY['UK','USA','Canada','Australia','Ireland'],'https://www.applyboard.com/'),
 ('edvoy','Edvoy','application_platform',ARRAY['UK','USA','Canada','Australia'],'https://edvoy.com/'),
 ('othm','OTHM Qualifications','awarding_body',ARRAY['UK'],'https://othm.org.uk/'),
 ('qualifi','Qualifi','awarding_body',ARRAY['UK'],'https://qualifi.net/'),
 ('iab','Institute of Accountants and Bookkeepers','awarding_body',ARRAY['UK'],'https://www.iab.org.uk/'),
 ('ifa','Institute of Financial Accountants','awarding_body',ARRAY['UK'],'https://www.ifa.org.uk/'),
 ('athe','ATHE','awarding_body',ARRAY['UK'],'https://athe.co.uk/'),
 ('pearson-btec','Pearson BTEC','awarding_body',ARRAY['UK'],'https://qualifications.pearson.com/'),
 ('qualifications-scotland','Qualifications Scotland / SQA Advanced','awarding_body',ARRAY['UK'],'https://www.sqa.org.uk/'),
 ('abe','ABE UK','awarding_body',ARRAY['UK'],'https://www.abeuk.com/'),
 ('eduqual','EduQual','awarding_body',ARRAY['UK'],'https://eduqual.org.uk/'),
 ('tquk','Training Qualifications UK','awarding_body',ARRAY['UK'],'https://www.tquk.org/'),
 ('ncuk','NCUK','pathway_provider',ARRAY['UK','USA','Canada','Australia'],'https://www.ncuk.ac.uk/'),
 ('ncc','NCC Education','pathway_provider',ARRAY['UK','USA','Canada','Australia'],'https://www.nccedu.com/'),
 ('english-path','English Path','language_provider',ARRAY['UK','Malta','UAE','Germany'],'https://www.englishpath.com/')
) AS x(slug, name, kind, countries, website)
ON CONFLICT (tenant_id, slug) DO NOTHING;