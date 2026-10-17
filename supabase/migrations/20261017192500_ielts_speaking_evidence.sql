-- Private, opt-in original speaking-practice audio. Not an official IELTS examination.
-- Storage access is tenant-scoped; student records are immutable except authorised tutor assessment.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('ielts-speaking','ielts-speaking',false,10485760,
 ARRAY['audio/webm','audio/mp4','audio/ogg'])
ON CONFLICT (id) DO UPDATE
 SET public=false,file_size_limit=10485760,
 allowed_mime_types=ARRAY['audio/webm','audio/mp4','audio/ogg'];

CREATE TABLE public.ielts_speaking_recordings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 track text NOT NULL CHECK(track IN ('academic','general')),
 prompt_key text NOT NULL CHECK(prompt_key IN ('part1','part2','part3')),
 storage_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK(mime_type IN ('audio/webm','audio/mp4','audio/ogg')),
 duration_seconds integer NOT NULL CHECK(duration_seconds BETWEEN 1 AND 180),
 consent_at timestamptz NOT NULL,
 teacher_feedback text CHECK(teacher_feedback IS NULL OR length(btrim(teacher_feedback)) BETWEEN 10 AND 5000),
 fluency_band numeric(3,1), lexical_band numeric(3,1),
 grammar_band numeric(3,1), pronunciation_band numeric(3,1),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT speaking_scores_half_bands CHECK(
  (fluency_band IS NULL AND lexical_band IS NULL AND grammar_band IS NULL AND pronunciation_band IS NULL)
  OR
  (fluency_band IS NOT NULL AND lexical_band IS NOT NULL AND grammar_band IS NOT NULL AND pronunciation_band IS NOT NULL
  AND fluency_band BETWEEN 0 AND 9 AND lexical_band BETWEEN 0 AND 9
  AND grammar_band BETWEEN 0 AND 9 AND pronunciation_band BETWEEN 0 AND 9
  AND fluency_band*2=trunc(fluency_band*2) AND lexical_band*2=trunc(lexical_band*2)
  AND grammar_band*2=trunc(grammar_band*2) AND pronunciation_band*2=trunc(pronunciation_band*2))
 ),
 CONSTRAINT speaking_review_needs_notes CHECK(
  (teacher_feedback IS NULL AND fluency_band IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL)
  OR (teacher_feedback IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
 )
);
CREATE INDEX ielts_speaking_tutor_queue ON public.ielts_speaking_recordings(tenant_id,created_at DESC);
CREATE INDEX ielts_speaking_learner ON public.ielts_speaking_recordings(tenant_id,student_id,created_at DESC);

-- Supabase Storage path: tenant UUID/student UUID/recording UUID.extension.
-- A learner can only write their own files, while teachers can read files of
-- students in the same tenant. This function never grants access across tenants.
CREATE FUNCTION public.can_access_ielts_speaking(p_path text,p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|mp4|ogg)$'
 AND EXISTS(
  SELECT 1 FROM public.profiles p
  JOIN public.user_roles u ON u.user_id=p.user_id AND u.tenant_id=p.tenant_id
  WHERE p.tenant_id::text=split_part(p_path,'/',1)
   AND p.user_id::text=split_part(p_path,'/',2)
   AND u.role='student'::public.app_role
   AND public.same_tenant(p.tenant_id)
   AND (
    (p.user_id=auth.uid())
    OR (NOT p_write AND (
     public.has_role(auth.uid(),'lecturer'::public.app_role)
     OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
     OR public.has_role(auth.uid(),'centre_director'::public.app_role)
     OR public.has_role(auth.uid(),'superadmin'::public.app_role)
    ))
   )
 )
$$;
REVOKE ALL ON FUNCTION public.can_access_ielts_speaking(text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_ielts_speaking(text,boolean) TO authenticated;

CREATE POLICY "IELTS speaking private insert" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='ielts-speaking' AND public.can_access_ielts_speaking(name,true));
CREATE POLICY "IELTS speaking private read" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='ielts-speaking' AND public.can_access_ielts_speaking(name,false));
CREATE POLICY "IELTS speaking private deletion" ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='ielts-speaking' AND public.can_access_ielts_speaking(name,true));
CREATE POLICY "IELTS speaking immutable object" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(bucket_id<>'ielts-speaking') WITH CHECK(bucket_id<>'ielts-speaking');
-- Restrictive guard protects the private IELTS bucket even if unrelated permissive Storage policies exist.
CREATE POLICY "IELTS speaking bucket boundary" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING(bucket_id<>'ielts-speaking' OR public.can_access_ielts_speaking(name,false))
 WITH CHECK(bucket_id<>'ielts-speaking' OR public.can_access_ielts_speaking(name,true));

