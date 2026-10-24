-- Daily manual marks: preserve historical rows and prevent direct client writes bypassing checks.
ALTER TABLE public.attendance_records ADD COLUMN recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX attendance_module_day_student ON public.attendance_records(module_id,date,student_id);
CREATE UNIQUE INDEX attendance_daily_register_identity ON public.attendance_records(module_id,date,student_id) WHERE method='daily_register';
REVOKE INSERT,UPDATE,DELETE ON public.attendance_records FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.get_unipathway_daily_register(p_module uuid,p_date date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules;
BEGIN
 SELECT * INTO m FROM public.modules WHERE id=p_module;
 IF auth.uid() IS NULL OR m.id IS NULL OR m.lecturer_id IS DISTINCT FROM auth.uid()
 OR m.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.tenant_id=m.tenant_id AND ur.role='lecturer')
 THEN RAISE EXCEPTION 'Assigned lecturer access required' USING ERRCODE='42501';END IF;
 IF p_date IS NULL OR p_date>(now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Choose today or an earlier register date';END IF;
 RETURN jsonb_build_object('module_id',m.id,'date',p_date,'learners',coalesce((
 SELECT jsonb_agg(jsonb_build_object('student_id',p.user_id,'name',p.full_name,'marks',coalesce((
  SELECT jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'method',r.method) ORDER BY r.created_at,r.id)
  FROM public.attendance_records r WHERE r.tenant_id=m.tenant_id AND r.module_id=m.id AND r.student_id=p.user_id AND r.date=p_date
 ),'[]'::jsonb)) ORDER BY p.full_name,p.user_id)
 FROM public.profiles p WHERE p.tenant_id=m.tenant_id AND EXISTS(
  SELECT 1 FROM public.student_enrolments e WHERE e.student_id=p.user_id AND e.tenant_id=m.tenant_id AND e.programme_id=m.programme_id AND e.status='active'
 )
 ),'[]'::jsonb));
END $$;

CREATE FUNCTION public.save_unipathway_daily_mark(p_module uuid,p_student uuid,p_date date,p_status public.attendance_status) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m public.modules; existing public.attendance_records; saved uuid;
BEGIN
 -- Lock module and enrolment against concurrent reassignment/withdrawal until this transaction finishes.
 SELECT * INTO m FROM public.modules WHERE id=p_module FOR SHARE;
 IF auth.uid() IS NULL OR m.id IS NULL OR m.lecturer_id IS DISTINCT FROM auth.uid()
 OR m.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.tenant_id=m.tenant_id AND ur.role='lecturer')
 THEN RAISE EXCEPTION 'Assigned lecturer access required' USING ERRCODE='42501';END IF;
 IF p_date IS NULL OR p_date>(now() AT TIME ZONE 'Asia/Karachi')::date OR p_status IS NULL THEN RAISE EXCEPTION 'A past or current date and attendance mark are required';END IF;
 PERFORM 1 FROM public.student_enrolments e JOIN public.profiles p ON p.user_id=e.student_id AND p.tenant_id=e.tenant_id
 WHERE e.student_id=p_student AND e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id AND e.status='active' FOR SHARE OF e,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active learner enrolment required' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_module::text||':'||p_student::text||':'||p_date::text,71));
 SELECT * INTO existing FROM public.attendance_records WHERE module_id=m.id AND student_id=p_student AND date=p_date AND tenant_id=m.tenant_id ORDER BY created_at,id LIMIT 1;
 IF FOUND THEN
  IF existing.method='daily_register' AND existing.status=p_status THEN RETURN existing.id;END IF;
  RAISE EXCEPTION 'A mark already exists. Refresh the register; corrections require administrator review';
 END IF;
 INSERT INTO public.attendance_records(tenant_id,module_id,student_id,date,status,method,recorded_by)
 VALUES(m.tenant_id,m.id,p_student,p_date,p_status,'daily_register',auth.uid()) RETURNING id INTO saved;
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION public.get_unipathway_daily_register(uuid,date),public.save_unipathway_daily_mark(uuid,uuid,date,public.attendance_status) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_daily_register(uuid,date),public.save_unipathway_daily_mark(uuid,uuid,date,public.attendance_status) TO authenticated;
