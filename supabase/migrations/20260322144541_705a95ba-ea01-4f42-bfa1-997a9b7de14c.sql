DROP POLICY IF EXISTS "Users can self-assign student role" ON public.user_roles;

CREATE POLICY "Users can self-assign student role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('student'::app_role, 'agent'::app_role)
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);