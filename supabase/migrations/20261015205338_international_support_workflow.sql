-- Wire the existing support table to case identity, staff workflow and learner visibility.
ALTER TABLE public.international_university_applications ADD CONSTRAINT support_application_tenant_key UNIQUE(id,tenant_id);
ALTER TABLE public.international_support_tasks
 ADD CONSTRAINT support_same_tenant_application FOREIGN KEY(application_id,tenant_id) REFERENCES public.international_university_applications(id,tenant_id),
 ADD CONSTRAINT support_title_length CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 ADD CONSTRAINT support_type_length CHECK(length(btrim(task_type)) BETWEEN 1 AND 80),
 ADD CONSTRAINT support_notes_length CHECK(notes IS NULL OR length(notes)<=2000),
 ADD CONSTRAINT support_status CHECK(status IN ('pending','in_progress','completed','cancelled')),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN completed_at timestamptz;
CREATE INDEX support_case_queue ON public.international_support_tasks(tenant_id,application_id,created_at,id);

DROP POLICY "international support own read" ON public.international_support_tasks;
CREATE POLICY "support case read" ON public.international_support_tasks FOR SELECT TO authenticated USING(
 public.same_tenant(tenant_id) AND EXISTS(SELECT 1 FROM public.international_university_applications a
 WHERE a.id=application_id AND a.tenant_id=international_support_tasks.tenant_id AND
 (a.student_id=auth.uid() OR public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role))));
CREATE POLICY "support staff create" ON public.international_support_tasks FOR INSERT TO authenticated WITH CHECK(
 public.same_tenant(tenant_id) AND owner_id=auth.uid() AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
CREATE POLICY "support staff update" ON public.international_support_tasks FOR UPDATE TO authenticated USING(
 public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role))) WITH CHECK(
 public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::app_role)
 OR public.has_role(auth.uid(),'superadmin'::app_role) OR public.has_role(auth.uid(),'admissions_admin'::app_role)));
GRANT SELECT,INSERT,UPDATE ON public.international_support_tasks TO authenticated;
REVOKE DELETE ON public.international_support_tasks FROM authenticated;
CREATE FUNCTION public.guard_international_support_task() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id,NEW.tenant_id,NEW.application_id,NEW.owner_id,NEW.created_at) IS DISTINCT FROM
 (OLD.id,OLD.tenant_id,OLD.application_id,OLD.owner_id,OLD.created_at) THEN RAISE EXCEPTION 'Task identity cannot change'; END IF;
 NEW.updated_at=clock_timestamp();
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'pending' THEN RAISE EXCEPTION 'New tasks must start pending'; END IF;
  NEW.created_at=now();NEW.completed_at=NULL;
 ELSIF NEW.status='completed' THEN
  NEW.completed_at=CASE WHEN OLD.status='completed' THEN OLD.completed_at ELSE now() END;
 ELSE NEW.completed_at=NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER support_task_guard BEFORE INSERT OR UPDATE ON public.international_support_tasks FOR EACH ROW EXECUTE FUNCTION public.guard_international_support_task();
CREATE TRIGGER support_task_audit AFTER INSERT OR UPDATE ON public.international_support_tasks FOR EACH ROW EXECUTE FUNCTION public.audit_global_partner_change();
