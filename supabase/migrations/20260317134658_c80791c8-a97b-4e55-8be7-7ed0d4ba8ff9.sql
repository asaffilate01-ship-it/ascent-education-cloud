
-- Fix the security definer view issue
DROP VIEW IF EXISTS public.partner_universities_public;
CREATE VIEW public.partner_universities_public
WITH (security_invoker = true)
AS SELECT id, name, country, flag, programme, url, fee, ielts, intake, status
FROM public.partner_universities
WHERE status = 'active';
