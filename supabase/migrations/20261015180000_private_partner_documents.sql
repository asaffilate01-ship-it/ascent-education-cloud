-- Immutable private agreement files; never use the public resources bucket.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('partner-agreements','partner-agreements',false,10485760,ARRAY['application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf'];
CREATE TABLE public.international_partner_documents(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.tenants(id),partner_id uuid NOT NULL,
 storage_path text NOT NULL UNIQUE,original_name text NOT NULL CHECK(length(original_name) BETWEEN 1 AND 200),
 uploaded_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,tenant_id,partner_id),
 FOREIGN KEY(partner_id,tenant_id) REFERENCES public.international_education_partners(id,tenant_id)
);
ALTER TABLE public.international_partner_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner document staff read" ON public.international_partner_documents FOR SELECT TO authenticated
USING(public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'finance_officer'::app_role)));

CREATE FUNCTION public.can_access_partner_file(p_name text,p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.international_education_partners p
 WHERE p.tenant_id::text=split_part(p_name,'/',1) AND p.id::text=split_part(p_name,'/',2)
 AND p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
 AND public.same_tenant(p.tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR (NOT p_write AND public.has_role(auth.uid(),'finance_officer'::app_role))))
$$;
REVOKE ALL ON FUNCTION public.can_access_partner_file(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_partner_file(text,boolean) TO authenticated;
CREATE POLICY "partner file insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='partner-agreements' AND public.can_access_partner_file(name,true));
CREATE POLICY "partner file read" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='partner-agreements' AND public.can_access_partner_file(name,false));
-- Guard against any unrelated permissive policy that might be added later.
CREATE POLICY "partner file boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING(bucket_id<>'partner-agreements' OR public.can_access_partner_file(name,false))
WITH CHECK(bucket_id<>'partner-agreements' OR public.can_access_partner_file(name,true));
CREATE POLICY "partner files immutable update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING(bucket_id<>'partner-agreements') WITH CHECK(bucket_id<>'partner-agreements');
CREATE POLICY "partner files immutable delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING(bucket_id<>'partner-agreements');

CREATE FUNCTION public.register_partner_document(p_partner uuid,p_path text,p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t uuid; result uuid;
BEGIN
 SELECT tenant_id INTO t FROM public.international_education_partners WHERE id=p_partner;
 IF t IS NULL OR NOT public.can_access_partner_file(p_path,true)
 OR split_part(p_path,'/',2)<>p_partner::text OR split_part(p_path,'/',1)<>t::text THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='partner-agreements' AND name=p_path) THEN RAISE EXCEPTION 'Upload the PDF before registering it'; END IF;
 INSERT INTO public.international_partner_documents(tenant_id,partner_id,storage_path,original_name,uploaded_by)
 VALUES(t,p_partner,p_path,left(btrim(p_name),200),auth.uid()) ON CONFLICT(storage_path) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM public.international_partner_documents WHERE storage_path=p_path AND tenant_id=t AND partner_id=p_partner; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.register_partner_document(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_partner_document(uuid,text,text) TO authenticated;
ALTER TABLE public.international_partner_agreements ADD COLUMN document_id uuid,
 ADD CONSTRAINT agreement_document_tenant FOREIGN KEY(document_id,tenant_id,partner_id)
 REFERENCES public.international_partner_documents(id,tenant_id,partner_id);
CREATE FUNCTION public.guard_agreement_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE path text;
BEGIN
 IF NEW.document_id IS NOT NULL THEN
 SELECT storage_path INTO path FROM public.international_partner_documents WHERE id=NEW.document_id AND tenant_id=NEW.tenant_id AND partner_id=NEW.partner_id;
 IF path IS NULL OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='partner-agreements' AND name=path) THEN RAISE EXCEPTION 'Private agreement document unavailable'; END IF;
 NEW.document_reference:='partner-agreements/'||path;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_agreement_document BEFORE INSERT OR UPDATE ON public.international_partner_agreements
FOR EACH ROW EXECUTE FUNCTION public.guard_agreement_document();

-- Losing a managed evidence file must also revoke its use as publication evidence.
CREATE OR REPLACE FUNCTION public.global_partner_authorised(p_partner uuid,p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.same_tenant(p_tenant) AND EXISTS (
 SELECT 1 FROM public.international_education_partners p
 JOIN public.international_partner_agreements a ON a.partner_id=p.id AND a.tenant_id=p.tenant_id
 WHERE p.id=p_partner AND p.tenant_id=p_tenant AND p.relationship_status IN ('contracted','active')
 AND a.status='signed' AND length(btrim(a.document_reference))>0 AND a.starts_on<=current_date
 AND (a.ends_on IS NULL OR a.ends_on>=current_date)
 AND (a.document_id IS NULL OR EXISTS(SELECT 1 FROM public.international_partner_documents d JOIN storage.objects o
 ON o.name=d.storage_path AND o.bucket_id='partner-agreements'
 WHERE d.id=a.document_id AND d.tenant_id=a.tenant_id AND d.partner_id=a.partner_id)))
$$;
