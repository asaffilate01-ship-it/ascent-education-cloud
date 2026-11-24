-- Controlled forward candidate. Requires the teaching timesheet schema from PR #258.
-- This is an agreed-rate register and gross preparation preview, NOT payroll or a payment authorisation.
CREATE SCHEMA unipathway_teaching_rates;
REVOKE ALL ON SCHEMA unipathway_teaching_rates FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_teaching_rates TO authenticated;
CREATE TABLE unipathway_teaching_rates.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,writes_enabled boolean NOT NULL DEFAULT false,
 CHECK(NOT writes_enabled OR reads_enabled)
);
INSERT INTO unipathway_teaching_rates.activation_gate DEFAULT VALUES;
CREATE TABLE unipathway_teaching_rates.agreements(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES public.tenants(id),lecturer_id uuid NOT NULL REFERENCES auth.users(id),
 effective_from date NOT NULL,effective_until date NOT NULL,basis text NOT NULL CHECK(basis IN ('hourly','session')),
 rate_paisa integer NOT NULL CHECK(rate_paisa BETWEEN 1 AND 999999999),currency text NOT NULL DEFAULT 'PKR' CHECK(currency='PKR'),
 agreement_reference text NOT NULL CHECK(length(btrim(agreement_reference)) BETWEEN 5 AND 500),
 proposed_by uuid NOT NULL REFERENCES auth.users(id),proposed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewed_by uuid REFERENCES auth.users(id),reviewed_at timestamptz,review_note text,
 CHECK(effective_from>=DATE '2000-01-01' AND effective_until<=DATE '2099-12-31' AND effective_until>=effective_from),
 CHECK(proposed_by<>lecturer_id),
 CHECK((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL) OR
 (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_by<>proposed_by AND reviewed_by<>lecturer_id AND reviewed_at IS NOT NULL AND review_note IS NOT NULL AND length(btrim(review_note)) BETWEEN 5 AND 500))
);
CREATE INDEX teaching_rates_lookup ON unipathway_teaching_rates.agreements(tenant_id,lecturer_id,effective_from,effective_until,status);
ALTER TABLE unipathway_teaching_rates.activation_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_teaching_rates.agreements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_teaching_rates FROM PUBLIC,anon,authenticated;
CREATE FUNCTION unipathway_teaching_rates.actor(p_role text,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 IF p_role IS NULL OR p_role NOT IN ('centre_director','finance_officer') THEN RAISE EXCEPTION 'Authorised rate management role required' USING ERRCODE='42501'; END IF;
 t:=unipathway_teaching_ops.actor_tenant(p_role,false);
 IF NOT EXISTS(SELECT 1 FROM unipathway_teaching_rates.activation_gate g WHERE g.singleton AND g.reads_enabled AND (NOT p_write OR g.writes_enabled)) THEN RAISE EXCEPTION 'Teaching rate service not activated' USING ERRCODE='55000'; END IF;
 RETURN t;
END $$;
CREATE FUNCTION unipathway_teaching_rates.receipt(a unipathway_teaching_rates.agreements) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',a.id,'tenant_id',a.tenant_id,'lecturer_id',a.lecturer_id,'effective_from',a.effective_from,'effective_until',a.effective_until,'basis',a.basis,'rate_paisa',a.rate_paisa,'currency',a.currency,'status',a.status,'agreement_reference',a.agreement_reference)
$$;
CREATE FUNCTION unipathway_teaching_rates.propose(p_id uuid,p_lecturer uuid,p_from date,p_until date,p_basis text,p_rate integer,p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; a unipathway_teaching_rates.agreements%ROWTYPE; ref text;
BEGIN
 t:=unipathway_teaching_rates.actor('centre_director',true);ref:=btrim(p_reference);
 IF p_id IS NULL OR p_lecturer IS NULL OR p_lecturer=auth.uid() OR p_from IS NULL OR p_until IS NULL OR p_from<DATE '2000-01-01' OR p_until>DATE '2099-12-31' OR p_until<p_from
 OR p_basis IS NULL OR p_basis NOT IN ('hourly','session') OR p_rate IS NULL OR p_rate NOT BETWEEN 1 AND 999999999 OR ref IS NULL OR length(ref) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Valid independent dated rate agreement required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id WHERE p.user_id=p_lecturer AND p.tenant_id=t AND r.role::text='lecturer') THEN RAISE EXCEPTION 'Verified centre lecturer required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('teaching-rate:'||t::text||':'||p_lecturer::text,0));
 SELECT * INTO a FROM unipathway_teaching_rates.agreements WHERE id=p_id AND tenant_id=t;
 IF FOUND THEN
  IF ROW(a.lecturer_id,a.effective_from,a.effective_until,a.basis,a.rate_paisa,a.agreement_reference,a.proposed_by) IS DISTINCT FROM ROW(p_lecturer,p_from,p_until,p_basis,p_rate,ref,auth.uid()) THEN RAISE EXCEPTION 'Existing request differs; refresh'; END IF;
  RETURN unipathway_teaching_rates.receipt(a);
 END IF;
 IF EXISTS(SELECT 1 FROM unipathway_teaching_rates.agreements r WHERE r.tenant_id=t AND r.lecturer_id=p_lecturer AND r.status IN ('pending','approved') AND r.effective_from<=p_until AND r.effective_until>=p_from) THEN RAISE EXCEPTION 'A pending or approved rate overlaps this period'; END IF;
 INSERT INTO unipathway_teaching_rates.agreements(id,tenant_id,lecturer_id,effective_from,effective_until,basis,rate_paisa,agreement_reference,proposed_by)
 VALUES(p_id,t,p_lecturer,p_from,p_until,p_basis,p_rate,ref,auth.uid()) RETURNING * INTO a;
 RETURN unipathway_teaching_rates.receipt(a);
END $$;
CREATE FUNCTION unipathway_teaching_rates.review(p_id uuid,p_decision text,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; a unipathway_teaching_rates.agreements%ROWTYPE; target uuid; note text;
BEGIN
 t:=unipathway_teaching_rates.actor('finance_officer',true);note:=btrim(p_note);
 IF p_id IS NULL OR p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Independent decision and review note required'; END IF;
 SELECT lecturer_id INTO target FROM unipathway_teaching_rates.agreements WHERE id=p_id AND tenant_id=t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Rate unavailable' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('teaching-rate:'||t::text||':'||target::text,0));
 SELECT * INTO a FROM unipathway_teaching_rates.agreements WHERE id=p_id AND tenant_id=t FOR UPDATE;
 IF NOT FOUND OR auth.uid() IN (a.proposed_by,a.lecturer_id) THEN RAISE EXCEPTION 'Independent finance reviewer required' USING ERRCODE='42501'; END IF;
 IF a.status<>'pending' THEN
  IF a.status<>p_decision OR a.reviewed_by<>auth.uid() OR a.review_note<>note THEN RAISE EXCEPTION 'Rate already reviewed; refresh'; END IF;
  RETURN unipathway_teaching_rates.receipt(a);
 END IF;
 IF p_decision='approved' AND (NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id WHERE p.user_id=a.lecturer_id AND p.tenant_id=t AND r.role::text='lecturer')
 OR EXISTS(SELECT 1 FROM unipathway_teaching_rates.agreements r WHERE r.tenant_id=t AND r.lecturer_id=a.lecturer_id AND r.id<>a.id AND r.status='approved' AND r.effective_from<=a.effective_until AND r.effective_until>=a.effective_from)) THEN RAISE EXCEPTION 'Lecturer membership or effective dates require review'; END IF;
 UPDATE unipathway_teaching_rates.agreements SET status=p_decision,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_note=note WHERE id=a.id RETURNING * INTO a;
 RETURN unipathway_teaching_rates.receipt(a);
END $$;
CREATE FUNCTION unipathway_teaching_rates.register(p_month date,p_role text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; roster jsonb:='[]'::jsonb; rates jsonb;
BEGIN
 t:=unipathway_teaching_rates.actor(p_role,false);
 IF p_month IS NULL OR extract(day FROM p_month)<>1 OR p_month<DATE '2000-01-01' OR p_month>DATE '2099-12-01' THEN RAISE EXCEPTION 'Valid agreement month required'; END IF;
 IF p_role='centre_director' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.name,x.id),'[]'::jsonb) INTO roster FROM(
   SELECT p.user_id AS id,coalesce(nullif(btrim(p.full_name),''),'Lecturer account') AS name FROM public.profiles p
   WHERE p.tenant_id=t AND p.user_id<>auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.tenant_id=t AND r.role::text='lecturer')
   ORDER BY p.full_name,p.user_id LIMIT 501) x;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.effective_from DESC,x.id),'[]'::jsonb) INTO rates FROM(
  SELECT a.id,a.tenant_id,a.lecturer_id,coalesce(nullif(btrim(p.full_name),''),'Lecturer account') AS lecturer_name,
   a.effective_from,a.effective_until,a.basis,a.rate_paisa,a.currency,a.agreement_reference,a.proposed_by,a.proposed_at,a.status,a.reviewed_by,a.reviewed_at,a.review_note
  FROM unipathway_teaching_rates.agreements a LEFT JOIN public.profiles p ON p.user_id=a.lecturer_id AND p.tenant_id=a.tenant_id
  WHERE a.tenant_id=t AND a.effective_from<(p_month+interval '1 month')::date AND a.effective_until>=p_month
  ORDER BY a.effective_from DESC,a.id LIMIT 501) x;
 IF jsonb_array_length(roster)>500 OR jsonb_array_length(rates)>500 THEN RAISE EXCEPTION 'Register exceeds bounded review size; request a centre report'; END IF;
 RETURN jsonb_build_object('tenant_id',t,'role',p_role,'month',p_month,'roster',roster,'rates',rates);
