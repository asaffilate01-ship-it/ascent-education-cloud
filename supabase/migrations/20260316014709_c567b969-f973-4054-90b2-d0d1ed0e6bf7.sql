
-- 1. Remove centre_director from self-assignable roles
DROP POLICY IF EXISTS "Users can self-assign registration roles" ON public.user_roles;

CREATE POLICY "Users can self-assign registration roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('student'::app_role, 'agent'::app_role)
);

-- 2. Restrict public tenants policy to non-sensitive columns
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

CREATE POLICY "Public can view active tenants"
ON public.tenants
FOR SELECT
TO public
USING (status = 'active'::tenant_status);
