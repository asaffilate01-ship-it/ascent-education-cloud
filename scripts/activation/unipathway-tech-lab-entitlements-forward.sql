-- PHASE F: internal technology lab entitlements, UniPathway staging only.
-- An active student account, centre-matching enrolment, verified technology
-- module designation, and per-student grant are ALL required for lab access.
-- No AWS/GitHub/Teams provider credentials are granted by this transaction.
BEGIN;
CREATE TABLE public.unipathway_approved_tech_modules(
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 module_id uuid PRIMARY KEY REFERENCES public.modules(id),
 approved_by uuid NOT NULL REFERENCES auth.users(id),
 evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 12 AND 500),
 enabled boolean NOT NULL DEFAULT true,
 approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.unipathway_student_lab_entitlements(
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL REFERENCES auth.users(id),
 module_id uuid NOT NULL REFERENCES public.modules(id),
 issued_by uuid NOT NULL REFERENCES auth.users(id),
 valid_until timestamptz NOT NULL,
 revoked_at timestamptz,
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,student_id,module_id)
);
ALTER TABLE public.unipathway_approved_tech_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unipathway_student_lab_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_approved_tech_modules,
 public.unipathway_student_lab_entitlements FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_approved_tech_modules,
 public.unipathway_student_lab_entitlements TO authenticated;
CREATE POLICY "Manager reads centre tech module approvals"
 ON public.unipathway_approved_tech_modules FOR SELECT TO authenticated
 USING (tenant_id=public.get_user_tenant_id(auth.uid()) AND
  public.has_role(auth.uid(),'centre_director'::public.app_role));
CREATE POLICY "Learners only see their own module grants"
 ON public.unipathway_student_lab_entitlements FOR SELECT TO authenticated
 USING(tenant_id=public.get_user_tenant_id(auth.uid()) AND
   (student_id=auth.uid() OR public.has_role(auth.uid(),'centre_director'::public.app_role)));

