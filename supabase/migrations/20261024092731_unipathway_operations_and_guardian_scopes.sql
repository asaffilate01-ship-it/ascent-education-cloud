CREATE TABLE public.unipathway_account_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.tenants(id),email text NOT NULL,
 full_name text NOT NULL,role public.app_role NOT NULL,requested_by uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','assigned','failed')),
 user_id uuid REFERENCES auth.users(id),email_sent boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 UNIQUE(tenant_id,email,role)
);
ALTER TABLE public.unipathway_account_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account operations own centre" ON public.unipathway_account_invitations FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'superadmin') OR (public.same_tenant(tenant_id) AND public.has_role(auth.uid(),'centre_director')));
GRANT SELECT ON public.unipathway_account_invitations TO authenticated;
GRANT ALL ON public.unipathway_account_invitations TO service_role;
CREATE FUNCTION public.prepare_unipathway_account_invitation(p_email text,p_name text,p_role public.app_role,p_tenant uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;u auth.users;q public.unipathway_account_invitations;super boolean;
BEGIN
 super:=public.has_role(auth.uid(),'superadmin');t:=CASE WHEN super THEN coalesce(p_tenant,public.get_user_tenant_id(auth.uid())) ELSE public.get_user_tenant_id(auth.uid()) END;
 IF auth.uid() IS NULL OR t IS NULL OR NOT (super OR public.has_role(auth.uid(),'centre_director')) THEN RAISE EXCEPTION 'Centre administrator required';END IF;
 IF NOT super AND p_tenant IS NOT NULL AND p_tenant IS DISTINCT FROM t THEN RAISE EXCEPTION 'Cannot administer another centre';END IF;
 IF p_role IS NULL OR p_role NOT IN ('student','parent_guardian','admissions_admin','lecturer','assessor','programme_leader','iqa_officer','exams_officer','finance_officer','marketing_officer','agent','welfare_officer','centre_director') OR (p_role='centre_director' AND NOT super) THEN RAISE EXCEPTION 'Role cannot be assigned';END IF;
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
CREATE FUNCTION public.complete_unipathway_account_invitation(p_invitation uuid,p_user uuid,p_email_sent boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.unipathway_account_invitations;u auth.users;old_tenant uuid;
BEGIN
 SELECT * INTO q FROM public.unipathway_account_invitations WHERE id=p_invitation FOR UPDATE;
 SELECT * INTO u FROM auth.users WHERE id=p_user;
 IF q.id IS NULL OR u.id IS NULL OR lower(u.email) IS DISTINCT FROM q.email THEN RAISE EXCEPTION 'Invitation identity mismatch';END IF;
 IF NOT(public.has_role(q.requested_by,'superadmin') OR (public.has_role(q.requested_by,'centre_director') AND public.get_user_tenant_id(q.requested_by)=q.tenant_id AND q.role<>'centre_director')) THEN RAISE EXCEPTION 'Invitation authority expired';END IF;
 IF q.status='assigned' THEN RETURN;END IF;
 old_tenant:=public.get_user_tenant_id(p_user);
 IF old_tenant IS DISTINCT FROM q.tenant_id THEN
  IF u.created_at<q.created_at OR u.invited_at IS NULL OR u.invited_at<q.created_at OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role<>'student') OR EXISTS(SELECT 1 FROM public.student_enrolments WHERE student_id=p_user) OR EXISTS(SELECT 1 FROM public.invoices WHERE student_id=p_user) THEN RAISE EXCEPTION 'Existing account centre cannot be reassigned';END IF;
  DELETE FROM public.user_roles WHERE user_id=p_user AND role='student';
 END IF;
 UPDATE public.profiles SET tenant_id=q.tenant_id,full_name=CASE WHEN u.created_at>=q.created_at THEN q.full_name ELSE full_name END WHERE user_id=p_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account profile missing';END IF;
 IF public.get_user_tenant_id(p_user) IS DISTINCT FROM q.tenant_id THEN RAISE EXCEPTION 'Account centre assignment did not persist';END IF;
 IF u.created_at>=q.created_at AND q.role<>'student' THEN DELETE FROM public.user_roles WHERE user_id=p_user AND role='student';END IF;
 INSERT INTO public.user_roles(user_id,tenant_id,role) VALUES(p_user,q.tenant_id,q.role) ON CONFLICT DO NOTHING;
 UPDATE public.unipathway_account_invitations SET status='assigned',user_id=p_user,email_sent=coalesce(p_email_sent,false),completed_at=now() WHERE id=q.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_unipathway_account_invitation(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_unipathway_account_invitation(uuid,uuid,boolean) TO service_role;

CREATE TABLE public.unipathway_guardian_scope_consents (
 link_id uuid REFERENCES public.parent_student_links(id) ON DELETE CASCADE,
 scope text CHECK(scope IN ('attendance','schedule','communication')),granted_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(link_id,scope)
);
ALTER TABLE public.unipathway_guardian_scope_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_guardian_scope_consents FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.clear_unipathway_guardian_consent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (NEW.parent_id,NEW.student_id,NEW.tenant_id,NEW.verified) IS DISTINCT FROM (OLD.parent_id,OLD.student_id,OLD.tenant_id,OLD.verified) THEN
 DELETE FROM public.unipathway_guardian_result_consents WHERE link_id=OLD.id;DELETE FROM public.unipathway_guardian_scope_consents WHERE link_id=OLD.id;
 END IF;
 IF (NEW.parent_id,NEW.student_id,NEW.tenant_id) IS DISTINCT FROM (OLD.parent_id,OLD.student_id,OLD.tenant_id) THEN
 RAISE EXCEPTION 'Create a new guardian link when identities change; existing discussions cannot be reassigned';
 END IF;RETURN NEW;
END $$;
CREATE FUNCTION public.set_unipathway_guardian_scope(p_link uuid,p_scope text,p_share boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.parent_student_links;
BEGIN
 SELECT * INTO l FROM public.parent_student_links WHERE id=p_link FOR UPDATE;
 IF auth.uid() IS NULL OR l.id IS NULL OR l.student_id<>auth.uid() OR p_share IS NULL OR p_scope IS NULL OR p_scope NOT IN ('attendance','schedule','communication') THEN RAISE EXCEPTION 'Linked learner and valid scope required';END IF;
 IF NOT p_share THEN DELETE FROM public.unipathway_guardian_scope_consents WHERE link_id=l.id AND scope=p_scope;RETURN;END IF;
 IF NOT l.verified OR l.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid()) OR l.tenant_id IS DISTINCT FROM public.get_user_tenant_id(l.parent_id) OR NOT public.has_role(l.parent_id,'parent_guardian') OR NOT public.has_role(auth.uid(),'student') THEN RAISE EXCEPTION 'Verified same-centre link required';END IF;
 INSERT INTO public.unipathway_guardian_scope_consents(link_id,scope) VALUES(l.id,p_scope) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.guardian_scope_allowed(p_link uuid,p_scope text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.unipathway_guardian_scope_consents c ON c.link_id=l.id
 WHERE l.id=p_link AND l.parent_id=auth.uid() AND l.verified AND c.scope=p_scope
 AND l.tenant_id=public.get_user_tenant_id(auth.uid()) AND l.tenant_id=public.get_user_tenant_id(l.student_id) AND public.has_role(auth.uid(),'parent_guardian') AND public.has_role(l.student_id,'student'))
$$;
CREATE FUNCTION public.guardian_staff_allowed(p_link uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.parent_student_links l WHERE l.id=p_link AND l.verified AND l.tenant_id=public.get_user_tenant_id(l.student_id) AND l.tenant_id=public.get_user_tenant_id(l.parent_id) AND public.has_role(l.student_id,'student') AND public.has_role(l.parent_id,'parent_guardian') AND l.tenant_id=public.get_user_tenant_id(auth.uid()) AND (
 public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'admissions_admin') OR public.has_role(auth.uid(),'programme_leader') OR
 (public.has_role(auth.uid(),'lecturer') AND EXISTS(SELECT 1 FROM public.student_enrolments e JOIN public.modules m ON m.programme_id=e.programme_id AND m.tenant_id=e.tenant_id WHERE e.student_id=l.student_id AND e.tenant_id=l.tenant_id AND e.status='active' AND m.lecturer_id=auth.uid()))))
$$;
CREATE FUNCTION public.guardian_learner_allowed(p_link uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.parent_student_links WHERE id=p_link AND student_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'student'))
$$;
REVOKE ALL ON FUNCTION public.guardian_learner_allowed(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guardian_learner_allowed(uuid) TO authenticated;
CREATE TABLE public.unipathway_guardian_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),link_id uuid NOT NULL REFERENCES public.parent_student_links(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_guardian_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scoped guardian discussion" ON public.unipathway_guardian_messages FOR SELECT TO authenticated
 USING(public.guardian_scope_allowed(link_id,'communication') OR public.guardian_staff_allowed(link_id) OR public.guardian_learner_allowed(link_id));
GRANT SELECT ON public.unipathway_guardian_messages TO authenticated;
CREATE FUNCTION public.send_unipathway_guardian_message(p_link uuid,p_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT(public.guardian_scope_allowed(p_link,'communication') OR public.guardian_staff_allowed(p_link)) THEN RAISE EXCEPTION 'Communication access required';END IF;
 IF p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,31));
 IF (SELECT count(*) FROM public.unipathway_guardian_messages WHERE author_id=auth.uid() AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Please wait before sending another message';END IF;
 INSERT INTO public.unipathway_guardian_messages(link_id,author_id,body) VALUES(p_link,auth.uid(),trim(p_body));
END $$;
CREATE FUNCTION public.get_unipathway_guardian_scopes() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'parent_name',p.full_name,'verified',l.verified,'scopes',coalesce((SELECT jsonb_agg(c.scope) FROM public.unipathway_guardian_scope_consents c WHERE c.link_id=l.id),'[]'::jsonb))),'[]'::jsonb)
 FROM public.parent_student_links l JOIN public.profiles p ON p.user_id=l.parent_id AND p.tenant_id=l.tenant_id
 WHERE auth.uid() IS NOT NULL AND l.student_id=auth.uid() AND l.tenant_id=public.get_user_tenant_id(auth.uid())
