-- Reviewed text corpus with deterministic indexing; no external model or embedding provider.
ALTER TABLE public.omniqora_knowledge_documents ADD COLUMN source_text text,
 ADD COLUMN content_revision integer NOT NULL DEFAULT 0,
 ADD COLUMN created_by uuid,ADD COLUMN reviewed_by uuid,ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD CONSTRAINT knowledge_document_tenant UNIQUE(id,tenant_id),
 ADD CONSTRAINT knowledge_text_size CHECK(source_text IS NULL OR length(source_text)<=200000);
CREATE TABLE public.omniqora_knowledge_chunks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,document_id uuid NOT NULL,
 revision integer NOT NULL,chunk_index integer NOT NULL,body text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,revision,chunk_index),
 FOREIGN KEY(document_id,tenant_id) REFERENCES public.omniqora_knowledge_documents(id,tenant_id) ON DELETE CASCADE
);
CREATE INDEX knowledge_chunk_search ON public.omniqora_knowledge_chunks USING gin(to_tsvector('english',body));
ALTER TABLE public.omniqora_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.can_manage_education_knowledge(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(public.same_tenant(p_tenant) AND (public.has_role(auth.uid(),'superadmin'::app_role)
 OR public.has_role(auth.uid(),'centre_director'::app_role) OR public.has_role(auth.uid(),'programme_leader'::app_role)),false)
$$;
REVOKE ALL ON FUNCTION public.can_manage_education_knowledge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_education_knowledge(uuid) TO authenticated;
CREATE POLICY "knowledge editor read" ON public.omniqora_knowledge_documents FOR SELECT TO authenticated
 USING(public.can_manage_education_knowledge(tenant_id));
CREATE POLICY "knowledge approved chunk read" ON public.omniqora_knowledge_chunks FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND EXISTS(SELECT 1 FROM public.omniqora_knowledge_documents d
 WHERE d.id=document_id AND d.tenant_id=omniqora_knowledge_chunks.tenant_id AND d.approval_status='approved'
 AND d.content_revision=revision));

