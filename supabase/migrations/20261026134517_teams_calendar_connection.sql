-- Microsoft Teams live-class connector and persistent lesson artifacts.
create table if not exists public.live_class_sessions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, module_id uuid references public.modules(id), cohort_reference text,
 title text not null, provider text not null default 'microsoft_teams', provider_meeting_id text, provider_event_id text, organiser_user_id uuid not null,
 moderator_user_ids uuid[] not null default '{}', starts_at timestamptz not null, ends_at timestamptz not null, join_url text,
 capacity integer not null default 300, class_mode text not null default 'lecture' check(class_mode in ('lecture','seminar','workshop','tutorial','webinar','townhall')),
 attendee_mic_default boolean not null default false, attendee_camera_default boolean not null default false, recording_enabled boolean not null default true,
 transcript_enabled boolean not null default true, whiteboard_enabled boolean not null default true, qna_enabled boolean not null default true,
 polls_enabled boolean not null default true, status text not null default 'scheduled', created_at timestamptz not null default now()
);
ALTER TABLE public.live_class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_sessions ADD COLUMN IF NOT EXISTS teams_sync_status text NOT NULL DEFAULT 'pending';
CREATE TABLE IF NOT EXISTS public.live_class_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,session_id uuid NOT NULL REFERENCES public.live_class_sessions(id),
 user_id uuid NOT NULL,invited_by uuid NOT NULL,status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','revoked')),
 expires_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(session_id,user_id)
);
ALTER TABLE public.live_class_invitations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.uni_calendar_jobs (
 session_id uuid PRIMARY KEY REFERENCES public.live_class_sessions(id),tenant_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','completed','needs_review')),
 revision integer NOT NULL DEFAULT 1,lease uuid,started_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now(),
 requested_by uuid NOT NULL,error_code text
);
CREATE TABLE public.uni_calendar_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES public.live_class_sessions(id),
 tenant_id uuid NOT NULL,actor uuid,action text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uni_calendar_jobs ADD COLUMN refresh_requested boolean NOT NULL DEFAULT false;
ALTER TABLE public.uni_calendar_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_calendar_audit ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.uni_calendar_manage(p_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.live_class_sessions s WHERE s.id=p_session
 AND unipathway_acl.module_access(s.module_id,s.tenant_id,true))
$$;
CREATE FUNCTION public.uni_calendar_read(p_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.uni_calendar_manage(p_session) OR (auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.live_class_sessions s JOIN public.live_class_invitations i ON i.session_id=s.id AND i.tenant_id=s.tenant_id
 WHERE s.id=p_session AND i.user_id=auth.uid() AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now())
 AND s.status NOT IN ('cancelled','deleted') AND unipathway_acl.module_access(s.module_id,s.tenant_id)))
