-- Protected course resources independent of the external classroom provider.
DO $activation$ BEGIN
IF to_regclass('public.unipathway_module_materials') IS NULL THEN EXECUTE $install$
CREATE TABLE IF NOT EXISTS public.unipathway_module_materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 title text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('slide','worksheet','reading','homework','video','whiteboard')),
 object_path text NOT NULL,
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','withdrawn')),
 available_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,object_path)
);
ALTER TABLE public.unipathway_module_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published materials enrolled student or teacher" ON public.unipathway_module_materials FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_module(module_id)
  OR (publication_status='published' AND (available_at IS NULL OR available_at<=now())
   AND public.can_view_unipathway_module(module_id)));
CREATE POLICY "assigned module teacher upload metadata" ON public.unipathway_module_materials FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_module(module_id)
 AND tenant_id=(SELECT m.tenant_id FROM public.modules m WHERE m.id=module_id) AND created_by=auth.uid()
 AND publication_status='draft');
CREATE POLICY "module management publish metadata" ON public.unipathway_module_materials FOR UPDATE TO authenticated
 USING(public.can_manage_unipathway_module(module_id))
 WITH CHECK(public.can_manage_unipathway_module(module_id));

-- Private storage: server ingests Teams recordings; no browser recording uploads allowed.
CREATE OR REPLACE FUNCTION public.can_upload_unipathway_module_asset(p_path text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.modules m
  WHERE p_path LIKE m.tenant_id::text||'/'||m.id::text||'/%'
    AND m.tenant_id=public.get_user_tenant_id(auth.uid())
    AND public.can_manage_unipathway_module(m.id)
 )
 $$;
CREATE POLICY "assigned module teacher upload private asset" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='unipathway-module-materials' AND public.can_upload_unipathway_module_asset(name));
CREATE POLICY "assigned module teacher remove unregistered asset" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='unipathway-module-materials' AND public.can_upload_unipathway_module_asset(name));


REVOKE ALL ON public.unipathway_module_materials FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_module_materials TO authenticated;
REVOKE ALL ON FUNCTION public.can_upload_unipathway_module_asset(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_upload_unipathway_module_asset(text) TO authenticated;
INSERT INTO storage.buckets(id,name,public) VALUES('unipathway-module-materials','unipathway-module-materials',false) ON CONFLICT(id) DO UPDATE SET public=false;
CREATE FUNCTION public.can_read_unipathway_module_asset(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.unipathway_module_materials a JOIN public.modules m ON m.id=a.module_id AND m.tenant_id=a.tenant_id WHERE a.object_path=p_path AND p_path LIKE a.tenant_id::text||'/'||a.module_id::text||'/%' AND (public.can_manage_unipathway_module(a.module_id) OR (a.publication_status='published' AND (a.available_at IS NULL OR a.available_at<=now()) AND public.can_view_unipathway_module(a.module_id))))
$$;
REVOKE ALL ON FUNCTION public.can_read_unipathway_module_asset(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_unipathway_module_asset(text) TO authenticated;
CREATE POLICY "private module material download" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='unipathway-module-materials' AND public.can_read_unipathway_module_asset(name));
CREATE POLICY "module resource read boundary" ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING(bucket_id<>'unipathway-module-materials' OR public.can_read_unipathway_module_asset(name));
CREATE POLICY "module resource insert boundary" ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK(bucket_id<>'unipathway-module-materials' OR public.can_upload_unipathway_module_asset(name));
CREATE POLICY "module resource no overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING(bucket_id<>'unipathway-module-materials') WITH CHECK(bucket_id<>'unipathway-module-materials');
CREATE POLICY "module resource registered deletion blocked" ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING(bucket_id<>'unipathway-module-materials' OR (public.can_upload_unipathway_module_asset(name) AND NOT EXISTS(SELECT 1 FROM public.unipathway_module_materials m WHERE m.object_path=name)));
CREATE FUNCTION unipathway_acl.guard_module_material() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=NEW.module_id AND m.tenant_id=NEW.tenant_id) OR NEW.object_path NOT LIKE NEW.tenant_id::text||'/'||NEW.module_id::text||'/%' THEN RAISE EXCEPTION 'Assigned module path required'; END IF;
 IF TG_OP='UPDATE' AND (NEW.tenant_id,NEW.module_id,NEW.created_by,NEW.object_path) IS DISTINCT FROM (OLD.tenant_id,OLD.module_id,OLD.created_by,OLD.object_path) THEN RAISE EXCEPTION 'Resource identity is immutable; upload a new resource'; END IF;
 IF NEW.publication_status='published' AND NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='unipathway-module-materials' AND o.name=NEW.object_path) THEN RAISE EXCEPTION 'Finish uploading before publishing'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.guard_module_material() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_module_material BEFORE INSERT OR UPDATE ON public.unipathway_module_materials FOR EACH ROW EXECUTE FUNCTION unipathway_acl.guard_module_material();
$install$; END IF;
END $activation$;
