-- Controlled forward activation. Private teaching claims, not payroll or attendance.
CREATE SCHEMA unipathway_teaching_ops;
REVOKE ALL ON SCHEMA unipathway_teaching_ops FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_teaching_ops TO authenticated;
CREATE TABLE unipathway_teaching_ops.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,
 writes_enabled boolean NOT NULL DEFAULT false,
 CHECK(NOT writes_enabled OR reads_enabled)
);
INSERT INTO unipathway_teaching_ops.activation_gate DEFAULT VALUES;
CREATE TABLE unipathway_teaching_ops.timesheets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 lecturer_id uuid NOT NULL REFERENCES auth.users(id),
 schedule_id uuid NOT NULL REFERENCES public.scheduled_lectures(id),
 module_id uuid NOT NULL REFERENCES public.modules(id),
 module_title text NOT NULL,
 teaching_date date NOT NULL,
 scheduled_start time NOT NULL,
 scheduled_end time NOT NULL,
 scheduled_revision timestamptz NOT NULL,
 planned_minutes integer NOT NULL CHECK(planned_minutes BETWEEN 1 AND 1440),
 actual_minutes integer NOT NULL CHECK(actual_minutes BETWEEN 1 AND planned_minutes),
 evidence_reference text NOT NULL CHECK(length(btrim(evidence_reference)) BETWEEN 5 AND 500),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','approved','rejected')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 2),
 submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_note text,
 CHECK(scheduled_start<scheduled_end),
 CHECK((status='submitted' AND revision=1 AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL)
 OR (status IN ('approved','rejected') AND revision=2 AND reviewed_by IS NOT NULL AND reviewed_by<>lecturer_id AND reviewed_at IS NOT NULL AND length(btrim(review_note)) BETWEEN 5 AND 500)),
 UNIQUE(tenant_id,schedule_id,teaching_date)
);
CREATE INDEX teaching_timesheets_month ON unipathway_teaching_ops.timesheets(tenant_id,teaching_date,status);
CREATE INDEX teaching_timesheets_lecturer ON unipathway_teaching_ops.timesheets(tenant_id,lecturer_id,teaching_date);
ALTER TABLE unipathway_teaching_ops.activation_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_teaching_ops.timesheets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_teaching_ops FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_teaching_ops.actor_tenant(p_role text,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 IF auth.uid() IS NULL OR p_role IS NULL OR p_role NOT IN ('lecturer','centre_director','finance_officer') THEN RAISE EXCEPTION 'Verified teaching operations role required' USING ERRCODE='42501'; END IF;
 t:=public.get_user_tenant_id(auth.uid());
 IF t IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text=p_role) THEN RAISE EXCEPTION 'Verified centre membership required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM unipathway_teaching_ops.activation_gate g WHERE g.singleton AND g.reads_enabled AND (NOT p_write OR g.writes_enabled)) THEN RAISE EXCEPTION 'Teaching timesheets not activated' USING ERRCODE='55000'; END IF;
 RETURN t;
END $$;