CREATE FUNCTION public.save_education_knowledge(p_tenant uuid,p_title text,p_text text,p_visibility text,p_reference text,
 p_document uuid DEFAULT NULL,p_expected_revision integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.omniqora_knowledge_documents; result uuid;
BEGIN
 IF NOT public.can_manage_education_knowledge(p_tenant) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 3 AND 200 OR p_text IS NULL OR length(btrim(p_text)) NOT BETWEEN 20 AND 200000
 OR p_visibility IS NULL OR p_visibility NOT IN ('student','staff') OR p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid document fields'; END IF;
 IF p_document IS NULL THEN
 INSERT INTO public.omniqora_knowledge_documents(tenant_id,source_type,title,visibility,content_reference,source_text,content_revision,version,approval_status,created_by)
 VALUES(p_tenant,'reviewed_text',btrim(p_title),p_visibility,btrim(p_reference),btrim(p_text),1,'1','draft',auth.uid()) RETURNING id INTO result;
 ELSE
 SELECT * INTO d FROM public.omniqora_knowledge_documents WHERE id=p_document AND tenant_id=p_tenant FOR UPDATE;
 IF d.id IS NULL OR d.source_type<>'reviewed_text' THEN RAISE EXCEPTION 'Document unavailable'; END IF;
 IF p_expected_revision IS DISTINCT FROM d.content_revision THEN RAISE EXCEPTION 'Document changed; reload before saving' USING ERRCODE='40001'; END IF;
 UPDATE public.omniqora_knowledge_documents SET title=btrim(p_title),visibility=p_visibility,content_reference=btrim(p_reference),source_text=btrim(p_text),
 content_revision=content_revision+1,version=(content_revision+1)::text,approval_status='draft',reviewed_by=NULL,reviewed_at=NULL,indexed_at=NULL,updated_at=now()
 WHERE id=d.id;
 DELETE FROM public.omniqora_knowledge_chunks WHERE document_id=d.id;
 result:=d.id;
 END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.review_education_knowledge(p_document uuid,p_expected_revision integer,p_decision text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.omniqora_knowledge_documents; count_chunks integer:=0;
BEGIN
 SELECT * INTO d FROM public.omniqora_knowledge_documents WHERE id=p_document FOR UPDATE;
 IF d.id IS NULL OR NOT public.can_manage_education_knowledge(d.tenant_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_expected_revision IS DISTINCT FROM d.content_revision THEN RAISE EXCEPTION 'Document changed; reload before review' USING ERRCODE='40001'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','withdrawn') OR d.source_type<>'reviewed_text' THEN RAISE EXCEPTION 'Invalid review decision'; END IF;
 DELETE FROM public.omniqora_knowledge_chunks WHERE document_id=d.id;
 IF p_decision='approved' THEN
 IF coalesce(length(btrim(d.source_text)),0)<20 THEN RAISE EXCEPTION 'Document text is required'; END IF;
 -- Fixed bounded overlapping chunks preserve exact source text and stable paragraph references.
 INSERT INTO public.omniqora_knowledge_chunks(tenant_id,document_id,revision,chunk_index,body)
 SELECT d.tenant_id,d.id,d.content_revision,n,substring(d.source_text FROM n*1600+1 FOR 1800)
 FROM generate_series(0,(length(d.source_text)-1)/1600) n;
 GET DIAGNOSTICS count_chunks=ROW_COUNT;
 END IF;
 UPDATE public.omniqora_knowledge_documents SET approval_status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),
 indexed_at=CASE WHEN p_decision='approved' THEN now() ELSE NULL END,updated_at=now() WHERE id=d.id;
 RETURN count_chunks;
END $$;
CREATE FUNCTION public.search_education_chunks(p_query text,p_limit integer DEFAULT 10)
RETURNS TABLE(document_id uuid,chunk_index integer,revision integer,title text,excerpt text,source_reference text,rank real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT c.document_id,c.chunk_index,c.revision,d.title,c.body,d.content_reference,
 ts_rank(to_tsvector('english',c.body),websearch_to_tsquery('english',left(p_query,1000)))
 FROM public.omniqora_knowledge_chunks c JOIN public.omniqora_knowledge_documents d ON d.id=c.document_id AND d.tenant_id=c.tenant_id
 WHERE length(btrim(p_query)) BETWEEN 1 AND 1000 AND d.approval_status='approved' AND d.content_revision=c.revision
 AND to_tsvector('english',c.body) @@ websearch_to_tsquery('english',left(p_query,1000))
 ORDER BY 7 DESC,c.document_id,c.chunk_index LIMIT greatest(1,least(coalesce(p_limit,10),20))
$$;
REVOKE ALL ON FUNCTION public.save_education_knowledge(uuid,text,text,text,text,uuid,integer),public.review_education_knowledge(uuid,integer,text),public.search_education_chunks(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_education_knowledge(uuid,text,text,text,text,uuid,integer),public.review_education_knowledge(uuid,integer,text),public.search_education_chunks(text,integer) TO authenticated;
CREATE TABLE public.omniqora_knowledge_reviews(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,document_id uuid NOT NULL,revision integer NOT NULL,
 decision text NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.omniqora_knowledge_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge review staff read" ON public.omniqora_knowledge_reviews FOR SELECT TO authenticated USING(public.can_manage_education_knowledge(tenant_id));
CREATE FUNCTION public.audit_education_knowledge() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.omniqora_knowledge_reviews(tenant_id,document_id,revision,decision,actor_id)
 VALUES(NEW.tenant_id,NEW.id,NEW.content_revision,NEW.approval_status,auth.uid());RETURN NEW;
END $$;
CREATE TRIGGER audit_education_knowledge AFTER INSERT OR UPDATE ON public.omniqora_knowledge_documents
 FOR EACH ROW WHEN(NEW.source_type='reviewed_text') EXECUTE FUNCTION public.audit_education_knowledge();
