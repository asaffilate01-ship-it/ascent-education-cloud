-- Independent appeal and grade-amendment controls for the UniPathway assessment workflow.
-- STAGING ONLY. Requires 20261020150000_unipathway_independent_assessment.sql.
-- Approved result is NEVER overwritten. Grade correction is a new signed record.
BEGIN;
CREATE TABLE IF NOT EXISTS public.unipathway_assessment_appeal_policies(
 brief_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_briefs(id),
 tenant_id uuid NOT NULL,
 window_days integer NOT NULL CHECK(window_days BETWEEN 1 AND 90),
 policy_reference text NOT NULL CHECK(length(btrim(policy_reference)) BETWEEN 8 AND 240),
 approved_by uuid NOT NULL,
 approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_appeal_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved appeal rules read only by student and authorised academics"
 ON public.unipathway_assessment_appeal_policies FOR SELECT TO authenticated USING(
 public.can_study_uni_assessment(brief_id)
 OR public.can_manage_uni_assessment(brief_id)
 OR public.can_review_uni_assessment_brief(brief_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_appeal_policies FROM anon,authenticated;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_appeals(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 attempt_id uuid NOT NULL UNIQUE REFERENCES public.unipathway_assessment_released_results(attempt_id),
 brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id),
 student_id uuid NOT NULL,
 grounds text NOT NULL CHECK(grounds IN ('rubric_application','procedural_error','clerical_error')),
 details text NOT NULL CHECK(length(btrim(details)) BETWEEN 50 AND 10000),
 status text NOT NULL DEFAULT 'submitted'
 CHECK(status IN ('submitted','under_review','recommendation','closed','referred')),
 reviewer_id uuid,
 assigned_by uuid,
 assigned_at timestamptz,
 requested_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uni_assessment_appeals_staff_idx
 ON public.unipathway_assessment_appeals(tenant_id,status,requested_at);
ALTER TABLE public.unipathway_assessment_appeals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_appeal_reviews(
 appeal_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_appeals(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 reviewer_id uuid NOT NULL,
 recommendation text NOT NULL CHECK(recommendation IN ('confirm','correct')),
 proposed_raw_score numeric CHECK(proposed_raw_score BETWEEN 0 AND 100),
 reasoning text NOT NULL CHECK(length(btrim(reasoning)) BETWEEN 70 AND 6000),
 proposed_feedback text,
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 CHECK((recommendation='confirm' AND proposed_raw_score IS NULL)
  OR (recommendation='correct' AND proposed_raw_score IS NOT NULL
   AND proposed_feedback IS NOT NULL AND length(btrim(proposed_feedback))>=40))
);
ALTER TABLE public.unipathway_assessment_appeal_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_appeal_outcomes(
 appeal_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_appeals(id),
 tenant_id uuid NOT NULL,
 approved_by uuid NOT NULL,
 approved boolean NOT NULL,
 final_outcome text NOT NULL CHECK(final_outcome IN ('confirmed','amended','referred')),
 final_reasoning text NOT NULL CHECK(length(btrim(final_reasoning)) BETWEEN 60 AND 6000),
 decided_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_appeal_outcomes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_grade_amendments(
 attempt_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_released_results(attempt_id),
 appeal_id uuid NOT NULL UNIQUE REFERENCES public.unipathway_assessment_appeals(id),
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 brief_id uuid NOT NULL,
 original_raw_score numeric NOT NULL,
 original_final_score numeric NOT NULL,
 corrected_raw_score numeric NOT NULL CHECK(corrected_raw_score BETWEEN 0 AND 100),
 retained_penalty_points numeric NOT NULL CHECK(retained_penalty_points BETWEEN 0 AND 100),
 corrected_final_score numeric NOT NULL CHECK(corrected_final_score BETWEEN 0 AND 100),
 corrected_feedback text NOT NULL,
 reviewer_id uuid NOT NULL,
 approved_by uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_grade_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student own appeal or assigned reviewer or manager"
 ON public.unipathway_assessment_appeals FOR SELECT TO authenticated USING(
 (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
 OR (reviewer_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))
 OR public.can_manage_uni_assessment(brief_id));
CREATE POLICY "review confidential until recorded decision"
 ON public.unipathway_assessment_appeal_reviews FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.unipathway_assessment_appeals a
 WHERE a.id=appeal_id AND a.tenant_id=tenant_id
 AND ((a.reviewer_id=auth.uid()
   AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))
  OR public.can_manage_uni_assessment(a.brief_id))));
CREATE POLICY "appeal final answer visible to original learner and management"
 ON public.unipathway_assessment_appeal_outcomes FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.unipathway_assessment_appeals a
 WHERE a.id=appeal_id AND a.tenant_id=tenant_id
 AND ((a.student_id=auth.uid()
  AND tenant_id=public.get_user_tenant_id(auth.uid()))
  OR public.can_manage_uni_assessment(a.brief_id))));
CREATE POLICY "signed amendment own result and authorised management"
 ON public.unipathway_assessment_grade_amendments FOR SELECT TO authenticated USING(
 (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
 OR public.can_manage_uni_assessment(brief_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_appeals FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_appeal_reviews FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_appeal_outcomes FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_grade_amendments FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.approve_unipathway_appeal_policy(
 p_brief uuid,p_days integer,p_policy text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $appeal_policy$
DECLARE b public.unipathway_assessment_briefs%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=p_brief;
 IF NOT FOUND OR NOT public.can_manage_uni_assessment(p_brief)
  THEN RAISE EXCEPTION 'Academic management permission required' USING ERRCODE='42501';END IF;
 IF b.status<>'published' OR p_days NOT BETWEEN 1 AND 90 OR p_policy IS NULL
  OR length(btrim(p_policy)) NOT BETWEEN 8 AND 240 THEN
  RAISE EXCEPTION 'A published brief and verified appeal rule are required';END IF;
 IF EXISTS(SELECT 1 FROM public.unipathway_assessment_released_results
  WHERE brief_id=p_brief) THEN
  RAISE EXCEPTION 'Cannot alter appeal policy after first released result';END IF;
 INSERT INTO public.unipathway_assessment_appeal_policies
 (brief_id,tenant_id,window_days,policy_reference,approved_by)
 VALUES(b.id,b.tenant_id,p_days,btrim(p_policy),auth.uid());
END
$appeal_policy$;

CREATE OR REPLACE FUNCTION public.request_unipathway_grade_appeal(
 p_attempt uuid,p_grounds text,p_details text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $request_appeal$
DECLARE r public.unipathway_assessment_released_results%ROWTYPE;
 p public.unipathway_assessment_appeal_policies%ROWTYPE;v_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'student'::public.app_role)
  THEN RAISE EXCEPTION 'Student role required' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM public.unipathway_assessment_released_results
 WHERE attempt_id=p_attempt;
 IF NOT FOUND OR r.student_id<>auth.uid()
  OR r.tenant_id<>public.get_user_tenant_id(auth.uid()) THEN
  RAISE EXCEPTION 'Only your own released results can be appealed' USING ERRCODE='42501';END IF;
 SELECT * INTO p FROM public.unipathway_assessment_appeal_policies WHERE brief_id=r.brief_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No approved online appeal window is configured';END IF;
 IF now()>r.released_at+make_interval(days=>p.window_days)
  THEN RAISE EXCEPTION 'The published appeal window has closed';END IF;
 IF p_grounds NOT IN ('rubric_application','procedural_error','clerical_error')
  OR p_details IS NULL OR length(btrim(p_details)) NOT BETWEEN 50 AND 10000 THEN
  RAISE EXCEPTION 'Valid reasoned appeal grounds are required';END IF;
 INSERT INTO public.unipathway_assessment_appeals
 (tenant_id,attempt_id,brief_id,student_id,grounds,details)
 VALUES(r.tenant_id,r.attempt_id,r.brief_id,auth.uid(),p_grounds,btrim(p_details))
 RETURNING id INTO v_id;
 RETURN v_id;
END
$request_appeal$;

CREATE OR REPLACE FUNCTION public.assign_unipathway_appeal_reviewer(
 p_appeal uuid,p_reviewer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $assign_appeal$
DECLARE a public.unipathway_assessment_appeals%ROWTYPE;
 b public.unipathway_assessment_briefs%ROWTYPE;
 r public.unipathway_assessment_released_results%ROWTYPE;
 m public.unipathway_assessment_human_marks%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.unipathway_assessment_appeals
 WHERE id=p_appeal FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_assessment(a.brief_id)
  THEN RAISE EXCEPTION 'Only authorised managers may assign an appeal reviewer' USING ERRCODE='42501';END IF;
 IF a.status<>'submitted' THEN RAISE EXCEPTION 'Appeal is already assigned';END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=a.brief_id;
 SELECT * INTO r FROM public.unipathway_assessment_released_results WHERE attempt_id=a.attempt_id;
 SELECT * INTO m FROM public.unipathway_assessment_human_marks WHERE attempt_id=a.attempt_id;
 IF p_reviewer IS NULL OR p_reviewer IN (a.student_id,b.lecturer_id,r.released_by,m.marker_id,auth.uid())
  OR NOT EXISTS(SELECT 1 FROM public.user_roles u WHERE u.user_id=p_reviewer
   AND u.tenant_id=a.tenant_id AND u.role='iqa_officer'::public.app_role)
 THEN RAISE EXCEPTION 'An independent second IQA reviewer is required';END IF;
 UPDATE public.unipathway_assessment_appeals SET reviewer_id=p_reviewer,
 assigned_by=auth.uid(),assigned_at=now(),status='under_review',updated_at=now()
 WHERE id=a.id;
END
$assign_appeal$;

CREATE OR REPLACE FUNCTION public.record_unipathway_appeal_review(
 p_appeal uuid,p_recommendation text,p_raw_score numeric,
 p_reasoning text,p_feedback text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $review_appeal$
DECLARE a public.unipathway_assessment_appeals%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.unipathway_assessment_appeals
 WHERE id=p_appeal FOR UPDATE;
 IF NOT FOUND OR a.status<>'under_review'
 OR a.reviewer_id<>auth.uid() OR a.tenant_id<>public.get_user_tenant_id(auth.uid())
 OR NOT public.has_role(auth.uid(),'iqa_officer'::public.app_role)
 THEN RAISE EXCEPTION 'This appeal is not assigned to your independent IQA role' USING ERRCODE='42501';END IF;
 IF p_reasoning IS NULL OR length(btrim(p_reasoning)) NOT BETWEEN 70 AND 6000
 OR (p_recommendation='confirm' AND p_raw_score IS NOT NULL)
 OR (p_recommendation='correct' AND (
  p_raw_score IS NULL OR p_raw_score NOT BETWEEN 0 AND 100
  OR p_feedback IS NULL OR length(btrim(p_feedback))<40))
 OR p_recommendation NOT IN ('confirm','correct') THEN
  RAISE EXCEPTION 'Complete evidence-based review and corrected marks required';END IF;
 INSERT INTO public.unipathway_assessment_appeal_reviews
 (appeal_id,tenant_id,reviewer_id,recommendation,proposed_raw_score,reasoning,proposed_feedback)
 VALUES(a.id,a.tenant_id,auth.uid(),p_recommendation,p_raw_score,btrim(p_reasoning),p_feedback);
 UPDATE public.unipathway_assessment_appeals SET status='recommendation',updated_at=now() WHERE id=a.id;
END
$review_appeal$;

CREATE OR REPLACE FUNCTION public.finalise_unipathway_grade_appeal(
 p_appeal uuid,p_accept boolean,p_reasoning text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $finalise_appeal$
DECLARE a public.unipathway_assessment_appeals%ROWTYPE;
 v public.unipathway_assessment_appeal_reviews%ROWTYPE;
 r public.unipathway_assessment_released_results%ROWTYPE;
 b public.unipathway_assessment_briefs%ROWTYPE;
 m public.unipathway_assessment_human_marks%ROWTYPE;
 v_outcome text;
BEGIN
 SELECT * INTO a FROM public.unipathway_assessment_appeals WHERE id=p_appeal FOR UPDATE;
 IF NOT FOUND OR a.status<>'recommendation'
  OR a.tenant_id<>public.get_user_tenant_id(auth.uid())
  OR NOT public.has_role(auth.uid(),'centre_director'::public.app_role)
 THEN RAISE EXCEPTION 'A separate centre-director sign-off is required' USING ERRCODE='42501';END IF;
 SELECT * INTO v FROM public.unipathway_assessment_appeal_reviews WHERE appeal_id=a.id;
 SELECT * INTO r FROM public.unipathway_assessment_released_results WHERE attempt_id=a.attempt_id;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=a.brief_id;
 SELECT * INTO m FROM public.unipathway_assessment_human_marks WHERE attempt_id=a.attempt_id;
 IF auth.uid() IN (a.student_id,a.reviewer_id,r.released_by,b.lecturer_id,m.marker_id,a.assigned_by)
 THEN RAISE EXCEPTION 'Second signatory must be independent of teaching, marking, allocation and appeal review';END IF;
 IF p_reasoning IS NULL OR length(btrim(p_reasoning)) NOT BETWEEN 60 AND 6000
 OR p_accept IS NULL THEN RAISE EXCEPTION 'Document an explicit signed appeal decision';END IF;
 v_outcome:=CASE WHEN NOT p_accept THEN 'referred'
  WHEN v.recommendation='correct' THEN 'amended' ELSE 'confirmed' END;
 INSERT INTO public.unipathway_assessment_appeal_outcomes
 (appeal_id,tenant_id,approved_by,approved,final_outcome,final_reasoning)
 VALUES(a.id,a.tenant_id,auth.uid(),p_accept,v_outcome,btrim(p_reasoning));
 IF v_outcome='amended' THEN
  INSERT INTO public.unipathway_assessment_grade_amendments(
  attempt_id,appeal_id,tenant_id,student_id,brief_id,
  original_raw_score,original_final_score,corrected_raw_score,
  retained_penalty_points,corrected_final_score,corrected_feedback,reviewer_id,approved_by)
  VALUES(r.attempt_id,a.id,a.tenant_id,r.student_id,r.brief_id,
   r.raw_score,r.final_score,v.proposed_raw_score,
   r.penalty_points,GREATEST(0,v.proposed_raw_score-r.penalty_points),
   v.proposed_feedback,v.reviewer_id,auth.uid());
 END IF;
 UPDATE public.unipathway_assessment_appeals
 SET status=CASE WHEN p_accept THEN 'closed' ELSE 'referred' END,updated_at=now()
 WHERE id=a.id;
END
$finalise_appeal$;

REVOKE ALL ON FUNCTION public.approve_unipathway_appeal_policy(uuid,integer,text),
 public.request_unipathway_grade_appeal(uuid,text,text),
 public.assign_unipathway_appeal_reviewer(uuid,uuid),
 public.record_unipathway_appeal_review(uuid,text,numeric,text,text),
 public.finalise_unipathway_grade_appeal(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_unipathway_appeal_policy(uuid,integer,text),
 public.request_unipathway_grade_appeal(uuid,text,text),
 public.assign_unipathway_appeal_reviewer(uuid,uuid),
 public.record_unipathway_appeal_review(uuid,text,numeric,text,text),
 public.finalise_unipathway_grade_appeal(uuid,boolean,text)
 TO authenticated;
COMMIT;
