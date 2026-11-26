-- Reviewed forward patch only. Do not auto-apply or run against unrelated projects.
-- Verify the target UniPathway database, schema, backups and authorisation first.
BEGIN;
CREATE SCHEMA unipathway_application_planning;
REVOKE ALL ON SCHEMA unipathway_application_planning FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_application_planning TO authenticated;
CREATE TABLE unipathway_application_planning.activation(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_application_planning.activation(singleton) VALUES(true);
ALTER TABLE unipathway_application_planning.activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_application_planning.activation FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_application_planning.can_plan(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT (SELECT auth.uid()) IS NOT NULL
 AND EXISTS(SELECT 1 FROM unipathway_application_planning.activation WHERE singleton AND enabled)
 AND EXISTS(SELECT 1 FROM public.tenants WHERE id=p_tenant AND status='active')
 AND EXISTS(SELECT 1 FROM public.profiles WHERE user_id=(SELECT auth.uid()) AND tenant_id=p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=(SELECT auth.uid()) AND tenant_id=p_tenant AND role::text='student')
$fn$;
REVOKE ALL ON FUNCTION unipathway_application_planning.can_plan(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_application_planning.can_plan(uuid) TO authenticated;

CREATE TABLE public.unipathway_student_application_plans(
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 title text NOT NULL CHECK(title=btrim(title) AND length(title) BETWEEN 1 AND 120),
 category text NOT NULL CHECK(category IN ('Scholarship','University application','Document submission','Language test','Other')),
 planning_date date NOT NULL CHECK(planning_date BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'),
 completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,owner_id,id)
);
CREATE UNIQUE INDEX student_plan_unique_entry ON public.unipathway_student_application_plans(tenant_id,owner_id,lower(title),category,planning_date);
CREATE INDEX student_plan_agenda ON public.unipathway_student_application_plans(tenant_id,owner_id,completed,planning_date,id);
ALTER TABLE public.unipathway_student_application_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_student_application_plans FROM PUBLIC,anon,authenticated;
GRANT SELECT,DELETE ON public.unipathway_student_application_plans TO authenticated;
GRANT INSERT(tenant_id,id,title,category,planning_date) ON public.unipathway_student_application_plans TO authenticated;
GRANT UPDATE(title,category,planning_date,completed) ON public.unipathway_student_application_plans TO authenticated;
CREATE POLICY student_plan_select ON public.unipathway_student_application_plans FOR SELECT TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND unipathway_application_planning.can_plan(tenant_id));
CREATE POLICY student_plan_insert ON public.unipathway_student_application_plans FOR INSERT TO authenticated
 WITH CHECK(owner_id=(SELECT auth.uid()) AND unipathway_application_planning.can_plan(tenant_id));
CREATE POLICY student_plan_update ON public.unipathway_student_application_plans FOR UPDATE TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND unipathway_application_planning.can_plan(tenant_id))
 WITH CHECK(owner_id=(SELECT auth.uid()) AND unipathway_application_planning.can_plan(tenant_id));
CREATE POLICY student_plan_delete ON public.unipathway_student_application_plans FOR DELETE TO authenticated
 USING(owner_id=(SELECT auth.uid()) AND unipathway_application_planning.can_plan(tenant_id));

-- Explicit server authorisation differentiates a verified empty list from a disabled/denied workspace.
CREATE FUNCTION public.get_unipathway_student_application_plans(p_tenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE result jsonb;
BEGIN
 IF NOT unipathway_application_planning.can_plan(p_tenant) THEN
  RAISE EXCEPTION 'Verified active student membership and planning activation required' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.completed,r.planning_date,r.id),'[]'::jsonb)
 INTO result FROM (
  SELECT id,tenant_id,owner_id,title,category,planning_date,completed
  FROM public.unipathway_student_application_plans
  WHERE tenant_id=p_tenant AND owner_id=(SELECT auth.uid())
  ORDER BY completed,planning_date,id LIMIT 501
 ) r;
 IF jsonb_array_length(result)>500 THEN
  RAISE EXCEPTION 'Planning register exceeds workspace limit';
 END IF;
 RETURN result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_student_application_plans(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_student_application_plans(uuid) TO authenticated;
COMMIT;
