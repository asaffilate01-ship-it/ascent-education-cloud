-- Core assignment boundary. Compatible with the legacy live schema and current repository.
-- Programme marketing stays public; teaching records require an actual assignment.
CREATE SCHEMA IF NOT EXISTS unipathway_acl;
REVOKE ALL ON SCHEMA unipathway_acl FROM PUBLIC;
GRANT USAGE ON SCHEMA unipathway_acl TO authenticated;
CREATE OR REPLACE FUNCTION unipathway_acl.manager(t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'superadmin') OR
 (t=public.get_user_tenant_id(auth.uid()) AND (public.has_role(auth.uid(),'centre_director') OR public.has_role(auth.uid(),'programme_leader'))))
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.module_access(m_id uuid,t uuid,write_access boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.modules m JOIN public.programmes p ON p.id=m.programme_id AND p.tenant_id=m.tenant_id
 WHERE m.id=m_id AND m.tenant_id=t AND (unipathway_acl.manager(t) OR (t=public.get_user_tenant_id(auth.uid()) AND (
 (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer')) OR
 (NOT write_access AND public.has_role(auth.uid(),'student') AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.programme_id=m.programme_id AND e.tenant_id=t AND e.student_id=auth.uid() AND e.status='active'))))))
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.valid_enrolment(student uuid,programme uuid,t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.programmes p JOIN public.profiles u ON u.user_id=student AND u.tenant_id=p.tenant_id WHERE p.id=programme AND p.tenant_id=t) AND public.has_role(student,'student')
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.valid_module(programme uuid,lecturer uuid,t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.programmes p WHERE p.id=programme AND p.tenant_id=t)
 AND (lecturer IS NULL OR (EXISTS(SELECT 1 FROM public.profiles u WHERE u.user_id=lecturer AND u.tenant_id=t) AND public.has_role(lecturer,'lecturer')))
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.enrolment_reader(student uuid,programme uuid,t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (unipathway_acl.manager(t) OR (t=public.get_user_tenant_id(auth.uid()) AND (
 student=auth.uid() OR public.has_role(auth.uid(),'admissions_admin') OR
 (public.has_role(auth.uid(),'lecturer') AND EXISTS(SELECT 1 FROM public.modules m WHERE m.programme_id=programme AND m.tenant_id=t AND m.lecturer_id=auth.uid())))))
$$;
CREATE OR REPLACE FUNCTION unipathway_acl.session_access(s_id uuid,t uuid,write_access boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.classroom_sessions s WHERE s.id=s_id AND s.tenant_id=t AND (unipathway_acl.manager(t) OR unipathway_acl.module_access(s.module_id,t,write_access)))
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_acl FROM PUBLIC,anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA unipathway_acl TO authenticated;
-- Replace every old permissive policy on this bounded set: a broad OR policy would otherwise bypass assignment checks.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('modules','student_enrolments','assignments','scheduled_lectures','classroom_sessions','classroom_recordings') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,r.tablename);
 END LOOP;
