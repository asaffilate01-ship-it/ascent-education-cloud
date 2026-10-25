-- Preserve existing tenant-scoped invitation checks; allow security staff.
CREATE OR REPLACE FUNCTION public.prepare_unipathway_account_invitation(p_email text,p_name text,p_role public.app_role,p_tenant uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;u auth.users;q public.unipathway_account_invitations;super boolean;
BEGIN
 super:=public.has_role(auth.uid(),'superadmin');t:=CASE WHEN super THEN coalesce(p_tenant,public.get_user_tenant_id(auth.uid())) ELSE public.get_user_tenant_id(auth.uid()) END;
 IF auth.uid() IS NULL OR t IS NULL OR NOT (super OR public.has_role(auth.uid(),'centre_director')) THEN RAISE EXCEPTION 'Centre administrator required';END IF;
 IF NOT super AND p_tenant IS NOT NULL AND p_tenant IS DISTINCT FROM t THEN RAISE EXCEPTION 'Cannot administer another centre';END IF;
 IF p_role IS NULL OR p_role NOT IN ('student','parent_guardian','admissions_admin','lecturer','assessor','programme_leader','iqa_officer','exams_officer','finance_officer','marketing_officer','agent','welfare_officer','security_officer','centre_director') OR (p_role='centre_director' AND NOT super) THEN RAISE EXCEPTION 'Role cannot be assigned';END IF;
 p_email:=lower(trim(p_email));p_name:=trim(p_name);
 IF p_email IS NULL OR length(p_email)>254 OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_name IS NULL OR length(p_name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Valid email and name required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(t::text||p_email,23));
 SELECT * INTO q FROM public.unipathway_account_invitations WHERE tenant_id=t AND email=p_email AND role=p_role FOR UPDATE;
 SELECT * INTO u FROM auth.users WHERE lower(email)=p_email;
 IF u.id IS NOT NULL AND public.get_user_tenant_id(u.id) IS DISTINCT FROM t AND (q.id IS NULL OR u.created_at<q.created_at OR u.invited_at IS NULL OR u.invited_at<q.created_at) THEN RAISE EXCEPTION 'Account cannot be assigned to this centre';END IF;
 IF q.id IS NULL THEN
  IF (SELECT count(*) FROM public.unipathway_account_invitations WHERE requested_by=auth.uid() AND created_at>now()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Hourly invitation limit reached';END IF;
  INSERT INTO public.unipathway_account_invitations(tenant_id,email,full_name,role,requested_by) VALUES(t,p_email,p_name,p_role,auth.uid()) RETURNING * INTO q;
 END IF;
 IF q.status='assigned' AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u.id AND tenant_id=t AND role=p_role) THEN
 UPDATE public.unipathway_account_invitations SET status='prepared',requested_by=auth.uid(),full_name=p_name WHERE id=q.id RETURNING * INTO q;
 END IF;
 RETURN jsonb_build_object('id',q.id,'status',q.status,'email',q.email,'full_name',q.full_name,'existing_user_id',u.id,'email_sent',q.email_sent);
END $$;
REVOKE ALL ON FUNCTION public.prepare_unipathway_account_invitation(text,text,public.app_role,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_unipathway_account_invitation(text,text,public.app_role,uuid) TO authenticated;
