-- Teams is the only live media provider. Plans do not invoke Teams or claim live room state.
BEGIN;
CREATE TABLE public.unipathway_teams_teaching_plans (
 session_id uuid PRIMARY KEY REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 groups jsonb NOT NULL DEFAULT '[]'::jsonb,
 instructions text NOT NULL DEFAULT '' CHECK(length(instructions)<=4000),
 duration_minutes integer NOT NULL DEFAULT 15 CHECK(duration_minutes BETWEEN 1 AND 180),
 revision bigint NOT NULL DEFAULT 1,
 updated_by uuid NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_teams_teaching_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allocated teachers read teaching plans" ON public.unipathway_teams_teaching_plans
 FOR SELECT TO authenticated USING(public.can_manage_unipathway_class(session_id));
GRANT SELECT ON public.unipathway_teams_teaching_plans TO authenticated;
-- Definer RPCs expose only the caller's assignment; no direct learner roster/table grant.
CREATE FUNCTION public.get_unipathway_teams_plan(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_manager boolean; v_plan public.unipathway_teams_teaching_plans; v_roster jsonb; v_groups jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_join_unipathway_class(p_session) THEN RAISE EXCEPTION 'Class access denied'; END IF;
 v_manager:=public.can_manage_unipathway_class(p_session);
 SELECT * INTO v_plan FROM public.unipathway_teams_teaching_plans WHERE session_id=p_session;
 IF v_manager THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.user_id,'name',coalesce(p.full_name,'Learner')) ORDER BY i.user_id),'[]'::jsonb) INTO v_roster
  FROM public.live_class_invitations i JOIN public.live_class_sessions s ON s.id=i.session_id AND s.tenant_id=i.tenant_id
  JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id
  LEFT JOIN public.profiles p ON p.user_id=i.user_id AND p.tenant_id=s.tenant_id
  WHERE i.session_id=p_session AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now())
  AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.student_id=i.user_id AND e.programme_id=m.programme_id AND e.tenant_id=s.tenant_id AND e.status='active');
  v_groups:=coalesce(v_plan.groups,'[]');
 ELSE
  SELECT coalesce(jsonb_agg(jsonb_build_object('name',g->>'name','task',g->>'task')),'[]') INTO v_groups
  FROM jsonb_array_elements(coalesce(v_plan.groups,'[]')) g WHERE (g->'members') ? auth.uid()::text;
  v_roster:='[]';
 END IF;
 RETURN jsonb_build_object('can_manage',v_manager,'groups',v_groups,'roster',v_roster,'revision',coalesce(v_plan.revision,0),
  'instructions',coalesce(v_plan.instructions,''),'duration_minutes',coalesce(v_plan.duration_minutes,15),'updated_at',v_plan.updated_at);
END $$;
CREATE FUNCTION public.save_unipathway_teams_plan(p_session uuid,p_revision bigint,p_groups jsonb,p_instructions text,p_duration integer) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_revision bigint; g jsonb; member text; seen uuid[]:='{}'; clean jsonb:='[]'; members jsonb; v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_unipathway_class(p_session) THEN RAISE EXCEPTION 'Class management denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.live_class_sessions WHERE id=p_session AND status IN ('scheduled','live') AND provider='microsoft_teams') THEN RAISE EXCEPTION 'Active Teams class required'; END IF;
 IF p_revision IS NULL OR p_groups IS NULL OR jsonb_typeof(p_groups)<>'array' OR jsonb_array_length(p_groups)>50
 OR p_instructions IS NULL OR length(p_instructions)>4000 OR p_duration IS NULL OR p_duration NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Invalid teaching plan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_session::text,17));
 SELECT revision INTO v_revision FROM public.unipathway_teams_teaching_plans WHERE session_id=p_session;
 IF coalesce(v_revision,0)<>p_revision THEN RAISE EXCEPTION 'Plan changed. Refresh before saving.'; END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
  IF jsonb_typeof(g)<>'object' OR coalesce(length(trim(g->>'name')),0) NOT BETWEEN 1 AND 80
   OR coalesce(length(g->>'task'),0)>2000 OR jsonb_typeof(g->'members') IS DISTINCT FROM 'array'
   OR jsonb_array_length(g->'members') NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid group'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(clean) c WHERE c->>'name'=trim(g->>'name')) THEN RAISE EXCEPTION 'Group names must be unique'; END IF;
  members:='[]';
  FOR member IN SELECT value FROM jsonb_array_elements_text(g->'members') LOOP
   v_id:=member::uuid;
   IF v_id=ANY(seen) OR cardinality(seen)>=1000 THEN RAISE EXCEPTION 'Duplicate learner or plan too large'; END IF;
   IF NOT EXISTS(
    SELECT 1 FROM public.live_class_invitations i JOIN public.live_class_sessions s ON s.id=i.session_id AND s.tenant_id=i.tenant_id
    JOIN public.modules m ON m.id=s.module_id AND m.tenant_id=s.tenant_id
    JOIN public.student_enrolments e ON e.student_id=i.user_id AND e.programme_id=m.programme_id AND e.tenant_id=s.tenant_id AND e.status='active'
    WHERE i.session_id=p_session AND i.user_id=v_id AND i.status IN ('invited','accepted') AND (i.expires_at IS NULL OR i.expires_at>now())
   ) THEN RAISE EXCEPTION 'Every group member must have an active enrolment and class invitation'; END IF;
   seen:=array_append(seen,v_id);members:=members||jsonb_build_array(v_id::text);
  END LOOP;
  clean:=clean||jsonb_build_array(jsonb_build_object('name',trim(g->>'name'),'task',coalesce(g->>'task',''),'members',members));
 END LOOP;
 INSERT INTO public.unipathway_teams_teaching_plans(session_id,groups,instructions,duration_minutes,revision,updated_by)
 VALUES(p_session,clean,p_instructions,p_duration,1,auth.uid())
 ON CONFLICT(session_id) DO UPDATE SET groups=EXCLUDED.groups,instructions=EXCLUDED.instructions,duration_minutes=EXCLUDED.duration_minutes,
 revision=unipathway_teams_teaching_plans.revision+1,updated_by=auth.uid(),updated_at=now() RETURNING revision INTO v_revision;
 RETURN v_revision;
END $$;
REVOKE ALL ON FUNCTION public.get_unipathway_teams_plan(uuid),public.save_unipathway_teams_plan(uuid,bigint,jsonb,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_teams_plan(uuid),public.save_unipathway_teams_plan(uuid,bigint,jsonb,text,integer) TO authenticated;
GRANT SELECT ON public.live_class_sessions,public.lesson_whiteboards,public.live_class_artifacts TO authenticated;
GRANT SELECT ON public.microsoft_brand_profiles,public.teams_class_templates,public.microsoft_education_accounts TO authenticated;
COMMIT;
