-- PHASE E-1: reviewed *staging only* office capability registry and safe staff summaries.
-- Prerequisite: apply Phase E-0 role additions in a committed transaction.
-- No mass ALTER of existing RLS. Never use user_metadata or a browser role flag.
BEGIN;
CREATE TABLE public.unipathway_staff_access_profiles(
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 staff_role public.app_role NOT NULL CHECK(staff_role::text IN ('office_admin','hr_officer','secretary')),
 overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(overrides)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 changed_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id,staff_role)
);
CREATE INDEX unipathway_staff_access_target_idx ON public.unipathway_staff_access_profiles(user_id,tenant_id);
ALTER TABLE public.unipathway_staff_access_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_staff_access_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_staff_access_profiles TO authenticated;

CREATE FUNCTION unipathway_acl.verified_office_role(p_user uuid,p_tenant uuid,p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT p_user IS NOT NULL AND p_tenant IS NOT NULL
  AND p_role IN ('office_admin','hr_officer','secretary')
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=p_user AND p.tenant_id=p_tenant)
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND
    r.tenant_id=p_tenant AND r.role::text=p_role)
$fn$;

CREATE FUNCTION unipathway_acl.staff_manager(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT auth.uid() IS NOT NULL AND p_tenant IS NOT NULL
 AND (public.has_role(auth.uid(),'superadmin'::public.app_role) OR
  (p_tenant=public.get_user_tenant_id(auth.uid())
   AND public.has_role(auth.uid(),'centre_director'::public.app_role)))
$fn$;

CREATE FUNCTION unipathway_acl.staff_capability_allowed(p_role text,p_cap text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid; v_override text; v_default boolean :=false;
BEGIN
 IF auth.uid() IS NULL OR p_cap NOT IN (
 'staff_directory','invite_limited_staff','view_schedule','view_own_tasks',
 'prepare_compliance','view_leave_summary','view_lab_inventory'
 ) THEN RETURN false;END IF;
 SELECT p.tenant_id INTO v_tenant FROM public.profiles p WHERE p.user_id=auth.uid();
 IF NOT unipathway_acl.verified_office_role(auth.uid(),v_tenant,p_role) THEN RETURN false;END IF;
 v_default:=CASE p_role
 WHEN 'office_admin' THEN p_cap IN ('staff_directory','invite_limited_staff','view_schedule','view_own_tasks','prepare_compliance')
 WHEN 'hr_officer' THEN p_cap IN ('staff_directory','view_leave_summary','view_own_tasks')
 WHEN 'secretary' THEN p_cap IN ('view_schedule','view_own_tasks','prepare_compliance')
 ELSE false END;
 SELECT v.overrides ->> p_cap INTO v_override
 FROM public.unipathway_staff_access_profiles v WHERE v.tenant_id=v_tenant
 AND v.user_id=auth.uid() AND v.staff_role::text=p_role;
 IF v_override='deny' THEN RETURN false;END IF;
 IF v_override='allow' THEN RETURN true;END IF;
 RETURN v_default;
END
$fn$;

CREATE POLICY "Office user sees only own capability profile"
 ON public.unipathway_staff_access_profiles FOR SELECT TO authenticated
 USING (user_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Centre managers view only verified centre capability profiles"
 ON public.unipathway_staff_access_profiles FOR SELECT TO authenticated
 USING (unipathway_acl.staff_manager(tenant_id));
-- No INSERT, UPDATE or DELETE policies: the RPC below is the only mutation path.

CREATE FUNCTION public.get_my_unipathway_office_workspace(p_role text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid; v_caps jsonb; v_tasks jsonb:='[]'::jsonb;
 v_people jsonb:='[]'::jsonb; v_schedule jsonb:='[]'::jsonb; v_leave jsonb:='{}'::jsonb;
 v_revision integer:=0; v_overrides jsonb:='{}'::jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';END IF;
 SELECT p.tenant_id INTO v_tenant FROM public.profiles p WHERE p.user_id=auth.uid();
 IF NOT unipathway_acl.verified_office_role(auth.uid(),v_tenant,p_role)
 THEN RAISE EXCEPTION 'Verified centre office role required' USING ERRCODE='42501';END IF;

 SELECT coalesce(jsonb_agg(c.cap ORDER BY c.cap),'[]'::jsonb) INTO v_caps
 FROM (SELECT unnest(ARRAY[
  'staff_directory','invite_limited_staff','view_schedule','view_own_tasks',
  'prepare_compliance','view_leave_summary','view_lab_inventory'
 ]) AS cap) c WHERE unipathway_acl.staff_capability_allowed(p_role,c.cap);

 SELECT v.revision,v.overrides INTO v_revision,v_overrides
 FROM public.unipathway_staff_access_profiles v WHERE v.tenant_id=v_tenant
 AND v.user_id=auth.uid() AND v.staff_role::text=p_role;
 IF unipathway_acl.staff_capability_allowed(p_role,'view_own_tasks') THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,
   'dueOn',t.due_on,'priority',t.priority,'status',t.status)
   ORDER BY t.due_on NULLS LAST),'[]'::jsonb) INTO v_tasks
  FROM (SELECT id,title,due_on,priority,status FROM public.unipathway_staff_tasks
   WHERE tenant_id=v_tenant AND assigned_to=auth.uid()
   ORDER BY due_on NULLS LAST LIMIT 60) t;
 END IF;
 IF unipathway_acl.staff_capability_allowed(p_role,'staff_directory') THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.user_id,'name',p.full_name,
    'email',p.email,'role',r.role::text) ORDER BY p.full_name),'[]'::jsonb)
   INTO v_people FROM (
    SELECT p.user_id,p.full_name,p.email FROM public.profiles p
     WHERE p.tenant_id=v_tenant ORDER BY p.full_name LIMIT 100
   ) p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=v_tenant
      AND r.role::text IN ('office_admin','hr_officer','secretary',
        'lecturer','admissions_admin','programme_leader','iqa_officer',
        'exams_officer','finance_officer','marketing_officer','security_officer');
 END IF;
 IF unipathway_acl.staff_capability_allowed(p_role,'view_schedule') THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'day',s.day_of_week,
   'start',s.start_time,'end',s.end_time,'room',s.room,'module',m.title)
   ORDER BY s.day_of_week,s.start_time),'[]'::jsonb) INTO v_schedule
  FROM (SELECT id,module_id,day_of_week,start_time,end_time,room FROM public.scheduled_lectures
     WHERE tenant_id=v_tenant AND is_active=true ORDER BY day_of_week,start_time LIMIT 100) s
  JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=v_tenant;
 END IF;
 IF unipathway_acl.staff_capability_allowed(p_role,'view_leave_summary') THEN
  SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),
   'approved',count(*) FILTER(WHERE status='approved'),
   'rejected',count(*) FILTER(WHERE status='rejected')) INTO v_leave
  FROM public.leave_requests l WHERE l.tenant_id=v_tenant
   AND l.start_date>=current_date-INTERVAL '30 days';
 END IF;
 RETURN jsonb_build_object('centreId',v_tenant,'role',p_role,'capabilities',v_caps,
  'revision',coalesce(v_revision,0),'overrides',coalesce(v_overrides,'{}'::jsonb),
  'tasks',v_tasks,'staff',v_people,'schedule',v_schedule,'leaveSummary',v_leave,
  'invitationGateway','unverified','labProvider','unverified');
