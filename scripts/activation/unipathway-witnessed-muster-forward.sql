-- Install only after accepted site operations. Recorded roll-call, never a physical safety control.
CREATE SCHEMA unipathway_muster;
REVOKE ALL ON SCHEMA unipathway_muster FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_muster TO authenticated;
CREATE TABLE unipathway_muster.gate(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),writes_enabled boolean NOT NULL DEFAULT false);
INSERT INTO unipathway_muster.gate DEFAULT VALUES;
CREATE TABLE unipathway_muster.incidents(
 id uuid PRIMARY KEY REFERENCES public.emergency_muster_events(id),tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 event_type text NOT NULL CHECK(event_type IN ('drill','reported_emergency')),
 incident_reference text NOT NULL CHECK(length(btrim(incident_reference)) BETWEEN 5 AND 200),
 started_by uuid NOT NULL,started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 closed_by uuid,closed_at timestamptz,closure_note text,unresolved_at_close integer,
 CHECK((closed_at IS NULL AND closed_by IS NULL AND closure_note IS NULL AND unresolved_at_close IS NULL) OR
 (closed_at IS NOT NULL AND closed_by IS NOT NULL AND closed_by<>started_by AND length(btrim(closure_note)) BETWEEN 5 AND 500 AND unresolved_at_close>=0))
);
CREATE TABLE unipathway_muster.people(
 id uuid PRIMARY KEY REFERENCES public.emergency_muster_status(id),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),incident_id uuid NOT NULL REFERENCES unipathway_muster.incidents(id),
 label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 300),
 person_type text NOT NULL CHECK(person_type IN ('student','staff','contractor','visitor','other')),
 status text NOT NULL DEFAULT 'unaccounted' CHECK(status IN ('unaccounted','safe')),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 observed_at timestamptz,observed_by uuid,point text,
 CHECK((revision=0 AND observed_at IS NULL AND observed_by IS NULL AND point IS NULL) OR (revision>0 AND observed_at IS NOT NULL AND observed_by IS NOT NULL)),
 CHECK(status<>'safe' OR length(btrim(point)) BETWEEN 2 AND 160)
);
CREATE TABLE unipathway_muster.audit(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,incident_id uuid NOT NULL REFERENCES unipathway_muster.incidents(id),
 person_id uuid REFERENCES unipathway_muster.people(id),
 action text NOT NULL CHECK(action IN ('started','confirmed_safe','corrected_unaccounted','closed')),
 actor_id uuid NOT NULL,note text NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX muster_people_by_event ON unipathway_muster.people(tenant_id,incident_id,id);
CREATE INDEX muster_audit_by_event ON unipathway_muster.audit(tenant_id,incident_id,recorded_at DESC,id);
ALTER TABLE unipathway_muster.gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_muster.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_muster.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_muster.audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_muster FROM PUBLIC,anon,authenticated;
CREATE FUNCTION unipathway_muster.actor(t uuid,kind text,writing boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;
BEGIN
 a:=unipathway_site_ops.actor(t,kind,writing);
 IF writing AND NOT EXISTS(SELECT 1 FROM unipathway_muster.gate WHERE singleton AND writes_enabled) THEN RAISE EXCEPTION 'Muster writes not activated' USING ERRCODE='55000'; END IF;
 RETURN a;
END $fn$;
CREATE FUNCTION unipathway_muster.read_event(t uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;e unipathway_muster.incidents%ROWTYPE; n integer; people jsonb:='[]'::jsonb;history jsonb:='[]'::jsonb; audit_rows jsonb:='[]'::jsonb; manager boolean;officer boolean;writable boolean;
BEGIN
 a:=unipathway_muster.actor(t,'read');
 manager:=EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=a AND ((r.role::text='centre_director' AND r.tenant_id=t) OR (r.role::text='superadmin' AND r.tenant_id IS NULL)));
 officer:=EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id WHERE p.user_id=a AND p.tenant_id=t AND r.role::text='security_officer');
 writable:=EXISTS(SELECT 1 FROM unipathway_muster.gate WHERE singleton AND writes_enabled) AND EXISTS(SELECT 1 FROM unipathway_site_ops.gate WHERE singleton AND writes_enabled);
 SELECT count(*) INTO n FROM public.emergency_muster_events v WHERE v.tenant_id=t AND v.status='active';
 IF n>1 THEN RAISE EXCEPTION 'Multiple recorded incidents; reconcile with responsible official'; END IF;
 IF n=1 THEN
  SELECT i.* INTO e FROM unipathway_muster.incidents i JOIN public.emergency_muster_events v ON v.id=i.id AND v.tenant_id=i.tenant_id WHERE i.tenant_id=t AND v.status='active' AND i.closed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Existing incident is outside witnessed workflow; reconcile'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.label,q.id),'[]'::jsonb) INTO people FROM(
   SELECT p.id,p.tenant_id,p.incident_id,p.label,p.person_type,p.status,p.revision,p.observed_at,p.point FROM unipathway_muster.people p WHERE p.tenant_id=t AND p.incident_id=e.id ORDER BY p.id LIMIT 501
  ) q;
  IF jsonb_array_length(people)>500 THEN RAISE EXCEPTION 'Recorded roll-call exceeds verified review limit'; END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.closed_at DESC,q.id),'[]'::jsonb) INTO history FROM(
  SELECT i.id,i.tenant_id,i.event_type,i.incident_reference,i.started_at,i.closed_at,i.unresolved_at_close,i.closure_note FROM unipathway_muster.incidents i WHERE i.tenant_id=t AND i.closed_at IS NOT NULL ORDER BY i.closed_at DESC,i.id LIMIT 10
 ) q;
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.recorded_at DESC,q.id),'[]'::jsonb) INTO audit_rows FROM(
  SELECT h.id,h.tenant_id,h.incident_id,h.person_id,h.action,h.actor_id,h.note,h.recorded_at FROM unipathway_muster.audit h WHERE h.tenant_id=t ORDER BY h.recorded_at DESC,h.id LIMIT 100
 ) q;
 RETURN jsonb_build_object('tenant_id',t,'manager',manager,'officer',officer,'writes_enabled',writable,
 'incident',CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object('id',e.id,'tenant_id',t,'event_type',e.event_type,'incident_reference',e.incident_reference,'started_by',e.started_by,'started_at',e.started_at) END,'people',people,'history',history,'audit',audit_rows);
