-- Forward candidate: install after the physical operations base, in a reviewed transaction.
-- Never control a lock, fire panel or emergency exit from this application.
CREATE SCHEMA unipathway_site_ops;
REVOKE ALL ON SCHEMA unipathway_site_ops FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_site_ops TO authenticated;
CREATE TABLE unipathway_site_ops.gate(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),writes_enabled boolean NOT NULL DEFAULT false);
INSERT INTO unipathway_site_ops.gate DEFAULT VALUES;
CREATE TABLE unipathway_site_ops.receipts(tenant_id uuid NOT NULL,request_id uuid NOT NULL,actor_id uuid NOT NULL,action text NOT NULL,digest text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(tenant_id,request_id));
CREATE TABLE unipathway_site_ops.visitor_signatures(tenant_id uuid NOT NULL,visitor_id uuid PRIMARY KEY REFERENCES public.centre_visitors(id),kind text NOT NULL CHECK(kind IN ('visitor','guest')),host_reference text NOT NULL,typed_name text NOT NULL,notice_version text NOT NULL,attested_by uuid NOT NULL,signed_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE unipathway_site_ops.card_changes(id uuid PRIMARY KEY,tenant_id uuid NOT NULL,credential_id uuid NOT NULL REFERENCES public.centre_access_credentials(id),action text NOT NULL CHECK(action IN ('registered','revoked')),actor_id uuid NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE unipathway_site_ops.facility_checks(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,asset_id uuid NOT NULL,previous_id uuid,
 asset_code text NOT NULL CHECK(length(btrim(asset_code)) BETWEEN 2 AND 80),
 asset_type text NOT NULL CHECK(asset_type IN ('entrance','fire_exit','fire_extinguisher','alarm_call_point','fire_panel','assembly_point','emergency_light','fire_door','first_aid')),
 floor_label text NOT NULL CHECK(length(btrim(floor_label)) BETWEEN 1 AND 100),
 location_label text NOT NULL CHECK(length(btrim(location_label)) BETWEEN 2 AND 200),
 plan_reference text NOT NULL CHECK(length(btrim(plan_reference)) BETWEEN 2 AND 200),
 x integer CHECK(x BETWEEN 0 AND 100),y integer CHECK(y BETWEEN 0 AND 100),
 condition text NOT NULL CHECK(condition IN ('not_checked','observed_ok','attention_required','out_of_service')),
 next_review date,note text NOT NULL CHECK(length(btrim(note)) BETWEEN 5 AND 500),
 recorded_by uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((x IS NULL)=(y IS NULL))
);
CREATE INDEX facility_check_history ON unipathway_site_ops.facility_checks(tenant_id,asset_id,recorded_at DESC,id DESC);
ALTER TABLE unipathway_site_ops.gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_site_ops.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_site_ops.visitor_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_site_ops.card_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_site_ops.facility_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_site_ops FROM PUBLIC,anon,authenticated;

-- Explicit selected-centre profile required even for a global owner. No cross-centre wildcard.
CREATE OR REPLACE FUNCTION unipathway_security.verified_reader(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM unipathway_security.activation_gate a WHERE a.singleton AND a.physical_reads_enabled)
 AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=p_tenant AND t.status::text='active')
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid() AND p.tenant_id=p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND ((r.tenant_id=p_tenant AND r.role::text IN ('security_officer','centre_director')) OR (r.tenant_id IS NULL AND r.role::text='superadmin')))
$fn$;
CREATE FUNCTION unipathway_site_ops.actor(t uuid,kind text,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NOT unipathway_security.verified_reader(t) OR kind IS NULL OR kind NOT IN ('read','manager','officer') THEN RAISE EXCEPTION 'Verified selected-centre security membership required' USING ERRCODE='42501'; END IF;
 IF kind='manager' AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND ((r.role::text='centre_director' AND r.tenant_id=t) OR (r.role::text='superadmin' AND r.tenant_id IS NULL))) THEN RAISE EXCEPTION 'Centre director or selected-centre owner required' USING ERRCODE='42501'; END IF;
 IF kind='officer' AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text='security_officer') THEN RAISE EXCEPTION 'Assigned security officer required' USING ERRCODE='42501'; END IF;
 IF p_write AND NOT EXISTS(SELECT 1 FROM unipathway_site_ops.gate g WHERE g.singleton AND g.writes_enabled) THEN RAISE EXCEPTION 'Site operations writes not activated' USING ERRCODE='55000'; END IF;
 RETURN auth.uid();
