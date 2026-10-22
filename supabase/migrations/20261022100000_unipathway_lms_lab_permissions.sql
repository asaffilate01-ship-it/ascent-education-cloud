-- UniPathway LMS lab gateway: staged, no live AWS resources are created here.
-- Prerequisites: 20260924113000_academic_ops_rls.sql,
-- 20260929200000_interactive_virtual_labs.sql, 20260929203000_virtual_lab_phase2.sql
-- Apply to an isolated migrated staging database; do not replay into the legacy production schema.
BEGIN;

-- Official AWS Academy Learner Lab and operator-managed AWS browser/IDE labs
-- are distinct approved provider types. No arbitrary external provider URLs.
ALTER TABLE public.lab_templates DROP CONSTRAINT IF EXISTS lab_templates_provider_check;
ALTER TABLE public.lab_templates ADD CONSTRAINT lab_templates_provider_check
 CHECK (provider IN ('unipathway_container','github_codespaces','aws_academy',
 'aws_managed','azure','jupyter','managed_lab'));

CREATE TABLE IF NOT EXISTS public.lms_lab_offerings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 module_id uuid NOT NULL REFERENCES public.modules(id),
 template_id uuid NOT NULL REFERENCES public.lab_templates(id),
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 180),
 description text NOT NULL DEFAULT '',
 modes text[] NOT NULL DEFAULT ARRAY['online','in_centre','self_study']::text[],
 published boolean NOT NULL DEFAULT false,
 launch_enabled boolean NOT NULL DEFAULT false,
 session_minutes integer NOT NULL DEFAULT 90 CHECK (session_minutes BETWEEN 15 AND 240),
 max_active_learners integer NOT NULL DEFAULT 50 CHECK(max_active_learners BETWEEN 1 AND 500),
 self_study_attempts integer NOT NULL DEFAULT 8 CHECK(self_study_attempts BETWEEN 1 AND 100),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,template_id),
 CONSTRAINT lms_lab_modes_valid CHECK (
 array_length(modes,1) BETWEEN 1 AND 3
 AND modes <@ ARRAY['online','in_centre','self_study']::text[])
);

-- Lab sessions are existing provider-neutral attempt records, now linked to a
-- specific published LMS course offering and optional authorised class run.
ALTER TABLE public.lab_sessions
 ADD COLUMN IF NOT EXISTS offering_id uuid REFERENCES public.lms_lab_offerings(id),
 ADD COLUMN IF NOT EXISTS launch_mode text CHECK (launch_mode IN ('online','in_centre','self_study')),
 ADD COLUMN IF NOT EXISTS expires_at timestamptz,
 ADD COLUMN IF NOT EXISTS stop_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS broker_ready_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS unipathway_lab_offerings_module_template_idx
 ON public.lms_lab_offerings(tenant_id,module_id,template_id);
CREATE INDEX IF NOT EXISTS unipathway_lms_student_lab_idx
 ON public.lab_sessions(tenant_id,student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS unipathway_lms_offering_active_idx
 ON public.lab_sessions(offering_id,status) WHERE offering_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.unipathway_lab_staff_can_manage(p_module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.modules m WHERE m.id=p_module AND (
 m.tenant_id=public.get_user_tenant_id(auth.uid())
 OR public.has_role(auth.uid(),'superadmin'::public.app_role))
 AND (
  public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role))
 ))
$$;

