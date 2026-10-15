-- Seed unknown readiness explicitly; never infer live health from source code.
CREATE FUNCTION public.seed_unipathway_launch_gates(p_tenant uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.production_integrations(tenant_id,integration_key,category,required_for_launch,status)
 SELECT p_tenant,k,c,required,'not_configured' FROM (VALUES
 ('omniqora_factory','intelligence',false),('microsoft_education','teaching',true),('institutional_payments','finance',true),
 ('partner_admissions','progression',false),('virtual_labs','practicals',false),('nadra_identity','identity',false)) x(k,c,required)
 ON CONFLICT(tenant_id,integration_key) DO NOTHING;
 INSERT INTO public.production_readiness_checks(tenant_id,check_key,category,status)
 SELECT p_tenant,k,c,'pending' FROM (VALUES
 ('full_migration_replay','database'),('tenant_role_isolation','security'),('student_lifecycle_e2e','application'),
 ('course_materials_approved','academic'),('centre_and_qualification_approvals','academic'),('backup_restore_drill','operations'),
 ('live_payment_reconciliation','finance'),('teams_classroom_smoke_test','teaching'),('partner_agreement_verification','progression')) x(k,c)
 ON CONFLICT(tenant_id,check_key) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.seed_unipathway_launch_gates(uuid) FROM PUBLIC,authenticated;
DO $$ DECLARE t record; BEGIN FOR t IN SELECT id FROM public.tenants LOOP PERFORM public.seed_unipathway_launch_gates(t.id); END LOOP; END $$;
CREATE FUNCTION public.initialise_unipathway_launch_gates() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.seed_unipathway_launch_gates(NEW.id);RETURN NEW;END $$;
CREATE TRIGGER initialise_unipathway_launch_gates AFTER INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.initialise_unipathway_launch_gates();
