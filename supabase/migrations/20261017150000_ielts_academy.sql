-- UniPathway IELTS preparation: elective for both existing OTHM/Qualifi learners
-- and independently registered external students. No awarding-body or IELTS affiliation implied.
CREATE TABLE public.ielts_study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('academic','general')),
  target_band numeric(3,1) NOT NULL DEFAULT 6.5
    CHECK (target_band BETWEEN 0 AND 9 AND target_band * 2 = trunc(target_band * 2)),
  study_goal text NOT NULL DEFAULT '' CHECK (length(study_goal) <= 1000),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, student_id)
);
CREATE INDEX idx_ielts_plans_tenant ON public.ielts_study_plans(tenant_id,student_id);

CREATE TABLE public.ielts_unit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('academic','general')),
  unit_week smallint NOT NULL CHECK (unit_week BETWEEN 1 AND 8),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,student_id,track,unit_week)
);

CREATE TABLE public.ielts_practice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track text NOT NULL CHECK (track IN ('academic','general')),
  skill text NOT NULL CHECK (skill IN ('listening','reading','writing','speaking','diagnostic','mock')),
  unit_week smallint NOT NULL CHECK (unit_week BETWEEN 1 AND 8),
  answer_text text NOT NULL CHECK (length(btrim(answer_text)) BETWEEN 10 AND 15000),
  teacher_band numeric(3,1) CHECK (teacher_band BETWEEN 0 AND 9 AND teacher_band * 2 = trunc(teacher_band * 2)),
  teacher_feedback text CHECK (length(teacher_feedback) <= 10000),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ielts_review_evidence CHECK (
    teacher_band IS NULL OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND length(btrim(coalesce(teacher_feedback,''))) > 0)
  )
);
CREATE INDEX idx_ielts_practice_teacher_queue ON public.ielts_practice_submissions(tenant_id,submitted_at DESC);
CREATE INDEX idx_ielts_practice_learner ON public.ielts_practice_submissions(tenant_id,student_id,unit_week);

-- Check every submitted learner is an actual member of the same centre, not just an arbitrary UUID.
CREATE FUNCTION public.guard_ielts_learner_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.tenant_id = p.tenant_id
    WHERE p.user_id = NEW.student_id AND p.tenant_id = NEW.tenant_id AND ur.role = 'student'::public.app_role
  ) THEN
    RAISE EXCEPTION 'IELTS learner must have a student account in the centre' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_ielts_plan_identity BEFORE INSERT OR UPDATE ON public.ielts_study_plans
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_learner_identity();
CREATE TRIGGER guard_ielts_completion_identity BEFORE INSERT OR UPDATE ON public.ielts_unit_completions
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_learner_identity();
CREATE TRIGGER guard_ielts_submission_identity BEFORE INSERT OR UPDATE ON public.ielts_practice_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_learner_identity();

-- Only teaching staff may enter practice-band estimates. Students can submit work but not mark it.
CREATE FUNCTION public.guard_ielts_practice_integrity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.teacher_band IS NOT NULL OR NEW.teacher_feedback IS NOT NULL OR
       NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Student submissions cannot contain teacher assessment' USING ERRCODE='42501';
    END IF;
  ELSE
    IF ROW(NEW.tenant_id,NEW.student_id,NEW.track,NEW.skill,NEW.unit_week,NEW.answer_text,NEW.submitted_at)
      IS DISTINCT FROM
       ROW(OLD.tenant_id,OLD.student_id,OLD.track,OLD.skill,OLD.unit_week,OLD.answer_text,OLD.submitted_at) THEN
      RAISE EXCEPTION 'Submitted work is immutable' USING ERRCODE='42501';
    END IF;
    IF NEW.teacher_band IS NOT NULL THEN
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := now();
    ELSE
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_ielts_practice_integrity BEFORE INSERT OR UPDATE ON public.ielts_practice_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_practice_integrity();

ALTER TABLE public.ielts_study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_unit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_practice_submissions ENABLE ROW LEVEL SECURITY;

-- Keep access scoped by tenant and user; staff can review but not impersonate a learner.
CREATE POLICY ielts_plan_own_select ON public.ielts_study_plans FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid());
CREATE POLICY ielts_plan_staff_select ON public.ielts_study_plans FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
   public.has_role(auth.uid(),'lecturer'::public.app_role)));
CREATE POLICY ielts_plan_own_insert ON public.ielts_study_plans FOR INSERT TO authenticated
 WITH CHECK (public.same_tenant(tenant_id) AND student_id = auth.uid());
CREATE POLICY ielts_plan_own_update ON public.ielts_study_plans FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid())
 WITH CHECK (public.same_tenant(tenant_id) AND student_id = auth.uid());

CREATE POLICY ielts_completion_own_select ON public.ielts_unit_completions FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid());
CREATE POLICY ielts_completion_staff_select ON public.ielts_unit_completions FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
   public.has_role(auth.uid(),'lecturer'::public.app_role)));
CREATE POLICY ielts_completion_own_insert ON public.ielts_unit_completions FOR INSERT TO authenticated
 WITH CHECK (public.same_tenant(tenant_id) AND student_id = auth.uid());

CREATE POLICY ielts_submission_own_select ON public.ielts_practice_submissions FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND student_id = auth.uid());
CREATE POLICY ielts_submission_staff_select ON public.ielts_practice_submissions FOR SELECT TO authenticated
 USING (public.same_tenant(tenant_id) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
   public.has_role(auth.uid(),'lecturer'::public.app_role)));
CREATE POLICY ielts_submission_own_insert ON public.ielts_practice_submissions FOR INSERT TO authenticated
 WITH CHECK (public.same_tenant(tenant_id) AND student_id = auth.uid() AND
  teacher_band IS NULL AND teacher_feedback IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY ielts_submission_staff_review ON public.ielts_practice_submissions FOR UPDATE TO authenticated
 USING (public.same_tenant(tenant_id) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
   public.has_role(auth.uid(),'lecturer'::public.app_role)))
 WITH CHECK (public.same_tenant(tenant_id) AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role) OR
   public.has_role(auth.uid(),'superadmin'::public.app_role) OR
   public.has_role(auth.uid(),'programme_leader'::public.app_role) OR
   public.has_role(auth.uid(),'lecturer'::public.app_role)));

GRANT SELECT,INSERT,UPDATE ON public.ielts_study_plans TO authenticated;
GRANT SELECT,INSERT ON public.ielts_unit_completions TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ielts_practice_submissions TO authenticated;

-- Do not place student answers or recordings in the Omniqora event stream.
COMMENT ON TABLE public.ielts_practice_submissions IS 'Independent preparation work; any teacher bands are formative estimates, never official IELTS scores.';