$$;
REVOKE ALL ON FUNCTION public.uni_calendar_manage(uuid),public.uni_calendar_read(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.uni_calendar_manage(uuid),public.uni_calendar_read(uuid) TO authenticated;
-- Restrictive policies also constrain older permissive policies on a full-schema installation.
CREATE POLICY calendar_session_read ON public.live_class_sessions FOR SELECT TO authenticated USING(public.uni_calendar_read(id));
CREATE POLICY calendar_session_boundary ON public.live_class_sessions AS RESTRICTIVE FOR SELECT TO authenticated USING(public.uni_calendar_read(id));
CREATE POLICY calendar_invitation_read ON public.live_class_invitations FOR SELECT TO authenticated USING(public.uni_calendar_manage(session_id) OR (user_id=auth.uid() AND public.uni_calendar_read(session_id)));
CREATE POLICY calendar_invitation_boundary ON public.live_class_invitations AS RESTRICTIVE FOR SELECT TO authenticated USING(public.uni_calendar_manage(session_id) OR (user_id=auth.uid() AND public.uni_calendar_read(session_id)));
REVOKE INSERT,UPDATE,DELETE ON public.live_class_sessions,public.live_class_invitations FROM anon,authenticated;
REVOKE ALL ON public.uni_calendar_jobs,public.uni_calendar_audit FROM anon,authenticated;
GRANT SELECT ON public.live_class_sessions,public.live_class_invitations,public.uni_calendar_audit TO authenticated;
GRANT SELECT(session_id,tenant_id,status,revision,started_at,updated_at,requested_by,error_code) ON public.uni_calendar_jobs TO authenticated;
CREATE POLICY calendar_job_read ON public.uni_calendar_jobs FOR SELECT TO authenticated USING(public.uni_calendar_manage(session_id));
CREATE POLICY calendar_audit_read ON public.uni_calendar_audit FOR SELECT TO authenticated USING(public.uni_calendar_manage(session_id));

CREATE FUNCTION public.uni_calendar_candidates(p_module uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules;
BEGIN
 SELECT * INTO m FROM public.modules WHERE id=p_module;
 IF auth.uid() IS NULL OR m.id IS NULL OR NOT unipathway_acl.module_access(m.id,m.tenant_id,true) THEN RAISE EXCEPTION 'Assigned module required'; END IF;
 RETURN jsonb_build_object('students',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(p.full_name,'Learner')) ORDER BY p.full_name),'[]')
 FROM public.profiles p WHERE p.tenant_id=m.tenant_id AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=p.user_id AND e.tenant_id=m.tenant_id AND e.programme_id=m.programme_id AND e.status='active')),
 'organisers',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.user_id,'name',coalesce(p.full_name,'Organiser'))),'[]') FROM public.microsoft_education_accounts a
 JOIN public.profiles p ON p.user_id=a.user_id AND p.tenant_id=a.tenant_id
 WHERE a.tenant_id=m.tenant_id AND a.disabled_at IS NULL AND a.entra_object_id IS NOT NULL AND a.provisioning_status NOT IN ('pending','failed','provisioned_disabled')
 AND a.role_type IN ('lecturer','staff','moderator')));
