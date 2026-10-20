-- UniPathway: staged, invitation-only Teams classroom ACL.
-- REQUIRES academic_ops, student_enrolments and 2026-09-29 Teams tables.
-- DO NOT execute against the legacy live 57-table database without staging parity, backups,
-- two-tenant user sessions, and reviewed Teams tenant admission/recording settings.
BEGIN;
CREATE TABLE IF NOT EXISTS public.live_class_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 invited_by uuid NOT NULL,
 status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','revoked')),
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,user_id)
);
CREATE INDEX IF NOT EXISTS live_class_invitations_user_idx ON public.live_class_invitations(user_id,session_id,status);
ALTER TABLE public.live_class_invitations ENABLE ROW LEVEL SECURITY;

-- Only a centre manager or the assigned module lecturer/organiser may manage the class.
-- SECURITY DEFINER helpers see their own base tables without relying on recursive RLS.
CREATE OR REPLACE FUNCTION public.can_manage_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.live_class_sessions s
  LEFT JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id
  WHERE s.id=p_session AND (
   s.tenant_id=public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(),'superadmin'::public.app_role)
  ) AND (
   public.has_role(auth.uid(),'superadmin'::public.app_role)
   OR public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR (public.has_role(auth.uid(),'lecturer'::public.app_role)
        AND (m.lecturer_id=auth.uid() OR s.organiser_user_id=auth.uid()))
  )
 )
$$;

CREATE OR REPLACE FUNCTION public.can_join_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_manage_unipathway_class(p_session) OR EXISTS(
  SELECT 1 FROM public.live_class_sessions s
  JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id
  JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND e.tenant_id=s.tenant_id
   AND e.student_id=auth.uid() AND e.status='active'
  JOIN public.live_class_invitations i ON i.session_id=s.id AND i.tenant_id=s.tenant_id
   AND i.user_id=e.student_id AND i.status IN ('invited','accepted')
  WHERE s.id=p_session
   AND s.tenant_id=public.get_user_tenant_id(auth.uid())
   AND public.has_role(auth.uid(),'student'::public.app_role)
   AND (i.expires_at IS NULL OR i.expires_at>now())
   AND s.status NOT IN ('cancelled','deleted')
 )
$$;

-- Explicitly assigned reviewers receive recording/evidence access, NOT meeting admission.
CREATE TABLE IF NOT EXISTS public.live_class_evidence_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 reviewer_id uuid NOT NULL,
 granted_by uuid NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,reviewer_id)
);
ALTER TABLE public.live_class_evidence_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_review_unipathway_class(p_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.live_class_evidence_grants g
  JOIN public.live_class_sessions s ON s.id=g.session_id AND s.tenant_id=g.tenant_id
  WHERE g.session_id=p_session AND g.reviewer_id=auth.uid() AND g.revoked_at IS NULL
   AND g.tenant_id=public.get_user_tenant_id(auth.uid())
   AND (public.has_role(auth.uid(),'assessor'::public.app_role)
    OR public.has_role(auth.uid(),'iqa_officer'::public.app_role)
    OR public.has_role(auth.uid(),'awarding_body_eqa'::public.app_role))
 )
$$;

-- Existing Team tables used broad same-tenant SELECT grants. REPLACE; policies are OR'ed.
DROP POLICY IF EXISTS "live sessions tenant read" ON public.live_class_sessions;
DROP POLICY IF EXISTS "live class tenant read" ON public.live_class_sessions;
DROP POLICY IF EXISTS "live sessions academic manage" ON public.live_class_sessions;
DROP POLICY IF EXISTS "live class academic manage" ON public.live_class_sessions;
CREATE POLICY "class invited participants only" ON public.live_class_sessions
 FOR SELECT TO authenticated USING(public.can_join_unipathway_class(id));
CREATE POLICY "class assigned educators update" ON public.live_class_sessions
 FOR UPDATE TO authenticated USING(public.can_manage_unipathway_class(id))
 WITH CHECK(public.same_tenant(tenant_id) AND (
  public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR (public.has_role(auth.uid(),'lecturer'::public.app_role) AND organiser_user_id=auth.uid())
 ));
CREATE POLICY "class academic schedule" ON public.live_class_sessions FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND module_id IS NOT NULL AND (
  public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR (public.has_role(auth.uid(),'lecturer'::public.app_role)
       AND EXISTS(SELECT 1 FROM public.modules m WHERE m.id=module_id AND m.tenant_id=tenant_id AND m.lecturer_id=auth.uid()))
 ));
-- No browser-client DELETE for class scheduling.

CREATE POLICY "class invitations own read" ON public.live_class_invitations
 FOR SELECT TO authenticated USING(user_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())
   OR public.can_manage_unipathway_class(session_id));
