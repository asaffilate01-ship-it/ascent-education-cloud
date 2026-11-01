-- UniPathway class-specific files, recordings and packs: 24h normal / 12h
-- exceptional urgent release AFTER independently recorded class end.
-- STAGING REVIEW ONLY. Verify all table/column names, existing RLS policies,
-- storage bucket policies and existing private/offline links before applying.
-- This patch MUST NOT run on the unrelated Dishbee Supabase project.
BEGIN;
CREATE SCHEMA IF NOT EXISTS unipathway_acl;
ALTER TABLE public.live_class_sessions
 ADD COLUMN IF NOT EXISTS actual_ended_at timestamptz,
 ADD COLUMN IF NOT EXISTS end_evidence_reference text;
ALTER TABLE public.unipathway_module_materials
 ADD COLUMN IF NOT EXISTS class_session_id uuid REFERENCES public.live_class_sessions(id);
CREATE INDEX IF NOT EXISTS uni_materials_class_idx
 ON public.unipathway_module_materials(tenant_id,class_session_id);

-- A client must not directly forge the actual class finish time or
-- change a verified end. Only a reviewed privileged RPC may set this field.
CREATE OR REPLACE FUNCTION unipathway_acl.prevent_direct_class_end_override()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $fn$
BEGIN
 IF current_user IN ('authenticated','anon') AND (
   NEW.actual_ended_at IS DISTINCT FROM OLD.actual_ended_at OR
   NEW.end_evidence_reference IS DISTINCT FROM OLD.end_evidence_reference)
 THEN RAISE EXCEPTION 'Class-end evidence must be recorded by authorised RPC'
 USING ERRCODE='42501';END IF;
 RETURN NEW;
END
$fn$;
DROP TRIGGER IF EXISTS unipathway_prevent_direct_class_end ON public.live_class_sessions;
CREATE TRIGGER unipathway_prevent_direct_class_end
 BEFORE UPDATE ON public.live_class_sessions FOR EACH ROW
 EXECUTE FUNCTION unipathway_acl.prevent_direct_class_end_override();

CREATE TABLE public.unipathway_class_release_decisions (
 session_id uuid PRIMARY KEY REFERENCES public.live_class_sessions(id),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 urgent boolean NOT NULL DEFAULT false,
 urgent_reason text NOT NULL CHECK(length(btrim(urgent_reason)) BETWEEN 20 AND 500),
 approved_by uuid NOT NULL REFERENCES auth.users(id),
 approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_class_release_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_class_release_decisions FROM PUBLIC,anon,authenticated;

-- All backend calls inspect current auth.uid(), account centre and current
-- user_roles membership: never use client selected role or user_metadata.
CREATE OR REPLACE FUNCTION unipathway_acl.class_access(p_session uuid,p_tenant uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
 v_session public.live_class_sessions%ROWTYPE;v_module uuid;
 v_urgent boolean:=false;v_end timestamptz;
BEGIN
 IF v_actor IS NULL OR p_session IS NULL OR p_tenant IS NULL THEN RETURN false;END IF;
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 IF v_centre IS DISTINCT FROM p_tenant THEN RETURN false;END IF;
 SELECT * INTO v_session FROM public.live_class_sessions
  WHERE id=p_session AND tenant_id=p_tenant;
 IF NOT FOUND OR v_session.module_id IS NULL THEN RETURN false;END IF;
 v_module:=v_session.module_id;
 -- Academically authorised staff may prepare materials before class delivery.
 IF EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text IN('centre_director','programme_leader'))
 OR (EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text='lecturer') AND EXISTS(
     SELECT 1 FROM public.modules m WHERE m.id=v_module
      AND m.tenant_id=v_centre AND m.lecturer_id=v_actor))
 THEN RETURN true;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles r
  WHERE r.user_id=v_actor AND r.tenant_id=v_centre AND r.role::text='student')
 OR NOT EXISTS(SELECT 1 FROM public.modules m JOIN public.student_enrolments e
  ON e.programme_id=m.programme_id AND e.student_id=v_actor
  AND e.tenant_id=m.tenant_id AND e.status='active'
  WHERE m.id=v_module AND m.tenant_id=v_centre)
 THEN RETURN false;END IF;
 -- "Scheduled to end" does not prove the lesson was delivered.
 IF v_session.status<>'ended' OR v_session.actual_ended_at IS NULL
 OR v_session.ends_at IS NULL THEN RETURN false;END IF;
 v_end:=greatest(v_session.ends_at,v_session.actual_ended_at);
 SELECT d.urgent INTO v_urgent FROM public.unipathway_class_release_decisions d
  WHERE d.session_id=p_session AND d.tenant_id=p_tenant;
 RETURN now()>=v_end+CASE WHEN coalesce(v_urgent,false)
  THEN INTERVAL '12 hours' ELSE INTERVAL '24 hours' END;
END
$fn$;

