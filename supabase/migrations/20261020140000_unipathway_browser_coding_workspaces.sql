-- UniPathway standalone browser coding practice + enrolled LMS submissions.
-- No AWS, container provider or external account is required to EDIT, PREVIEW
-- HTML/JavaScript, save learner work, submit and receive tutor feedback.
-- STAGING ONLY. Requires 20261020130000 lab entitlement migration and base tables.
BEGIN;

ALTER TABLE public.lab_tasks
 ADD COLUMN IF NOT EXISTS exercise_kind text NOT NULL DEFAULT 'practical'
 CHECK(exercise_kind IN ('practical','coding','reading'));
ALTER TABLE public.lab_tasks
 ADD COLUMN IF NOT EXISTS coding_language text
 CHECK(coding_language IN ('html','javascript','python','sql','bash','text'));
ALTER TABLE public.lab_tasks
 ADD COLUMN IF NOT EXISTS starter_code text
 CHECK(starter_code IS NULL OR length(starter_code)<=20000);
ALTER TABLE public.lab_tasks
 ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'none'
 CHECK(execution_mode IN ('none','browser','provider'));
ALTER TABLE public.lab_tasks
 ADD CONSTRAINT lab_coding_runtime_consistency
 CHECK(
  (exercise_kind='coding' AND coding_language IS NOT NULL
   AND (execution_mode<>'browser' OR coding_language IN ('html','javascript')))
  OR (exercise_kind<>'coding' AND coding_language IS NULL AND execution_mode='none')
 );

-- Students may save drafts only for published exercises in programmes in which
-- they have an active enrolment. Everything is tenant-scoped server-side.
CREATE TABLE IF NOT EXISTS public.unipathway_lab_code_workspaces(
 student_id uuid NOT NULL,
 task_id uuid NOT NULL REFERENCES public.lab_tasks(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 template_id uuid NOT NULL REFERENCES public.lab_templates(id),
 code text NOT NULL DEFAULT '' CHECK(length(code)<=20000),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 status text NOT NULL DEFAULT 'draft'
  CHECK(status IN ('draft','submitted','reviewed')),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 reviewer_id uuid,
 reviewer_feedback text CHECK(reviewer_feedback IS NULL OR length(reviewer_feedback)<=2000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(student_id,task_id)
);
CREATE INDEX IF NOT EXISTS lab_code_review_queue_idx
 ON public.unipathway_lab_code_workspaces(template_id,status,updated_at DESC);
ALTER TABLE public.unipathway_lab_code_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student own or allocated lecturer code workspace read"
 ON public.unipathway_lab_code_workspaces FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND public.can_access_uni_lab_template(template_id))
  OR public.can_manage_uni_lab_template(template_id)
 );
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_code_workspaces
 FROM anon,authenticated;

-- Immutable metadata-only audit; do not duplicate student code into logs.
CREATE TABLE IF NOT EXISTS public.unipathway_lab_code_activity(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 template_id uuid NOT NULL REFERENCES public.lab_templates(id),
 task_id uuid NOT NULL REFERENCES public.lab_tasks(id) ON DELETE CASCADE,
 student_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('saved','submitted','reviewed')),
 revision integer NOT NULL CHECK(revision>=1),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_code_activity_student_idx
 ON public.unipathway_lab_code_activity(student_id,task_id,occurred_at DESC);
ALTER TABLE public.unipathway_lab_code_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "code activity own learner or assigned tutor read"
 ON public.unipathway_lab_code_activity FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND public.can_access_uni_lab_template(template_id))
  OR public.can_manage_uni_lab_template(template_id)
 );
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_lab_code_activity FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_unipathway_lab_code(
 p_task uuid,p_code text,p_submit boolean DEFAULT false)
