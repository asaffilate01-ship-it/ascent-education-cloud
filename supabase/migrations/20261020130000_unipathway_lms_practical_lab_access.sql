-- UniPathway LMS practical labs: AWS Academy, managed AWS and low-cost coding labs.
-- STAGING ONLY: requires 2026-09-29 lab migrations and invitation-based Teams tables.
-- Provider config defaults DISABLED; no AWS API calls or resource allocations occur here.
BEGIN;

ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'class_only'
 CHECK (access_mode IN ('class_only','self_study','both'));
ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS learning_outcomes text;
ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS preparation_notes text;
ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS estimated_cost_gbp numeric NOT NULL DEFAULT 0
 CHECK (estimated_cost_gbp>=0 AND estimated_cost_gbp<=500);
ALTER TABLE public.lab_templates
 ADD COLUMN IF NOT EXISTS created_by uuid;
-- aws_managed means an explicitly approved private AWS account, never a student IAM key.
ALTER TABLE public.lab_templates DROP CONSTRAINT IF EXISTS lab_templates_provider_check;
ALTER TABLE public.lab_templates
 ADD CONSTRAINT lab_templates_provider_check
 CHECK(provider IN ('unipathway_container','github_codespaces','aws_academy','aws_managed','azure','jupyter','managed_lab'));
ALTER TABLE public.lab_provider_configs
 ADD COLUMN IF NOT EXISTS max_concurrent integer NOT NULL DEFAULT 25
 CHECK(max_concurrent BETWEEN 1 AND 500);
ALTER TABLE public.lab_provider_configs
 ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.lab_provider_configs
 ADD COLUMN IF NOT EXISTS hard_stop_minutes integer NOT NULL DEFAULT 120
 CHECK(hard_stop_minutes BETWEEN 5 AND 480);
ALTER TABLE public.lab_provider_configs
 ADD COLUMN IF NOT EXISTS idle_shutdown_minutes integer NOT NULL DEFAULT 20
 CHECK(idle_shutdown_minutes BETWEEN 5 AND 120);

