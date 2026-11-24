-- Forward-only KYC hardening. Run inside a reviewed transaction after backup and role acceptance.
-- Keep this separate from hosted activation: no live schema is changed by merging source.
CREATE SCHEMA IF NOT EXISTS unipathway_acl;
REVOKE ALL ON SCHEMA unipathway_acl FROM PUBLIC;
GRANT USAGE ON SCHEMA unipathway_acl TO authenticated;

-- Verify the profile centre AND the assigned role. The owner role is global only.
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_role(t uuid, allowed text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND t IS NOT NULL AND t=public.get_user_tenant_id(auth.uid())
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid()
   AND r.role::text=ANY(allowed) AND
   ((r.role::text='superadmin' AND r.tenant_id IS NULL) OR (r.role::text<>'superadmin' AND r.tenant_id=t)))
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_owner(t uuid,u uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u=auth.uid() AND unipathway_acl.kyc_role(t,ARRAY['student','lecturer','admissions_admin','centre_director','superadmin'])
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_reviewer(t uuid,u uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u IS NOT NULL AND u<>auth.uid() AND unipathway_acl.kyc_role(t,ARRAY['admissions_admin','centre_director'])
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_path_owner(p text,u uuid) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(length(p) BETWEEN 38 AND 300 AND split_part(p,'/',1)=u::text
 AND length(p)-length(replace(p,'/',''))=1 AND split_part(p,'/',2) NOT IN ('','.','..')
 AND p !~ '[[:cntrl:]]' AND position(chr(92) in p)=0,false)
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_can_upload(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT unipathway_acl.kyc_owner(public.get_user_tenant_id(auth.uid()),auth.uid())
 AND unipathway_acl.kyc_path_owner(p,auth.uid())
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_can_link(p text,t uuid,u uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT unipathway_acl.kyc_owner(t,u) AND unipathway_acl.kyc_path_owner(p,u)
 AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='kyc-documents' AND o.name=p)
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.kyc_can_read_object(p text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.kyc_documents d WHERE d.file_url=p
 AND unipathway_acl.kyc_path_owner(p,d.user_id)
 AND (unipathway_acl.kyc_owner(d.tenant_id,d.user_id) OR
 unipathway_acl.kyc_role(d.tenant_id,ARRAY['admissions_admin','centre_director','superadmin'])))
$$;
REVOKE ALL ON FUNCTION unipathway_acl.kyc_role(uuid,text[]),unipathway_acl.kyc_owner(uuid,uuid),unipathway_acl.kyc_reviewer(uuid,uuid),unipathway_acl.kyc_path_owner(text,uuid),unipathway_acl.kyc_can_upload(text),unipathway_acl.kyc_can_link(text,uuid,uuid),unipathway_acl.kyc_can_read_object(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_acl.kyc_role(uuid,text[]),unipathway_acl.kyc_owner(uuid,uuid),unipathway_acl.kyc_reviewer(uuid,uuid),unipathway_acl.kyc_path_owner(text,uuid),unipathway_acl.kyc_can_upload(text),unipathway_acl.kyc_can_link(text,uuid,uuid),unipathway_acl.kyc_can_read_object(text) TO authenticated;

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
-- Bounded replacement of legacy policies on this one table; do not alter other tables.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='kyc_documents' LOOP
  EXECUTE format('DROP POLICY %I ON public.kyc_documents',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.kyc_documents FROM PUBLIC,anon,authenticated;
-- Column grants prevent changing identity, centre, object path, document type and approval history.
GRANT SELECT ON public.kyc_documents TO authenticated;
GRANT INSERT(id,user_id,tenant_id,document_type,file_url,file_name,status) ON public.kyc_documents TO authenticated;
GRANT UPDATE(status,verified_by,verified_at,rejection_reason,expiry_date,updated_at) ON public.kyc_documents TO authenticated;
CREATE POLICY "kyc centre read" ON public.kyc_documents FOR SELECT TO authenticated USING(
 unipathway_acl.kyc_owner(tenant_id,user_id) OR unipathway_acl.kyc_role(tenant_id,ARRAY['admissions_admin','centre_director','superadmin']));
CREATE POLICY "kyc pending evidence only" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK(
 status='pending' AND verified_by IS NULL AND verified_at IS NULL AND rejection_reason IS NULL AND expiry_date IS NULL
 AND coalesce(metadata,'{}'::jsonb)='{}'::jsonb
 AND length(btrim(document_type)) BETWEEN 1 AND 100
 AND length(btrim(coalesce(file_name,''))) BETWEEN 1 AND 255
 AND unipathway_acl.kyc_can_link(file_url,tenant_id,user_id));
CREATE POLICY "kyc independent review" ON public.kyc_documents FOR UPDATE TO authenticated
 USING(unipathway_acl.kyc_reviewer(tenant_id,user_id))
 WITH CHECK(unipathway_acl.kyc_reviewer(tenant_id,user_id)
 AND status IN ('pending','uploaded','verified','rejected','expired')
 AND (status<>'verified' OR (verified_by=auth.uid() AND verified_at IS NOT NULL AND verified_at<=now())));

-- Storage: reject the old global staff read. Require a matching centre-linked metadata row.
-- Existing policies on other buckets stay intact; restrictive boundaries also defeat broad OR grants.
DROP POLICY IF EXISTS "Staff view tenant KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Users view own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "kyc linked object read" ON storage.objects;
DROP POLICY IF EXISTS "kyc owned object upload" ON storage.objects;
DROP POLICY IF EXISTS "kyc read boundary" ON storage.objects;
DROP POLICY IF EXISTS "kyc insert boundary" ON storage.objects;
DROP POLICY IF EXISTS "kyc no client overwrite" ON storage.objects;
DROP POLICY IF EXISTS "kyc no client deletion" ON storage.objects;
DROP POLICY IF EXISTS "kyc anonymous read boundary" ON storage.objects;
DROP POLICY IF EXISTS "kyc anonymous insert boundary" ON storage.objects;
DROP POLICY IF EXISTS "kyc anonymous update boundary" ON storage.objects;
DROP POLICY IF EXISTS "kyc anonymous delete boundary" ON storage.objects;
CREATE POLICY "kyc linked object read" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='kyc-documents' AND unipathway_acl.kyc_can_read_object(name));
CREATE POLICY "kyc owned object upload" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='kyc-documents' AND unipathway_acl.kyc_can_upload(name));
CREATE POLICY "kyc read boundary" ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(bucket_id<>'kyc-documents' OR unipathway_acl.kyc_can_read_object(name));
CREATE POLICY "kyc insert boundary" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(bucket_id<>'kyc-documents' OR unipathway_acl.kyc_can_upload(name));
CREATE POLICY "kyc no client overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'kyc-documents') WITH CHECK(bucket_id<>'kyc-documents');
CREATE POLICY "kyc no client deletion" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING(bucket_id<>'kyc-documents');
CREATE POLICY "kyc anonymous read boundary" ON storage.objects AS RESTRICTIVE FOR SELECT TO anon
 USING(bucket_id<>'kyc-documents');
CREATE POLICY "kyc anonymous insert boundary" ON storage.objects AS RESTRICTIVE FOR INSERT TO anon
 WITH CHECK(bucket_id<>'kyc-documents');
CREATE POLICY "kyc anonymous update boundary" ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon
 USING(bucket_id<>'kyc-documents') WITH CHECK(bucket_id<>'kyc-documents');
CREATE POLICY "kyc anonymous delete boundary" ON storage.objects AS RESTRICTIVE FOR DELETE TO anon
 USING(bucket_id<>'kyc-documents');
UPDATE storage.buckets SET public=false,file_size_limit=20971520 WHERE id='kyc-documents';
