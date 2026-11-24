-- Independent, append-only review of a particular teaching declaration.
CREATE TABLE public.onboarding_teaching_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 lecturer_id uuid NOT NULL REFERENCES auth.users(id),
 slot integer NOT NULL CHECK(slot BETWEEN 1 AND 20),
 subject text NOT NULL, framework text NOT NULL, maximum_level text NOT NULL,
 declaration jsonb NOT NULL,
 decision text NOT NULL CHECK(decision IN ('approved','rejected','revoked')),
 evidence_reference text NOT NULL CHECK(length(trim(evidence_reference)) BETWEEN 5 AND 1000),
 reviewed_by uuid NOT NULL REFERENCES auth.users(id),
 reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_teaching_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_teaching_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.onboarding_teaching_reviews TO authenticated;
CREATE POLICY "teaching review read" ON public.onboarding_teaching_reviews FOR SELECT TO authenticated USING (
 tenant_id=public.current_unipathway_tenant_id() AND
 (lecturer_id=auth.uid() OR public.has_role(auth.uid(),'superadmin'::app_role) OR EXISTS(
 SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=onboarding_teaching_reviews.tenant_id AND r.role::text='centre_director')));
CREATE FUNCTION public.review_onboarding_teaching_competency(p_lecturer uuid,p_slot integer,p_declaration jsonb,p_decision text,p_evidence text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.onboarding_application_drafts%ROWTYPE; prefix text; snapshot jsonb; t uuid;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR auth.uid()=p_lecturer OR
 NOT (public.has_role(auth.uid(),'superadmin'::public.app_role) OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text='centre_director')) OR
 p_slot IS NULL OR p_slot NOT BETWEEN 1 AND 20 OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected','revoked') OR
 p_evidence IS NULL OR length(trim(p_evidence)) NOT BETWEEN 5 AND 1000
 THEN RAISE EXCEPTION 'Independent authorised review and evidence required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_lecturer AND tenant_id=t AND kind='lecturer' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Teaching declaration unavailable' USING ERRCODE='42501'; END IF;
 prefix:='Competency '||p_slot||' — ';
 snapshot:=jsonb_build_object('subject',coalesce(d.answers->>(prefix||'Subject'),''),'framework',coalesce(d.answers->>(prefix||'Curriculum / awarding body'),''),'level',coalesce(d.answers->>(prefix||'Maximum level / grade'),''),'experience',coalesce(d.answers->>(prefix||'Relevant qualification or experience'),''));
 IF snapshot IS DISTINCT FROM p_declaration OR length(trim(snapshot->>'subject'))=0 OR length(trim(snapshot->>'level'))=0 OR length(trim(snapshot->>'framework'))=0
 THEN RAISE EXCEPTION 'Complete current declaration required; refresh before reviewing' USING ERRCODE='40001'; END IF;
 INSERT INTO public.onboarding_teaching_reviews(tenant_id,lecturer_id,slot,subject,framework,maximum_level,declaration,decision,evidence_reference,reviewed_by)
 VALUES(t,p_lecturer,p_slot,snapshot->>'subject',snapshot->>'framework',snapshot->>'level',snapshot,p_decision,trim(p_evidence),auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.review_onboarding_teaching_competency(uuid,integer,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_onboarding_teaching_competency(uuid,integer,jsonb,text,text) TO authenticated;
CREATE INDEX onboarding_teaching_reviews_lookup ON public.onboarding_teaching_reviews(tenant_id,lecturer_id,slot,reviewed_at DESC);
