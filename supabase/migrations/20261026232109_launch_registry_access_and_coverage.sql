-- Browser users may review evidence through the audited RPC only.
REVOKE ALL ON public.production_integrations,public.production_readiness_checks,public.production_readiness_reviews FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.production_integrations,public.production_readiness_checks,public.production_readiness_reviews FROM authenticated;
GRANT SELECT ON public.production_integrations,public.production_readiness_checks,public.production_readiness_reviews TO authenticated;
GRANT ALL ON public.production_integrations,public.production_readiness_checks,public.production_readiness_reviews TO service_role;

-- Extend the existing tenant seed trigger without rewriting recorded evidence.
CREATE FUNCTION public.seed_uni_remaining_launch_checks(p_tenant uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 INSERT INTO public.production_readiness_checks(tenant_id,check_key,category,status)
 SELECT p_tenant,k,c,'pending' FROM (VALUES
 ('publication_release_verified','deployment'),('institutional_email_e2e','communications'),
 ('omniqora_ai_e2e','intelligence'),('language_room_audio_e2e','teaching'),
 ('cloud_lab_lifecycle_e2e','practicals'),('assessment_annotation_and_history','academic'),
 ('scorm_lti_content_e2e','learning'),('offline_restart_and_sync','learning'),
 ('guardian_child_isolation','security'),('sponsor_liability_reconciliation','finance'),
 ('nadra_approved_connection','identity'),('cctv_security_playback','security'),
 ('public_contact_and_course_information','marketing'),('desktop_mobile_task_flows','quality')
) AS x(k,c) ON CONFLICT(tenant_id,check_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.seed_uni_remaining_launch_checks(uuid) FROM PUBLIC,authenticated,anon;
CREATE OR REPLACE FUNCTION public.initialise_unipathway_launch_gates() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.seed_unipathway_launch_gates(NEW.id);
 PERFORM public.seed_uni_remaining_launch_checks(NEW.id);
 RETURN NEW;
END $$;
DO $$ DECLARE t record; BEGIN FOR t IN SELECT id FROM public.tenants LOOP
 PERFORM public.seed_uni_remaining_launch_checks(t.id);
END LOOP; END $$;