END $fn$;
CREATE FUNCTION unipathway_muster.start_event(t uuid,r uuid,k text,ref text,reported boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;prior jsonb;receipt jsonb;cnt integer;stamp timestamptz:=clock_timestamp();
BEGIN
 a:=unipathway_muster.actor(t,'officer',true);
 IF reported IS DISTINCT FROM true OR k IS NULL OR k NOT IN ('drill','reported_emergency') OR length(btrim(coalesce(ref,''))) NOT BETWEEN 5 AND 200 THEN RAISE EXCEPTION 'Incident type and reference required'; END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(k,btrim(ref),reported));prior:=unipathway_site_ops.prior(t,r,a,'muster_start',h);IF prior IS NOT NULL THEN RETURN prior;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('muster-centre:'||t::text,0));
 IF EXISTS(SELECT 1 FROM public.emergency_muster_events WHERE tenant_id=t AND status='active') THEN RAISE EXCEPTION 'An active recorded incident already exists';END IF;
 -- Freeze only the recorded occupancy snapshot. Never assert completeness or trigger an alarm.
 INSERT INTO public.emergency_muster_events(id,tenant_id,event_type,started_by,started_at,status) VALUES(r,t,k,a,stamp,'active');
 INSERT INTO unipathway_muster.incidents(id,tenant_id,event_type,incident_reference,started_by,started_at) VALUES(r,t,k,btrim(ref),a,stamp);
 WITH occupants AS MATERIALIZED(
  SELECT o.person_key,CASE WHEN o.person_type IN ('student','staff','contractor','visitor') THEN o.person_type ELSE 'other' END AS kind,
   left(coalesce(nullif(btrim(v.full_name),''),nullif(btrim(p.full_name),''),'Unmatched recorded occupant'),300) AS label
  FROM public.centre_occupancy o LEFT JOIN public.centre_visitors v ON v.id=o.visitor_id AND v.tenant_id=o.tenant_id
  LEFT JOIN public.profiles p ON p.user_id=o.user_id AND p.tenant_id=o.tenant_id
  WHERE o.tenant_id=t AND o.in_building=true ORDER BY o.person_key LIMIT 501
 ), inserted AS (
  INSERT INTO public.emergency_muster_status(tenant_id,muster_event_id,person_key,person_type,expected_inside,status)
  SELECT t,r,o.person_key,o.kind,true,'unaccounted' FROM occupants o RETURNING id,person_key
 )
 INSERT INTO unipathway_muster.people(id,tenant_id,incident_id,label,person_type) SELECT i.id,t,r,o.label,o.kind FROM inserted i JOIN occupants o ON o.person_key=i.person_key;
 GET DIAGNOSTICS cnt=ROW_COUNT;
 IF cnt>500 THEN RAISE EXCEPTION 'Recorded roll-call exceeds verified review limit; use physical procedure';END IF;
 INSERT INTO unipathway_muster.audit(id,tenant_id,incident_id,action,actor_id,note) VALUES(r,t,r,'started',a,btrim(ref));
 receipt:=jsonb_build_object('id',r,'tenant_id',t,'incident_id',r,'action','started','snapshot_count',cnt);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'muster_start',h,receipt);
 RETURN receipt;