CREATE FUNCTION unipathway_teaching_ops.slots(p_date date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; rows jsonb;
BEGIN
 t:=unipathway_teaching_ops.actor_tenant('lecturer');
 IF p_date IS NULL OR p_date<'2000-01-01'::date OR p_date>(now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Choose a past or current Pakistan teaching date'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.start_time,x.schedule_id),'[]'::jsonb) INTO rows FROM (
  SELECT s.id AS schedule_id,m.id AS module_id,m.title AS module_title,s.start_time,s.end_time,s.updated_at,
   (extract(epoch FROM (s.end_time-s.start_time))/60)::integer AS planned_minutes
  FROM public.scheduled_lectures s JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id AND m.lecturer_id=s.lecturer_id
  WHERE s.tenant_id=t AND s.lecturer_id=auth.uid() AND s.is_active AND s.recurrence='weekly'
   AND extract(isodow FROM p_date)=s.day_of_week AND p_date>=s.effective_from AND (s.effective_until IS NULL OR p_date<=s.effective_until)
   AND s.start_time<s.end_time AND mod(extract(epoch FROM (s.end_time-s.start_time)),60)=0
   AND (p_date+s.end_time) AT TIME ZONE 'Asia/Karachi'<=now()
   AND NOT EXISTS(SELECT 1 FROM unipathway_teaching_ops.timesheets v WHERE v.tenant_id=t AND v.schedule_id=s.id AND v.teaching_date=p_date)
  ORDER BY s.start_time,s.id LIMIT 101
 ) x;
 IF jsonb_array_length(rows)>100 THEN RAISE EXCEPTION 'Too many timetable slots; contact your centre'; END IF;
 RETURN jsonb_build_object('tenant_id',t,'role','lecturer','date',p_date,'slots',rows);
END $$;

CREATE FUNCTION unipathway_teaching_ops.submit(p_schedule uuid,p_date date,p_minutes integer,p_evidence text,p_expected_updated_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; s public.scheduled_lectures%ROWTYPE; v unipathway_teaching_ops.timesheets%ROWTYPE; title text; planned integer; note text;
BEGIN
 t:=unipathway_teaching_ops.actor_tenant('lecturer',true);note:=btrim(p_evidence);
 IF p_schedule IS NULL OR p_date IS NULL OR p_date<'2000-01-01'::date OR p_date>(now() AT TIME ZONE 'Asia/Karachi')::date
 OR p_minutes IS NULL OR p_minutes NOT BETWEEN 1 AND 1440 OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 OR p_expected_updated_at IS NULL THEN RAISE EXCEPTION 'Valid date, actual minutes and evidence reference required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(t::text||':'||auth.uid()::text||':'||p_date::text,0));
 SELECT * INTO v FROM unipathway_teaching_ops.timesheets WHERE tenant_id=t AND schedule_id=p_schedule AND teaching_date=p_date FOR UPDATE;
 IF FOUND THEN
  IF v.lecturer_id<>auth.uid() OR v.actual_minutes<>p_minutes OR v.evidence_reference<>note OR v.scheduled_revision<>p_expected_updated_at THEN RAISE EXCEPTION 'Existing claim differs; refresh and contact your centre'; END IF;
  RETURN jsonb_build_object('id',v.id,'tenant_id',t,'status',v.status,'revision',v.revision,'teaching_date',v.teaching_date,'actual_minutes',v.actual_minutes);
 END IF;
 SELECT * INTO s FROM public.scheduled_lectures WHERE id=p_schedule AND tenant_id=t AND lecturer_id=auth.uid() FOR SHARE;
 IF NOT FOUND OR NOT s.is_active OR s.recurrence<>'weekly' OR s.updated_at IS DISTINCT FROM p_expected_updated_at
 OR extract(isodow FROM p_date)<>s.day_of_week OR p_date<s.effective_from OR (s.effective_until IS NOT NULL AND p_date>s.effective_until)
 OR s.end_time<=s.start_time OR mod(extract(epoch FROM (s.end_time-s.start_time)),60)<>0
 OR (p_date+s.end_time) AT TIME ZONE 'Asia/Karachi'>now() THEN RAISE EXCEPTION 'Current completed timetable occurrence required; refresh timetable'; END IF;
 SELECT m.title INTO title FROM public.modules m WHERE m.id=s.module_id AND m.tenant_id=t AND m.lecturer_id=auth.uid() FOR SHARE;
 IF NOT FOUND OR title IS NULL OR btrim(title)='' THEN RAISE EXCEPTION 'Current assigned teaching module required'; END IF;
 planned:=(extract(epoch FROM (s.end_time-s.start_time))/60)::integer;
 IF p_minutes>planned THEN RAISE EXCEPTION 'Claimed minutes exceed the scheduled session; contact your centre'; END IF;
 IF EXISTS(SELECT 1 FROM unipathway_teaching_ops.timesheets a WHERE a.tenant_id=t AND a.lecturer_id=auth.uid() AND a.teaching_date=p_date AND a.status<>'rejected' AND a.scheduled_start<s.end_time AND s.start_time<a.scheduled_end) THEN RAISE EXCEPTION 'Another claim overlaps this teaching session'; END IF;
 INSERT INTO unipathway_teaching_ops.timesheets(tenant_id,lecturer_id,schedule_id,module_id,module_title,teaching_date,scheduled_start,scheduled_end,scheduled_revision,planned_minutes,actual_minutes,evidence_reference)
 VALUES(t,auth.uid(),s.id,s.module_id,title,p_date,s.start_time,s.end_time,s.updated_at,planned,p_minutes,note)
 RETURNING * INTO v;
 RETURN jsonb_build_object('id',v.id,'tenant_id',t,'status',v.status,'revision',v.revision,'teaching_date',v.teaching_date,'actual_minutes',v.actual_minutes);
END $$;

CREATE FUNCTION unipathway_teaching_ops.review(p_claim uuid,p_revision integer,p_decision text,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; v unipathway_teaching_ops.timesheets%ROWTYPE; note text;
BEGIN
 t:=unipathway_teaching_ops.actor_tenant('centre_director',true);note:=btrim(p_note);
 IF p_claim IS NULL OR p_revision IS DISTINCT FROM 1 OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Review decision and evidence note required'; END IF;
 SELECT * INTO v FROM unipathway_teaching_ops.timesheets WHERE id=p_claim AND tenant_id=t FOR UPDATE;
 IF NOT FOUND OR v.lecturer_id=auth.uid() THEN RAISE EXCEPTION 'Independent centre reviewer required' USING ERRCODE='42501'; END IF;
 IF v.revision<>1 THEN
  IF v.reviewed_by<>auth.uid() OR v.status<>p_decision OR v.review_note<>note THEN RAISE EXCEPTION 'Claim already reviewed; refresh records'; END IF;
 ELSE
  UPDATE unipathway_teaching_ops.timesheets SET status=p_decision,revision=2,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_note=note WHERE id=v.id RETURNING * INTO v;
 END IF;
 RETURN jsonb_build_object('id',v.id,'tenant_id',t,'status',v.status,'revision',v.revision,'teaching_date',v.teaching_date,'actual_minutes',v.actual_minutes);
END $$;

CREATE FUNCTION unipathway_teaching_ops.monthly(p_month date,p_role text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; rows jsonb;
BEGIN
 t:=unipathway_teaching_ops.actor_tenant(p_role);
 IF p_month IS NULL OR p_month<'2000-01-01'::date OR extract(day FROM p_month)<>1 OR p_month>date_trunc('month',now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Choose a valid teaching month'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.teaching_date DESC,x.scheduled_start,x.id),'[]'::jsonb) INTO rows FROM (
 SELECT v.id,v.tenant_id,v.lecturer_id,coalesce(nullif(p.full_name,''),'Lecturer account') AS lecturer_name,
 v.schedule_id,v.module_id,v.module_title,v.teaching_date,v.scheduled_start,v.scheduled_end,v.planned_minutes,v.actual_minutes,v.status,v.revision,v.submitted_at,v.reviewed_at,
 CASE WHEN p_role<>'finance_officer' THEN v.evidence_reference END AS evidence_reference,
 CASE WHEN p_role<>'finance_officer' THEN v.review_note END AS review_note
 FROM unipathway_teaching_ops.timesheets v LEFT JOIN public.profiles p ON p.user_id=v.lecturer_id AND p.tenant_id=v.tenant_id
 WHERE v.tenant_id=t AND v.teaching_date>=p_month AND v.teaching_date<(p_month+interval '1 month')::date
 AND (p_role='centre_director' OR (p_role='lecturer' AND v.lecturer_id=auth.uid()) OR (p_role='finance_officer' AND v.status='approved'))
 ORDER BY v.teaching_date DESC,v.scheduled_start,v.id LIMIT 501
 ) x;
 IF jsonb_array_length(rows)>500 THEN RAISE EXCEPTION 'Monthly review exceeds 500 claims; request a paginated centre report'; END IF;
 RETURN jsonb_build_object('tenant_id',t,'role',p_role,'month',p_month,'rows',rows);
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_teaching_ops FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_teaching_ops.slots(date),unipathway_teaching_ops.submit(uuid,date,integer,text,timestamptz),unipathway_teaching_ops.review(uuid,integer,text,text),unipathway_teaching_ops.monthly(date,text) TO authenticated;
CREATE FUNCTION public.get_unipathway_teaching_slots(p_date date) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_ops.slots(p_date)$$;
CREATE FUNCTION public.submit_unipathway_teaching_timesheet(p_schedule uuid,p_date date,p_minutes integer,p_evidence text,p_expected_updated_at timestamptz) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_ops.submit(p_schedule,p_date,p_minutes,p_evidence,p_expected_updated_at)$$;
CREATE FUNCTION public.review_unipathway_teaching_timesheet(p_claim uuid,p_revision integer,p_decision text,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_ops.review(p_claim,p_revision,p_decision,p_note)$$;
CREATE FUNCTION public.get_unipathway_teaching_timesheets(p_month date,p_role text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_ops.monthly(p_month,p_role)$$;
REVOKE ALL ON FUNCTION public.get_unipathway_teaching_slots(date),public.submit_unipathway_teaching_timesheet(uuid,date,integer,text,timestamptz),public.review_unipathway_teaching_timesheet(uuid,integer,text,text),public.get_unipathway_teaching_timesheets(date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_teaching_slots(date),public.submit_unipathway_teaching_timesheet(uuid,date,integer,text,timestamptz),public.review_unipathway_teaching_timesheet(uuid,integer,text,text),public.get_unipathway_teaching_timesheets(date,text) TO authenticated;
NOTIFY pgrst,'reload schema';
