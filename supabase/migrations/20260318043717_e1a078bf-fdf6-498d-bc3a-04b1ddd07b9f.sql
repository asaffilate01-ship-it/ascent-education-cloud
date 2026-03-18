
-- FIX: Make has_role() tenant-aware to prevent cross-tenant role escalation
-- A role granted in Tenant A should not grant access to Tenant B's data
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
      AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(_user_id))
  )
$$;
