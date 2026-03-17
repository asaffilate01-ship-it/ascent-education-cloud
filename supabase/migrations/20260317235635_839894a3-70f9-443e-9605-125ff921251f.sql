
-- FIX 4: Update assign_default_role trigger to only assign 'student'
-- Agent role must now be assigned by staff (centre_director/superadmin)
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Always assign student role on signup; agent role must be granted by staff
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
