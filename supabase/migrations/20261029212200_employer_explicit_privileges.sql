-- Remove inherited privileges that RLS does not cover (notably TRUNCATE).
-- Keep the employer foundation's participant policies; no new approvals or members.
BEGIN;
REVOKE ALL ON public.unipathway_employer_organisations,
 public.unipathway_employer_memberships,
 public.unipathway_employer_opportunities,
 public.unipathway_employer_applications FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_employer_organisations,
 public.unipathway_employer_memberships,
 public.unipathway_employer_opportunities,
 public.unipathway_employer_applications TO authenticated;
REVOKE ALL ON FUNCTION public.unipathway_assert_employer_tenant(),
 public.unipathway_assert_employer_opportunity(),
 public.unipathway_guard_employer_application() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.unipathway_verified_employer_member(uuid,uuid),
 public.unipathway_student_verified_employer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.unipathway_verified_employer_member(uuid,uuid),
 public.unipathway_student_verified_employer(uuid,uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS uni_opportunity_organisation
 ON public.unipathway_employer_opportunities(organisation_id);
CREATE INDEX IF NOT EXISTS uni_application_tenant
 ON public.unipathway_employer_applications(tenant_id);
COMMIT;
