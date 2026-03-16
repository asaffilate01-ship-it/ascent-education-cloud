
-- 1. Remove public access to full tenants table, keep only authenticated access
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- Create a restrictive public policy that only returns branding columns
-- Since RLS can't restrict columns, we use the tenants_public view for public access
-- and keep tenants table access to authenticated users only
CREATE POLICY "Authenticated users view active tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (status = 'active'::tenant_status);

-- Grant public SELECT on the tenants_public view (safe columns only)
GRANT SELECT ON public.tenants_public TO anon;
GRANT SELECT ON public.tenants_public TO authenticated;
