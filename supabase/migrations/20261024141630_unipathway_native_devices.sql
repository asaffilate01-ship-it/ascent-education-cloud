CREATE TABLE public.unipathway_native_devices (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id), platform text NOT NULL CHECK(platform IN ('android','ios')),
 token text NOT NULL UNIQUE CHECK(length(token) BETWEEN 16 AND 4096),
 updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
ALTER TABLE public.unipathway_native_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_native_devices FROM anon,authenticated;
GRANT ALL ON public.unipathway_native_devices TO service_role;
CREATE INDEX ON public.unipathway_native_devices(user_id,tenant_id);
CREATE FUNCTION public.register_unipathway_native_device(p_id uuid,p_platform text,p_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 t:=public.get_user_tenant_id(auth.uid());
 IF auth.uid() IS NULL OR t IS NULL OR p_id IS NULL OR p_platform IS NULL OR p_platform NOT IN ('android','ios') OR p_token IS NULL OR length(p_token) NOT BETWEEN 16 AND 4096 THEN RAISE EXCEPTION 'Authorised account and valid device required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_token,39));
 IF EXISTS(SELECT 1 FROM public.unipathway_native_devices WHERE id=p_id AND user_id<>auth.uid()) THEN RAISE EXCEPTION 'Device belongs to another account; disable notifications before changing accounts';END IF;
 IF (SELECT count(*) FROM public.unipathway_native_devices WHERE user_id=auth.uid() AND id<>p_id AND expires_at>now())>=10 THEN RAISE EXCEPTION 'Device limit reached';END IF;
 -- A rotated token can replace only this user's existing registration.
 DELETE FROM public.unipathway_native_devices WHERE token=p_token AND user_id=auth.uid() AND id<>p_id;
 INSERT INTO public.unipathway_native_devices(id,user_id,tenant_id,platform,token) VALUES(p_id,auth.uid(),t,p_platform,p_token)
 ON CONFLICT(id) DO UPDATE SET tenant_id=t,platform=p_platform,token=p_token,updated_at=now(),expires_at=now()+interval '30 days';
END $$;
CREATE FUNCTION public.revoke_unipathway_native_device(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required';END IF;
 DELETE FROM public.unipathway_native_devices WHERE id=p_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.register_unipathway_native_device(uuid,text,text),public.revoke_unipathway_native_device(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_unipathway_native_device(uuid,text,text),public.revoke_unipathway_native_device(uuid) TO authenticated;