-- Public entrypoint lets policy evaluation remain in the exposed schema.
-- Private ACL helpers do NOT require direct authenticated schema USAGE.
CREATE OR REPLACE FUNCTION public.can_access_my_unipathway_class_resource(
 p_session uuid,p_tenant uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT unipathway_acl.class_access(p_session,p_tenant)
$fn$;

CREATE OR REPLACE FUNCTION public.confirm_unipathway_actual_class_end(
 p_session uuid,p_evidence text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
 v_class public.live_class_sessions%ROWTYPE;v_end timestamptz;
BEGIN
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 SELECT * INTO v_class FROM public.live_class_sessions
 WHERE id=p_session AND tenant_id=v_centre FOR UPDATE;
 IF v_actor IS NULL OR v_centre IS NULL OR NOT FOUND
 OR v_class.status='cancelled'
 OR p_evidence IS NULL OR length(btrim(p_evidence)) NOT BETWEEN 12 AND 500
 OR NOT (
  EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text IN('centre_director','programme_leader'))
  OR (EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text='lecturer') AND EXISTS(
    SELECT 1 FROM public.modules m WHERE m.id=v_class.module_id
     AND m.tenant_id=v_centre AND m.lecturer_id=v_actor))
 ) THEN RAISE EXCEPTION 'Authorised class-end evidence required' USING ERRCODE='42501';END IF;
 IF v_class.actual_ended_at IS NOT NULL
 THEN RAISE EXCEPTION 'Class end already recorded' USING ERRCODE='40001';END IF;
 -- If a tutor ends early, do not start the release clock before the planned
 -- finish; late classes use the later verified end.
 v_end:=greatest(now(),v_class.ends_at);
 UPDATE public.live_class_sessions SET status='ended',actual_ended_at=v_end,
  end_evidence_reference=btrim(p_evidence) WHERE id=p_session AND tenant_id=v_centre;
 RETURN jsonb_build_object('sessionId',p_session,'actualEnd',v_end,'normalReleaseAt',
  v_end+INTERVAL '24 hours');
END
$fn$;

CREATE OR REPLACE FUNCTION public.approve_unipathway_urgent_class_release(
 p_session uuid,p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
 v_class public.live_class_sessions%ROWTYPE;
BEGIN
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 SELECT * INTO v_class FROM public.live_class_sessions
 WHERE id=p_session AND tenant_id=v_centre FOR UPDATE;
 IF v_actor IS NULL OR v_centre IS NULL OR NOT FOUND
 OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
  AND r.tenant_id=v_centre AND r.role::text IN('centre_director','programme_leader'))
 OR v_class.status<>'ended' OR v_class.actual_ended_at IS NULL
 OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 20 AND 500
 THEN RAISE EXCEPTION 'Urgent release needs a completed class and manager approval'
 USING ERRCODE='42501';END IF;
 INSERT INTO public.unipathway_class_release_decisions
 (session_id,tenant_id,urgent,urgent_reason,approved_by)
 VALUES(p_session,v_centre,true,btrim(p_reason),v_actor)
 ON CONFLICT(session_id) DO UPDATE SET urgent=true,urgent_reason=EXCLUDED.urgent_reason,
 approved_by=EXCLUDED.approved_by,approved_at=now()
 WHERE public.unipathway_class_release_decisions.tenant_id=v_centre;
 RETURN jsonb_build_object('sessionId',p_session,'hours',12,
  'availableAt',greatest(v_class.ends_at,v_class.actual_ended_at)+INTERVAL '12 hours');
END
$fn$;

-- A class-linked file cannot be paired with another centre or module.
CREATE OR REPLACE FUNCTION public.publish_unipathway_course_material(p_material uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
 v_item public.unipathway_module_materials%ROWTYPE;
BEGIN
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 SELECT * INTO v_item FROM public.unipathway_module_materials
  WHERE id=p_material AND tenant_id=v_centre FOR UPDATE;
 IF v_actor IS NULL OR v_centre IS NULL OR NOT FOUND
 OR v_item.publication_status<>'draft'
 OR NOT (
  EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text IN('centre_director','programme_leader'))
  OR (EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text='lecturer') AND EXISTS(
    SELECT 1 FROM public.modules m WHERE m.id=v_item.module_id
     AND m.tenant_id=v_centre AND m.lecturer_id=v_actor))
 ) THEN RAISE EXCEPTION 'Material publication not authorised' USING ERRCODE='42501';END IF;
 IF v_item.class_session_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.live_class_sessions s WHERE s.id=v_item.class_session_id
   AND s.tenant_id=v_centre AND s.module_id=v_item.module_id
   AND s.status<>'cancelled')
 THEN RAISE EXCEPTION 'Class and module mismatch' USING ERRCODE='42501';END IF;
 -- Keep class-linked publication time NULL. RLS and storage permissions are
 -- evaluated live against the actual end and urgent approval on every request.
 UPDATE public.unipathway_module_materials
 SET publication_status='published',available_at=CASE WHEN v_item.class_session_id IS NULL
  THEN now() ELSE NULL END
 WHERE id=p_material AND tenant_id=v_centre;
 RETURN jsonb_build_object('id',p_material,'status','published',
  'classLinked',v_item.class_session_id IS NOT NULL);
END
$fn$;

