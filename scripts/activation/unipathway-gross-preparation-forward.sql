-- Reviewed forward-only candidate; depends on teaching timesheets and approved rates.
-- This freezes gross preparation evidence, NOT deductions, payroll finalisation or payment.
CREATE SCHEMA unipathway_payroll_prep;
REVOKE ALL ON SCHEMA unipathway_payroll_prep FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_payroll_prep TO authenticated;
CREATE TABLE unipathway_payroll_prep.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),reads_enabled boolean NOT NULL DEFAULT false,
 writes_enabled boolean NOT NULL DEFAULT false,CHECK(NOT writes_enabled OR reads_enabled)
);
INSERT INTO unipathway_payroll_prep.activation_gate DEFAULT VALUES;
CREATE TABLE unipathway_payroll_prep.batches(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES public.tenants(id),month date NOT NULL,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),fingerprint text NOT NULL CHECK(fingerprint~'^[0-9a-f]{64}$'),
 status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','reviewed','rejected')),
 prepared_by uuid NOT NULL REFERENCES auth.users(id),prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reviewed_by uuid REFERENCES auth.users(id),reviewed_at timestamptz,review_note text,
 CHECK(extract(day FROM month)=1),
 CHECK((status='prepared' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL) OR
 (status IN ('reviewed','rejected') AND reviewed_by IS NOT NULL AND reviewed_by<>prepared_by AND reviewed_at IS NOT NULL AND review_note IS NOT NULL AND length(btrim(review_note)) BETWEEN 5 AND 500))
);
CREATE UNIQUE INDEX one_active_gross_preparation ON unipathway_payroll_prep.batches(tenant_id,month) WHERE status IN ('prepared','reviewed');
ALTER TABLE unipathway_payroll_prep.activation_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_payroll_prep.batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_payroll_prep FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_payroll_prep.actor(p_role text,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 t:=unipathway_teaching_rates.actor(p_role,false);
 IF NOT EXISTS(SELECT 1 FROM unipathway_payroll_prep.activation_gate g WHERE g.singleton AND g.reads_enabled AND (NOT p_write OR g.writes_enabled)) THEN RAISE EXCEPTION 'Gross preparation is not activated' USING ERRCODE='55000'; END IF;
 RETURN t;
END $$;
-- Private helper: all source rows captured in one statement snapshot, ordered deterministically.
-- Call only after resolving the caller's verified centre.
CREATE FUNCTION unipathway_payroll_prep.source(t uuid,p_month date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF t IS NULL OR p_month IS NULL OR p_month<DATE '2000-01-01' OR extract(day FROM p_month)<>1
 OR p_month>=date_trunc('month',now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Choose a completed Pakistan teaching month'; END IF;
 WITH claims AS MATERIALIZED (
  SELECT v.id,v.lecturer_id,v.schedule_id,v.teaching_date,v.planned_minutes,v.actual_minutes,v.status,v.revision,v.reviewed_by,v.reviewed_at,
   coalesce(nullif(btrim(p.full_name),''),'Lecturer account') AS lecturer_name
  FROM unipathway_teaching_ops.timesheets v LEFT JOIN public.profiles p ON p.user_id=v.lecturer_id AND p.tenant_id=v.tenant_id
  WHERE v.tenant_id=t AND v.teaching_date>=p_month AND v.teaching_date<(p_month+interval '1 month')::date
  ORDER BY v.id LIMIT 501
 ), mapped AS (
  SELECT c.*,a.agreement_id,a.basis,a.rate_paisa,a.rate_reviewer,a.rate_reviewed_at,
  CASE WHEN c.status<>'approved' THEN 'excluded' WHEN coalesce(a.matches,0)>1 THEN 'ambiguous'
       WHEN a.agreement_id IS NULL THEN 'missing_rate' WHEN a.basis='session' AND c.actual_minutes<>c.planned_minutes THEN 'partial_session' ELSE 'calculated' END AS resolution
  FROM claims c LEFT JOIN LATERAL (
   SELECT r.id AS agreement_id,r.basis,r.rate_paisa,r.reviewed_by AS rate_reviewer,r.reviewed_at AS rate_reviewed_at,count(*) OVER() AS matches
   FROM unipathway_teaching_rates.agreements r WHERE c.status='approved' AND r.tenant_id=t AND r.lecturer_id=c.lecturer_id AND r.status='approved' AND c.teaching_date BETWEEN r.effective_from AND r.effective_until ORDER BY r.id LIMIT 1
  ) a ON true
 ), groups AS (
  SELECT lecturer_id,lecturer_name,agreement_id,basis,rate_paisa,resolution,count(*)::integer AS sessions,sum(actual_minutes)::integer AS minutes,
   CASE WHEN resolution='calculated' THEN CASE WHEN basis='hourly' THEN round(rate_paisa::numeric*sum(actual_minutes)/60)::bigint ELSE rate_paisa::bigint*count(*) END END AS gross_paisa
  FROM mapped WHERE status='approved' GROUP BY lecturer_id,lecturer_name,agreement_id,basis,rate_paisa,resolution
 )
 SELECT jsonb_build_object('tenant_id',t,'month',p_month,'currency','PKR',
  'source_count',(SELECT count(*) FROM mapped),'approved_claims',(SELECT count(*) FROM mapped WHERE status='approved'),
  'pending_claims',(SELECT count(*) FROM mapped WHERE status='submitted'),'rejected_claims',(SELECT count(*) FROM mapped WHERE status='rejected'),
  'unresolved_claims',(SELECT count(*) FROM mapped WHERE status='approved' AND resolution<>'calculated'),
  'gross_paisa',coalesce((SELECT sum(gross_paisa) FROM groups),0),
  'rows',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.lecturer_id,g.agreement_id,g.resolution) FROM groups g),'[]'::jsonb),
  'claims',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM mapped m),'[]'::jsonb)) INTO result;
 IF (result->>'source_count')::integer>500 THEN RAISE EXCEPTION 'More than 500 source claims; request a controlled centre report'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'rows') r WHERE r->>'resolution'='ambiguous') THEN RAISE EXCEPTION 'Overlapping approved rates; reconcile source records'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION unipathway_payroll_prep.fingerprint(s jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT encode(sha256(convert_to(s::text,'UTF8')),'hex')
$$;
CREATE FUNCTION unipathway_payroll_prep.ready(s jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce((s->>'approved_claims')::int>0 AND (s->>'pending_claims')::int=0 AND (s->>'unresolved_claims')::int=0,false)
$$;
CREATE FUNCTION unipathway_payroll_prep.includes_own(s jsonb,u uuid) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'claims') c WHERE c->>'status'='approved' AND c->>'lecturer_id'=u::text)
$$;
CREATE FUNCTION unipathway_payroll_prep.receipt(b unipathway_payroll_prep.batches) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',b.id,'tenant_id',b.tenant_id,'month',b.month,'status',b.status,'fingerprint',b.fingerprint,
 'prepared_by',b.prepared_by,'prepared_at',b.prepared_at,'reviewed_by',b.reviewed_by,'reviewed_at',b.reviewed_at,'review_note',b.review_note,
 'summary',b.snapshot-'claims')