END $fn$;
CREATE FUNCTION unipathway_muster.observe(t uuid,r uuid,e uuid,p uuid,expected integer,decision text,p_point text,note text,witnessed boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;prior jsonb;receipt jsonb;rowdata unipathway_muster.people%ROWTYPE;
BEGIN
 a:=unipathway_muster.actor(t,'officer',true);
 IF e IS NULL OR p IS NULL OR expected IS NULL OR expected<0 OR decision IS NULL OR decision NOT IN ('safe','unaccounted') OR witnessed IS DISTINCT FROM true
 OR length(btrim(coalesce(note,''))) NOT BETWEEN 5 AND 500 OR (decision='safe' AND length(btrim(coalesce(p_point,''))) NOT BETWEEN 2 AND 160) OR (decision='unaccounted' AND p_point IS NOT NULL) THEN RAISE EXCEPTION 'Witnessed roll-call or correction evidence required';END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(e,p,expected,decision,btrim(p_point),btrim(note),witnessed));prior:=unipathway_site_ops.prior(t,r,a,'muster_observe',h);IF prior IS NOT NULL THEN RETURN prior;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('muster-centre:'||t::text,0));
 IF NOT EXISTS(SELECT 1 FROM unipathway_muster.incidents i JOIN public.emergency_muster_events v ON v.id=i.id AND v.tenant_id=i.tenant_id WHERE i.id=e AND i.tenant_id=t AND i.closed_at IS NULL AND v.status='active') THEN RAISE EXCEPTION 'Active witnessed incident required';END IF;
 UPDATE unipathway_muster.people SET status=decision,revision=revision+1,observed_at=clock_timestamp(),observed_by=a,point=btrim(p_point)
 WHERE id=p AND tenant_id=t AND incident_id=e AND revision=expected AND status<>decision AND label<>'Unmatched recorded occupant' RETURNING * INTO rowdata;
 IF NOT FOUND THEN RAISE EXCEPTION 'Roll-call record changed or already marked; refresh';END IF;
 UPDATE public.emergency_muster_status SET status=decision,confirmed_by=a,confirmed_at=rowdata.observed_at,muster_point=rowdata.point WHERE id=p AND tenant_id=t AND muster_event_id=e;
 IF NOT FOUND THEN RAISE EXCEPTION 'Underlying muster record missing';END IF;
 INSERT INTO unipathway_muster.audit(id,tenant_id,incident_id,person_id,action,actor_id,note) VALUES(r,t,e,p,CASE WHEN decision='safe' THEN 'confirmed_safe' ELSE 'corrected_unaccounted' END,a,btrim(note));
 receipt:=jsonb_build_object('id',r,'tenant_id',t,'incident_id',e,'person_id',p,'status',decision,'revision',rowdata.revision);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'muster_observe',h,receipt);RETURN receipt;