END $$;
CREATE FUNCTION unipathway_teaching_rates.preview(p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; rows jsonb; n integer; pending integer;
BEGIN
 t:=unipathway_teaching_rates.actor('finance_officer',false);
 IF p_month IS NULL OR extract(day FROM p_month)<>1 OR p_month<DATE '2000-01-01' OR p_month>date_trunc('month',now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Valid teaching month required'; END IF;
 SELECT count(*) FILTER(WHERE status='approved'),count(*) FILTER(WHERE status='submitted') INTO n,pending FROM unipathway_teaching_ops.timesheets v WHERE v.tenant_id=t AND v.teaching_date>=p_month AND v.teaching_date<(p_month+interval '1 month')::date;
 IF n>500 THEN RAISE EXCEPTION 'Too many approved claims; request a paginated report'; END IF;
 IF EXISTS(SELECT 1 FROM unipathway_teaching_ops.timesheets v JOIN unipathway_teaching_rates.agreements a ON a.tenant_id=v.tenant_id AND a.lecturer_id=v.lecturer_id AND a.status='approved' AND v.teaching_date BETWEEN a.effective_from AND a.effective_until WHERE v.tenant_id=t AND v.status='approved' AND v.teaching_date>=p_month AND v.teaching_date<(p_month+interval '1 month')::date GROUP BY v.id HAVING count(*)>1) THEN RAISE EXCEPTION 'Overlapping approved rates; reconcile before preparing remuneration'; END IF;
 WITH eligible AS (
  SELECT v.lecturer_id,coalesce(nullif(btrim(p.full_name),''),'Lecturer account') AS lecturer_name,v.actual_minutes,a.id AS agreement_id,a.basis,a.rate_paisa,
   CASE WHEN a.id IS NULL THEN 'missing_rate' WHEN a.basis='session' AND v.actual_minutes<>v.planned_minutes THEN 'partial_session' ELSE 'calculated' END AS resolution
  FROM unipathway_teaching_ops.timesheets v LEFT JOIN public.profiles p ON p.user_id=v.lecturer_id AND p.tenant_id=v.tenant_id
  LEFT JOIN unipathway_teaching_rates.agreements a ON a.tenant_id=v.tenant_id AND a.lecturer_id=v.lecturer_id AND a.status='approved' AND v.teaching_date BETWEEN a.effective_from AND a.effective_until
  WHERE v.tenant_id=t AND v.status='approved' AND v.teaching_date>=p_month AND v.teaching_date<(p_month+interval '1 month')::date
 ), grouped AS (
  SELECT lecturer_id,lecturer_name,agreement_id,basis,rate_paisa,resolution,count(*)::integer AS sessions,sum(actual_minutes)::integer AS minutes,
  CASE WHEN resolution='calculated' THEN CASE WHEN basis='hourly' THEN round(rate_paisa::numeric*sum(actual_minutes)/60)::bigint ELSE rate_paisa::bigint*count(*) END END AS gross_paisa
  FROM eligible GROUP BY lecturer_id,lecturer_name,agreement_id,basis,rate_paisa,resolution
 )
 SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY g.lecturer_name,g.lecturer_id,g.agreement_id,g.resolution),'[]'::jsonb) INTO rows FROM grouped g;
 RETURN jsonb_build_object('tenant_id',t,'role','finance_officer','month',p_month,'currency','PKR','approved_claims',n,'pending_claims',pending,'rows',rows);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_teaching_rates FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_teaching_rates.propose(uuid,uuid,date,date,text,integer,text),unipathway_teaching_rates.review(uuid,text,text),unipathway_teaching_rates.register(date,text),unipathway_teaching_rates.preview(date) TO authenticated;