-- An invitation is for an enrolled student and one specific class run, not all labs
-- for the same cohort. A class can hold 100+ learners while concurrent live
-- resource launches are separately capped by cost and provider capacity.
CREATE TABLE IF NOT EXISTS public.unipathway_lab_run_invitations(
 class_run_id uuid NOT NULL REFERENCES public.lab_class_runs(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 invited_by uuid NOT NULL,
 status text NOT NULL DEFAULT 'invited'
 CHECK(status IN ('invited','accepted','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(class_run_id,student_id)
);
CREATE INDEX IF NOT EXISTS lab_run_invitation_student_idx
 ON public.unipathway_lab_run_invitations(student_id,class_run_id,status);
ALTER TABLE public.unipathway_lab_run_invitations ENABLE ROW LEVEL SECURITY;

-- Queue is honest: creation does NOT mean AWS has started or credits were charged.
-- A verified provider worker will later transition approved requests and attach
-- resource IDs; NEVER accept VM identifiers or arbitrary URLs from student clients.
CREATE TABLE IF NOT EXISTS public.unipathway_lab_launch_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 template_id uuid NOT NULL REFERENCES public.lab_templates(id),
 student_id uuid NOT NULL,
 class_run_id uuid REFERENCES public.lab_class_runs(id),
 mode text NOT NULL CHECK(mode IN ('class','self_study')),
 status text NOT NULL DEFAULT 'awaiting_provider'
 CHECK(status IN ('awaiting_provider','provisioning','ready','active','paused','stopped','expired','failed','cancelled')),
 estimated_cost_gbp numeric NOT NULL DEFAULT 0 CHECK(estimated_cost_gbp>=0),
 provider_resource_reference text, -- private internal reference, not launch URL
 error_code text,
 requested_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz,
 started_at timestamptz,
 expires_at timestamptz,
 stopped_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS lab_one_active_request_per_student_template
 ON public.unipathway_lab_launch_requests(student_id,template_id)
 WHERE status IN ('awaiting_provider','provisioning','ready','active','paused');
CREATE INDEX IF NOT EXISTS lab_launch_student_lookup
 ON public.unipathway_lab_launch_requests(student_id,requested_at DESC);
CREATE INDEX IF NOT EXISTS lab_launch_provider_queue
 ON public.unipathway_lab_launch_requests(tenant_id,template_id,status,requested_at);
ALTER TABLE public.unipathway_lab_launch_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_lab_support_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 launch_request_id uuid NOT NULL REFERENCES public.unipathway_lab_launch_requests(id) ON DELETE CASCADE,
 student_id uuid NOT NULL,
 message text NOT NULL CHECK(char_length(btrim(message)) BETWEEN 4 AND 1600),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','claimed','resolved','cancelled')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 assigned_lecturer_id uuid,
 answered_at timestamptz,
 response text
);
CREATE INDEX IF NOT EXISTS lab_support_active_idx
 ON public.unipathway_lab_support_requests(tenant_id,status,requested_at);
ALTER TABLE public.unipathway_lab_support_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_uni_lab_template(p_template uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $manage_uni_lab$
 SELECT EXISTS(
  SELECT 1 FROM public.lab_templates t
  JOIN public.modules m ON m.id=t.module_id AND m.tenant_id=t.tenant_id
  WHERE t.id=p_template AND
  (m.tenant_id=public.get_user_tenant_id(auth.uid())
   OR public.has_role(auth.uid(),'superadmin'::public.app_role))
  AND (
   public.has_role(auth.uid(),'superadmin'::public.app_role)
   OR public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role))
  )
 )
$manage_uni_lab$;
CREATE OR REPLACE FUNCTION public.can_access_uni_lab_template(p_template uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $access_uni_lab$
 SELECT public.can_manage_uni_lab_template(p_template) OR EXISTS(
  SELECT 1 FROM public.lab_templates t
  JOIN public.modules m ON m.id=t.module_id AND m.tenant_id=t.tenant_id
  JOIN public.student_enrolments e ON e.programme_id=m.programme_id
   AND e.tenant_id=t.tenant_id AND e.student_id=auth.uid() AND e.status='active'
  WHERE t.id=p_template AND t.active=true AND t.published=true
   AND t.tenant_id=public.get_user_tenant_id(auth.uid())
   AND public.has_role(auth.uid(),'student'::public.app_role)
 )
$access_uni_lab$;
CREATE OR REPLACE FUNCTION public.can_manage_uni_lab_run(p_run uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $manage_uni_run$
 SELECT EXISTS(
  SELECT 1 FROM public.lab_class_runs r WHERE r.id=p_run
   AND public.can_manage_uni_lab_template(r.template_id)
   AND (r.lead_instructor_id=auth.uid()
    OR public.has_role(auth.uid(),'centre_director'::public.app_role)
    OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
    OR public.has_role(auth.uid(),'superadmin'::public.app_role)
    OR auth.uid()=ANY(r.ta_user_ids))
 )
$manage_uni_run$;
CREATE OR REPLACE FUNCTION public.can_access_uni_lab_run(p_run uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $access_uni_run$
 SELECT public.can_manage_uni_lab_run(p_run) OR EXISTS(
  SELECT 1 FROM public.lab_class_runs r
  JOIN public.unipathway_lab_run_invitations i
   ON i.class_run_id=r.id AND i.tenant_id=r.tenant_id
   AND i.student_id=auth.uid() AND i.status IN ('invited','accepted')
  WHERE r.id=p_run AND public.can_access_uni_lab_template(r.template_id)
   AND r.status NOT IN ('cancelled','deleted')
 )
$access_uni_run$;
CREATE OR REPLACE FUNCTION public.can_manage_uni_lab_request(p_request uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $manage_uni_lab_req$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_lab_launch_requests req
 WHERE req.id=p_request AND public.can_manage_uni_lab_template(req.template_id))
$manage_uni_lab_req$;

-- Replace broad same-tenant visibility in legacy labs. RLS policies combine by OR,
-- therefore the permissive policies MUST be dropped, not merely supplemented.
DROP POLICY IF EXISTS "lab templates tenant read" ON public.lab_templates;
DROP POLICY IF EXISTS "lab tasks tenant read" ON public.lab_tasks;
DROP POLICY IF EXISTS "lab class tenant read" ON public.lab_class_runs;
DROP POLICY IF EXISTS "lab session own academic read" ON public.lab_sessions;
DROP POLICY IF EXISTS "lab progress own academic read" ON public.lab_task_progress;
DROP POLICY IF EXISTS "lab help own academic read" ON public.lab_help_requests;
DROP POLICY IF EXISTS "lab evidence own academic read" ON public.lab_evidence;

CREATE POLICY "lab templates enrolled student or assigned teacher" ON public.lab_templates
 FOR SELECT TO authenticated USING(public.can_access_uni_lab_template(id));
CREATE POLICY "lab templates assigned teacher create" ON public.lab_templates
 FOR INSERT TO authenticated WITH CHECK(
   module_id IS NOT NULL AND published=false AND created_by=auth.uid()
   AND EXISTS(SELECT 1 FROM public.modules m WHERE m.id=module_id
    AND m.tenant_id=lab_templates.tenant_id AND
    (public.has_role(auth.uid(),'centre_director'::public.app_role)
     OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
     OR public.has_role(auth.uid(),'superadmin'::public.app_role)
     OR (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role)))
    AND public.same_tenant(lab_templates.tenant_id)));
CREATE POLICY "lab templates assigned teacher update" ON public.lab_templates
 FOR UPDATE TO authenticated USING(public.can_manage_uni_lab_template(id))
 WITH CHECK(public.can_manage_uni_lab_template(id));

CREATE POLICY "lab tasks enrolled or assigned teacher" ON public.lab_tasks FOR SELECT TO authenticated
 USING(public.can_access_uni_lab_template(template_id));
CREATE POLICY "lab tasks assigned instructor create" ON public.lab_tasks FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_uni_lab_template(template_id)
  AND tenant_id=(SELECT t.tenant_id FROM public.lab_templates t WHERE t.id=template_id));
CREATE POLICY "lab tasks assigned instructor manage" ON public.lab_tasks FOR UPDATE TO authenticated
 USING(public.can_manage_uni_lab_template(template_id))
 WITH CHECK(public.can_manage_uni_lab_template(template_id));

CREATE POLICY "class run invited or assigned teaching staff" ON public.lab_class_runs FOR SELECT TO authenticated
 USING(public.can_access_uni_lab_run(id));
CREATE POLICY "class run lecturer schedule" ON public.lab_class_runs FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_uni_lab_template(template_id)
  AND tenant_id=(SELECT t.tenant_id FROM public.lab_templates t WHERE t.id=template_id)
  AND (lead_instructor_id=auth.uid() OR public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role))
  AND (live_class_session_id IS NULL OR EXISTS(
    SELECT 1 FROM public.live_class_sessions s JOIN public.lab_templates t ON t.id=template_id
    WHERE s.id=live_class_session_id AND s.module_id=t.module_id AND s.tenant_id=lab_class_runs.tenant_id
  )));
