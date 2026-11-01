-- UniPathway Phase D1: isolated FORWARD PATCH, NOT yet a production migration.
-- Do not replay all 200+ repository migrations against the hosted Lovable database.
-- Apply ONLY to a separately approved UniPathway staging DB first. No Dishbee access.
-- Creating this file changes source code only: no SQL is executed remotely.
BEGIN;

CREATE TABLE public.unipathway_course_specifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 board_key text NOT NULL CHECK (board_key IN (
  'othm','qualifi','athe','iab','pearson-btec','pearson-edexcel',
  'cambridge','fbise','bise-rawalpindi','bise-lahore','bise-other','aku-eb','navttc'
 )),
 qualification_title text NOT NULL CHECK (length(btrim(qualification_title)) BETWEEN 5 AND 180),
 qualification_code text NOT NULL CHECK (length(btrim(qualification_code)) BETWEEN 2 AND 100),
 subject text NOT NULL CHECK (length(btrim(subject)) BETWEEN 2 AND 160),
 syllabus_code text NOT NULL CHECK (length(btrim(syllabus_code)) BETWEEN 2 AND 100),
 specification_version text NOT NULL CHECK (length(btrim(specification_version)) BETWEEN 2 AND 100),
 exam_session text NOT NULL CHECK (length(btrim(exam_session)) BETWEEN 2 AND 120),
 specification_source_url text NOT NULL CHECK (
  length(specification_source_url) BETWEEN 12 AND 1000
  AND specification_source_url ~ '^https://[^[:space:]]+$'
 ),
 module_id uuid REFERENCES public.modules(id),
 authorisation_status text NOT NULL DEFAULT 'unverified'
  CHECK (authorisation_status = 'unverified'),
 review_status text NOT NULL DEFAULT 'draft'
  CHECK (review_status IN ('draft','reviewed','withdrawn')),
 created_by uuid NOT NULL,
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (review_status <> 'reviewed' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 UNIQUE (tenant_id,board_key,qualification_code,subject,syllabus_code,specification_version,exam_session)
);
CREATE INDEX course_spec_centre_module_idx
 ON public.unipathway_course_specifications(tenant_id,module_id,review_status);
ALTER TABLE public.unipathway_course_specifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_course_specifications FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.unipathway_course_specifications TO authenticated;

CREATE TABLE public.unipathway_material_rights (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL,
 module_id uuid NOT NULL REFERENCES public.modules(id),
 material_id uuid NOT NULL REFERENCES public.unipathway_module_materials(id),
 specification_id uuid NOT NULL REFERENCES public.unipathway_course_specifications(id),
 rights_basis text NOT NULL CHECK (rights_basis IN ('original_work','licensed_redistribution','official_link_only')),
 rights_holder text NOT NULL CHECK (length(btrim(rights_holder)) BETWEEN 3 AND 180),
 evidence_reference text NOT NULL CHECK (length(btrim(evidence_reference)) BETWEEN 8 AND 500),
 distribution_scope text NOT NULL DEFAULT 'enrolled_module_only'
  CHECK (distribution_scope='enrolled_module_only'),
 expires_at timestamptz,
 review_status text NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending','approved','withdrawn')),
 created_by uuid NOT NULL,
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (review_status <> 'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK (review_status <> 'approved' OR rights_basis <> 'official_link_only'),
 CHECK (review_status <> 'approved' OR expires_at IS NULL OR expires_at > created_at),
 CHECK (rights_basis <> 'licensed_redistribution' OR expires_at IS NOT NULL)
);
CREATE UNIQUE INDEX course_active_rights_one_per_material
 ON public.unipathway_material_rights(material_id)
 WHERE review_status IN ('pending','approved');
CREATE INDEX course_rights_centre_review_idx
 ON public.unipathway_material_rights(tenant_id,review_status,material_id);
ALTER TABLE public.unipathway_material_rights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_material_rights FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.unipathway_material_rights TO authenticated;

-- Static verified centre role, never editable user_metadata or a client-supplied role.
CREATE FUNCTION unipathway_acl.course_registry_manager(p_tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
 SELECT auth.uid() IS NOT NULL
  AND p_tenant = public.get_user_tenant_id(auth.uid())
  AND (
   public.has_role(auth.uid(),'centre_director'::public.app_role)
   OR public.has_role(auth.uid(),'programme_leader'::public.app_role)
   OR public.has_role(auth.uid(),'superadmin'::public.app_role)
  )
$fn$;

CREATE FUNCTION unipathway_acl.course_spec_module_valid(p_tenant uuid,p_module uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
 SELECT p_module IS NULL OR EXISTS (
  SELECT 1 FROM public.modules m WHERE m.id=p_module AND m.tenant_id=p_tenant
 )
$fn$;

CREATE POLICY "registry centre leaders or assigned lecturer read"
 ON public.unipathway_course_specifications
 FOR SELECT TO authenticated
 USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) AND (
   unipathway_acl.course_registry_manager(tenant_id)
   OR (module_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.modules m
     WHERE m.id=unipathway_course_specifications.module_id AND m.tenant_id=unipathway_course_specifications.tenant_id AND m.lecturer_id=auth.uid()
   ))
  )
 );