$$;
CREATE FUNCTION public.get_unipathway_guardian_activity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'verified',l.verified,
 'student_name',CASE WHEN public.guardian_scope_allowed(l.id,'attendance') OR public.guardian_scope_allowed(l.id,'schedule') OR public.guardian_scope_allowed(l.id,'communication') THEN (SELECT full_name FROM public.profiles WHERE user_id=l.student_id AND tenant_id=l.tenant_id) ELSE NULL END,
 'attendance_shared',public.guardian_scope_allowed(l.id,'attendance'),'schedule_shared',public.guardian_scope_allowed(l.id,'schedule'),'communication_shared',public.guardian_scope_allowed(l.id,'communication'),
 'attendance',CASE WHEN public.guardian_scope_allowed(l.id,'attendance') THEN (SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) FROM (SELECT r.date,r.status,m.title module FROM public.attendance_records r LEFT JOIN public.modules m ON m.id=r.module_id AND m.tenant_id=r.tenant_id WHERE r.student_id=l.student_id AND r.tenant_id=l.tenant_id ORDER BY r.date DESC LIMIT 100)a) ELSE '[]'::jsonb END,
 'schedule',CASE WHEN public.guardian_scope_allowed(l.id,'schedule') THEN (SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM (SELECT c.title,c.starts_at,c.ends_at,c.status FROM public.live_class_sessions c JOIN public.modules m ON m.id=c.module_id AND m.tenant_id=c.tenant_id WHERE c.tenant_id=l.tenant_id AND c.starts_at BETWEEN now()-interval '7 days' AND now()+interval '90 days' AND EXISTS(SELECT 1 FROM public.live_class_invitations i WHERE i.session_id=c.id AND i.user_id=l.student_id AND i.tenant_id=c.tenant_id AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now())) AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=l.student_id AND e.programme_id=m.programme_id AND e.tenant_id=c.tenant_id AND e.status='active') ORDER BY c.starts_at LIMIT 100)s) ELSE '[]'::jsonb END)),'[]'::jsonb)
 FROM public.parent_student_links l WHERE auth.uid() IS NOT NULL AND l.parent_id=auth.uid() AND l.tenant_id=public.get_user_tenant_id(auth.uid())
