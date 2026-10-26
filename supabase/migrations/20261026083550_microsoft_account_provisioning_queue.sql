-- Queue-only activation is safe without Graph credentials. Provider worker is opt-in.
CREATE TABLE IF NOT EXISTS public.microsoft_education_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL, user_id uuid NOT NULL,
 role_type text NOT NULL CHECK(role_type IN ('student','lecturer','staff','moderator')),
 entra_object_id text,user_principal_name text,institutional_email text,license_sku text,
 provisioning_status text NOT NULL DEFAULT 'pending',provisioned_at timestamptz,disabled_at timestamptz,
 UNIQUE(tenant_id,user_id)
);
ALTER TABLE public.microsoft_education_accounts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.unipathway_microsoft_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL,user_id uuid NOT NULL,
 role_type text NOT NULL CHECK(role_type IN ('student','lecturer','staff')),
 requested_by uuid NOT NULL,status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','failed','completed')),
 attempts integer NOT NULL DEFAULT 0,lease_token uuid,lease_until timestamptz,error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,user_id)
);
ALTER TABLE public.unipathway_microsoft_jobs ENABLE ROW LEVEL SECURITY;
-- Definers are narrow RPC boundaries: no direct browser writes or worker leases exposed.
CREATE FUNCTION public.can_manage_unipathway_microsoft(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p
 JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id
 WHERE p.user_id=auth.uid() AND p.tenant_id=p_tenant AND r.role::text IN ('superadmin','centre_director'))