CREATE POLICY "registry centre leaders create unverified drafts only"
 ON public.unipathway_course_specifications
 FOR INSERT TO authenticated
 WITH CHECK (
  unipathway_acl.course_registry_manager(tenant_id)
  AND created_by=auth.uid() AND review_status='draft'
  AND authorisation_status='unverified' AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND unipathway_acl.course_spec_module_valid(tenant_id,module_id)
 );

CREATE POLICY "rights approved reviewers and assigned lecturers read"
 ON public.unipathway_material_rights
 FOR SELECT TO authenticated
 USING (
  tenant_id=public.get_user_tenant_id(auth.uid())
  AND (unipathway_acl.course_registry_manager(tenant_id)
       OR public.can_manage_unipathway_module(module_id))
 );
CREATE POLICY "rights allocated teachers propose evidence only"
 ON public.unipathway_material_rights
 FOR INSERT TO authenticated
 WITH CHECK (
  created_by=auth.uid() AND review_status='pending'
  AND reviewed_by IS NULL AND reviewed_at IS NULL
  AND tenant_id=public.get_user_tenant_id(auth.uid())
  AND public.can_manage_unipathway_module(module_id)
  AND EXISTS(
   SELECT 1 FROM public.unipathway_module_materials m
   JOIN public.unipathway_course_specifications s
     ON s.id=specification_id
   WHERE m.id=unipathway_material_rights.material_id
    AND m.tenant_id=unipathway_material_rights.tenant_id AND m.module_id=unipathway_material_rights.module_id
    AND m.publication_status='draft'
    AND s.tenant_id=unipathway_material_rights.tenant_id AND s.module_id=m.module_id
  )
 );

-- Rights validation is a single scoped query: expiry, specification and module must all agree.
CREATE FUNCTION unipathway_acl.course_rights_active(p_material uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM public.unipathway_material_rights r
   JOIN public.unipathway_course_specifications s ON s.id=r.specification_id
   JOIN public.unipathway_module_materials m ON m.id=r.material_id
  WHERE r.material_id=p_material
   AND r.review_status='approved'
   AND r.rights_basis IN ('original_work','licensed_redistribution')
   AND (r.expires_at IS NULL OR r.expires_at>now())
   AND s.review_status='reviewed'
   AND s.tenant_id=r.tenant_id AND s.module_id=r.module_id
   AND m.tenant_id=r.tenant_id AND m.module_id=r.module_id
 )
$fn$;

CREATE FUNCTION unipathway_acl.guard_course_material_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
 IF NEW.publication_status='published' AND NOT unipathway_acl.course_rights_active(NEW.id)
 THEN RAISE EXCEPTION 'Approved current rights and reviewed specification required before publishing material'
  USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END
$fn$;
CREATE TRIGGER unipathway_course_material_publish_guard
 BEFORE INSERT OR UPDATE ON public.unipathway_module_materials
 FOR EACH ROW EXECUTE FUNCTION unipathway_acl.guard_course_material_publication();

-- RLS protects existing published materials even after rights expiry/withdrawal.
-- This restrictive policy is combined with (not a substitute for) existing module RLS.
CREATE POLICY "course current-rights material read boundary"
 ON public.unipathway_module_materials AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
  publication_status <> 'published'
  OR public.can_manage_unipathway_module(module_id)
  OR unipathway_acl.course_rights_active(id)
 );
