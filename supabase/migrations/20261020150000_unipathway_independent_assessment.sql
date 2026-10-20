-- UniPathway independent marking, Omniqora advisory analysis and IQA release.
-- STAGING ONLY. Requires base modules, student_enrolments, user_roles, auth helpers.
-- Academic percentage scores are internal until qualification-specific policy approval.
BEGIN;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_briefs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 module_id uuid NOT NULL REFERENCES public.modules(id),
 lecturer_id uuid NOT NULL,
 title text NOT NULL CHECK(char_length(btrim(title)) BETWEEN 5 AND 180),
 assessment_type text NOT NULL CHECK(assessment_type IN ('homework','coursework','practical')),
 teaching_summary text NOT NULL CHECK(char_length(btrim(teaching_summary)) BETWEEN 40 AND 10000),
 learning_outcomes text NOT NULL CHECK(char_length(btrim(learning_outcomes)) BETWEEN 20 AND 10000),
 student_expectations text NOT NULL CHECK(char_length(btrim(student_expectations)) BETWEEN 40 AND 10000),
 required_evidence text NOT NULL CHECK(char_length(btrim(required_evidence)) BETWEEN 20 AND 10000),
 teaching_date timestamptz,
 due_at timestamptz NOT NULL,
 submission_cutoff timestamptz NOT NULL,
 max_attempts int NOT NULL DEFAULT 1 CHECK(max_attempts BETWEEN 1 AND 5),
 penalty_points_per_resubmission numeric NOT NULL DEFAULT 0
   CHECK(penalty_points_per_resubmission BETWEEN 0 AND 30),
 policy_reference text NOT NULL CHECK(length(btrim(policy_reference))>=4),
 rubric_version text NOT NULL DEFAULT 'v1',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 published_by uuid,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(submission_cutoff>=due_at),
 CHECK(max_attempts>1 OR penalty_points_per_resubmission=0)
);
CREATE INDEX IF NOT EXISTS assessment_briefs_module_idx
 ON public.unipathway_assessment_briefs(module_id,status,due_at);
ALTER TABLE public.unipathway_assessment_briefs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_criteria (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id) ON DELETE CASCADE,
 criterion_code text NOT NULL CHECK(length(btrim(criterion_code)) BETWEEN 2 AND 35),
 learning_outcome text NOT NULL CHECK(length(btrim(learning_outcome)) BETWEEN 8 AND 1200),
 criterion_description text NOT NULL CHECK(length(btrim(criterion_description)) BETWEEN 15 AND 3000),
 scoring_guidance text NOT NULL CHECK(length(btrim(scoring_guidance)) BETWEEN 20 AND 3000),
 max_points numeric NOT NULL CHECK(max_points>0 AND max_points<=100),
 display_order int NOT NULL CHECK(display_order BETWEEN 1 AND 100),
 UNIQUE(brief_id,criterion_code), UNIQUE(brief_id,display_order)
);
ALTER TABLE public.unipathway_assessment_criteria ENABLE ROW LEVEL SECURITY;

-- Student submissions contain NO provisional score or AI output. Separate
-- authorised tables hold marker/QA records; marking never updates this evidence.
CREATE TABLE IF NOT EXISTS public.unipathway_assessment_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id),
 student_id uuid NOT NULL,
 attempt_no int NOT NULL CHECK(attempt_no BETWEEN 1 AND 5),
 evidence_text text NOT NULL CHECK(char_length(btrim(evidence_text)) BETWEEN 30 AND 50000),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN
  ('submitted','resubmission_requested','human_marked','qa_rejected','qa_approved','released')),
 resubmission_guidance text,
 guidance_at timestamptz,
 UNIQUE(brief_id,student_id,attempt_no)
);
CREATE INDEX IF NOT EXISTS assessment_attempts_student_idx
 ON public.unipathway_assessment_attempts(student_id,brief_id,attempt_no DESC);
