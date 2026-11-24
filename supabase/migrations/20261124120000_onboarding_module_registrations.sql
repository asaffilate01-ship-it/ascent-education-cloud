-- Explicit module registration records; these do not change existing LMS access.
CREATE TABLE public.onboarding_module_registrations (
 enrolment_id uuid NOT NULL REFERENCES public.student_enrolments(id) ON DELETE CASCADE,
 module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 status text NOT NULL CHECK(status IN ('registered','withdrawn','exempt')),
 recorded_by uuid NOT NULL REFERENCES auth.users(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(enrolment_id,module_id)
);
ALTER TABLE public.onboarding_module_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.onboarding_module_registrations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.onboarding_module_registrations TO authenticated;
CREATE POLICY "centre registration read" ON public.onboarding_module_registrations FOR SELECT TO authenticated USING (
 tenant_id=public.current_unipathway_tenant_id()
 AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.id=enrolment_id AND e.tenant_id=onboarding_module_registrations.tenant_id
 AND (e.student_id=auth.uid() OR unipathway_acl.manager(e.tenant_id)))
);
CREATE FUNCTION public.record_onboarding_module_registration(p_enrolment uuid,p_module uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.student_enrolments%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.student_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR e.tenant_id IS DISTINCT FROM public.current_unipathway_tenant_id()
 OR NOT unipathway_acl.manager(e.tenant_id) OR e.status<>'active'
 OR p_status IS NULL OR p_status NOT IN ('registered','withdrawn','exempt')
 OR NOT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=p_module AND m.tenant_id=e.tenant_id AND m.programme_id=e.programme_id)
 THEN RAISE EXCEPTION 'Authorised active enrolment and matching module required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.onboarding_module_registrations(enrolment_id,module_id,tenant_id,status,recorded_by,recorded_at)
 VALUES(e.id,p_module,e.tenant_id,p_status,auth.uid(),now())
 ON CONFLICT(enrolment_id,module_id) DO UPDATE SET status=excluded.status,recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at;
END $$;
REVOKE ALL ON FUNCTION public.record_onboarding_module_registration(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_onboarding_module_registration(uuid,uuid,text) TO authenticated;
