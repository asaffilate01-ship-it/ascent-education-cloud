CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET search_path=public,extensions;
-- Range exclusions are enforced by PostgreSQL even under concurrent writes.
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_effective_dates CHECK(effective_until IS NULL OR effective_until>=effective_from);
ALTER TABLE public.scheduled_lectures ADD COLUMN cohort_reference text CHECK(length(cohort_reference)<=100);
ALTER TABLE public.scheduled_lectures ADD COLUMN change_reason text NOT NULL DEFAULT '' CHECK(length(change_reason)<=1000);
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_lecturer_overlap EXCLUDE USING gist (
 lecturer_id WITH =, day_of_week WITH =, daterange(effective_from,effective_until,'[]') WITH &&,
 int4range(extract(epoch from start_time)::integer,extract(epoch from end_time)::integer,'[)') WITH &&
) WHERE(is_active);
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_module_overlap EXCLUDE USING gist (
 module_id WITH =, day_of_week WITH =, daterange(effective_from,effective_until,'[]') WITH &&,
 int4range(extract(epoch from start_time)::integer,extract(epoch from end_time)::integer,'[)') WITH &&
) WHERE(is_active);
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_room_overlap EXCLUDE USING gist (
 tenant_id WITH =, (lower(btrim(room))) WITH =, day_of_week WITH =, daterange(effective_from,effective_until,'[]') WITH &&,
 int4range(extract(epoch from start_time)::integer,extract(epoch from end_time)::integer,'[)') WITH &&
) WHERE(is_active AND room IS NOT NULL AND btrim(room)<>'' AND lower(btrim(room))<>'virtual');
ALTER TABLE public.scheduled_lectures ADD CONSTRAINT schedule_cohort_overlap EXCLUDE USING gist (
 tenant_id WITH =, (lower(btrim(cohort_reference))) WITH =, day_of_week WITH =, daterange(effective_from,effective_until,'[]') WITH &&,
 int4range(extract(epoch from start_time)::integer,extract(epoch from end_time)::integer,'[)') WITH &&
) WHERE(is_active AND cohort_reference IS NOT NULL AND btrim(cohort_reference)<>'');
DROP INDEX IF EXISTS public.idx_no_lecturer_conflict;
DROP INDEX IF EXISTS public.idx_no_room_conflict;
CREATE TABLE public.unipathway_schedule_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),schedule_id uuid NOT NULL REFERENCES public.scheduled_lectures(id),
 tenant_id uuid NOT NULL,module_id uuid NOT NULL,changed_by uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('created','updated','cancelled','restored')),
 reason text NOT NULL,previous jsonb,current jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_schedule_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedule_changes_read ON public.unipathway_schedule_changes FOR SELECT TO authenticated USING(unipathway_acl.module_access(module_id,tenant_id));
REVOKE ALL ON public.unipathway_schedule_changes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_schedule_changes TO authenticated;
REVOKE DELETE ON public.scheduled_lectures FROM anon,authenticated;
CREATE FUNCTION unipathway_acl.schedule_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE event text;
BEGIN
 IF auth.uid() IS NULL OR NOT unipathway_acl.module_access(NEW.module_id,NEW.tenant_id,true) THEN RAISE EXCEPTION 'Teaching assignment required' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW.tenant_id,NEW.module_id) IS DISTINCT FROM (OLD.id,OLD.tenant_id,OLD.module_id) THEN RAISE EXCEPTION 'Schedule scope cannot change';END IF;
  IF length(btrim(NEW.change_reason))<5 THEN RAISE EXCEPTION 'Explain this timetable change (at least 5 characters)';END IF;
  event:=CASE WHEN OLD.is_active AND NOT NEW.is_active THEN 'cancelled' WHEN NOT OLD.is_active AND NEW.is_active THEN 'restored' ELSE 'updated' END;
 ELSE event:='created';END IF;
 INSERT INTO public.unipathway_schedule_changes(schedule_id,tenant_id,module_id,changed_by,action,reason,previous,current)
 VALUES(NEW.id,NEW.tenant_id,NEW.module_id,auth.uid(),event,NEW.change_reason,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD)-'notes' ELSE NULL END,to_jsonb(NEW)-'notes');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.schedule_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_schedule_change AFTER INSERT OR UPDATE ON public.scheduled_lectures FOR EACH ROW EXECUTE FUNCTION unipathway_acl.schedule_change();

