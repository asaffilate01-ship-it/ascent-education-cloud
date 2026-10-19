-- UniPathway Pakistan employer vetting, placement publication, and consenting applications.
-- Additive source migration only. Apply to Lovable Supabase after backups, migration
-- reconciliation, tenant-scoped testing and review. No public student applicant table.
BEGIN;

CREATE TABLE IF NOT EXISTS public.unipathway_employer_organisations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 name text NOT NULL,
 sector text NOT NULL,
 city text,
 contact_reference text,
 status text NOT NULL DEFAULT 'prospect' CHECK(status IN('prospect','review','verified','suspended')),
 verification_reference text,
 verified_by uuid,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uni_employer_approved_requires_proof CHECK(status <> 'verified' OR
 (NULLIF(BTRIM(verification_reference),'') IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX uni_employer_tenant_status ON public.unipathway_employer_organisations(tenant_id,status);
ALTER TABLE public.unipathway_employer_organisations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_employer_memberships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 organisation_id uuid NOT NULL REFERENCES public.unipathway_employer_organisations(id),
 user_id uuid NOT NULL,
 role text NOT NULL DEFAULT 'recruiter' CHECK(role IN('owner','recruiter','mentor')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','verified','revoked')),
 verification_reference text,
 verified_by uuid,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organisation_id,user_id),
 CONSTRAINT uni_member_verified_requires_proof CHECK(status <> 'verified' OR
 (verification_reference IS NOT NULL AND verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX uni_member_by_user ON public.unipathway_employer_memberships(user_id,status);
ALTER TABLE public.unipathway_employer_memberships ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.unipathway_verified_employer_member(_org uuid,_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $verify_employer$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_employer_memberships m
 JOIN public.unipathway_employer_organisations o ON o.id=m.organisation_id
 WHERE _user=auth.uid() AND m.organisation_id=_org AND m.user_id=_user AND m.status='verified'
   AND o.status='verified' AND m.tenant_id=o.tenant_id
   AND (public.has_role(_user,'superadmin'::public.app_role) OR m.tenant_id=public.get_user_tenant_id(_user))
   AND public.has_role(_user,'employer_partner'::public.app_role))
$verify_employer$;
REVOKE ALL ON FUNCTION public.unipathway_verified_employer_member(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unipathway_verified_employer_member(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_assert_employer_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $employer_tenant$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.unipathway_employer_organisations o
  WHERE o.id=NEW.organisation_id AND o.tenant_id=NEW.tenant_id)
 THEN RAISE EXCEPTION 'Employer tenant mismatch'; END IF;
 RETURN NEW;
END;$employer_tenant$;
CREATE TRIGGER trg_unipathway_employer_membership_tenant BEFORE INSERT OR UPDATE
 ON public.unipathway_employer_memberships FOR EACH ROW EXECUTE FUNCTION public.unipathway_assert_employer_tenant();

CREATE POLICY "Centre staff manage verified employers"
 ON public.unipathway_employer_organisations FOR ALL TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
   AND (status <> 'verified' OR verified_by=auth.uid()));
CREATE POLICY "Verified employer users view own organisation"
 ON public.unipathway_employer_organisations FOR SELECT TO authenticated
 USING (public.unipathway_verified_employer_member(id,auth.uid()));

CREATE POLICY "Centre staff manage employer memberships"
 ON public.unipathway_employer_memberships FOR ALL TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
   AND (status <> 'verified' OR verified_by=auth.uid()));
CREATE POLICY "Employer members view own membership"
 ON public.unipathway_employer_memberships FOR SELECT TO authenticated
 USING (user_id=auth.uid());

CREATE TABLE IF NOT EXISTS public.unipathway_employer_opportunities(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 organisation_id uuid NOT NULL REFERENCES public.unipathway_employer_organisations(id),
 title text NOT NULL,
 employer_display_name text NOT NULL DEFAULT '',
 opportunity_type text NOT NULL CHECK(opportunity_type IN('internship','workplace_learning','job')),
 city text,
 country text NOT NULL DEFAULT 'Pakistan',
 remote boolean NOT NULL DEFAULT false,
 role_description text NOT NULL,
 safety_requirements text,
 stipend_details text,
 application_deadline date,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','review','published','closed')),
 verification_reference text,
 approved_by uuid,
 approved_at timestamptz,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT uni_opportunity_published_evidence CHECK(status <> 'published' OR
  (verification_reference IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE INDEX uni_opportunity_tenant_status ON public.unipathway_employer_opportunities(tenant_id,status);
ALTER TABLE public.unipathway_employer_opportunities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.unipathway_assert_employer_opportunity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $vacancy_guard$
DECLARE _name text;
BEGIN
 SELECT name INTO _name FROM public.unipathway_employer_organisations WHERE id=NEW.organisation_id AND tenant_id=NEW.tenant_id;
 NEW.employer_display_name:=COALESCE(_name,'');
 IF NOT EXISTS(SELECT 1 FROM public.unipathway_employer_organisations o WHERE o.id=NEW.organisation_id
   AND o.tenant_id=NEW.tenant_id) THEN RAISE EXCEPTION 'Opportunity organisation and tenant mismatch'; END IF;
 IF TG_OP='UPDATE' AND (OLD.tenant_id<>NEW.tenant_id OR OLD.organisation_id<>NEW.organisation_id)
 THEN RAISE EXCEPTION 'Cannot reassign opportunity to another employer or tenant'; END IF;
 IF NEW.status='published' AND NOT EXISTS(
   SELECT 1 FROM public.unipathway_employer_organisations o
   WHERE o.id=NEW.organisation_id AND o.tenant_id=NEW.tenant_id AND o.status='verified'
 ) THEN RAISE EXCEPTION 'Employer verification is required to publish'; END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END;
$vacancy_guard$;
CREATE TRIGGER trg_unipathway_opportunity_guard BEFORE INSERT OR UPDATE
 ON public.unipathway_employer_opportunities FOR EACH ROW EXECUTE FUNCTION public.unipathway_assert_employer_opportunity();

CREATE POLICY "Centre staff read career opportunities"
 ON public.unipathway_employer_opportunities FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'admissions_admin'::public.app_role))));
CREATE POLICY "Centre leadership create and verify opportunities"
 ON public.unipathway_employer_opportunities FOR INSERT TO authenticated
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
  AND (status <> 'published' OR approved_by=auth.uid()));
CREATE POLICY "Centre leadership review opportunities"
 ON public.unipathway_employer_opportunities FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK ((public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
  AND (status <> 'published' OR approved_by=auth.uid()));
CREATE POLICY "Verified employer members read own opportunities"
 ON public.unipathway_employer_opportunities FOR SELECT TO authenticated
 USING (public.unipathway_verified_employer_member(organisation_id,auth.uid()));
CREATE POLICY "Verified employers draft opportunities"
 ON public.unipathway_employer_opportunities FOR INSERT TO authenticated
 WITH CHECK (public.unipathway_verified_employer_member(organisation_id,auth.uid()) AND status='draft' AND
   created_by=auth.uid());
CREATE POLICY "Verified employers edit own unpublished drafts"
 ON public.unipathway_employer_opportunities FOR UPDATE TO authenticated
 USING (status='draft' AND created_by=auth.uid() AND public.unipathway_verified_employer_member(organisation_id,auth.uid()))
 WITH CHECK (status='draft' AND created_by=auth.uid() AND public.unipathway_verified_employer_member(organisation_id,auth.uid()));
-- Student SELECT must not rely on direct employer-table visibility: students cannot
-- read private KYB records, while the server may attest a verified organisation.
CREATE OR REPLACE FUNCTION public.unipathway_student_verified_employer(_org uuid,_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $student_employer$
 SELECT _tenant=public.get_user_tenant_id(auth.uid())
    AND public.has_role(auth.uid(),'student'::public.app_role)
    AND EXISTS(SELECT 1 FROM public.unipathway_employer_organisations o
     WHERE o.id=_org AND o.tenant_id=_tenant AND o.status='verified')
$student_employer$;
REVOKE ALL ON FUNCTION public.unipathway_student_verified_employer(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unipathway_student_verified_employer(uuid,uuid) TO authenticated;

CREATE POLICY "Students see only verified published opportunities"
 ON public.unipathway_employer_opportunities FOR SELECT TO authenticated
 USING (status='published' AND tenant_id=public.get_user_tenant_id(auth.uid()) AND
   public.has_role(auth.uid(),'student'::public.app_role) AND
   public.unipathway_student_verified_employer(organisation_id,tenant_id));

CREATE TABLE IF NOT EXISTS public.unipathway_employer_applications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 opportunity_id uuid NOT NULL REFERENCES public.unipathway_employer_opportunities(id),
 student_id uuid NOT NULL,
 applicant_consent_at timestamptz NOT NULL,
 statement text,
 status text NOT NULL DEFAULT 'submitted'
   CHECK (status IN('submitted','screening','shortlisted','accepted','declined','withdrawn')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(opportunity_id,student_id)
);
CREATE INDEX uni_application_student ON public.unipathway_employer_applications(student_id,status);
ALTER TABLE public.unipathway_employer_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.unipathway_guard_employer_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $candidate_guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.unipathway_employer_opportunities p
 JOIN public.unipathway_employer_organisations o ON o.id=p.organisation_id
 WHERE p.id=NEW.opportunity_id AND p.tenant_id=NEW.tenant_id
   AND (TG_OP='UPDATE' OR (p.status='published' AND o.status='verified')))
 THEN RAISE EXCEPTION 'Only published, verified roles accept applications'; END IF;
 IF TG_OP='UPDATE' AND
  (OLD.tenant_id<>NEW.tenant_id OR OLD.opportunity_id<>NEW.opportunity_id OR OLD.student_id<>NEW.student_id)
 THEN RAISE EXCEPTION 'Cannot change application ownership'; END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END;
$candidate_guard$;
CREATE TRIGGER trg_uni_application_guard BEFORE INSERT OR UPDATE
 ON public.unipathway_employer_applications FOR EACH ROW EXECUTE FUNCTION public.unipathway_guard_employer_application();

CREATE POLICY "Students create own consenting applications"
 ON public.unipathway_employer_applications FOR INSERT TO authenticated
 WITH CHECK (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND
   public.has_role(auth.uid(),'student'::public.app_role));
CREATE POLICY "Students view own applications"
 ON public.unipathway_employer_applications FOR SELECT TO authenticated
 USING (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Students may withdraw own application"
 ON public.unipathway_employer_applications FOR UPDATE TO authenticated
 USING (student_id=auth.uid() AND status IN('submitted','screening'))
 WITH CHECK (student_id=auth.uid() AND status='withdrawn' AND tenant_id=public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Centre admissions view applications in tenant"
 ON public.unipathway_employer_applications FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'admissions_admin'::public.app_role))));
CREATE POLICY "Centre directors manage application status"
 ON public.unipathway_employer_applications FOR UPDATE TO authenticated
 USING (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director'::public.app_role)));
CREATE POLICY "Verified employers read consenting applicants for own opportunities"
 ON public.unipathway_employer_applications FOR SELECT TO authenticated
 USING (applicant_consent_at IS NOT NULL AND
  EXISTS(SELECT 1 FROM public.unipathway_employer_opportunities p
    WHERE p.id=opportunity_id AND p.tenant_id=unipathway_employer_applications.tenant_id AND
      public.unipathway_verified_employer_member(p.organisation_id,auth.uid())));

-- Do not grant public anonymous access to applicant identities or workplace records.
REVOKE ALL ON public.unipathway_employer_organisations,
 public.unipathway_employer_memberships,
 public.unipathway_employer_opportunities,
 public.unipathway_employer_applications FROM anon;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_employer_organisations,
 public.unipathway_employer_memberships,
 public.unipathway_employer_opportunities,
 public.unipathway_employer_applications TO authenticated;

COMMIT;
