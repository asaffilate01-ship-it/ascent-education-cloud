-- Allow programme managers to populate the lecturer assignment picker without
-- granting them general role management or access to unrelated staff roles.
CREATE POLICY "Managers read eligible lecturer directory" ON public.user_roles
FOR SELECT TO authenticated USING (
 role='lecturer'::public.app_role
 AND public.has_role(user_id,'lecturer'::public.app_role)
 AND unipathway_acl.manager(public.get_user_tenant_id(user_id))
);
