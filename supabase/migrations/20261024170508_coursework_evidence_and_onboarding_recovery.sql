-- Forward-only addition. Private evidence is immutable after submission.
CREATE TABLE public.unipathway_coursework_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL REFERENCES auth.users(id), brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id),
 attempt_id uuid REFERENCES public.unipathway_assessment_attempts(id),
 file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 180),
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 byte_size bigint NOT NULL CHECK(byte_size BETWEEN 1 AND 20971520),
 storage_path text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coursework_upload_owner ON public.unipathway_coursework_uploads(student_id,brief_id);
CREATE INDEX coursework_upload_attempt ON public.unipathway_coursework_uploads(attempt_id);
ALTER TABLE public.unipathway_coursework_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_coursework_uploads FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_coursework_uploads TO authenticated;
CREATE FUNCTION public.can_read_unipathway_coursework_file(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_coursework_uploads WHERE storage_path=p_path AND (
 (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())) OR
 (attempt_id IS NOT NULL AND (public.can_mark_uni_attempt(attempt_id) OR public.can_quality_uni_attempt(attempt_id)
 OR public.can_read_uni_appeal_attempt(attempt_id) OR public.can_manage_uni_assessment(brief_id)))
))
$$;
CREATE POLICY "Own drafts or authorised submitted evidence" ON public.unipathway_coursework_uploads FOR SELECT TO authenticated USING(public.can_read_unipathway_coursework_file(storage_path));
ALTER TABLE public.unipathway_assessment_attempts ADD COLUMN submission_request_id uuid;
CREATE UNIQUE INDEX assessment_submission_request ON public.unipathway_assessment_attempts(student_id,submission_request_id) WHERE submission_request_id IS NOT NULL;

CREATE FUNCTION public.reserve_unipathway_coursework_file(p_brief uuid,p_name text,p_mime text,p_size bigint)
RETURNS public.unipathway_coursework_uploads LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.unipathway_assessment_briefs%ROWTYPE; u public.unipathway_coursework_uploads%ROWTYPE; v_id uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_study_uni_assessment(p_brief) THEN RAISE EXCEPTION 'Active enrolled learner required' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=p_brief;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_brief::text,0));
 IF now()>b.submission_cutoff THEN RAISE EXCEPTION 'Submission window closed'; END IF;
 IF (SELECT count(*) FROM public.unipathway_coursework_uploads WHERE student_id=auth.uid() AND brief_id=p_brief AND attempt_id IS NULL)>=5 THEN RAISE EXCEPTION 'Remove a draft file before adding another (maximum five)'; END IF;
 INSERT INTO public.unipathway_coursework_uploads(id,tenant_id,student_id,brief_id,file_name,mime_type,byte_size,storage_path)
 VALUES(v_id,b.tenant_id,auth.uid(),p_brief,regexp_replace(left(btrim(p_name),180),'[[:cntrl:]/\\]','_','g'),p_mime,p_size,b.tenant_id::text||'/'||auth.uid()::text||'/'||v_id::text)
 RETURNING * INTO u; RETURN u;
