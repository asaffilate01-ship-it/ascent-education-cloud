-- A disabled Microsoft mailbox must not prevent local cancellation; provider delivery remains reviewable.
CREATE OR REPLACE FUNCTION public.save_uni_calendar_class(p_id uuid,p_module uuid,p_organiser uuid,p_title text,p_start timestamptz,p_end timestamptz,p_students uuid[],p_revision integer DEFAULT 0,p_cancel boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules;s public.live_class_sessions;j public.uni_calendar_jobs;v uuid; old_state jsonb;
BEGIN
 SELECT * INTO m FROM public.modules WHERE id=p_module;
 IF auth.uid() IS NULL OR m.id IS NULL OR NOT unipathway_acl.module_access(m.id,m.tenant_id,true) THEN RAISE EXCEPTION 'Assigned module required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(m.tenant_id::text,654));
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_id FOR UPDATE;
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_id FOR UPDATE;
 IF s.id IS NOT NULL AND (s.module_id<>p_module OR s.tenant_id<>m.tenant_id OR s.organiser_user_id<>p_organiser OR j.session_id IS NULL OR j.revision<>p_revision) THEN RAISE EXCEPTION 'Class changed or belongs to another scope';END IF;
 IF s.id IS NULL AND p_revision<>0 THEN RAISE EXCEPTION 'Class no longer exists';END IF;
 IF j.status IN ('processing','needs_review') THEN RAISE EXCEPTION 'Provider operation must be reviewed before changing this class';END IF;
 IF p_id IS NULL OR p_cancel IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR p_end-p_start>interval '12 hours' OR p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 120 OR p_students IS NULL OR cardinality(p_students)>300 THEN RAISE EXCEPTION 'Valid title, times and up to 300 students required';END IF;
 IF NOT p_cancel AND p_end<=now() THEN RAISE EXCEPTION 'Future class required';END IF;
 IF p_cancel AND s.id IS NULL THEN RAISE EXCEPTION 'Existing class required';END IF;
 IF NOT p_cancel AND NOT EXISTS(SELECT 1 FROM public.microsoft_education_accounts a WHERE a.tenant_id=m.tenant_id AND a.user_id=p_organiser AND a.disabled_at IS NULL AND a.entra_object_id IS NOT NULL AND a.role_type IN ('lecturer','staff','moderator') AND a.provisioning_status NOT IN ('pending','failed','provisioned_disabled')) THEN RAISE EXCEPTION 'Connected and enabled Microsoft organiser required';END IF;
 IF NOT p_cancel THEN
  IF EXISTS(SELECT 1 FROM unnest(p_students) u WHERE u IS NULL OR NOT EXISTS(SELECT 1 FROM public.student_enrolments e JOIN public.profiles p ON p.user_id=e.student_id AND p.tenant_id=e.tenant_id WHERE e.student_id=u AND e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id AND e.status='active')) THEN RAISE EXCEPTION 'Every invitee needs an active module programme enrolment';END IF;
  IF EXISTS(SELECT 1 FROM public.live_class_sessions x JOIN public.modules xm ON xm.id=x.module_id
    WHERE x.tenant_id=m.tenant_id AND x.id<>p_id AND x.status NOT IN ('cancelled','deleted') AND tstzrange(x.starts_at,x.ends_at,'[)')&&tstzrange(p_start,p_end,'[)')
    AND (x.organiser_user_id=p_organiser OR xm.lecturer_id=m.lecturer_id OR x.module_id=m.id OR EXISTS(SELECT 1 FROM public.live_class_invitations i WHERE i.session_id=x.id AND i.user_id=ANY(p_students) AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now())))) THEN RAISE EXCEPTION 'Organiser, teacher, module or student timetable clash';END IF;
 END IF;
 old_state:=CASE WHEN s.id IS NULL THEN NULL ELSE to_jsonb(s) END;
 INSERT INTO public.live_class_sessions(id,tenant_id,module_id,organiser_user_id,title,starts_at,ends_at,status,capacity,teams_sync_status)
 VALUES(p_id,m.tenant_id,m.id,p_organiser,trim(p_title),p_start,p_end,CASE WHEN p_cancel THEN 'cancelled' ELSE 'scheduled' END,greatest(20,cardinality(p_students)),'queued')
 ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,capacity=EXCLUDED.capacity,teams_sync_status='queued';
 UPDATE public.live_class_invitations SET status='revoked' WHERE session_id=p_id AND (p_cancel OR NOT(user_id=ANY(p_students)));
 IF NOT p_cancel THEN
  INSERT INTO public.live_class_invitations(tenant_id,session_id,user_id,invited_by,status)
  SELECT m.tenant_id,p_id,u,auth.uid(),'invited' FROM (SELECT DISTINCT unnest(p_students) u) x
  ON CONFLICT(session_id,user_id) DO UPDATE SET status='invited',expires_at=NULL;
 END IF;
 INSERT INTO public.uni_calendar_jobs(session_id,tenant_id,requested_by) VALUES(p_id,m.tenant_id,auth.uid()) ON CONFLICT(session_id) DO UPDATE SET revision=uni_calendar_jobs.revision+1,status='queued',verify_only=false,requested_by=auth.uid(),error_code=NULL,updated_at=now();
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,actor,action,details) VALUES(p_id,m.tenant_id,auth.uid(),CASE WHEN p_cancel THEN 'cancellation_queued' ELSE 'calendar_change_queued' END,jsonb_build_object('previous',old_state,'start',p_start,'end',p_end,'students',p_students));
 RETURN p_id;