-- Task managers are centre directors, not every teaching or finance role.
CREATE FUNCTION unipathway_acl.task_manager(t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'superadmin') OR (t=public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'centre_director')))
$$;
CREATE FUNCTION unipathway_acl.task_staff(u uuid,t uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND t=public.get_user_tenant_id(u) AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u AND (r.tenant_id=t OR r.tenant_id IS NULL) AND r.role::text IN ('superadmin','centre_director','admissions_admin','programme_leader','lecturer','assessor','iqa_officer','finance_officer','welfare_officer','security_officer','exams_officer','marketing_officer'))
$$;
REVOKE ALL ON FUNCTION unipathway_acl.task_manager(uuid),unipathway_acl.task_staff(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_acl.task_manager(uuid),unipathway_acl.task_staff(uuid,uuid) TO authenticated;
CREATE TABLE public.unipathway_staff_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 created_by uuid NOT NULL DEFAULT auth.uid(),assigned_to uuid NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 200),
 detail text NOT NULL DEFAULT '' CHECK(length(detail)<=2000),
 due_on date NOT NULL,priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','high')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','blocked','done','cancelled')),
 outcome text NOT NULL DEFAULT '' CHECK(length(outcome)<=2000),
 version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status NOT IN ('blocked','done','cancelled') OR length(btrim(outcome))>=5)
);
CREATE INDEX ON public.unipathway_staff_tasks(tenant_id,assigned_to,status,due_on);
ALTER TABLE public.unipathway_staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_read ON public.unipathway_staff_tasks FOR SELECT TO authenticated USING(
 unipathway_acl.task_manager(tenant_id) OR (unipathway_acl.task_staff(auth.uid(),tenant_id) AND auth.uid() IN (created_by,assigned_to)));
CREATE POLICY task_insert ON public.unipathway_staff_tasks FOR INSERT TO authenticated WITH CHECK(
 created_by=auth.uid() AND unipathway_acl.task_staff(auth.uid(),tenant_id) AND unipathway_acl.task_staff(assigned_to,tenant_id));
CREATE POLICY task_update ON public.unipathway_staff_tasks FOR UPDATE TO authenticated USING(
 unipathway_acl.task_manager(tenant_id) OR (unipathway_acl.task_staff(auth.uid(),tenant_id) AND auth.uid() IN (created_by,assigned_to))) WITH CHECK(
 unipathway_acl.task_staff(assigned_to,tenant_id) AND (unipathway_acl.task_manager(tenant_id) OR (unipathway_acl.task_staff(auth.uid(),tenant_id) AND auth.uid() IN (created_by,assigned_to))));