CREATE POLICY "class run owner update" ON public.lab_class_runs FOR UPDATE TO authenticated
 USING(public.can_manage_uni_lab_run(id))
 WITH CHECK(public.can_manage_uni_lab_template(template_id));

CREATE POLICY "class invitation own or lecturer view" ON public.unipathway_lab_run_invitations
 FOR SELECT TO authenticated USING(
   (student_id=auth.uid() AND public.can_access_uni_lab_run(class_run_id))
   OR public.can_manage_uni_lab_run(class_run_id));
-- Bulk invitation assignments are only via audited RPC below.
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_run_invitations FROM anon,authenticated;
CREATE POLICY "lab request student or module teacher view" ON public.unipathway_lab_launch_requests
 FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND public.can_access_uni_lab_template(template_id))
  OR public.can_manage_uni_lab_template(template_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_launch_requests FROM anon,authenticated;
CREATE POLICY "lab support owner or tutor view" ON public.unipathway_lab_support_requests
 FOR SELECT TO authenticated USING(
   (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
   OR public.can_manage_uni_lab_request(launch_request_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_support_requests FROM anon,authenticated;

CREATE POLICY "lab session assigned learner and lecturer" ON public.lab_sessions FOR SELECT TO authenticated
 USING((student_id=auth.uid() AND public.can_access_uni_lab_template(template_id))
  OR public.can_manage_uni_lab_template(template_id));
CREATE POLICY "lab task progress assigned learner and lecturer" ON public.lab_task_progress
 FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.lab_sessions s WHERE s.id=session_id
   AND ((s.student_id=auth.uid() AND public.can_access_uni_lab_template(s.template_id))
    OR public.can_manage_uni_lab_template(s.template_id))));
CREATE POLICY "lab help assigned learner and lecturer" ON public.lab_help_requests
 FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.lab_sessions s WHERE s.id=session_id
   AND ((s.student_id=auth.uid() AND public.can_access_uni_lab_template(s.template_id))
    OR public.can_manage_uni_lab_template(s.template_id))));
