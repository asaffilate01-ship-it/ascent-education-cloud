CREATE OR REPLACE FUNCTION public.can_manage_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND public.uni_calendar_manage(p_session)
$$;
CREATE OR REPLACE FUNCTION public.can_join_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND public.uni_calendar_read(p_session)
$$;
CREATE OR REPLACE FUNCTION public.can_review_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_manage_unipathway_class(p_session)
$$;
REVOKE ALL ON FUNCTION public.can_manage_unipathway_class(uuid),public.can_join_unipathway_class(uuid),public.can_review_unipathway_class(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_unipathway_class(uuid),public.can_join_unipathway_class(uuid),public.can_review_unipathway_class(uuid) TO authenticated;

ALTER TABLE public.live_class_sessions ADD COLUMN IF NOT EXISTS breakout_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.live_class_sessions ADD COLUMN IF NOT EXISTS schedule_source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.live_class_sessions ADD COLUMN IF NOT EXISTS artifact_sync_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.live_class_sessions ADD COLUMN IF NOT EXISTS lesson_pack_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.live_class_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 artifact_type text NOT NULL CHECK(artifact_type IN ('recording','transcript','whiteboard','slides','attendance','qna','poll','ai_summary','revision_quiz')),
 provider_reference text, storage_reference text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 available_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','approved','published','withdrawn'))
);
CREATE INDEX IF NOT EXISTS live_class_artifacts_session ON public.live_class_artifacts(session_id,created_at);
CREATE TABLE IF NOT EXISTS public.live_class_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 student_id uuid, provider_participant_id text, joined_at timestamptz, left_at timestamptz,
 attendance_minutes numeric NOT NULL DEFAULT 0, engagement jsonb NOT NULL DEFAULT '{}'::jsonb, UNIQUE(session_id,student_id)
);
CREATE TABLE IF NOT EXISTS public.lesson_whiteboards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 session_id uuid REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 module_id uuid REFERENCES public.modules(id), title text NOT NULL, template text NOT NULL DEFAULT 'blank',
 content_reference text, microsoft_whiteboard_reference text, prepared_by uuid,
 locked_after_class boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_whiteboards_session ON public.lesson_whiteboards(session_id);
CREATE TABLE IF NOT EXISTS public.live_class_moderation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 moderator_user_id uuid NOT NULL, event_type text NOT NULL CHECK(event_type IN ('question_triaged','hand_raised','student_unmuted','student_muted','removed','technical_issue','attendance_exception','incident','note')),
 student_id uuid, notes text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lesson_ai_packs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 summary text, key_concepts jsonb NOT NULL DEFAULT '[]'::jsonb, glossary jsonb NOT NULL DEFAULT '[]'::jsonb,
 revision_questions jsonb NOT NULL DEFAULT '[]'::jsonb, quiz jsonb NOT NULL DEFAULT '[]'::jsonb,
 source_artifact_ids uuid[] NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','human_review','approved','published','rejected')),
 reviewed_by uuid, reviewed_at timestamptz, UNIQUE(session_id)
);

GRANT SELECT,INSERT,UPDATE ON public.live_class_artifacts TO authenticated;
GRANT SELECT ON public.live_class_attendance TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.lesson_whiteboards TO authenticated;
GRANT SELECT,INSERT ON public.live_class_moderation_events TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.lesson_ai_packs TO authenticated;
GRANT ALL ON public.live_class_artifacts,public.live_class_attendance,public.lesson_whiteboards,public.live_class_moderation_events,public.lesson_ai_packs TO service_role;

ALTER TABLE public.live_class_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_ai_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "published class evidence participant or authorised reviewer" ON public.live_class_artifacts
 FOR SELECT TO authenticated USING(
  public.can_manage_unipathway_class(session_id)
  OR (public.can_join_unipathway_class(session_id) AND publication_status='published' AND available_at IS NOT NULL AND available_at<=now()));
CREATE POLICY "class artifacts lecturer create" ON public.live_class_artifacts FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_class(session_id)
 AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id)
 AND publication_status='draft');
CREATE POLICY "class artifacts admin approve" ON public.live_class_artifacts FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id));

CREATE POLICY "class attendance own or educator" ON public.live_class_attendance FOR SELECT TO authenticated
 USING(student_id=auth.uid() OR public.can_manage_unipathway_class(session_id));

CREATE POLICY "whiteboard invited class only" ON public.lesson_whiteboards
 FOR SELECT TO authenticated USING(session_id IS NOT NULL AND public.can_join_unipathway_class(session_id));
CREATE POLICY "assigned educator may create whiteboard" ON public.lesson_whiteboards FOR INSERT TO authenticated
 WITH CHECK(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id)
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id)
  AND prepared_by=auth.uid());
CREATE POLICY "assigned educator updates whiteboard" ON public.lesson_whiteboards FOR UPDATE TO authenticated
 USING(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id))
 WITH CHECK(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id));

CREATE POLICY "moderation educator read" ON public.live_class_moderation_events FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_class(session_id));
CREATE POLICY "moderation educator write" ON public.live_class_moderation_events FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_class(session_id) AND moderator_user_id=auth.uid()
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id));

CREATE POLICY "lesson packs reviewed publication" ON public.lesson_ai_packs FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_class(session_id) OR (status='published' AND public.can_join_unipathway_class(session_id)));
CREATE POLICY "lesson packs academic insert" ON public.lesson_ai_packs FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_class(session_id));
CREATE POLICY "lesson packs academic update" ON public.lesson_ai_packs FOR UPDATE TO authenticated
 USING(public.can_manage_unipathway_class(session_id)) WITH CHECK(public.can_manage_unipathway_class(session_id));

CREATE OR REPLACE FUNCTION public.can_read_unipathway_class_media(p_path text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.live_class_artifacts a
 JOIN public.live_class_sessions s ON s.id=a.session_id AND s.tenant_id=a.tenant_id
 WHERE a.storage_reference=p_path
   AND (public.can_manage_unipathway_class(s.id)
    OR (a.publication_status='published' AND a.available_at<=now() AND public.can_join_unipathway_class(s.id)))
   AND p_path LIKE (a.tenant_id::text||'/'||a.session_id::text||'/%'))
 $$;
REVOKE ALL ON FUNCTION public.can_read_unipathway_class_media(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_unipathway_class_media(text) TO authenticated;
DROP POLICY IF EXISTS "private invited classroom artifact download" ON storage.objects;
CREATE POLICY "private invited classroom artifact download" ON storage.objects
 FOR SELECT TO authenticated USING(bucket_id='unipathway-class-media' AND public.can_read_unipathway_class_media(name));