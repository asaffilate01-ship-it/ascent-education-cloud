CREATE OR REPLACE FUNCTION public.is_lab_teacher(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user
    AND ur.role IN ('lecturer','programme_leader','centre_director','superadmin','assessor'))
$$;

CREATE TABLE public.interactive_lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('tech','language')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  join_code text NOT NULL UNIQUE CHECK (join_code ~ '^[A-Z0-9]{6}$'),
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
  activity_id text CHECK (activity_id IS NULL OR char_length(activity_id) <= 80),
  activity_revision integer NOT NULL DEFAULT 0,
  broadcast jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX interactive_lab_sessions_tenant_idx ON public.interactive_lab_sessions (tenant_id, status, created_at DESC);

CREATE TABLE public.interactive_lab_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interactive_lab_sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  location text NOT NULL DEFAULT 'remote' CHECK (location IN ('in_class','remote')),
  status text NOT NULL DEFAULT 'working' CHECK (status IN ('working','stuck','done')),
  hand_raised boolean NOT NULL DEFAULT false,
  current_activity text CHECK (current_activity IS NULL OR char_length(current_activity) <= 80),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE public.interactive_lab_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  session_id uuid REFERENCES public.interactive_lab_sessions(id) ON DELETE SET NULL,
  lab_kind text NOT NULL CHECK (lab_kind IN ('tech','language')),
  activity_id text NOT NULL CHECK (char_length(activity_id) BETWEEN 1 AND 80),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 20000),
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  passed boolean,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  audio_path text CHECK (audio_path IS NULL OR char_length(audio_path) <= 300),
  teacher_feedback text CHECK (teacher_feedback IS NULL OR char_length(teacher_feedback) <= 3000),
  feedback_by uuid,
  feedback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interactive_lab_attempts_user_idx ON public.interactive_lab_attempts (user_id, created_at DESC);
CREATE INDEX interactive_lab_attempts_session_idx ON public.interactive_lab_attempts (session_id, created_at DESC);

CREATE TABLE public.interactive_lab_ai_usage (
  user_id uuid NOT NULL,
  usage_day date NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_day)
);

CREATE OR REPLACE FUNCTION public.is_lab_participant(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.interactive_lab_participants p WHERE p.session_id = _session AND p.user_id = auth.uid())
$$;

GRANT SELECT, INSERT, UPDATE ON public.interactive_lab_sessions TO authenticated;
GRANT ALL ON public.interactive_lab_sessions TO service_role;
GRANT SELECT, UPDATE ON public.interactive_lab_participants TO authenticated;
GRANT ALL ON public.interactive_lab_participants TO service_role;
GRANT SELECT, INSERT ON public.interactive_lab_attempts TO authenticated;
GRANT UPDATE (teacher_feedback) ON public.interactive_lab_attempts TO authenticated;
GRANT ALL ON public.interactive_lab_attempts TO service_role;
GRANT ALL ON public.interactive_lab_ai_usage TO service_role;

ALTER TABLE public.interactive_lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_lab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_lab_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_lab_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and joined students read lab sessions" ON public.interactive_lab_sessions
  FOR SELECT TO authenticated
  USING (public.same_tenant(tenant_id) AND (public.is_lab_teacher(auth.uid()) OR public.is_lab_participant(id)));
CREATE POLICY "Teachers open lab sessions" ON public.interactive_lab_sessions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_lab_teacher(auth.uid()) AND status = 'live');
CREATE POLICY "Teachers run their centre lab sessions" ON public.interactive_lab_sessions
  FOR UPDATE TO authenticated
  USING (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()))
  WITH CHECK (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()));

CREATE POLICY "Students read own participation; teachers read centre" ON public.interactive_lab_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid())));
CREATE POLICY "Teachers manage centre participants" ON public.interactive_lab_participants
  FOR UPDATE TO authenticated
  USING (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()))
  WITH CHECK (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()));

CREATE POLICY "Learners save own lab attempts" ON public.interactive_lab_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND teacher_feedback IS NULL AND feedback_by IS NULL AND feedback_at IS NULL
    AND (session_id IS NULL OR public.is_lab_participant(session_id))
    AND (audio_path IS NULL OR split_part(audio_path, '/', 1) = auth.uid()::text));
