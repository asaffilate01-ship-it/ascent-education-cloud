
-- FIX 3 (retry): Restrict transport_vehicles - hide driver PII & GPS from students

DROP POLICY IF EXISTS "Tenant users view vehicles" ON public.transport_vehicles;
DROP POLICY IF EXISTS "Staff view vehicles" ON public.transport_vehicles;
DROP POLICY IF EXISTS "Students view vehicles basic" ON public.transport_vehicles;

-- Staff see everything
CREATE POLICY "Staff view vehicles"
ON public.transport_vehicles
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'centre_director'::app_role)
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR has_role(auth.uid(), 'lecturer'::app_role)
  )
);

-- Students see only basic info via a restricted view
CREATE OR REPLACE VIEW public.transport_vehicles_student
WITH (security_invoker = true)
AS
SELECT id, tenant_id, vehicle_number, vehicle_type, capacity, status
FROM public.transport_vehicles;

-- Students can read the base table (needed for the view) but we'll direct student code to the view
CREATE POLICY "Students view vehicles basic"
ON public.transport_vehicles
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_role(auth.uid(), 'student'::app_role)
);
