-- Additive, separately reviewed forward SQL. Do not auto-apply to a hosted database.
-- Requires the learning plan/share tables and centre-specific role memberships.
-- Academic reports only. Do not use any field for health, safeguarding or identity records.
-- A tutor can withdraw one report for all readers without deleting or rewriting it.
-- Per-plan share revocation alone removes guardian access, not the learner’s own access.
-- The enum narrows concern codes; it does not classify sensitive free text.
BEGIN;

CREATE TABLE public.unipathway_tuition_reports (
 id uuid PRIMARY KEY,
 plan_id uuid NOT NULL REFERENCES public.unipathway_learning_plans(id),
 tenant_id uuid NOT NULL,
 module_id uuid NOT NULL,
 learner_id uuid NOT NULL,
 authored_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 summary text NOT NULL CHECK (length(summary) BETWEEN 1 AND 1000),
 strength text CHECK (length(strength) BETWEEN 1 AND 1000),
 focus text CHECK (length(focus) BETWEEN 1 AND 1000),
 next_action text CHECK (length(next_action) BETWEEN 1 AND 1000),
 concern text CHECK (concern IN ('practice_gap','attendance','engagement','follow_up')),
 audience text NOT NULL CHECK (audience IN ('shared','staff')),
 withdrawn_at timestamptz,
 withdrawn_by uuid,
 CHECK ((withdrawn_at IS NULL) = (withdrawn_by IS NULL))
);
ALTER TABLE public.unipathway_tuition_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_tuition_reports FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX unipathway_tuition_reports_latest
 ON public.unipathway_tuition_reports(plan_id,tenant_id,module_id,learner_id,created_at DESC,id DESC)
 WHERE withdrawn_at IS NULL;

-- Existing goal/skill consent does not grant access to narrative reports.
-- Removing the old share (including verification change) drops this opt-in.
CREATE TABLE public.unipathway_tuition_report_shares (
 plan_id uuid NOT NULL,
 link_id uuid NOT NULL,
 PRIMARY KEY (plan_id,link_id),
 FOREIGN KEY (plan_id,link_id)
  REFERENCES public.unipathway_learning_shares(plan_id,link_id) ON DELETE CASCADE
);
ALTER TABLE public.unipathway_tuition_report_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_tuition_report_shares FROM PUBLIC, anon, authenticated, service_role;

-- The currently chosen browser workspace role is not server-attested. Treat
-- exactly one verified centre membership role (or global superadmin) as
-- unambiguous; deny mixed roles rather than infer staff from a family request.
-- Do not use the legacy has_role helper: NULL-tenant legacy memberships are
-- not evidence of local role assignment. A director can read but not author.
CREATE FUNCTION unipathway_acl.tuition_report_scope(p_plan uuid)
RETURNS TABLE(tenant_id uuid,module_id uuid,learner_id uuid,lane text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 WITH actor AS (
   SELECT p.user_id,p.tenant_id
   FROM public.profiles p WHERE p.user_id=auth.uid() AND p.tenant_id IS NOT NULL
 ), active_role AS (
   SELECT a.user_id,a.tenant_id,min(ur.role::text) AS role
   FROM actor a JOIN public.user_roles ur ON ur.user_id=a.user_id AND (
     (ur.tenant_id=a.tenant_id AND ur.role::text<>'superadmin') OR
     (ur.tenant_id IS NULL AND ur.role::text='superadmin')
   )
   GROUP BY a.user_id,a.tenant_id HAVING count(DISTINCT ur.role)=1
 )
 SELECT m.tenant_id,m.id,p.student_id,
   CASE
     WHEN a.role='lecturer' AND m.lecturer_id=a.user_id THEN 'tutor'
     WHEN a.role='centre_director' THEN 'director'
     WHEN a.role='student' AND p.student_id=a.user_id THEN 'family'
     WHEN a.role='parent_guardian' AND EXISTS (
       SELECT 1 FROM public.unipathway_tuition_report_shares s
       JOIN public.parent_student_links l ON l.id=s.link_id
       WHERE s.plan_id=p.id AND l.parent_id=a.user_id AND l.student_id=p.student_id
         AND l.tenant_id=m.tenant_id AND l.verified IS TRUE
     ) THEN 'family'
     ELSE NULL
   END AS lane
 FROM public.unipathway_learning_plans p
 JOIN public.modules m ON m.id=p.module_id
 JOIN public.programmes pr ON pr.id=m.programme_id AND pr.tenant_id=m.tenant_id
 JOIN public.profiles learner ON learner.user_id=p.student_id AND learner.tenant_id=m.tenant_id
 JOIN active_role a ON a.tenant_id=m.tenant_id
 WHERE p.id=p_plan
   AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.student_id
               AND ur.tenant_id=m.tenant_id AND ur.role::text='student')
   AND EXISTS (SELECT 1 FROM public.student_enrolments e WHERE e.student_id=p.student_id
               AND e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id AND e.status='active')
