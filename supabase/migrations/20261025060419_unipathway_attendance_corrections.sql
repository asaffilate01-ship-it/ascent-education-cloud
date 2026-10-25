-- All client access goes through authorised RPCs; requests retain their original evidence.
CREATE TABLE public.attendance_corrections (
 id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 record_id uuid NOT NULL REFERENCES public.attendance_records(id),
 module_id uuid NOT NULL,
 student_id uuid NOT NULL,
 attendance_date date NOT NULL,
 original_method text,
 original_status public.attendance_status NOT NULL,
 requested_status public.attendance_status NOT NULL CHECK (requested_status<>original_status),
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 10 AND 2000),
 requested_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','rejected')),
 reviewed_by uuid,
 reviewed_at timestamptz,
 review_reason text,
 CHECK ((state='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_reason IS NULL)
 OR (state<>'pending' AND reviewed_by IS NOT NULL AND reviewed_by<>requested_by AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL AND length(btrim(review_reason)) BETWEEN 10 AND 2000))
);
CREATE UNIQUE INDEX attendance_correction_pending ON public.attendance_corrections(record_id) WHERE state='pending';
CREATE INDEX attendance_correction_tenant_cursor ON public.attendance_corrections(tenant_id,id);
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_corrections FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.request_attendance_correction(p_id uuid,p_record uuid,p_status public.attendance_status,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.attendance_records; m public.modules; old public.attendance_corrections;
BEGIN
 SELECT * INTO r FROM public.attendance_records WHERE id=p_record FOR UPDATE;
 SELECT * INTO m FROM public.modules WHERE id=r.module_id FOR SHARE;
 IF auth.uid() IS NULL OR r.id IS NULL OR m.id IS NULL OR m.tenant_id IS DISTINCT FROM r.tenant_id
 OR m.lecturer_id IS DISTINCT FROM auth.uid() OR r.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
 OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=r.tenant_id AND role='lecturer')
 THEN RAISE EXCEPTION 'Assigned lecturer access required' USING ERRCODE='42501';END IF;
 IF p_id IS NULL OR p_status IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Choose a mark and give a reason of 10 to 2000 characters';END IF;
 SELECT * INTO old FROM public.attendance_corrections WHERE id=p_id;
 IF FOUND THEN
  IF old.record_id=p_record AND old.requested_by=auth.uid() AND old.requested_status=p_status AND old.reason=btrim(p_reason) THEN RETURN old.id;END IF;
  RAISE EXCEPTION 'Request identity already used';
 END IF;
 IF r.status=p_status THEN RAISE EXCEPTION 'Choose a different attendance mark';END IF;
 IF EXISTS(SELECT 1 FROM public.attendance_corrections WHERE record_id=r.id AND state='pending') THEN RAISE EXCEPTION 'This mark already has a pending correction';END IF;
 INSERT INTO public.attendance_corrections(id,tenant_id,record_id,module_id,student_id,attendance_date,original_method,original_status,requested_status,reason,requested_by)
 VALUES(p_id,r.tenant_id,r.id,r.module_id,r.student_id,r.date,r.method,r.status,p_status,btrim(p_reason),auth.uid());
 RETURN p_id;
END $$;

CREATE FUNCTION public.review_attendance_correction(p_id uuid,p_decision text,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.attendance_corrections; r public.attendance_records; target uuid;
BEGIN
 -- Consistent lock order: attendance record, then correction.
 SELECT record_id INTO target FROM public.attendance_corrections WHERE id=p_id;
 SELECT * INTO r FROM public.attendance_records WHERE id=target FOR UPDATE;
 SELECT * INTO c FROM public.attendance_corrections WHERE id=p_id FOR UPDATE;
 IF auth.uid() IS NULL OR c.id IS NULL OR c.tenant_id IS DISTINCT FROM public.get_user_tenant_id(auth.uid())
 OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=c.tenant_id AND role IN ('centre_director','superadmin'))
 OR c.requested_by=auth.uid() THEN RAISE EXCEPTION 'A different centre administrator must review this request' USING ERRCODE='42501';END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Choose a decision and give a reason of 10 to 2000 characters';END IF;
 IF c.state<>'pending' THEN
  IF c.state=p_decision AND c.reviewed_by=auth.uid() AND c.review_reason=btrim(p_reason) THEN RETURN c.id;END IF;
  RAISE EXCEPTION 'Request already reviewed; refresh the history';
 END IF;
 IF p_decision='approved' THEN
  IF r.id IS NULL OR r.tenant_id IS DISTINCT FROM c.tenant_id OR r.status IS DISTINCT FROM c.original_status
  OR r.module_id IS DISTINCT FROM c.module_id OR r.student_id IS DISTINCT FROM c.student_id OR r.date IS DISTINCT FROM c.attendance_date
  OR r.method IS DISTINCT FROM c.original_method THEN RAISE EXCEPTION 'Attendance changed since this request; reject it and request a new correction';END IF;
  UPDATE public.attendance_records SET status=c.requested_status WHERE id=r.id;
 END IF;
 UPDATE public.attendance_corrections SET state=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_reason=btrim(p_reason) WHERE id=c.id;
 RETURN c.id;
END $$;

CREATE FUNCTION public.list_attendance_corrections(p_after uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid:=public.get_user_tenant_id(auth.uid()); manager boolean;
BEGIN
 IF auth.uid() IS NULL OR tenant IS NULL THEN RAISE EXCEPTION 'Sign in to your centre' USING ERRCODE='42501';END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=tenant AND role IN ('centre_director','superadmin')) INTO manager;
 IF NOT manager AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND tenant_id=tenant AND role='lecturer') THEN RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) FROM (
 SELECT c.*,m.title AS module_title,coalesce(p.full_name,'Learner unavailable') AS learner_name,r.status AS current_status,
 coalesce(a.full_name,c.requested_by::text) AS requester_name,coalesce(v.full_name,c.reviewed_by::text) AS reviewer_name
 FROM public.attendance_corrections c
 JOIN public.modules m ON m.id=c.module_id AND m.tenant_id=c.tenant_id
 JOIN public.attendance_records r ON r.id=c.record_id AND r.tenant_id=c.tenant_id
 LEFT JOIN public.profiles p ON p.user_id=c.student_id AND p.tenant_id=c.tenant_id
 LEFT JOIN public.profiles a ON a.user_id=c.requested_by AND a.tenant_id=c.tenant_id
 LEFT JOIN public.profiles v ON v.user_id=c.reviewed_by AND v.tenant_id=c.tenant_id
 WHERE c.tenant_id=tenant AND (manager OR m.lecturer_id=auth.uid()) AND (p_after IS NULL OR c.id>p_after)
 ORDER BY c.id LIMIT 100
 ) q),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.request_attendance_correction(uuid,uuid,public.attendance_status,text),public.review_attendance_correction(uuid,text,text),public.list_attendance_corrections(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_attendance_correction(uuid,uuid,public.attendance_status,text),public.review_attendance_correction(uuid,text,text),public.list_attendance_corrections(uuid) TO authenticated;
