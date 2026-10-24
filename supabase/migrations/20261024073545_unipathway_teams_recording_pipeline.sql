-- Transfer jobs are requested by class managers and processed only by a server worker.
CREATE TABLE public.unipathway_recording_jobs (
 session_id uuid PRIMARY KEY REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','complete','failed')),
 requested_by uuid REFERENCES auth.users(id), requested_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0, lease_id uuid, lease_until timestamptz,
 finished_at timestamptz, result_count integer NOT NULL DEFAULT 0, error_code text
);
ALTER TABLE public.unipathway_recording_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class manager reads transfer status" ON public.unipathway_recording_jobs
 FOR SELECT TO authenticated USING(public.can_manage_unipathway_class(session_id));
GRANT SELECT ON public.unipathway_recording_jobs TO authenticated;
GRANT ALL ON public.unipathway_recording_jobs TO service_role;

CREATE TABLE public.unipathway_recording_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artifact_id uuid NOT NULL REFERENCES public.live_class_artifacts(id),
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id), reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 previous_status text NOT NULL, new_status text NOT NULL, reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_recording_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class manager reads recording review history" ON public.unipathway_recording_reviews
 FOR SELECT TO authenticated USING(public.can_manage_unipathway_class(session_id));
GRANT SELECT ON public.unipathway_recording_reviews TO authenticated;
GRANT ALL ON public.unipathway_recording_reviews TO service_role;

