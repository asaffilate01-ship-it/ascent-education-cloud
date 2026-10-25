CREATE TABLE public.unipathway_placements (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid NOT NULL REFERENCES auth.users(id), programme_id uuid NOT NULL REFERENCES public.programmes(id),
 supervisor_id uuid NOT NULL REFERENCES auth.users(id), organisation_id uuid NOT NULL REFERENCES public.unipathway_employer_organisations(id),
 student_name text NOT NULL, supervisor_name text NOT NULL, programme_title text NOT NULL, employer_name text NOT NULL,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 200),
 learning_goals text NOT NULL CHECK(length(btrim(learning_goals)) BETWEEN 20 AND 4000),
 required boolean NOT NULL, required_minutes integer NOT NULL CHECK(required_minutes BETWEEN 1 AND 600000),
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','completed','cancelled')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(supervisor_id<>student_id)
);
CREATE INDEX placement_tenant_student ON public.unipathway_placements(tenant_id,student_id,id);
CREATE UNIQUE INDEX placement_plan_identity ON public.unipathway_placements(tenant_id,student_id,programme_id,organisation_id,starts_on,ends_on,title) WHERE status<>'cancelled';
CREATE INDEX placement_supervisor ON public.unipathway_placements(supervisor_id,id);
CREATE TABLE public.unipathway_placement_logs (
 id uuid PRIMARY KEY, placement_id uuid NOT NULL REFERENCES public.unipathway_placements(id),
 worked_on date NOT NULL, minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 1440),
 notes text NOT NULL CHECK(length(btrim(notes)) BETWEEN 20 AND 4000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 submitted_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid, reviewed_at timestamptz, review_reason text
);
CREATE UNIQUE INDEX placement_one_live_day ON public.unipathway_placement_logs(placement_id,worked_on) WHERE status<>'rejected';
CREATE TABLE public.unipathway_placement_actions (
 id uuid PRIMARY KEY, placement_id uuid NOT NULL REFERENCES public.unipathway_placements(id),
 actor_id uuid NOT NULL, action text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX placement_action_history ON public.unipathway_placement_actions(placement_id,id);

CREATE FUNCTION public.unipathway_placement_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid()) AND role IN ('centre_director','superadmin','programme_leader'))
$$;
CREATE FUNCTION public.unipathway_placement_access(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.unipathway_placements p WHERE p.id=p_id AND p.tenant_id=public.get_user_tenant_id(auth.uid()) AND (public.unipathway_placement_manager() OR
 (p.student_id=auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=p.tenant_id AND role='student')) OR
 (p.supervisor_id=auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=p.tenant_id AND role='lecturer'))))
$$;
ALTER TABLE public.unipathway_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unipathway_placement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unipathway_placement_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_placements,public.unipathway_placement_logs,public.unipathway_placement_actions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_placements,public.unipathway_placement_logs,public.unipathway_placement_actions TO authenticated;
CREATE POLICY placement_read ON public.unipathway_placements FOR SELECT TO authenticated USING(public.unipathway_placement_access(id));
CREATE POLICY placement_log_read ON public.unipathway_placement_logs FOR SELECT TO authenticated USING(public.unipathway_placement_access(placement_id));
CREATE POLICY placement_action_read ON public.unipathway_placement_actions FOR SELECT TO authenticated USING(public.unipathway_placement_access(placement_id));

