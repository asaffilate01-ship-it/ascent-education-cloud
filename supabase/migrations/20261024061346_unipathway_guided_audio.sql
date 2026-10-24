-- Guided practice audio uses existing class management and invitation checks.
CREATE TABLE public.unipathway_guided_audio (
 session_id uuid PRIMARY KEY REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 storage_path text NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
 playing boolean NOT NULL DEFAULT false,
 position_seconds numeric NOT NULL DEFAULT 0 CHECK(position_seconds BETWEEN 0 AND 14400),
 revision bigint NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_guided_audio ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_guided_audio TO authenticated;
CREATE POLICY guided_audio_read ON public.unipathway_guided_audio FOR SELECT TO authenticated
 USING(public.can_join_unipathway_class(session_id));
CREATE POLICY guided_audio_insert ON public.unipathway_guided_audio FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_class(session_id));
CREATE POLICY guided_audio_update ON public.unipathway_guided_audio FOR UPDATE TO authenticated
 USING(public.can_manage_unipathway_class(session_id)) WITH CHECK(public.can_manage_unipathway_class(session_id));

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('guided-class-audio','guided-class-audio',false,52428800,ARRAY['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm']);
CREATE FUNCTION public.guided_audio_session(p_path text) RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(mp3|wav|ogg|m4a|webm)$'
 AND split_part(p_path,'/',1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 THEN split_part(p_path,'/',1)::uuid ELSE NULL END
$$;
CREATE POLICY guided_audio_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='guided-class-audio' AND public.can_manage_unipathway_class(public.guided_audio_session(name)));
CREATE POLICY guided_audio_download ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='guided-class-audio' AND public.can_join_unipathway_class(public.guided_audio_session(name)));
CREATE POLICY guided_audio_remove ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='guided-class-audio' AND public.can_manage_unipathway_class(public.guided_audio_session(name)));

CREATE FUNCTION public.validate_guided_audio() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.session_id IS DISTINCT FROM OLD.session_id THEN RAISE EXCEPTION 'Session cannot change'; END IF;
 IF public.guided_audio_session(NEW.storage_path) IS DISTINCT FROM NEW.session_id
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='guided-class-audio' AND name=NEW.storage_path) THEN RAISE EXCEPTION 'Private class audio required'; END IF;
 NEW.updated_at:=clock_timestamp(); NEW.revision:=CASE WHEN TG_OP='INSERT' THEN 1 ELSE OLD.revision+1 END;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_guided_audio BEFORE INSERT OR UPDATE ON public.unipathway_guided_audio FOR EACH ROW EXECUTE FUNCTION public.validate_guided_audio();

CREATE FUNCTION public.set_unipathway_guided_audio(p_session uuid,p_revision bigint,p_path text,p_title text,p_playing boolean,p_position numeric)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_revision bigint; result public.unipathway_guided_audio%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_unipathway_class(p_session) THEN RAISE EXCEPTION 'Class manager required'; END IF;
 IF p_revision IS NULL OR p_position IS NULL OR p_position='NaN'::numeric OR p_position NOT BETWEEN 0 AND 14400 OR p_playing IS NULL THEN RAISE EXCEPTION 'Invalid audio command'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_session::text,7));
 SELECT revision INTO current_revision FROM public.unipathway_guided_audio WHERE session_id=p_session FOR UPDATE;
 IF coalesce(current_revision,0)<>p_revision THEN RAISE EXCEPTION 'Audio changed; refresh before retry'; END IF;
 IF current_revision IS NULL THEN
 INSERT INTO public.unipathway_guided_audio(session_id,storage_path,title,playing,position_seconds)
 VALUES(p_session,p_path,p_title,p_playing,p_position) RETURNING * INTO result;
 ELSE
 UPDATE public.unipathway_guided_audio SET storage_path=p_path,title=p_title,playing=p_playing,position_seconds=p_position WHERE session_id=p_session RETURNING * INTO result;
 END IF;
 RETURN to_jsonb(result);
END $$;
CREATE FUNCTION public.get_unipathway_guided_audio(p_session uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result public.unipathway_guided_audio%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_join_unipathway_class(p_session) THEN RAISE EXCEPTION 'Class invitation required'; END IF;
 SELECT * INTO result FROM public.unipathway_guided_audio WHERE session_id=p_session;
 RETURN jsonb_build_object('state',CASE WHEN result.session_id IS NULL THEN NULL ELSE to_jsonb(result) END,'server_now',clock_timestamp(),'can_manage',public.can_manage_unipathway_class(p_session));
END $$;
REVOKE ALL ON FUNCTION public.set_unipathway_guided_audio(uuid,bigint,text,text,boolean,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_unipathway_guided_audio(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_unipathway_guided_audio(uuid,bigint,text,text,boolean,numeric),public.get_unipathway_guided_audio(uuid) TO authenticated;
-- Storage evaluates all applicable SELECT policy dependencies, even for other
-- buckets. Existing enrolled/published-material RLS still limits these rows.
GRANT SELECT ON public.unipathway_module_materials TO authenticated;