$$;
REVOKE ALL ON FUNCTION public.can_manage_unipathway_microsoft(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_unipathway_microsoft(uuid) TO authenticated;
REVOKE ALL ON public.unipathway_microsoft_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,tenant_id,user_id,role_type,requested_by,status,attempts,error_code,created_at,updated_at) ON public.unipathway_microsoft_jobs TO authenticated;
CREATE POLICY "microsoft job admin read" ON public.unipathway_microsoft_jobs FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_microsoft(tenant_id));
REVOKE INSERT,UPDATE,DELETE ON public.microsoft_education_accounts FROM anon,authenticated;
GRANT SELECT ON public.microsoft_education_accounts TO authenticated;
CREATE POLICY "microsoft account centre admin read" ON public.microsoft_education_accounts FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_microsoft(tenant_id) OR (user_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())));
CREATE FUNCTION public.request_unipathway_microsoft_account(p_user uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;r text;j uuid;
BEGIN
 SELECT tenant_id INTO t FROM public.profiles WHERE user_id=p_user;
 IF NOT public.can_manage_unipathway_microsoft(t) THEN RAISE EXCEPTION 'Centre administrator required'; END IF;
 SELECT CASE WHEN role::text='lecturer' THEN 'lecturer' WHEN role::text='student' THEN 'student' ELSE 'staff' END INTO r
 FROM public.user_roles WHERE user_id=p_user AND tenant_id=t AND role::text IN
 ('student','lecturer','superadmin','centre_director','programme_leader','admissions_admin','finance_officer','exams_officer','iqa_officer','assessor','welfare_officer')
 ORDER BY CASE WHEN role::text='lecturer' THEN 0 WHEN role::text='student' THEN 2 ELSE 1 END LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'Eligible student or staff role required'; END IF;
 IF r='student' AND NOT EXISTS(SELECT 1 FROM public.student_enrolments WHERE student_id=p_user AND tenant_id=t AND status='active') THEN
 RAISE EXCEPTION 'Active enrolment required'; END IF;
 IF EXISTS(SELECT 1 FROM public.microsoft_education_accounts WHERE tenant_id=t AND user_id=p_user AND entra_object_id IS NOT NULL) THEN
 RAISE EXCEPTION 'Account already mapped; use Microsoft administration for changes'; END IF;
 INSERT INTO public.unipathway_microsoft_jobs(tenant_id,user_id,role_type,requested_by) VALUES(t,p_user,r,auth.uid())
 ON CONFLICT(tenant_id,user_id) DO UPDATE SET status=CASE WHEN unipathway_microsoft_jobs.status='failed' THEN 'queued' ELSE unipathway_microsoft_jobs.status END,
 attempts=CASE WHEN unipathway_microsoft_jobs.status='failed' THEN 0 ELSE unipathway_microsoft_jobs.attempts END,
 role_type=CASE WHEN unipathway_microsoft_jobs.status='failed' THEN EXCLUDED.role_type ELSE unipathway_microsoft_jobs.role_type END,requested_by=auth.uid(),updated_at=now(),error_code=NULL RETURNING id INTO j;
 RETURN j;
END $$;
REVOKE ALL ON FUNCTION public.request_unipathway_microsoft_account(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_unipathway_microsoft_account(uuid) TO authenticated;
CREATE FUNCTION public.claim_unipathway_microsoft_job(p_tenant uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.unipathway_microsoft_jobs;name text;
BEGIN
 UPDATE public.unipathway_microsoft_jobs SET status='failed',error_code='attempt_limit',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE tenant_id=p_tenant AND status='processing' AND lease_until<now() AND attempts>=5;
 SELECT * INTO j FROM public.unipathway_microsoft_jobs WHERE tenant_id=p_tenant AND attempts<5
 AND (status='queued' OR (status='processing' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
 IF j.id IS NULL THEN RETURN NULL; END IF;
 -- Recheck centre, requester authority and current target eligibility before every attempt.
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id
 WHERE p.user_id=j.requested_by AND p.tenant_id=j.tenant_id AND r.role::text IN ('superadmin','centre_director'))
 OR NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id
 WHERE p.user_id=j.user_id AND p.tenant_id=j.tenant_id AND
 ((j.role_type='student' AND r.role::text='student') OR (j.role_type='lecturer' AND r.role::text='lecturer') OR
 (j.role_type='staff' AND r.role::text IN ('superadmin','centre_director','programme_leader','admissions_admin','finance_officer','exams_officer','iqa_officer','assessor','welfare_officer'))))
 OR (j.role_type='student' AND NOT EXISTS(SELECT 1 FROM public.student_enrolments WHERE student_id=j.user_id AND tenant_id=j.tenant_id AND status='active')) THEN
 UPDATE public.unipathway_microsoft_jobs SET status='failed',error_code='eligibility_changed',updated_at=now() WHERE id=j.id;RETURN NULL;END IF;
 SELECT full_name INTO name FROM public.profiles WHERE user_id=j.user_id AND tenant_id=j.tenant_id;
 UPDATE public.unipathway_microsoft_jobs SET status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() WHERE id=j.id RETURNING * INTO j;
 RETURN jsonb_build_object('job',to_jsonb(j),'display_name',name);
END $$;
CREATE FUNCTION public.finish_unipathway_microsoft_job(p_job uuid,p_lease uuid,p_object uuid DEFAULT NULL,p_upn text DEFAULT NULL,p_sku uuid DEFAULT NULL,p_error text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.unipathway_microsoft_jobs;
BEGIN
 SELECT * INTO j FROM public.unipathway_microsoft_jobs WHERE id=p_job AND lease_token=p_lease AND status='processing' AND lease_until>now() FOR UPDATE;
 IF j.id IS NULL THEN RAISE EXCEPTION 'Active worker lease required'; END IF;
 IF p_error IS NOT NULL THEN
 UPDATE public.unipathway_microsoft_jobs SET status='failed',error_code=left(regexp_replace(p_error,'[^a-z0-9_]','','g'),80),lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=j.id;RETURN;END IF;
 IF p_object IS NULL OR p_upn IS NULL OR length(p_upn)>254 OR p_upn !~ '^[a-z0-9]+@[a-z0-9.-]+$' OR p_sku IS NULL THEN RAISE EXCEPTION 'Verified provider receipt required';END IF;
 INSERT INTO public.microsoft_education_accounts(tenant_id,user_id,role_type,entra_object_id,user_principal_name,institutional_email,license_sku,provisioning_status,provisioned_at,disabled_at)
 VALUES(j.tenant_id,j.user_id,j.role_type,p_object::text,p_upn,p_upn,p_sku::text,'provisioned_disabled',now(),now())
 ON CONFLICT(tenant_id,user_id) DO UPDATE SET entra_object_id=EXCLUDED.entra_object_id,user_principal_name=EXCLUDED.user_principal_name,institutional_email=EXCLUDED.institutional_email,license_sku=EXCLUDED.license_sku,provisioning_status=EXCLUDED.provisioning_status,provisioned_at=EXCLUDED.provisioned_at,disabled_at=EXCLUDED.disabled_at
 WHERE microsoft_education_accounts.entra_object_id IS NULL OR microsoft_education_accounts.entra_object_id=EXCLUDED.entra_object_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Existing identity mapping conflict';END IF;
 UPDATE public.unipathway_microsoft_jobs SET status='completed',lease_token=NULL,lease_until=NULL,error_code=NULL,updated_at=now() WHERE id=j.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_unipathway_microsoft_job(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_unipathway_microsoft_job(uuid,uuid,uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_unipathway_microsoft_job(uuid),public.finish_unipathway_microsoft_job(uuid,uuid,uuid,text,uuid,text) TO service_role;
