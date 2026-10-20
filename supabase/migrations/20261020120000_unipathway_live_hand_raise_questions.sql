-- UniPathway large-lecture classroom interaction: hand raises and moderated Q&A.
-- Must run AFTER invitation-only classroom + whiteboard migrations in isolated staging.
-- No changes to Microsoft microphones or Teams meeting participant permissions.
BEGIN;

CREATE TABLE IF NOT EXISTS public.live_class_hand_requests (
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'raised' CHECK (status IN ('raised','called','lowered','dismissed')),
 raised_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 responded_by uuid,
 responded_at timestamptz,
 PRIMARY KEY(session_id,student_id)
);
CREATE INDEX IF NOT EXISTS live_class_hand_queue_idx ON public.live_class_hand_requests(session_id,status,raised_at);
ALTER TABLE public.live_class_hand_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student sees own raised hand and lecturer sees queue" ON public.live_class_hand_requests
 FOR SELECT TO authenticated USING(
   (student_id=auth.uid() AND public.can_join_unipathway_class(session_id))
   OR public.can_manage_unipathway_class(session_id)
 );
REVOKE INSERT,UPDATE,DELETE ON public.live_class_hand_requests FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.live_class_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','answered','hidden')),
 answer text,
 answered_by uuid,
 answered_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_class_questions_queue_idx ON public.live_class_questions(session_id,status,created_at,id);
CREATE INDEX IF NOT EXISTS live_class_questions_student_idx ON public.live_class_questions(student_id,created_at DESC);
ALTER TABLE public.live_class_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student sees own questions lecturer sees moderated queue" ON public.live_class_questions
 FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND public.can_join_unipathway_class(session_id))
  OR public.can_manage_unipathway_class(session_id)
 );
REVOKE INSERT,UPDATE,DELETE ON public.live_class_questions FROM anon,authenticated;

-- Publicly discussed teaching Q&A never exposes original student ID or hidden
-- questions; lecturers explicitly choose whether to share an answer with class.
CREATE TABLE IF NOT EXISTS public.live_class_published_answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 source_question_id uuid NOT NULL UNIQUE REFERENCES public.live_class_questions(id) ON DELETE CASCADE,
 question_text text NOT NULL,
 answer_text text NOT NULL,
 published_by uuid NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_class_public_answers_idx ON public.live_class_published_answers(session_id,published_at DESC);
ALTER TABLE public.live_class_published_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invited students read teacher published class answers" ON public.live_class_published_answers
 FOR SELECT TO authenticated USING(public.can_join_unipathway_class(session_id));
REVOKE INSERT,UPDATE,DELETE ON public.live_class_published_answers FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_unipathway_hand_raise(p_session uuid,p_action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $hand_raise$
DECLARE v_tenant uuid;v_previous public.live_class_hand_requests%ROWTYPE;
BEGIN
 IF p_action NOT IN ('raise','lower') THEN RAISE EXCEPTION 'Invalid hand action'; END IF;
 IF NOT public.has_role(auth.uid(),'student'::public.app_role)
 OR NOT public.can_join_unipathway_class(p_session) THEN
  RAISE EXCEPTION 'Enrolled and invited student role required' USING ERRCODE='42501';
 END IF;
 SELECT tenant_id INTO v_tenant FROM public.live_class_sessions WHERE id=p_session;
 SELECT * INTO v_previous FROM public.live_class_hand_requests
 WHERE session_id=p_session AND student_id=auth.uid() FOR UPDATE;
 IF p_action='raise' THEN
  IF FOUND AND v_previous.status IN ('raised','called') THEN RETURN v_previous.status; END IF;
  IF FOUND AND v_previous.updated_at>now()-interval '12 seconds' THEN
   RAISE EXCEPTION 'Please wait before raising your hand again';
  END IF;
  INSERT INTO public.live_class_hand_requests
    (session_id,tenant_id,student_id,status,raised_at,updated_at,responded_at,responded_by)
  VALUES(p_session,v_tenant,auth.uid(),'raised',now(),now(),NULL,NULL)
  ON CONFLICT(session_id,student_id) DO UPDATE
   SET status='raised',raised_at=now(),updated_at=now(),responded_at=NULL,responded_by=NULL;
  RETURN 'raised';
 END IF;
 IF NOT FOUND OR v_previous.status IN ('lowered','dismissed') THEN RETURN 'lowered'; END IF;
 UPDATE public.live_class_hand_requests
  SET status='lowered',updated_at=now()
 WHERE session_id=p_session AND student_id=auth.uid();
 RETURN 'lowered';
END
$hand_raise$;

CREATE OR REPLACE FUNCTION public.respond_unipathway_hand_raise(p_session uuid,p_student uuid,p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $moderate_hand$
BEGIN
 IF NOT public.can_manage_unipathway_class(p_session) THEN
  RAISE EXCEPTION 'Assigned teaching permission required' USING ERRCODE='42501';
 END IF;
 IF p_action NOT IN ('called','dismissed') THEN RAISE EXCEPTION 'Invalid lecturer action'; END IF;
 UPDATE public.live_class_hand_requests SET status=p_action,updated_at=now(),
 responded_by=auth.uid(),responded_at=now()
 WHERE session_id=p_session AND student_id=p_student AND status='raised';
 IF NOT FOUND THEN RAISE EXCEPTION 'Student has not raised a hand'; END IF;
END
$moderate_hand$;

CREATE OR REPLACE FUNCTION public.submit_unipathway_class_question(p_session uuid,p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $student_question$
DECLARE v_tenant uuid;v_count integer;v_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'student'::public.app_role)
 OR NOT public.can_join_unipathway_class(p_session) THEN
  RAISE EXCEPTION 'Enrolled and invited student role required' USING ERRCODE='42501';
 END IF;
 IF p_body IS NULL OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 1000 THEN
  RAISE EXCEPTION 'Question must contain 1–1000 characters';
 END IF;
 -- Serialise requests per student/session so concurrent browser sends cannot
 -- bypass the 3-per-minute limit.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_session::text,0));
 SELECT count(*) INTO v_count FROM public.live_class_questions
 WHERE session_id=p_session AND student_id=auth.uid()
  AND created_at>now()-interval '60 seconds';
 IF v_count>=3 THEN RAISE EXCEPTION 'Question rate limit reached, please wait'; END IF;
 SELECT tenant_id INTO v_tenant FROM public.live_class_sessions WHERE id=p_session;
 INSERT INTO public.live_class_questions(session_id,tenant_id,student_id,body)
 VALUES(p_session,v_tenant,auth.uid(),btrim(p_body)) RETURNING id INTO v_id;
 RETURN v_id;