$fn$;
REVOKE ALL ON FUNCTION unipathway_acl.tuition_report_scope(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.get_unipathway_tuition_reports(p_plan uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE scope record; result jsonb;
BEGIN
 SELECT * INTO scope FROM unipathway_acl.tuition_report_scope(p_plan);
 IF NOT FOUND OR scope.lane IS NULL THEN
   RAISE EXCEPTION 'Tuition report access is unavailable' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO result
 FROM (
   SELECT t.id,t.created_at,t.summary,t.strength,t.focus,t.next_action,t.concern,t.audience
   FROM public.unipathway_tuition_reports t
   WHERE t.plan_id=p_plan AND t.tenant_id=scope.tenant_id AND t.module_id=scope.module_id
     AND t.learner_id=scope.learner_id AND t.withdrawn_at IS NULL
     AND (scope.lane IN ('tutor','director') OR t.audience='shared')
   ORDER BY t.created_at DESC,t.id DESC LIMIT 20
 ) r;
 RETURN result;
END
$fn$;

CREATE FUNCTION public.add_unipathway_tuition_report(
 p_plan uuid,p_id uuid,p_summary text,p_strength text,p_focus text,p_next_action text,p_concern text,p_audience text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE scope record; stored public.unipathway_tuition_reports;
summary_text text:=nullif(btrim(p_summary),'');
strength_text text:=nullif(btrim(p_strength),'');
focus_text text:=nullif(btrim(p_focus),'');
next_text text:=nullif(btrim(p_next_action),'');
concern_code text:=nullif(btrim(p_concern),'');
BEGIN
 SELECT * INTO scope FROM unipathway_acl.tuition_report_scope(p_plan);
 IF NOT FOUND OR scope.lane IS DISTINCT FROM 'tutor' THEN
   RAISE EXCEPTION 'Tuition report access is unavailable' USING ERRCODE='42501';
 END IF;
 IF p_id IS NULL OR summary_text IS NULL OR summary_text !~ '[^[:space:]]' OR length(summary_text)>1000 OR
    length(strength_text)>1000 OR length(focus_text)>1000 OR length(next_text)>1000 OR
    (concern_code IS NOT NULL AND concern_code NOT IN ('practice_gap','attendance','engagement','follow_up')) OR
    p_audience IS NULL OR p_audience NOT IN ('shared','staff') THEN
   RAISE EXCEPTION 'Check the tuition report fields' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.unipathway_tuition_reports(
   id,plan_id,tenant_id,module_id,learner_id,authored_by,summary,strength,focus,next_action,concern,audience
 ) VALUES(
   p_id,p_plan,scope.tenant_id,scope.module_id,scope.learner_id,auth.uid(),
   summary_text,strength_text,focus_text,next_text,concern_code,p_audience
 ) ON CONFLICT(id) DO NOTHING RETURNING * INTO stored;
 IF FOUND THEN RETURN stored.id; END IF;
 -- A retry only confirms the same report by the same still-authorised author.
 -- It cannot edit or repurpose a UUID, even after a module is reassigned.
 SELECT * INTO stored FROM public.unipathway_tuition_reports t WHERE t.id=p_id;
 IF FOUND AND stored.withdrawn_at IS NULL AND
    (stored.plan_id,stored.tenant_id,stored.module_id,stored.learner_id,stored.authored_by,
     stored.summary,stored.strength,stored.focus,stored.next_action,stored.concern,stored.audience)
    IS NOT DISTINCT FROM
    (p_plan,scope.tenant_id,scope.module_id,scope.learner_id,auth.uid(),
     summary_text,strength_text,focus_text,next_text,concern_code,p_audience) THEN
   RETURN stored.id;
 END IF;
 RAISE EXCEPTION 'Tuition report could not be confirmed' USING ERRCODE='22023';
END
$fn$;

-- Withdrawal is one-way, available only to the current assigned tutor.
-- The original author and narrative stay intact for controlled audit.
CREATE FUNCTION public.withdraw_unipathway_tuition_report(p_plan uuid,p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE scope record;
BEGIN
 SELECT * INTO scope FROM unipathway_acl.tuition_report_scope(p_plan);
 IF NOT FOUND OR scope.lane IS DISTINCT FROM 'tutor' THEN
   RAISE EXCEPTION 'Tuition report access is unavailable' USING ERRCODE='42501';
 END IF;
 UPDATE public.unipathway_tuition_reports t
 SET withdrawn_at=now(), withdrawn_by=auth.uid()
 WHERE t.id=p_id AND t.plan_id=p_plan AND t.tenant_id=scope.tenant_id
   AND t.module_id=scope.module_id AND t.learner_id=scope.learner_id AND t.withdrawn_at IS NULL;
 IF FOUND THEN RETURN p_id; END IF;
 -- A lost response may be retried, but only from the same current scope.
 IF EXISTS (SELECT 1 FROM public.unipathway_tuition_reports t
            WHERE t.id=p_id AND t.plan_id=p_plan AND t.tenant_id=scope.tenant_id
              AND t.module_id=scope.module_id AND t.learner_id=scope.learner_id
              AND t.withdrawn_at IS NOT NULL) THEN
   RETURN p_id;
 END IF;
 RAISE EXCEPTION 'Tuition report access is unavailable' USING ERRCODE='42501';
END
$fn$;
REVOKE ALL ON FUNCTION public.withdraw_unipathway_tuition_report(uuid,uuid)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_unipathway_tuition_report(uuid,uuid)
 TO authenticated;

-- Only the verified learner can opt in each already verified, explicitly
-- shared guardian relationship. No legacy grant is converted automatically.
CREATE FUNCTION public.set_unipathway_tuition_report_share(p_plan uuid,p_link uuid,p_share boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE scope record; guardian_link public.parent_student_links;
BEGIN
 SELECT * INTO scope FROM unipathway_acl.tuition_report_scope(p_plan);
 IF NOT FOUND OR scope.lane IS DISTINCT FROM 'family' OR scope.learner_id IS DISTINCT FROM auth.uid()
    OR p_share IS NULL THEN
   RAISE EXCEPTION 'Tuition report sharing is unavailable' USING ERRCODE='42501';
 END IF;
 -- Use the existing guardian-share lock order. The baseline share's FK
 -- serializes insert vs removal, and cascades consent on removal.
 SELECT * INTO guardian_link FROM public.parent_student_links l
 WHERE l.id=p_link AND l.student_id=scope.learner_id AND l.tenant_id=scope.tenant_id
 FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Tuition report sharing is unavailable' USING ERRCODE='42501';
 END IF;
 IF NOT p_share THEN
   DELETE FROM public.unipathway_tuition_report_shares r WHERE r.plan_id=p_plan AND r.link_id=p_link;
   RETURN;
 END IF;
 IF guardian_link.verified IS NOT TRUE OR NOT EXISTS (
   SELECT 1 FROM public.profiles p JOIN public.user_roles u ON u.user_id=p.user_id
   WHERE p.user_id=guardian_link.parent_id AND p.tenant_id=scope.tenant_id
     AND u.tenant_id=scope.tenant_id AND u.role::text='parent_guardian'
 ) OR NOT EXISTS (
   SELECT 1 FROM public.unipathway_learning_shares s WHERE s.plan_id=p_plan AND s.link_id=p_link
 ) THEN
   RAISE EXCEPTION 'Tuition report sharing is unavailable' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.unipathway_tuition_report_shares(plan_id,link_id) VALUES (p_plan,p_link)
 ON CONFLICT (plan_id,link_id) DO NOTHING;
END
$fn$;

CREATE FUNCTION public.get_unipathway_tuition_report_share_options(p_plan uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE scope record; result jsonb;
BEGIN
 SELECT * INTO scope FROM unipathway_acl.tuition_report_scope(p_plan);
 IF NOT FOUND OR scope.lane IS DISTINCT FROM 'family' OR scope.learner_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Tuition report sharing is unavailable' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'name',p.full_name,'shared',r.link_id IS NOT NULL)
                           ORDER BY p.full_name,l.id),'[]'::jsonb) INTO result
 FROM public.unipathway_learning_shares s
 JOIN public.parent_student_links l ON l.id=s.link_id
 JOIN public.profiles p ON p.user_id=l.parent_id AND p.tenant_id=l.tenant_id
 LEFT JOIN public.unipathway_tuition_report_shares r ON r.plan_id=s.plan_id AND r.link_id=s.link_id
 WHERE s.plan_id=p_plan AND l.student_id=scope.learner_id AND l.tenant_id=scope.tenant_id
   AND l.verified IS TRUE AND EXISTS (
     SELECT 1 FROM public.user_roles u WHERE u.user_id=l.parent_id
       AND u.tenant_id=l.tenant_id AND u.role::text='parent_guardian'
   );
 RETURN result;
END
$fn$;

CREATE FUNCTION public.get_unipathway_tuition_director_roster()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE centre uuid; result jsonb;
BEGIN
 SELECT p.tenant_id INTO centre
 FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.user_id AND (
   (ur.tenant_id=p.tenant_id AND ur.role::text<>'superadmin') OR
   (ur.tenant_id IS NULL AND ur.role::text='superadmin')
 )
 WHERE p.user_id=auth.uid() AND p.tenant_id IS NOT NULL
 GROUP BY p.tenant_id HAVING count(DISTINCT ur.role)=1 AND min(ur.role::text)='centre_director';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Tuition report access is unavailable' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'module_title',m.title,'student_name',s.full_name)
                           ORDER BY m.title,s.full_name,p.id),'[]'::jsonb) INTO result
 FROM public.unipathway_learning_plans p
 JOIN public.modules m ON m.id=p.module_id AND m.tenant_id=centre
 JOIN public.profiles s ON s.user_id=p.student_id AND s.tenant_id=centre
 CROSS JOIN LATERAL unipathway_acl.tuition_report_scope(p.id) authorised
 WHERE authorised.lane='director';
 RETURN result;
END
$fn$;

REVOKE ALL ON FUNCTION public.set_unipathway_tuition_report_share(uuid,uuid,boolean),
 public.get_unipathway_tuition_report_share_options(uuid),public.get_unipathway_tuition_director_roster()
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_unipathway_tuition_report_share(uuid,uuid,boolean),
 public.get_unipathway_tuition_report_share_options(uuid),public.get_unipathway_tuition_director_roster()
 TO authenticated;

REVOKE ALL ON FUNCTION public.get_unipathway_tuition_reports(uuid),
 public.add_unipathway_tuition_report(uuid,uuid,text,text,text,text,text,text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unipathway_tuition_reports(uuid),
 public.add_unipathway_tuition_report(uuid,uuid,text,text,text,text,text,text)
 TO authenticated;
COMMIT;
