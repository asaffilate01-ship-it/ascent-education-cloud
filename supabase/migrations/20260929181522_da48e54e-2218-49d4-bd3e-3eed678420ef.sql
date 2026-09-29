CREATE OR REPLACE FUNCTION public.ensure_my_account()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _tenant uuid;
  _meta jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT raw_user_meta_data, email INTO _meta FROM auth.users WHERE id = _uid;
  SELECT id INTO _tenant FROM public.tenants WHERE slug = 'unipathway' LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid) THEN
    INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
    SELECT _uid, COALESCE(_meta->>'full_name', u.email), u.email, _tenant FROM auth.users u WHERE u.id = _uid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, CASE WHEN _meta->>'account_type' = 'agent' THEN 'agent'::app_role ELSE 'student'::app_role END);
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_account() TO authenticated;