-- Bounded activation of the existing independently reviewed assessment workflow.
DO $activation$ BEGIN
IF to_regclass('public.unipathway_assessment_briefs') IS NULL THEN
 LOCK TABLE public.submissions,public.gradebook_entries IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.submissions) OR EXISTS(SELECT 1 FROM public.gradebook_entries) THEN
 RAISE EXCEPTION 'Migrate and reconcile legacy evidence before activating assessment'; END IF;
 IF to_regprocedure('public.same_tenant(uuid)') IS NULL THEN EXECUTE $helper$
 CREATE FUNCTION public.same_tenant(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT auth.uid() IS NOT NULL AND (t=public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(),'superadmin')) $$;
 REVOKE ALL ON FUNCTION public.same_tenant(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.same_tenant(uuid) TO authenticated;
 $helper$; END IF;
 EXECUTE $core$
-- UniPathway independent marking, Omniqora advisory analysis and IQA release.
-- STAGING ONLY. Requires base modules, student_enrolments, user_roles, auth helpers.
-- Academic percentage scores are internal until qualification-specific policy approval.

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
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_author$
 SELECT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=p_module
 AND m.tenant_id=p_tenant AND public.same_tenant(p_tenant)
 AND (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
$assess_author$;

CREATE OR REPLACE FUNCTION public.can_manage_uni_assessment(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_manager$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_briefs b
 WHERE b.id=p_brief AND public.same_tenant(b.tenant_id)
 AND (public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
$assess_manager$;

CREATE OR REPLACE FUNCTION public.can_study_uni_assessment(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_student$
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
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_marker$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_allocations a
 JOIN public.unipathway_assessment_attempts x ON x.id=a.attempt_id AND x.tenant_id=a.tenant_id
 WHERE x.id=p_attempt AND a.marker_id=auth.uid()
 AND a.tenant_id=public.get_user_tenant_id(auth.uid())
 AND public.has_role(auth.uid(),'assessor'::public.app_role))
$assess_marker$;

CREATE OR REPLACE FUNCTION public.can_quality_uni_attempt(p_attempt uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_quality$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_allocations a
 JOIN public.unipathway_assessment_attempts x ON x.id=a.attempt_id AND x.tenant_id=a.tenant_id
 WHERE x.id=p_attempt AND a.qa_reviewer_id=auth.uid()
 AND a.tenant_id=public.get_user_tenant_id(auth.uid())
 AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))
$assess_quality$;

-- The assigned independent marker/reviewer sees only the rubric for attempts
-- explicitly allocated to them; neither role gets tenant-wide student evidence.
CREATE OR REPLACE FUNCTION public.can_review_uni_assessment_brief(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $assess_brief_review$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_attempts x
 JOIN public.unipathway_assessment_allocations a ON a.attempt_id=x.id AND a.tenant_id=x.tenant_id
 WHERE x.brief_id=p_brief AND x.tenant_id=public.get_user_tenant_id(auth.uid())
 AND ((a.marker_id=auth.uid() AND public.has_role(auth.uid(),'assessor'::public.app_role))
  OR (a.qa_reviewer_id=auth.uid() AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))))
$assess_brief_review$;

-- Immutable published syllabus/criterion definitions. Only authorised editors
-- write DRAFT content. Programme/IQA approval is a dedicated transaction.
CREATE POLICY "assessment briefs published enrolled or author or coordinator"
 ON public.unipathway_assessment_briefs FOR SELECT TO authenticated USING(
  (status='published' AND public.can_study_uni_assessment(id))
  OR public.can_author_uni_assessment(module_id,tenant_id)
  OR public.can_manage_uni_assessment(id)
  OR public.can_review_uni_assessment_brief(id));
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
    OR public.can_manage_uni_assessment(b.id)
    OR public.can_review_uni_assessment_brief(b.id))));
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $publish_assessment$
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
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $submit_assessment$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $allocate_marker$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $resubmit_feedback$
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
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $mark_assessment$
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
 IF v_rubric<2 OR jsonb_array_length(p_criteria)<>v_rubric
 OR v_count<>v_rubric OR v_distinct<>v_rubric
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $qa_mark$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $release_assessment$
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
REVOKE ALL ON FUNCTION public.can_review_uni_assessment_brief(uuid) FROM PUBLIC;
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
 public.can_review_uni_assessment_brief(uuid),
 public.publish_unipathway_assessment_brief(uuid),
 public.submit_unipathway_assessment(uuid,text),
 public.allocate_unipathway_independent_marker(uuid,uuid,uuid),
 public.request_unipathway_assessment_resubmission(uuid,text),
 public.record_unipathway_human_mark(uuid,jsonb,text),
 public.decide_unipathway_quality_mark(uuid,boolean,text),
 public.release_unipathway_assessment_mark(uuid)
 TO authenticated;
