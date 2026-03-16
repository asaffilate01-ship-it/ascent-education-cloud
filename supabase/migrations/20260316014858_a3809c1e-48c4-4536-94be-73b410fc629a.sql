
-- Fix profiles policy: restrict tenant-wide viewing to staff roles only
DROP POLICY IF EXISTS "Tenant staff can view tenant profiles" ON public.profiles;

CREATE POLICY "Staff can view tenant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (tenant_id = get_user_tenant_id(auth.uid()))
  AND (
    has_role(auth.uid(), 'centre_director'::app_role)
    OR has_role(auth.uid(), 'admissions_admin'::app_role)
    OR has_role(auth.uid(), 'lecturer'::app_role)
    OR has_role(auth.uid(), 'programme_leader'::app_role)
    OR has_role(auth.uid(), 'finance_officer'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);