CREATE POLICY "lab evidence assigned learner and lecturer" ON public.lab_evidence
 FOR SELECT TO authenticated USING(EXISTS(
  SELECT 1 FROM public.lab_sessions s WHERE s.id=session_id
   AND ((s.student_id=auth.uid() AND public.can_access_uni_lab_template(s.template_id))
    OR public.can_manage_uni_lab_template(s.template_id))));

CREATE OR REPLACE FUNCTION public.invite_enrolled_unipathway_lab_run(p_run uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $invite_uni_lab$
DECLARE r public.lab_class_runs%ROWTYPE; v_students integer;v_count integer;
BEGIN
 SELECT * INTO r FROM public.lab_class_runs WHERE id=p_run FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_lab_run(p_run) THEN
  RAISE EXCEPTION 'Not authorised to invite this class' USING ERRCODE='42501';END IF;
 SELECT count(DISTINCT e.student_id) INTO v_students FROM public.lab_templates t
 JOIN public.modules m ON m.id=t.module_id AND m.tenant_id=t.tenant_id
 JOIN public.student_enrolments e ON e.programme_id=m.programme_id
   AND e.tenant_id=t.tenant_id AND e.status='active'
 WHERE t.id=r.template_id AND t.tenant_id=r.tenant_id;
 IF v_students>1000 THEN
   RAISE EXCEPTION 'Class size exceeds invitation safety limit (1000). Split the cohort.';
 END IF;
 INSERT INTO public.unipathway_lab_run_invitations(class_run_id,tenant_id,student_id,invited_by)
 SELECT DISTINCT r.id,r.tenant_id,e.student_id,auth.uid()
 FROM public.lab_templates t JOIN public.modules m ON m.id=t.module_id AND m.tenant_id=t.tenant_id
 JOIN public.student_enrolments e ON e.programme_id=m.programme_id
    AND e.tenant_id=t.tenant_id AND e.status='active'
 WHERE t.id=r.template_id AND t.tenant_id=r.tenant_id
 ON CONFLICT(class_run_id,student_id) DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END
$invite_uni_lab$;

CREATE OR REPLACE FUNCTION public.request_unipathway_lms_lab(
 p_template uuid,p_mode text,p_class_run uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $request_uni_lab$
DECLARE t public.lab_templates%ROWTYPE;cfg public.lab_provider_configs%ROWTYPE;
 v_count integer;v_active integer;v_existing uuid;v_spend numeric;v_request uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'student'::public.app_role)
  OR NOT public.can_access_uni_lab_template(p_template) THEN
  RAISE EXCEPTION 'Active enrolment and valid course access required' USING ERRCODE='42501';END IF;
 IF p_mode NOT IN ('class','self_study') THEN RAISE EXCEPTION 'Unknown lab access mode'; END IF;
 SELECT * INTO t FROM public.lab_templates WHERE id=p_template;
 IF NOT FOUND OR NOT t.published OR NOT t.active THEN RAISE EXCEPTION 'Lab not published'; END IF;
 IF p_mode='class' THEN
  IF t.access_mode NOT IN ('class_only','both') OR p_class_run IS NULL
   OR NOT public.can_access_uni_lab_run(p_class_run) THEN
   RAISE EXCEPTION 'Class lab invitation required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.lab_class_runs r WHERE r.id=p_class_run
    AND r.template_id=t.id AND r.tenant_id=t.tenant_id AND r.status IN ('scheduled','active'))
  THEN RAISE EXCEPTION 'Lab does not belong to this active class'; END IF;
 ELSE
  IF t.access_mode NOT IN ('self_study','both') OR p_class_run IS NOT NULL THEN
   RAISE EXCEPTION 'Self-study access is not enabled'; END IF;
 END IF;
 -- A consistent lock per student/template prevents duplicate concurrent launch requests.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_template::text,0));
 SELECT id INTO v_existing FROM public.unipathway_lab_launch_requests
 WHERE student_id=auth.uid() AND template_id=p_template
  AND status IN ('awaiting_provider','provisioning','ready','active','paused')
 ORDER BY requested_at DESC LIMIT 1;
 IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
 SELECT count(*) INTO v_count FROM public.unipathway_lab_launch_requests
 WHERE student_id=auth.uid() AND template_id=p_template
  AND status NOT IN ('failed','cancelled');
 IF v_count>=t.max_attempts THEN RAISE EXCEPTION 'Lab attempt allowance used'; END IF;
 SELECT * INTO cfg FROM public.lab_provider_configs WHERE tenant_id=t.tenant_id AND provider=t.provider FOR UPDATE;
 IF NOT FOUND OR cfg.enabled IS NOT TRUE OR cfg.credential_status<>'verified'
    OR cfg.verified_at IS NULL THEN
  RAISE EXCEPTION 'Lab provider is not activated. No cloud resources were started.';
 END IF;
 IF cfg.budget_monthly IS NULL OR cfg.budget_monthly<=0 THEN
  RAISE EXCEPTION 'A monthly lab spend ceiling must be approved before launches';
 END IF;
 SELECT count(*) INTO v_active FROM public.unipathway_lab_launch_requests
 WHERE tenant_id=t.tenant_id AND template_id IN(
   SELECT lt.id FROM public.lab_templates lt WHERE lt.tenant_id=t.tenant_id AND lt.provider=t.provider)
 AND status IN ('awaiting_provider','provisioning','ready','active','paused');
 IF v_active>=cfg.max_concurrent THEN
  RAISE EXCEPTION 'Lab launch capacity is full. Please try again shortly.';
 END IF;
 IF p_class_run IS NOT NULL AND (
   SELECT count(*) FROM public.unipathway_lab_launch_requests
   WHERE class_run_id=p_class_run AND status IN ('awaiting_provider','provisioning','ready','active','paused')
 ) >= (SELECT max_concurrent FROM public.lab_class_runs WHERE id=p_class_run)
 THEN RAISE EXCEPTION 'Class lab capacity is full. Please wait for a free workspace.';END IF;
 SELECT coalesce(sum(estimated_cost_gbp),0) INTO v_spend
 FROM public.unipathway_lab_launch_requests
 WHERE tenant_id=t.tenant_id AND template_id IN(
  SELECT lt.id FROM public.lab_templates lt WHERE lt.tenant_id=t.tenant_id AND lt.provider=t.provider)
  AND requested_at>=date_trunc('month',now())
  AND status NOT IN ('failed','cancelled');
 IF v_spend+t.estimated_cost_gbp>cfg.budget_monthly THEN
  RAISE EXCEPTION 'Monthly lab budget reached. No resources allocated.';
 END IF;
 INSERT INTO public.unipathway_lab_launch_requests
  (tenant_id,template_id,student_id,class_run_id,mode,status,estimated_cost_gbp,expires_at)
 VALUES(t.tenant_id,t.id,auth.uid(),p_class_run,p_mode,'awaiting_provider',t.estimated_cost_gbp,
    now()+make_interval(mins=>least(t.duration_minutes,cfg.hard_stop_minutes)))
 RETURNING id INTO v_request;
 RETURN v_request;