END $$;
CREATE FUNCTION public.save_uni_calendar_class(p_id uuid,p_module uuid,p_organiser uuid,p_title text,p_start timestamptz,p_end timestamptz,p_students uuid[],p_revision integer DEFAULT 0,p_cancel boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules;s public.live_class_sessions;j public.uni_calendar_jobs;v uuid; old_state jsonb;
BEGIN
 SELECT * INTO m FROM public.modules WHERE id=p_module;
 IF auth.uid() IS NULL OR m.id IS NULL OR NOT unipathway_acl.module_access(m.id,m.tenant_id,true) THEN RAISE EXCEPTION 'Assigned module required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(m.tenant_id::text,654));
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_id FOR UPDATE;
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_id FOR UPDATE;
 IF s.id IS NOT NULL AND (s.module_id<>p_module OR s.tenant_id<>m.tenant_id OR s.organiser_user_id<>p_organiser OR j.session_id IS NULL OR j.revision<>p_revision) THEN RAISE EXCEPTION 'Class changed or belongs to another scope';END IF;
 IF s.id IS NULL AND p_revision<>0 THEN RAISE EXCEPTION 'Class no longer exists';END IF;
 IF j.status IN ('processing','needs_review') THEN RAISE EXCEPTION 'Provider operation must be reviewed before changing this class';END IF;
 IF p_id IS NULL OR p_cancel IS NULL OR p_start IS NULL OR p_end IS NULL OR p_end<=p_start OR p_end-p_start>interval '12 hours' OR p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 120 OR p_students IS NULL OR cardinality(p_students)>300 THEN RAISE EXCEPTION 'Valid title, times and up to 300 students required';END IF;
 IF NOT p_cancel AND p_end<=now() THEN RAISE EXCEPTION 'Future class required';END IF;
 IF p_cancel AND s.id IS NULL THEN RAISE EXCEPTION 'Existing class required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.microsoft_education_accounts a WHERE a.tenant_id=m.tenant_id AND a.user_id=p_organiser AND a.disabled_at IS NULL AND a.entra_object_id IS NOT NULL AND a.role_type IN ('lecturer','staff','moderator') AND a.provisioning_status NOT IN ('pending','failed','provisioned_disabled')) THEN RAISE EXCEPTION 'Connected and enabled Microsoft organiser required';END IF;
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
CREATE FUNCTION public.claim_uni_calendar_job(p_tenant uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.uni_calendar_jobs;s public.live_class_sessions;roster jsonb;organiser jsonb;
BEGIN
 WITH stale AS (UPDATE public.uni_calendar_jobs SET status='needs_review',error_code='worker_receipt_unknown',updated_at=now() WHERE tenant_id=p_tenant AND status='processing' AND started_at<now()-interval '10 minutes' RETURNING session_id,tenant_id)
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,action) SELECT session_id,tenant_id,'worker_lease_expired' FROM stale;
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE tenant_id=p_tenant AND status='queued' ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT * INTO s FROM public.live_class_sessions WHERE id=j.session_id;
 IF NOT EXISTS(SELECT 1 FROM public.modules m JOIN public.profiles p ON p.user_id=j.requested_by AND p.tenant_id=m.tenant_id JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id
 WHERE m.id=s.module_id AND m.tenant_id=p_tenant AND (r.role::text IN ('superadmin','centre_director','programme_leader') OR (r.role::text='lecturer' AND m.lecturer_id=p.user_id))) THEN
 UPDATE public.uni_calendar_jobs SET status='needs_review',error_code='requester_assignment_changed' WHERE session_id=s.id;RETURN NULL;END IF;
 SELECT jsonb_build_object('id',a.entra_object_id,'email',a.institutional_email) INTO organiser FROM public.microsoft_education_accounts a
 WHERE a.tenant_id=p_tenant AND a.user_id=s.organiser_user_id AND a.disabled_at IS NULL AND a.provisioning_status NOT IN ('pending','failed','provisioned_disabled');
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.entra_object_id,'email',a.institutional_email,'user_id',i.user_id)),'[]') INTO roster
 FROM public.live_class_invitations i JOIN public.modules m ON m.id=s.module_id
 JOIN public.student_enrolments e ON e.student_id=i.user_id AND e.programme_id=m.programme_id AND e.tenant_id=p_tenant AND e.status='active'
 LEFT JOIN public.microsoft_education_accounts a ON a.user_id=i.user_id AND a.tenant_id=p_tenant AND a.disabled_at IS NULL AND a.provisioning_status NOT IN ('pending','failed','provisioned_disabled')
 WHERE i.session_id=s.id AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now());
 UPDATE public.uni_calendar_jobs SET status='processing',lease=gen_random_uuid(),started_at=now(),updated_at=now() WHERE session_id=s.id RETURNING * INTO j;
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,action,details) VALUES(s.id,p_tenant,'worker_claimed',jsonb_build_object('revision',j.revision));
 RETURN jsonb_build_object('job',to_jsonb(j),'session',to_jsonb(s),'organiser',organiser,'attendees',roster);
