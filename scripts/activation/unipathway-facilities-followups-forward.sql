-- Fourth facilities forward patch; requires the three reviewed register patches.
-- Default off. Never apply to unrelated projects. No live activation or seeded records.
BEGIN;
CREATE TABLE unipathway_security.facilities_followup_activation(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_security.facilities_followup_activation(singleton) VALUES(true);
CREATE TABLE unipathway_security.facilities_followups(
 tenant_id uuid NOT NULL,
 id uuid NOT NULL,
 asset_id uuid NOT NULL,
 inspection_id uuid NOT NULL REFERENCES public.unipathway_facilities_inspections(id),
 task text NOT NULL CHECK(length(btrim(task)) BETWEEN 1 AND 1000),
 team text NOT NULL CHECK(team IN ('facilities','centre_management','security','maintenance_contractor')),
 target_date date NOT NULL,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,asset_id) REFERENCES public.unipathway_facilities_assets(tenant_id,id)
);
CREATE TABLE unipathway_security.facilities_followup_resolutions(
 tenant_id uuid NOT NULL,
 action_id uuid NOT NULL,
 request_id uuid NOT NULL,
 evidence text NOT NULL CHECK(length(btrim(evidence)) BETWEEN 1 AND 2000),
 recorded_by uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,action_id),
 UNIQUE(tenant_id,request_id),
 FOREIGN KEY(tenant_id,action_id) REFERENCES unipathway_security.facilities_followups(tenant_id,id)
);
ALTER TABLE unipathway_security.facilities_followup_activation ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_security.facilities_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_security.facilities_followup_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_security.facilities_followup_activation,unipathway_security.facilities_followups,unipathway_security.facilities_followup_resolutions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_security.facilities_followup_reader(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$ SELECT coalesce(unipathway_security.facilities_reader(p_tenant),false)
 AND EXISTS(SELECT 1 FROM unipathway_security.facilities_followup_activation WHERE singleton AND enabled) $fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_followup_reader(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_security.facilities_followups_read_impl(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_rows jsonb;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT unipathway_security.facilities_followup_reader(p_tenant)
 THEN RAISE EXCEPTION 'Verified centre follow-up access required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.target_date,r.id),'[]'::jsonb) INTO v_rows FROM (
 SELECT f.id,f.tenant_id,f.asset_id,f.inspection_id,f.task,f.team,f.target_date,f.created_at,
 c.evidence AS resolution_evidence,c.recorded_at AS resolved_at
 FROM unipathway_security.facilities_followups f
 LEFT JOIN unipathway_security.facilities_followup_resolutions c ON c.tenant_id=f.tenant_id AND c.action_id=f.id
 WHERE f.tenant_id=p_tenant ORDER BY f.target_date,f.id LIMIT 501
 ) r;
 IF jsonb_array_length(v_rows)>500 THEN RAISE EXCEPTION 'Follow-up register exceeds verified snapshot capacity'; END IF;
 RETURN v_rows;
END;
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_followups_read_impl(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.facilities_followups_read_impl(uuid) TO authenticated;
CREATE FUNCTION public.get_unipathway_facilities_followups(p_tenant uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.facilities_followups_read_impl(p_tenant) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_facilities_followups(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_facilities_followups(uuid) TO authenticated;

CREATE FUNCTION unipathway_security.facilities_followup_write_impl(p_tenant uuid,p_request uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE actor uuid:=(SELECT auth.uid()); v_asset uuid; v_inspection uuid; v_action uuid; v_team text; v_task text; v_due date; v_evidence text; prior record;
BEGIN
 IF actor IS NULL OR NOT unipathway_security.facilities_followup_reader(p_tenant)
 OR NOT coalesce(unipathway_security.facilities_writer(p_tenant),false)
 OR NOT EXISTS(SELECT 1 FROM unipathway_security.facilities_write_activation WHERE singleton AND enabled)
 THEN RAISE EXCEPTION 'Verified director and follow-up write gates required' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_kind IS NULL OR p_kind NOT IN ('open','resolve') OR p_payload IS NULL
 OR jsonb_typeof(p_payload)<>'object' OR length(p_payload::text)>12000
 THEN RAISE EXCEPTION 'Invalid follow-up command' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.tenants WHERE id=p_tenant AND status::text='active' FOR UPDATE;
 IF NOT FOUND OR NOT unipathway_security.facilities_followup_reader(p_tenant)
 OR NOT coalesce(unipathway_security.facilities_writer(p_tenant),false)
 OR NOT EXISTS(SELECT 1 FROM unipathway_security.facilities_write_activation WHERE singleton AND enabled)
 THEN RAISE EXCEPTION 'Active director and gates required' USING ERRCODE='42501'; END IF;
 IF p_kind='open' THEN
  IF NOT (p_payload ?& ARRAY['asset_id','inspection_id','task','team','target_date'])
  OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>5
  OR EXISTS(SELECT 1 FROM jsonb_each(p_payload) AS e WHERE jsonb_typeof(e.value)<>'string')
  THEN RAISE EXCEPTION 'Invalid follow-up fields' USING ERRCODE='22023'; END IF;
  v_asset:=(p_payload->>'asset_id')::uuid;v_inspection:=(p_payload->>'inspection_id')::uuid;
  v_task:=btrim(p_payload->>'task');v_team:=p_payload->>'team';
  IF length(v_task) NOT BETWEEN 1 AND 1000 OR v_team NOT IN ('facilities','centre_management','security','maintenance_contractor')
  OR (p_payload->>'target_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  THEN RAISE EXCEPTION 'Invalid follow-up details' USING ERRCODE='22023'; END IF;
  v_due:=(p_payload->>'target_date')::date;
  IF to_char(v_due,'YYYY-MM-DD')<>p_payload->>'target_date' THEN RAISE EXCEPTION 'Invalid target date' USING ERRCODE='22023'; END IF;
  SELECT * INTO prior FROM unipathway_security.facilities_followups WHERE tenant_id=p_tenant AND id=p_request;
  IF FOUND THEN
   IF prior.created_by IS DISTINCT FROM actor OR prior.asset_id IS DISTINCT FROM v_asset OR prior.inspection_id IS DISTINCT FROM v_inspection
   OR prior.task IS DISTINCT FROM v_task OR prior.team IS DISTINCT FROM v_team OR prior.target_date IS DISTINCT FROM v_due
   THEN RAISE EXCEPTION 'Request identifier already used' USING ERRCODE='22023'; END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM public.unipathway_facilities_inspections WHERE tenant_id=p_tenant AND asset_id=v_asset AND id=v_inspection AND outcome IN ('defect','not_verified'))
   THEN RAISE EXCEPTION 'Eligible centre inspection required' USING ERRCODE='42501'; END IF;
   IF v_due<(now() AT TIME ZONE 'Asia/Karachi')::date THEN RAISE EXCEPTION 'Target date must be today or later' USING ERRCODE='22023'; END IF;
   IF (SELECT count(*) FROM unipathway_security.facilities_followups WHERE tenant_id=p_tenant)>=500
   THEN RAISE EXCEPTION 'Follow-up capacity reached' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM unipathway_security.facilities_followups f LEFT JOIN unipathway_security.facilities_followup_resolutions c ON c.tenant_id=f.tenant_id AND c.action_id=f.id WHERE f.tenant_id=p_tenant AND f.inspection_id=v_inspection AND c.action_id IS NULL)
   THEN RAISE EXCEPTION 'An open follow-up already exists for this inspection' USING ERRCODE='22023'; END IF;
   INSERT INTO unipathway_security.facilities_followups(tenant_id,id,asset_id,inspection_id,task,team,target_date,created_by)
   VALUES(p_tenant,p_request,v_asset,v_inspection,v_task,v_team,v_due,actor);
  END IF;
  v_action:=p_request;
 ELSE
  IF NOT (p_payload ?& ARRAY['action_id','evidence']) OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>2
  OR EXISTS(SELECT 1 FROM jsonb_each(p_payload) AS e WHERE jsonb_typeof(e.value)<>'string')
  THEN RAISE EXCEPTION 'Invalid resolution fields' USING ERRCODE='22023'; END IF;
  v_action:=(p_payload->>'action_id')::uuid;v_evidence:=btrim(p_payload->>'evidence');
  IF length(v_evidence) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Resolution evidence required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM unipathway_security.facilities_followups WHERE tenant_id=p_tenant AND id=v_action)
  THEN RAISE EXCEPTION 'Centre follow-up not available' USING ERRCODE='42501'; END IF;
  SELECT * INTO prior FROM unipathway_security.facilities_followup_resolutions WHERE tenant_id=p_tenant AND request_id=p_request;
  IF FOUND THEN
   IF prior.action_id IS DISTINCT FROM v_action OR prior.recorded_by IS DISTINCT FROM actor OR prior.evidence IS DISTINCT FROM v_evidence
   THEN RAISE EXCEPTION 'Request identifier already used' USING ERRCODE='22023'; END IF;
  ELSE
   IF EXISTS(SELECT 1 FROM unipathway_security.facilities_followup_resolutions WHERE tenant_id=p_tenant AND action_id=v_action)
   THEN RAISE EXCEPTION 'Follow-up already has recorded resolution' USING ERRCODE='22023'; END IF;
   INSERT INTO unipathway_security.facilities_followup_resolutions(tenant_id,action_id,request_id,evidence,recorded_by)
   VALUES(p_tenant,v_action,p_request,v_evidence,actor);
  END IF;
 END IF;
 RETURN jsonb_build_object('tenant_id',p_tenant,'request_id',p_request,'action_id',v_action,'kind',p_kind);
END;
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_followup_write_impl(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.facilities_followup_write_impl(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.unipathway_record_facilities_followup(p_tenant uuid,p_request uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.facilities_followup_write_impl(p_tenant,p_request,p_kind,p_payload) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_record_facilities_followup(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_record_facilities_followup(uuid,uuid,text,jsonb) TO authenticated;
COMMIT;
