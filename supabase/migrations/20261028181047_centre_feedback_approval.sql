-- Generic centre wording, never copied learner evidence. Content is immutable after proposal.
CREATE TABLE public.uni_centre_feedback (
 id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 proposed_by uuid NOT NULL REFERENCES auth.users(id),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 80),
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 3 AND 2000),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','approved','withdrawn')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),reviewed_at timestamptz,review_reference text NOT NULL DEFAULT '',
 CHECK ((status='proposed' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_reference='')
 OR (status<>'proposed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND length(btrim(review_reference)) BETWEEN 10 AND 1000)),
 CHECK(status<>'approved' OR reviewed_by<>proposed_by)
);
ALTER TABLE public.uni_centre_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centre feedback scoped readers" ON public.uni_centre_feedback FOR SELECT TO authenticated USING (
 tenant_id=public.get_user_tenant_id(auth.uid()) AND (
 public.has_role(auth.uid(),'iqa_officer'::public.app_role)
 OR (public.has_role(auth.uid(),'assessor'::public.app_role) AND (status='approved' OR proposed_by=auth.uid()))
 ));
REVOKE ALL ON public.uni_centre_feedback FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.uni_centre_feedback TO authenticated;
CREATE INDEX uni_centre_feedback_scope ON public.uni_centre_feedback(tenant_id,status,created_at DESC);
CREATE INDEX uni_centre_feedback_author ON public.uni_centre_feedback(proposed_by);
CREATE INDEX uni_centre_feedback_reviewer ON public.uni_centre_feedback(reviewed_by);

CREATE TABLE public.uni_centre_feedback_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 feedback_id uuid NOT NULL REFERENCES public.uni_centre_feedback(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),actor_id uuid NOT NULL REFERENCES auth.users(id),
 revision integer NOT NULL CHECK(revision>0),status text NOT NULL CHECK(status IN ('proposed','approved','withdrawn')),
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 10 AND 1000),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(feedback_id,revision)
);
ALTER TABLE public.uni_centre_feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centre feedback visible audit" ON public.uni_centre_feedback_events FOR SELECT TO authenticated USING (
 tenant_id=public.get_user_tenant_id(auth.uid()) AND EXISTS(SELECT 1 FROM public.uni_centre_feedback f WHERE f.id=uni_centre_feedback_events.feedback_id AND f.tenant_id=uni_centre_feedback_events.tenant_id)
 );
REVOKE ALL ON public.uni_centre_feedback_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.uni_centre_feedback_events TO authenticated;
CREATE INDEX uni_centre_feedback_events_tenant ON public.uni_centre_feedback_events(tenant_id);
CREATE INDEX uni_centre_feedback_events_actor ON public.uni_centre_feedback_events(actor_id);

CREATE FUNCTION public.propose_uni_centre_feedback(p_request uuid,p_title text,p_body text)
RETURNS public.uni_centre_feedback LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE centre uuid:=public.get_user_tenant_id(auth.uid());f public.uni_centre_feedback%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR centre IS NULL OR NOT public.has_role(auth.uid(),'assessor'::public.app_role) THEN RAISE EXCEPTION 'An assessor centre account is required' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 80 OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'Generic phrase title or wording is invalid';END IF;
 INSERT INTO public.uni_centre_feedback(id,tenant_id,proposed_by,title,body) VALUES(p_request,centre,auth.uid(),btrim(p_title),btrim(p_body))
 ON CONFLICT(id) DO NOTHING RETURNING * INTO f;
 IF FOUND THEN
  INSERT INTO public.uni_centre_feedback_events(feedback_id,tenant_id,actor_id,revision,status,reference) VALUES(f.id,centre,auth.uid(),1,'proposed','Submitted for independent IQA review');
 ELSE
  SELECT * INTO f FROM public.uni_centre_feedback WHERE id=p_request;
 END IF;
 -- An uncertain retry is idempotent only for this same owner, centre and exact content.
 IF f.proposed_by<>auth.uid() OR f.tenant_id<>centre OR f.title<>btrim(p_title) OR f.body<>btrim(p_body) THEN RAISE EXCEPTION 'Proposal request does not match this account and wording' USING ERRCODE='42501';END IF;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.propose_uni_centre_feedback(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_uni_centre_feedback(uuid,text,text) TO authenticated;

CREATE FUNCTION public.review_uni_centre_feedback(p_feedback uuid,p_revision integer,p_action text,p_reference text)
RETURNS public.uni_centre_feedback LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE centre uuid:=public.get_user_tenant_id(auth.uid());f public.uni_centre_feedback%ROWTYPE;next_status text;
BEGIN
 IF auth.uid() IS NULL OR centre IS NULL OR NOT public.has_role(auth.uid(),'iqa_officer'::public.app_role) THEN RAISE EXCEPTION 'An IQA centre account is required' USING ERRCODE='42501';END IF;
 SELECT * INTO f FROM public.uni_centre_feedback WHERE id=p_feedback AND tenant_id=centre FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposal is unavailable to this centre' USING ERRCODE='42501';END IF;
 IF p_revision IS NULL OR p_revision<>f.revision THEN RAISE EXCEPTION 'The proposal changed. Reload before reviewing.' USING ERRCODE='40001';END IF;
 IF p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'Record an internal approval or withdrawal reference';END IF;
 IF p_action='approve' AND f.status='proposed' AND f.proposed_by<>auth.uid() THEN next_status:='approved';
 ELSIF p_action='withdraw' AND f.status IN ('proposed','approved') THEN next_status:='withdrawn';
 ELSE RAISE EXCEPTION 'This transition is not permitted; authors cannot approve their own wording' USING ERRCODE='42501';END IF;
 UPDATE public.uni_centre_feedback SET status=next_status,revision=f.revision+1,updated_at=now(),reviewed_by=auth.uid(),reviewed_at=now(),review_reference=btrim(p_reference)
 WHERE id=f.id RETURNING * INTO f;
 INSERT INTO public.uni_centre_feedback_events(feedback_id,tenant_id,actor_id,revision,status,reference) VALUES(f.id,centre,auth.uid(),f.revision,f.status,f.review_reference);
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.review_uni_centre_feedback(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_uni_centre_feedback(uuid,integer,text,text) TO authenticated;