CREATE POLICY "class invitations educator create" ON public.live_class_invitations
 FOR INSERT TO authenticated WITH CHECK(
  public.can_manage_unipathway_class(session_id)
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id)
  AND EXISTS(
   SELECT 1 FROM public.live_class_sessions s
   JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id
   JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND e.tenant_id=s.tenant_id
   WHERE s.id=session_id AND e.student_id=user_id AND e.status='active'
  )
 );
CREATE POLICY "class invitations educator revoke" ON public.live_class_invitations
 FOR UPDATE TO authenticated USING(public.can_manage_unipathway_class(session_id))
 WITH CHECK(public.can_manage_unipathway_class(session_id));

CREATE POLICY "class evidence grant own read" ON public.live_class_evidence_grants
 FOR SELECT TO authenticated USING(reviewer_id=auth.uid() AND tenant_id=public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(),'centre_director'::public.app_role) AND tenant_id=public.get_user_tenant_id(auth.uid())
  OR public.has_role(auth.uid(),'superadmin'::public.app_role));
CREATE POLICY "class evidence grant admin insert" ON public.live_class_evidence_grants FOR INSERT TO authenticated
 WITH CHECK(granted_by=auth.uid() AND public.same_tenant(tenant_id)
  AND (public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role))
  AND EXISTS(SELECT 1 FROM public.live_class_sessions s WHERE s.id=session_id AND s.tenant_id=tenant_id)
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=reviewer_id AND r.tenant_id=tenant_id AND r.role IN
  ('assessor'::public.app_role,'iqa_officer'::public.app_role,'awarding_body_eqa'::public.app_role)));
CREATE POLICY "class evidence grant admin revoke" ON public.live_class_evidence_grants FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id));

-- Lessons and artifacts remain DRAFT until human approval. Never publish Graph URLs directly.
ALTER TABLE public.live_class_artifacts ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft'
 CHECK(publication_status IN ('draft','approved','published','withdrawn'));
DROP POLICY IF EXISTS "live artifacts tenant read" ON public.live_class_artifacts;
DROP POLICY IF EXISTS "live artifacts academic manage" ON public.live_class_artifacts;
CREATE POLICY "published class evidence participant or authorised reviewer" ON public.live_class_artifacts
 FOR SELECT TO authenticated USING(
  (public.can_join_unipathway_class(session_id) AND (
    public.can_manage_unipathway_class(session_id)
    OR (publication_status='published' AND available_at IS NOT NULL AND available_at<=now())
  ))
  OR public.can_review_unipathway_class(session_id)
 );
CREATE POLICY "class artifacts lecturer create" ON public.live_class_artifacts FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_class(session_id)
 AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id)
 AND publication_status='draft');
CREATE POLICY "class artifacts admin approve" ON public.live_class_artifacts FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role) OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id));
DROP POLICY IF EXISTS "whiteboard tenant read" ON public.lesson_whiteboards;
CREATE POLICY "whiteboard invited class only" ON public.lesson_whiteboards
 FOR SELECT TO authenticated USING(
  session_id IS NOT NULL AND public.can_join_unipathway_class(session_id)
 );
CREATE POLICY "assigned educator may create whiteboard" ON public.lesson_whiteboards FOR INSERT TO authenticated
 WITH CHECK(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id)
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id)
  AND prepared_by=auth.uid());
CREATE POLICY "assigned educator updates whiteboard" ON public.lesson_whiteboards FOR UPDATE TO authenticated
 USING(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id))
 WITH CHECK(session_id IS NOT NULL AND public.can_manage_unipathway_class(session_id));
DROP POLICY IF EXISTS "lesson packs tenant read" ON public.lesson_ai_packs;
DROP POLICY IF EXISTS "lesson packs academic manage" ON public.lesson_ai_packs;
CREATE POLICY "lesson packs reviewed publication" ON public.lesson_ai_packs FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_class(session_id)
   OR (status='published' AND public.can_join_unipathway_class(session_id)));
CREATE POLICY "lesson packs academic manage" ON public.lesson_ai_packs FOR ALL TO authenticated
 USING(public.can_manage_unipathway_class(session_id))
 WITH CHECK(public.can_manage_unipathway_class(session_id));

-- Module material access is independent of a classroom invitation.
CREATE TABLE IF NOT EXISTS public.unipathway_module_materials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 title text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('slide','worksheet','reading','homework','video','whiteboard')),
 object_path text NOT NULL,
 publication_status text NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','withdrawn')),
 available_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,object_path)
);
ALTER TABLE public.unipathway_module_materials ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_manage_unipathway_module(p_module uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.modules m WHERE m.id=p_module
  AND (m.tenant_id=public.get_user_tenant_id(auth.uid())
   OR public.has_role(auth.uid(),'superadmin'::public.app_role))
  AND (public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role)
   OR (m.lecturer_id=auth.uid() AND public.has_role(auth.uid(),'lecturer'::public.app_role))))
 $$;
