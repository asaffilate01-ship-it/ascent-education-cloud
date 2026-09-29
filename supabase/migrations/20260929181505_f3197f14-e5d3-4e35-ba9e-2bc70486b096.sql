CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _tenant uuid;
  _type text := NEW.raw_user_meta_data->>'account_type';
BEGIN
  SELECT id INTO _tenant FROM public.tenants WHERE slug = 'unipathway' LIMIT 1;
  INSERT INTO public.profiles (user_id, full_name, email, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, _tenant)
  ON CONFLICT (user_id) DO NOTHING;
  -- Only self-service roles may be chosen at sign-up
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN _type = 'agent' THEN 'agent'::app_role ELSE 'student'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

UPDATE public.profiles SET tenant_id = (SELECT id FROM public.tenants WHERE slug='unipathway')
WHERE tenant_id IS NULL;