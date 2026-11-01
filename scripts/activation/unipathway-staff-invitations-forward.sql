-- PHASE E-2: UniPathway staff invitation transaction, STAGING ONLY.
-- Prerequisite: committed office role enum and office access RPC deployment.
-- Email redirect is https://unipathway.pk/reset-password (Edge function).
BEGIN;
CREATE TABLE public.unipathway_staff_invitations(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 email text NOT NULL CHECK(length(email) BETWEEN 4 AND 254),
 full_name text NOT NULL CHECK(length(full_name) BETWEEN 2 AND 120),
 role public.app_role NOT NULL CHECK(role::text NOT IN
  ('superadmin','centre_director','student','parent_guardian','university_partner','employer_partner')),
 requested_overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(requested_overrides)='object'),
 prepared_by uuid NOT NULL REFERENCES auth.users(id),
 assigned_user_id uuid REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','assigned','cancelled')),
 email_sent boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,email,role)
);
ALTER TABLE public.unipathway_staff_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_staff_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_staff_invitations TO authenticated;
CREATE POLICY "Centre manager views centre staff invitations" ON public.unipathway_staff_invitations
 FOR SELECT TO authenticated USING(unipathway_acl.staff_manager(tenant_id));
CREATE POLICY "Office admin views own invitation receipts" ON public.unipathway_staff_invitations
 FOR SELECT TO authenticated USING(prepared_by=auth.uid()
  AND tenant_id=public.get_user_tenant_id(auth.uid())
  AND unipathway_acl.staff_capability_allowed('office_admin','invite_limited_staff'));

CREATE FUNCTION public.prepare_unipathway_account_invitation(
 p_email text,p_name text,p_role text,p_tenant uuid DEFAULT NULL,
 p_permissions jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;v_user uuid;v_id uuid;v_role public.app_role;
 v_email text;v_name text;v_manager boolean;v_key text;v_value text;v_existing uuid;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';END IF;
 v_centre:=coalesce(p_tenant,public.get_user_tenant_id(v_actor));
 v_manager:=unipathway_acl.staff_manager(v_centre);
 IF v_centre IS NULL OR NOT (v_manager
    OR (v_centre=public.get_user_tenant_id(v_actor)
     AND unipathway_acl.staff_capability_allowed('office_admin','invite_limited_staff')))
 THEN RAISE EXCEPTION 'Centre staff invitation not permitted' USING ERRCODE='42501';END IF;
 v_email:=lower(btrim(p_email));v_name:=btrim(p_name);
 IF v_email IS NULL OR length(v_email) NOT BETWEEN 4 AND 254
 OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
 OR v_name IS NULL OR length(v_name) NOT BETWEEN 2 AND 120
 OR p_role IS NULL OR p_role NOT IN(
  'office_admin','hr_officer','secretary','admissions_admin','lecturer','programme_leader',
  'iqa_officer','assessor','exams_officer','finance_officer','marketing_officer',
  'security_officer','welfare_officer'
 ) THEN RAISE EXCEPTION 'Invalid staff invite request' USING ERRCODE='22023';END IF;
 IF NOT v_manager AND p_role NOT IN ('office_admin','hr_officer','secretary')
 THEN RAISE EXCEPTION 'Office administrators can only request approved office roles'
 USING ERRCODE='42501';END IF;
 IF p_permissions IS NULL OR jsonb_typeof(p_permissions)<>'object'
 OR (SELECT count(*) FROM jsonb_object_keys(p_permissions))>7
 THEN RAISE EXCEPTION 'Invalid requested capabilities' USING ERRCODE='42501';END IF;
 IF NOT v_manager AND p_permissions<>'{}'::jsonb
 THEN RAISE EXCEPTION 'Extra access requires director review' USING ERRCODE='42501';END IF;
 FOR v_key,v_value IN SELECT key,value FROM jsonb_each_text(p_permissions) LOOP
  IF v_key NOT IN('staff_directory','invite_limited_staff','view_schedule','view_own_tasks',
     'prepare_compliance','view_leave_summary','view_lab_inventory')
  OR v_value NOT IN ('allow','deny')
  THEN RAISE EXCEPTION 'Unapproved capability requested' USING ERRCODE='42501';END IF;
 END LOOP;
 SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email)=v_email LIMIT 1;
 IF v_user IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.user_id=v_user
   AND p.tenant_id IS NOT NULL AND p.tenant_id<>v_centre
 ) THEN RAISE EXCEPTION 'Existing account belongs to a different centre' USING ERRCODE='42501';END IF;
 v_role:=p_role::public.app_role;
 IF v_user IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_user AND r.tenant_id=v_centre AND r.role=v_role
 ) THEN
  RETURN jsonb_build_object('status','assigned','existing_user_id',v_user,
   'email',v_email,'full_name',v_name,'email_sent',false);
 END IF;
 INSERT INTO public.unipathway_staff_invitations(tenant_id,email,full_name,role,prepared_by,requested_overrides)
 VALUES(v_centre,v_email,v_name,v_role,v_actor,p_permissions)
 ON CONFLICT(tenant_id,email,role) DO UPDATE SET
  full_name=EXCLUDED.full_name,requested_overrides=EXCLUDED.requested_overrides,
  prepared_by=EXCLUDED.prepared_by,updated_at=now()
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'status','prepared','existing_user_id',v_user,
  'email',v_email,'full_name',v_name,'email_sent',false);
