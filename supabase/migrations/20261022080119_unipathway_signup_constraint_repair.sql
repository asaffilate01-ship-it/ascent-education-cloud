-- Match the actual tenant-scoped role constraint without changing existing assignments.
BEGIN;
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $agent_signup_default$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 'student'::public.app_role
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=NEW.id AND role='student'::public.app_role)
  ON CONFLICT DO NOTHING;
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
  SELECT NEW.id, 'student'::public.app_role
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=NEW.id AND role='student'::public.app_role)
  ON CONFLICT DO NOTHING;
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
  PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text,0));
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=_uid) THEN RETURN; END IF;
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

REVOKE ALL ON FUNCTION public.assign_default_role(),public.handle_new_user(),public.ensure_my_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_account() TO authenticated;
COMMIT;