$$;
CREATE FUNCTION public.get_unipathway_guardian_staff_queue() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'verified',l.verified,'student_name',s.full_name,'parent_name',p.full_name)),'[]'::jsonb)
 FROM public.parent_student_links l JOIN public.profiles s ON s.user_id=l.student_id AND s.tenant_id=l.tenant_id JOIN public.profiles p ON p.user_id=l.parent_id AND p.tenant_id=l.tenant_id
 WHERE public.guardian_staff_allowed(l.id)
$$;
ALTER TABLE public.parent_student_links ADD COLUMN verification_reference text, ADD COLUMN verified_by uuid REFERENCES auth.users(id), ADD COLUMN verified_at timestamptz;
CREATE FUNCTION public.verify_unipathway_guardian_link(p_parent_email text,p_student_email text,p_reference text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent_user uuid;student_user uuid;t uuid;
BEGIN
 t:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR t IS NULL OR NOT(public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'admissions_admin')) OR p_reference IS NULL OR length(trim(p_reference)) NOT BETWEEN 10 AND 500 THEN RAISE EXCEPTION 'Centre verifier and evidence reference required';END IF;
 SELECT u.id INTO parent_user FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE lower(u.email)=lower(trim(p_parent_email)) AND p.tenant_id=t AND u.email_confirmed_at IS NOT NULL;
 SELECT u.id INTO student_user FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE lower(u.email)=lower(trim(p_student_email)) AND p.tenant_id=t AND u.email_confirmed_at IS NOT NULL;
 IF parent_user IS NULL OR student_user IS NULL OR NOT public.unipathway_guardian_link_scope(parent_user,student_user,t,true) THEN RAISE EXCEPTION 'Confirmed parent and learner accounts in this centre are required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(parent_user::text||student_user::text,29));
 IF EXISTS(SELECT 1 FROM public.parent_student_links WHERE parent_id=parent_user AND student_id=student_user AND tenant_id=t) THEN
 UPDATE public.parent_student_links SET verified=false WHERE parent_id=parent_user AND student_id=student_user AND tenant_id=t;
 UPDATE public.parent_student_links SET verified=true,verification_reference=trim(p_reference),verified_by=auth.uid(),verified_at=now() WHERE parent_id=parent_user AND student_id=student_user AND tenant_id=t;
 ELSE INSERT INTO public.parent_student_links(parent_id,student_id,tenant_id,verified,verification_reference,verified_by,verified_at) VALUES(parent_user,student_user,t,true,trim(p_reference),auth.uid(),now());END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_unipathway_guardian_scope(uuid,text,boolean),public.guardian_scope_allowed(uuid,text),public.guardian_staff_allowed(uuid),public.send_unipathway_guardian_message(uuid,text),public.get_unipathway_guardian_scopes(),public.get_unipathway_guardian_activity(),public.get_unipathway_guardian_staff_queue(),public.verify_unipathway_guardian_link(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_unipathway_guardian_scope(uuid,text,boolean),public.guardian_scope_allowed(uuid,text),public.guardian_staff_allowed(uuid),public.send_unipathway_guardian_message(uuid,text),public.get_unipathway_guardian_scopes(),public.get_unipathway_guardian_activity(),public.get_unipathway_guardian_staff_queue(),public.verify_unipathway_guardian_link(text,text,text) TO authenticated;

CREATE INDEX ON public.unipathway_guardian_messages(link_id,created_at DESC);
CREATE INDEX ON public.unipathway_guardian_messages(author_id,created_at DESC);

CREATE TABLE public.unipathway_centre_onboarding (
 tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
 country text NOT NULL CHECK(length(country) BETWEEN 1 AND 100), city text NOT NULL CHECK(length(city) BETWEEN 1 AND 100),
 company_registration text NOT NULL DEFAULT '' CHECK(length(company_registration)<=200),
 documents jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(documents)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_centre_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlord centre setup" ON public.unipathway_centre_onboarding FOR ALL TO authenticated
 USING(public.has_role(auth.uid(),'superadmin')) WITH CHECK(public.has_role(auth.uid(),'superadmin'));
GRANT SELECT,INSERT,UPDATE ON public.unipathway_centre_onboarding TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('unipathway-centre-documents','unipathway-centre-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png']);
CREATE POLICY "Landlord centre documents insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='unipathway-centre-documents' AND public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Landlord centre documents read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='unipathway-centre-documents' AND public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Landlord centre documents delete" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='unipathway-centre-documents' AND public.has_role(auth.uid(),'superadmin'));

