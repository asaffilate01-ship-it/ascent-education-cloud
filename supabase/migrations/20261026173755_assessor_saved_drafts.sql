-- Private unfinished work. Drafts do not create marks, change attempt state or release grades.
CREATE TABLE public.uni_marking_drafts (
 attempt_id uuid NOT NULL REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 marker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 criteria jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(criteria)='object' AND octet_length(criteria::text)<=250000),
 feedback text NOT NULL DEFAULT '' CHECK(length(feedback)<=6000),
 guidance text NOT NULL DEFAULT '' CHECK(length(guidance)<=6000),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(attempt_id,marker_id)
);
ALTER TABLE public.uni_marking_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocated marker private drafts" ON public.uni_marking_drafts FOR SELECT TO authenticated
 USING(marker_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.can_mark_uni_attempt(attempt_id));
REVOKE ALL ON public.uni_marking_drafts FROM anon,authenticated;
GRANT SELECT ON public.uni_marking_drafts TO authenticated;

CREATE TABLE public.uni_marking_draft_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_id uuid NOT NULL REFERENCES public.unipathway_assessment_attempts(id) ON DELETE CASCADE,
 marker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 revision integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uni_marking_draft_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocated marker draft history" ON public.uni_marking_draft_events FOR SELECT TO authenticated
 USING(marker_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.can_mark_uni_attempt(attempt_id));
REVOKE ALL ON public.uni_marking_draft_events FROM anon,authenticated;
GRANT SELECT ON public.uni_marking_draft_events TO authenticated;
CREATE INDEX uni_marking_draft_events_attempt ON public.uni_marking_draft_events(attempt_id,marker_id,created_at DESC);

CREATE FUNCTION public.save_uni_marking_draft(p_attempt uuid,p_revision integer,p_criteria jsonb,p_feedback text,p_guidance text)
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
 INSERT INTO public.uni_marking_draft_events(attempt_id,marker_id,tenant_id,revision) VALUES(p_attempt,auth.uid(),a.tenant_id,d.revision);
 RETURN d;
END $$;
REVOKE ALL ON FUNCTION public.save_uni_marking_draft(uuid,integer,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_uni_marking_draft(uuid,integer,jsonb,text,text) TO authenticated;

-- Personal, generic phrasing only. No copied student evidence is stored automatically.
CREATE TABLE public.uni_feedback_snippets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL DEFAULT public.get_user_tenant_id(auth.uid()) REFERENCES public.tenants(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 80),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 3 AND 2000),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uni_feedback_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessor own feedback snippets" ON public.uni_feedback_snippets FOR ALL TO authenticated
 USING(owner_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'assessor'::public.app_role))
 WITH CHECK(owner_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'assessor'::public.app_role));
REVOKE ALL ON public.uni_feedback_snippets FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.uni_feedback_snippets TO authenticated;
CREATE INDEX uni_feedback_snippets_owner ON public.uni_feedback_snippets(owner_id,tenant_id,created_at DESC);