END $$;
CREATE FUNCTION public.cancel_uni_calendar_class(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.live_class_sessions;j public.uni_calendar_jobs;
BEGIN
 IF auth.uid() IS NULL OR NOT public.uni_calendar_manage(p_session) THEN RAISE EXCEPTION 'Assigned educator required';END IF;
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_session;
 PERFORM pg_advisory_xact_lock(hashtextextended(s.tenant_id::text,654));
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_session FOR UPDATE;
 IF j.session_id IS NULL THEN RAISE EXCEPTION 'Connected calendar class required';END IF;
 UPDATE public.live_class_sessions SET status='cancelled',join_url=NULL,teams_sync_status='queued' WHERE id=p_session;
 UPDATE public.uni_calendar_jobs SET revision=revision+1,requested_by=auth.uid(),
 status=CASE WHEN status='processing' THEN status ELSE 'queued' END,
 refresh_requested=CASE WHEN status='processing' THEN true ELSE refresh_requested END,
 verify_only=CASE WHEN status='needs_review' THEN true ELSE verify_only END,updated_at=now() WHERE session_id=p_session;
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,actor,action) VALUES(p_session,s.tenant_id,auth.uid(),'local_cancellation_provider_pending');
END $$;
REVOKE ALL ON FUNCTION public.cancel_uni_calendar_class(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_uni_calendar_class(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.finish_uni_calendar_job(p_session uuid,p_lease uuid,p_event text DEFAULT NULL,p_join text DEFAULT NULL,p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.uni_calendar_jobs;
BEGIN
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_session FOR UPDATE;
 IF j.session_id IS NULL OR j.status<>'processing' OR j.lease IS DISTINCT FROM p_lease THEN RAISE EXCEPTION 'Current worker lease required';END IF;
 IF p_error IS NULL AND ((p_event IS NULL AND (SELECT status FROM public.live_class_sessions WHERE id=p_session)<>'cancelled') OR (p_join IS NOT NULL AND p_join !~ '^https://teams[.]microsoft[.]com/')) THEN RAISE EXCEPTION 'Valid provider receipt required';END IF;
 UPDATE public.uni_calendar_jobs SET status=CASE WHEN p_error IS NOT NULL THEN 'needs_review' WHEN refresh_requested THEN 'queued' ELSE 'completed' END,verify_only=false,refresh_requested=false,error_code=left(p_error,100),lease=NULL,updated_at=now() WHERE session_id=p_session;
 UPDATE public.live_class_sessions SET provider_event_id=coalesce(p_event,provider_event_id),join_url=CASE WHEN status='cancelled' THEN NULL WHEN p_error IS NULL THEN p_join ELSE join_url END,teams_sync_status=CASE WHEN p_error IS NOT NULL THEN 'needs_review' WHEN j.refresh_requested THEN 'queued' ELSE 'synced' END WHERE id=p_session;
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,action,details) VALUES(p_session,j.tenant_id,CASE WHEN p_error IS NULL THEN 'provider_confirmed' ELSE 'provider_review_required' END,jsonb_build_object('revision',j.revision,'error',left(p_error,100)));
END $$;
