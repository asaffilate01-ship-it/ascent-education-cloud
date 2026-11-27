-- Reviewed forward patch; NOT an automatic production migration.
-- Apply only after reconciling the actual auth/users/sessions schema and account provisioning.
BEGIN;
CREATE SCHEMA unipathway_identity;
REVOKE ALL ON SCHEMA unipathway_identity FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA unipathway_identity TO authenticated,supabase_auth_admin;
CREATE TABLE unipathway_identity.approved_accounts(
 user_id uuid PRIMARY KEY,
 approved_email text NOT NULL UNIQUE CHECK(approved_email ~ '^[a-z0-9][a-z0-9._+-]{0,63}@unipathway[.]pk$' AND position('..' in split_part(approved_email,'@',1))=0),
 approved_at timestamptz NOT NULL DEFAULT now(),
 approval_reference text NOT NULL CHECK(length(btrim(approval_reference)) BETWEEN 1 AND 200),
 revoked_at timestamptz
);
ALTER TABLE unipathway_identity.approved_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_identity.approved_accounts FROM PUBLIC,anon,authenticated,supabase_auth_admin;
-- No browser writes or self-approval. Populate via authorised operator only.
CREATE FUNCTION unipathway_identity.account_approved(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM auth.users u
  JOIN unipathway_identity.approved_accounts a ON a.user_id=u.id
  JOIN public.profiles p ON p.user_id=u.id
  JOIN public.user_roles r ON r.user_id=u.id
  LEFT JOIN public.tenants t ON t.id=p.tenant_id
  WHERE u.id=p_user AND a.revoked_at IS NULL
  AND lower(u.email)=a.approved_email
  AND (
    (r.role::text='superadmin' AND r.tenant_id IS NULL)
    OR (r.tenant_id=p.tenant_id AND t.status::text='active'
      AND r.role::text IN ('centre_director','admissions_admin','office_admin','hr_officer','secretary','lecturer','assessor','programme_leader','iqa_officer','awarding_body_eqa','welfare_officer','security_officer','exams_officer','finance_officer','marketing_officer','agent','student','parent_guardian','university_partner','employer_partner'))
  )
 )
$fn$;
REVOKE ALL ON FUNCTION unipathway_identity.account_approved(uuid) FROM PUBLIC,anon,authenticated,supabase_auth_admin;
-- Auth hook is explicitly registered by operator only after approved accounts are reconciled.
-- AAL1 must be possible for approved accounts to complete TOTP enrollment/recovery.
CREATE FUNCTION unipathway_identity.institutional_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid;
BEGIN
 v_user:=(event->>'user_id')::uuid;
 IF NOT coalesce(unipathway_identity.account_approved(v_user),false)
 OR (event->'claims'->>'is_anonymous') IS DISTINCT FROM 'false'
 OR NOT EXISTS(SELECT 1 FROM unipathway_identity.approved_accounts a WHERE a.user_id=v_user AND a.approved_email=lower(event->'claims'->>'email') AND a.revoked_at IS NULL)
 THEN
  RAISE EXCEPTION 'Institutional account not authorised' USING ERRCODE='42501';
 END IF;
 RETURN event;
END;
$fn$;
REVOKE ALL ON FUNCTION unipathway_identity.institutional_token_hook(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_identity.institutional_token_hook(jsonb) TO supabase_auth_admin;

-- Recheck current approval, confirmed email, current session, MFA and active centre/role.
-- Restrictive policies and sensitive SECURITY DEFINER routines must call this predicate.
CREATE FUNCTION unipathway_identity.session_approved()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT coalesce(
   auth.uid() IS NOT NULL AND auth.jwt()->>'aal'='aal2'
   AND auth.jwt()->>'is_anonymous'='false'
   AND unipathway_identity.account_approved(auth.uid())
   AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email)=lower(auth.jwt()->>'email'))
   AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=auth.uid() AND s.id::text=auth.jwt()->>'session_id' AND s.aal::text='aal2' AND (s.not_after IS NULL OR s.not_after>now()))
 ,false)
$fn$;
REVOKE ALL ON FUNCTION unipathway_identity.session_approved() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_identity.session_approved() TO authenticated;
CREATE FUNCTION public.unipathway_institutional_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_identity.session_approved() $fn$;
REVOKE ALL ON FUNCTION public.unipathway_institutional_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_institutional_access() TO authenticated;
-- Private operator-only view of active sessions; IP supplied by Auth, never browser.
-- Session rows can disappear after revocation; use approved Auth log retention for history.
CREATE VIEW unipathway_identity.current_login_sessions WITH (security_invoker=true) AS
 SELECT s.id AS session_id,s.user_id,s.created_at,s.updated_at,s.ip,s.user_agent,s.aal
 FROM auth.sessions s JOIN unipathway_identity.approved_accounts a ON a.user_id=s.user_id;
REVOKE ALL ON unipathway_identity.current_login_sessions FROM PUBLIC,anon,authenticated,supabase_auth_admin;
COMMIT;