END $fn$;
CREATE FUNCTION unipathway_site_ops.fingerprint(p jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $fn$ SELECT encode(sha256(convert_to(p::text,'UTF8')),'hex') $fn$;
CREATE FUNCTION unipathway_site_ops.prior(t uuid,r uuid,a uuid,k text,h text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p unipathway_site_ops.receipts%ROWTYPE;
BEGIN
 IF r IS NULL THEN RAISE EXCEPTION 'Request identity required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('site-request:'||t::text||':'||r::text,0));
 SELECT * INTO p FROM unipathway_site_ops.receipts WHERE tenant_id=t AND request_id=r;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF ROW(p.actor_id,p.action,p.digest) IS DISTINCT FROM ROW(a,k,h) THEN RAISE EXCEPTION 'Request differs from recorded action'; END IF;
 RETURN p.result;
END $fn$;
CREATE FUNCTION unipathway_site_ops.person_kind(t uuid,u uuid) RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=u AND p.tenant_id=t) THEN NULL
 WHEN EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u AND r.tenant_id=t AND r.role::text IN ('centre_director','security_officer','lecturer','office_admin','hr_officer','secretary','admissions_admin','finance_officer','exams_officer','programme_leader','assessor','iqa_officer','welfare_officer','marketing_officer')) THEN 'staff'
 WHEN EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u AND r.tenant_id=t AND r.role::text='student') AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.tenant_id=t AND e.student_id=u AND e.status='active') THEN 'student' END
$fn$;
CREATE FUNCTION unipathway_site_ops.read_site(t uuid,k text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor_id uuid; data jsonb; roster jsonb:='[]'::jsonb; manager boolean; officer boolean;
BEGIN
 actor_id:=unipathway_site_ops.actor(t,'read');
 manager:=EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=actor_id AND ((r.role::text='centre_director' AND r.tenant_id=t) OR (r.role::text='superadmin' AND r.tenant_id IS NULL)));
 officer:=EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=actor_id AND r.tenant_id=t AND r.role::text='security_officer');
 IF k='facilities' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.floor_label,q.asset_code,q.id),'[]'::jsonb) INTO data FROM(
   SELECT DISTINCT ON(asset_id) id,tenant_id,asset_id,asset_code,asset_type,floor_label,location_label,plan_reference,x,y,condition,next_review,note,recorded_by,recorded_at FROM unipathway_site_ops.facility_checks WHERE tenant_id=t ORDER BY asset_id,recorded_at DESC,id DESC LIMIT 501
  ) q;
 ELSIF k='cards' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.name,q.id),'[]'::jsonb) INTO data FROM(
   SELECT c.id,c.tenant_id,c.holder_user_id,coalesce(nullif(p.full_name,''),'Former holder') AS name,c.holder_type,c.valid_from,c.valid_until,
   CASE WHEN c.status='active' AND (c.valid_until<now() OR c.valid_from>now()) THEN 'expired' WHEN c.status='active' AND unipathway_site_ops.person_kind(t,c.holder_user_id) IS DISTINCT FROM c.holder_type THEN 'eligibility_review' ELSE c.status END AS status
   FROM public.centre_access_credentials c LEFT JOIN public.profiles p ON p.user_id=c.holder_user_id AND p.tenant_id=c.tenant_id WHERE c.tenant_id=t AND c.credential_type='card' ORDER BY c.id LIMIT 501
  ) q;
  IF manager THEN SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.name,q.id),'[]'::jsonb) INTO roster FROM(
   SELECT p.user_id AS id,p.full_name AS name,unipathway_site_ops.person_kind(t,p.user_id) AS kind FROM public.profiles p WHERE p.tenant_id=t AND p.user_id<>actor_id AND unipathway_site_ops.person_kind(t,p.user_id) IS NOT NULL AND length(btrim(p.full_name)) BETWEEN 1 AND 300 ORDER BY p.user_id LIMIT 501
  ) q; END IF;
 ELSIF k='audit' THEN
  -- Deliberately limited recent audit, never a full export or credential hash.
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.event_at DESC,q.id),'[]'::jsonb) INTO data FROM(
   SELECT id,tenant_id,gate_id AS location,direction AS action,decision AS outcome,security_user_id AS actor_id,occurred_at AS event_at FROM public.centre_access_events WHERE tenant_id=t ORDER BY occurred_at DESC,id LIMIT 100
  ) q;
 ELSIF k='visitor_signatures' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.signed_at DESC,q.visitor_id),'[]'::jsonb) INTO data FROM(
   SELECT s.tenant_id,s.visitor_id,s.kind,s.host_reference,s.typed_name,s.notice_version,s.attested_by,s.signed_at,v.pass_number,v.status FROM unipathway_site_ops.visitor_signatures s JOIN public.centre_visitors v ON v.id=s.visitor_id AND v.tenant_id=s.tenant_id WHERE s.tenant_id=t ORDER BY s.signed_at DESC,s.visitor_id LIMIT 100
  ) q;
 ELSIF k='cctv_audit' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC,q.id),'[]'::jsonb) INTO data FROM(
   SELECT a.id,a.tenant_id,a.camera_id,c.name AS camera_name,a.user_id,a.mode,a.created_at FROM public.cctv_access_events a JOIN public.unipathway_cctv_cameras c ON c.id=a.camera_id AND c.tenant_id=a.tenant_id WHERE a.tenant_id=t AND (manager OR a.user_id=actor_id) ORDER BY a.created_at DESC,a.id LIMIT 100
  ) q;
 ELSE RAISE EXCEPTION 'Unknown site dataset'; END IF;
 IF jsonb_array_length(data)>500 OR jsonb_array_length(roster)>500 THEN RAISE EXCEPTION 'Site dataset exceeds bounded report limit'; END IF;
 RETURN jsonb_build_object('tenant_id',t,'kind',k,'rows',data,'roster',roster,'manager',manager,'officer',officer,'writes_enabled',(SELECT writes_enabled FROM unipathway_site_ops.gate WHERE singleton));
