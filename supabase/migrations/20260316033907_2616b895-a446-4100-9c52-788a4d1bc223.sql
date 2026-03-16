-- tenants_public is a view, so it inherits RLS from the base tenants table
-- Add anon SELECT policy to tenants for public-facing pages
CREATE POLICY "Public can view active tenants basic info"
  ON public.tenants FOR SELECT
  TO anon
  USING (status = 'active');

-- Fix self-assign roles
DROP POLICY IF EXISTS "Users can self-assign registration roles" ON public.user_roles;

CREATE POLICY "Users can self-assign registration roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND role IN ('student', 'agent')
    AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
  );