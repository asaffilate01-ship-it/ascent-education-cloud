-- Global Education Partnerships Hub: prospects, approved routes, agreements and referrals.
-- Entries seeded below are RESEARCH LEADS, not contracted partners or guaranteed admission routes.
CREATE TABLE IF NOT EXISTS public.international_education_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 slug text NOT NULL,
 name text NOT NULL,
 partner_kind text NOT NULL CHECK (partner_kind IN ('recruitment_group','awarding_body','pathway_provider','application_platform','university','language_provider')),
 countries text[] NOT NULL DEFAULT '{}',
 website text,
 relationship_status text NOT NULL DEFAULT 'prospect' CHECK (relationship_status IN ('prospect','contacted','application_submitted','due_diligence','contracted','active','suspended','rejected')),
 agreement_signed_on date,
 accreditation_status text NOT NULL DEFAULT 'not_applied' CHECK (accreditation_status IN ('not_applied','applied','under_review','approved','expired','rejected','not_applicable')),
 notes text,
 next_action text,
 next_action_at timestamptz,
 owner_id uuid,
 last_reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agreement_required_to_claim_relationship CHECK (relationship_status NOT IN ('contracted','active') OR agreement_signed_on IS NOT NULL),
 UNIQUE (tenant_id,slug),
 UNIQUE (id,tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_global_education_partner_search ON public.international_education_partners(tenant_id,partner_kind,relationship_status);

CREATE TABLE IF NOT EXISTS public.international_pathway_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL,
 awarding_body_id uuid,
 route_name text NOT NULL,
 qualification_level text,
 qualification_name text,
 destination_country text NOT NULL,
 destination_institution text NOT NULL,
 destination_programme text NOT NULL,
 entry_stage text,
 grade_requirements text,
 english_requirements text,
 pathway_type text NOT NULL DEFAULT 'progression_review' CHECK(pathway_type IN ('direct_entry','foundation','advanced_entry','top_up','credit_transfer','progression_review')),
 review_status text NOT NULL DEFAULT 'proposed' CHECK(review_status IN ('proposed','under_review','verified','rejected','withdrawn')),
 evidence_url text,
 evidence_reviewed_at timestamptz,
 verified_by uuid,
 student_visible boolean NOT NULL DEFAULT false,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,tenant_id),
 CONSTRAINT route_same_tenant_partner FOREIGN KEY(partner_id,tenant_id) REFERENCES public.international_education_partners(id,tenant_id) ON DELETE CASCADE,
 CONSTRAINT route_same_tenant_awarder FOREIGN KEY(awarding_body_id,tenant_id) REFERENCES public.international_education_partners(id,tenant_id),
 CONSTRAINT verified_route_has_evidence CHECK(review_status <> 'verified' OR (evidence_url IS NOT NULL AND evidence_reviewed_at IS NOT NULL AND verified_by IS NOT NULL)),
 CONSTRAINT published_route_is_verified CHECK(student_visible = false OR review_status='verified')
);
CREATE INDEX IF NOT EXISTS idx_international_routes ON public.international_pathway_routes(tenant_id,destination_country,review_status);

CREATE TABLE IF NOT EXISTS public.international_partner_agreements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL,
 agreement_type text NOT NULL CHECK(agreement_type IN ('recruitment','articulation','delivery_centre','affiliate','other')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','signed','expired','terminated')),
 document_reference text,
 starts_on date,
 ends_on date,
 commission_currency text,
 commission_amount numeric CHECK(commission_amount IS NULL OR commission_amount >= 0),
 commission_basis text CHECK(commission_basis IS NULL OR commission_basis IN ('flat_per_enrolment','percentage_of_tuition','tiered','other')),
 clawback_days integer CHECK(clawback_days IS NULL OR clawback_days >= 0),
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agreements_partner_tenant FOREIGN KEY(partner_id,tenant_id) REFERENCES public.international_education_partners(id,tenant_id),
 CONSTRAINT signed_agreement_has_document CHECK(status <> 'signed' OR (document_reference IS NOT NULL AND starts_on IS NOT NULL))
);
-- Composite key prevents referral records attaching applications belonging to a different tenant or student.
ALTER TABLE public.international_university_applications
 ADD CONSTRAINT global_referral_application_identity UNIQUE (id,tenant_id,student_id);

