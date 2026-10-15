ALTER TABLE public.omniqora_event_outbox ADD COLUMN lease_token uuid,ADD COLUMN lease_until timestamptz,
 ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN factory_run_id text;
CREATE FUNCTION public.claim_factory_events(p_tenant uuid,p_limit integer DEFAULT 5)
RETURNS SETOF public.omniqora_event_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 RETURN QUERY WITH candidates AS (
 SELECT id FROM public.omniqora_event_outbox WHERE tenant_id=p_tenant AND processed_at IS NOT NULL AND attempts<10
 AND ((status IN ('pending','failed') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now()))
 ORDER BY created_at LIMIT greatest(1,least(coalesce(p_limit,5),5)) FOR UPDATE SKIP LOCKED
 ) UPDATE public.omniqora_event_outbox o SET status='processing',attempts=o.attempts+1,
 lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 FROM candidates c WHERE o.id=c.id RETURNING o.*;
END $$;
CREATE FUNCTION public.finish_factory_event(p_id uuid,p_lease uuid,p_run_id text,p_error text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE affected integer;
BEGIN
 UPDATE public.omniqora_event_outbox SET status=CASE WHEN p_run_id IS NOT NULL THEN 'exported' ELSE 'failed' END,
 factory_run_id=p_run_id,exported_at=CASE WHEN p_run_id IS NOT NULL THEN now() ELSE NULL END,
 last_error=left(p_error,120),next_attempt_at=now()+least(3600,power(2,attempts)::integer*30)*interval '1 second',lease_token=NULL,lease_until=NULL
 WHERE id=p_id AND lease_token=p_lease AND status='processing' AND lease_until>now();
 GET DIAGNOSTICS affected=ROW_COUNT;RETURN affected=1;
END $$;
REVOKE ALL ON FUNCTION public.claim_factory_events(uuid,integer),public.finish_factory_event(uuid,uuid,text,text) FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_factory_events(uuid,integer),public.finish_factory_event(uuid,uuid,text,text) TO service_role;
CREATE POLICY "outbox director read" ON public.omniqora_event_outbox FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND public.has_role(auth.uid(),'centre_director'::app_role));