END
$fn$;

CREATE FUNCTION public.complete_unipathway_account_invitation(
 p_invitation uuid,p_user uuid,p_email_sent boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v public.unipathway_staff_invitations%ROWTYPE; v_check_email text; v_profile_tenant uuid;
BEGIN
 -- Only a trusted service-role Edge function can finish an invitation, never a browser.
 IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'Service account required' USING ERRCODE='42501';END IF;
 SELECT * INTO v FROM public.unipathway_staff_invitations WHERE id=p_invitation FOR UPDATE;
 IF NOT FOUND OR v.status NOT IN ('prepared','assigned') OR p_user IS NULL
 THEN RAISE EXCEPTION 'No current staff invitation found' USING ERRCODE='42501';END IF;
 SELECT lower(u.email) INTO v_check_email FROM auth.users u WHERE u.id=p_user;
 IF v_check_email IS DISTINCT FROM v.email
 THEN RAISE EXCEPTION 'Invited account email mismatch' USING ERRCODE='42501';END IF;
 SELECT p.tenant_id INTO v_profile_tenant FROM public.profiles p WHERE p.user_id=p_user;
 IF v_profile_tenant IS NOT NULL AND v_profile_tenant<>v.tenant_id
 THEN RAISE EXCEPTION 'Existing account is registered at another centre' USING ERRCODE='42501';END IF;
 INSERT INTO public.profiles(user_id,tenant_id,full_name,email)
 VALUES(p_user,v.tenant_id,v.full_name,v.email)
 ON CONFLICT(user_id) DO UPDATE SET tenant_id=EXCLUDED.tenant_id
 WHERE public.profiles.tenant_id IS NULL OR public.profiles.tenant_id=EXCLUDED.tenant_id;
 INSERT INTO public.user_roles(user_id,role,tenant_id) VALUES(p_user,v.role,v.tenant_id)
 ON CONFLICT(user_id,role,tenant_id) DO NOTHING;
 IF v.role::text IN ('office_admin','hr_officer','secretary') AND
  v.requested_overrides<>'{}'::jsonb THEN
  INSERT INTO public.unipathway_staff_access_profiles
  (tenant_id,user_id,staff_role,overrides,revision,changed_by)
  VALUES (v.tenant_id,p_user,v.role,v.requested_overrides,1,v.prepared_by)
  ON CONFLICT(tenant_id,user_id,staff_role) DO NOTHING;
 END IF;
 UPDATE public.unipathway_staff_invitations SET
  status='assigned',assigned_user_id=p_user,
  email_sent=(email_sent OR coalesce(p_email_sent,false)),updated_at=now()
 WHERE id=v.id;
 INSERT INTO public.audit_logs(tenant_id,user_id,action,entity_type,entity_id,details)
 VALUES(v.tenant_id,v.prepared_by,'staff_invited','staff_invitation',v.id,
  jsonb_build_object('role',v.role::text,'emailSent',p_email_sent,'account',p_user));
 RETURN jsonb_build_object('status','assigned','userId',p_user,
  'centreId',v.tenant_id,'role',v.role::text,'emailSent',p_email_sent);
END
$fn$;

REVOKE ALL ON FUNCTION public.prepare_unipathway_account_invitation(text,text,text,uuid,jsonb),
 public.complete_unipathway_account_invitation(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_unipathway_account_invitation(text,text,text,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_unipathway_account_invitation(uuid,uuid,boolean) TO service_role;
COMMIT;
