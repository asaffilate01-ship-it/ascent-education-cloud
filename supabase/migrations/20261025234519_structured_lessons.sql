-- Structured lessons are independent of the optional classroom provider schema.
CREATE TABLE public.unipathway_lessons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 module_id uuid NOT NULL REFERENCES public.modules(id), title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=100000), position integer NOT NULL DEFAULT 1 CHECK(position>0),
 video_url text, transcript text NOT NULL DEFAULT '', resource_url text,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(video_url IS NULL OR video_url ~ '^https://[^[:space:]]+$'),
 CHECK(resource_url IS NULL OR resource_url ~ '^https://[^[:space:]]+$'),
 CHECK(status<>'published' OR (length(trim(body))>=20 AND (video_url IS NULL OR length(trim(transcript))>=20)))
);
CREATE INDEX ON public.unipathway_lessons(module_id,position,id);
ALTER TABLE public.unipathway_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_read ON public.unipathway_lessons FOR SELECT TO authenticated USING (
 unipathway_acl.module_access(module_id,tenant_id,true) OR (status='published' AND unipathway_acl.module_access(module_id,tenant_id)));
CREATE POLICY lesson_insert ON public.unipathway_lessons FOR INSERT TO authenticated WITH CHECK(unipathway_acl.module_access(module_id,tenant_id,true));
CREATE POLICY lesson_update ON public.unipathway_lessons FOR UPDATE TO authenticated USING(unipathway_acl.module_access(module_id,tenant_id,true)) WITH CHECK(unipathway_acl.module_access(module_id,tenant_id,true));
REVOKE ALL ON public.unipathway_lessons FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_lessons TO authenticated;
CREATE TABLE public.unipathway_lesson_revisions (
 lesson_id uuid NOT NULL REFERENCES public.unipathway_lessons(id),revision integer NOT NULL,
 tenant_id uuid NOT NULL,module_id uuid NOT NULL,snapshot jsonb NOT NULL,
 changed_by uuid,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(lesson_id,revision)
);
ALTER TABLE public.unipathway_lesson_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY revision_read ON public.unipathway_lesson_revisions FOR SELECT TO authenticated USING(unipathway_acl.module_access(module_id,tenant_id,true));
REVOKE ALL ON public.unipathway_lesson_revisions FROM anon,authenticated;
GRANT SELECT ON public.unipathway_lesson_revisions TO authenticated;
CREATE FUNCTION unipathway_acl.lesson_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT unipathway_acl.module_access(NEW.module_id,NEW.tenant_id,true) THEN RAISE EXCEPTION 'Module assignment required';END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.module_id<>OLD.module_id OR NEW.tenant_id<>OLD.tenant_id OR NEW.id<>OLD.id THEN RAISE EXCEPTION 'Lesson scope cannot change';END IF;
  NEW.revision:=OLD.revision+1;
 ELSE NEW.revision:=1;END IF;
 NEW.updated_at:=now();RETURN NEW;
END $$;
CREATE FUNCTION unipathway_acl.lesson_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.unipathway_lesson_revisions VALUES(NEW.id,NEW.revision,NEW.tenant_id,NEW.module_id,to_jsonb(NEW),auth.uid(),now());RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION unipathway_acl.lesson_revision(),unipathway_acl.lesson_snapshot() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER lesson_revision BEFORE INSERT OR UPDATE ON public.unipathway_lessons FOR EACH ROW EXECUTE FUNCTION unipathway_acl.lesson_revision();
CREATE TRIGGER lesson_snapshot AFTER INSERT OR UPDATE ON public.unipathway_lessons FOR EACH ROW EXECUTE FUNCTION unipathway_acl.lesson_snapshot();
CREATE TABLE public.unipathway_lesson_progress (
 student_id uuid NOT NULL DEFAULT auth.uid(),lesson_id uuid NOT NULL REFERENCES public.unipathway_lessons(id),
 revision integer NOT NULL,position_seconds integer NOT NULL DEFAULT 0 CHECK(position_seconds BETWEEN 0 AND 86400),
 completed boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(student_id,lesson_id,revision),
 FOREIGN KEY(lesson_id,revision) REFERENCES public.unipathway_lesson_revisions(lesson_id,revision)
);
ALTER TABLE public.unipathway_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY progress_read ON public.unipathway_lesson_progress FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.unipathway_lessons l WHERE l.id=lesson_id AND (unipathway_acl.module_access(l.module_id,l.tenant_id,true) OR student_id=auth.uid())));
CREATE POLICY progress_insert ON public.unipathway_lesson_progress FOR INSERT TO authenticated WITH CHECK (
 student_id=auth.uid() AND public.has_role(auth.uid(),'student') AND EXISTS(SELECT 1 FROM public.unipathway_lessons l WHERE l.id=lesson_id AND l.revision=unipathway_lesson_progress.revision AND l.status='published' AND unipathway_acl.module_access(l.module_id,l.tenant_id)));
CREATE POLICY progress_update ON public.unipathway_lesson_progress FOR UPDATE TO authenticated USING(student_id=auth.uid()) WITH CHECK (
 student_id=auth.uid() AND public.has_role(auth.uid(),'student') AND EXISTS(SELECT 1 FROM public.unipathway_lessons l WHERE l.id=lesson_id AND l.revision=unipathway_lesson_progress.revision AND l.status='published' AND unipathway_acl.module_access(l.module_id,l.tenant_id)));
REVOKE ALL ON public.unipathway_lesson_progress FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.unipathway_lesson_progress TO authenticated;

-- The reviewed admissions RPC is the only client path to creating an enrolment.
-- Earlier core ACL migration grants are retained only on installations without the handover.
DO $$ BEGIN
 IF to_regprocedure('public.complete_unipathway_admission(uuid,uuid,uuid,text,text)') IS NOT NULL THEN
  REVOKE INSERT ON public.student_enrolments FROM anon,authenticated;
 END IF;
END $$;
