-- Close legacy provisional-grade exposure before enabling new human/IQA workflow.
-- STAGING ONLY. Requires migrating legacy coursework to the new assessment
-- tables or consciously archiving it before activating this policy.
-- No existing coursework/grade data is deleted.
BEGIN;
DO $legacy_submission_gate$
BEGIN
 IF to_regclass('public.submissions') IS NULL THEN
  RAISE EXCEPTION 'Expected legacy submissions table before marking cutover';
 END IF;
END
$legacy_submission_gate$;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
-- Old student-owned row SELECT exposed provisional grade, feedback and model
-- fields because RLS protects ROWS not individual COLUMNS. Restrict entire
-- legacy submission table; student work lives in immutable attempt records.
DO $drop_legacy_policies$
DECLARE p record;
BEGIN
 FOR p IN SELECT policyname FROM pg_policies
  WHERE schemaname='public' AND tablename='submissions'
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.submissions',p.policyname);
 END LOOP;
END
$drop_legacy_policies$;
CREATE POLICY "legacy coursework archived audit by academic director only"
 ON public.submissions FOR SELECT TO authenticated
 USING((tenant_id=public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(),'centre_director'::public.app_role))
  OR public.has_role(auth.uid(),'superadmin'::public.app_role));
REVOKE INSERT,UPDATE,DELETE ON public.submissions FROM authenticated;
-- Do not GRANT any student SELECT on legacy submissions, even the student's own row.
-- No blanket staff UPDATE/ALL policy is recreated. Old lecturer direct-mark
-- functions and endpoints must remain unrouted and disabled in staging.
COMMIT;
