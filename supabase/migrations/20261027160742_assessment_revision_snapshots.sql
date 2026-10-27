-- Preserve the actual submitted reasoning, evidence and feedback for each mark revision.
-- Existing RLS is identical to the private human-mark read boundary; no new reader grants.
ALTER TABLE public.unipathway_assessment_mark_history
 ADD COLUMN criteria_scores jsonb,
 ADD COLUMN feedback text,
 ADD COLUMN marked_at timestamptz;
CREATE FUNCTION public.capture_uni_mark_history_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.unipathway_assessment_human_marks;
BEGIN
 SELECT * INTO m FROM public.unipathway_assessment_human_marks WHERE attempt_id=NEW.attempt_id;
 IF m.attempt_id IS NULL OR m.revision IS DISTINCT FROM NEW.revision
 OR m.tenant_id IS DISTINCT FROM NEW.tenant_id OR m.marker_id IS DISTINCT FROM NEW.marker_id
 OR m.raw_score IS DISTINCT FROM NEW.raw_score OR m.penalty_points IS DISTINCT FROM NEW.penalty_points
 OR m.adjusted_score IS DISTINCT FROM NEW.adjusted_score THEN
 RAISE EXCEPTION 'Mark history must match the submitted mark revision'; END IF;
 NEW.criteria_scores=m.criteria_scores;NEW.feedback=m.feedback;NEW.marked_at=m.marked_at;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_uni_mark_history_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_uni_mark_history_snapshot BEFORE INSERT ON public.unipathway_assessment_mark_history
 FOR EACH ROW EXECUTE FUNCTION public.capture_uni_mark_history_snapshot();
-- Only the currently retained exact revision can be reconstructed honestly.
UPDATE public.unipathway_assessment_mark_history h SET criteria_scores=m.criteria_scores,feedback=m.feedback,marked_at=m.marked_at
FROM public.unipathway_assessment_human_marks m
WHERE h.attempt_id=m.attempt_id AND h.tenant_id=m.tenant_id AND h.marker_id=m.marker_id
 AND h.revision=m.revision AND h.raw_score=m.raw_score AND h.penalty_points=m.penalty_points AND h.adjusted_score=m.adjusted_score;
