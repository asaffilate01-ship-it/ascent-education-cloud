-- Reviewed one-time activation: stop on drift or partial installation.
DO $preflight$
DECLARE name text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('unipathway-onboarding-forward-v1',0));
 FOREACH name IN ARRAY ARRAY['public.tenants','public.profiles','public.user_roles','public.modules','public.student_enrolments','auth.users'] LOOP
  IF to_regclass(name) IS NULL THEN RAISE EXCEPTION 'Missing onboarding prerequisite: %',name; END IF;
 END LOOP;
 IF to_regprocedure('public.get_user_tenant_id(uuid)') IS NULL OR to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('unipathway_acl.manager(uuid)') IS NULL THEN RAISE EXCEPTION 'Missing verified tenant or academic manager helper'; END IF;
 FOREACH name IN ARRAY ARRAY['onboarding_application_drafts','onboarding_module_registrations','onboarding_teaching_reviews','onboarding_application_events'] LOOP
  IF to_regclass('public.'||name) IS NOT NULL THEN RAISE EXCEPTION 'Partial or existing onboarding installation: %; reconcile manually',name; END IF;
 END LOOP;
 IF to_regprocedure('public.record_onboarding_module_registration(uuid,uuid,text)') IS NOT NULL
 OR to_regprocedure('public.review_onboarding_teaching_competency(uuid,integer,jsonb,text,text)') IS NOT NULL
 OR to_regprocedure('public.record_onboarding_application_event(uuid,text,jsonb,text,text)') IS NOT NULL
 OR to_regprocedure('public.get_onboarding_application_status(uuid,text)') IS NOT NULL THEN RAISE EXCEPTION 'Existing onboarding RPC; reconcile manually'; END IF;
 IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version::text IN ('20261124101500','20261124120000','20261124131500','20261124133000','20261124134500')) THEN RAISE EXCEPTION 'Onboarding ledger entries already exist; reconcile schema before proceeding'; END IF;
 END IF;
 -- Only the missing caller-only helper is bootstrapped, not historic policies.
 IF to_regprocedure('public.current_unipathway_tenant_id()') IS NULL THEN
  EXECUTE $create$CREATE FUNCTION public.current_unipathway_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $body$ SELECT public.get_user_tenant_id(auth.uid()) $body$ $create$;
  REVOKE ALL ON FUNCTION public.current_unipathway_tenant_id() FROM PUBLIC,anon;
  GRANT EXECUTE ON FUNCTION public.current_unipathway_tenant_id() TO authenticated;
 END IF;
END $preflight$;
