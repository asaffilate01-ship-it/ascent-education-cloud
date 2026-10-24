-- Internal arbitrary-user lookup stays private. Policies may inspect only the caller's centre.
CREATE FUNCTION public.current_unipathway_tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.get_user_tenant_id(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.current_unipathway_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_unipathway_tenant_id() TO anon,authenticated,service_role;
-- Preserve every policy's roles, command, permissiveness and remaining predicates.
-- Replace only the exact current-identity call, never an arbitrary-user expression.
DO $$
DECLARE p record; q text; c text;
BEGIN
 FOR p IN SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies
 WHERE schemaname IN ('public','storage') AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%get_user_tenant_id(auth.uid())%'
 LOOP
  q:=regexp_replace(p.qual,'(public\.)?get_user_tenant_id\(auth\.uid\(\)\)','public.current_unipathway_tenant_id()','g');
  c:=regexp_replace(p.with_check,'(public\.)?get_user_tenant_id\(auth\.uid\(\)\)','public.current_unipathway_tenant_id()','g');
  EXECUTE format('ALTER POLICY %I ON %I.%I%s%s',p.policyname,p.schemaname,p.tablename,
   CASE WHEN q IS NULL THEN '' ELSE ' USING ('||q||')' END,
   CASE WHEN c IS NULL THEN '' ELSE ' WITH CHECK ('||c||')' END);
 END LOOP;
END $$;
