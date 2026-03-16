
-- Fix the security definer view issue by using SECURITY INVOKER
DROP VIEW IF EXISTS public.tenants_public;

CREATE VIEW public.tenants_public
WITH (security_invoker = true)
AS
SELECT id, name, slug, logo_url, primary_color, accent_color, brand_name, status
FROM public.tenants
WHERE status = 'active';