$$;
CREATE FUNCTION unipathway_payroll_prep.read_month(p_month date,p_role text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;s jsonb;b unipathway_payroll_prep.batches%ROWTYPE;history jsonb;
BEGIN
 t:=unipathway_payroll_prep.actor(p_role,false);s:=unipathway_payroll_prep.source(t,p_month);
 SELECT * INTO b FROM unipathway_payroll_prep.batches WHERE tenant_id=t AND month=p_month AND status IN ('prepared','reviewed');
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.reviewed_at DESC,x.id),'[]'::jsonb) INTO history FROM(
  SELECT id,status,prepared_at,reviewed_at,review_note,fingerprint FROM unipathway_payroll_prep.batches WHERE tenant_id=t AND month=p_month AND status='rejected' ORDER BY reviewed_at DESC,id LIMIT 10
 ) x;
 RETURN jsonb_build_object('tenant_id',t,'role',p_role,'month',p_month,'summary',s-'claims','fingerprint',unipathway_payroll_prep.fingerprint(s),
 'ready',unipathway_payroll_prep.ready(s),'contains_own',unipathway_payroll_prep.includes_own(s,auth.uid()),
 'batch',CASE WHEN b.id IS NULL THEN NULL ELSE unipathway_payroll_prep.receipt(b) END,
 'batch_current',CASE WHEN b.id IS NULL THEN NULL ELSE b.snapshot=s END,'rejected_history',history);