CREATE INDEX IF NOT EXISTS assessment_attempts_queue_idx
 ON public.unipathway_assessment_attempts(tenant_id,brief_id,status,submitted_at);
ALTER TABLE public.unipathway_assessment_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_allocations (
 attempt_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 marker_id uuid NOT NULL,
 qa_reviewer_id uuid NOT NULL,
 assigned_by uuid NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 CHECK(marker_id<>qa_reviewer_id)
);
ALTER TABLE public.unipathway_assessment_allocations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_ai_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 requested_by uuid NOT NULL,
 model_name text NOT NULL,
 rubric_version text NOT NULL,
 prompt_version text NOT NULL,
 criteria_results jsonb NOT NULL,
 suggested_raw_score numeric CHECK(suggested_raw_score BETWEEN 0 AND 100),
 strengths text NOT NULL DEFAULT '',
 missing_work text NOT NULL DEFAULT '',
 feedback text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessment_ai_latest_idx
 ON public.unipathway_assessment_ai_drafts(attempt_id,created_at DESC);
ALTER TABLE public.unipathway_assessment_ai_drafts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_human_marks (
 attempt_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 marker_id uuid NOT NULL,
 criteria_scores jsonb NOT NULL,
 raw_score numeric NOT NULL CHECK(raw_score BETWEEN 0 AND 100),
 penalty_points numeric NOT NULL CHECK(penalty_points BETWEEN 0 AND 100),
 adjusted_score numeric NOT NULL CHECK(adjusted_score BETWEEN 0 AND 100),
 feedback text NOT NULL CHECK(length(btrim(feedback))>=40),
 revision int NOT NULL DEFAULT 1 CHECK(revision>=1),
 marked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_human_marks ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.unipathway_assessment_mark_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 marker_id uuid NOT NULL,
 revision int NOT NULL,
 raw_score numeric NOT NULL,
 penalty_points numeric NOT NULL,
 adjusted_score numeric NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(attempt_id,revision)
);
ALTER TABLE public.unipathway_assessment_mark_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_quality_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 reviewer_id uuid NOT NULL,
 mark_revision int NOT NULL,
 decision text NOT NULL CHECK(decision IN ('approved','rejected')),
 rationale text NOT NULL CHECK(length(btrim(rationale))>=25),
 decided_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(attempt_id,mark_revision)
);
ALTER TABLE public.unipathway_assessment_quality_decisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_released_results (
 attempt_id uuid PRIMARY KEY REFERENCES public.unipathway_assessment_attempts(id),
 tenant_id uuid NOT NULL,
 student_id uuid NOT NULL,
 brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id),
 approved_mark_revision int NOT NULL,
 raw_score numeric NOT NULL,
 penalty_points numeric NOT NULL,
 final_score numeric NOT NULL,
 published_feedback text NOT NULL,
 released_by uuid NOT NULL,
 released_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_released_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.unipathway_assessment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 brief_id uuid NOT NULL,
 attempt_id uuid,
 actor_id uuid NOT NULL,
 event_type text NOT NULL CHECK(event_type IN
  ('brief_published','submitted','resubmission_requested','marker_allocated',
  'ai_draft_created','human_marked','qa_approved','qa_rejected','released')),
 detail text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_assessment_events ENABLE ROW LEVEL SECURITY;