CREATE FUNCTION unipathway_acl.tech_lab_allowed(p_student uuid,p_tenant uuid,p_module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT p_student IS NOT NULL AND p_tenant IS NOT NULL AND p_module IS NOT NULL
  AND p_tenant=public.get_user_tenant_id(p_student)
  AND public.has_role(p_student,'student'::public.app_role)
  AND EXISTS (
   SELECT 1 FROM public.modules m
    JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND
     e.student_id=p_student AND e.tenant_id=m.tenant_id AND e.status='active'
    JOIN public.unipathway_approved_tech_modules v ON v.module_id=m.id
     AND v.tenant_id=m.tenant_id AND v.enabled
    JOIN public.unipathway_student_lab_entitlements g ON g.module_id=m.id
     AND g.student_id=p_student AND g.tenant_id=m.tenant_id
     AND g.revoked_at IS NULL AND g.valid_until>now()
    WHERE m.id=p_module AND m.tenant_id=p_tenant
  )
$fn$;

CREATE FUNCTION public.check_my_unipathway_tech_lab(p_module uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 v_tenant:=public.get_user_tenant_id(auth.uid());
 RETURN unipathway_acl.tech_lab_allowed(auth.uid(),v_tenant,p_module);
END
$fn$;

CREATE FUNCTION public.my_unipathway_tech_lab_modules()
RETURNS TABLE(module_id uuid) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN; END IF;
 v_tenant:=public.get_user_tenant_id(auth.uid());
 RETURN QUERY SELECT m.id FROM public.modules m WHERE m.tenant_id=v_tenant
  AND unipathway_acl.tech_lab_allowed(auth.uid(),v_tenant,m.id)
  ORDER BY m.id LIMIT 100;
END
$fn$;

CREATE FUNCTION public.review_unipathway_tech_lab_module(
 p_module uuid,p_enabled boolean,p_reference text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;
BEGIN
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR v_tenant IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.modules m WHERE m.id=p_module AND m.tenant_id=v_tenant
 ) OR p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 12 AND 500
 THEN RAISE EXCEPTION 'Approved centre director, module and evidence required'
  USING ERRCODE='42501';END IF;
 INSERT INTO public.unipathway_approved_tech_modules
  (tenant_id,module_id,approved_by,evidence_reference,enabled)
 VALUES(v_tenant,p_module,auth.uid(),btrim(p_reference),p_enabled)
 ON CONFLICT(module_id) DO UPDATE SET
  enabled=EXCLUDED.enabled,evidence_reference=EXCLUDED.evidence_reference,
  approved_by=auth.uid(),approved_at=now()
 WHERE public.unipathway_approved_tech_modules.tenant_id=v_tenant;
 RETURN true;
END
$fn$;

CREATE FUNCTION public.grant_unipathway_tech_lab_to_student(
 p_student uuid,p_module uuid,p_until timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;
BEGIN
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR v_tenant IS NULL OR
 NOT public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR p_until IS NULL OR p_until<=now() OR p_until>now()+INTERVAL '18 months'
 OR NOT EXISTS (
  SELECT 1 FROM public.modules m JOIN public.student_enrolments e
   ON e.programme_id=m.programme_id AND e.student_id=p_student
    AND e.tenant_id=m.tenant_id AND e.status='active'
  JOIN public.unipathway_approved_tech_modules x ON x.module_id=m.id
    AND x.tenant_id=m.tenant_id AND x.enabled
  WHERE m.id=p_module AND m.tenant_id=v_tenant
 ) THEN RAISE EXCEPTION 'Lab grant requires an approved tech module and active student enrolment'
  USING ERRCODE='42501';END IF;
 INSERT INTO public.unipathway_student_lab_entitlements
  (tenant_id,student_id,module_id,issued_by,valid_until)
 VALUES(v_tenant,p_student,p_module,auth.uid(),p_until)
 ON CONFLICT(tenant_id,student_id,module_id) DO UPDATE SET
  valid_until=EXCLUDED.valid_until,revoked_at=NULL,
  issued_by=auth.uid(),issued_at=now();
 RETURN true;
END
$fn$;

CREATE FUNCTION public.revoke_unipathway_tech_lab(
 p_student uuid,p_module uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;
BEGIN
 v_tenant:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR v_tenant IS NULL THEN RAISE EXCEPTION 'Centre director required' USING ERRCODE='42501';END IF;
 UPDATE public.unipathway_student_lab_entitlements SET revoked_at=now()
 WHERE tenant_id=v_tenant AND module_id=p_module AND student_id=p_student AND revoked_at IS NULL;
 RETURN FOUND;
END
$fn$;

-- Both direct REST reads and AWS gateway requests are denied for students
-- with only a generic student role or a non-tech programme.
CREATE POLICY "Student technology grant required for lab sessions" ON public.lab_sessions
 AS RESTRICTIVE FOR SELECT TO authenticated USING (
  tenant_id=public.get_user_tenant_id(auth.uid()) AND (
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'lecturer'::public.app_role))
   OR (module_id IS NOT NULL AND
     public.check_my_unipathway_tech_lab(module_id))
  )
 );
CREATE POLICY "Student technology grant required for private VMs" ON public.lab_vms
 AS RESTRICTIVE FOR SELECT TO authenticated USING (
  tenant_id=public.get_user_tenant_id(auth.uid()) AND (
   (public.has_role(auth.uid(),'centre_director'::public.app_role) OR
    public.has_role(auth.uid(),'lecturer'::public.app_role))
   OR (student_id=auth.uid() AND EXISTS(
    SELECT 1 FROM public.lab_sessions s WHERE s.id=lab_session_id AND
      s.tenant_id=lab_vms.tenant_id AND s.module_id IS NOT NULL AND
      public.check_my_unipathway_tech_lab(s.module_id)
   ))
  )
 );

REVOKE ALL ON FUNCTION unipathway_acl.tech_lab_allowed(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.check_my_unipathway_tech_lab(uuid),
 public.my_unipathway_tech_lab_modules(),
 public.review_unipathway_tech_lab_module(uuid,boolean,text),
 public.grant_unipathway_tech_lab_to_student(uuid,uuid,timestamptz),
 public.revoke_unipathway_tech_lab(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_my_unipathway_tech_lab(uuid),
 public.my_unipathway_tech_lab_modules(),
 public.review_unipathway_tech_lab_module(uuid,boolean,text),
 public.grant_unipathway_tech_lab_to_student(uuid,uuid,timestamptz),
 public.revoke_unipathway_tech_lab(uuid,uuid) TO authenticated;
COMMIT;