END $fn$;
CREATE FUNCTION unipathway_site_ops.signed_visit(t uuid,r uuid,p_name text,p_purpose text,p_gate text,p_kind text,p_host text,p_signature text,p_accept boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid; h text; old jsonb; result jsonb;
BEGIN
 a:=unipathway_site_ops.actor(t,'officer',true);
 IF NOT unipathway_security.verified_officer(t) OR p_accept IS DISTINCT FROM true OR p_kind IS NULL OR p_kind NOT IN ('visitor','guest') OR length(btrim(coalesce(p_host,''))) NOT BETWEEN 2 AND 120 OR length(btrim(coalesce(p_signature,''))) NOT BETWEEN 2 AND 120 OR lower(btrim(p_signature)) IS DISTINCT FROM lower(btrim(p_name)) THEN RAISE EXCEPTION 'Signed visitor acknowledgement and host required'; END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(btrim(p_name),btrim(p_purpose),btrim(p_gate),p_kind,btrim(p_host),btrim(p_signature),p_accept));
 old:=unipathway_site_ops.prior(t,r,a,'signed_visit',h);IF old IS NOT NULL THEN RETURN old; END IF;
 IF EXISTS(SELECT 1 FROM unipathway_security.visitor_command_receipts WHERE tenant_id=t AND request_id=r) THEN RAISE EXCEPTION 'Existing legacy visitor request'; END IF;
 result:=unipathway_security.register_visitor_impl(t,p_name,p_purpose,p_gate,true,r);
 INSERT INTO unipathway_site_ops.visitor_signatures VALUES(t,(result->>'id')::uuid,p_kind,btrim(p_host),btrim(p_signature),'reception-acknowledgement-v1',a,clock_timestamp());
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'signed_visit',h,result);
 RETURN result;
