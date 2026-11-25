-- Apply only after the reviewed facilities register forward patch.
-- No activation, credentials or synthetic records.
BEGIN;
CREATE FUNCTION public.get_unipathway_facilities_register(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE assets jsonb; inspections jsonb;
BEGIN
 IF NOT unipathway_security.facilities_reader(p_tenant) THEN
  RAISE EXCEPTION 'Verified active centre facilities reader required' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.asset_code,r.id),'[]'::jsonb)
 INTO assets FROM (
  SELECT id,tenant_id,category,asset_code,location,planned_inspection_date
  FROM public.unipathway_facilities_assets WHERE tenant_id=p_tenant
  ORDER BY asset_code,id LIMIT 501
 ) r;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.inspected_on DESC,r.recorded_at DESC,r.id),'[]'::jsonb)
 INTO inspections FROM (
  SELECT id,tenant_id,asset_id,inspected_on,outcome,notes,next_due_date,recorded_at
  FROM public.unipathway_facilities_inspections WHERE tenant_id=p_tenant
  ORDER BY inspected_on DESC,recorded_at DESC,id LIMIT 1001
 ) r;
 IF jsonb_array_length(assets)>500 OR jsonb_array_length(inspections)>1000 THEN
  RAISE EXCEPTION 'Facilities register exceeds snapshot limit; use a verified server report';
 END IF;
 RETURN jsonb_build_object('assets',assets,'inspections',inspections);
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_facilities_register(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_facilities_register(uuid) TO authenticated;
COMMIT;
