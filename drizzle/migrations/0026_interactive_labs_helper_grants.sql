REVOKE ALL ON FUNCTION public.is_lab_teacher(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_lab_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_language_recording(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lab_teacher(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_lab_participant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_language_recording(text) TO authenticated, service_role;
COMMENT ON TABLE public.interactive_lab_ai_usage IS 'Daily AI coach counters; written only by the consume_interactive_lab_ai security-definer function, so no client policies are intended.';