CREATE FUNCTION public.request_unipathway_recordings(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.live_class_sessions;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_unipathway_class(p_session) THEN RAISE EXCEPTION 'Class manager required'; END IF;
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_session FOR SHARE;
 IF s.provider<>'microsoft_teams' OR s.ends_at>now() OR s.status IN ('cancelled','deleted') OR s.join_url IS NULL THEN
 RAISE EXCEPTION 'An ended Teams class with a meeting link is required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.microsoft_education_accounts a WHERE a.tenant_id=s.tenant_id AND a.user_id=s.organiser_user_id AND a.entra_object_id IS NOT NULL AND a.disabled_at IS NULL) THEN
 RAISE EXCEPTION 'Connect the organiser Microsoft account first'; END IF;
 INSERT INTO public.unipathway_recording_jobs(session_id,requested_by) VALUES(p_session,auth.uid())
 ON CONFLICT(session_id) DO UPDATE SET status='queued',requested_by=auth.uid(),requested_at=now(),error_code=NULL,finished_at=NULL
 WHERE (unipathway_recording_jobs.status<>'processing' OR unipathway_recording_jobs.lease_until<now())
 AND unipathway_recording_jobs.requested_at<now()-interval '5 minutes';
END $$;
REVOKE ALL ON FUNCTION public.request_unipathway_recordings(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_unipathway_recordings(uuid) TO authenticated;

-- Atomic, tenant-bound claim. No browser can call this service-only function.
CREATE FUNCTION public.claim_unipathway_recording_job(p_tenant uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.unipathway_recording_jobs; result jsonb;
BEGIN
 SELECT q.* INTO j FROM public.unipathway_recording_jobs q JOIN public.live_class_sessions s ON s.id=q.session_id
 WHERE s.tenant_id=p_tenant AND (q.status='queued' OR (q.status='failed' AND q.attempts<8 AND q.finished_at<now()-interval '15 minutes') OR (q.status='processing' AND q.lease_until<now()))
 ORDER BY q.requested_at FOR UPDATE OF q SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 UPDATE public.unipathway_recording_jobs SET status='processing',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 hours',error_code=NULL
 WHERE session_id=j.session_id RETURNING * INTO j;
 SELECT jsonb_build_object('job',to_jsonb(j),'session',to_jsonb(s),'organiser',a.entra_object_id) INTO result
 FROM public.live_class_sessions s LEFT JOIN public.microsoft_education_accounts a ON a.tenant_id=s.tenant_id AND a.user_id=s.organiser_user_id AND a.disabled_at IS NULL WHERE s.id=j.session_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.claim_unipathway_recording_job(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_unipathway_recording_job(uuid) TO service_role;
GRANT SELECT ON public.live_class_sessions,public.microsoft_education_accounts TO service_role;
GRANT SELECT,INSERT,UPDATE ON public.live_class_artifacts TO service_role;

-- Media can only enter through the worker. Other artifact types keep their existing workflow.
DROP POLICY "class artifacts lecturer create" ON public.live_class_artifacts;
CREATE POLICY "class artifacts lecturer create" ON public.live_class_artifacts FOR INSERT TO authenticated
 WITH CHECK(artifact_type NOT IN ('recording','transcript') AND public.can_manage_unipathway_class(session_id)
 AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id) AND publication_status='draft');
DROP POLICY "class artifacts admin approve" ON public.live_class_artifacts;
CREATE POLICY "class artifacts admin approve" ON public.live_class_artifacts FOR UPDATE TO authenticated
 USING(artifact_type NOT IN ('recording','transcript') AND public.same_tenant(tenant_id) AND
 (public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(artifact_type NOT IN ('recording','transcript') AND public.same_tenant(tenant_id));

CREATE FUNCTION public.review_unipathway_recording(p_artifact uuid,p_expected text,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.live_class_artifacts;
BEGIN
 SELECT * INTO a FROM public.live_class_artifacts WHERE id=p_artifact FOR UPDATE;
 IF auth.uid() IS NULL OR a.id IS NULL OR NOT public.can_manage_unipathway_class(a.session_id) THEN RAISE EXCEPTION 'Class manager required'; END IF;
 IF a.artifact_type NOT IN ('recording','transcript') OR a.publication_status IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Recording changed; refresh before reviewing'; END IF;
 IF p_status IS NULL OR NOT ((p_status='approved' AND p_expected IN ('draft','withdrawn')) OR (p_status='published' AND p_expected='approved') OR (p_status='withdrawn' AND p_expected IN ('approved','published'))) THEN RAISE EXCEPTION 'Invalid review transition'; END IF;
 IF p_status<>'withdrawn' AND (a.metadata->>'ingestion_status' IS DISTINCT FROM 'verified' OR NOT EXISTS(
 SELECT 1 FROM storage.objects o JOIN public.live_class_sessions s ON s.id=a.session_id
 WHERE o.bucket_id='unipathway-class-media' AND o.name=a.storage_reference
 AND a.tenant_id=s.tenant_id AND o.name LIKE s.tenant_id::text||'/'||s.id::text||'/%')) THEN RAISE EXCEPTION 'Verified private media is required'; END IF;
 UPDATE public.live_class_artifacts SET publication_status=p_status,available_at=CASE WHEN p_status='published' THEN now() ELSE NULL END WHERE id=a.id;
 INSERT INTO public.unipathway_recording_reviews(artifact_id,session_id,reviewer_id,previous_status,new_status) VALUES(a.id,a.session_id,auth.uid(),p_expected,p_status);
END $$;
REVOKE ALL ON FUNCTION public.review_unipathway_recording(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_unipathway_recording(uuid,text,text) TO authenticated;

-- Minimal organiser directory: no Entra IDs or licence details exposed to lecturers.
CREATE FUNCTION public.unipathway_module_organisers(p_module uuid)
RETURNS TABLE(user_id uuid,display_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules;
BEGIN
 SELECT * INTO m FROM public.modules WHERE id=p_module;
 IF auth.uid() IS NULL OR m.id IS NULL OR NOT (
  public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (m.tenant_id=public.get_user_tenant_id(auth.uid()) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR (public.has_role(auth.uid(),'lecturer'::public.app_role) AND m.lecturer_id=auth.uid())
  ))) THEN RAISE EXCEPTION 'Module scheduling access required'; END IF;
 RETURN QUERY SELECT a.user_id,coalesce(p.full_name,a.institutional_email,'Connected organiser')::text
 FROM public.microsoft_education_accounts a LEFT JOIN public.profiles p ON p.user_id=a.user_id AND p.tenant_id=a.tenant_id
 WHERE a.tenant_id=m.tenant_id AND a.role_type IN ('lecturer','staff') AND a.entra_object_id IS NOT NULL AND a.disabled_at IS NULL
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=a.user_id AND r.tenant_id=a.tenant_id AND r.role IN ('lecturer','programme_leader','centre_director','superadmin')) ORDER BY 2 LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION public.unipathway_module_organisers(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_module_organisers(uuid) TO authenticated;
