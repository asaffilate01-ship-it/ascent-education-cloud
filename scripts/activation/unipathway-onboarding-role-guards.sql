-- Exact current-centre membership, not a broadly inherited legacy role.
CREATE OR REPLACE FUNCTION unipathway_acl.onboarding_role(t uuid,allowed text[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND t IS NOT NULL AND t=public.get_user_tenant_id(auth.uid())
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid()
 AND r.role::text=ANY(allowed) AND ((r.role::text='superadmin' AND r.tenant_id IS NULL) OR (r.role::text<>'superadmin' AND r.tenant_id=t)))
$$;
REVOKE ALL ON FUNCTION unipathway_acl.onboarding_role(uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_acl.onboarding_role(uuid,text[]) TO authenticated;
REVOKE ALL ON public.onboarding_application_drafts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.onboarding_application_drafts TO authenticated;
DROP POLICY "own application drafts" ON public.onboarding_application_drafts;
DROP POLICY "authorised application review" ON public.onboarding_application_drafts;
CREATE POLICY "verified applicant or reviewer read" ON public.onboarding_application_drafts FOR SELECT TO authenticated USING(
 (user_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY[kind]))
 OR unipathway_acl.onboarding_role(tenant_id,ARRAY['superadmin','centre_director'])
 OR (kind='student' AND unipathway_acl.onboarding_role(tenant_id,ARRAY['admissions_admin'])));
CREATE POLICY "verified applicant insert" ON public.onboarding_application_drafts FOR INSERT TO authenticated WITH CHECK(
 user_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY[kind]));
CREATE POLICY "verified applicant update" ON public.onboarding_application_drafts FOR UPDATE TO authenticated USING(
 user_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY[kind])) WITH CHECK(
 user_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY[kind]));
CREATE FUNCTION unipathway_acl.onboarding_draft_identity() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF ROW(NEW.user_id,NEW.tenant_id,NEW.kind) IS DISTINCT FROM ROW(OLD.user_id,OLD.tenant_id,OLD.kind) THEN RAISE EXCEPTION 'Application identity cannot be changed' USING ERRCODE='42501'; END IF;
 END IF;
 NEW.updated_at:=clock_timestamp();RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.onboarding_draft_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER onboarding_draft_identity BEFORE INSERT OR UPDATE ON public.onboarding_application_drafts FOR EACH ROW EXECUTE FUNCTION unipathway_acl.onboarding_draft_identity();
DROP POLICY "teaching review read" ON public.onboarding_teaching_reviews;
CREATE POLICY "verified teaching review read" ON public.onboarding_teaching_reviews FOR SELECT TO authenticated USING(
 (lecturer_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY['lecturer']))
 OR unipathway_acl.onboarding_role(tenant_id,ARRAY['superadmin','centre_director']));
DROP POLICY "application event read" ON public.onboarding_application_events;
CREATE POLICY "verified application event read" ON public.onboarding_application_events FOR SELECT TO authenticated USING(
 (user_id=auth.uid() AND unipathway_acl.onboarding_role(tenant_id,ARRAY[kind]))
 OR unipathway_acl.onboarding_role(tenant_id,ARRAY['superadmin','centre_director'])
 OR (kind='student' AND unipathway_acl.onboarding_role(tenant_id,ARRAY['admissions_admin'])));
DROP POLICY "centre registration read" ON public.onboarding_module_registrations;
CREATE POLICY "verified centre registration read" ON public.onboarding_module_registrations FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.id=enrolment_id AND e.tenant_id=onboarding_module_registrations.tenant_id
 AND ((e.student_id=auth.uid() AND unipathway_acl.onboarding_role(e.tenant_id,ARRAY['student']))
 OR unipathway_acl.onboarding_role(e.tenant_id,ARRAY['superadmin','centre_director','programme_leader']))));

CREATE OR REPLACE FUNCTION public.record_onboarding_module_registration(p_enrolment uuid,p_module uuid,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.student_enrolments%ROWTYPE;
BEGIN
 SELECT * INTO e FROM public.student_enrolments WHERE id=p_enrolment FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR e.tenant_id IS DISTINCT FROM public.current_unipathway_tenant_id()
 OR NOT unipathway_acl.onboarding_role(e.tenant_id,ARRAY['superadmin','centre_director','programme_leader']) OR e.status<>'active'
 OR p_status IS NULL OR p_status NOT IN ('registered','withdrawn','exempt')
 OR NOT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=p_module AND m.tenant_id=e.tenant_id AND m.programme_id=e.programme_id)
 THEN RAISE EXCEPTION 'Authorised active enrolment and matching module required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.onboarding_module_registrations(enrolment_id,module_id,tenant_id,status,recorded_by,recorded_at)
 VALUES(e.id,p_module,e.tenant_id,p_status,auth.uid(),now())
 ON CONFLICT(enrolment_id,module_id) DO UPDATE SET status=excluded.status,recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at;
END $$;


