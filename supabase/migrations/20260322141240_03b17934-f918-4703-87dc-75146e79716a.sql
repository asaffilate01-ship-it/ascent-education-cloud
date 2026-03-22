
CREATE OR REPLACE FUNCTION public.assign_default_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
BEGIN
  _account_type := NEW.raw_user_meta_data->>'account_type';

  -- Only allow self-assignment of student or agent roles
  IF _account_type = 'agent' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'agent')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Default to student for all regular signups
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