END $$;
-- Serialize storage mutations with submission: a concurrent deletion must observe attachment finalisation.
CREATE FUNCTION public.can_write_unipathway_coursework_file(p_path text) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE u public.unipathway_coursework_uploads%ROWTYPE;
BEGIN
 SELECT * INTO u FROM public.unipathway_coursework_uploads WHERE storage_path=p_path FOR UPDATE;
 RETURN FOUND AND auth.uid() IS NOT NULL AND u.student_id=auth.uid()
 AND u.tenant_id=public.get_user_tenant_id(auth.uid()) AND u.attempt_id IS NULL;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('unipathway-coursework','unipathway-coursework',false,20971520,ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
CREATE POLICY "Coursework upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='unipathway-coursework' AND public.can_write_unipathway_coursework_file(name));
CREATE POLICY "Coursework download" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='unipathway-coursework' AND public.can_read_unipathway_coursework_file(name));
CREATE POLICY "Coursework draft deletion" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='unipathway-coursework' AND public.can_write_unipathway_coursework_file(name));
-- Older permissive policies must not widen this private bucket.
CREATE POLICY "Coursework read boundary" ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_read_unipathway_coursework_file(name)));
CREATE POLICY "Coursework insert boundary" ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_write_unipathway_coursework_file(name)));
CREATE POLICY "Coursework delete boundary" ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_write_unipathway_coursework_file(name)));
CREATE POLICY "Coursework cannot overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING(bucket_id<>'unipathway-coursework') WITH CHECK(bucket_id<>'unipathway-coursework');
CREATE FUNCTION public.discard_unipathway_coursework_file(p_upload uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u public.unipathway_coursework_uploads%ROWTYPE;
BEGIN
 SELECT * INTO u FROM public.unipathway_coursework_uploads WHERE id=p_upload FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR u.student_id<>auth.uid() OR u.tenant_id<>public.get_user_tenant_id(auth.uid()) OR u.attempt_id IS NOT NULL THEN RAISE EXCEPTION 'Draft owner required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='unipathway-coursework' AND name=u.storage_path) THEN RAISE EXCEPTION 'Remove the stored file before discarding its record'; END IF;
 DELETE FROM public.unipathway_coursework_uploads WHERE id=p_upload;
END $$;
CREATE FUNCTION public.submit_unipathway_coursework(p_brief uuid,p_evidence text,p_uploads uuid[],p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; previous public.unipathway_assessment_attempts%ROWTYPE; n int;
BEGIN
 IF auth.uid() IS NULL OR p_request IS NULL OR NOT public.can_study_uni_assessment(p_brief) THEN RAISE EXCEPTION 'Active enrolled learner required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_brief::text,0));
 SELECT * INTO previous FROM public.unipathway_assessment_attempts WHERE student_id=auth.uid() AND submission_request_id=p_request;
 IF FOUND THEN
  IF previous.brief_id<>p_brief OR previous.evidence_text<>btrim(p_evidence) OR
   (SELECT array_agg(id ORDER BY id) FROM public.unipathway_coursework_uploads WHERE attempt_id=previous.id) IS DISTINCT FROM
   (SELECT array_agg(x ORDER BY x) FROM unnest(p_uploads) x)
  THEN RAISE EXCEPTION 'Request already used for different evidence'; END IF;
  RETURN previous.id;
 END IF;
 n:=coalesce(cardinality(p_uploads),0);
 IF n>5 OR n<>(SELECT count(DISTINCT x) FROM unnest(p_uploads) x) THEN RAISE EXCEPTION 'Select up to five different files'; END IF;
 PERFORM 1 FROM public.unipathway_coursework_uploads WHERE id=ANY(p_uploads) ORDER BY id FOR UPDATE;
 IF n<>(SELECT count(*) FROM public.unipathway_coursework_uploads u JOIN storage.objects o ON o.bucket_id='unipathway-coursework' AND o.name=u.storage_path
 WHERE u.id=ANY(p_uploads) AND u.brief_id=p_brief AND u.student_id=auth.uid() AND u.tenant_id=public.get_user_tenant_id(auth.uid()) AND u.attempt_id IS NULL
 AND (o.metadata->>'size')::bigint=u.byte_size AND o.metadata->>'mimetype'=u.mime_type)
 THEN RAISE EXCEPTION 'Every attachment must finish uploading and belong to this assignment'; END IF;
 v_id:=public.submit_unipathway_assessment(p_brief,p_evidence);
 UPDATE public.unipathway_assessment_attempts SET submission_request_id=p_request WHERE id=v_id;
 UPDATE public.unipathway_coursework_uploads SET attempt_id=v_id WHERE id=ANY(p_uploads);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_unipathway_coursework_file(uuid,text,text,bigint),public.discard_unipathway_coursework_file(uuid),public.submit_unipathway_coursework(uuid,text,uuid[],uuid),public.can_read_unipathway_coursework_file(text),public.can_write_unipathway_coursework_file(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_unipathway_coursework_file(uuid,text,text,bigint),public.discard_unipathway_coursework_file(uuid),public.submit_unipathway_coursework(uuid,text,uuid[],uuid),public.can_read_unipathway_coursework_file(text),public.can_write_unipathway_coursework_file(text) TO authenticated;

-- Durable draft independent of tenant creation. Only platform administrators can read or save it.
CREATE TABLE public.unipathway_onboarding_drafts (
 id uuid PRIMARY KEY, form_data jsonb NOT NULL DEFAULT '{}', documents jsonb NOT NULL DEFAULT '{}',
 step int NOT NULL DEFAULT 1 CHECK(step BETWEEN 1 AND 6), revision int NOT NULL DEFAULT 1,
 tenant_id uuid REFERENCES public.tenants(id), updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL REFERENCES auth.users(id),
 CHECK(jsonb_typeof(form_data)='object' AND octet_length(form_data::text)<20000),
 CHECK(jsonb_typeof(documents)='object' AND octet_length(documents::text)<20000)
);
ALTER TABLE public.unipathway_onboarding_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_onboarding_drafts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_onboarding_drafts TO authenticated;
CREATE POLICY "Platform administrator drafts" ON public.unipathway_onboarding_drafts FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'superadmin'));
CREATE FUNCTION public.save_unipathway_onboarding_draft(p_id uuid,p_form jsonb,p_documents jsonb,p_step int,p_revision int)
RETURNS public.unipathway_onboarding_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.unipathway_onboarding_drafts%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 SELECT * INTO d FROM public.unipathway_onboarding_drafts WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF d.revision<>p_revision THEN RAISE EXCEPTION 'Draft changed in another session. Reload it before saving'; END IF;
  UPDATE public.unipathway_onboarding_drafts SET form_data=p_form,documents=p_documents,step=p_step,revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE id=p_id RETURNING * INTO d;
 ELSE
  IF p_revision<>0 THEN RAISE EXCEPTION 'Draft no longer exists'; END IF;
  INSERT INTO public.unipathway_onboarding_drafts(id,form_data,documents,step,updated_by) VALUES(p_id,p_form,p_documents,p_step,auth.uid()) RETURNING * INTO d;
 END IF;
 RETURN d;
END $$;
CREATE FUNCTION public.create_unipathway_centre_from_draft(p_id uuid,p_revision int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.unipathway_onboarding_drafts%ROWTYPE; f jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.unipathway_onboarding_drafts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR d.revision<>p_revision THEN RAISE EXCEPTION 'Save the latest draft before creating the centre'; END IF;
 f:=d.form_data;
 IF coalesce(length(btrim(f->>'centreName')),0)=0 OR coalesce(f->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$'
 OR coalesce(length(btrim(f->>'city')),0)=0 OR coalesce(length(btrim(f->>'country')),0)=0
 OR coalesce(f->>'plan','') NOT IN ('starter','professional','enterprise') THEN RAISE EXCEPTION 'Complete centre details and plan'; END IF;
 IF d.tenant_id IS NULL THEN
  INSERT INTO public.tenants(id,name,slug,plan,status,primary_color,accent_color,brand_name)
  VALUES(d.id,btrim(f->>'centreName'),f->>'slug',(f->>'plan')::public.tenant_plan,'onboarding',f->>'primaryColor',f->>'accentColor',coalesce(nullif(f->>'brandName',''),f->>'centreName'));
  UPDATE public.unipathway_onboarding_drafts SET tenant_id=d.id WHERE id=d.id;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=d.tenant_id AND status='onboarding') THEN RAISE EXCEPTION 'Active centre must be edited in centre settings'; END IF;
  UPDATE public.tenants SET name=btrim(f->>'centreName'),slug=f->>'slug',plan=(f->>'plan')::public.tenant_plan,primary_color=f->>'primaryColor',accent_color=f->>'accentColor',brand_name=coalesce(nullif(f->>'brandName',''),f->>'centreName') WHERE id=d.tenant_id;
 END IF;
 INSERT INTO public.unipathway_centre_onboarding(tenant_id,country,city,company_registration,documents)
 VALUES(d.id,btrim(f->>'country'),btrim(f->>'city'),coalesce(f->>'companyReg',''),d.documents)
 ON CONFLICT(tenant_id) DO UPDATE SET country=excluded.country,city=excluded.city,company_registration=excluded.company_registration,documents=excluded.documents,updated_at=now();
 RETURN d.id;
END $$;
REVOKE ALL ON FUNCTION public.save_unipathway_onboarding_draft(uuid,jsonb,jsonb,int,int),public.create_unipathway_centre_from_draft(uuid,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_unipathway_onboarding_draft(uuid,jsonb,jsonb,int,int),public.create_unipathway_centre_from_draft(uuid,int) TO authenticated;

-- Recover centres created before durable drafts existed, without creating another tenant.
CREATE FUNCTION public.list_unipathway_incomplete_centres() RETURNS TABLE(id uuid,name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT t.id,t.name FROM public.tenants t WHERE t.status='onboarding' ORDER BY t.name LIMIT 100;
END $$;
CREATE FUNCTION public.resume_unipathway_centre_setup(p_tenant uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.tenants%ROWTYPE; o public.unipathway_centre_onboarding%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'superadmin') THEN RAISE EXCEPTION 'Platform administrator required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant::text,1));
 IF EXISTS(SELECT 1 FROM public.unipathway_onboarding_drafts WHERE id=p_tenant) THEN RETURN p_tenant; END IF;
 SELECT * INTO t FROM public.tenants WHERE id=p_tenant AND status='onboarding' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Incomplete centre required'; END IF;
 SELECT * INTO o FROM public.unipathway_centre_onboarding WHERE tenant_id=p_tenant;
 INSERT INTO public.unipathway_onboarding_drafts(id,tenant_id,updated_by,step,form_data,documents)
 VALUES(t.id,t.id,auth.uid(),1,jsonb_build_object('centreName',t.name,'slug',t.slug,'plan',t.plan,'brandName',coalesce(t.brand_name,t.name),
 'primaryColor',coalesce(t.primary_color,'#b91c1c'),'accentColor',coalesce(t.accent_color,'#D4A853'),
 'country',coalesce(o.country,''),'city',coalesce(o.city,''),'companyReg',coalesce(o.company_registration,''),'adminName','','adminEmail',''),coalesce(o.documents,'{}'::jsonb));
 RETURN t.id;
END $$;
REVOKE ALL ON FUNCTION public.list_unipathway_incomplete_centres(),public.resume_unipathway_centre_setup(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_unipathway_incomplete_centres(),public.resume_unipathway_centre_setup(uuid) TO authenticated;
