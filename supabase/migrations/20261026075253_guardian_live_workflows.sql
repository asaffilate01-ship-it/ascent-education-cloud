-- Bounded bridge for the legacy production schema. Preserve the modern invited-class service.
DO $bridge$ BEGIN
IF to_regclass('public.unipathway_guardian_scope_consents') IS NULL THEN
EXECUTE $install$
CREATE TABLE public.unipathway_guardian_result_consents (
 link_id uuid PRIMARY KEY REFERENCES public.parent_student_links(id) ON DELETE CASCADE,
 student_id uuid NOT NULL, tenant_id uuid NOT NULL,
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_guardian_result_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_guardian_result_consents FROM anon,authenticated;

-- Narrow definer predicate avoids exposing the general tenant-lookup helper.
CREATE FUNCTION public.unipathway_guardian_link_scope(p_parent uuid,p_student uuid,p_tenant uuid,p_staff boolean)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND p_parent<>p_student
 AND p_tenant=public.get_user_tenant_id(auth.uid())
 AND p_tenant=public.get_user_tenant_id(p_parent) AND p_tenant=public.get_user_tenant_id(p_student)
 AND public.has_role(p_parent,'parent_guardian'::public.app_role)
 AND public.has_role(p_student,'student'::public.app_role)
 AND CASE WHEN p_staff THEN public.has_role(auth.uid(),'centre_director'::public.app_role)
 OR public.has_role(auth.uid(),'admissions_admin'::public.app_role)
 ELSE p_parent=auth.uid() END
$$;
-- Parent requests cannot self-verify or name a student from another centre.
DROP POLICY IF EXISTS "Parents can request link" ON public.parent_student_links;
CREATE POLICY "Parents can request link" ON public.parent_student_links FOR INSERT TO authenticated
 WITH CHECK(verified=false AND public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,false));
DROP POLICY IF EXISTS "Staff manage parent links" ON public.parent_student_links;
CREATE POLICY "Staff manage parent links" ON public.parent_student_links FOR ALL TO authenticated
 USING(public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,true))
 WITH CHECK(public.unipathway_guardian_link_scope(parent_id,student_id,tenant_id,true));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.parent_student_links TO authenticated;

CREATE FUNCTION public.clear_unipathway_guardian_consent() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF (NEW.parent_id,NEW.student_id,NEW.tenant_id,NEW.verified)
 IS DISTINCT FROM (OLD.parent_id,OLD.student_id,OLD.tenant_id,OLD.verified) THEN
  DELETE FROM public.unipathway_guardian_result_consents WHERE link_id=OLD.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER clear_guardian_consent_on_link_change BEFORE UPDATE ON public.parent_student_links
 FOR EACH ROW EXECUTE FUNCTION public.clear_unipathway_guardian_consent();

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
 'schedule',CASE WHEN public.guardian_scope_allowed(l.id,'schedule') THEN (SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM (SELECT m.title,(d.day::date+c.start_time) AT TIME ZONE 'Asia/Karachi' starts_at,(d.day::date+c.end_time) AT TIME ZONE 'Asia/Karachi' ends_at,'weekly timetable'::text status
 FROM public.scheduled_lectures c JOIN public.modules m ON m.id=c.module_id AND m.tenant_id=c.tenant_id
 CROSS JOIN generate_series((now() AT TIME ZONE 'Asia/Karachi')::date-7,(now() AT TIME ZONE 'Asia/Karachi')::date+35,interval '1 day') d(day)
 WHERE c.tenant_id=l.tenant_id AND c.is_active AND c.recurrence='weekly' AND nullif(btrim(c.cohort_reference),'') IS NULL AND extract(isodow FROM d.day)=c.day_of_week
 AND d.day::date>=c.effective_from AND (c.effective_until IS NULL OR d.day::date<=c.effective_until)
 AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=l.student_id AND e.programme_id=m.programme_id AND e.tenant_id=c.tenant_id AND e.status='active') ORDER BY starts_at LIMIT 100)s) ELSE '[]'::jsonb END)),'[]'::jsonb)
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

-- Preserve old clients; new clients supply a stable request UUID for safe retries.
ALTER TABLE public.unipathway_guardian_messages ADD COLUMN request_id uuid;
CREATE UNIQUE INDEX guardian_message_request ON public.unipathway_guardian_messages(author_id,request_id) WHERE request_id IS NOT NULL;
REVOKE INSERT,UPDATE,DELETE ON public.unipathway_guardian_messages FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.send_unipathway_guardian_message_once(p_link uuid,p_body text,p_request uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE existing public.unipathway_guardian_messages; saved uuid;
BEGIN
 IF auth.uid() IS NULL OR p_request IS NULL THEN RAISE EXCEPTION 'Signed-in author and request ID required' USING ERRCODE='42501';END IF;
 IF p_body IS NULL OR length(trim(p_body)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters';END IF;
 -- Same author lock as the legacy sender: retries and new messages share the rate limit.
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,31));
 -- Consent changes and guardian reverification take an exclusive lock on this link.
 PERFORM 1 FROM public.parent_student_links WHERE id=p_link FOR SHARE;
 IF NOT(public.guardian_scope_allowed(p_link,'communication') OR public.guardian_staff_allowed(p_link)) THEN RAISE EXCEPTION 'Communication access required' USING ERRCODE='42501';END IF;
 SELECT * INTO existing FROM public.unipathway_guardian_messages WHERE author_id=auth.uid() AND request_id=p_request;
 IF FOUND THEN
  IF (existing.link_id,existing.body) IS DISTINCT FROM (p_link,trim(p_body)) THEN RAISE EXCEPTION 'Request ID already used for a different message';END IF;
  RETURN existing.id;
 END IF;
 IF (SELECT count(*) FROM public.unipathway_guardian_messages WHERE author_id=auth.uid() AND created_at>now()-interval '1 minute')>=10 THEN RAISE EXCEPTION 'Please wait before sending another message';END IF;
 INSERT INTO public.unipathway_guardian_messages(link_id,author_id,body,request_id) VALUES(p_link,auth.uid(),trim(p_body),p_request) RETURNING id INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.send_unipathway_guardian_message_once(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.send_unipathway_guardian_message_once(uuid,text,uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.unipathway_guardian_link_scope(uuid,uuid,uuid,boolean),public.clear_unipathway_guardian_consent() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_guardian_link_scope(uuid,uuid,uuid,boolean) TO authenticated;
REVOKE ALL ON public.unipathway_guardian_result_consents,public.unipathway_guardian_scope_consents FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS "Parents view own links" ON public.parent_student_links;
CREATE POLICY "Parents view own links" ON public.parent_student_links FOR SELECT TO authenticated
 USING(parent_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'parent_guardian'));
$install$;
END IF;
END $bridge$;