-- Definer helpers read base tables without recursive RLS and always validate
-- tenant plus actual actor assignment. No permissions granted to anon.
CREATE OR REPLACE FUNCTION public.can_author_uni_assessment(p_module uuid,p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $assess_author$
 SELECT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=p_module
 AND m.tenant_id=p_tenant AND public.same_tenant(p_tenant)
 AND (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
$assess_author$;

CREATE OR REPLACE FUNCTION public.can_manage_uni_assessment(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $assess_manager$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b
 WHERE b.id=p_brief AND public.same_tenant(b.tenant_id)
 AND (public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'iqa_officer'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
$assess_manager$;

CREATE OR REPLACE FUNCTION public.can_study_uni_assessment(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $assess_student$
 SELECT EXISTS(
 SELECT 1 FROM public.unipathway_assessment_briefs b
 JOIN public.modules m ON m.id=b.module_id AND m.tenant_id=b.tenant_id
 JOIN public.student_enrolments e ON e.programme_id=m.programme_id
   AND e.tenant_id=b.tenant_id AND e.student_id=auth.uid() AND e.status='active'
 WHERE b.id=p_brief AND b.status='published'
  AND b.tenant_id=public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(),'student'::public.app_role))
$assess_student$;

CREATE OR REPLACE FUNCTION public.can_mark_uni_attempt(p_attempt uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $assess_marker$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_allocations a
 JOIN public.unipathway_assessment_attempts x ON x.id=a.attempt_id AND x.tenant_id=a.tenant_id
 WHERE x.id=p_attempt AND a.marker_id=auth.uid()
 AND a.tenant_id=public.get_user_tenant_id(auth.uid())
 AND public.has_role(auth.uid(),'assessor'::public.app_role))
$assess_marker$;

CREATE OR REPLACE FUNCTION public.can_quality_uni_attempt(p_attempt uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $assess_quality$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_allocations a
 JOIN public.unipathway_assessment_attempts x ON x.id=a.attempt_id AND x.tenant_id=a.tenant_id
 WHERE x.id=p_attempt AND a.qa_reviewer_id=auth.uid()
 AND a.tenant_id=public.get_user_tenant_id(auth.uid())
 AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))
$assess_quality$;

-- Immutable published syllabus/criterion definitions. Only authorised editors
-- write DRAFT content. Programme/IQA approval is a dedicated transaction.
CREATE POLICY "assessment briefs published enrolled or author or coordinator"
 ON public.unipathway_assessment_briefs FOR SELECT TO authenticated USING(
  (status='published' AND public.can_study_uni_assessment(id))
  OR public.can_author_uni_assessment(module_id,tenant_id)
  OR public.can_manage_uni_assessment(id));
CREATE POLICY "brief creator initial draft only" ON public.unipathway_assessment_briefs
 FOR INSERT TO authenticated WITH CHECK(status='draft' AND lecturer_id=auth.uid()
 AND public.can_author_uni_assessment(module_id,tenant_id)
 AND published_by IS NULL AND published_at IS NULL);
CREATE POLICY "author may edit draft only" ON public.unipathway_assessment_briefs
 FOR UPDATE TO authenticated USING(status='draft'
 AND lecturer_id=auth.uid() AND public.can_author_uni_assessment(module_id,tenant_id))
 WITH CHECK(status='draft' AND lecturer_id=auth.uid()
 AND public.can_author_uni_assessment(module_id,tenant_id));
CREATE POLICY "criteria published enrolled or author or coordinator"
 ON public.unipathway_assessment_criteria FOR SELECT TO authenticated USING(
  EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b WHERE b.id=brief_id
   AND b.tenant_id=tenant_id AND
   (public.can_study_uni_assessment(b.id)
    OR public.can_author_uni_assessment(b.module_id,b.tenant_id)
    OR public.can_manage_uni_assessment(b.id))));
CREATE POLICY "author adds unpublished assessment criteria" ON public.unipathway_assessment_criteria
 FOR INSERT TO authenticated WITH CHECK(
 EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b
 WHERE b.id=brief_id AND b.tenant_id=tenant_id AND b.status='draft'
 AND b.lecturer_id=auth.uid() AND public.can_author_uni_assessment(b.module_id,b.tenant_id)));
CREATE POLICY "author updates unpublished criteria" ON public.unipathway_assessment_criteria
 FOR UPDATE TO authenticated USING(
 EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b
 WHERE b.id=brief_id AND b.tenant_id=tenant_id AND b.status='draft'
 AND b.lecturer_id=auth.uid() AND public.can_author_uni_assessment(b.module_id,b.tenant_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b
 WHERE b.id=brief_id AND b.tenant_id=tenant_id AND b.status='draft'
 AND b.lecturer_id=auth.uid() AND public.can_author_uni_assessment(b.module_id,b.tenant_id)));
-- Deleting a criterion once created is not supported without an admin revision.

CREATE POLICY "student own and assigned marker or QA sees attempts" ON public.unipathway_assessment_attempts
 FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
  OR public.can_mark_uni_attempt(id) OR public.can_quality_uni_attempt(id)
  OR public.can_manage_uni_assessment(brief_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_attempts FROM anon,authenticated;

CREATE POLICY "allocation only involved staff see" ON public.unipathway_assessment_allocations
 FOR SELECT TO authenticated USING(
  public.can_mark_uni_attempt(attempt_id) OR public.can_quality_uni_attempt(attempt_id)
  OR EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x WHERE x.id=attempt_id
   AND public.can_manage_uni_assessment(x.brief_id)));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_allocations FROM anon,authenticated;
CREATE POLICY "AI draft marker QA or manager only" ON public.unipathway_assessment_ai_drafts
 FOR SELECT TO authenticated USING(public.can_mark_uni_attempt(attempt_id)
 OR public.can_quality_uni_attempt(attempt_id)
 OR EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x WHERE x.id=attempt_id
  AND public.can_manage_uni_assessment(x.brief_id)));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_ai_drafts FROM anon,authenticated;