CREATE FUNCTION public.propose_unipathway_teaching_rate(p_id uuid,p_lecturer uuid,p_from date,p_until date,p_basis text,p_rate integer,p_reference text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_rates.propose(p_id,p_lecturer,p_from,p_until,p_basis,p_rate,p_reference)$$;
CREATE FUNCTION public.review_unipathway_teaching_rate(p_id uuid,p_decision text,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_rates.review(p_id,p_decision,p_note)$$;
CREATE FUNCTION public.get_unipathway_teaching_rates(p_month date,p_role text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_rates.register(p_month,p_role)$$;
CREATE FUNCTION public.preview_unipathway_teaching_remuneration(p_month date) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_teaching_rates.preview(p_month)$$;
REVOKE ALL ON FUNCTION public.propose_unipathway_teaching_rate(uuid,uuid,date,date,text,integer,text),public.review_unipathway_teaching_rate(uuid,text,text),public.get_unipathway_teaching_rates(date,text),public.preview_unipathway_teaching_remuneration(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_unipathway_teaching_rate(uuid,uuid,date,date,text,integer,text),public.review_unipathway_teaching_rate(uuid,text,text),public.get_unipathway_teaching_rates(date,text),public.preview_unipathway_teaching_remuneration(date) TO authenticated;
NOTIFY pgrst,'reload schema';