END $$;
CREATE FUNCTION public.finish_uni_calendar_job(p_session uuid,p_lease uuid,p_event text DEFAULT NULL,p_join text DEFAULT NULL,p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.uni_calendar_jobs;
BEGIN
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_session FOR UPDATE;
 IF j.session_id IS NULL OR j.status<>'processing' OR j.lease IS DISTINCT FROM p_lease THEN RAISE EXCEPTION 'Current worker lease required';END IF;
 IF p_error IS NULL AND ((p_event IS NULL AND (SELECT status FROM public.live_class_sessions WHERE id=p_session)<>'cancelled') OR (p_join IS NOT NULL AND p_join !~ '^https://teams[.]microsoft[.]com/')) THEN RAISE EXCEPTION 'Valid provider receipt required';END IF;
 UPDATE public.uni_calendar_jobs SET status=CASE WHEN p_error IS NOT NULL THEN 'needs_review' WHEN refresh_requested THEN 'queued' ELSE 'completed' END,verify_only=false,refresh_requested=false,error_code=left(p_error,100),lease=NULL,updated_at=now() WHERE session_id=p_session;
 UPDATE public.live_class_sessions SET provider_event_id=coalesce(p_event,provider_event_id),join_url=CASE WHEN p_error IS NULL THEN p_join ELSE join_url END,teams_sync_status=CASE WHEN p_error IS NOT NULL THEN 'needs_review' WHEN j.refresh_requested THEN 'queued' ELSE 'synced' END WHERE id=p_session;
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,action,details) VALUES(p_session,j.tenant_id,CASE WHEN p_error IS NULL THEN 'provider_confirmed' ELSE 'provider_review_required' END,jsonb_build_object('revision',j.revision,'error',left(p_error,100)));
END $$;
REVOKE ALL ON FUNCTION public.uni_calendar_candidates(uuid),public.save_uni_calendar_class(uuid,uuid,uuid,text,timestamptz,timestamptz,uuid[],integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.uni_calendar_candidates(uuid),public.save_uni_calendar_class(uuid,uuid,uuid,text,timestamptz,timestamptz,uuid[],integer,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_uni_calendar_job(uuid),public.finish_uni_calendar_job(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_uni_calendar_job(uuid),public.finish_uni_calendar_job(uuid,uuid,text,text,text) TO service_role;
GRANT SELECT ON public.live_class_sessions,public.live_class_invitations,public.uni_calendar_jobs,public.uni_calendar_audit TO service_role;
ALTER TABLE public.uni_calendar_jobs ADD COLUMN verify_only boolean NOT NULL DEFAULT false;
GRANT SELECT(verify_only) ON public.uni_calendar_jobs TO authenticated;
CREATE FUNCTION public.review_uni_calendar_delivery(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.uni_calendar_jobs;
BEGIN
 IF auth.uid() IS NULL OR NOT public.uni_calendar_manage(p_session) THEN RAISE EXCEPTION 'Assigned educator required';END IF;
 SELECT * INTO j FROM public.uni_calendar_jobs WHERE session_id=p_session FOR UPDATE;
 IF j.status IS DISTINCT FROM 'needs_review' THEN RAISE EXCEPTION 'Reviewable delivery required';END IF;
 UPDATE public.uni_calendar_jobs SET status='queued',verify_only=coalesce(j.error_code NOT LIKE 'preflight_%',true),requested_by=auth.uid(),updated_at=now() WHERE session_id=p_session;
 INSERT INTO public.uni_calendar_audit(session_id,tenant_id,actor,action) VALUES(p_session,j.tenant_id,auth.uid(),'provider_review_queued');
END $$;
REVOKE ALL ON FUNCTION public.review_uni_calendar_delivery(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_uni_calendar_delivery(uuid) TO authenticated;

REVOKE ALL ON public.live_class_sessions,public.live_class_invitations FROM anon;

-- Withdrawal/restoration updates the original explicit invitation set, never adds unrelated learners.
CREATE FUNCTION unipathway_acl.refresh_calendar_roster() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE student uuid;tenant uuid;programme uuid;
BEGIN
 IF TG_OP='INSERT' THEN student:=NEW.student_id;tenant:=NEW.tenant_id;programme:=NEW.programme_id;
 ELSE student:=OLD.student_id;tenant:=OLD.tenant_id;programme:=OLD.programme_id;END IF;
 UPDATE public.uni_calendar_jobs j SET status=CASE WHEN j.status='completed' THEN 'queued' ELSE j.status END,
 refresh_requested=CASE WHEN j.status='processing' THEN true ELSE j.refresh_requested END,verify_only=CASE WHEN j.status='completed' THEN false ELSE j.verify_only END,updated_at=now()
 FROM public.live_class_sessions s JOIN public.modules m ON m.id=s.module_id
 WHERE j.session_id=s.id AND j.tenant_id=tenant AND m.programme_id=programme AND s.status='scheduled' AND s.ends_at>now()
 AND EXISTS(SELECT 1 FROM public.live_class_invitations i WHERE i.session_id=s.id AND i.user_id=student AND i.status IN ('invited','accepted'));
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.refresh_calendar_roster() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_calendar_roster AFTER INSERT OR UPDATE OR DELETE ON public.student_enrolments FOR EACH ROW EXECUTE FUNCTION unipathway_acl.refresh_calendar_roster();