END $fn$;
CREATE FUNCTION unipathway_muster.close_event(t uuid,r uuid,e uuid,expected_unresolved integer,note text,authorised boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE a uuid;h text;prior jsonb;receipt jsonb;cnt integer;stamp timestamptz:=clock_timestamp();
BEGIN
 a:=unipathway_muster.actor(t,'manager',true);
 IF e IS NULL OR expected_unresolved IS NULL OR expected_unresolved<0 OR authorised IS DISTINCT FROM true OR length(btrim(coalesce(note,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Independent incident closure reference required';END IF;
 h:=unipathway_site_ops.fingerprint(jsonb_build_array(e,expected_unresolved,btrim(note),authorised));prior:=unipathway_site_ops.prior(t,r,a,'muster_close',h);IF prior IS NOT NULL THEN RETURN prior;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('muster-centre:'||t::text,0));
 SELECT count(*) INTO cnt FROM unipathway_muster.people WHERE tenant_id=t AND incident_id=e AND status<>'safe';
 IF cnt<>expected_unresolved THEN RAISE EXCEPTION 'Recorded accountability changed; refresh';END IF;
 UPDATE unipathway_muster.incidents SET closed_by=a,closed_at=stamp,closure_note=btrim(note),unresolved_at_close=cnt WHERE id=e AND tenant_id=t AND closed_at IS NULL AND started_by<>a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Independent centre leadership closure required';END IF;
 UPDATE public.emergency_muster_events SET status='closed',ended_at=stamp WHERE id=e AND tenant_id=t AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Underlying active incident missing';END IF;
 INSERT INTO unipathway_muster.audit(id,tenant_id,incident_id,action,actor_id,note) VALUES(r,t,e,'closed',a,btrim(note));
 receipt:=jsonb_build_object('id',r,'tenant_id',t,'incident_id',e,'action','closed','unresolved_at_close',cnt);
 INSERT INTO unipathway_site_ops.receipts(tenant_id,request_id,actor_id,action,digest,result) VALUES(t,r,a,'muster_close',h,receipt);RETURN receipt;
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_muster FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_muster.read_event(uuid),unipathway_muster.start_event(uuid,uuid,text,text,boolean),unipathway_muster.observe(uuid,uuid,uuid,uuid,integer,text,text,text,boolean),unipathway_muster.close_event(uuid,uuid,uuid,integer,text,boolean) TO authenticated;
CREATE FUNCTION public.get_unipathway_witnessed_muster(p_tenant uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_muster.read_event(p_tenant) $fn$;
CREATE FUNCTION public.start_unipathway_witnessed_muster(p_tenant uuid,p_request uuid,p_kind text,p_reference text,p_reported boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_muster.start_event(p_tenant,p_request,p_kind,p_reference,p_reported) $fn$;
CREATE FUNCTION public.observe_unipathway_witnessed_muster(p_tenant uuid,p_request uuid,p_event uuid,p_person uuid,p_revision integer,p_status text,p_point text,p_note text,p_witnessed boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_muster.observe(p_tenant,p_request,p_event,p_person,p_revision,p_status,p_point,p_note,p_witnessed) $fn$;
CREATE FUNCTION public.close_unipathway_witnessed_muster(p_tenant uuid,p_request uuid,p_event uuid,p_unresolved integer,p_note text,p_authorised boolean) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$ SELECT unipathway_muster.close_event(p_tenant,p_request,p_event,p_unresolved,p_note,p_authorised) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_witnessed_muster(uuid),public.start_unipathway_witnessed_muster(uuid,uuid,text,text,boolean),public.observe_unipathway_witnessed_muster(uuid,uuid,uuid,uuid,integer,text,text,text,boolean),public.close_unipathway_witnessed_muster(uuid,uuid,uuid,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_witnessed_muster(uuid),public.start_unipathway_witnessed_muster(uuid,uuid,text,text,boolean),public.observe_unipathway_witnessed_muster(uuid,uuid,uuid,uuid,integer,text,text,text,boolean),public.close_unipathway_witnessed_muster(uuid,uuid,uuid,integer,text,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
