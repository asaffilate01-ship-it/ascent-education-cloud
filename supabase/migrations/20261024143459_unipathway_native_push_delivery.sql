CREATE TABLE public.unipathway_push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.unipathway_native_devices(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','accepted','failed','suppressed')),
 attempts integer NOT NULL DEFAULT 0, lease uuid, lease_until timestamptz, retry_at timestamptz NOT NULL DEFAULT now(),
 provider_status text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notification_id,device_id)
);
ALTER TABLE public.unipathway_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_push_deliveries FROM anon,authenticated;
GRANT ALL ON public.unipathway_push_deliveries TO service_role;
CREATE INDEX ON public.unipathway_push_deliveries(status,retry_at);
CREATE FUNCTION public.unipathway_push_allowed(p_notification uuid,p_device uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.notifications n JOIN public.unipathway_native_devices d ON d.user_id=n.user_id AND d.tenant_id=n.tenant_id
 LEFT JOIN public.notification_preferences p ON p.user_id=n.user_id
 WHERE n.id=p_notification AND d.id=p_device AND NOT n.read AND d.expires_at>now() AND n.created_at>=d.updated_at AND n.created_at>now()-interval '1 day'
 AND public.get_user_tenant_id(n.user_id)=d.tenant_id AND CASE
 WHEN n.type IN ('assignment','assignment_deadlines') THEN coalesce(p.assignment_deadlines_push,true)
 WHEN n.type IN ('grade','grade_releases') THEN coalesce(p.grade_releases_push,true)
 WHEN n.type IN ('finance','fee_reminders') THEN coalesce(p.fee_reminders_push,true)
 WHEN n.type IN ('attendance','attendance_warnings') THEN coalesce(p.attendance_warnings_push,true)
 WHEN n.type IN ('class','class_changes') THEN coalesce(p.class_changes_push,true)
 WHEN n.type IN ('message','messages') THEN coalesce(p.messages_push,true)
 WHEN n.type='academic' THEN coalesce(p.assignment_deadlines_push,true) AND coalesce(p.grade_releases_push,true) AND coalesce(p.class_changes_push,true)
 ELSE false END)
$$;
CREATE FUNCTION public.claim_unipathway_push(p_tenant uuid,p_platform text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE job public.unipathway_push_deliveries;
BEGIN
 IF p_tenant IS NULL OR p_platform IS NULL OR p_platform NOT IN ('android','ios') THEN RAISE EXCEPTION 'Worker tenant required';END IF;
 INSERT INTO public.unipathway_push_deliveries(notification_id,device_id)
 SELECT n.id,d.id FROM public.notifications n JOIN public.unipathway_native_devices d ON d.user_id=n.user_id AND d.tenant_id=n.tenant_id
 WHERE d.tenant_id=p_tenant AND d.platform=p_platform AND public.unipathway_push_allowed(n.id,d.id)
 AND NOT EXISTS(SELECT 1 FROM public.unipathway_push_deliveries q WHERE q.notification_id=n.id AND q.device_id=d.id)
 ORDER BY n.created_at LIMIT 100 ON CONFLICT DO NOTHING;
 SELECT q.* INTO job FROM public.unipathway_push_deliveries q JOIN public.unipathway_native_devices d ON d.id=q.device_id
 WHERE d.tenant_id=p_tenant AND d.platform=p_platform AND q.attempts<5 AND q.retry_at<=now() AND (q.status IN ('queued','failed') OR (q.status='processing' AND q.lease_until<now()))
 ORDER BY q.retry_at LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF job.id IS NULL THEN RETURN NULL;END IF;
 UPDATE public.unipathway_push_deliveries SET status='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now() WHERE id=job.id RETURNING * INTO job;
 RETURN jsonb_build_object('id',job.id,'lease',job.lease);
END $$;
CREATE FUNCTION public.authorise_unipathway_push(p_id uuid,p_lease uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.unipathway_push_deliveries;d public.unipathway_native_devices;
BEGIN
 SELECT * INTO q FROM public.unipathway_push_deliveries WHERE id=p_id AND lease=p_lease AND status='processing' AND lease_until>now() FOR UPDATE;
 IF q.id IS NULL THEN RETURN NULL;END IF;
 IF NOT public.unipathway_push_allowed(q.notification_id,q.device_id) THEN UPDATE public.unipathway_push_deliveries SET status='suppressed',lease=NULL,lease_until=NULL WHERE id=q.id;RETURN NULL;END IF;
 SELECT * INTO d FROM public.unipathway_native_devices WHERE id=q.device_id;
 RETURN jsonb_build_object('id',q.id,'platform',d.platform,'token',d.token);
END $$;
CREATE FUNCTION public.finish_unipathway_push(p_id uuid,p_lease uuid,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.unipathway_push_deliveries;
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('accepted','retry','invalid_token') THEN RAISE EXCEPTION 'Valid provider status required';END IF;
 SELECT * INTO q FROM public.unipathway_push_deliveries WHERE id=p_id AND lease=p_lease AND status='processing' AND lease_until>now() FOR UPDATE;
 IF q.id IS NULL THEN RAISE EXCEPTION 'Push lease expired';END IF;
 UPDATE public.unipathway_push_deliveries SET status=CASE WHEN p_status='accepted' THEN 'accepted' WHEN p_status='invalid_token' THEN 'suppressed' ELSE 'failed' END,
 provider_status=p_status,lease=NULL,lease_until=NULL,retry_at=now()+interval '5 minutes',updated_at=now() WHERE id=q.id;
 IF p_status='invalid_token' THEN UPDATE public.unipathway_native_devices SET expires_at=now() WHERE id=q.device_id;END IF;
END $$;
REVOKE ALL ON FUNCTION public.unipathway_push_allowed(uuid,uuid),public.claim_unipathway_push(uuid,text),public.authorise_unipathway_push(uuid,uuid),public.finish_unipathway_push(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.unipathway_push_allowed(uuid,uuid),public.claim_unipathway_push(uuid,text),public.authorise_unipathway_push(uuid,uuid),public.finish_unipathway_push(uuid,uuid,text) TO service_role;

CREATE INDEX ON public.unipathway_native_devices(tenant_id,platform,expires_at);