-- Independent appeal and grade-amendment controls for the UniPathway assessment workflow.
-- STAGING ONLY. Requires 20261020150000_unipathway_independent_assessment.sql.
-- Approved result is NEVER overwritten. Grade correction is a new signed record.

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
 OR EXISTS(SELECT 1 FROM public.unipathway_assessment_released_results r
  WHERE r.brief_id=unipathway_assessment_appeal_policies.brief_id AND r.student_id=auth.uid()
   AND r.tenant_id=public.get_user_tenant_id(auth.uid()))
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


-- Reviewer needs the exact original brief, learner evidence and signed result.
-- Additive READ grants to only the separately allocated appeal reviewer.
CREATE OR REPLACE FUNCTION public.can_read_uni_appeal_attempt(p_attempt uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $appeal_attempt_read$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_appeals a
 WHERE a.attempt_id=p_attempt AND a.reviewer_id=auth.uid()
 AND a.tenant_id=public.get_user_tenant_id(auth.uid())
 AND a.status IN ('under_review','recommendation')
 AND public.has_role(auth.uid(),'iqa_officer'::public.app_role))
$appeal_attempt_read$;
CREATE OR REPLACE FUNCTION public.can_read_uni_appeal_brief(p_brief uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $appeal_brief_read$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_assessment_appeals a
 WHERE a.brief_id=p_brief AND public.can_read_uni_appeal_attempt(a.attempt_id))
$appeal_brief_read$;

CREATE POLICY "released student may access original published assessment brief for appeal"
 ON public.unipathway_assessment_briefs FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.unipathway_assessment_released_results r
  WHERE r.brief_id=id AND r.student_id=auth.uid()
   AND r.tenant_id=public.get_user_tenant_id(auth.uid())));

CREATE POLICY "appeal reviewer may read original frozen brief"
 ON public.unipathway_assessment_briefs FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_brief(id));
CREATE POLICY "appeal reviewer may read original rubric"
 ON public.unipathway_assessment_criteria FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_brief(brief_id));
CREATE POLICY "appeal reviewer may inspect submitted evidence"
 ON public.unipathway_assessment_attempts FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_attempt(id));
CREATE POLICY "appeal reviewer may inspect original independent human mark"
 ON public.unipathway_assessment_human_marks FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_attempt(attempt_id));
CREATE POLICY "appeal reviewer may inspect original IQA decision"
 ON public.unipathway_assessment_quality_decisions FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_attempt(attempt_id));
CREATE POLICY "appeal reviewer may inspect released result"
 ON public.unipathway_assessment_released_results FOR SELECT TO authenticated
 USING(public.can_read_uni_appeal_attempt(attempt_id));

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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $appeal_policy$
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
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $request_appeal$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $assign_appeal$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $review_appeal$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $finalise_appeal$
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

