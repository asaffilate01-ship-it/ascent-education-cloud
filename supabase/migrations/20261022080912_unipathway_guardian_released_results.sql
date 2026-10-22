-- Released coursework sharing requires centre verification AND learner permission.
BEGIN;
CREATE TABLE public.unipathway_guardian_result_consents (
 link_id uuid PRIMARY KEY REFERENCES public.parent_student_links(id) ON DELETE CASCADE,
 student_id uuid NOT NULL, tenant_id uuid NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_guardian_result_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_guardian_result_consents FROM anon,authenticated;

-- Narrow definer predicate avoids exposing the general tenant-lookup helper.
CREATE FUNCTION public.unipathway_guardian_link_scope(p_parent uuid,p_student uuid,p_tenant uuid,p_staff boolean)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND p_parent<>p_student
 AND p_tenant=public.get_user_tenant_id(auth.uid())
 AND p_tenant=public.get_user_tenant_id(p_parent) AND p_tenant=public.get_user_tenant_id(p_student)
 AND public.has_role(p_parent,'parent_guardian'::public.app_role)
 AND public.has_role(p_student,'student'::public.app_role)
 AND CASE WHEN p_staff THEN public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 ELSE p_parent=auth.uid() END
$$;
-- Parent requests cannot self-verify or name a student from another centre.
DROP POLICY IF EXISTS "Parents can request link" ON public.parent_student_links;
CREATE POLICY "Parents can request link" ON public.parent_student_links FOR INSERT TO authenticated
 WITH CHECK(verified=false AND public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,false));
DROP POLICY IF EXISTS "Staff manage parent links" ON public.parent_student_links;
CREATE POLICY "Staff manage parent links" ON public.parent_student_links FOR ALL TO authenticated
 USING(public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,true))
 WITH CHECK(public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,true));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.parent_student_links TO authenticated;

CREATE FUNCTION public.clear_unipathway_guardian_consent() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF (NEW.parent_id,NEW.student_id,NEW.tenant_id,NEW.verified)
 IS DISTINCT FROM (OLD.parent_id,OLD.student_id,OLD.tenant_id,OLD.verified) THEN
  DELETE FROM public.unipathway_guardian_result_consents WHERE link_id=OLD.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER clear_guardian_consent_on_link_change BEFORE UPDATE ON public.parent_student_links
 FOR EACH ROW EXECUTE FUNCTION public.clear_unipathway_guardian_consent();

CREATE FUNCTION public.set_unipathway_guardian_result_sharing(p_link uuid,p_share boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'parent_guardian'::public.app_role)
 AND p_tenant=public.get_user_tenant_id(auth.uid()) AND p_tenant=public.get_user_tenant_id(p_student)
 AND EXISTS(SELECT 1 FROM public.parent_student_links l
 JOIN public.unipathway_guardian_result_consents c ON c.link_id=l.id AND c.student_id=l.student_id AND c.tenant_id=l.tenant_id
 WHERE l.parent_id=auth.uid() AND l.student_id=p_student AND l.tenant_id=p_tenant AND l.verified)
$$;

CREATE FUNCTION public.get_unipathway_guardian_sharing() RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'parent_name',p.full_name,
 'verified',l.verified,'sharing',c.link_id IS NOT NULL) ORDER BY l.created_at),'[]'::jsonb)
 FROM public.parent_student_links l JOIN public.profiles p ON p.user_id=l.parent_id AND p.tenant_id=l.tenant_id
 LEFT JOIN public.unipathway_guardian_result_consents c ON c.link_id=l.id
 WHERE auth.uid() IS NOT NULL AND l.student_id=auth.uid() AND l.tenant_id=public.get_user_tenant_id(auth.uid())
$$;

-- Purpose-limited projection: no provisional marks, internal reviews, finance,
-- attendance, learner email, or direct grants to underlying assessment tables.
CREATE FUNCTION public.get_unipathway_guardian_results() RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
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

-- Retire earlier guardian paths that bypassed this explicit sharing choice.
DROP POLICY IF EXISTS "final results scoped read" ON public.final_assessment_results;
CREATE POLICY "final results scoped read" ON public.final_assessment_results FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (public.is_academic_manager()
 OR public.has_role(auth.uid(),'assessor'::public.app_role)
 OR (status='released' AND EXISTS(SELECT 1 FROM public.submissions s WHERE s.id=submission_id AND s.student_id=auth.uid()))));
DROP POLICY IF EXISTS "tuition progress own guardian read" ON public.tuition_progress_snapshots;
CREATE POLICY "tuition progress own academic read" ON public.tuition_progress_snapshots FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (student_id=auth.uid() OR public.is_academic_manager()));

REVOKE ALL ON FUNCTION public.unipathway_guardian_link_scope(uuid,uuid,uuid,boolean),public.clear_unipathway_guardian_consent(),
 public.set_unipathway_guardian_result_sharing(uuid,boolean),public.unipathway_guardian_can_read_results(uuid,uuid),
 public.get_unipathway_guardian_sharing(),public.get_unipathway_guardian_results() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_guardian_link_scope(uuid,uuid,uuid,boolean),public.set_unipathway_guardian_result_sharing(uuid,boolean),
 public.get_unipathway_guardian_sharing(),public.get_unipathway_guardian_results() TO authenticated;
COMMIT;