END
$student_question$;

CREATE OR REPLACE FUNCTION public.answer_unipathway_class_question(
 p_question uuid,p_answer text,p_publish boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $teacher_answer$
DECLARE v_question public.live_class_questions%ROWTYPE;
BEGIN
 SELECT * INTO v_question FROM public.live_class_questions WHERE id=p_question FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_unipathway_class(v_question.session_id) THEN
  RAISE EXCEPTION 'Class question is not authorised' USING ERRCODE='42501';
 END IF;
 IF p_answer IS NULL OR char_length(btrim(p_answer)) NOT BETWEEN 1 AND 2000 THEN
  RAISE EXCEPTION 'Answer must contain 1–2000 characters';
 END IF;
 UPDATE public.live_class_questions SET answer=btrim(p_answer),status='answered',
  answered_by=auth.uid(),answered_at=now(),updated_at=now() WHERE id=p_question;
 IF p_publish THEN
  INSERT INTO public.live_class_published_answers
   (session_id,tenant_id,source_question_id,question_text,answer_text,published_by)
  VALUES(v_question.session_id,v_question.tenant_id,v_question.id,
   v_question.body,btrim(p_answer),auth.uid())
  ON CONFLICT(source_question_id) DO UPDATE SET
   answer_text=excluded.answer_text,published_by=excluded.published_by,published_at=now();
 END IF;
END
$teacher_answer$;

-- One secure change notification for each write. No unapproved student
-- question content or identities are ever sent over Realtime Broadcast.
CREATE POLICY "private UniPathway classroom interaction viewers" ON realtime.messages
 FOR SELECT TO authenticated USING(
  extension='broadcast'
  AND realtime.topic() LIKE 'unipathway:classroom:%'
  AND EXISTS (
   SELECT 1 FROM public.live_class_sessions s
   WHERE realtime.topic()='unipathway:classroom:'||s.id::text
   AND public.can_join_unipathway_class(s.id)
  )
 );
CREATE OR REPLACE FUNCTION public.signal_unipathway_classroom_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $interaction_signal$
BEGIN
 -- A class of 300 should not fan-out 300 simultaneous raised-hand or
 -- incoming-question notifications to all other students. The lecturer queue
 -- polls every 10 seconds; publish only moderator decisions/replies to viewers.
 IF TG_ARGV[0]='hand' AND NEW.status='raised' THEN RETURN NEW; END IF;
 IF TG_ARGV[0]='question' AND NEW.status='submitted' THEN RETURN NEW; END IF;
 BEGIN
  PERFORM realtime.send(
   jsonb_build_object('sessionId',NEW.session_id,'kind',TG_ARGV[0]),
   'refresh','unipathway:classroom:'||NEW.session_id::text,true
  );
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Classroom interaction notification unavailable; use polling fallback';
 END;
 RETURN NEW;
END
$interaction_signal$;
CREATE TRIGGER notify_unipathway_hand AFTER INSERT OR UPDATE ON public.live_class_hand_requests
 FOR EACH ROW EXECUTE FUNCTION public.signal_unipathway_classroom_update('hand');
CREATE TRIGGER notify_unipathway_question AFTER INSERT OR UPDATE ON public.live_class_questions
 FOR EACH ROW EXECUTE FUNCTION public.signal_unipathway_classroom_update('question');
CREATE TRIGGER notify_unipathway_answer AFTER INSERT OR UPDATE ON public.live_class_published_answers
 FOR EACH ROW EXECUTE FUNCTION public.signal_unipathway_classroom_update('published_answer');

REVOKE ALL ON FUNCTION public.set_unipathway_hand_raise(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.respond_unipathway_hand_raise(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_unipathway_class_question(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.answer_unipathway_class_question(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_unipathway_hand_raise(uuid,text),
 public.respond_unipathway_hand_raise(uuid,uuid,text),
 public.submit_unipathway_class_question(uuid,text),
 public.answer_unipathway_class_question(uuid,text,boolean)
 TO authenticated;
COMMIT;