CREATE OR REPLACE FUNCTION public.review_onboarding_teaching_competency(p_lecturer uuid,p_slot integer,p_declaration jsonb,p_decision text,p_evidence text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.onboarding_application_drafts%ROWTYPE; prefix text; snapshot jsonb; t uuid;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR auth.uid()=p_lecturer OR
 NOT unipathway_acl.onboarding_role(t,ARRAY['superadmin','centre_director']) OR
 p_slot IS NULL OR p_slot NOT BETWEEN 1 AND 20 OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected','revoked') OR
 p_evidence IS NULL OR length(trim(p_evidence)) NOT BETWEEN 5 AND 1000
 THEN RAISE EXCEPTION 'Independent authorised review and evidence required' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_lecturer AND tenant_id=t AND kind='lecturer' FOR UPDATE;
 IF NOT FOUND OR (p_decision='approved' AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_lecturer AND r.tenant_id=t AND r.role::text='lecturer')) THEN RAISE EXCEPTION 'Teaching declaration unavailable' USING ERRCODE='42501'; END IF;
 prefix:='Competency '||p_slot||' — ';
 snapshot:=jsonb_build_object('subject',coalesce(d.answers->>(prefix||'Subject'),''),'framework',coalesce(d.answers->>(prefix||'Curriculum / awarding body'),''),'level',coalesce(d.answers->>(prefix||'Maximum level / grade'),''),'experience',coalesce(d.answers->>(prefix||'Relevant qualification or experience'),''));
 IF snapshot IS DISTINCT FROM p_declaration OR length(trim(snapshot->>'subject'))=0 OR length(trim(snapshot->>'level'))=0 OR length(trim(snapshot->>'framework'))=0
 THEN RAISE EXCEPTION 'Complete current declaration required; refresh before reviewing' USING ERRCODE='40001'; END IF;
 INSERT INTO public.onboarding_teaching_reviews(tenant_id,lecturer_id,slot,subject,framework,maximum_level,declaration,decision,evidence_reference,reviewed_by)
 VALUES(t,p_lecturer,p_slot,snapshot->>'subject',snapshot->>'framework',snapshot->>'level',snapshot,p_decision,trim(p_evidence),auth.uid());
END $$;


CREATE OR REPLACE FUNCTION public.record_onboarding_application_event(p_user uuid,p_kind text,p_snapshot jsonb,p_action text,p_note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.onboarding_application_drafts%ROWTYPE; prior text; t uuid;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR p_kind IS NULL OR p_kind NOT IN ('student','lecturer') OR p_action IS NULL OR p_action NOT IN ('submitted','screened','changes_requested','declined') OR p_note IS NULL OR length(p_note)>1000 THEN
 RAISE EXCEPTION 'Invalid application action' USING ERRCODE='42501'; END IF;
 IF p_action='submitted' THEN
 IF auth.uid() IS DISTINCT FROM p_user OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text=p_kind) THEN RAISE EXCEPTION 'Applicant role required' USING ERRCODE='42501'; END IF;
 ELSE
 IF auth.uid()=p_user OR NOT (unipathway_acl.onboarding_role(t,ARRAY['superadmin','centre_director']) OR (p_kind='student' AND unipathway_acl.onboarding_role(t,ARRAY['admissions_admin']))) OR length(trim(p_note))<5 THEN RAISE EXCEPTION 'Independent reviewer and note required' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_user AND tenant_id=t AND kind=p_kind FOR UPDATE;
 IF NOT FOUND OR d.answers IS DISTINCT FROM p_snapshot OR length(trim(coalesce(d.answers->>'Full legal name','')))=0 OR length(trim(coalesce(d.answers->>'Email','')))=0 THEN RAISE EXCEPTION 'Save complete current application first' USING ERRCODE='40001'; END IF;
 SELECT action INTO prior FROM public.onboarding_application_events WHERE user_id=p_user AND tenant_id=t AND kind=p_kind AND snapshot=p_snapshot ORDER BY created_at DESC,id DESC LIMIT 1;
 IF p_action='submitted' AND prior='submitted' THEN RETURN; END IF;
 IF p_action<>'submitted' AND prior IS DISTINCT FROM 'submitted' THEN RAISE EXCEPTION 'Current application must be submitted before screening' USING ERRCODE='40001'; END IF;
 INSERT INTO public.onboarding_application_events(user_id,tenant_id,kind,snapshot,action,note,actor_id) VALUES(p_user,t,p_kind,p_snapshot,p_action,trim(p_note),auth.uid());
END $$;


CREATE OR REPLACE FUNCTION public.get_onboarding_application_status(p_user uuid,p_kind text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; d public.onboarding_application_drafts%ROWTYPE; ev public.onboarding_application_events%ROWTYPE;
BEGIN
 t:=public.current_unipathway_tenant_id();
 IF auth.uid() IS NULL OR t IS NULL OR p_kind IS NULL OR p_kind NOT IN ('student','lecturer') OR NOT (
 (auth.uid()=p_user AND unipathway_acl.onboarding_role(t,ARRAY[p_kind])) OR unipathway_acl.onboarding_role(t,ARRAY['superadmin','centre_director']) OR (p_kind='student' AND unipathway_acl.onboarding_role(t,ARRAY['admissions_admin'])))
 THEN RAISE EXCEPTION 'Application access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.onboarding_application_drafts WHERE user_id=p_user AND tenant_id=t AND kind=p_kind;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','draft','current',false); END IF;
 SELECT * INTO ev FROM public.onboarding_application_events WHERE user_id=p_user AND tenant_id=t AND kind=p_kind ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','draft','current',false); END IF;
 RETURN jsonb_build_object('status',CASE WHEN ev.snapshot=d.answers THEN ev.action ELSE 'draft' END,'current',ev.snapshot=d.answers,'previousStatus',ev.action,'note',ev.note,'recordedAt',ev.created_at);
END $$;


NOTIFY pgrst,'reload schema';