CREATE OR REPLACE FUNCTION public.unipathway_lab_student_enrolled(p_module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.has_role(auth.uid(),'student'::public.app_role) AND EXISTS(
 SELECT 1 FROM public.modules m
 JOIN public.student_enrolments e ON e.programme_id=m.programme_id
  AND e.tenant_id=m.tenant_id AND e.student_id=auth.uid()
  AND e.status='active'
 WHERE m.id=p_module AND m.tenant_id=public.get_user_tenant_id(auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.unipathway_lab_can_view_session(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.lab_sessions s
 JOIN public.lab_templates t ON t.id=s.template_id AND t.tenant_id=s.tenant_id
 LEFT JOIN public.lab_class_runs r ON r.id=s.class_run_id AND r.tenant_id=s.tenant_id
 WHERE s.id=p_session
 AND (s.tenant_id=public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(),'superadmin'::public.app_role))
 AND (
  (s.student_id=auth.uid() AND public.unipathway_lab_student_enrolled(t.module_id))
  OR public.unipathway_lab_staff_can_manage(t.module_id)
  OR (r.lead_instructor_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role))
 ))
$$;

CREATE OR REPLACE FUNCTION public.check_unipathway_lab_offering_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_module public.modules%ROWTYPE; v_template public.lab_templates%ROWTYPE;
BEGIN
 SELECT * INTO v_module FROM public.modules WHERE id=NEW.module_id;
 SELECT * INTO v_template FROM public.lab_templates WHERE id=NEW.template_id;
 IF NOT FOUND OR v_module.id IS NULL OR v_template.id IS NULL OR NOT v_template.active
  OR v_template.module_id IS DISTINCT FROM v_module.id
  OR v_module.tenant_id<>NEW.tenant_id OR v_template.tenant_id<>NEW.tenant_id
 THEN RAISE EXCEPTION 'Lab template, module and tenant do not match'; END IF;
 IF NEW.launch_enabled AND NOT NEW.published THEN
  RAISE EXCEPTION 'A private/draft lab cannot be activated'; END IF;
 NEW.updated_at=now();
 RETURN NEW;
END $$;
CREATE TRIGGER validate_unipathway_lab_offering
 BEFORE INSERT OR UPDATE ON public.lms_lab_offerings
 FOR EACH ROW EXECUTE FUNCTION public.check_unipathway_lab_offering_scope();

ALTER TABLE public.lms_lab_offerings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab offering assigned staff and enrolled learner read"
 ON public.lms_lab_offerings FOR SELECT TO authenticated USING(
  public.unipathway_lab_staff_can_manage(module_id)
  OR (published AND public.unipathway_lab_student_enrolled(module_id))
 );
CREATE POLICY "lab offering assigned staff insert draft" ON public.lms_lab_offerings
 FOR INSERT TO authenticated WITH CHECK(
  public.unipathway_lab_staff_can_manage(module_id)
  AND tenant_id=(SELECT m.tenant_id FROM public.modules m WHERE m.id=module_id)
  AND created_by=auth.uid() AND launch_enabled=false);
CREATE POLICY "lab offering staff manage, directors activate" ON public.lms_lab_offerings
 FOR UPDATE TO authenticated USING(public.unipathway_lab_staff_can_manage(module_id))
 WITH CHECK(
  public.unipathway_lab_staff_can_manage(module_id)
  AND tenant_id=(SELECT m.tenant_id FROM public.modules m WHERE m.id=module_id)
  AND (launch_enabled=false OR public.has_role(auth.uid(),'centre_director'::public.app_role)
       OR public.has_role(auth.uid(),'superadmin'::public.app_role))
 );

-- Legacy same-tenant policies disclose lab templates and all lecturer sessions.
-- RLS is OR-based; remove broad policies before introducing module-based rules.
DROP POLICY IF EXISTS "lab templates tenant read" ON public.lab_templates;
CREATE POLICY "lab templates authorised module read" ON public.lab_templates
 FOR SELECT TO authenticated USING(
  public.unipathway_lab_staff_can_manage(module_id)
  OR (active AND public.unipathway_lab_student_enrolled(module_id)
      AND EXISTS(SELECT 1 FROM public.lms_lab_offerings o
       WHERE o.template_id=lab_templates.id AND o.tenant_id=lab_templates.tenant_id AND o.published))
 );
DROP POLICY IF EXISTS "lab tasks tenant read" ON public.lab_tasks;
CREATE POLICY "lab tasks authorised module read" ON public.lab_tasks
 FOR SELECT TO authenticated USING(
  EXISTS(SELECT 1 FROM public.lab_templates t WHERE t.id=lab_tasks.template_id
   AND t.tenant_id=lab_tasks.tenant_id AND
   (public.unipathway_lab_staff_can_manage(t.module_id)
    OR (public.unipathway_lab_student_enrolled(t.module_id) AND EXISTS(
     SELECT 1 FROM public.lms_lab_offerings o WHERE o.template_id=t.id AND o.published))))
 );
-- Scheduled practicals need explicit student invitations as well as
-- academic enrolment; independent self-study remains enrolment-gated only.
CREATE TABLE IF NOT EXISTS public.lms_lab_class_invitations (
 run_id uuid NOT NULL REFERENCES public.lab_class_runs(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL,
 invited_by uuid NOT NULL,
 status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(run_id,student_id)
);
CREATE INDEX IF NOT EXISTS lab_class_invites_student_idx
 ON public.lms_lab_class_invitations(student_id,run_id,status);
ALTER TABLE public.lms_lab_class_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab class invitations own or allocated instructor read"
 ON public.lms_lab_class_invitations FOR SELECT TO authenticated USING (
 (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
 OR public.can_manage_uni_lab_run(run_id));
CREATE POLICY "lab class assigned instructor can revoke" ON public.lms_lab_class_invitations
 FOR UPDATE TO authenticated USING(public.can_manage_uni_lab_run(run_id))
 WITH CHECK(status='revoked' AND public.can_manage_uni_lab_run(run_id));
REVOKE INSERT,DELETE ON public.lms_lab_class_invitations FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.invite_enrolled_unipathway_lab_class(p_run uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $lab_invite$
DECLARE r public.lab_class_runs%ROWTYPE; t public.lab_templates%ROWTYPE;
 v_eligible int; v_added int;
BEGIN
 SELECT * INTO r FROM public.lab_class_runs WHERE id=p_run FOR UPDATE;
 IF NOT FOUND OR r.status NOT IN ('scheduled','active') THEN
  RAISE EXCEPTION 'Scheduled lab run unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.lab_templates WHERE id=r.template_id AND tenant_id=r.tenant_id;
 IF NOT FOUND OR NOT public.unipathway_lab_staff_can_manage(t.module_id) THEN
  RAISE EXCEPTION 'Assigned instructor required' USING ERRCODE='42501'; END IF;
 SELECT count(DISTINCT e.student_id) INTO v_eligible FROM public.modules m
 JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
 WHERE m.id=t.module_id AND m.tenant_id=r.tenant_id AND e.status='active';
 IF v_eligible>r.max_concurrent THEN
  RAISE EXCEPTION 'Enrolment (%) exceeds lab capacity (%) - increase capacity or split class',
   v_eligible,r.max_concurrent; END IF;
 INSERT INTO public.lms_lab_class_invitations(run_id,tenant_id,student_id,invited_by)
 SELECT DISTINCT r.id,r.tenant_id,e.student_id,auth.uid()
 FROM public.modules m JOIN public.student_enrolments e
 ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
 WHERE m.id=t.module_id AND m.tenant_id=r.tenant_id AND e.status='active'
 ON CONFLICT(run_id,student_id) DO NOTHING; -- never restore revoked grants
 GET DIAGNOSTICS v_added=ROW_COUNT;
 RETURN v_added;
END
$lab_invite$;

DROP POLICY IF EXISTS "lab session own academic read" ON public.lab_sessions;
CREATE POLICY "lab session owner or assigned teacher only" ON public.lab_sessions
 FOR SELECT TO authenticated USING(public.unipathway_lab_can_view_session(id));
DROP POLICY IF EXISTS "lab progress own academic read" ON public.lab_task_progress;
CREATE POLICY "lab progress owner or assigned teacher only" ON public.lab_task_progress
 FOR SELECT TO authenticated USING(public.unipathway_lab_can_view_session(session_id));
DROP POLICY IF EXISTS "lab help own academic read" ON public.lab_help_requests;
CREATE POLICY "lab help owner or assigned teacher only" ON public.lab_help_requests
 FOR SELECT TO authenticated USING(public.unipathway_lab_can_view_session(session_id));
DROP POLICY IF EXISTS "lab evidence own academic read" ON public.lab_evidence;
CREATE POLICY "lab evidence owner or assigned teacher only" ON public.lab_evidence
 FOR SELECT TO authenticated USING(public.unipathway_lab_can_view_session(session_id));
DROP POLICY IF EXISTS "lab class tenant read" ON public.lab_class_runs;
CREATE POLICY "lab class owner or enrolled student read" ON public.lab_class_runs
 FOR SELECT TO authenticated USING(
  EXISTS(SELECT 1 FROM public.lab_templates t
    WHERE t.id=lab_class_runs.template_id AND t.tenant_id=lab_class_runs.tenant_id
    AND (public.unipathway_lab_staff_can_manage(t.module_id)
     OR (public.unipathway_lab_student_enrolled(t.module_id)
      AND EXISTS(SELECT 1 FROM public.lms_lab_class_invitations i
       WHERE i.run_id=lab_class_runs.id AND i.tenant_id=lab_class_runs.tenant_id
        AND i.student_id=auth.uid() AND i.status='invited'))))
 );
DROP POLICY IF EXISTS "lab provider admin" ON public.lab_provider_configs;
CREATE POLICY "lab provider only director configure" ON public.lab_provider_configs
 FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   public.has_role(auth.uid(),'centre_director'::public.app_role)))
 WITH CHECK(public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND
   public.has_role(auth.uid(),'centre_director'::public.app_role)));

-- The student never chooses an AWS account, instance ID, AMI, instance size,
-- IP address, public URL or service role. All of those come from vetted config.
-- A provider must be ENABLED + VERIFIED; "pending" is not a running machine.
CREATE OR REPLACE FUNCTION public.request_unipathway_managed_lab(
 p_offering uuid,p_mode text,p_class_run uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $lab_request$
DECLARE v public.lms_lab_offerings%ROWTYPE;
 t public.lab_templates%ROWTYPE; run public.lab_class_runs%ROWTYPE;
 current_id uuid; active_count int; used_attempts int; v_new uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.lms_lab_offerings WHERE id=p_offering FOR UPDATE;
 IF NOT FOUND OR NOT v.published OR NOT v.launch_enabled
  OR p_mode IS NULL OR NOT (p_mode=ANY(v.modes)) THEN
  RAISE EXCEPTION 'Lab is not published or activated' USING ERRCODE='42501';
 END IF;
 IF NOT public.unipathway_lab_student_enrolled(v.module_id) THEN
  RAISE EXCEPTION 'Active course enrolment required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO t FROM public.lab_templates WHERE id=v.template_id AND tenant_id=v.tenant_id AND active=true;
 IF NOT FOUND OR t.module_id<>v.module_id THEN
  RAISE EXCEPTION 'Lab template unavailable';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lab_provider_configs cfg
  WHERE cfg.tenant_id=v.tenant_id AND cfg.provider=t.provider
    AND cfg.enabled=true AND cfg.credential_status='verified') THEN
  RAISE EXCEPTION 'Provider is not connected and verified' USING ERRCODE='55000';
 END IF;
 IF p_mode='self_study' THEN
  IF p_class_run IS NOT NULL THEN RAISE EXCEPTION 'Independent access cannot impersonate a class'; END IF;
 ELSE
  SELECT * INTO run FROM public.lab_class_runs
   WHERE id=p_class_run AND tenant_id=v.tenant_id AND template_id=v.template_id FOR SHARE;
  IF NOT FOUND OR run.status NOT IN ('scheduled','active')
    OR NOT EXISTS(SELECT 1 FROM public.lms_lab_class_invitations i
     WHERE i.run_id=run.id AND i.tenant_id=run.tenant_id
      AND i.student_id=auth.uid() AND i.status='invited')
    OR run.max_concurrent<1
    OR run.starts_at IS NULL OR run.ends_at IS NULL
    OR now() < run.starts_at-interval '20 minutes'
    OR now() > run.ends_at+interval '20 minutes' THEN
   RAISE EXCEPTION 'No authorised live lab class window' USING ERRCODE='42501';
  END IF;
 END IF;
 -- Serialise per student/offering to avoid duplicate costly VM starts.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_offering::text,0));
 SELECT id INTO current_id FROM public.lab_sessions
 WHERE offering_id=v.id AND student_id=auth.uid()
  AND class_run_id IS NOT DISTINCT FROM p_class_run
  AND launch_mode=p_mode
  AND status IN ('provisioning','ready','active','paused')
  AND (expires_at IS NULL OR expires_at>now())
 ORDER BY created_at DESC LIMIT 1;
 IF current_id IS NOT NULL THEN RETURN current_id; END IF;
 SELECT count(*) INTO used_attempts FROM public.lab_sessions
 WHERE offering_id=v.id AND student_id=auth.uid()
  AND created_at>now()-interval '30 days';
 IF used_attempts>=v.self_study_attempts THEN
  RAISE EXCEPTION 'Lab attempt allowance reached; ask your lecturer';
 END IF;
 SELECT count(*) INTO active_count FROM public.lab_sessions
 WHERE offering_id=v.id AND status IN ('provisioning','ready','active','paused')
  AND (expires_at IS NULL OR expires_at>now());
 IF active_count>=v.max_active_learners THEN
  RAISE EXCEPTION 'Lab capacity reached; please try later';
 END IF;
 IF p_mode<>'self_study' THEN
  SELECT count(*) INTO active_count FROM public.lab_sessions
  WHERE class_run_id=p_class_run AND status IN ('provisioning','ready','active','paused')
   AND (expires_at IS NULL OR expires_at>now());
  IF active_count>=run.max_concurrent THEN
   RAISE EXCEPTION 'Class-run concurrent lab capacity reached';
  END IF;
 END IF;
 INSERT INTO public.lab_sessions(
  tenant_id,template_id,offering_id,student_id,class_run_id,launch_mode,status,
  expires_at,idle_shutdown_minutes,attempt_no)
 VALUES(v.tenant_id,t.id,v.id,auth.uid(),p_class_run,p_mode,'provisioning',
  now()+make_interval(mins=>v.session_minutes+20),15,used_attempts+1)
 RETURNING id INTO v_new;
 RETURN v_new;