CREATE OR REPLACE FUNCTION public.can_view_unipathway_module(p_module uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_manage_unipathway_module(p_module) OR EXISTS(
 SELECT 1 FROM public.modules m JOIN public.student_enrolments e
 ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
 WHERE m.id=p_module AND m.tenant_id=public.get_user_tenant_id(auth.uid())
  AND e.student_id=auth.uid() AND e.status='active' AND public.has_role(auth.uid(),'student'::public.app_role))
 $$;
CREATE POLICY "published materials enrolled student or teacher" ON public.unipathway_module_materials FOR SELECT TO authenticated
 USING(public.can_manage_unipathway_module(module_id)
  OR (publication_status='published' AND (available_at IS NULL OR available_at<=now())
   AND public.can_view_unipathway_module(module_id)));
CREATE POLICY "assigned module teacher upload metadata" ON public.unipathway_module_materials FOR INSERT TO authenticated
 WITH CHECK(public.can_manage_unipathway_module(module_id)
 AND tenant_id=(SELECT m.tenant_id FROM public.modules m WHERE m.id=module_id) AND created_by=auth.uid()
 AND publication_status='draft');
CREATE POLICY "module management publish metadata" ON public.unipathway_module_materials FOR UPDATE TO authenticated
 USING(public.can_manage_unipathway_module(module_id))
 WITH CHECK(public.can_manage_unipathway_module(module_id));

-- Private storage: server ingests Teams recordings; no browser recording uploads allowed.
INSERT INTO storage.buckets(id,name,public)
 VALUES('unipathway-class-media','unipathway-class-media',false),
       ('unipathway-module-materials','unipathway-module-materials',false)
 ON CONFLICT (id) DO UPDATE SET public=false;

CREATE OR REPLACE FUNCTION public.can_read_unipathway_class_media(p_path text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(
 SELECT 1 FROM public.live_class_artifacts a
 JOIN public.live_class_sessions s ON s.id=a.session_id AND s.tenant_id=a.tenant_id
 WHERE a.storage_reference=p_path
   AND (public.can_manage_unipathway_class(s.id) OR public.can_review_unipathway_class(s.id)
    OR (a.publication_status='published' AND a.available_at<=now()
     AND public.can_join_unipathway_class(s.id)))
   AND p_path LIKE (a.tenant_id::text||'/'||a.session_id::text||'/%')
 )
 $$;
CREATE POLICY "private invited classroom artifact download" ON storage.objects
 FOR SELECT TO authenticated USING(bucket_id='unipathway-class-media'
 AND public.can_read_unipathway_class_media(name));
CREATE POLICY "private module material download" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='unipathway-module-materials' AND EXISTS(
  SELECT 1 FROM public.unipathway_module_materials a
  WHERE a.object_path=name AND name LIKE (a.tenant_id::text||'/'||a.module_id::text||'/%')
  AND (public.can_manage_unipathway_module(a.module_id)
   OR (a.publication_status='published' AND (a.available_at IS NULL OR a.available_at<=now())
    AND public.can_view_unipathway_module(a.module_id)))
 ));
-- A lecturer may upload only under a module assigned to them. Names are
-- tenant UUID/module UUID/random filename. No cross-module browser upload.
CREATE OR REPLACE FUNCTION public.can_upload_unipathway_module_asset(p_path text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $
 SELECT EXISTS(
  SELECT 1 FROM public.modules m
  WHERE p_path LIKE m.tenant_id::text||'/'||m.id::text||'/%'
    AND m.tenant_id=public.get_user_tenant_id(auth.uid())
    AND public.can_manage_unipathway_module(m.id)
 )
 $;
CREATE POLICY "assigned module teacher upload private asset" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='unipathway-module-materials' AND public.can_upload_unipathway_module_asset(name));
CREATE POLICY "assigned module teacher remove unregistered asset" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='unipathway-module-materials' AND public.can_upload_unipathway_module_asset(name));

REVOKE ALL ON FUNCTION public.can_manage_unipathway_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_join_unipathway_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_review_unipathway_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_unipathway_module(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_unipathway_module(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_unipathway_class_media(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_upload_unipathway_module_asset(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_unipathway_class(uuid),public.can_join_unipathway_class(uuid),
 public.can_review_unipathway_class(uuid),public.can_manage_unipathway_module(uuid),
 public.can_view_unipathway_module(uuid),public.can_read_unipathway_class_media(text),
 public.can_upload_unipathway_module_asset(text)
 TO authenticated;
COMMIT;
