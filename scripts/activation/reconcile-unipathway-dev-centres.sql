-- Reviewed repair for the supplied UniPathway test accounts only.
-- Dry run by default: inspect affected accounts, then run the identical
-- transaction with the final ROLLBACK changed to COMMIT to persist.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT id::text FROM auth.users WHERE email='dev.superadmin@educloud.test'),true);
DO $$ BEGIN
 IF NOT coalesce(public.has_role(auth.uid(),'superadmin'::public.app_role),false) THEN RAISE EXCEPTION 'Verified superadmin actor required'; END IF;
 IF (SELECT count(*) FROM public.tenants WHERE slug='unipathway')<>1 THEN
  RAISE EXCEPTION 'Exactly one UniPathway centre is required';
 END IF;
END $$;
WITH expected(email,role_name) AS (VALUES
 ('dev.director@educloud.test','centre_director'),
 ('dev.admissions@educloud.test','admissions_admin'),
 ('dev.programme@educloud.test','programme_leader'),
 ('dev.qa@educloud.test','iqa_officer'),
 ('dev.exams@educloud.test','exams_officer'),
 ('dev.finance@educloud.test','finance_officer'),
 ('dev.marketing@educloud.test','marketing_officer'),
 ('dev.agent@educloud.test','agent'),
 ('dev.unipartner@educloud.test','university_partner'),
 ('dev.employer@educloud.test','employer_partner'),
 ('dev.parent@educloud.test','parent_guardian')),
changed AS (
 UPDATE public.profiles p SET tenant_id=(SELECT id FROM public.tenants WHERE slug='unipathway')
 FROM auth.users u,expected e
 WHERE p.user_id=u.id AND u.email=e.email AND p.tenant_id IS NULL
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role::text=e.role_name)
 RETURNING p.email,p.tenant_id IS NOT NULL AS assigned
)
SELECT email AS centre_assignment_repaired,assigned FROM changed ORDER BY email;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id WHERE u.email IN ('dev.director@educloud.test','dev.admissions@educloud.test','dev.programme@educloud.test','dev.qa@educloud.test','dev.exams@educloud.test','dev.finance@educloud.test','dev.marketing@educloud.test','dev.agent@educloud.test','dev.unipartner@educloud.test','dev.employer@educloud.test','dev.parent@educloud.test') AND p.tenant_id IS NULL) THEN RAISE EXCEPTION 'Centre repair was not persisted; rollback'; END IF;
END $$;
ROLLBACK;
