-- Operator-only preparation: run in an isolated copy of the real UniPathway schema first.
-- This is a proposed overlay, NOT a replacement for existing role/centre RLS.
-- Do not deploy until authenticated RPCs, views, storage and edge endpoints have been independently reviewed.
BEGIN;
DO $block$
DECLARE r record;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='unipathway_identity' AND p.proname='session_approved')
 THEN RAISE EXCEPTION 'Institutional approval patch required';END IF;
 IF EXISTS(
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p')
  AND NOT c.relrowsecurity
  AND (has_table_privilege('authenticated',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'INSERT')
  OR has_table_privilege('authenticated',c.oid,'UPDATE') OR has_table_privilege('authenticated',c.oid,'DELETE'))
 )
 THEN RAISE EXCEPTION 'Review exposed authenticated tables without RLS before proceeding';END IF;
 FOR r IN
  SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p') AND c.relrowsecurity
 LOOP
  EXECUTE format('CREATE POLICY unipathway_approved_mfa_session ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT unipathway_identity.session_approved())) WITH CHECK ((SELECT unipathway_identity.session_approved()))',r.nspname,r.relname);
 END LOOP;
END;
$block$;
-- These are diagnostics, not an assurance that privileged routines or public views are safe.
-- SECURITY DEFINER RPCs and service-role endpoints can bypass ordinary RLS.
COMMIT;
