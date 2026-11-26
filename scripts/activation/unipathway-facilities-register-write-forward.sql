-- Reviewed forward patch, not an automatic migration. Apply after both facilities patches.
-- No live activation, credentials or fixture rows.
BEGIN;
CREATE TABLE unipathway_security.facilities_write_activation(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_security.facilities_write_activation(singleton) VALUES(true);
ALTER TABLE unipathway_security.facilities_write_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_security.facilities_write_activation FROM PUBLIC,anon,authenticated;

CREATE TABLE unipathway_security.facilities_command_receipts(
 tenant_id uuid NOT NULL,
 request_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('asset','inspection')),
 record_id uuid NOT NULL,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,request_id)
);
ALTER TABLE unipathway_security.facilities_command_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_security.facilities_command_receipts FROM PUBLIC,anon,authenticated;

-- Replace the predecessor's direct INSERT path; authenticated reads are unchanged.
REVOKE INSERT(tenant_id,category,asset_code,location,planned_inspection_date) ON public.unipathway_facilities_assets FROM authenticated;
REVOKE INSERT(tenant_id,asset_id,inspected_on,outcome,notes,next_due_date) ON public.unipathway_facilities_inspections FROM authenticated;
DROP POLICY facilities_assets_register ON public.unipathway_facilities_assets;
DROP POLICY facilities_inspections_record ON public.unipathway_facilities_inspections;

CREATE FUNCTION unipathway_security.facilities_record_impl(p_tenant uuid,p_request_id uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid()); v_id uuid; v_old record;
 v_code text; v_location text; v_category text; v_date date; v_next date;
 v_asset uuid; v_outcome text; v_notes text; v_normal jsonb;
