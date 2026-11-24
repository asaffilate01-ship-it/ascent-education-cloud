-- Return only the latest screening metadata for the current saved application.
CREATE FUNCTION public.get_onboarding_application_status(p_user uuid,p_kind text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; d public.onboarding_application_drafts%ROWTYPE; ev public.onboarding_application_events%ROWTYPE;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR p_kind IS NULL OR p_kind NOT IN ('student','lecturer') OR NOT (
 auth.uid()=p_user OR public.has_role(auth.uid(),'superadmin'::public.app_role) OR EXISTS(
 SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND (r.role::text='centre_director' OR (p_kind='student' AND r.role::text='admissions_admin'))))
 THEN RAISE EXCEPTION 'Application access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_user AND tenant_id=t AND kind=p_kind;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','draft','current',false); END IF;
 SELECT * INTO ev FROM public.onboarding_application_events WHERE user_id=p_user AND tenant_id=t AND kind=p_kind ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','draft','current',false); END IF;
 RETURN jsonb_build_object('status',CASE WHEN ev.snapshot=d.answers THEN ev.action ELSE 'draft' END,'current',ev.snapshot=d.answers,'previousStatus',ev.action,'note',ev.note,'recordedAt',ev.created_at);
END $$;
REVOKE ALL ON FUNCTION public.get_onboarding_application_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_application_status(uuid,text) TO authenticated;
