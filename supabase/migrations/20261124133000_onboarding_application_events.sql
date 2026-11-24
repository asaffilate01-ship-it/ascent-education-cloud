-- Submission and screening are separate from KYC, formal enrolment and appointment.
CREATE TABLE public.onboarding_application_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 kind text NOT NULL CHECK(kind IN ('student','lecturer')),
 snapshot jsonb NOT NULL,
 action text NOT NULL CHECK(action IN ('submitted','screened','changes_requested','declined')),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=1000),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.onboarding_application_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_application_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.onboarding_application_events TO authenticated;
CREATE POLICY "application event read" ON public.onboarding_application_events FOR SELECT TO authenticated USING (
 tenant_id=public.current_unipathway_tenant_id() AND
 (user_id=auth.uid() OR public.has_role(auth.uid(),'superadmin'::app_role) OR EXISTS(
 SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=onboarding_application_events.tenant_id
 AND (r.role::text='centre_director' OR (onboarding_application_events.kind='student' AND r.role::text='admissions_admin')))));
CREATE FUNCTION public.record_onboarding_application_event(p_user uuid,p_kind text,p_snapshot jsonb,p_action text,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.onboarding_application_drafts%ROWTYPE; prior text; t uuid;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR p_kind IS NULL OR p_kind NOT IN ('student','lecturer') OR p_action IS NULL OR p_action NOT IN ('submitted','screened','changes_requested','declined') OR p_note IS NULL OR length(p_note)>1000 THEN
 RAISE EXCEPTION 'Invalid application action' USING ERRCODE='42501'; END IF;
 IF p_action='submitted' THEN
 IF auth.uid() IS DISTINCT FROM p_user OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text=p_kind) THEN RAISE EXCEPTION 'Applicant role required' USING ERRCODE='42501'; END IF;
 ELSE
 IF auth.uid()=p_user OR NOT (public.has_role(auth.uid(),'superadmin'::public.app_role) OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND (r.role::text='centre_director' OR (p_kind='student' AND r.role::text='admissions_admin')))) OR length(trim(p_note))<5 THEN RAISE EXCEPTION 'Independent reviewer and note required' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_user AND tenant_id=t AND kind=p_kind FOR UPDATE;
 IF NOT FOUND OR d.answers IS DISTINCT FROM p_snapshot OR length(trim(coalesce(d.answers->>'Full legal name','')))=0 OR length(trim(coalesce(d.answers->>'Email','')))=0 THEN RAISE EXCEPTION 'Save complete current application first' USING ERRCODE='40001'; END IF;
 SELECT action INTO prior FROM public.onboarding_application_events WHERE user_id=p_user AND tenant_id=t AND kind=p_kind AND snapshot=p_snapshot ORDER BY created_at DESC,id DESC LIMIT 1;
 IF p_action='submitted' AND prior='submitted' THEN RETURN; END IF;
 IF p_action<>'submitted' AND prior IS DISTINCT FROM 'submitted' THEN RAISE EXCEPTION 'Current application must be submitted before screening' USING ERRCODE='40001'; END IF;
 INSERT INTO public.onboarding_application_events(user_id,tenant_id,kind,snapshot,action,note,actor_id) VALUES(p_user,t,p_kind,p_snapshot,p_action,trim(p_note),auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.record_onboarding_application_event(uuid,text,jsonb,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_onboarding_application_event(uuid,text,jsonb,text,text) TO authenticated;
CREATE INDEX onboarding_application_event_lookup ON public.onboarding_application_events(tenant_id,user_id,kind,created_at DESC);