REVOKE ALL ON public.unipathway_staff_tasks FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_staff_tasks TO authenticated;
CREATE TABLE public.unipathway_task_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),task_id uuid NOT NULL REFERENCES public.unipathway_staff_tasks(id),
 changed_by uuid NOT NULL,version integer NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(task_id,version)
);
ALTER TABLE public.unipathway_task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_history_read ON public.unipathway_task_history FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.unipathway_staff_tasks t WHERE t.id=task_id));
REVOKE ALL ON public.unipathway_task_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_task_history TO authenticated;
CREATE FUNCTION unipathway_acl.task_version() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (NEW.id,NEW.tenant_id,NEW.created_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.tenant_id,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Task scope cannot change';END IF;
  IF auth.uid()<>OLD.created_by AND NOT unipathway_acl.task_manager(OLD.tenant_id) AND
    (NEW.assigned_to,NEW.title,NEW.detail,NEW.due_on,NEW.priority) IS DISTINCT FROM (OLD.assigned_to,OLD.title,OLD.detail,OLD.due_on,OLD.priority) THEN RAISE EXCEPTION 'Only the creator or centre manager can change the assignment';END IF;
  NEW.version:=OLD.version+1;
 ELSE NEW.version:=1;NEW.created_at:=now();END IF;
 NEW.updated_at:=now();RETURN NEW;
END $$;
CREATE FUNCTION unipathway_acl.task_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.unipathway_task_history(task_id,changed_by,version,snapshot) VALUES(NEW.id,auth.uid(),NEW.version,to_jsonb(NEW));RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.task_version(),unipathway_acl.task_history() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER task_version BEFORE INSERT OR UPDATE ON public.unipathway_staff_tasks FOR EACH ROW EXECUTE FUNCTION unipathway_acl.task_version();
CREATE TRIGGER task_history AFTER INSERT OR UPDATE ON public.unipathway_staff_tasks FOR EACH ROW EXECUTE FUNCTION unipathway_acl.task_history();
-- Purpose-limited directory: no emails, identity documents or wider profile fields.
CREATE FUNCTION public.unipathway_task_assignees() RETURNS TABLE(user_id uuid,full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.user_id,p.full_name FROM public.profiles p
 WHERE unipathway_acl.task_staff(auth.uid(),p.tenant_id) AND unipathway_acl.task_staff(p.user_id,p.tenant_id) ORDER BY p.full_name
$$;
REVOKE ALL ON FUNCTION public.unipathway_task_assignees() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_task_assignees() TO authenticated;
RESET search_path;

-- Keep the legacy bulk API non-destructive and subject to the same exclusion checks.
CREATE OR REPLACE FUNCTION public.auto_schedule_module(
 _module_id uuid,_lecturer_id uuid,_tenant_id uuid,_academic_year text DEFAULT to_char(now(),'YYYY'),
 _semester smallint DEFAULT 1,_color text DEFAULT '#3b82f6') RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE slot record;assigned integer:=0;existing integer;entries jsonb:='[]'::jsonb;
BEGIN
 IF NOT unipathway_acl.module_access(_module_id,_tenant_id,true) THEN RAISE EXCEPTION 'Module assignment required' USING ERRCODE='42501';END IF;
 SELECT count(*) INTO existing FROM public.scheduled_lectures WHERE module_id=_module_id AND tenant_id=_tenant_id AND academic_year=_academic_year AND semester=_semester AND is_active;
 FOR slot IN SELECT d.day,t.start_t,t.end_t FROM (VALUES(1),(2),(3),(4),(5)) d(day),
 (VALUES('09:00'::time,'10:30'::time),('10:30'::time,'12:00'::time),('14:00'::time,'15:30'::time),('15:30'::time,'17:00'::time),('18:00'::time,'19:30'::time),('19:30'::time,'21:00'::time)) t(start_t,end_t) ORDER BY d.day,t.start_t LOOP
  EXIT WHEN existing+assigned>=8;
  BEGIN
   INSERT INTO public.scheduled_lectures(module_id,lecturer_id,tenant_id,day_of_week,start_time,end_time,academic_year,semester,color,change_reason)
   VALUES(_module_id,_lecturer_id,_tenant_id,slot.day,slot.start_t,slot.end_t,_academic_year,_semester,_color,'Additional weekly slot requested');
   assigned:=assigned+1;entries:=entries||jsonb_build_object('day',slot.day,'start',slot.start_t::text,'end',slot.end_t::text);
  EXCEPTION WHEN exclusion_violation OR unique_violation THEN NULL;
  END;
 END LOOP;
 RETURN jsonb_build_object('module_id',_module_id,'slots_assigned',assigned,'slots_existing',existing,'slots_needed',greatest(0,8-existing),'schedule',entries);
END $$;
REVOKE ALL ON FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.auto_schedule_module(uuid,uuid,uuid,text,smallint,text) TO authenticated;
