-- UniPathway security hotfix. Apply to the existing Lovable-connected Supabase project.
-- This intentionally fails closed where partner-university ownership is not modelled.
-- Do NOT recreate blanket university_partner access to student/commission data.
BEGIN;

-- A university_partner role alone must never disclose every tenant's referral income,
-- student names, commission terms and payment references.
DROP POLICY IF EXISTS "University partners view own referrals" ON public.referral_income;

-- Only learners may self-register a role. Agent status requires staff vetting and assignment.
DROP POLICY IF EXISTS "Users can self-assign student role" ON public.user_roles;
CREATE POLICY "Users can self-assign student role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'student'::public.app_role
    AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id(auth.uid()))
  );

-- Supabase Auth signup metadata is client-controlled. Security-definer triggers
-- must never promote an applicant to the recruitment-agent role automatically.
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $agent_signup_default$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$agent_signup_default$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $account_signup_default$
DECLARE _tenant uuid;
BEGIN
  SELECT id INTO _tenant FROM public.tenants WHERE slug = 'unipathway' LIMIT 1;
  INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, _tenant)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$account_signup_default$;

CREATE OR REPLACE FUNCTION public.ensure_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $ensure_self_only$
DECLARE
  _uid uuid := auth.uid();
  _tenant uuid;
  _meta jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT raw_user_meta_data INTO _meta FROM auth.users WHERE id = _uid;
  SELECT id INTO _tenant FROM public.tenants WHERE slug = 'unipathway' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid) THEN
    INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
    SELECT _uid, COALESCE(_meta->>'full_name', u.email), u.email, _tenant
    FROM auth.users u WHERE u.id = _uid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'student'::public.app_role);
  END IF;
END;
$ensure_self_only$;

COMMIT;

-- Follow-up: introduce a verified institution-to-user membership relation and an
-- institution-specific referral VIEW before restoring partner-facing commission access.
-- The admin/finance policies on referral_income continue to apply.
