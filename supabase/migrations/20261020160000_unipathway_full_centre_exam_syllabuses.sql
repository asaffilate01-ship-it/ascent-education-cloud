-- Centre-wide qualification syllabus registry for board / exam / certification preparation.
-- Does not create awarding-body authorisation or external exam booking rights.
-- STAGING ONLY. Additive to 2026-09 academic modules and tenant identity.
BEGIN;
CREATE TABLE IF NOT EXISTS public.unipathway_exam_syllabuses(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 module_id uuid REFERENCES public.modules(id),
 family text NOT NULL CHECK(family IN (
 'pakistan_board','international_school','language','tech_professional',
 'finance_professional','beauty','healthcare','vocational','uk_diploma')),
 awarding_body text NOT NULL CHECK(length(btrim(awarding_body)) BETWEEN 2 AND 160),
 examination text NOT NULL CHECK(length(btrim(examination)) BETWEEN 2 AND 160),
 qualification_level text,
 subject text NOT NULL CHECK(length(btrim(subject)) BETWEEN 2 AND 160),
 stream text,
 syllabus_code text,
 specification_version text NOT NULL CHECK(length(btrim(specification_version)) BETWEEN 2 AND 120),
 specification_source text NOT NULL CHECK(length(btrim(specification_source)) BETWEEN 5 AND 1000),
 jurisdiction text NOT NULL DEFAULT 'Pakistan',
 academic_session text,
 exam_delivery text NOT NULL DEFAULT 'external' CHECK(exam_delivery IN ('external','internal_mock','provider_assessed')),
 grading_model text NOT NULL CHECK(grading_model IN (
  'board_marks','cambridge_grade','cefr_skill_band','professional_pass','competency',
  'weighted_rubric','awarding_body_specific')),
 course_delivery_status text NOT NULL DEFAULT 'planned'
  CHECK(course_delivery_status IN ('planned','readiness_review','approved_for_tuition','suspended','retired')),
 authorisation_status text NOT NULL DEFAULT 'unverified'
  CHECK(authorisation_status IN ('unverified','in_process','verified','expired')),
 authorisation_evidence_reference text,
 authorised_by uuid,
 authorised_at timestamptz,
 official_exam_registration_enabled boolean NOT NULL DEFAULT false,
 mock_exam_support boolean NOT NULL DEFAULT true,
 curriculum_reviewed_by uuid,
 curriculum_reviewed_at timestamptz,
 internal_notes text,
 created_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,awarding_body,examination,subject,specification_version),
 CHECK(course_delivery_status<>'approved_for_tuition' OR (
   curriculum_reviewed_by IS NOT NULL AND curriculum_reviewed_at IS NOT NULL)),
 CHECK(official_exam_registration_enabled=false OR (
   authorisation_status='verified'
   AND authorisation_evidence_reference IS NOT NULL
   AND authorised_by IS NOT NULL AND authorised_at IS NOT NULL))
);
ALTER TABLE public.unipathway_exam_syllabuses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS unipathway_syllabus_department_idx ON
 public.unipathway_exam_syllabuses(tenant_id,family,course_delivery_status);
CREATE TABLE IF NOT EXISTS public.unipathway_syllabus_objectives(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 syllabus_id uuid NOT NULL REFERENCES public.unipathway_exam_syllabuses(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 objective_code text NOT NULL CHECK(length(btrim(objective_code)) BETWEEN 1 AND 40),
 objective_text text NOT NULL CHECK(length(btrim(objective_text)) BETWEEN 15 AND 2000),
 topic text NOT NULL CHECK(length(btrim(topic)) BETWEEN 2 AND 120),
 exam_component text,
 learning_evidence text,
 requires_supervised_practical boolean NOT NULL DEFAULT false,
 display_order int NOT NULL CHECK(display_order BETWEEN 1 AND 200),
 UNIQUE(syllabus_id,objective_code), UNIQUE(syllabus_id,display_order)
);
ALTER TABLE public.unipathway_syllabus_objectives ENABLE ROW LEVEL SECURITY;

-- Mock scheduling is always labelled internal, not an official Cambridge,
-- BISE, OTHM or professional examination entry.
CREATE TABLE IF NOT EXISTS public.unipathway_mock_exam_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 syllabus_id uuid NOT NULL REFERENCES public.unipathway_exam_syllabuses(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 5 AND 180),
 starts_at timestamptz,
 duration_minutes int CHECK(duration_minutes BETWEEN 15 AND 360),
 total_marks numeric CHECK(total_marks BETWEEN 1 AND 1000),
 paper_reference text,
 exam_component text,
 status text NOT NULL DEFAULT 'draft'
 CHECK(status IN ('draft','published','completed','cancelled')),
 registration_url text,
 created_by uuid NOT NULL,
 approved_by uuid,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(registration_url IS NULL), -- No external paid exam registration link can be invented here.
 CHECK(status<>'published' OR (approved_by IS NOT NULL AND published_at IS NOT NULL))
);
ALTER TABLE public.unipathway_mock_exam_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_uni_syllabus(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $uni_syll_manager$
 SELECT public.same_tenant(p_tenant) AND
  (public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role))