-- Existing profile immutability triggers must permit only the trusted invitation
-- completion path, not a general tenant-transfer flag or user-editable metadata.
CREATE FUNCTION public.unipathway_invited_profile_transfer(p_user uuid,p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT current_setting('role',true)='service_role' AND EXISTS(
 SELECT 1 FROM public.unipathway_account_invitations q JOIN auth.users u ON lower(u.email)=q.email
 WHERE u.id=p_user AND q.tenant_id=p_tenant AND q.status='prepared' AND u.created_at>=q.created_at AND u.invited_at>=q.created_at
 AND (public.has_role(q.requested_by,'superadmin') OR (public.has_role(q.requested_by,'centre_director') AND public.get_user_tenant_id(q.requested_by)=q.tenant_id AND q.role<>'centre_director'))
 AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role<>'student')
 AND NOT EXISTS(SELECT 1 FROM public.student_enrolments WHERE student_id=p_user)
 AND NOT EXISTS(SELECT 1 FROM public.invoices WHERE student_id=p_user))
$$;
REVOKE ALL ON FUNCTION public.unipathway_invited_profile_transfer(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.prevent_profile_tenant_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.tenant_id IS DISTINCT FROM NEW.tenant_id AND NOT public.has_role(auth.uid(),'superadmin') AND NOT public.unipathway_invited_profile_transfer(NEW.user_id,NEW.tenant_id) THEN
 RAISE EXCEPTION 'Account centre cannot be changed';END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.prevent_tenant_id_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
 IF TG_TABLE_NAME='profiles' THEN
 IF public.unipathway_invited_profile_transfer(NEW.user_id,NEW.tenant_id) THEN RETURN NEW;END IF;
 END IF;
 RAISE EXCEPTION 'Cannot change tenant_id once assigned';END IF;
 RETURN NEW;
END $$;