-- A request UUID records the exact payload. All mutations and their audit receipt commit together.
CREATE FUNCTION public.change_unipathway_placement(p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.unipathway_placements; l public.unipathway_placement_logs; receipt public.unipathway_placement_actions;
 t uuid:=public.get_user_tenant_id(auth.uid()); target uuid; supervisor boolean; manager boolean; work_day date; duration integer;
BEGIN
 IF auth.uid() IS NULL OR t IS NULL OR p_request IS NULL OR p_action IS NULL OR p_action NOT IN ('create','start','cancel','complete','log','approve','reject') OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Valid signed-in request required' USING ERRCODE='42501';END IF;
 manager:=public.unipathway_placement_manager();
 IF p_action='create' THEN
  IF NOT manager THEN RAISE EXCEPTION 'Centre placement manager required' USING ERRCODE='42501';END IF;
  target:=p_request;
 ELSE
  target:=(p_data->>'placement_id')::uuid;
  SELECT * INTO p FROM public.unipathway_placements WHERE id=target FOR UPDATE;
  IF p.id IS NULL OR NOT public.unipathway_placement_access(p.id) THEN RAISE EXCEPTION 'Placement access denied' USING ERRCODE='42501';END IF;
  supervisor:=p.supervisor_id=auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=t AND role='lecturer');
  IF (p_action='log' AND (p.student_id<>auth.uid() OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=t AND role='student')))
   OR (p_action IN ('approve','reject','complete') AND (NOT (manager OR supervisor) OR p.student_id=auth.uid()))
   OR (p_action IN ('start','cancel') AND NOT manager) THEN RAISE EXCEPTION 'Action not authorised' USING ERRCODE='42501';END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,74));
 SELECT * INTO receipt FROM public.unipathway_placement_actions WHERE id=p_request;
 IF FOUND THEN
  IF receipt.actor_id=auth.uid() AND receipt.action=p_action AND receipt.payload=p_data AND receipt.placement_id=target AND public.unipathway_placement_access(target) THEN RETURN p_request;END IF;
  RAISE EXCEPTION 'Request identity already used';
 END IF;
 IF p_action='create' THEN
  PERFORM 1 FROM public.student_enrolments WHERE student_id=(p_data->>'student_id')::uuid AND programme_id=(p_data->>'programme_id')::uuid AND tenant_id=t FOR SHARE;
  PERFORM 1 FROM public.unipathway_employer_organisations WHERE id=(p_data->>'organisation_id')::uuid AND tenant_id=t FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM public.student_enrolments e JOIN public.profiles s ON s.user_id=e.student_id AND s.tenant_id=e.tenant_id JOIN public.programmes c ON c.id=e.programme_id AND c.tenant_id=e.tenant_id WHERE e.student_id=(p_data->>'student_id')::uuid AND e.programme_id=(p_data->>'programme_id')::uuid AND e.tenant_id=t AND e.status='active') THEN RAISE EXCEPTION 'Active same-centre enrolment required';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=(p_data->>'student_id')::uuid AND tenant_id=t AND role='student') THEN RAISE EXCEPTION 'Student role required';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles s JOIN public.user_roles r ON r.user_id=s.user_id AND r.tenant_id=s.tenant_id WHERE s.user_id=(p_data->>'supervisor_id')::uuid AND s.tenant_id=t AND r.role='lecturer') THEN RAISE EXCEPTION 'Same-centre lecturer supervisor required';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.unipathway_employer_organisations WHERE id=(p_data->>'organisation_id')::uuid AND tenant_id=t AND status='verified') THEN RAISE EXCEPTION 'Verified same-centre employer required';END IF;
  INSERT INTO public.unipathway_placements(student_name,supervisor_name,programme_title,employer_name,id,tenant_id,student_id,programme_id,supervisor_id,organisation_id,title,learning_goals,required,required_minutes,starts_on,ends_on,created_by)
  VALUES((SELECT full_name FROM public.profiles WHERE user_id=(p_data->>'student_id')::uuid AND tenant_id=t),(SELECT full_name FROM public.profiles WHERE user_id=(p_data->>'supervisor_id')::uuid AND tenant_id=t),(SELECT title FROM public.programmes WHERE id=(p_data->>'programme_id')::uuid AND tenant_id=t),(SELECT name FROM public.unipathway_employer_organisations WHERE id=(p_data->>'organisation_id')::uuid AND tenant_id=t),target,t,(p_data->>'student_id')::uuid,(p_data->>'programme_id')::uuid,(p_data->>'supervisor_id')::uuid,(p_data->>'organisation_id')::uuid,btrim(p_data->>'title'),btrim(p_data->>'learning_goals'),(p_data->>'required')::boolean,(p_data->>'required_minutes')::integer,(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,auth.uid());
 ELSE
  PERFORM 1 FROM public.student_enrolments WHERE student_id=p.student_id AND programme_id=p.programme_id AND tenant_id=t FOR SHARE;
  PERFORM 1 FROM public.unipathway_employer_organisations WHERE id=p.organisation_id AND tenant_id=t FOR SHARE;
  IF p_action IN ('start','log','complete') AND (
   NOT EXISTS(SELECT 1 FROM public.student_enrolments WHERE student_id=p.student_id AND programme_id=p.programme_id AND tenant_id=t AND status='active') OR
   NOT EXISTS(SELECT 1 FROM public.unipathway_employer_organisations WHERE id=p.organisation_id AND tenant_id=t AND status='verified')) THEN RAISE EXCEPTION 'Active enrolment and verified employer required';END IF;
  IF p_action='log' THEN
   IF p.status<>'active' THEN RAISE EXCEPTION 'Placement must be active';END IF;
   work_day:=(p_data->>'worked_on')::date;duration:=(p_data->>'minutes')::integer;
   IF work_day IS NULL OR work_day<p.starts_on OR work_day>p.ends_on OR work_day>(now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Choose a past or current day within the placement dates';END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(p.student_id::text||work_day::text,75));
   IF (SELECT coalesce(sum(x.minutes),0) FROM public.unipathway_placement_logs x JOIN public.unipathway_placements q ON q.id=x.placement_id WHERE q.student_id=p.student_id AND x.worked_on=work_day AND x.status<>'rejected')+duration>1440 THEN RAISE EXCEPTION 'Daily logged time exceeds 24 hours';END IF;
   INSERT INTO public.unipathway_placement_logs(id,placement_id,worked_on,minutes,notes,submitted_by) VALUES(p_request,p.id,work_day,duration,btrim(p_data->>'notes'),auth.uid());
  ELSIF p_action IN ('approve','reject') THEN
   SELECT * INTO l FROM public.unipathway_placement_logs WHERE id=(p_data->>'log_id')::uuid AND placement_id=p.id FOR UPDATE;
   IF p.status<>'active' OR l.id IS NULL OR l.status<>'pending' OR l.submitted_by=auth.uid() THEN RAISE EXCEPTION 'An active placement and another learner pending log are required';END IF;
   IF p_data->>'reason' IS NULL OR length(btrim(p_data->>'reason')) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Review reason must contain 10 to 2000 characters';END IF;
   UPDATE public.unipathway_placement_logs SET status=CASE WHEN p_action='approve' THEN 'approved' ELSE 'rejected' END,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=btrim(p_data->>'reason') WHERE id=l.id;
  ELSE
   IF p_data->>'reason' IS NULL OR length(btrim(p_data->>'reason')) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Decision reason must contain 10 to 2000 characters';END IF;
   IF p_action='start' AND (p.status<>'planned' OR p.starts_on>(now() AT TIME ZONE 'Asia/Karachi')::date OR p.ends_on<(now() AT TIME ZONE 'Asia/Karachi')::date) THEN RAISE EXCEPTION 'A planned placement within its scheduled dates is required';END IF;
   IF p_action='cancel' AND p.status NOT IN ('planned','active') THEN RAISE EXCEPTION 'Only planned or active placements can be cancelled';END IF;
   IF p_action='complete' AND (p.status<>'active' OR EXISTS(SELECT 1 FROM public.unipathway_placement_logs WHERE placement_id=p.id AND status='pending') OR (SELECT coalesce(sum(minutes),0) FROM public.unipathway_placement_logs WHERE placement_id=p.id AND status='approved')<p.required_minutes) THEN RAISE EXCEPTION 'Completion requires the target approved hours and no pending logs';END IF;
   UPDATE public.unipathway_placements SET status=CASE p_action WHEN 'start' THEN 'active' WHEN 'cancel' THEN 'cancelled' ELSE 'completed' END WHERE id=p.id;
  END IF;
 END IF;
 INSERT INTO public.unipathway_placement_actions(id,placement_id,actor_id,action,payload) VALUES(p_request,target,auth.uid(),p_action,p_data);
 RETURN p_request;
END $$;
REVOKE ALL ON FUNCTION public.unipathway_placement_manager(),public.unipathway_placement_access(uuid),public.change_unipathway_placement(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_placement_manager(),public.unipathway_placement_access(uuid),public.change_unipathway_placement(uuid,text,jsonb) TO authenticated;

-- Purpose-limited planning choices; no emails, identity evidence or general role directory.
CREATE FUNCTION public.get_unipathway_placement_options() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid:=public.get_user_tenant_id(auth.uid());
BEGIN
 IF NOT public.unipathway_placement_manager() THEN RAISE EXCEPTION 'Centre placement manager required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object(
 'students',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.name,q.id) FROM (
  SELECT DISTINCT e.student_id::text||':'||e.programme_id::text id,p.full_name||' · '||c.title name
  FROM public.student_enrolments e JOIN public.profiles p ON p.user_id=e.student_id AND p.tenant_id=e.tenant_id
  JOIN public.programmes c ON c.id=e.programme_id AND c.tenant_id=e.tenant_id
  WHERE e.tenant_id=t AND e.status='active' AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=e.student_id AND tenant_id=t AND role='student')
 )q),'[]'::jsonb),
 'supervisors',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.name,q.id) FROM (
  SELECT p.user_id id,p.full_name name FROM public.profiles p WHERE p.tenant_id=t AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p.user_id AND tenant_id=t AND role='lecturer')
 )q),'[]'::jsonb),
 'employers',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.name,q.id) FROM (
  SELECT id,name FROM public.unipathway_employer_organisations WHERE tenant_id=t AND status='verified'
 )q),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_unipathway_placement_options() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_placement_options() TO authenticated;