END
$fn$;

CREATE FUNCTION public.get_unipathway_staff_access(p_target uuid,p_role text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid; v_rec public.unipathway_staff_access_profiles%ROWTYPE;
BEGIN
 SELECT p.tenant_id INTO v_tenant FROM public.profiles p WHERE p.user_id=p_target;
 IF NOT unipathway_acl.staff_manager(v_tenant)
  OR NOT unipathway_acl.verified_office_role(p_target,v_tenant,p_role)
 THEN RAISE EXCEPTION 'Centre manager and verified target role required' USING ERRCODE='42501';END IF;
 SELECT * INTO v_rec FROM public.unipathway_staff_access_profiles v
  WHERE v.user_id=p_target AND v.tenant_id=v_tenant AND v.staff_role::text=p_role;
 RETURN jsonb_build_object('userId',p_target,'centreId',v_tenant,'role',p_role,
  'overrides',coalesce(v_rec.overrides,'{}'::jsonb),
  'revision',coalesce(v_rec.revision,0));
END
$fn$;

CREATE FUNCTION public.set_unipathway_staff_access(
 p_target uuid,p_role text,p_expected_revision integer,p_overrides jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_tenant uuid; v_revision integer; v_key text; v_value text;
BEGIN
 IF auth.uid() IS NULL OR p_target IS NULL OR p_target=auth.uid()
 OR p_overrides IS NULL OR jsonb_typeof(p_overrides)<>'object'
 OR (SELECT count(*) FROM jsonb_object_keys(p_overrides))>7 OR p_expected_revision<0
 THEN RAISE EXCEPTION 'Invalid capability profile' USING ERRCODE='42501';END IF;
 SELECT p.tenant_id INTO v_tenant FROM public.profiles p WHERE p.user_id=p_target;
 IF NOT unipathway_acl.staff_manager(v_tenant)
 OR NOT unipathway_acl.verified_office_role(p_target,v_tenant,p_role)
 THEN RAISE EXCEPTION 'Centre manager and verified target role required' USING ERRCODE='42501';END IF;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each_text(p_overrides) LOOP
  IF v_key NOT IN('staff_directory','invite_limited_staff','view_schedule','view_own_tasks',
   'prepare_compliance','view_leave_summary','view_lab_inventory')
   OR v_value NOT IN('allow','deny')
  THEN RAISE EXCEPTION 'Unapproved permission requested' USING ERRCODE='42501';END IF;
 END LOOP;
 SELECT v.revision INTO v_revision FROM public.unipathway_staff_access_profiles v
  WHERE v.user_id=p_target AND v.tenant_id=v_tenant AND v.staff_role::text=p_role FOR UPDATE;
 IF coalesce(v_revision,0)<>p_expected_revision
 THEN RAISE EXCEPTION 'Staff permissions changed; reload before editing'
 USING ERRCODE='40001';END IF;
 INSERT INTO public.unipathway_staff_access_profiles
  (tenant_id,user_id,staff_role,overrides,revision,changed_by)
 VALUES (v_tenant,p_target,p_role::public.app_role,p_overrides,1,auth.uid())
 ON CONFLICT (tenant_id,user_id,staff_role) DO UPDATE SET
  overrides=EXCLUDED.overrides,
  revision=public.unipathway_staff_access_profiles.revision+1,
  changed_by=auth.uid(),updated_at=now()
 RETURNING revision INTO v_revision;
 INSERT INTO public.audit_logs
  (tenant_id,user_id,action,entity_type,entity_id,details)
 VALUES(v_tenant,auth.uid(),'staff_permissions_changed','staff_access',p_target,
  jsonb_build_object('role',p_role,'revision',v_revision,'capabilities',p_overrides));
 RETURN jsonb_build_object('userId',p_target,'role',p_role,
  'centreId',v_tenant,'revision',v_revision,'overrides',p_overrides);
END
$fn$;

CREATE FUNCTION public.get_unipathway_staff_directory_for_manager(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_rows jsonb:='[]'::jsonb;
BEGIN
 IF NOT unipathway_acl.staff_manager(p_tenant)
 THEN RAISE EXCEPTION 'Verified centre manager required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',q.user_id,
  'name',q.full_name,'email',q.email,'role',q.role)
  ORDER BY q.full_name),'[]'::jsonb) INTO v_rows
 FROM (
  SELECT p.user_id,p.full_name,p.email,r.role::text AS role
  FROM public.user_roles r JOIN public.profiles p ON p.user_id=r.user_id
  WHERE r.tenant_id=p_tenant AND p.tenant_id=p_tenant
   AND r.role::text IN ('office_admin','hr_officer','secretary')
  ORDER BY p.full_name,r.role LIMIT 150
 ) q;
 RETURN v_rows;
END
$fn$;

-- Public functions are deliberately not callable by anon/PUBLIC. No arbitrary
-- role assignment, payroll, student records, KYC or superadmin permissions.
REVOKE ALL ON FUNCTION unipathway_acl.verified_office_role(uuid,uuid,text),
 unipathway_acl.staff_manager(uuid),
 unipathway_acl.staff_capability_allowed(text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_my_unipathway_office_workspace(text),
 public.get_unipathway_staff_access(uuid,text),
 public.get_unipathway_staff_directory_for_manager(uuid),
 public.set_unipathway_staff_access(uuid,text,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_unipathway_office_workspace(text),
 public.get_unipathway_staff_access(uuid,text),
 public.get_unipathway_staff_directory_for_manager(uuid),
 public.set_unipathway_staff_access(uuid,text,integer,jsonb) TO authenticated;
-- Backend-only permission functions remain in a non-exposed schema.
COMMIT;