REVOKE ALL ON FUNCTION public.can_read_uni_appeal_attempt(uuid),
 public.can_read_uni_appeal_brief(uuid),
 public.approve_unipathway_appeal_policy(uuid,integer,text),
 public.request_unipathway_grade_appeal(uuid,text,text),
 public.assign_unipathway_appeal_reviewer(uuid,uuid),
 public.record_unipathway_appeal_review(uuid,text,numeric,text,text),
 public.finalise_unipathway_grade_appeal(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_uni_appeal_attempt(uuid),
 public.can_read_uni_appeal_brief(uuid),
 public.approve_unipathway_appeal_policy(uuid,integer,text),
 public.request_unipathway_grade_appeal(uuid,text,text),
 public.assign_unipathway_appeal_reviewer(uuid,uuid),
 public.record_unipathway_appeal_review(uuid,text,numeric,text,text),
 public.finalise_unipathway_grade_appeal(uuid,boolean,text)
 TO authenticated;

REVOKE ALL ON public.unipathway_assessment_briefs FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_briefs TO authenticated;

REVOKE ALL ON public.unipathway_assessment_criteria FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_criteria TO authenticated;

REVOKE ALL ON public.unipathway_assessment_attempts FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_attempts TO authenticated;

REVOKE ALL ON public.unipathway_assessment_allocations FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_allocations TO authenticated;

REVOKE ALL ON public.unipathway_assessment_ai_drafts FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_ai_drafts TO authenticated;

REVOKE ALL ON public.unipathway_assessment_human_marks FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_human_marks TO authenticated;

REVOKE ALL ON public.unipathway_assessment_mark_history FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_mark_history TO authenticated;

REVOKE ALL ON public.unipathway_assessment_quality_decisions FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_quality_decisions TO authenticated;

REVOKE ALL ON public.unipathway_assessment_released_results FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_released_results TO authenticated;

REVOKE ALL ON public.unipathway_assessment_events FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_events TO authenticated;

REVOKE ALL ON public.unipathway_assessment_appeal_policies FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_appeal_policies TO authenticated;

REVOKE ALL ON public.unipathway_assessment_appeals FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_appeals TO authenticated;

REVOKE ALL ON public.unipathway_assessment_appeal_reviews FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_appeal_reviews TO authenticated;

REVOKE ALL ON public.unipathway_assessment_appeal_outcomes FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_appeal_outcomes TO authenticated;

REVOKE ALL ON public.unipathway_assessment_grade_amendments FROM PUBLIC,anon,authenticated; GRANT SELECT ON public.unipathway_assessment_grade_amendments TO authenticated;
GRANT INSERT,UPDATE ON public.unipathway_assessment_briefs,public.unipathway_assessment_criteria TO authenticated;

-- Forward-only addition. Private evidence is immutable after submission.
CREATE TABLE public.unipathway_coursework_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL REFERENCES auth.users(id), brief_id uuid NOT NULL REFERENCES public.unipathway_assessment_briefs(id),
 attempt_id uuid REFERENCES public.unipathway_assessment_attempts(id),
 file_name text NOT NULL CHECK(length(file_name) BETWEEN 1 AND 180),
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 byte_size bigint NOT NULL CHECK(byte_size BETWEEN 1 AND 20971520),
 storage_path text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coursework_upload_owner ON public.unipathway_coursework_uploads(student_id,brief_id);
CREATE INDEX coursework_upload_attempt ON public.unipathway_coursework_uploads(attempt_id);
ALTER TABLE public.unipathway_coursework_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_coursework_uploads FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_coursework_uploads TO authenticated;
CREATE FUNCTION public.can_read_unipathway_coursework_file(p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_coursework_uploads WHERE storage_path=p_path AND (
 (student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())) OR
 (attempt_id IS NOT NULL AND (public.can_mark_uni_attempt(attempt_id) OR public.can_quality_uni_attempt(attempt_id)
 OR public.can_read_uni_appeal_attempt(attempt_id) OR public.can_manage_uni_assessment(brief_id)))
))
$$;
CREATE POLICY "Own drafts or authorised submitted evidence" ON public.unipathway_coursework_uploads FOR SELECT TO authenticated USING(public.can_read_unipathway_coursework_file(storage_path));
ALTER TABLE public.unipathway_assessment_attempts ADD COLUMN submission_request_id uuid;
CREATE UNIQUE INDEX assessment_submission_request ON public.unipathway_assessment_attempts(student_id,submission_request_id) WHERE submission_request_id IS NOT NULL;

