-- Contract evidence, revocable publication, student-owned consent and audited manual referrals.
ALTER TABLE public.international_partner_agreements
 ADD CONSTRAINT agreement_dates_valid CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
 ADD CONSTRAINT signed_document_not_blank CHECK (status <> 'signed' OR length(btrim(document_reference)) > 0),
 ADD CONSTRAINT percentage_commission_valid CHECK (commission_basis <> 'percentage_of_tuition' OR commission_amount <= 100);
ALTER TABLE public.international_pathway_routes ADD CONSTRAINT route_partner_identity UNIQUE(id,tenant_id,partner_id);
ALTER TABLE public.international_partner_referrals ADD CONSTRAINT referral_route_matches_partner
 FOREIGN KEY(route_id,tenant_id,partner_id) REFERENCES public.international_pathway_routes(id,tenant_id,partner_id);

CREATE OR REPLACE FUNCTION public.global_partner_authorised(p_partner uuid,p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.same_tenant(p_tenant) AND EXISTS (
 SELECT 1 FROM public.international_education_partners p
 JOIN public.international_partner_agreements a ON a.partner_id=p.id AND a.tenant_id=p.tenant_id
 WHERE p.id=p_partner AND p.tenant_id=p_tenant AND p.relationship_status IN ('contracted','active')
 AND a.status='signed' AND length(btrim(a.document_reference))>0 AND a.starts_on<=current_date
 AND (a.ends_on IS NULL OR a.ends_on>=current_date))
$$;
REVOKE ALL ON FUNCTION public.global_partner_authorised(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.global_partner_authorised(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.check_global_pathway_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.student_visible AND NOT public.global_partner_authorised(NEW.partner_id,NEW.tenant_id) THEN
 RAISE EXCEPTION 'A current signed agreement and active partner are required'; END IF;
 IF NEW.review_status='verified' AND (length(btrim(NEW.evidence_url))=0 OR NEW.verified_by IS DISTINCT FROM auth.uid()) THEN
 RAISE EXCEPTION 'Evidence and the current reviewer identity are required'; END IF;
 RETURN NEW;
END $$;
DROP POLICY "routes verified student read" ON public.international_pathway_routes;
CREATE POLICY "routes verified student read" ON public.international_pathway_routes FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND student_visible AND review_status='verified'
 AND public.global_partner_authorised(partner_id,tenant_id));

CREATE TABLE public.international_partner_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 entity_table text NOT NULL,entity_id uuid NOT NULL,action text NOT NULL,actor_id uuid,
 old_status text,new_status text,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.international_partner_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner audit staff" ON public.international_partner_audit FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE FUNCTION public.audit_global_partner_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.international_partner_audit(tenant_id,entity_table,entity_id,action,actor_id,old_status,new_status)
 VALUES(NEW.tenant_id,TG_TABLE_NAME,NEW.id,TG_OP,auth.uid(),
 CASE WHEN TG_OP='UPDATE' THEN coalesce(to_jsonb(OLD)->>'status',to_jsonb(OLD)->>'review_status',to_jsonb(OLD)->>'relationship_status') END,
 coalesce(to_jsonb(NEW)->>'status',to_jsonb(NEW)->>'review_status',to_jsonb(NEW)->>'relationship_status'));
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['international_education_partners','international_partner_agreements','international_pathway_routes','international_partner_referrals'] LOOP
 EXECUTE format('CREATE TRIGGER global_partner_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change()',t);
 END LOOP;
END $$;

CREATE FUNCTION public.guard_partner_activation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.relationship_status IN ('contracted','active') AND NOT EXISTS(SELECT 1 FROM public.international_partner_agreements a
 WHERE a.partner_id=NEW.id AND a.tenant_id=NEW.tenant_id AND a.status='signed' AND a.starts_on<=current_date
 AND (a.ends_on IS NULL OR a.ends_on>=current_date)) THEN RAISE EXCEPTION 'A current signed agreement is required for activation'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_partner_activation BEFORE INSERT OR UPDATE ON public.international_education_partners
 FOR EACH ROW EXECUTE FUNCTION public.guard_partner_activation();
ALTER TABLE public.international_partner_referrals ADD COLUMN recipient_name text NOT NULL DEFAULT '';
-- A staff-entered timestamp is not evidence of student consent.
CREATE OR REPLACE FUNCTION public.guard_global_referral() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT p.name INTO NEW.recipient_name FROM public.international_education_partners p WHERE p.id=NEW.partner_id AND p.tenant_id=NEW.tenant_id;
  IF NEW.status<>'draft' OR NEW.student_consent_at IS NOT NULL THEN RAISE EXCEPTION 'Create a draft before requesting student consent'; END IF;
 ELSE
  IF (NEW.student_id,NEW.tenant_id,NEW.partner_id,NEW.route_id,NEW.international_application_id,NEW.recipient_name)
   IS DISTINCT FROM (OLD.student_id,OLD.tenant_id,OLD.partner_id,OLD.route_id,OLD.international_application_id,OLD.recipient_name) THEN
   RAISE EXCEPTION 'Referral identity cannot change; create a new draft'; END IF;
  IF NEW.student_consent_at IS DISTINCT FROM OLD.student_consent_at AND auth.uid() IS DISTINCT FROM NEW.student_id THEN
   RAISE EXCEPTION 'Only the student may record or revoke consent'; END IF;
  IF NEW.student_consent_at IS DISTINCT FROM OLD.student_consent_at AND NEW.student_consent_at IS NOT NULL THEN
   NEW.student_consent_at:=now();
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
   (OLD.status='draft' AND NEW.status='consented' AND auth.uid()=NEW.student_id) OR
   (OLD.status='consented' AND NEW.status='submitted') OR
   (OLD.status='submitted' AND NEW.status IN ('acknowledged','offer','rejected')) OR
   (OLD.status='acknowledged' AND NEW.status IN ('offer','rejected')) OR
   (OLD.status='offer' AND NEW.status IN ('enrolled','rejected')) OR
   (NEW.status='withdrawn' AND OLD.status NOT IN ('withdrawn','rejected'))
  ) THEN RAISE EXCEPTION 'Invalid referral status transition'; END IF;
 END IF;
 IF NEW.international_application_id IS NULL OR NEW.route_id IS NULL THEN RAISE EXCEPTION 'Link a canonical application and pathway'; END IF;
 IF TG_OP='INSERT' AND NOT EXISTS(SELECT 1 FROM public.international_university_applications a
 JOIN public.international_pathway_routes r ON r.id=NEW.route_id AND r.tenant_id=a.tenant_id
 WHERE a.id=NEW.international_application_id AND a.tenant_id=NEW.tenant_id AND a.student_id=NEW.student_id
 AND lower(btrim(a.programme))=lower(btrim(r.destination_programme)) AND a.destination_country=r.destination_country) THEN
 RAISE EXCEPTION 'Application programme and destination must match the pathway'; END IF;
 IF NEW.status IN ('consented','submitted','acknowledged','offer','enrolled') THEN
  IF NEW.student_consent_at IS NULL OR NOT public.global_partner_authorised(NEW.partner_id,NEW.tenant_id) THEN
   RAISE EXCEPTION 'Current agreement and student consent are required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.international_pathway_routes r WHERE r.id=NEW.route_id
    AND r.tenant_id=NEW.tenant_id AND r.partner_id=NEW.partner_id AND r.review_status='verified' AND r.student_visible) THEN
   RAISE EXCEPTION 'Verified published pathway required'; END IF;
 END IF;
 IF NEW.status IN ('submitted','acknowledged','offer','enrolled') THEN
  IF coalesce(length(btrim(NEW.external_application_ref)),0)=0 THEN RAISE EXCEPTION 'Record the external submission reference'; END IF;
  IF TG_OP='UPDATE' AND OLD.status='consented' THEN NEW.submitted_at:=now(); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_global_referral BEFORE INSERT OR UPDATE ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.guard_global_referral();
CREATE POLICY "student referral consent update" ON public.international_partner_referrals FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND student_id=auth.uid())
 WITH CHECK(public.same_tenant(tenant_id) AND student_id=auth.uid() AND status IN ('consented','withdrawn'));
-- Students cannot change external submission metadata via direct updates.
CREATE FUNCTION public.guard_student_referral_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF auth.uid()=OLD.student_id AND (NEW.external_application_ref,NEW.submitted_at,NEW.created_at)
 IS DISTINCT FROM (OLD.external_application_ref,OLD.submitted_at,OLD.created_at) THEN
 RAISE EXCEPTION 'Submission metadata is staff-controlled'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_student_referral_update BEFORE UPDATE ON public.international_partner_referrals
 FOR EACH ROW EXECUTE FUNCTION public.guard_student_referral_update();
CREATE POLICY "admissions application read" ON public.international_university_applications FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND public.has_role(auth.uid(),'admissions_admin'::app_role));
