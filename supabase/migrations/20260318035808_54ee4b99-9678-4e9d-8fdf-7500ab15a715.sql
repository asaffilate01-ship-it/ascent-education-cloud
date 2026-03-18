
-- Recreate transport_vehicles_student with correct columns (no driver PII, no GPS)
DROP VIEW IF EXISTS public.transport_vehicles_student;
CREATE OR REPLACE VIEW public.transport_vehicles_student
WITH (security_invoker = true) AS
SELECT id, tenant_id, vehicle_number, vehicle_type, capacity, status, created_at
FROM public.transport_vehicles
WHERE tenant_id = get_user_tenant_id(auth.uid());