CREATE FUNCTION public.reserve_unipathway_coursework_file(p_brief uuid,p_name text,p_mime text,p_size bigint)
RETURNS public.unipathway_coursework_uploads LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.unipathway_assessment_briefs%ROWTYPE; u public.unipathway_coursework_uploads%ROWTYPE; v_id uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_study_uni_assessment(p_brief) THEN RAISE EXCEPTION 'Active enrolled learner required' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.unipathway_assessment_briefs WHERE id=p_brief;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_brief::text,0));
 IF now()>b.submission_cutoff THEN RAISE EXCEPTION 'Submission window closed'; END IF;
 IF (SELECT count(*) FROM public.unipathway_coursework_uploads WHERE student_id=auth.uid() AND brief_id=p_brief AND attempt_id IS NULL)>=5 THEN RAISE EXCEPTION 'Remove a draft file before adding another (maximum five)'; END IF;
 INSERT INTO public.unipathway_coursework_uploads(id,tenant_id,student_id,brief_id,file_name,mime_type,byte_size,storage_path)
 VALUES(v_id,b.tenant_id,auth.uid(),p_brief,regexp_replace(left(btrim(p_name),180),'[[:cntrl:]/\\]','_','g'),p_mime,p_size,b.tenant_id::text||'/'||auth.uid()::text||'/'||v_id::text)
 RETURNING * INTO u; RETURN u;
