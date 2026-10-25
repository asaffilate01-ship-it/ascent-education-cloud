-- READ ONLY. Run on the verified target before and after forward-only reconciliation.
-- Object presence is not authenticated journey or provider acceptance.
WITH expected(name) AS (VALUES
 ('public.unipathway_assessment_briefs'),('public.unipathway_assessment_attempts'),
 ('public.unipathway_assessment_released_results'),('public.unipathway_assessment_allocations'),
 ('public.unipathway_coursework_uploads'),('public.unipathway_onboarding_drafts'),
 ('public.unipathway_account_invitations'),('public.unipathway_centre_onboarding'),
 ('public.live_class_sessions'),('public.live_class_invitations'),('public.live_class_artifacts'),
 ('public.unipathway_recording_jobs'),('public.unipathway_recording_reviews'),
 ('public.unipathway_module_materials'),('public.unipathway_learning_plans'),
 ('public.unipathway_learning_tasks'),('public.unipathway_learning_attempts'),('public.unipathway_learning_shares'),
 ('public.unipathway_public_course_offers'),('public.unipathway_native_devices'))
SELECT name, CASE WHEN to_regclass(name) IS NULL THEN 'MISSING' WHEN NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(name)) THEN 'RLS_DISABLED' ELSE 'PRESENT_RLS_ENABLED' END AS schema_status FROM expected ORDER BY name;
WITH expected(signature) AS (VALUES
 ('public.submit_unipathway_coursework(uuid,text,uuid[],uuid)'),
 ('public.create_unipathway_centre_from_draft(uuid,integer)'),
 ('public.resume_unipathway_centre_setup(uuid)'),
 ('public.create_unipathway_learning_plan(uuid,uuid,text)'),
 ('public.submit_unipathway_learning_attempt(uuid,uuid,text,boolean)'),
 ('public.review_unipathway_learning_attempt(uuid,text,text)'),
 ('public.send_unipathway_guardian_message_once(uuid,text,uuid)'),
 ('public.request_attendance_correction(uuid,uuid,public.attendance_status,text)'),
 ('public.review_attendance_correction(uuid,text,text)'),
 ('public.list_attendance_corrections(uuid)'),
 ('public.get_unipathway_daily_register(uuid,date)'),
 ('public.save_unipathway_daily_mark(uuid,uuid,date,public.attendance_status)'),
 ('public.get_unipathway_guardian_learning()'))
SELECT signature,CASE WHEN to_regprocedure(signature) IS NULL THEN 'MISSING' WHEN NOT has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE') THEN 'AUTHENTICATED_EXECUTE_MISSING' WHEN has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') THEN 'UNEXPECTED_ANONYMOUS_EXECUTE' ELSE 'PRESENT_GRANTS_CHECKED' END AS rpc_status FROM expected;
WITH expected(id) AS (VALUES ('unipathway-coursework'),('unipathway-module-materials'),('unipathway-class-media'),('unipathway-centre-documents'))
SELECT e.id,CASE WHEN b.id IS NULL THEN 'MISSING' WHEN b.public THEN 'UNEXPECTED_PUBLIC_BUCKET' ELSE 'PRIVATE' END AS storage_status,b.file_size_limit,b.allowed_mime_types FROM expected e LEFT JOIN storage.buckets b ON b.id=e.id;
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;
