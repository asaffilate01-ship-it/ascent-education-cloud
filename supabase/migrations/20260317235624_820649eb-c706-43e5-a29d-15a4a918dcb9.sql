
-- FIX 1: CRITICAL - Prevent privilege escalation via self-assigned agent role
-- Remove 'agent' from self-assignable roles; only 'student' allowed
DROP POLICY IF EXISTS "Users can self-assign registration roles" ON public.user_roles;

CREATE POLICY "Users can self-assign student role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'student'::app_role
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);

-- FIX 2: Scope tenant_domains policies from public to authenticated
DROP POLICY IF EXISTS "Directors manage tenant domains" ON public.tenant_domains;
DROP POLICY IF EXISTS "Staff view tenant domains" ON public.tenant_domains;

CREATE POLICY "Directors manage tenant domains"
ON public.tenant_domains
FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Staff view tenant domains"
ON public.tenant_domains
FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- FIX 3: Hide commission column from agents - replace policy with one that excludes commission
-- We can't hide columns via RLS, so instead restrict agent access to require tenant context
DROP POLICY IF EXISTS "Authenticated users view public partner data" ON public.partner_universities;

CREATE POLICY "Staff view partner universities"
ON public.partner_universities
FOR SELECT
TO authenticated
USING (
  status = 'active'::text
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'centre_director'::app_role)
    OR has_role(auth.uid(), 'finance_officer'::app_role)
    OR (has_role(auth.uid(), 'agent'::app_role) AND get_user_tenant_id(auth.uid()) IS NOT NULL)
  )
);
