-- Emergency rollback of the bounded learning policy change only. Restores known broad legacy access.
-- Review before use; do not run during normal deployment.
BEGIN;
DO $$ DECLARE r record; BEGIN FOR r IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('modules','student_enrolments','assignments','scheduled_lectures','classroom_sessions','classroom_recordings') LOOP EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,r.tablename); END LOOP; END $$;
CREATE POLICY "Staff manage assignments" ON public."assignments" FOR ALL TO "authenticated" USING (((has_role(auth.uid(), 'lecturer'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'programme_leader'::app_role)) AND (tenant_id = get_user_tenant_id(auth.uid()))));
CREATE POLICY "Tenant users can view assignments" ON public."assignments" FOR SELECT TO "authenticated" USING ((tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Hosts insert own recordings" ON public."classroom_recordings" FOR INSERT TO "authenticated" WITH CHECK ((host_id = auth.uid()));
CREATE POLICY "Staff manage tenant recordings" ON public."classroom_recordings" FOR ALL TO "authenticated" USING (((has_role(auth.uid(), 'lecturer'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role)) AND (tenant_id = get_user_tenant_id(auth.uid()))));
CREATE POLICY "Students view tenant recordings" ON public."classroom_recordings" FOR SELECT TO "authenticated" USING ((tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Authenticated users can create sessions" ON public."classroom_sessions" FOR INSERT TO "authenticated" WITH CHECK ((host_id = auth.uid()));
CREATE POLICY "Hosts can update own sessions" ON public."classroom_sessions" FOR UPDATE TO "authenticated" USING ((host_id = auth.uid()));
CREATE POLICY "Tenant users can view classroom sessions" ON public."classroom_sessions" FOR SELECT TO "authenticated" USING (((tenant_id = get_user_tenant_id(auth.uid())) OR (host_id = auth.uid())));
CREATE POLICY "Directors manage modules" ON public."modules" FOR ALL TO "authenticated" USING (((has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'programme_leader'::app_role)) AND (tenant_id = get_user_tenant_id(auth.uid()))));
CREATE POLICY "Public can view active modules" ON public."modules" FOR SELECT TO "anon" USING ((status = 'active'::programme_status));
CREATE POLICY "Tenant users can view modules" ON public."modules" FOR SELECT TO "authenticated" USING ((tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Directors and lecturers manage schedules" ON public."scheduled_lectures" FOR ALL TO "authenticated" USING (((has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'programme_leader'::app_role) OR (lecturer_id = auth.uid())) AND (tenant_id = get_user_tenant_id(auth.uid()))));
CREATE POLICY "Superadmins manage all schedules" ON public."scheduled_lectures" FOR ALL TO "authenticated" USING (has_role(auth.uid(), 'superadmin'::app_role));
CREATE POLICY "Tenant users view schedules" ON public."scheduled_lectures" FOR SELECT TO "authenticated" USING ((tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Admissions staff manage enrolments" ON public."student_enrolments" FOR ALL TO "authenticated" USING (((has_role(auth.uid(), 'admissions_admin'::app_role) OR has_role(auth.uid(), 'centre_director'::app_role)) AND (tenant_id = get_user_tenant_id(auth.uid()))));
CREATE POLICY "Staff view tenant enrolments" ON public."student_enrolments" FOR SELECT TO "authenticated" USING (((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'centre_director'::app_role) OR has_role(auth.uid(), 'admissions_admin'::app_role) OR has_role(auth.uid(), 'lecturer'::app_role) OR has_role(auth.uid(), 'programme_leader'::app_role))));
CREATE POLICY "Students view own enrolments" ON public."student_enrolments" FOR SELECT TO "authenticated" USING ((student_id = auth.uid()));
ALTER FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) SECURITY DEFINER;
ALTER FUNCTION public.auto_enrol_student() SECURITY DEFINER;
COMMIT;