CREATE POLICY "Learners read own attempts; teachers read centre" ON public.interactive_lab_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid())));
CREATE POLICY "Teachers give feedback on centre attempts" ON public.interactive_lab_attempts
  FOR UPDATE TO authenticated
  USING (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (public.same_tenant(tenant_id) AND public.is_lab_teacher(auth.uid()));

CREATE OR REPLACE FUNCTION public.stamp_interactive_lab_feedback()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.teacher_feedback IS DISTINCT FROM OLD.teacher_feedback THEN
    NEW.feedback_by := auth.uid();
    NEW.feedback_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER interactive_lab_attempts_feedback BEFORE UPDATE ON public.interactive_lab_attempts
  FOR EACH ROW EXECUTE FUNCTION public.stamp_interactive_lab_feedback();

CREATE OR REPLACE FUNCTION public.touch_interactive_lab_session_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'ended' AND OLD.status <> 'ended' THEN NEW.ended_at := now(); END IF;
  IF OLD.status = 'ended' AND NEW.status <> 'ended' THEN RAISE EXCEPTION 'An ended lab session cannot be reopened'; END IF;
  NEW.tenant_id := OLD.tenant_id; NEW.created_by := OLD.created_by; NEW.join_code := OLD.join_code; NEW.kind := OLD.kind;
  RETURN NEW;
END $$;
CREATE TRIGGER interactive_lab_sessions_touch BEFORE UPDATE ON public.interactive_lab_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_interactive_lab_session_updated();

CREATE OR REPLACE FUNCTION public.open_interactive_lab(p_kind text, p_title text)
RETURNS public.interactive_lab_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid := public.get_user_tenant_id(auth.uid());
  v_code text; v_row public.interactive_lab_sessions; i int;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF auth.uid() IS NULL OR v_tenant IS NULL OR NOT public.is_lab_teacher(auth.uid()) THEN
    RAISE EXCEPTION 'Only teaching staff linked to a centre can open a lab session';
  END IF;
  FOR attempt IN 1..20 LOOP
    v_code := '';
    FOR i IN 1..6 LOOP v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); END LOOP;
    BEGIN
      INSERT INTO public.interactive_lab_sessions (tenant_id, kind, title, join_code, created_by)
      VALUES (v_tenant, p_kind, btrim(p_title), v_code, auth.uid()) RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN CONTINUE;
    END;
  END LOOP;
  RAISE EXCEPTION 'Could not create a join code, please retry';
END $$;

CREATE OR REPLACE FUNCTION public.join_interactive_lab(p_code text, p_location text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session public.interactive_lab_sessions; v_name text; v_tenant uuid := public.get_user_tenant_id(auth.uid());
BEGIN
  IF auth.uid() IS NULL OR v_tenant IS NULL THEN RAISE EXCEPTION 'Sign in with a centre account to join'; END IF;
  IF p_location NOT IN ('in_class','remote') THEN RAISE EXCEPTION 'Choose in class or remote'; END IF;
  SELECT * INTO v_session FROM public.interactive_lab_sessions s
   WHERE s.join_code = upper(btrim(p_code)) AND s.status = 'live' AND s.tenant_id = v_tenant;
  IF NOT FOUND THEN RAISE EXCEPTION 'No live lab session matches that code'; END IF;
  IF v_session.locked AND NOT EXISTS (SELECT 1 FROM public.interactive_lab_participants p WHERE p.session_id = v_session.id AND p.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Your teacher has closed joining for this session';
  END IF;
  SELECT coalesce(nullif(btrim(pr.full_name), ''), split_part(pr.email, '@', 1), 'Student') INTO v_name
   FROM public.profiles pr WHERE pr.user_id = auth.uid() LIMIT 1;
  INSERT INTO public.interactive_lab_participants (session_id, tenant_id, user_id, display_name, location)
  VALUES (v_session.id, v_tenant, auth.uid(), left(coalesce(v_name, 'Student'), 120), p_location)
  ON CONFLICT (session_id, user_id) DO UPDATE SET location = EXCLUDED.location, last_seen = now();
  RETURN v_session.id;
END $$;

CREATE OR REPLACE FUNCTION public.touch_interactive_lab(p_session uuid, p_status text, p_hand boolean, p_activity text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('working','stuck','done') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.interactive_lab_participants p
     SET status = p_status, hand_raised = coalesce(p_hand, false),
         current_activity = left(p_activity, 80), last_seen = now()
   WHERE p.session_id = p_session AND p.user_id = auth.uid()
     AND EXISTS (SELECT 1 FROM public.interactive_lab_sessions s WHERE s.id = p.session_id AND s.status = 'live');
END $$;

CREATE OR REPLACE FUNCTION public.consume_interactive_lab_ai(p_daily_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_day date := (now() AT TIME ZONE 'Asia/Karachi')::date;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_tenant_id(auth.uid()) IS NULL THEN RETURN false; END IF;
  INSERT INTO public.interactive_lab_ai_usage (user_id, usage_day, request_count) VALUES (auth.uid(), v_day, 1)
  ON CONFLICT (user_id, usage_day) DO UPDATE SET request_count = public.interactive_lab_ai_usage.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count <= greatest(1, least(p_daily_limit, 500));
END $$;

REVOKE ALL ON FUNCTION public.open_interactive_lab(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_interactive_lab(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_interactive_lab(uuid, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_interactive_lab_ai(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_interactive_lab(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_interactive_lab(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_interactive_lab(uuid, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_interactive_lab_ai(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_language_recording(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  BEGIN v_owner := split_part(_name, '/', 1)::uuid; EXCEPTION WHEN others THEN RETURN false; END;
  IF v_owner = auth.uid() THEN RETURN true; END IF;
  RETURN public.is_lab_teacher(auth.uid()) AND public.same_tenant(public.get_user_tenant_id(v_owner));
END $$;

CREATE POLICY "Learners upload own language recordings" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'language-lab-recordings' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Learners and centre teachers play language recordings" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'language-lab-recordings' AND public.can_read_language_recording(name));
CREATE POLICY "Learners delete own language recordings" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'language-lab-recordings' AND split_part(name, '/', 1) = auth.uid()::text);