RETURNS TABLE(saved_status text,saved_revision integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $save_lab_code$
DECLARE t public.lab_tasks%ROWTYPE; m public.lab_templates%ROWTYPE;
 existing public.unipathway_lab_code_workspaces%ROWTYPE;
 v_revision integer;v_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'student'::public.app_role)
  THEN RAISE EXCEPTION 'Student sign-in required' USING ERRCODE='42501';END IF;
 SELECT * INTO t FROM public.lab_tasks WHERE id=p_task;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exercise unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO m FROM public.lab_templates WHERE id=t.template_id;
 IF NOT FOUND OR m.tenant_id<>t.tenant_id OR m.active IS NOT TRUE
   OR m.published IS NOT TRUE OR t.exercise_kind<>'coding'
   OR NOT public.can_access_uni_lab_template(m.id)
 THEN RAISE EXCEPTION 'No access to this published coding exercise' USING ERRCODE='42501';END IF;
 IF p_code IS NULL OR length(p_code)>20000 THEN
  RAISE EXCEPTION 'Code must contain at most 20,000 characters';
 END IF;
 IF p_submit AND length(btrim(p_code))=0 THEN
  RAISE EXCEPTION 'Write your solution before submitting';
 END IF;
 -- One serialised save per student/task; do not overwrite work after submission.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_task::text,0));
 SELECT * INTO existing FROM public.unipathway_lab_code_workspaces
  WHERE student_id=auth.uid() AND task_id=p_task FOR UPDATE;
 IF FOUND AND existing.status<>'draft' THEN
  RAISE EXCEPTION 'This exercise is already submitted or reviewed';
 END IF;
 v_revision:=CASE WHEN FOUND THEN existing.revision+1 ELSE 1 END;
 v_status:=CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END;
 INSERT INTO public.unipathway_lab_code_workspaces
  (student_id,task_id,tenant_id,template_id,code,revision,status,submitted_at)
 VALUES(auth.uid(),p_task,t.tenant_id,t.template_id,p_code,v_revision,v_status,
  CASE WHEN p_submit THEN now() ELSE NULL END)
 ON CONFLICT(student_id,task_id) DO UPDATE SET
  code=excluded.code,revision=excluded.revision,status=excluded.status,
  submitted_at=excluded.submitted_at,updated_at=now();
 INSERT INTO public.unipathway_lab_code_activity
  (tenant_id,template_id,task_id,student_id,actor_id,action,revision)
 VALUES(t.tenant_id,t.template_id,p_task,auth.uid(),auth.uid(),
  CASE WHEN p_submit THEN 'submitted' ELSE 'saved' END,v_revision);
 saved_status:=v_status;saved_revision:=v_revision;RETURN NEXT;
END
$save_lab_code$;

CREATE OR REPLACE FUNCTION public.review_unipathway_lab_code(
 p_task uuid,p_student uuid,p_feedback text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $review_lab_code$
DECLARE w public.unipathway_lab_code_workspaces%ROWTYPE;
BEGIN
 SELECT * INTO w FROM public.unipathway_lab_code_workspaces
 WHERE task_id=p_task AND student_id=p_student FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_lab_template(w.template_id)
 THEN RAISE EXCEPTION 'Not assigned to review this lab exercise' USING ERRCODE='42501';END IF;
 IF w.status<>'submitted' THEN RAISE EXCEPTION 'Only submitted code can be reviewed';END IF;
 IF p_feedback IS NULL OR length(btrim(p_feedback)) NOT BETWEEN 2 AND 2000
 THEN RAISE EXCEPTION 'Tutor feedback must contain 2–2000 characters';END IF;
 UPDATE public.unipathway_lab_code_workspaces
 SET status='reviewed',reviewer_id=auth.uid(),reviewer_feedback=btrim(p_feedback),
  reviewed_at=now(),updated_at=now()
 WHERE task_id=p_task AND student_id=p_student;
 INSERT INTO public.unipathway_lab_code_activity
  (tenant_id,template_id,task_id,student_id,actor_id,action,revision)
 VALUES(w.tenant_id,w.template_id,p_task,p_student,auth.uid(),'reviewed',w.revision);
END
$review_lab_code$;

REVOKE ALL ON FUNCTION public.save_unipathway_lab_code(uuid,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_unipathway_lab_code(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_unipathway_lab_code(uuid,text,boolean),
 public.review_unipathway_lab_code(uuid,uuid,text) TO authenticated;
COMMIT;