CREATE POLICY "private marker decisions reviewer manager" ON public.unipathway_assessment_human_marks
 FOR SELECT TO authenticated USING(public.can_mark_uni_attempt(attempt_id)
 OR public.can_quality_uni_attempt(attempt_id)
 OR EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x WHERE x.id=attempt_id
  AND public.can_manage_uni_assessment(x.brief_id)));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_human_marks FROM anon,authenticated;
CREATE POLICY "private mark history reviewer manager" ON public.unipathway_assessment_mark_history
 FOR SELECT TO authenticated USING(public.can_mark_uni_attempt(attempt_id)
 OR public.can_quality_uni_attempt(attempt_id)
 OR EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x WHERE x.id=attempt_id
  AND public.can_manage_uni_assessment(x.brief_id)));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_mark_history FROM anon,authenticated;
CREATE POLICY "QA decisions only allocated staff" ON public.unipathway_assessment_quality_decisions
 FOR SELECT TO authenticated USING(public.can_mark_uni_attempt(attempt_id)
 OR public.can_quality_uni_attempt(attempt_id)
 OR EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x WHERE x.id=attempt_id
  AND public.can_manage_uni_assessment(x.brief_id)));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_quality_decisions FROM anon,authenticated;
CREATE POLICY "only released results visible to own student and reviewers" ON public.unipathway_assessment_released_results
 FOR SELECT TO authenticated USING(
  (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()))
  OR public.can_mark_uni_attempt(attempt_id) OR public.can_quality_uni_attempt(attempt_id)
  OR public.can_manage_uni_assessment(brief_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_released_results FROM anon,authenticated;
CREATE POLICY "audit entries for own authorised assessment actors" ON public.unipathway_assessment_events
 FOR SELECT TO authenticated USING(actor_id=auth.uid()
 OR public.can_manage_uni_assessment(brief_id));
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_assessment_events FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.publish_unipathway_assessment_brief(p_brief uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $publish_assessment$
DECLARE b public.unipathway_assessment_briefs%ROWTYPE;v_total numeric;v_count integer;
BEGIN
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=p_brief FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_assessment(p_brief) THEN
  RAISE EXCEPTION 'Only an authorised programme or quality manager can approve assessment' USING ERRCODE='42501';END IF;
 IF b.status<>'draft' THEN RAISE EXCEPTION 'Published assessment criteria are immutable';END IF;
 SELECT coalesce(sum(max_points),0),count(*) INTO v_total,v_count
 FROM public.unipathway_assessment_criteria WHERE brief_id=p_brief AND tenant_id=b.tenant_id;
 IF v_count<2 OR v_total<>100 THEN
  RAISE EXCEPTION 'At least 2 complete rubric criteria totalling 100 points are required';END IF;
 IF b.due_at<=now() OR b.submission_cutoff<=now()
 THEN RAISE EXCEPTION 'Publish only with a future submission deadline';END IF;
 -- Penalty is frozen with the brief, after explicit manager approval.
 UPDATE public.unipathway_assessment_briefs
 SET status='published',published_at=now(),published_by=auth.uid(),updated_at=now()
 WHERE id=p_brief;
 INSERT INTO public.unipathway_assessment_events(tenant_id,brief_id,actor_id,event_type,detail)
 VALUES(b.tenant_id,b.id,auth.uid(),'brief_published',b.rubric_version);
END
$publish_assessment$;

CREATE OR REPLACE FUNCTION public.submit_unipathway_assessment(
 p_brief uuid,p_evidence text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $submit_assessment$
DECLARE b public.unipathway_assessment_briefs%ROWTYPE;prev public.unipathway_assessment_attempts%ROWTYPE;
 v_attempt int;v_id uuid;
BEGIN
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=p_brief;
 IF NOT FOUND OR NOT public.can_study_uni_assessment(p_brief)
 THEN RAISE EXCEPTION 'Published assessment and active enrolment required' USING ERRCODE='42501';END IF;
 IF now()>b.submission_cutoff THEN RAISE EXCEPTION 'Submission window has closed';END IF;
 IF p_evidence IS NULL OR char_length(btrim(p_evidence)) NOT BETWEEN 30 AND 50000
 THEN RAISE EXCEPTION 'Evidence must contain 30–50,000 characters';END IF;
 -- Parallel posts from tabs cannot race and bypass attempt limits.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_brief::text,0));
 SELECT * INTO prev FROM public.unipathway_assessment_attempts
 WHERE brief_id=p_brief AND student_id=auth.uid()
 ORDER BY attempt_no DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF prev.status<>'resubmission_requested' THEN
   RAISE EXCEPTION 'Resubmission requires written guidance from the independent marker';END IF;
  v_attempt:=prev.attempt_no+1;
 ELSE v_attempt:=1;END IF;
 IF v_attempt>b.max_attempts THEN RAISE EXCEPTION 'Resubmission attempt limit reached';END IF;
 INSERT INTO public.unipathway_assessment_attempts
 (tenant_id,brief_id,student_id,attempt_no,evidence_text)
 VALUES(b.tenant_id,b.id,auth.uid(),v_attempt,btrim(p_evidence)) RETURNING id INTO v_id;
 INSERT INTO public.unipathway_assessment_events
 (tenant_id,brief_id,attempt_id,actor_id,event_type,detail)
 VALUES(b.tenant_id,b.id,v_id,auth.uid(),'submitted','Attempt '||v_attempt::text);
 RETURN v_id;
END
$submit_assessment$;

CREATE OR REPLACE FUNCTION public.allocate_unipathway_independent_marker(
 p_attempt uuid,p_marker uuid,p_quality_reviewer uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $allocate_marker$
DECLARE x public.unipathway_assessment_attempts%ROWTYPE;b public.unipathway_assessment_briefs%ROWTYPE;
BEGIN
 SELECT * INTO x FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_assessment(x.brief_id) THEN
  RAISE EXCEPTION 'Independent marker allocation requires assessment management' USING ERRCODE='42501';END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=x.brief_id;
 IF x.status<>'submitted' THEN RAISE EXCEPTION 'Only pending attempts may be allocated';END IF;
 IF p_marker IS NULL OR p_quality_reviewer IS NULL OR p_marker=p_quality_reviewer
  OR p_marker=b.lecturer_id OR p_marker=x.student_id
  OR p_quality_reviewer=b.lecturer_id OR p_quality_reviewer=x.student_id
 THEN RAISE EXCEPTION 'Lecturer/student/marker/QA must be independent';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_marker
  AND r.role='assessor'::public.app_role AND r.tenant_id=x.tenant_id)
 OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_quality_reviewer
  AND r.role='iqa_officer'::public.app_role AND r.tenant_id=x.tenant_id)
 THEN RAISE EXCEPTION 'Approved marker and quality reviewer roles required';END IF;
 INSERT INTO public.unipathway_assessment_allocations
 (attempt_id,tenant_id,marker_id,qa_reviewer_id,assigned_by)
 VALUES(x.id,x.tenant_id,p_marker,p_quality_reviewer,auth.uid());
 INSERT INTO public.unipathway_assessment_events(tenant_id,brief_id,attempt_id,actor_id,event_type)
 VALUES(x.tenant_id,x.brief_id,x.id,auth.uid(),'marker_allocated');
