-- Explicit admission handover; finance is a separate approved workflow.
BEGIN;
CREATE TABLE public.unipathway_admission_handovers (
 application_id uuid PRIMARY KEY REFERENCES public.applications(id),
 enrolment_id uuid NOT NULL UNIQUE REFERENCES public.student_enrolments(id),
 tenant_id uuid NOT NULL, student_id uuid NOT NULL, programme_id uuid NOT NULL,
 approved_by uuid NOT NULL, decision_note text NOT NULL CHECK(length(btrim(decision_note)) BETWEEN 20 AND 2000),
 approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_admission_handovers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_admission_handovers FROM anon,authenticated;
-- Retire duplicate legacy auto-enrol triggers. Only the reviewed transaction inserts.
DROP TRIGGER IF EXISTS auto_enrol_on_stage_change ON public.applications;
DROP TRIGGER IF EXISTS auto_enrol_on_enrolled ON public.applications;
DROP TRIGGER IF EXISTS trg_auto_enrol_student ON public.applications;
REVOKE INSERT ON public.student_enrolments FROM anon,authenticated;

CREATE FUNCTION public.guard_unipathway_admission_handover() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.stage='enrolled' AND
 (NEW.stage,NEW.user_id,NEW.programme_id,NEW.tenant_id) IS DISTINCT FROM
 (OLD.stage,OLD.user_id,OLD.programme_id,OLD.tenant_id) THEN
  RAISE EXCEPTION 'Use the academic enrolment lifecycle to change an enrolled record' USING ERRCODE='42501';END IF;
 IF NEW.stage='enrolled' AND (TG_OP='INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) AND NOT EXISTS(
 SELECT 1 FROM public.unipathway_admission_handovers h JOIN public.student_enrolments e ON e.id=h.enrolment_id
 WHERE h.application_id=NEW.id AND h.student_id=NEW.user_id AND h.programme_id=NEW.programme_id
 AND h.tenant_id=NEW.tenant_id AND h.approved_by=auth.uid() AND e.status='active'
 AND e.application_id=NEW.id AND e.student_id=NEW.user_id AND e.programme_id=NEW.programme_id AND e.tenant_id=NEW.tenant_id) THEN
  RAISE EXCEPTION 'Complete the reviewed academic handover before enrolling' USING ERRCODE='42501';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_unipathway_admission BEFORE INSERT OR UPDATE ON public.applications
 FOR EACH ROW EXECUTE FUNCTION public.guard_unipathway_admission_handover();

CREATE FUNCTION public.get_unipathway_admission_options(p_application uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.applications%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.applications WHERE id=p_application;
 IF NOT FOUND OR auth.uid() IS NULL OR a.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
 OR NOT(public.has_role(auth.uid(),'admissions_admin'::public.app_role) OR public.has_role(auth.uid(),'centre_director'::public.app_role)) THEN
 RAISE EXCEPTION 'Admissions access required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('candidates',(
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.full_name,'email',u.email)),'[]'::jsonb)
 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
 WHERE p.tenant_id=a.tenant_id AND lower(btrim(u.email))=lower(btrim(a.email)) AND u.email_confirmed_at IS NOT NULL
 AND (a.user_id IS NULL OR a.user_id=p.user_id) AND public.has_role(p.user_id,'student'::public.app_role)),
 'programmes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title) ORDER BY p.title),'[]'::jsonb)
 FROM public.programmes p WHERE p.tenant_id=a.tenant_id AND p.status='active'
 AND (a.programme_id IS NULL OR a.programme_id=p.id)));
END $$;

CREATE FUNCTION public.complete_unipathway_admission(p_application uuid,p_student uuid,p_programme uuid,p_expected_stage text,p_note text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.applications%ROWTYPE; e public.student_enrolments%ROWTYPE; v_id uuid;
BEGIN
 SELECT * INTO a FROM public.applications WHERE id=p_application FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR a.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
 OR NOT(public.has_role(auth.uid(),'admissions_admin'::public.app_role) OR public.has_role(auth.uid(),'centre_director'::public.app_role)) THEN
 RAISE EXCEPTION 'Admissions access required' USING ERRCODE='42501';END IF;
 IF a.stage='enrolled' THEN
 SELECT h.enrolment_id INTO v_id FROM public.unipathway_admission_handovers h
 JOIN public.student_enrolments se ON se.id=h.enrolment_id AND se.status='active'
 WHERE h.application_id=a.id AND h.student_id=p_student AND h.programme_id=p_programme;
 IF v_id IS NOT NULL THEN RETURN v_id;END IF;
 RAISE EXCEPTION 'Existing enrolment requires academic review';END IF;
 IF a.stage::text IS DISTINCT FROM p_expected_stage OR a.stage NOT IN ('unconditional_offer','deposit_paid') THEN
 RAISE EXCEPTION 'Refresh the application: an unconditional offer or recorded deposit stage is required';END IF;
 IF p_note IS NULL OR length(btrim(p_note)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Record the admission decision and reviewed evidence';END IF;
 IF (a.user_id IS NOT NULL AND a.user_id IS DISTINCT FROM p_student)
 OR (a.programme_id IS NOT NULL AND a.programme_id IS DISTINCT FROM p_programme) THEN RAISE EXCEPTION 'Existing learner or programme link differs; review the application';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
 WHERE p.user_id=p_student AND p.tenant_id=a.tenant_id AND u.email_confirmed_at IS NOT NULL
 AND lower(btrim(u.email))=lower(btrim(a.email)) AND public.has_role(p_student,'student'::public.app_role)) THEN
 RAISE EXCEPTION 'A confirmed matching learner account in this centre is required';END IF;
 -- Serialize admissions into the same programme; prevents competing duplicate handovers.
 PERFORM 1 FROM public.programmes WHERE id=p_programme AND tenant_id=a.tenant_id AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active programme in this centre';END IF;
 SELECT * INTO e FROM public.student_enrolments WHERE student_id=p_student AND programme_id=p_programme FOR UPDATE;
 IF FOUND THEN RAISE EXCEPTION 'Learner already has a programme enrolment; academic review required';END IF;
 INSERT INTO public.student_enrolments(student_id,programme_id,tenant_id,application_id,status)
 VALUES(p_student,p_programme,a.tenant_id,a.id,'active') RETURNING id INTO v_id;
 INSERT INTO public.unipathway_admission_handovers(application_id,enrolment_id,tenant_id,student_id,programme_id,approved_by,decision_note)
 VALUES(a.id,v_id,a.tenant_id,p_student,p_programme,auth.uid(),btrim(p_note));
 UPDATE public.applications SET user_id=p_student,programme_id=p_programme,stage='enrolled' WHERE id=a.id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.guard_unipathway_admission_handover(),public.get_unipathway_admission_options(uuid),
 public.complete_unipathway_admission(uuid,uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_admission_options(uuid),public.complete_unipathway_admission(uuid,uuid,uuid,text,text) TO authenticated;
COMMIT;