END
$request_uni_lab$;

CREATE OR REPLACE FUNCTION public.request_unipathway_lab_support(
 p_request uuid,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $lab_support$
DECLARE req public.unipathway_lab_launch_requests%ROWTYPE;v_id uuid;
BEGIN
 SELECT * INTO req FROM public.unipathway_lab_launch_requests WHERE id=p_request;
 IF NOT FOUND OR req.student_id<>auth.uid()
  OR NOT public.can_access_uni_lab_template(req.template_id) THEN
  RAISE EXCEPTION 'Lab support restricted to your own enrolled learning' USING ERRCODE='42501';END IF;
 IF p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 4 AND 1600 THEN
  RAISE EXCEPTION 'Please write a question of 4–1600 characters';END IF;
 IF (SELECT count(*) FROM public.unipathway_lab_support_requests
 WHERE student_id=auth.uid() AND requested_at>now()-interval '5 minutes')>=5 THEN
  RAISE EXCEPTION 'Help queue limit reached. Wait for your tutor.';END IF;
 INSERT INTO public.unipathway_lab_support_requests(tenant_id,launch_request_id,student_id,message)
 VALUES(req.tenant_id,req.id,auth.uid(),btrim(p_message)) RETURNING id INTO v_id;
 RETURN v_id;
END
$lab_support$;


-- Self-study learning evidence is independent of paid provider provisioning.
-- A student's draft notes are not verified grades or cloud task completion.
CREATE TABLE IF NOT EXISTS public.unipathway_lab_task_notes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 template_id uuid NOT NULL REFERENCES public.lab_templates(id),
 task_id uuid NOT NULL REFERENCES public.lab_tasks(id),
 notes text NOT NULL DEFAULT '' CHECK(length(notes)<=3000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','reviewed')),
 submitted_at timestamptz,
 reviewer_id uuid,
 reviewer_feedback text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(student_id,task_id)
);
ALTER TABLE public.unipathway_lab_task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student study notes own or assigned instructor read"
 ON public.unipathway_lab_task_notes FOR SELECT TO authenticated
 USING((student_id=auth.uid() AND public.can_access_uni_lab_template(template_id))
   OR public.can_manage_uni_lab_template(template_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_task_notes FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_unipathway_lab_practice_note(
 p_task uuid,p_notes text,p_submit boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $save_uni_note$
DECLARE t public.lab_tasks%ROWTYPE;existing public.unipathway_lab_task_notes%ROWTYPE;v_id uuid;
BEGIN
 SELECT * INTO t FROM public.lab_tasks WHERE id=p_task;
 IF NOT FOUND OR NOT public.has_role(auth.uid(),'student'::public.app_role)
  OR NOT public.can_access_uni_lab_template(t.template_id) THEN
  RAISE EXCEPTION 'Not enrolled in this practical module' USING ERRCODE='42501';
 END IF;
 IF p_notes IS NULL OR length(p_notes)>3000 THEN RAISE EXCEPTION 'Practice note cannot exceed 3000 characters';END IF;
 SELECT * INTO existing FROM public.unipathway_lab_task_notes
 WHERE student_id=auth.uid() AND task_id=p_task FOR UPDATE;
 IF FOUND AND existing.status IN ('submitted','reviewed') THEN
  RAISE EXCEPTION 'This practice evidence has already been submitted for review';
 END IF;
 INSERT INTO public.unipathway_lab_task_notes(tenant_id,student_id,template_id,task_id,notes,status,submitted_at)
 VALUES(t.tenant_id,auth.uid(),t.template_id,t.id,p_notes,
  CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END,
  CASE WHEN p_submit THEN now() ELSE NULL END)
 ON CONFLICT(student_id,task_id) DO UPDATE SET notes=excluded.notes,status=excluded.status,
 submitted_at=excluded.submitted_at,updated_at=now()
 RETURNING id INTO v_id;
 RETURN v_id;
END
$save_uni_note$;

CREATE OR REPLACE FUNCTION public.review_unipathway_lab_practice_note(
 p_note uuid,p_feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $review_uni_note$
DECLARE note public.unipathway_lab_task_notes%ROWTYPE;
BEGIN
 SELECT * INTO note FROM public.unipathway_lab_task_notes WHERE id=p_note FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_lab_template(note.template_id) THEN
  RAISE EXCEPTION 'You are not the assigned lecturer for this lab' USING ERRCODE='42501';END IF;
 IF note.status<>'submitted' THEN RAISE EXCEPTION 'Only submitted evidence can be reviewed';END IF;
 IF p_feedback IS NULL OR length(btrim(p_feedback)) NOT BETWEEN 2 AND 2000
 THEN RAISE EXCEPTION 'Feedback is required';END IF;
 UPDATE public.unipathway_lab_task_notes SET status='reviewed',reviewer_id=auth.uid(),
 reviewer_feedback=btrim(p_feedback),updated_at=now() WHERE id=p_note;
END
$review_uni_note$;

CREATE OR REPLACE FUNCTION public.answer_unipathway_lab_support(
 p_support uuid,p_response text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $answer_uni_lab_help$
DECLARE help public.unipathway_lab_support_requests%ROWTYPE;
BEGIN
 SELECT * INTO help FROM public.unipathway_lab_support_requests WHERE id=p_support FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_lab_request(help.launch_request_id)
 THEN RAISE EXCEPTION 'Lab support is not assigned to you' USING ERRCODE='42501';END IF;
 IF help.status IN ('resolved','cancelled') THEN RAISE EXCEPTION 'Request already closed';END IF;
 IF p_response IS NULL OR length(btrim(p_response)) NOT BETWEEN 2 AND 2000
 THEN RAISE EXCEPTION 'Response is required';END IF;
 UPDATE public.unipathway_lab_support_requests SET status='resolved',
 assigned_lecturer_id=auth.uid(),answered_at=now(),response=btrim(p_response) WHERE id=p_support;
END
$answer_uni_lab_help$;

REVOKE ALL ON FUNCTION public.can_manage_uni_lab_template(uuid),public.can_access_uni_lab_template(uuid),
 public.can_manage_uni_lab_run(uuid),public.can_access_uni_lab_run(uuid),
 public.can_manage_uni_lab_request(uuid),public.invite_enrolled_unipathway_lab_run(uuid),
 public.request_unipathway_lms_lab(uuid,text,uuid),
 public.request_unipathway_lab_support(uuid,text),
 public.save_unipathway_lab_practice_note(uuid,text,boolean),
 public.review_unipathway_lab_practice_note(uuid,text),
 public.answer_unipathway_lab_support(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_uni_lab_template(uuid),public.can_access_uni_lab_template(uuid),
 public.can_manage_uni_lab_run(uuid),public.can_access_uni_lab_run(uuid),
 public.can_manage_uni_lab_request(uuid),public.invite_enrolled_unipathway_lab_run(uuid),
 public.request_unipathway_lms_lab(uuid,text,uuid),
 public.request_unipathway_lab_support(uuid,text),
 public.save_unipathway_lab_practice_note(uuid,text,boolean),
 public.review_unipathway_lab_practice_note(uuid,text),
 public.answer_unipathway_lab_support(uuid,text) TO authenticated;
COMMIT;