END
$allocate_marker$;

CREATE OR REPLACE FUNCTION public.request_unipathway_assessment_resubmission(
 p_attempt uuid,p_guidance text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $resubmit_feedback$
DECLARE x public.unipathway_assessment_attempts%ROWTYPE;b public.unipathway_assessment_briefs%ROWTYPE;
BEGIN
 SELECT * INTO x FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.can_mark_uni_attempt(p_attempt)
 THEN RAISE EXCEPTION 'Only the assigned independent marker may give revision guidance' USING ERRCODE='42501';END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=x.brief_id;
 IF x.status<>'submitted' OR b.max_attempts<=x.attempt_no OR now()>b.submission_cutoff
 THEN RAISE EXCEPTION 'No permitted resubmission remains inside the published window';END IF;
 IF p_guidance IS NULL OR length(btrim(p_guidance))<50
 THEN RAISE EXCEPTION 'Resubmission requires precise improvement guidance';END IF;
 UPDATE public.unipathway_assessment_attempts SET status='resubmission_requested',
  resubmission_guidance=btrim(p_guidance),guidance_at=now() WHERE id=x.id;
 INSERT INTO public.unipathway_assessment_events
 (tenant_id,brief_id,attempt_id,actor_id,event_type,detail)
 VALUES(x.tenant_id,x.brief_id,x.id,auth.uid(),'resubmission_requested','Revision required');
END
$resubmit_feedback$;

-- Deterministic verification of each criterion and its awarded points. Human
-- marker may overrule AI; raw and penalty-adjusted grades kept private.
CREATE OR REPLACE FUNCTION public.record_unipathway_human_mark(
 p_attempt uuid,p_criteria jsonb,p_feedback text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $mark_assessment$
DECLARE x public.unipathway_assessment_attempts%ROWTYPE;b public.unipathway_assessment_briefs%ROWTYPE;
 v_count int;v_distinct int;v_rubric int;v_total numeric;v_valid boolean;
 v_penalty numeric;v_adjusted numeric;v_rev int;
BEGIN
 SELECT * INTO x FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.can_mark_uni_attempt(p_attempt)
 THEN RAISE EXCEPTION 'Only assigned independent assessor can mark' USING ERRCODE='42501';END IF;
 IF x.status NOT IN ('submitted','qa_rejected')
 THEN RAISE EXCEPTION 'Attempt cannot be marked in its current state';END IF;
 IF p_feedback IS NULL OR length(btrim(p_feedback))<40
 THEN RAISE EXCEPTION 'Individualised human feedback must be at least 40 characters';END IF;
 IF jsonb_typeof(p_criteria)<>'array' OR jsonb_array_length(p_criteria)>100
 THEN RAISE EXCEPTION 'Complete criterion scores required';END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=x.brief_id;
 SELECT count(*) INTO v_rubric FROM public.unipathway_assessment_criteria WHERE brief_id=b.id;
 SELECT count(*),count(distinct item.code),coalesce(sum(item.points),0),
  coalesce(bool_and(item.code IS NOT NULL AND item.points IS NOT NULL
   AND item.points>=0 AND item.points<=c.max_points
   AND length(btrim(coalesce(item.reason,'')))>=20
   AND length(btrim(coalesce(item.evidence,'')))>=3
   AND length(btrim(coalesce(item.missing,'')))>=3),false)
 INTO v_count,v_distinct,v_total,v_valid
 FROM jsonb_to_recordset(p_criteria) AS item(code text,points numeric,reason text,evidence text,missing text)
 JOIN public.unipathway_assessment_criteria c ON c.brief_id=b.id AND c.criterion_code=item.code;
 IF v_rubric<2 OR v_count<>v_rubric OR v_distinct<>v_rubric
 OR NOT v_valid OR v_total>100 THEN
  RAISE EXCEPTION 'Each published criterion needs a bounded mark, evidence, missing-work note and reasons';
 END IF;
 v_penalty:=least(100,(x.attempt_no-1)*b.penalty_points_per_resubmission);
 v_adjusted:=greatest(0,v_total-v_penalty);
 SELECT coalesce(max(revision),0)+1 INTO v_rev
 FROM public.unipathway_assessment_mark_history WHERE attempt_id=p_attempt;
 INSERT INTO public.unipathway_assessment_human_marks
  (attempt_id,tenant_id,marker_id,criteria_scores,raw_score,penalty_points,adjusted_score,feedback,revision)
 VALUES(p_attempt,x.tenant_id,auth.uid(),p_criteria,v_total,v_penalty,v_adjusted,btrim(p_feedback),v_rev)
 ON CONFLICT(attempt_id) DO UPDATE SET
  criteria_scores=excluded.criteria_scores,raw_score=excluded.raw_score,
  penalty_points=excluded.penalty_points,adjusted_score=excluded.adjusted_score,
  feedback=excluded.feedback,revision=excluded.revision,marked_at=now();
 INSERT INTO public.unipathway_assessment_mark_history
  (attempt_id,tenant_id,marker_id,revision,raw_score,penalty_points,adjusted_score)
 VALUES(p_attempt,x.tenant_id,auth.uid(),v_rev,v_total,v_penalty,v_adjusted);
 UPDATE public.unipathway_assessment_attempts
 SET status='human_marked' WHERE id=p_attempt;
 INSERT INTO public.unipathway_assessment_events(tenant_id,brief_id,attempt_id,actor_id,event_type,detail)
 VALUES(x.tenant_id,x.brief_id,x.id,auth.uid(),'human_marked','Revision '||v_rev::text);
 RETURN v_adjusted;
END
$mark_assessment$;

CREATE OR REPLACE FUNCTION public.decide_unipathway_quality_mark(
 p_attempt uuid,p_approve boolean,p_rationale text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $qa_mark$
DECLARE x public.unipathway_assessment_attempts%ROWTYPE;m public.unipathway_assessment_human_marks%ROWTYPE;
BEGIN
 SELECT * INTO x FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.can_quality_uni_attempt(p_attempt)
 THEN RAISE EXCEPTION 'Only allocated independent IQA may approve' USING ERRCODE='42501';END IF;
 IF x.status<>'human_marked' THEN RAISE EXCEPTION 'The human marking stage is incomplete';END IF;
 IF p_rationale IS NULL OR length(btrim(p_rationale))<25
 THEN RAISE EXCEPTION 'IQA must record a reasoned decision';END IF;
 SELECT * INTO m FROM public.unipathway_assessment_human_marks WHERE attempt_id=x.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing assessor mark';END IF;
 INSERT INTO public.unipathway_assessment_quality_decisions
  (attempt_id,tenant_id,reviewer_id,mark_revision,decision,rationale)
 VALUES(x.id,x.tenant_id,auth.uid(),m.revision,
  CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,btrim(p_rationale));
 UPDATE public.unipathway_assessment_attempts
 SET status=CASE WHEN p_approve THEN 'qa_approved' ELSE 'qa_rejected' END
 WHERE id=p_attempt;
 INSERT INTO public.unipathway_assessment_events(tenant_id,brief_id,attempt_id,actor_id,event_type,detail)
 VALUES(x.tenant_id,x.brief_id,x.id,auth.uid(),
  CASE WHEN p_approve THEN 'qa_approved' ELSE 'qa_rejected' END,
  'Human revision '||m.revision::text);
END
$qa_mark$;

CREATE OR REPLACE FUNCTION public.release_unipathway_assessment_mark(p_attempt uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $release_assessment$
DECLARE x public.unipathway_assessment_attempts%ROWTYPE;
 m public.unipathway_assessment_human_marks%ROWTYPE; q public.unipathway_assessment_quality_decisions%ROWTYPE;
BEGIN
 SELECT * INTO x FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR NOT public.can_quality_uni_attempt(p_attempt)
 THEN RAISE EXCEPTION 'Only assigned IQA may release an approved mark' USING ERRCODE='42501';END IF;
 IF x.status<>'qa_approved' THEN RAISE EXCEPTION 'IQA approval required before release';END IF;
 SELECT * INTO m FROM public.unipathway_assessment_human_marks WHERE attempt_id=p_attempt;
 SELECT * INTO q FROM public.unipathway_assessment_quality_decisions
 WHERE attempt_id=p_attempt AND mark_revision=m.revision AND decision='approved';
 IF m.attempt_id IS NULL OR q.attempt_id IS NULL THEN
  RAISE EXCEPTION 'Approved mark version does not match human marker revision';END IF;
 INSERT INTO public.unipathway_assessment_released_results(
 attempt_id,tenant_id,student_id,brief_id,approved_mark_revision,
 raw_score,penalty_points,final_score,published_feedback,released_by)
 VALUES(x.id,x.tenant_id,x.student_id,x.brief_id,m.revision,
  m.raw_score,m.penalty_points,m.adjusted_score,m.feedback,auth.uid());
 UPDATE public.unipathway_assessment_attempts SET status='released' WHERE id=x.id;
 INSERT INTO public.unipathway_assessment_events
 (tenant_id,brief_id,attempt_id,actor_id,event_type,detail)
 VALUES(x.tenant_id,x.brief_id,x.id,auth.uid(),'released','Approved independent mark released');
END
$release_assessment$;

REVOKE ALL ON FUNCTION public.can_author_uni_assessment(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_uni_assessment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_study_uni_assessment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_mark_uni_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_quality_uni_attempt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_unipathway_assessment_brief(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_unipathway_assessment(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_unipathway_independent_marker(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_unipathway_assessment_resubmission(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_unipathway_human_mark(uuid,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_unipathway_quality_mark(uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_unipathway_assessment_mark(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_author_uni_assessment(uuid,uuid),
 public.can_manage_uni_assessment(uuid),public.can_study_uni_assessment(uuid),
 public.can_mark_uni_attempt(uuid),public.can_quality_uni_attempt(uuid),
 public.publish_unipathway_assessment_brief(uuid),
 public.submit_unipathway_assessment(uuid,text),
 public.allocate_unipathway_independent_marker(uuid,uuid,uuid),
 public.request_unipathway_assessment_resubmission(uuid,text),
 public.record_unipathway_human_mark(uuid,jsonb,text),
 public.decide_unipathway_quality_mark(uuid,boolean,text),
 public.release_unipathway_assessment_mark(uuid)
 TO authenticated;
COMMIT;