CREATE TABLE IF NOT EXISTS public.international_partner_referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 partner_id uuid NOT NULL,
 route_id uuid,
 student_id uuid NOT NULL,
 international_application_id uuid,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','consented','submitted','acknowledged','offer','enrolled','withdrawn','rejected')),
 student_consent_at timestamptz,
 external_application_ref text,
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT referrals_same_tenant_partner FOREIGN KEY(partner_id,tenant_id) REFERENCES public.international_education_partners(id,tenant_id),
 CONSTRAINT referrals_same_tenant_route FOREIGN KEY(route_id,tenant_id) REFERENCES public.international_pathway_routes(id,tenant_id),
 CONSTRAINT referrals_same_tenant_application FOREIGN KEY(international_application_id,tenant_id,student_id) REFERENCES public.international_university_applications(id,tenant_id,student_id),
 CONSTRAINT referral_submission_needs_consent CHECK(status NOT IN ('submitted','acknowledged','offer','enrolled') OR student_consent_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_international_referrals ON public.international_partner_referrals(tenant_id,student_id,status);

-- Publishing requires reviewed route evidence AND an internally recorded contracted/active partner.
CREATE OR REPLACE FUNCTION public.check_global_pathway_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.student_visible AND NOT EXISTS (
   SELECT 1 FROM public.international_education_partners p
   WHERE p.id=NEW.partner_id AND p.tenant_id=NEW.tenant_id
   AND p.relationship_status IN ('contracted','active')
   AND p.agreement_signed_on IS NOT NULL
 ) THEN
   RAISE EXCEPTION 'Cannot publish route without approved contractual partner status';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_global_pathway_publication_before_write
 BEFORE INSERT OR UPDATE ON public.international_pathway_routes
 FOR EACH ROW EXECUTE FUNCTION public.check_global_pathway_publication();

ALTER TABLE public.international_education_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_pathway_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_partner_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_partner_referrals ENABLE ROW LEVEL SECURITY;

-- Protected administrative catalogue. Prospects and commission details never appear in public results.
CREATE POLICY "global partners staff read" ON public.international_education_partners FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR
 public.has_role(auth.uid(),'admissions_admin'::app_role) OR public.has_role(auth.uid(),'marketing_officer'::app_role)));
CREATE POLICY "global partners management" ON public.international_education_partners FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE POLICY "routes staff read" ON public.international_pathway_routes FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR
 public.has_role(auth.uid(),'admissions_admin'::app_role) OR public.has_role(auth.uid(),'programme_leader'::app_role)));
CREATE POLICY "routes verified student read" ON public.international_pathway_routes FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND student_visible AND review_status='verified');
CREATE POLICY "routes management" ON public.international_pathway_routes FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE POLICY "partner agreements finance read" ON public.international_partner_agreements FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'finance_officer'::app_role)));
CREATE POLICY "partner agreements management" ON public.international_partner_agreements FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'superadmin'::app_role)));

CREATE POLICY "referrals own student and staff read" ON public.international_partner_referrals FOR SELECT TO authenticated
USING (public.same_tenant(tenant_id) AND (
 student_id=auth.uid() OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE POLICY "referrals staff management" ON public.international_partner_referrals FOR ALL TO authenticated
USING (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)))
WITH CHECK (public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));

-- Seed an internal outreach shortlist for existing tenants; do not claim affiliation.
INSERT INTO public.international_education_partners(tenant_id,slug,name,partner_kind,countries,website)
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
) AS x(slug,name,kind,countries,website)
ON CONFLICT(tenant_id,slug) DO NOTHING;