END $$;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.modules FOR SELECT TO authenticated USING (unipathway_acl.module_access(id,tenant_id) OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admissions_admin')));
CREATE POLICY "assigned learning insert" ON public.modules FOR INSERT TO authenticated WITH CHECK (unipathway_acl.manager(tenant_id) AND unipathway_acl.valid_module(programme_id,lecturer_id,tenant_id));
CREATE POLICY "assigned learning update" ON public.modules FOR UPDATE TO authenticated USING (unipathway_acl.manager(tenant_id)) WITH CHECK (unipathway_acl.manager(tenant_id) AND unipathway_acl.valid_module(programme_id,lecturer_id,tenant_id));
CREATE POLICY "assigned learning delete" ON public.modules FOR DELETE TO authenticated USING (unipathway_acl.manager(tenant_id));
ALTER TABLE public.student_enrolments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.student_enrolments FOR SELECT TO authenticated USING (unipathway_acl.enrolment_reader(student_id,programme_id,tenant_id));
CREATE POLICY "assigned learning insert" ON public.student_enrolments FOR INSERT TO authenticated WITH CHECK ((unipathway_acl.manager(tenant_id) OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admissions_admin'))) AND unipathway_acl.valid_enrolment(student_id,programme_id,tenant_id));
CREATE POLICY "assigned learning update" ON public.student_enrolments FOR UPDATE TO authenticated USING (unipathway_acl.manager(tenant_id) OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admissions_admin'))) WITH CHECK ((unipathway_acl.manager(tenant_id) OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admissions_admin'))) AND unipathway_acl.valid_enrolment(student_id,programme_id,tenant_id));
CREATE POLICY "assigned learning delete" ON public.student_enrolments FOR DELETE TO authenticated USING (unipathway_acl.manager(tenant_id) OR (tenant_id=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admissions_admin')));
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.assignments FOR SELECT TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id,true) OR (status IN ('active','published') AND unipathway_acl.module_access(module_id,tenant_id)));
CREATE POLICY "assigned learning insert" ON public.assignments FOR INSERT TO authenticated WITH CHECK (unipathway_acl.module_access(module_id,tenant_id,true));
CREATE POLICY "assigned learning update" ON public.assignments FOR UPDATE TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id,true)) WITH CHECK (unipathway_acl.module_access(module_id,tenant_id,true));
CREATE POLICY "assigned learning delete" ON public.assignments FOR DELETE TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id,true));
ALTER TABLE public.scheduled_lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.scheduled_lectures FOR SELECT TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id));
CREATE POLICY "assigned learning insert" ON public.scheduled_lectures FOR INSERT TO authenticated WITH CHECK (unipathway_acl.module_access(module_id,tenant_id,true) AND EXISTS(SELECT 1 FROM public.modules m WHERE m.id=scheduled_lectures.module_id AND m.tenant_id=scheduled_lectures.tenant_id AND m.lecturer_id=scheduled_lectures.lecturer_id));
CREATE POLICY "assigned learning update" ON public.scheduled_lectures FOR UPDATE TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id,true)) WITH CHECK (unipathway_acl.module_access(module_id,tenant_id,true) AND EXISTS(SELECT 1 FROM public.modules m WHERE m.id=scheduled_lectures.module_id AND m.tenant_id=scheduled_lectures.tenant_id AND m.lecturer_id=scheduled_lectures.lecturer_id));
CREATE POLICY "assigned learning delete" ON public.scheduled_lectures FOR DELETE TO authenticated USING (unipathway_acl.module_access(module_id,tenant_id,true));
ALTER TABLE public.classroom_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.classroom_sessions FOR SELECT TO authenticated USING (unipathway_acl.manager(tenant_id) OR unipathway_acl.module_access(module_id,tenant_id));
CREATE POLICY "assigned learning insert" ON public.classroom_sessions FOR INSERT TO authenticated WITH CHECK ((unipathway_acl.manager(tenant_id) OR unipathway_acl.module_access(module_id,tenant_id,true)) AND (unipathway_acl.manager(tenant_id) OR host_id=auth.uid()) AND (module_id IS NULL OR unipathway_acl.module_access(module_id,tenant_id,true)));
CREATE POLICY "assigned learning update" ON public.classroom_sessions FOR UPDATE TO authenticated USING (unipathway_acl.manager(tenant_id) OR unipathway_acl.module_access(module_id,tenant_id,true)) WITH CHECK ((unipathway_acl.manager(tenant_id) OR unipathway_acl.module_access(module_id,tenant_id,true)) AND (unipathway_acl.manager(tenant_id) OR host_id=auth.uid()) AND (module_id IS NULL OR unipathway_acl.module_access(module_id,tenant_id,true)));
CREATE POLICY "assigned learning delete" ON public.classroom_sessions FOR DELETE TO authenticated USING (unipathway_acl.manager(tenant_id) OR unipathway_acl.module_access(module_id,tenant_id,true));
ALTER TABLE public.classroom_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assigned learning read" ON public.classroom_recordings FOR SELECT TO authenticated USING (unipathway_acl.session_access(session_id,tenant_id));
CREATE POLICY "assigned learning insert" ON public.classroom_recordings FOR INSERT TO authenticated WITH CHECK (unipathway_acl.session_access(session_id,tenant_id,true) AND (unipathway_acl.manager(tenant_id) OR host_id=auth.uid()));
CREATE POLICY "assigned learning update" ON public.classroom_recordings FOR UPDATE TO authenticated USING (unipathway_acl.session_access(session_id,tenant_id,true)) WITH CHECK (unipathway_acl.session_access(session_id,tenant_id,true) AND (unipathway_acl.manager(tenant_id) OR host_id=auth.uid()));
CREATE POLICY "assigned learning delete" ON public.classroom_recordings FOR DELETE TO authenticated USING (unipathway_acl.session_access(session_id,tenant_id,true));
CREATE INDEX IF NOT EXISTS enrolment_learning_scope ON public.student_enrolments(student_id,tenant_id,programme_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS module_lecturer_scope ON public.modules(lecturer_id,tenant_id,programme_id);
-- Legacy RPCs must obey these same table policies; otherwise SECURITY DEFINER bypasses them.
DO $$ BEGIN
 IF to_regprocedure('public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text)') IS NOT NULL THEN
  ALTER FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) SECURITY INVOKER;
  REVOKE ALL ON FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) FROM PUBLIC,anon;
  GRANT EXECUTE ON FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) TO authenticated;
 END IF;
 IF to_regprocedure('public.auto_enrol_student()') IS NOT NULL THEN
  ALTER FUNCTION public.auto_enrol_student() SECURITY INVOKER;
 END IF;
END $$;

-- RLS does not protect TRUNCATE. Keep client grants to row-level operations.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.modules, public.student_enrolments, public.assignments, public.scheduled_lectures, public.classroom_sessions, public.classroom_recordings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules, public.student_enrolments, public.assignments, public.scheduled_lectures, public.classroom_sessions, public.classroom_recordings TO authenticated;