END $$;
-- Serialize storage mutations with submission: a concurrent deletion must observe attachment finalisation.
CREATE FUNCTION public.can_write_unipathway_coursework_file(p_path text) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE u public.unipathway_coursework_uploads%ROWTYPE;
BEGIN
 SELECT * INTO u FROM public.unipathway_coursework_uploads WHERE storage_path=p_path FOR UPDATE;
 RETURN FOUND AND auth.uid() IS NOT NULL AND u.student_id=auth.uid()
 AND u.tenant_id=public.get_user_tenant_id(auth.uid()) AND u.attempt_id IS NULL;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('unipathway-coursework','unipathway-coursework',false,20971520,ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
CREATE POLICY "Coursework upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='unipathway-coursework' AND public.can_write_unipathway_coursework_file(name));
CREATE POLICY "Coursework download" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='unipathway-coursework' AND public.can_read_unipathway_coursework_file(name));
CREATE POLICY "Coursework draft deletion" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='unipathway-coursework' AND public.can_write_unipathway_coursework_file(name));
-- Older permissive policies must not widen this private bucket.
CREATE POLICY "Coursework read boundary" ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_read_unipathway_coursework_file(name)));
CREATE POLICY "Coursework insert boundary" ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_write_unipathway_coursework_file(name)));
CREATE POLICY "Coursework delete boundary" ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING(bucket_id<>'unipathway-coursework' OR (auth.uid() IS NOT NULL AND public.can_write_unipathway_coursework_file(name)));
CREATE POLICY "Coursework cannot overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING(bucket_id<>'unipathway-coursework') WITH CHECK(bucket_id<>'unipathway-coursework');
CREATE FUNCTION public.discard_unipathway_coursework_file(p_upload uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u public.unipathway_coursework_uploads%ROWTYPE;
BEGIN
 SELECT * INTO u FROM public.unipathway_coursework_uploads WHERE id=p_upload FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR u.student_id<>auth.uid() OR u.tenant_id<>public.get_user_tenant_id(auth.uid()) OR u.attempt_id IS NOT NULL THEN RAISE EXCEPTION 'Draft owner required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='unipathway-coursework' AND name=u.storage_path) THEN RAISE EXCEPTION 'Remove the stored file before discarding its record'; END IF;
 DELETE FROM public.unipathway_coursework_uploads WHERE id=p_upload;
END $$;
CREATE FUNCTION public.submit_unipathway_coursework(p_brief uuid,p_evidence text,p_uploads uuid[],p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; previous public.unipathway_assessment_attempts%ROWTYPE; n int;
BEGIN
 IF auth.uid() IS NULL OR p_request IS NULL OR NOT public.can_study_uni_assessment(p_brief) THEN RAISE EXCEPTION 'Active enrolled learner required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_brief::text,0));
 SELECT * INTO previous FROM public.unipathway_assessment_attempts WHERE student_id=auth.uid() AND submission_request_id=p_request;
 IF FOUND THEN
  IF previous.brief_id<>p_brief OR previous.evidence_text<>btrim(p_evidence) OR
   (SELECT array_agg(id ORDER BY id) FROM public.unipathway_coursework_uploads WHERE attempt_id=previous.id) IS DISTINCT FROM
   (SELECT array_agg(x ORDER BY x) FROM unnest(p_uploads) x)
  THEN RAISE EXCEPTION 'Request already used for different evidence'; END IF;
  RETURN previous.id;
 END IF;
 n:=coalesce(cardinality(p_uploads),0);
 IF n>5 OR n<>(SELECT count(DISTINCT x) FROM unnest(p_uploads) x) THEN RAISE EXCEPTION 'Select up to five different files'; END IF;
 PERFORM 1 FROM public.unipathway_coursework_uploads WHERE id=ANY(p_uploads) ORDER BY id FOR UPDATE;
 IF n<>(SELECT count(*) FROM public.unipathway_coursework_uploads u JOIN storage.objects o ON o.bucket_id='unipathway-coursework' AND o.name=u.storage_path
 WHERE u.id=ANY(p_uploads) AND u.brief_id=p_brief AND u.student_id=auth.uid() AND u.tenant_id=public.get_user_tenant_id(auth.uid()) AND u.attempt_id IS NULL
 AND (o.metadata->>'size')::bigint=u.byte_size AND o.metadata->>'mimetype'=u.mime_type)
 THEN RAISE EXCEPTION 'Every attachment must finish uploading and belong to this assignment'; END IF;
 v_id:=public.submit_unipathway_assessment(p_brief,p_evidence);
 UPDATE public.unipathway_assessment_attempts SET submission_request_id=p_request WHERE id=v_id;
 UPDATE public.unipathway_coursework_uploads SET attempt_id=v_id WHERE id=ANY(p_uploads);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.reserve_unipathway_coursework_file(uuid,text,text,bigint),public.discard_unipathway_coursework_file(uuid),public.submit_unipathway_coursework(uuid,text,uuid[],uuid),public.can_read_unipathway_coursework_file(text),public.can_write_unipathway_coursework_file(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reserve_unipathway_coursework_file(uuid,text,text,bigint),public.discard_unipathway_coursework_file(uuid),public.submit_unipathway_coursework(uuid,text,uuid[],uuid),public.can_read_unipathway_coursework_file(text),public.can_write_unipathway_coursework_file(text) TO authenticated;


CREATE FUNCTION public.set_unipathway_guardian_result_sharing(p_link uuid,p_share boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.parent_student_links%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_share IS NULL THEN RAISE EXCEPTION 'Sign in and choose a sharing preference' USING ERRCODE='42501';END IF;
 SELECT * INTO l FROM public.parent_student_links WHERE id=p_link FOR UPDATE;
 IF NOT FOUND OR l.student_id<>auth.uid() THEN RAISE EXCEPTION 'Only the linked learner can change sharing' USING ERRCODE='42501';END IF;
 IF NOT p_share THEN DELETE FROM public.unipathway_guardian_result_consents WHERE link_id=l.id;RETURN;END IF;
 IF NOT l.verified OR l.tenant_id IS NULL
 OR l.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
 OR l.tenant_id IS DISTINCT FROM public.get_user_tenant_id(l.parent_id)
 OR NOT public.has_role(auth.uid(),'student'::public.app_role)
 OR NOT public.has_role(l.parent_id,'parent_guardian'::public.app_role) THEN
  RAISE EXCEPTION 'A centre-verified link in your centre is required' USING ERRCODE='42501';END IF;
 INSERT INTO public.unipathway_guardian_result_consents(link_id,student_id,tenant_id)
 VALUES(l.id,auth.uid(),l.tenant_id) ON CONFLICT(link_id) DO NOTHING;
END $$;

CREATE FUNCTION public.unipathway_guardian_can_read_results(p_student uuid,p_tenant uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'parent_guardian'::public.app_role)
 AND p_tenant=public.get_user_tenant_id(auth.uid()) AND p_tenant=public.get_user_tenant_id(p_student)
 AND EXISTS(SELECT 1 FROM public.parent_student_links l
 JOIN public.unipathway_guardian_result_consents c ON c.link_id=l.id AND c.student_id=l.student_id AND c.tenant_id=l.tenant_id
 WHERE l.parent_id=auth.uid() AND l.student_id=p_student AND l.tenant_id=p_tenant AND l.verified)
$$;

CREATE FUNCTION public.get_unipathway_guardian_sharing() RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'parent_name',p.full_name,
 'verified',l.verified,'sharing',c.link_id IS NOT NULL) ORDER BY l.created_at),'[]'::jsonb)
 FROM public.parent_student_links l JOIN public.profiles p ON p.user_id=l.parent_id AND p.tenant_id=l.tenant_id
 LEFT JOIN public.unipathway_guardian_result_consents c ON c.link_id=l.id
 WHERE auth.uid() IS NOT NULL AND l.student_id=auth.uid() AND l.tenant_id=public.get_user_tenant_id(auth.uid())
$$;

-- Purpose-limited projection: no provisional marks, internal reviews, finance,
-- attendance, learner email, or direct grants to underlying assessment tables.
CREATE FUNCTION public.get_unipathway_guardian_results() RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'verified',l.verified,
 'sharing',public.unipathway_guardian_can_read_results(l.student_id,l.tenant_id),
 'student_name',CASE WHEN public.unipathway_guardian_can_read_results(l.student_id,l.tenant_id)
 THEN (SELECT full_name FROM public.profiles WHERE user_id=l.student_id AND tenant_id=l.tenant_id) ELSE NULL END,
 'results',CASE WHEN public.unipathway_guardian_can_read_results(l.student_id,l.tenant_id) THEN (
 SELECT coalesce(jsonb_agg(to_jsonb(result) ORDER BY result.released_at DESC),'[]'::jsonb) FROM (
 SELECT r.attempt_id,b.title,coalesce(a.corrected_final_score,r.final_score) AS final_score,
 coalesce(a.corrected_feedback,r.published_feedback) AS feedback,r.released_at,
 (a.attempt_id IS NOT NULL) AS amended
 FROM public.unipathway_assessment_released_results r
 JOIN public.unipathway_assessment_briefs b ON b.id=r.brief_id AND b.tenant_id=r.tenant_id
 LEFT JOIN public.unipathway_assessment_grade_amendments a ON a.attempt_id=r.attempt_id
 AND a.tenant_id=r.tenant_id AND a.student_id=r.student_id
 WHERE r.student_id=l.student_id AND r.tenant_id=l.tenant_id
 ORDER BY r.released_at DESC LIMIT 250) result) ELSE '[]'::jsonb END) ORDER BY l.created_at),'[]'::jsonb)
 FROM public.parent_student_links l WHERE auth.uid() IS NOT NULL AND l.parent_id=auth.uid()
 AND l.tenant_id=public.get_user_tenant_id(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.set_unipathway_guardian_result_sharing(uuid,boolean),public.unipathway_guardian_can_read_results(uuid,uuid),public.get_unipathway_guardian_sharing(),public.get_unipathway_guardian_results() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_unipathway_guardian_result_sharing(uuid,boolean),public.get_unipathway_guardian_sharing(),public.get_unipathway_guardian_results() TO authenticated;
-- Close legacy provisional-grade exposure before enabling new human/IQA workflow.
-- STAGING ONLY. Requires migrating legacy coursework to the new assessment
-- tables or consciously archiving it before activating this policy.
-- No existing coursework/grade data is deleted.

DO $legacy_submission_gate$
BEGIN
 IF to_regclass('public.submissions') IS NULL THEN
  RAISE EXCEPTION 'Expected legacy submissions table before marking cutover';
 END IF;
END
$legacy_submission_gate$;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
-- Old student-owned row SELECT exposed provisional grade, feedback and model
-- fields because RLS protects ROWS not individual COLUMNS. Restrict entire
-- legacy submission table; student work lives in immutable attempt records.
DO $drop_legacy_policies$
DECLARE p record;
BEGIN
 FOR p IN SELECT policyname FROM pg_policies
  WHERE schemaname='public' AND tablename='submissions'
 LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.submissions',p.policyname);
 END LOOP;
END
$drop_legacy_policies$;
CREATE POLICY "legacy coursework archived audit by academic director only"
 ON public.submissions FOR SELECT TO authenticated
 USING((tenant_id=public.get_user_tenant_id(auth.uid())
  AND public.has_role(auth.uid(),'centre_director'::public.app_role))
  OR public.has_role(auth.uid(),'superadmin'::public.app_role));
REVOKE INSERT,UPDATE,DELETE ON public.submissions FROM authenticated;
-- Do not GRANT any student SELECT on legacy submissions, even the student's own row.
-- No blanket staff UPDATE/ALL policy is recreated. Old lecturer direct-mark
-- functions and endpoints must remain unrouted and disabled in staging.

$core$;
END IF;
END $activation$;
