-- Reviewed forward patch; do not auto-apply. Requires physical-security operations patch.
-- Verify target UniPathway project, backup, schema and two-centre acceptance before activation.
BEGIN;
CREATE TABLE unipathway_security.facilities_activation(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_security.facilities_activation(singleton) VALUES(true);
ALTER TABLE unipathway_security.facilities_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_security.facilities_activation FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_security.facilities_reader(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT unipathway_security.verified_reader(p_tenant)
 AND EXISTS(SELECT 1 FROM unipathway_security.facilities_activation WHERE singleton AND enabled)
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_reader(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.facilities_reader(uuid) TO authenticated;

CREATE FUNCTION unipathway_security.facilities_writer(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT unipathway_security.facilities_reader(p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=(SELECT auth.uid()) AND tenant_id=p_tenant AND role::text='centre_director')
$fn$;
REVOKE ALL ON FUNCTION unipathway_security.facilities_writer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_security.facilities_writer(uuid) TO authenticated;

CREATE TABLE public.unipathway_facilities_assets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 category text NOT NULL CHECK(category IN ('fire_alarm','extinguisher','emergency_exit','emergency_lighting','signage','evacuation_plan','ups','solar','access_control','security_post')),
 asset_code text NOT NULL CHECK(asset_code=btrim(asset_code) AND length(asset_code) BETWEEN 1 AND 80),
 location text NOT NULL CHECK(length(btrim(location)) BETWEEN 1 AND 160),
 planned_inspection_date date NOT NULL,
 created_by uuid NOT NULL DEFAULT auth.uid() CHECK(created_by IS NOT NULL),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX facilities_asset_code_per_centre ON public.unipathway_facilities_assets(tenant_id,lower(asset_code));
ALTER TABLE public.unipathway_facilities_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_facilities_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_facilities_assets TO authenticated;
GRANT INSERT(tenant_id,category,asset_code,location,planned_inspection_date) ON public.unipathway_facilities_assets TO authenticated;
CREATE POLICY facilities_assets_read ON public.unipathway_facilities_assets FOR SELECT TO authenticated
 USING(unipathway_security.facilities_reader(tenant_id));
CREATE POLICY facilities_assets_register ON public.unipathway_facilities_assets FOR INSERT TO authenticated
 WITH CHECK(unipathway_security.facilities_writer(tenant_id) AND created_by=(SELECT auth.uid()));

CREATE TABLE public.unipathway_facilities_inspections(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 asset_id uuid NOT NULL,
 inspected_on date NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('satisfactory','defect','not_verified')),
 notes text NOT NULL CHECK(length(btrim(notes)) BETWEEN 1 AND 2000),
 next_due_date date CHECK(next_due_date IS NULL OR next_due_date>=inspected_on),
 recorded_by uuid NOT NULL DEFAULT auth.uid(),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,asset_id) REFERENCES public.unipathway_facilities_assets(tenant_id,id)
);
CREATE INDEX facilities_inspections_asset_history ON public.unipathway_facilities_inspections(tenant_id,asset_id,recorded_at DESC);
ALTER TABLE public.unipathway_facilities_inspections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_facilities_inspections FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.unipathway_facilities_inspections TO authenticated;
GRANT INSERT(tenant_id,asset_id,inspected_on,outcome,notes,next_due_date) ON public.unipathway_facilities_inspections TO authenticated;
CREATE POLICY facilities_inspections_read ON public.unipathway_facilities_inspections FOR SELECT TO authenticated
 USING(unipathway_security.facilities_reader(tenant_id));
CREATE POLICY facilities_inspections_record ON public.unipathway_facilities_inspections FOR INSERT TO authenticated
 WITH CHECK(unipathway_security.facilities_writer(tenant_id) AND recorded_by=(SELECT auth.uid()) AND inspected_on<=(now() AT TIME ZONE 'Asia/Karachi')::date);
-- No client update or delete grants. Inspection history is append-only.
COMMIT;