-- Signed Storage URLs are separately scoped. No new public bucket is created.
CREATE POLICY "course current-rights private file boundary"
 ON storage.objects AS RESTRICTIVE
 FOR SELECT TO authenticated USING (
  bucket_id <> 'unipathway-module-materials'
  OR EXISTS(
   SELECT 1 FROM public.unipathway_module_materials m
    WHERE m.object_path=name
      AND (
       public.can_manage_unipathway_module(m.module_id)
       OR (m.publication_status='published' AND unipathway_acl.course_rights_active(m.id))
      )
  )
 );

-- Read/approve draft syllabus SOURCE, not the centre's external award status.
CREATE FUNCTION public.review_unipathway_course_specification(p_spec uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v public.unipathway_course_specifications%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_decision NOT IN ('reviewed','withdrawn')
 THEN RAISE EXCEPTION 'Invalid review request' USING ERRCODE='42501';END IF;
 SELECT * INTO v FROM public.unipathway_course_specifications WHERE id=p_spec FOR UPDATE;
 IF NOT FOUND OR NOT unipathway_acl.course_registry_manager(v.tenant_id)
 THEN RAISE EXCEPTION 'Academic management access required' USING ERRCODE='42501';END IF;
 IF p_decision='reviewed' AND (v.review_status<>'draft' OR v.created_by=auth.uid())
 THEN RAISE EXCEPTION 'A separate authorised reviewer must review a draft specification' USING ERRCODE='42501';END IF;
 IF p_decision='withdrawn' AND v.review_status NOT IN ('draft','reviewed')
 THEN RAISE EXCEPTION 'Specification already withdrawn' USING ERRCODE='42501';END IF;
 UPDATE public.unipathway_course_specifications SET
  review_status=p_decision,reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=v.id;
 -- No external centre authorisation or exam registration is inferred.
END
$fn$;

CREATE FUNCTION public.review_unipathway_material_rights(p_right uuid,p_decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE r public.unipathway_material_rights%ROWTYPE;
DECLARE s public.unipathway_course_specifications%ROWTYPE;
DECLARE m public.unipathway_module_materials%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_decision NOT IN ('approved','withdrawn')
 THEN RAISE EXCEPTION 'Invalid rights decision' USING ERRCODE='42501';END IF;
 SELECT * INTO r FROM public.unipathway_material_rights WHERE id=p_right FOR UPDATE;
 IF NOT FOUND OR NOT unipathway_acl.course_registry_manager(r.tenant_id)
 THEN RAISE EXCEPTION 'Independent centre management review required' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.unipathway_course_specifications WHERE id=r.specification_id;
 SELECT * INTO m FROM public.unipathway_module_materials WHERE id=r.material_id FOR UPDATE;
 IF NOT FOUND OR s.id IS NULL OR s.tenant_id IS DISTINCT FROM r.tenant_id OR s.module_id IS DISTINCT FROM r.module_id
 OR m.tenant_id IS DISTINCT FROM r.tenant_id OR m.module_id IS DISTINCT FROM r.module_id
 THEN RAISE EXCEPTION 'Rights evidence does not match an authorised source and module' USING ERRCODE='42501';END IF;
 IF p_decision='approved' AND (
  r.review_status<>'pending' OR r.created_by=auth.uid()
  OR s.review_status<>'reviewed' OR m.publication_status<>'draft'
  OR r.rights_basis='official_link_only'
  OR (r.expires_at IS NOT NULL AND r.expires_at<=now())
 ) THEN RAISE EXCEPTION 'A separate manager must verify current redistributable rights' USING ERRCODE='42501';END IF;
 IF p_decision='withdrawn' AND r.review_status='withdrawn'
 THEN RAISE EXCEPTION 'Rights already withdrawn' USING ERRCODE='42501';END IF;
 UPDATE public.unipathway_material_rights SET review_status=p_decision,
  reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id;
END
$fn$;

REVOKE ALL ON FUNCTION unipathway_acl.course_registry_manager(uuid),
 unipathway_acl.course_spec_module_valid(uuid,uuid),
 unipathway_acl.course_rights_active(uuid),
 unipathway_acl.guard_course_material_publication() FROM PUBLIC;
GRANT USAGE ON SCHEMA unipathway_acl TO authenticated;
GRANT EXECUTE ON FUNCTION unipathway_acl.course_registry_manager(uuid),
 unipathway_acl.course_spec_module_valid(uuid,uuid),
 unipathway_acl.course_rights_active(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.review_unipathway_course_specification(uuid,text),
 public.review_unipathway_material_rights(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_unipathway_course_specification(uuid,text),
 public.review_unipathway_material_rights(uuid,text) TO authenticated;
COMMIT;