$uni_syll_manager$;
CREATE OR REPLACE FUNCTION public.can_view_uni_syllabus(p_syllabus uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $uni_syll_view$
 SELECT EXISTS(SELECT 1 FROM public.unipathway_exam_syllabuses s
 WHERE s.id=p_syllabus AND s.tenant_id=public.get_user_tenant_id(auth.uid())
 AND s.course_delivery_status='approved_for_tuition'
 AND (
  (s.module_id IS NULL AND public.has_role(auth.uid(),'admissions_admin'::public.app_role))
  OR (s.module_id IS NOT NULL AND public.can_view_unipathway_module(s.module_id))
 ))
$uni_syll_view$;

CREATE POLICY "centre reviewed syllabuses to allowed students or managers"
 ON public.unipathway_exam_syllabuses FOR SELECT TO authenticated
 USING(public.can_manage_uni_syllabus(tenant_id) OR public.can_view_uni_syllabus(id));
CREATE POLICY "centre managers create syllabus drafts" ON public.unipathway_exam_syllabuses
 FOR INSERT TO authenticated WITH CHECK(public.can_manage_uni_syllabus(tenant_id)
 AND course_delivery_status='planned' AND authorisation_status='unverified'
 AND official_exam_registration_enabled=false AND created_by=auth.uid()
 AND curriculum_reviewed_by IS NULL AND authorised_by IS NULL);
-- No client UPDATE to approvals/authorisation records. Use separate audited RPC.
REVOKE UPDATE,DELETE ON public.unipathway_exam_syllabuses FROM authenticated;
CREATE POLICY "syllabus objectives manager or enrolled student"
 ON public.unipathway_syllabus_objectives FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.unipathway_exam_syllabuses s
  WHERE s.id=syllabus_id AND s.tenant_id=tenant_id AND
   (public.can_manage_uni_syllabus(s.tenant_id)
    OR public.can_view_uni_syllabus(s.id))));
CREATE POLICY "manager creates objectives under draft syllabus"
 ON public.unipathway_syllabus_objectives FOR INSERT TO authenticated WITH CHECK(
  EXISTS(SELECT 1 FROM public.unipathway_exam_syllabuses s
   WHERE s.id=syllabus_id AND s.tenant_id=tenant_id
    AND s.course_delivery_status IN ('planned','readiness_review')
    AND public.can_manage_uni_syllabus(s.tenant_id)));
REVOKE UPDATE,DELETE ON public.unipathway_syllabus_objectives FROM authenticated;
CREATE POLICY "centre reviewed mock exams only" ON public.unipathway_mock_exam_events
 FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.unipathway_exam_syllabuses s
 WHERE s.id=syllabus_id AND s.tenant_id=tenant_id AND
 (public.can_manage_uni_syllabus(s.tenant_id)
  OR (status='published' AND public.can_view_uni_syllabus(s.id)))));
CREATE POLICY "academic centre managers create draft mocks" ON public.unipathway_mock_exam_events
 FOR INSERT TO authenticated WITH CHECK(
  status='draft' AND created_by=auth.uid()
  AND EXISTS(SELECT 1 FROM public.unipathway_exam_syllabuses s
   WHERE s.id=syllabus_id AND s.tenant_id=tenant_id
   AND public.can_manage_uni_syllabus(s.tenant_id)));
REVOKE UPDATE,DELETE ON public.unipathway_mock_exam_events FROM authenticated;

CREATE OR REPLACE FUNCTION public.approve_unipathway_teaching_syllabus(p_syllabus uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $uni_syll_approve$
DECLARE s public.unipathway_exam_syllabuses%ROWTYPE; v_count int;
BEGIN
 SELECT * INTO s FROM public.unipathway_exam_syllabuses WHERE id=p_syllabus FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_syllabus(s.tenant_id)
 THEN RAISE EXCEPTION 'Only approved academic management may review syllabuses' USING ERRCODE='42501';END IF;
 IF s.course_delivery_status NOT IN ('planned','readiness_review')
 THEN RAISE EXCEPTION 'Syllabus already reviewed';END IF;
 IF s.module_id IS NULL THEN
  RAISE EXCEPTION 'An assigned teaching module is required before academic publication';
 END IF;
 SELECT count(*) INTO v_count FROM public.unipathway_syllabus_objectives
 WHERE syllabus_id=s.id AND tenant_id=s.tenant_id;
 IF v_count<2 THEN RAISE EXCEPTION 'At least two mapped teaching objectives required';END IF;
 UPDATE public.unipathway_exam_syllabuses SET course_delivery_status='approved_for_tuition',
  curriculum_reviewed_by=auth.uid(),curriculum_reviewed_at=now(),updated_at=now() WHERE id=p_syllabus;
 -- This approves local teaching only, never an external exam/award claim.
END
$uni_syll_approve$;

CREATE OR REPLACE FUNCTION public.publish_unipathway_mock(p_mock uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $uni_mock_publish$
DECLARE e public.unipathway_mock_exam_events%ROWTYPE;s public.unipathway_exam_syllabuses%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.unipathway_mock_exam_events WHERE id=p_mock FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_uni_syllabus(e.tenant_id)
 THEN RAISE EXCEPTION 'Centre management permission required' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.unipathway_exam_syllabuses WHERE id=e.syllabus_id;
 IF s.course_delivery_status<>'approved_for_tuition' OR e.status<>'draft'
 THEN RAISE EXCEPTION 'Approve the teaching syllabus and mock first';END IF;
 UPDATE public.unipathway_mock_exam_events SET status='published',
 approved_by=auth.uid(),published_at=now() WHERE id=p_mock;
END
$uni_mock_publish$;

REVOKE ALL ON FUNCTION public.can_manage_uni_syllabus(uuid),
 public.can_view_uni_syllabus(uuid),
 public.approve_unipathway_teaching_syllabus(uuid),
 public.publish_unipathway_mock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_uni_syllabus(uuid),
 public.can_view_uni_syllabus(uuid),
 public.approve_unipathway_teaching_syllabus(uuid),
 public.publish_unipathway_mock(uuid) TO authenticated;
COMMIT;
