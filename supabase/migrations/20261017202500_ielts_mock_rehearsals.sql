-- IELTS rehearsal operations: scheduled practice and evidence-based tutor feedback.
-- This is NOT an official IELTS examination, booking, score or test-centre record.
CREATE TABLE public.ielts_mock_rehearsals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 track text NOT NULL CHECK(track IN ('academic','general')),
 rehearsal_type text NOT NULL CHECK(rehearsal_type IN ('short_practice','full_rehearsal')),
 delivery text NOT NULL CHECK(delivery IN ('centre','online')),
 scheduled_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','reviewed','cancelled')),
 assigned_by uuid NOT NULL REFERENCES auth.users(id),
 assessed_by uuid REFERENCES auth.users(id),
 assessed_at timestamptz,
 listening_questions integer CHECK(listening_questions BETWEEN 1 AND 40),
 listening_correct integer CHECK(listening_correct>=0 AND listening_correct<=listening_questions),
 reading_questions integer CHECK(reading_questions BETWEEN 1 AND 40),
 reading_correct integer CHECK(reading_correct>=0 AND reading_correct<=reading_questions),
 writing_observations text CHECK(length(writing_observations)<=5000),
 speaking_observations text CHECK(length(speaking_observations)<=5000),
 tutor_next_steps text CHECK(length(tutor_next_steps)<=5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ielts_mock_evaluation_consistent CHECK(
  (status='reviewed' AND assessed_by IS NOT NULL AND assessed_at IS NOT NULL
    AND length(btrim(coalesce(tutor_next_steps,'')))>=10)
  OR (status<>'reviewed' AND assessed_by IS NULL AND assessed_at IS NULL)
 ),
 CONSTRAINT ielts_full_rehearsal_actual_papers CHECK(status<>'reviewed'
  OR rehearsal_type<>'full_rehearsal'
  OR (listening_questions=40 AND reading_questions=40
    AND length(btrim(coalesce(writing_observations,'')))>=10
    AND length(btrim(coalesce(speaking_observations,'')))>=10))
);
CREATE INDEX ielts_mock_student_tenant ON public.ielts_mock_rehearsals(tenant_id,student_id,scheduled_at DESC);
CREATE INDEX ielts_mock_centre ON public.ielts_mock_rehearsals(tenant_id,scheduled_at DESC);

CREATE FUNCTION public.guard_ielts_mock_rehearsal()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.assessed_by IS NOT NULL OR NEW.assessed_at IS NOT NULL
   OR NEW.status<>'scheduled' OR NEW.listening_correct IS NOT NULL
   OR NEW.reading_correct IS NOT NULL OR NEW.writing_observations IS NOT NULL
   OR NEW.speaking_observations IS NOT NULL OR NEW.tutor_next_steps IS NOT NULL THEN
    RAISE EXCEPTION 'New rehearsal must start as an unassessed schedule' USING ERRCODE='42501';
  END IF;
  NEW.assigned_by:=auth.uid();
 ELSE
  IF ROW(NEW.id,NEW.tenant_id,NEW.student_id,NEW.track,NEW.rehearsal_type,
     NEW.delivery,NEW.scheduled_at,NEW.assigned_by,NEW.created_at)
   IS DISTINCT FROM ROW(OLD.id,OLD.tenant_id,OLD.student_id,OLD.track,OLD.rehearsal_type,
     OLD.delivery,OLD.scheduled_at,OLD.assigned_by,OLD.created_at) THEN
     RAISE EXCEPTION 'Rehearsal scheduling identity is immutable' USING ERRCODE='42501';
  END IF;
  IF OLD.status IN ('reviewed','cancelled') AND NEW.status<>OLD.status THEN
    RAISE EXCEPTION 'A closed rehearsal cannot be reopened or changed' USING ERRCODE='42501';
  END IF;
  IF OLD.status='scheduled' AND NEW.status NOT IN ('scheduled','in_progress','cancelled')
    OR OLD.status='in_progress' AND NEW.status NOT IN ('in_progress','reviewed','cancelled') THEN
    RAISE EXCEPTION 'Invalid rehearsal status transition' USING ERRCODE='42501';
  END IF;
  IF OLD.status IN ('reviewed','cancelled') AND ROW(NEW.listening_questions,NEW.listening_correct,
    NEW.reading_questions,NEW.reading_correct,NEW.writing_observations,NEW.speaking_observations,NEW.tutor_next_steps)
   IS DISTINCT FROM ROW(OLD.listening_questions,OLD.listening_correct,
    OLD.reading_questions,OLD.reading_correct,OLD.writing_observations,OLD.speaking_observations,OLD.tutor_next_steps) THEN
    RAISE EXCEPTION 'Closed rehearsal evidence is immutable' USING ERRCODE='42501';
  END IF;
 END IF;
 IF NEW.status='reviewed' THEN
  IF NEW.listening_questions IS NULL OR NEW.reading_questions IS NULL
    OR NEW.listening_correct IS NULL OR NEW.reading_correct IS NULL THEN
    RAISE EXCEPTION 'Raw paper counts are required to review a rehearsal';
  END IF;
  IF TG_OP='UPDATE' AND OLD.status<>'reviewed' THEN
    NEW.assessed_by:=auth.uid();NEW.assessed_at:=now();
  END IF;
 ELSE
  NEW.assessed_by:=NULL;NEW.assessed_at:=NULL;
 END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
CREATE TRIGGER guard_ielts_mock_rehearsal BEFORE INSERT OR UPDATE ON public.ielts_mock_rehearsals
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_mock_rehearsal();
CREATE TRIGGER guard_ielts_mock_learner BEFORE INSERT OR UPDATE ON public.ielts_mock_rehearsals
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_learner_identity();
REVOKE ALL ON FUNCTION public.guard_ielts_mock_rehearsal() FROM PUBLIC;

ALTER TABLE public.ielts_mock_rehearsals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mock learner read" ON public.ielts_mock_rehearsals FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND student_id=auth.uid());
CREATE POLICY "mock teacher read" ON public.ielts_mock_rehearsals FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'lecturer'::public.app_role)
 OR public.has_role(auth.uid(),'exams_officer'::public.app_role)
 OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "mock teacher create" ON public.ielts_mock_rehearsals FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'exams_officer'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "mock teacher update" ON public.ielts_mock_rehearsals FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'exams_officer'::public.app_role)
 OR public.has_role(auth.uid(),'lecturer'::public.app_role)
 OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
 public.has_role(auth.uid(),'exams_officer'::public.app_role)
 OR public.has_role(auth.uid(),'lecturer'::public.app_role)
 OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
 OR public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
GRANT SELECT,INSERT,UPDATE ON public.ielts_mock_rehearsals TO authenticated;
COMMENT ON TABLE public.ielts_mock_rehearsals IS
'Independent rehearsals; raw correct-answer counts and tutor observations only. No official IELTS band conversion.';
