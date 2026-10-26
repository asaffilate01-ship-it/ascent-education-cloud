-- Compare the exact revision reviewed before delegating to the established approval/release workflow.
CREATE FUNCTION public.review_uni_mark_revision(p_attempt uuid,p_revision integer,p_action text,p_rationale text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_revision integer;
BEGIN
 PERFORM 1 FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.can_quality_uni_attempt(p_attempt) THEN
  RAISE EXCEPTION 'Only the allocated independent IQA can review this mark' USING ERRCODE='42501';
 END IF;
 SELECT revision INTO current_revision FROM public.unipathway_assessment_human_marks WHERE attempt_id=p_attempt;
 IF p_revision IS NULL OR current_revision IS NULL OR p_revision<>current_revision THEN
  RAISE EXCEPTION 'The mark has changed. Reload and review the latest revision.' USING ERRCODE='40001';
 END IF;
 IF p_action='release' THEN
  PERFORM public.release_unipathway_assessment_mark(p_attempt);
 ELSIF p_action IN ('approve','return') THEN
  PERFORM public.decide_unipathway_quality_mark(p_attempt,p_action='approve',p_rationale);
 ELSE RAISE EXCEPTION 'Unknown quality review action';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.review_uni_mark_revision(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_uni_mark_revision(uuid,integer,text,text) TO authenticated;