END
$lab_request$;

CREATE OR REPLACE FUNCTION public.request_unipathway_lab_help(p_session uuid,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $lab_help$
DECLARE s public.lab_sessions%ROWTYPE; v_help_id uuid;
BEGIN
 SELECT * INTO s FROM public.lab_sessions WHERE id=p_session;
 IF NOT FOUND OR s.student_id<>auth.uid() OR NOT public.unipathway_lab_can_view_session(s.id)
 THEN RAISE EXCEPTION 'Lab not assigned to this learner' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_message,''))) NOT BETWEEN 3 AND 800 THEN
  RAISE EXCEPTION 'Help message must be 3–800 characters'; END IF;
 IF EXISTS(SELECT 1 FROM public.lab_help_requests WHERE session_id=s.id
   AND status IN ('waiting','claimed','assisting')) THEN
  RAISE EXCEPTION 'Help request already open'; END IF;
 INSERT INTO public.lab_help_requests(tenant_id,session_id,student_id,message,status)
 VALUES(s.tenant_id,s.id,auth.uid(),btrim(p_message),'waiting')
 RETURNING public.lab_help_requests.id INTO v_help_id;
 RETURN v_help_id;
END
$lab_help$;

-- Students may record attempt evidence for a task but cannot declare it
-- verified/completed. Assigned staff must review before approval.
CREATE OR REPLACE FUNCTION public.submit_unipathway_lab_task(
 p_session uuid,p_task uuid,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $task_attempt$
DECLARE s public.lab_sessions%ROWTYPE; t public.lab_tasks%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.lab_sessions WHERE id=p_session;
 IF NOT FOUND OR s.student_id<>auth.uid() OR NOT public.unipathway_lab_can_view_session(s.id)
  OR s.status NOT IN ('provisioning','ready','active','paused')
  OR s.expires_at<now() THEN
  RAISE EXCEPTION 'No active lab assignment' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.lab_tasks WHERE id=p_task AND template_id=s.template_id;
 IF NOT FOUND OR t.tenant_id<>s.tenant_id THEN
  RAISE EXCEPTION 'Task does not belong to your lab' USING ERRCODE='42501'; END IF;
 IF length(btrim(coalesce(p_note,''))) NOT BETWEEN 5 AND 1200 THEN
  RAISE EXCEPTION 'Evidence summary must contain 5–1200 characters'; END IF;
 INSERT INTO public.lab_task_progress
 (tenant_id,session_id,task_id,status,attempts,verification_result)
 VALUES(s.tenant_id,s.id,t.id,'pending_review',1,
   jsonb_build_object('student_note',btrim(p_note),'self_reported_at',now()))
 ON CONFLICT(session_id,task_id) DO UPDATE
  SET status='pending_review',attempts=public.lab_task_progress.attempts+1,
   verification_result=jsonb_build_object('student_note',btrim(p_note),'self_reported_at',now()),
   completed_at=NULL;
END
$task_attempt$;

CREATE OR REPLACE FUNCTION public.review_unipathway_lab_task(
 p_session uuid,p_task uuid,p_approved boolean,p_feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $task_review$
DECLARE s public.lab_sessions%ROWTYPE;t public.lab_tasks%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.lab_sessions WHERE id=p_session;
 SELECT * INTO t FROM public.lab_tasks WHERE id=p_task AND template_id=s.template_id;
 IF s.id IS NULL OR t.id IS NULL THEN RAISE EXCEPTION 'Lab task not found' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lab_templates lt WHERE lt.id=s.template_id
  AND lt.tenant_id=s.tenant_id AND public.unipathway_lab_staff_can_manage(lt.module_id))
 THEN RAISE EXCEPTION 'Assigned lecturer role required' USING ERRCODE='42501'; END IF;
 IF length(coalesce(p_feedback,''))>1200 THEN RAISE EXCEPTION 'Feedback too long'; END IF;
 UPDATE public.lab_task_progress SET
  status=CASE WHEN p_approved THEN 'completed' ELSE 'needs_revision' END,
  completed_at=CASE WHEN p_approved THEN now() ELSE NULL END,
  verification_result=verification_result||jsonb_build_object(
    'reviewed_by',auth.uid(),'reviewed_at',now(),
    'teacher_feedback',coalesce(p_feedback,''),'approved',p_approved)
 WHERE session_id=s.id AND task_id=t.id AND status='pending_review';
 IF NOT FOUND THEN RAISE EXCEPTION 'No pending student attempt'; END IF;
END
$task_review$;

CREATE OR REPLACE FUNCTION public.claim_unipathway_lab_help(p_request uuid,p_resolved boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $claim_lab_help$
DECLARE h public.lab_help_requests%ROWTYPE; s public.lab_sessions%ROWTYPE;
BEGIN
 SELECT * INTO h FROM public.lab_help_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Help request unavailable'; END IF;
 SELECT * INTO s FROM public.lab_sessions WHERE id=h.session_id;
 IF NOT EXISTS(SELECT 1 FROM public.lab_templates t WHERE t.id=s.template_id
   AND t.tenant_id=s.tenant_id AND public.unipathway_lab_staff_can_manage(t.module_id))
  THEN RAISE EXCEPTION 'Not assigned to support this lab' USING ERRCODE='42501'; END IF;
 IF p_resolved THEN
  IF h.status NOT IN ('claimed','assisting') OR h.claimed_by<>auth.uid() THEN
   RAISE EXCEPTION 'Claim this request before resolving it'; END IF;
  UPDATE public.lab_help_requests SET status='resolved',resolved_at=now()
  WHERE id=p_request;
 ELSE
  IF h.status<>'waiting' THEN RAISE EXCEPTION 'This request is already assigned'; END IF;
  UPDATE public.lab_help_requests SET status='claimed',claimed_by=auth.uid(),claimed_at=now()
  WHERE id=p_request;
 END IF;
END
$claim_lab_help$;

-- No anon or direct browser writes. Access to a cloud environment is routed
-- via an authenticated server connector after provider and object verification.
REVOKE INSERT,UPDATE,DELETE ON public.lab_sessions FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.lab_help_requests FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.lab_task_progress FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.invite_enrolled_unipathway_lab_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_unipathway_managed_lab(uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_unipathway_lab_help(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unipathway_lab_student_enrolled(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unipathway_lab_staff_can_manage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unipathway_lab_can_view_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_unipathway_lab_task(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_unipathway_lab_task(uuid,uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_unipathway_lab_help(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_enrolled_unipathway_lab_class(uuid),
 public.request_unipathway_managed_lab(uuid,text,uuid),
 public.request_unipathway_lab_help(uuid,text),
 public.unipathway_lab_student_enrolled(uuid),
 public.unipathway_lab_staff_can_manage(uuid),
 public.unipathway_lab_can_view_session(uuid),
 public.submit_unipathway_lab_task(uuid,uuid,text),
 public.review_unipathway_lab_task(uuid,uuid,boolean,text),
 public.claim_unipathway_lab_help(uuid,boolean)
 TO authenticated;
REVOKE ALL ON public.lms_lab_offerings,public.lms_lab_class_invitations FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.lms_lab_offerings TO authenticated;
GRANT SELECT ON public.lms_lab_class_invitations TO authenticated;
GRANT UPDATE(status) ON public.lms_lab_class_invitations TO authenticated;
COMMIT;