CREATE FUNCTION public.guard_ielts_speaking_recording()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.teacher_feedback IS NOT NULL OR NEW.reviewed_by IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL OR NEW.fluency_band IS NOT NULL
    OR NEW.lexical_band IS NOT NULL OR NEW.grammar_band IS NOT NULL
    OR NEW.pronunciation_band IS NOT NULL THEN
   RAISE EXCEPTION 'A learner cannot grade an IELTS speaking recording' USING ERRCODE='42501';
  END IF;
  IF NEW.consent_at > now() OR NEW.consent_at < now()-interval '1 hour' THEN
   RAISE EXCEPTION 'Current consent to share speaking audio is required' USING ERRCODE='42501';
  END IF;
 ELSE
  IF ROW(NEW.id,NEW.tenant_id,NEW.student_id,NEW.track,NEW.prompt_key,NEW.storage_path,
         NEW.mime_type,NEW.duration_seconds,NEW.consent_at,NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.id,OLD.tenant_id,OLD.student_id,OLD.track,OLD.prompt_key,OLD.storage_path,
         OLD.mime_type,OLD.duration_seconds,OLD.consent_at,OLD.created_at) THEN
   RAISE EXCEPTION 'Speaking evidence is immutable' USING ERRCODE='42501';
  END IF;
  IF nullif(btrim(coalesce(NEW.teacher_feedback,'')),'') IS NOT NULL THEN
   NEW.reviewed_by:=auth.uid();
   NEW.reviewed_at:=now();
  ELSE
   NEW.reviewed_by:=NULL;
   NEW.reviewed_at:=NULL;
  END IF;
 END IF;
 IF NEW.storage_path !~* ('^'||NEW.tenant_id::text||'/'||NEW.student_id::text||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|mp4|ogg)$')
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='ielts-speaking'
     AND o.name=NEW.storage_path) THEN
  RAISE EXCEPTION 'Audio must exist in the private speaking bucket at the learner path' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ielts_speaking_guard BEFORE INSERT OR UPDATE ON public.ielts_speaking_recordings
 FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_speaking_recording();
CREATE TRIGGER ielts_speaking_student_identity BEFORE INSERT OR UPDATE ON public.ielts_speaking_recordings
 FOR EACH ROW EXECUTE FUNCTION public.guard_ielts_learner_identity();

ALTER TABLE public.ielts_speaking_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IELTS speaking learner read" ON public.ielts_speaking_recordings FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND student_id=auth.uid());
CREATE POLICY "IELTS speaking tutor read" ON public.ielts_speaking_recordings FOR SELECT TO authenticated
 USING(public.same_tenant(tenant_id) AND (
  public.has_role(auth.uid(),'lecturer'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
CREATE POLICY "IELTS speaking learner create" ON public.ielts_speaking_recordings FOR INSERT TO authenticated
 WITH CHECK(public.same_tenant(tenant_id) AND student_id=auth.uid()
   AND public.can_access_ielts_speaking(storage_path,true)
   AND teacher_feedback IS NULL AND fluency_band IS NULL AND reviewed_by IS NULL);
CREATE POLICY "IELTS speaking tutor assess" ON public.ielts_speaking_recordings FOR UPDATE TO authenticated
 USING(public.same_tenant(tenant_id) AND (
  public.has_role(auth.uid(),'lecturer'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)))
 WITH CHECK(public.same_tenant(tenant_id) AND (
  public.has_role(auth.uid(),'lecturer'::public.app_role)
  OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
  OR public.has_role(auth.uid(),'centre_director'::public.app_role)
  OR public.has_role(auth.uid(),'superadmin'::public.app_role)));
-- A learner can delete their own evidence record; audio object deletion remains separately RLS-scoped.
CREATE POLICY "IELTS speaking learner delete" ON public.ielts_speaking_recordings FOR DELETE TO authenticated
 USING(public.same_tenant(tenant_id) AND student_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ielts_speaking_recordings TO authenticated;
COMMENT ON TABLE public.ielts_speaking_recordings IS
 'Student-consented private recordings and tutor formative feedback. Not official IELTS results.';
