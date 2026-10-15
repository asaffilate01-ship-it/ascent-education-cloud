-- Deliver domain events to local intelligence transactionally; remote delivery remains separate.
ALTER TABLE public.omniqora_event_outbox ADD COLUMN processed_at timestamptz;
ALTER TABLE public.omniqora_education_events ADD COLUMN outbox_id uuid UNIQUE REFERENCES public.omniqora_event_outbox(id);
CREATE OR REPLACE FUNCTION public.process_local_education_events(p_tenant uuid,p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item record; processed integer:=0;
BEGIN
 IF NOT public.same_tenant(p_tenant) OR NOT (public.has_role(auth.uid(),'superadmin'::app_role)
 OR public.has_role(auth.uid(),'centre_director'::app_role)) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 FOR item IN SELECT * FROM public.omniqora_event_outbox WHERE tenant_id=p_tenant AND processed_at IS NULL
 ORDER BY created_at LIMIT greatest(1,least(coalesce(p_limit,100),250)) FOR UPDATE SKIP LOCKED LOOP
 INSERT INTO public.omniqora_education_events(tenant_id,student_id,event_type,entity_type,entity_id,payload,correlation_id,outbox_id)
 VALUES(item.tenant_id,item.student_id,item.event_type,item.entity_type,item.source_id,item.payload,item.id,item.id)
 ON CONFLICT(outbox_id) DO NOTHING;
 UPDATE public.omniqora_event_outbox SET processed_at=now() WHERE id=item.id;
 processed:=processed+1;
 END LOOP;
 RETURN processed;
END $$;
REVOKE ALL ON FUNCTION public.process_local_education_events(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_local_education_events(uuid,integer) TO authenticated;
-- Metadata search is useful without sending student data to an unconfigured model.
CREATE INDEX omniqora_knowledge_search ON public.omniqora_knowledge_documents
 USING gin(to_tsvector('english',coalesce(title,'')||' '||coalesce(qualification_route,'')));
CREATE FUNCTION public.search_education_knowledge(p_query text,p_course uuid DEFAULT NULL,p_module uuid DEFAULT NULL)
RETURNS TABLE(id uuid,title text,source_type text,course_id uuid,module_id uuid,visibility text,version text,content_reference text,rank real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
 SELECT d.id,d.title,d.source_type,d.course_id,d.module_id,d.visibility,d.version,d.content_reference,
 ts_rank(to_tsvector('english',coalesce(d.title,'')||' '||coalesce(d.qualification_route,'')),websearch_to_tsquery('english',left(p_query,1000)))
 FROM public.omniqora_knowledge_documents d
 WHERE d.approval_status='approved' AND (p_course IS NULL OR d.course_id=p_course) AND (p_module IS NULL OR d.module_id=p_module)
 AND to_tsvector('english',coalesce(d.title,'')||' '||coalesce(d.qualification_route,'')) @@ websearch_to_tsquery('english',left(p_query,1000))
 ORDER BY 9 DESC,d.id LIMIT 30
$$;
REVOKE ALL ON FUNCTION public.search_education_knowledge(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_education_knowledge(text,uuid,uuid) TO authenticated;
-- Only authoritative DB workflow hooks should create educational evidence.
-- The HTTP event endpoint intentionally remains non-writable to ordinary authenticated users.