BEGIN
 IF NOT unipathway_security.facilities_writer(p_tenant)
 OR NOT EXISTS(SELECT 1 FROM unipathway_security.facilities_write_activation WHERE singleton AND enabled)
 THEN RAISE EXCEPTION 'Verified facilities writer and write gate required' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_kind IS NULL OR p_kind NOT IN ('asset','inspection')
 OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR length(p_payload::text)>12000
 THEN RAISE EXCEPTION 'Invalid facilities command' USING ERRCODE='22023';END IF;
 -- Serialize commands per centre, including capacity checks and same-request replay.
 PERFORM 1 FROM public.tenants WHERE id=p_tenant AND status::text='active' FOR UPDATE;
 IF NOT FOUND OR NOT unipathway_security.facilities_writer(p_tenant)
 OR NOT EXISTS(SELECT 1 FROM unipathway_security.facilities_write_activation WHERE singleton AND enabled)
 THEN RAISE EXCEPTION 'Active facilities writer required' USING ERRCODE='42501';END IF;
 IF p_kind='asset' THEN
  IF NOT (p_payload ?& ARRAY['category','asset_code','location','planned_inspection_date'])
  OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>4
  OR EXISTS(SELECT 1 FROM jsonb_each(p_payload) AS entry WHERE jsonb_typeof(entry.value)<>'string')
  THEN RAISE EXCEPTION 'Invalid asset fields' USING ERRCODE='22023';END IF;
  v_category:=p_payload->>'category';v_code:=btrim(p_payload->>'asset_code');v_location:=btrim(p_payload->>'location');
  IF v_category NOT IN ('fire_alarm','extinguisher','emergency_exit','emergency_lighting','signage','evacuation_plan','ups','solar','access_control','security_post')
  OR length(v_code) NOT BETWEEN 1 AND 80 OR length(v_location) NOT BETWEEN 1 AND 160
  OR (p_payload->>'planned_inspection_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  THEN RAISE EXCEPTION 'Invalid asset details' USING ERRCODE='22023';END IF;
  v_date:=(p_payload->>'planned_inspection_date')::date;
  IF to_char(v_date,'YYYY-MM-DD')<>p_payload->>'planned_inspection_date' THEN RAISE EXCEPTION 'Invalid planning date' USING ERRCODE='22023';END IF;
  v_normal:=jsonb_build_object('category',v_category,'asset_code',v_code,'location',v_location,'planned_inspection_date',v_date);
 ELSE
  IF NOT (p_payload ?& ARRAY['asset_id','inspected_on','outcome','notes','next_due_date'])
  OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>5
  OR EXISTS(SELECT 1 FROM jsonb_each(p_payload) AS entry WHERE
    (entry.key<>'next_due_date' AND jsonb_typeof(entry.value)<>'string')
    OR (entry.key='next_due_date' AND jsonb_typeof(entry.value) NOT IN ('string','null')))
  THEN RAISE EXCEPTION 'Invalid inspection fields' USING ERRCODE='22023';END IF;
  v_asset:=(p_payload->>'asset_id')::uuid;v_outcome:=p_payload->>'outcome';v_notes:=btrim(p_payload->>'notes');
  IF v_outcome NOT IN ('satisfactory','defect','not_verified') OR length(v_notes) NOT BETWEEN 1 AND 2000
  OR (p_payload->>'inspected_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  OR ((p_payload->>'next_due_date') IS NOT NULL AND (p_payload->>'next_due_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
  THEN RAISE EXCEPTION 'Invalid inspection details' USING ERRCODE='22023';END IF;
  v_date:=(p_payload->>'inspected_on')::date;v_next:=(p_payload->>'next_due_date')::date;
  IF to_char(v_date,'YYYY-MM-DD')<>p_payload->>'inspected_on'
  OR (v_next IS NOT NULL AND to_char(v_next,'YYYY-MM-DD')<>p_payload->>'next_due_date')
  OR v_date>(now() AT TIME ZONE 'Asia/Karachi')::date OR (v_next IS NOT NULL AND v_next<v_date)
  THEN RAISE EXCEPTION 'Invalid inspection date' USING ERRCODE='22023';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.unipathway_facilities_assets WHERE tenant_id=p_tenant AND id=v_asset)
  THEN RAISE EXCEPTION 'Asset not available in this centre' USING ERRCODE='42501';END IF;
  v_normal:=jsonb_build_object('asset_id',v_asset,'inspected_on',v_date,'outcome',v_outcome,'notes',v_notes,'next_due_date',v_next);
 END IF;
 SELECT actor_id,kind,record_id,payload INTO v_old FROM unipathway_security.facilities_command_receipts WHERE tenant_id=p_tenant AND request_id=p_request_id;
 IF FOUND THEN
  IF v_old.actor_id IS DISTINCT FROM v_actor OR v_old.kind IS DISTINCT FROM p_kind OR v_old.payload IS DISTINCT FROM v_normal
  THEN RAISE EXCEPTION 'Request identifier already used for different details' USING ERRCODE='22023';END IF;
  v_id:=v_old.record_id;
 ELSE
  IF p_kind='asset' THEN
   IF (SELECT count(*) FROM public.unipathway_facilities_assets WHERE tenant_id=p_tenant)>=500
   THEN RAISE EXCEPTION 'Facilities asset snapshot capacity reached' USING ERRCODE='22023';END IF;
   INSERT INTO public.unipathway_facilities_assets(tenant_id,category,asset_code,location,planned_inspection_date,created_by)
   VALUES(p_tenant,v_category,v_code,v_location,v_date,v_actor) RETURNING id INTO v_id;
  ELSE
   IF (SELECT count(*) FROM public.unipathway_facilities_inspections WHERE tenant_id=p_tenant)>=1000
   THEN RAISE EXCEPTION 'Facilities inspection snapshot capacity reached' USING ERRCODE='22023';END IF;
   INSERT INTO public.unipathway_facilities_inspections(tenant_id,asset_id,inspected_on,outcome,notes,next_due_date,recorded_by)
   VALUES(p_tenant,v_asset,v_date,v_outcome,v_notes,v_next,v_actor) RETURNING id INTO v_id;
  END IF;
  INSERT INTO unipathway_security.facilities_command_receipts(tenant_id,request_id,actor_id,kind,record_id,payload)
  VALUES(p_tenant,p_request_id,v_actor,p_kind,v_id,v_normal);
 END IF;
 RETURN jsonb_build_object('id',v_id,'tenant_id',p_tenant,'kind',p_kind,'request_id',p_request_id);
END;
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_record_impl(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.facilities_record_impl(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.unipathway_record_facilities_item(p_tenant uuid,p_request_id uuid,p_kind text,p_payload jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_security.facilities_record_impl(p_tenant,p_request_id,p_kind,p_payload) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_record_facilities_item(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_record_facilities_item(uuid,uuid,text,jsonb) TO authenticated;
COMMIT;
