
-- FIX 1: CRITICAL - Prevent tenant_id spoofing on profile INSERT
-- The handle_new_user trigger creates profiles with NULL tenant_id.
-- Users should not be able to set tenant_id during self-insert.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND tenant_id IS NULL);

-- FIX 2: CRITICAL - Prevent centre_directors from escalating to superadmin
-- Drop and recreate the "Directors manage tenant roles" policy with role restrictions
DROP POLICY IF EXISTS "Directors manage tenant roles" ON public.user_roles;

CREATE POLICY "Directors manage tenant roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'centre_director') 
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND role NOT IN ('superadmin', 'centre_director')
  )
  WITH CHECK (
    has_role(auth.uid(), 'centre_director') 
    AND tenant_id = get_user_tenant_id(auth.uid())
    AND role NOT IN ('superadmin', 'centre_director')
  );