END $fn$;
-- Reuse existing atomic visitor checkout. Enforce the new signature path on entry.
REVOKE ALL ON FUNCTION public.unipathway_register_centre_visitor(uuid,text,text,text,boolean,uuid),unipathway_security.register_visitor_impl(uuid,text,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_site_ops.register_card(t uuid,r uuid,u uuid,p_ref text,p_until date,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;k text;h text;old jsonb;result jsonb;c uuid;today date;token text;
BEGIN
 a:=unipathway_site_ops.actor(t,'manager',true);today:=(now() AT TIME ZONE 'Asia/Karachi')::date;
 IF u IS NULL OR u=a OR p_ref IS NULL OR p_ref!~'^[A-Za-z0-9_-]{8,100}$' OR p_until IS NULL OR p_until<today OR p_until>today+366 OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Reviewed holder, reader reference, expiry and reason required'; END IF;
 token:=unipathway_site_ops.fingerprint(to_jsonb(p_ref));h:=unipathway_site_ops.fingerprint(jsonb_build_array(u,token,p_until,btrim(p_note)));
 old:=unipathway_site_ops.prior(t,r,a,'register_card',h);IF old IS NOT NULL THEN RETURN old; END IF;
 k:=unipathway_site_ops.person_kind(t,u);IF k IS NULL THEN RAISE EXCEPTION 'Eligible centre holder required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('holder-card:'||t::text||':'||u::text,0));
 IF EXISTS(SELECT 1 FROM public.centre_access_credentials WHERE tenant_id=t AND holder_user_id=u AND credential_type='card' AND status='active' AND (valid_until IS NULL OR valid_until>=now())) THEN RAISE EXCEPTION 'An active card exists; revoke it first'; END IF;
 INSERT INTO public.centre_access_credentials(tenant_id,holder_user_id,holder_type,credential_type,credential_reference_hash,valid_until,status)
 VALUES(t,u,k,'card',token,(p_until+1)::timestamp AT TIME ZONE 'Asia/Karachi','active') RETURNING id INTO c;
 INSERT INTO unipathway_site_ops.card_changes VALUES(r,t,c,'registered',a,btrim(p_note),clock_timestamp());
 result:=jsonb_build_object('tenant_id',t,'id',c,'status','active','holder_user_id',u);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'register_card',h,result);RETURN result;
END $fn$;
CREATE FUNCTION unipathway_site_ops.revoke_card(t uuid,r uuid,c uuid,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;old jsonb;result jsonb;u uuid;
BEGIN
 a:=unipathway_site_ops.actor(t,'manager',true);IF c IS NULL OR length(btrim(coalesce(p_note,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Revocation reason required'; END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(c,btrim(p_note)));old:=unipathway_site_ops.prior(t,r,a,'revoke_card',h);IF old IS NOT NULL THEN RETURN old; END IF;
 UPDATE public.centre_access_credentials SET status='revoked' WHERE id=c AND tenant_id=t AND credential_type='card' AND holder_user_id<>a AND status<>'revoked' RETURNING holder_user_id INTO u;
 IF NOT FOUND THEN RAISE EXCEPTION 'Eligible card unavailable'; END IF;
 INSERT INTO unipathway_site_ops.card_changes VALUES(r,t,c,'revoked',a,btrim(p_note),clock_timestamp());
 result:=jsonb_build_object('tenant_id',t,'id',c,'status','revoked','holder_user_id',u);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'revoke_card',h,result);RETURN result;
END $fn$;
CREATE FUNCTION unipathway_site_ops.observe_card(t uuid,r uuid,p_ref text,p_gate text,p_direction text,p_observed boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;old jsonb;result jsonb;c public.centre_access_credentials%ROWTYPE;eid uuid;decision text;stamp timestamptz:=clock_timestamp();
BEGIN
 a:=unipathway_site_ops.actor(t,'officer',true);
 IF p_ref IS NULL OR p_ref!~'^[A-Za-z0-9_-]{8,100}$' OR p_direction IS NULL OR p_direction NOT IN ('in','out') OR p_observed IS DISTINCT FROM true OR length(btrim(coalesce(p_gate,''))) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Observed crossing, reader reference and gate required'; END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(unipathway_site_ops.fingerprint(to_jsonb(p_ref)),btrim(p_gate),p_direction,p_observed));old:=unipathway_site_ops.prior(t,r,a,'observe_card',h);IF old IS NOT NULL THEN RETURN old; END IF;
 SELECT * INTO c FROM public.centre_access_credentials WHERE tenant_id=t AND credential_type='card' AND credential_reference_hash=unipathway_site_ops.fingerprint(to_jsonb(p_ref)) FOR SHARE;
 decision:=CASE WHEN c.id IS NOT NULL AND c.status='active' AND c.valid_from<=stamp AND (c.valid_until IS NULL OR c.valid_until>stamp) AND unipathway_site_ops.person_kind(t,c.holder_user_id)=c.holder_type THEN 'allowed' ELSE 'denied' END;
 -- A denial means an unmatched/ineligible record, NEVER a command to block physical egress.
 INSERT INTO public.centre_access_events(tenant_id,credential_id,gate_id,direction,decision,reason,security_user_id,occurred_at,metadata)
 VALUES(t,c.id,btrim(p_gate),p_direction,decision,'Officer-observed card record; no door command',a,stamp,jsonb_build_object('source','manual_card_observation')) RETURNING id INTO eid;
 IF c.id IS NOT NULL AND c.holder_user_id IS NOT NULL AND (decision='allowed' OR p_direction='out') THEN
  INSERT INTO public.centre_occupancy(tenant_id,person_key,person_type,user_id,in_building,last_event_at,last_gate_id)
  VALUES(t,'user:'||c.holder_user_id::text,c.holder_type,c.holder_user_id,p_direction='in',stamp,btrim(p_gate))
  ON CONFLICT(tenant_id,person_key) DO UPDATE SET in_building=excluded.in_building,last_event_at=excluded.last_event_at,last_gate_id=excluded.last_gate_id WHERE centre_occupancy.last_event_at IS NULL OR centre_occupancy.last_event_at<=excluded.last_event_at;
 END IF;
 result:=jsonb_build_object('tenant_id',t,'id',eid,'direction',p_direction,'decision',decision);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'observe_card',h,result);RETURN result;
END $fn$;
CREATE FUNCTION unipathway_site_ops.facility(t uuid,r uuid,p_asset uuid,p_previous uuid,p_code text,p_type text,p_floor text,p_location text,p_plan text,p_x integer,p_y integer,p_condition text,p_next date,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;old jsonb;result jsonb;last unipathway_site_ops.facility_checks%ROWTYPE;aid uuid;manager boolean;
BEGIN
 a:=unipathway_site_ops.actor(t,'read',true);manager:=EXISTS(SELECT 1 FROM public.user_roles v WHERE v.user_id=a AND ((v.role::text='centre_director' AND v.tenant_id=t) OR (v.role::text='superadmin' AND v.tenant_id IS NULL)));
 IF p_code IS NULL OR p_type IS NULL OR p_floor IS NULL OR p_location IS NULL OR p_plan IS NULL OR p_condition IS NULL OR p_note IS NULL THEN RAISE EXCEPTION 'Surveyed asset details and check note required'; END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(p_asset,p_previous,btrim(p_code),p_type,btrim(p_floor),btrim(p_location),btrim(p_plan),p_x,p_y,p_condition,p_next,btrim(p_note)));
 old:=unipathway_site_ops.prior(t,r,a,'facility',h);IF old IS NOT NULL THEN RETURN old; END IF;
 aid:=coalesce(p_asset,r);
 PERFORM pg_advisory_xact_lock(hashtextextended('facility:'||t::text||':'||aid::text,0));
 SELECT * INTO last FROM unipathway_site_ops.facility_checks WHERE tenant_id=t AND asset_id=aid ORDER BY recorded_at DESC,id DESC LIMIT 1;
 IF p_asset IS NULL THEN
  IF NOT manager OR p_previous IS NOT NULL OR last.id IS NOT NULL THEN RAISE EXCEPTION 'Manager required to register surveyed asset'; END IF;
 ELSE
  IF last.id IS NULL OR last.id IS DISTINCT FROM p_previous THEN RAISE EXCEPTION 'Asset changed; reload before checking'; END IF;
  IF NOT manager AND ROW(last.asset_code,last.asset_type,last.floor_label,last.location_label,last.plan_reference,last.x,last.y) IS DISTINCT FROM ROW(btrim(p_code),p_type,btrim(p_floor),btrim(p_location),btrim(p_plan),p_x,p_y) THEN RAISE EXCEPTION 'Only a manager may change surveyed asset location'; END IF;
 END IF;
 INSERT INTO unipathway_site_ops.facility_checks VALUES(r,t,aid,p_previous,btrim(p_code),p_type,btrim(p_floor),btrim(p_location),btrim(p_plan),p_x,p_y,p_condition,p_next,btrim(p_note),a,clock_timestamp());
 result:=jsonb_build_object('tenant_id',t,'id',r,'asset_id',aid,'condition',p_condition);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'facility',h,result);RETURN result;
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_site_ops FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_site_ops.read_site(uuid,text),unipathway_site_ops.signed_visit(uuid,uuid,text,text,text,text,text,text,boolean),unipathway_site_ops.register_card(uuid,uuid,uuid,text,date,text),unipathway_site_ops.revoke_card(uuid,uuid,uuid,text),unipathway_site_ops.observe_card(uuid,uuid,text,text,text,boolean),unipathway_site_ops.facility(uuid,uuid,uuid,uuid,text,text,text,text,text,integer,integer,text,date,text) TO authenticated;
CREATE FUNCTION public.get_unipathway_site_operations(p_tenant uuid,p_kind text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.read_site(p_tenant,p_kind) $fn$;
CREATE FUNCTION public.sign_unipathway_visitor(p_tenant uuid,p_request uuid,p_name text,p_purpose text,p_gate text,p_kind text,p_host text,p_signature text,p_accept boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.signed_visit(p_tenant,p_request,p_name,p_purpose,p_gate,p_kind,p_host,p_signature,p_accept) $fn$;
CREATE FUNCTION public.register_unipathway_access_card(p_tenant uuid,p_request uuid,p_holder uuid,p_reference text,p_until date,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.register_card(p_tenant,p_request,p_holder,p_reference,p_until,p_note) $fn$;
CREATE FUNCTION public.revoke_unipathway_access_card(p_tenant uuid,p_request uuid,p_card uuid,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.revoke_card(p_tenant,p_request,p_card,p_note) $fn$;
CREATE FUNCTION public.observe_unipathway_access_card(p_tenant uuid,p_request uuid,p_reference text,p_gate text,p_direction text,p_observed boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.observe_card(p_tenant,p_request,p_reference,p_gate,p_direction,p_observed) $fn$;
CREATE FUNCTION public.record_unipathway_facility_check(p_tenant uuid,p_request uuid,p_asset uuid,p_previous uuid,p_code text,p_type text,p_floor text,p_location text,p_plan text,p_x integer,p_y integer,p_condition text,p_next date,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_site_ops.facility(p_tenant,p_request,p_asset,p_previous,p_code,p_type,p_floor,p_location,p_plan,p_x,p_y,p_condition,p_next,p_note) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_site_operations(uuid,text),public.sign_unipathway_visitor(uuid,uuid,text,text,text,text,text,text,boolean),public.register_unipathway_access_card(uuid,uuid,uuid,text,date,text),public.revoke_unipathway_access_card(uuid,uuid,uuid,text),public.observe_unipathway_access_card(uuid,uuid,text,text,text,boolean),public.record_unipathway_facility_check(uuid,uuid,uuid,uuid,text,text,text,text,text,integer,integer,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_site_operations(uuid,text),public.sign_unipathway_visitor(uuid,uuid,text,text,text,text,text,text,boolean),public.register_unipathway_access_card(uuid,uuid,uuid,text,date,text),public.revoke_unipathway_access_card(uuid,uuid,uuid,text),public.observe_unipathway_access_card(uuid,uuid,text,text,text,boolean),public.record_unipathway_facility_check(uuid,uuid,uuid,uuid,text,text,text,text,text,integer,integer,text,date,text) TO authenticated;
NOTIFY pgrst,'reload schema';
