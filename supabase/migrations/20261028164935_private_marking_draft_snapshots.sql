-- Saved content only; unsaved edits are never recorded. Existing RLS and SELECT-only grants remain.
ALTER TABLE public.uni_marking_draft_events
 ADD COLUMN criteria jsonb,
 ADD COLUMN feedback text,
 ADD COLUMN guidance text,
 ADD CONSTRAINT uni_draft_snapshot_bounded CHECK (
  (criteria IS NULL AND feedback IS NULL AND guidance IS NULL)
  OR (criteria IS NOT NULL AND feedback IS NOT NULL AND guidance IS NOT NULL
   AND jsonb_typeof(criteria)='object' AND octet_length(criteria::text)<=250000
   AND length(feedback)<=6000 AND length(guidance)<=6000)
 );
CREATE UNIQUE INDEX uni_marking_draft_events_revision
 ON public.uni_marking_draft_events(attempt_id,marker_id,revision);

-- Only the latest surviving content can be backfilled. Older metadata must not be reconstructed.
UPDATE public.uni_marking_draft_events e
 SET criteria=d.criteria,feedback=d.feedback,guidance=d.guidance
 FROM public.uni_marking_drafts d
 WHERE e.attempt_id=d.attempt_id AND e.marker_id=d.marker_id
 AND e.tenant_id=d.tenant_id AND e.revision=d.revision;

COMMENT ON COLUMN public.uni_marking_draft_events.criteria IS
 'Private saved content snapshot; NULL means historical content was not captured.';

-- Existing allocation/tenant/role checks and attempt lock govern each atomic draft + snapshot save.
CREATE OR REPLACE FUNCTION public.save_uni_marking_draft(p_attempt uuid,p_revision integer,p_criteria jsonb,p_feedback text,p_guidance text)
RETURNS public.uni_marking_drafts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.unipathway_assessment_attempts%ROWTYPE;d public.uni_marking_drafts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM public.unipathway_assessment_attempts WHERE id=p_attempt FOR UPDATE;
 IF auth.uid() IS NULL OR NOT FOUND OR NOT public.can_mark_uni_attempt(p_attempt) THEN RAISE EXCEPTION 'Only the assigned assessor can save this draft' USING ERRCODE='42501';END IF;
 IF a.status NOT IN ('submitted','qa_rejected') THEN RAISE EXCEPTION 'This attempt is no longer open for marking';END IF;
 IF p_revision IS NULL OR p_revision<0 OR p_criteria IS NULL OR jsonb_typeof(p_criteria)<>'object' OR octet_length(p_criteria::text)>250000
 OR p_feedback IS NULL OR length(p_feedback)>6000 OR p_guidance IS NULL OR length(p_guidance)>6000 THEN RAISE EXCEPTION 'Draft content is invalid or too large';END IF;
 -- Validate the shape before restoring any JSON into the editor. Incomplete marks are allowed.
 IF EXISTS(SELECT 1 FROM jsonb_each(p_criteria) e WHERE jsonb_typeof(e.value)<>'object'
 OR NOT(e.value ?& ARRAY['code','points','reason','evidence','missing'])
 OR jsonb_typeof(e.value->'code')<>'string' OR e.value->>'code'<>e.key
 OR jsonb_typeof(e.value->'points')<>'number'
 OR jsonb_typeof(e.value->'reason')<>'string' OR length(e.value->>'reason')>2000
 OR jsonb_typeof(e.value->'evidence')<>'string' OR length(e.value->>'evidence')>900
 OR jsonb_typeof(e.value->'missing')<>'string' OR length(e.value->>'missing')>2000
 OR NOT EXISTS(SELECT 1 FROM public.unipathway_assessment_criteria c WHERE c.brief_id=a.brief_id AND c.criterion_code=e.key))
 THEN RAISE EXCEPTION 'Draft criteria must match this assessment rubric';END IF;
 SELECT * INTO d FROM public.uni_marking_drafts WHERE attempt_id=p_attempt AND marker_id=auth.uid();
 IF COALESCE(d.revision,0)<>p_revision THEN RAISE EXCEPTION 'A newer draft exists. Reload it before saving.' USING ERRCODE='40001';END IF;
 INSERT INTO public.uni_marking_drafts(attempt_id,marker_id,tenant_id,criteria,feedback,guidance,revision)
 VALUES(p_attempt,auth.uid(),a.tenant_id,p_criteria,p_feedback,p_guidance,p_revision+1)
 ON CONFLICT(attempt_id,marker_id) DO UPDATE SET criteria=EXCLUDED.criteria,feedback=EXCLUDED.feedback,guidance=EXCLUDED.guidance,revision=EXCLUDED.revision,updated_at=now()
 RETURNING * INTO d;
 INSERT INTO public.uni_marking_draft_events(attempt_id,marker_id,tenant_id,revision,criteria,feedback,guidance) VALUES(p_attempt,auth.uid(),a.tenant_id,d.revision,d.criteria,d.feedback,d.guidance);
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.save_uni_marking_draft(uuid,integer,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_uni_marking_draft(uuid,integer,jsonb,text,text) TO authenticated;

