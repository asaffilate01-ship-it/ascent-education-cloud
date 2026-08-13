-- Revoke API access to internal/trigger functions
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'assign_default_role','auto_enrol_student','handle_new_user',
        'notify_lecture_scheduled','notify_on_enrolment','notify_on_grade','notify_on_invoice',
        'prevent_profile_tenant_change','prevent_tenant_id_change','sanitize_student_submission',
        'sync_invoice_payment','update_thread_reply_count','update_updated_at_column',
        'get_user_tenant_id'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
  END LOOP;
END $$;

-- Intended RPCs: explicit, minimal grants
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.auto_schedule_module(uuid, uuid, uuid, text, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auto_schedule_module(uuid, uuid, uuid, text, smallint, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated, service_role;

-- Internal helper still needed by SQL policies/functions running as definer
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO service_role;