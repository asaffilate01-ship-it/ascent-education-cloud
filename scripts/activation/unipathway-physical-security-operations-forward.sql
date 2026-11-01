-- STAGING-ONLY forward patch. Verify UniPathway tenant/project, backups, migration ledger and two-centre JWT before applying.
-- Do NOT run against DISHBEE. Never bulk replay older Lovable migrations.
BEGIN;
CREATE SCHEMA IF NOT EXISTS unipathway_security;
REVOKE ALL ON SCHEMA unipathway_security FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA unipathway_security TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_security.verified_officer(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT (SELECT auth.uid()) IS NOT NULL AND p_tenant IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=p_tenant AND t.status='active')
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.tenant_id=p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles r
    WHERE r.user_id=(SELECT auth.uid()) AND r.tenant_id=p_tenant AND r.role::text='security_officer')
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.verified_officer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.verified_officer(uuid) TO authenticated;

-- No security-officer SELECT policy is added to the raw, Data API exposed
-- camera/device/visitor/gate tables. They contain confidential fields including
-- stream_reference, endpoint_reference and metadata. A scoped SECURITY DEFINER
-- projection returns ONLY the allowlisted columns used by the dashboards.
CREATE OR REPLACE FUNCTION unipathway_security.verified_reader(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT (SELECT auth.uid()) IS NOT NULL AND p_tenant IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=p_tenant AND t.status='active')
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.tenant_id=p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles r
   WHERE r.user_id=(SELECT auth.uid()) AND r.tenant_id=p_tenant
   AND r.role::text IN ('security_officer','centre_director'))
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.verified_reader(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.verified_reader(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_security.read_operations_impl(
 p_tenant uuid,p_kind text,p_offset integer,p_limit integer,p_event_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_rows jsonb:='[]'::jsonb;
BEGIN
 IF NOT unipathway_security.verified_reader(p_tenant) THEN
  RAISE EXCEPTION 'Verified centre security reader required';
 END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>5000 OR p_limit IS NULL OR p_limit<1 OR p_limit>200 THEN
  RAISE EXCEPTION 'Invalid secure page request';
 END IF;
 IF p_kind='centre_visitors' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,full_name,pass_number,purpose,status,checked_in_at,checked_out_at,created_at
   FROM public.centre_visitors WHERE tenant_id=p_tenant ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='centre_occupancy' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT tenant_id,person_key,person_type,in_building,last_event_at,last_gate_id
   FROM public.centre_occupancy WHERE tenant_id=p_tenant ORDER BY person_key LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='centre_access_events' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,gate_id,direction,decision,occurred_at
   FROM public.centre_access_events WHERE tenant_id=p_tenant ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='cctv_cameras' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,camera_code,display_name,status,last_health_at
   FROM public.cctv_cameras WHERE tenant_id=p_tenant ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='security_devices' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,device_code,device_type,status,last_health_at
   FROM public.security_devices WHERE tenant_id=p_tenant ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='emergency_muster_events' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,status,started_at,ended_at
   FROM public.emergency_muster_events WHERE tenant_id=p_tenant ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSIF p_kind='emergency_muster_status' THEN
  IF p_event_id IS NULL THEN RAISE EXCEPTION 'An approved muster event is required';END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
   SELECT id,tenant_id,muster_event_id,person_key,person_type,expected_inside,status,muster_point
   FROM public.emergency_muster_status WHERE tenant_id=p_tenant AND muster_event_id=p_event_id
   ORDER BY id LIMIT p_limit OFFSET p_offset
  ) r;
 ELSE
  RAISE EXCEPTION 'Unknown centre security dataset';
 END IF;
 RETURN v_rows;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_security.read_operations_impl(uuid,text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.read_operations_impl(uuid,text,integer,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unipathway_security_operations_rows(
 p_tenant uuid,p_kind text,p_offset integer DEFAULT 0,p_limit integer DEFAULT 200,p_event_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.read_operations_impl(p_tenant,p_kind,p_offset,p_limit,p_event_id) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_security_operations_rows(uuid,text,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_security_operations_rows(uuid,text,integer,integer,uuid) TO authenticated;

-- Private, non-API idempotency ledger. Keeps visitor events atomic when the operator retries after a timeout.
CREATE TABLE unipathway_security.visitor_command_receipts (
 tenant_id uuid NOT NULL, request_id uuid NOT NULL, actor_id uuid NOT NULL,
 visitor_id uuid NOT NULL, action text NOT NULL CHECK(action IN ('checkin','checkout')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,request_id)
);
ALTER TABLE unipathway_security.visitor_command_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_security.visitor_command_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION unipathway_security.register_visitor_impl(
 p_tenant uuid,p_name text,p_purpose text,p_gate text,p_id_attested boolean,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_id uuid:=gen_random_uuid(); v_actor uuid:=(SELECT auth.uid()); v_pass text;
 v_record public.centre_visitors%ROWTYPE; v_old record; v_inserted integer;
BEGIN
 IF NOT unipathway_security.verified_officer(p_tenant) THEN RAISE EXCEPTION 'Security Officer centre permission required';END IF;
 IF p_request_id IS NULL OR p_id_attested IS DISTINCT FROM true
   OR length(btrim(coalesce(p_name,''))) NOT BETWEEN 2 AND 120
   OR length(btrim(coalesce(p_purpose,''))) NOT BETWEEN 2 AND 200
   OR length(btrim(coalesce(p_gate,''))) NOT BETWEEN 2 AND 80
 THEN RAISE EXCEPTION 'Visitor request invalid or physical ID check not attested';END IF;
 INSERT INTO unipathway_security.visitor_command_receipts
   (tenant_id,request_id,actor_id,visitor_id,action)
 VALUES(p_tenant,p_request_id,v_actor,v_id,'checkin')
 ON CONFLICT(tenant_id,request_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 IF v_inserted=0 THEN
  SELECT actor_id,visitor_id,action INTO v_old
   FROM unipathway_security.visitor_command_receipts
   WHERE tenant_id=p_tenant AND request_id=p_request_id;
  IF v_old.actor_id IS DISTINCT FROM v_actor OR v_old.action<>'checkin'
   THEN RAISE EXCEPTION 'Request identifier used by another action';END IF;
  SELECT * INTO v_record FROM public.centre_visitors WHERE tenant_id=p_tenant AND id=v_old.visitor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visitor receipt incomplete';END IF;
 ELSE
  v_pass:='UP-'||upper(substr(replace(v_id::text,'-',''),1,12));
  INSERT INTO public.centre_visitors(
    id,tenant_id,full_name,id_type,purpose,pass_number,checked_in_at,status
  ) VALUES(v_id,p_tenant,btrim(p_name),'in_person_attested',btrim(p_purpose),v_pass,now(),'in_building')
    RETURNING * INTO v_record;
  INSERT INTO public.centre_access_events(
    tenant_id,visitor_id,gate_id,direction,decision,security_user_id,occurred_at
  ) VALUES(p_tenant,v_id,btrim(p_gate),'in','allowed',v_actor,now());
  INSERT INTO public.centre_occupancy(
    tenant_id,person_key,person_type,visitor_id,in_building,last_event_at,last_gate_id
  ) VALUES(p_tenant,'visitor:'||v_id::text,'visitor',v_id,true,now(),btrim(p_gate))
  ON CONFLICT(tenant_id,person_key) DO UPDATE
   SET in_building=true,last_event_at=excluded.last_event_at,last_gate_id=excluded.last_gate_id;
 END IF;
 RETURN jsonb_build_object('id',v_record.id,'tenant_id',v_record.tenant_id,
   'status',v_record.status,'pass_number',v_record.pass_number);
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_security.register_visitor_impl(uuid,text,text,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.register_visitor_impl(uuid,text,text,text,boolean,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_security.checkout_visitor_impl(
 p_tenant uuid,p_visitor uuid,p_gate text,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid()); v_record public.centre_visitors%ROWTYPE;
 v_old record; v_inserted integer; v_updated integer;
BEGIN
 IF NOT unipathway_security.verified_officer(p_tenant) THEN RAISE EXCEPTION 'Security Officer centre permission required';END IF;
 IF p_visitor IS NULL OR p_request_id IS NULL OR length(btrim(coalesce(p_gate,''))) NOT BETWEEN 2 AND 80
 THEN RAISE EXCEPTION 'Visitor checkout request invalid';END IF;
 INSERT INTO unipathway_security.visitor_command_receipts
   (tenant_id,request_id,actor_id,visitor_id,action)
 VALUES(p_tenant,p_request_id,v_actor,p_visitor,'checkout')
 ON CONFLICT(tenant_id,request_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 IF v_inserted=0 THEN
  SELECT actor_id,visitor_id,action INTO v_old
   FROM unipathway_security.visitor_command_receipts
   WHERE tenant_id=p_tenant AND request_id=p_request_id;
  IF v_old.actor_id IS DISTINCT FROM v_actor OR v_old.action<>'checkout' OR v_old.visitor_id<>p_visitor
  THEN RAISE EXCEPTION 'Request identifier used by another visitor/action';END IF;
  SELECT * INTO v_record FROM public.centre_visitors WHERE tenant_id=p_tenant AND id=p_visitor;
  IF NOT FOUND OR v_record.status<>'checked_out' THEN RAISE EXCEPTION 'Visitor checkout receipt incomplete';END IF;
 ELSE
  UPDATE public.centre_visitors
   SET checked_out_at=now(),status='checked_out'
   WHERE id=p_visitor AND tenant_id=p_tenant AND status='in_building'
   RETURNING * INTO v_record;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visitor not checked in to this centre';END IF;
  UPDATE public.centre_occupancy
   SET in_building=false,last_event_at=now(),last_gate_id=btrim(p_gate)
   WHERE tenant_id=p_tenant AND person_key='visitor:'||p_visitor::text AND visitor_id=p_visitor;
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  IF v_updated<>1 THEN RAISE EXCEPTION 'Missing visitor occupancy record';END IF;
  INSERT INTO public.centre_access_events(
    tenant_id,visitor_id,gate_id,direction,decision,security_user_id,occurred_at
  ) VALUES(p_tenant,p_visitor,btrim(p_gate),'out','allowed',v_actor,now());
 END IF;
 RETURN jsonb_build_object('id',v_record.id,'tenant_id',v_record.tenant_id,
   'status',v_record.status,'pass_number',v_record.pass_number);
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_security.checkout_visitor_impl(uuid,uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.checkout_visitor_impl(uuid,uuid,text,uuid) TO authenticated;

-- Exposed wrappers are security-invoker only. Private SECURITY DEFINER functions
-- re-check real, centre-scoped database membership and do not accept role claims from the browser.
CREATE OR REPLACE FUNCTION public.unipathway_register_centre_visitor(
 p_tenant uuid,p_name text,p_purpose text,p_gate text,p_id_attested boolean,p_request_id uuid
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.register_visitor_impl(p_tenant,p_name,p_purpose,p_gate,p_id_attested,p_request_id) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_register_centre_visitor(uuid,text,text,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_register_centre_visitor(uuid,text,text,text,boolean,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.unipathway_checkout_centre_visitor(
 p_tenant uuid,p_visitor uuid,p_gate text,p_request_id uuid
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.checkout_visitor_impl(p_tenant,p_visitor,p_gate,p_request_id) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_checkout_centre_visitor(uuid,uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_checkout_centre_visitor(uuid,uuid,text,uuid) TO authenticated;
COMMIT;