END $$;
CREATE FUNCTION unipathway_payroll_prep.prepare(p_id uuid,p_month date,p_fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;s jsonb;b unipathway_payroll_prep.batches%ROWTYPE;
BEGIN
 t:=unipathway_payroll_prep.actor('finance_officer',true);
 IF p_id IS NULL OR p_month IS NULL OR p_fingerprint IS NULL OR p_fingerprint!~'^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Reviewed month and source receipt required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gross-preparation:'||t::text||':'||p_month::text,0));
 SELECT * INTO b FROM unipathway_payroll_prep.batches WHERE id=p_id AND tenant_id=t;
 IF FOUND THEN
  IF b.month<>p_month OR b.prepared_by<>auth.uid() OR b.fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'Existing request differs; refresh'; END IF;
  RETURN unipathway_payroll_prep.receipt(b);
 END IF;
 s:=unipathway_payroll_prep.source(t,p_month);
 IF NOT unipathway_payroll_prep.ready(s) OR unipathway_payroll_prep.includes_own(s,auth.uid()) OR unipathway_payroll_prep.fingerprint(s)<>p_fingerprint THEN RAISE EXCEPTION 'Source changed, unresolved claims or own remuneration; refresh and reconcile'; END IF;
 IF EXISTS(SELECT 1 FROM unipathway_payroll_prep.batches WHERE tenant_id=t AND month=p_month AND status IN ('prepared','reviewed')) THEN RAISE EXCEPTION 'An active gross preparation already exists'; END IF;
 INSERT INTO unipathway_payroll_prep.batches(id,tenant_id,month,snapshot,fingerprint,prepared_by) VALUES(p_id,t,p_month,s,p_fingerprint,auth.uid()) RETURNING * INTO b;
 RETURN unipathway_payroll_prep.receipt(b);
END $$;
CREATE FUNCTION unipathway_payroll_prep.review(p_id uuid,p_fingerprint text,p_decision text,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;m date;s jsonb;b unipathway_payroll_prep.batches%ROWTYPE;note text;
BEGIN
 t:=unipathway_payroll_prep.actor('centre_director',true);note:=btrim(p_note);
 IF p_id IS NULL OR p_fingerprint IS NULL OR p_decision IS NULL OR p_decision NOT IN ('reviewed','rejected') OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Independent review and evidence note required'; END IF;
 SELECT month INTO m FROM unipathway_payroll_prep.batches WHERE id=p_id AND tenant_id=t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Preparation unavailable' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('gross-preparation:'||t::text||':'||m::text,0));
 SELECT * INTO b FROM unipathway_payroll_prep.batches WHERE id=p_id AND tenant_id=t FOR UPDATE;
 IF NOT FOUND OR b.prepared_by=auth.uid() OR unipathway_payroll_prep.includes_own(b.snapshot,auth.uid()) OR b.fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'Independent reviewer and exact preparation required' USING ERRCODE='42501'; END IF;
 IF b.status<>'prepared' THEN
  IF b.status<>p_decision OR b.reviewed_by<>auth.uid() OR b.review_note<>note THEN RAISE EXCEPTION 'Preparation already reviewed'; END IF;
  RETURN unipathway_payroll_prep.receipt(b);
 END IF;
 IF p_decision='reviewed' THEN
  s:=unipathway_payroll_prep.source(t,m);
  IF NOT unipathway_payroll_prep.ready(s) OR s IS DISTINCT FROM b.snapshot THEN RAISE EXCEPTION 'Source changed; reject this preparation and reconcile'; END IF;
 END IF;
 UPDATE unipathway_payroll_prep.batches SET status=p_decision,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_note=note WHERE id=b.id RETURNING * INTO b;
 RETURN unipathway_payroll_prep.receipt(b);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_payroll_prep FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_payroll_prep.read_month(date,text),unipathway_payroll_prep.prepare(uuid,date,text),unipathway_payroll_prep.review(uuid,text,text,text) TO authenticated;
CREATE FUNCTION public.get_unipathway_gross_preparation(p_month date,p_role text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_payroll_prep.read_month(p_month,p_role)$$;
CREATE FUNCTION public.prepare_unipathway_gross_batch(p_id uuid,p_month date,p_fingerprint text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_payroll_prep.prepare(p_id,p_month,p_fingerprint)$$;
CREATE FUNCTION public.review_unipathway_gross_batch(p_id uuid,p_fingerprint text,p_decision text,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_payroll_prep.review(p_id,p_fingerprint,p_decision,p_note)$$;
REVOKE ALL ON FUNCTION public.get_unipathway_gross_preparation(date,text),public.prepare_unipathway_gross_batch(uuid,date,text),public.review_unipathway_gross_batch(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_gross_preparation(date,text),public.prepare_unipathway_gross_batch(uuid,date,text),public.review_unipathway_gross_batch(uuid,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