-- Ensure every resource table has RLS active before installing restrictive
-- access conditions; otherwise policies would exist but not protect reads.
ALTER TABLE public.unipathway_module_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_ai_packs ENABLE ROW LEVEL SECURITY;

-- These RESTRICTIVE filters apply even if an existing permissive table policy
-- allows an enrolled learner to list all published files.
CREATE POLICY "Class-linked materials have a verified post-class embargo"
 ON public.unipathway_module_materials AS RESTRICTIVE FOR SELECT TO authenticated
 USING(class_session_id IS NULL OR
  public.can_access_my_unipathway_class_resource(class_session_id,tenant_id));
CREATE POLICY "Class recording artifacts have a verified post-class embargo"
 ON public.live_class_artifacts AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.can_access_my_unipathway_class_resource(session_id,tenant_id));
CREATE POLICY "Class AI revision packs have a verified post-class embargo"
 ON public.lesson_ai_packs AS RESTRICTIVE FOR SELECT TO authenticated
 USING(public.can_access_my_unipathway_class_resource(session_id,tenant_id));

-- Storage signed URLs can bypass row-level checks at download time. Therefore
-- signing access for BOTH private buckets must be denied before the clock opens.
CREATE OR REPLACE FUNCTION unipathway_acl.media_path_allowed(p_bucket text,p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
BEGIN
 IF v_actor IS NULL OR p_path IS NULL OR length(p_path)>1500 THEN RETURN false;END IF;
 SELECT p.tenant_id INTO v_centre FROM public.profiles p WHERE p.user_id=v_actor;
 IF v_centre IS NULL THEN RETURN false;END IF;
 IF p_bucket='unipathway-module-materials' THEN
  RETURN EXISTS(
   SELECT 1 FROM public.unipathway_module_materials m
   JOIN public.modules mo ON mo.id=m.module_id AND mo.tenant_id=m.tenant_id
   WHERE m.tenant_id=v_centre AND m.object_path=p_path
    AND (
     -- Authorised teaching/centre staff may open their own drafts.
     ((EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
       AND r.tenant_id=v_centre AND r.role::text IN('centre_director','programme_leader'))
      OR (mo.lecturer_id=v_actor AND EXISTS(
        SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
         AND r.tenant_id=v_centre AND r.role::text='lecturer'))))
     OR
     -- Students may sign only published files in active enrolled programmes.
     (m.publication_status='published' AND EXISTS(
      SELECT 1 FROM public.user_roles r JOIN public.student_enrolments e
       ON e.student_id=r.user_id AND e.tenant_id=r.tenant_id
      WHERE r.user_id=v_actor AND r.tenant_id=v_centre
       AND r.role::text='student' AND e.status='active'
       AND e.programme_id=mo.programme_id))
    )
    AND (m.class_session_id IS NULL OR
      unipathway_acl.class_access(m.class_session_id,v_centre))
  );
 ELSIF p_bucket='unipathway-class-media' THEN
  RETURN EXISTS(SELECT 1 FROM public.live_class_artifacts a
   WHERE a.tenant_id=v_centre AND a.storage_reference=p_path
    AND (a.publication_status='published' OR EXISTS(
     SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
      AND r.tenant_id=v_centre AND r.role::text IN('lecturer','programme_leader','centre_director')))
    AND unipathway_acl.class_access(a.session_id,v_centre));
 END IF;
 RETURN false;
END
$fn$;

CREATE OR REPLACE FUNCTION public.can_open_my_unipathway_class_media(p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 RETURN unipathway_acl.media_path_allowed('unipathway-class-media',p_path);
END
$fn$;
CREATE OR REPLACE FUNCTION public.can_open_my_unipathway_material(p_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 RETURN unipathway_acl.media_path_allowed('unipathway-module-materials',p_path);
END
$fn$;

CREATE POLICY "Post-class private storage signature embargo"
 ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
 USING(
  bucket_id NOT IN('unipathway-module-materials','unipathway-class-media')
  OR (bucket_id='unipathway-module-materials' AND
   public.can_open_my_unipathway_material(name))
  OR (bucket_id='unipathway-class-media' AND
   public.can_open_my_unipathway_class_media(name))
 );

REVOKE ALL ON FUNCTION unipathway_acl.class_access(uuid,uuid),
 unipathway_acl.media_path_allowed(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_acl.class_access(uuid,uuid),
 unipathway_acl.media_path_allowed(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.can_access_my_unipathway_class_resource(uuid,uuid),
 public.confirm_unipathway_actual_class_end(uuid,text),
 public.approve_unipathway_urgent_class_release(uuid,text),
 public.publish_unipathway_course_material(uuid),
 public.can_open_my_unipathway_class_media(text),
 public.can_open_my_unipathway_material(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_my_unipathway_class_resource(uuid,uuid),
 public.confirm_unipathway_actual_class_end(uuid,text),
 public.approve_unipathway_urgent_class_release(uuid,text),
 public.publish_unipathway_course_material(uuid),
 public.can_open_my_unipathway_class_media(text),
 public.can_open_my_unipathway_material(text) TO authenticated;
COMMIT;
