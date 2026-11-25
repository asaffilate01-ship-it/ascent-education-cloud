-- Controlled forward candidate. Requires accepted onboarding review and core learning schemas.
CREATE SCHEMA unipathway_module_allocation;
REVOKE ALL ON SCHEMA unipathway_module_allocation FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_module_allocation TO authenticated;
CREATE TABLE unipathway_module_allocation.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,writes_enabled boolean NOT NULL DEFAULT false,
 CHECK(NOT writes_enabled OR reads_enabled)
);
INSERT INTO unipathway_module_allocation.activation_gate DEFAULT VALUES;
CREATE TABLE unipathway_module_allocation.decisions(
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 module_id uuid NOT NULL REFERENCES public.modules(id),previous_lecturer uuid REFERENCES auth.users(id),
 lecturer_id uuid REFERENCES auth.users(id),review_id uuid REFERENCES public.onboarding_teaching_reviews(id),
 module_scope jsonb NOT NULL CHECK(jsonb_typeof(module_scope)='object'),declaration jsonb,
 expected_updated_at timestamptz NOT NULL,decision_note text NOT NULL CHECK(length(btrim(decision_note)) BETWEEN 5 AND 1000),
 recorded_by uuid NOT NULL REFERENCES auth.users(id),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),transaction_id bigint NOT NULL,
 CHECK((lecturer_id IS NULL AND review_id IS NULL AND declaration IS NULL) OR
 (lecturer_id IS NOT NULL AND review_id IS NOT NULL AND declaration IS NOT NULL AND lecturer_id<>recorded_by))
);
CREATE INDEX allocation_module_history ON unipathway_module_allocation.decisions(tenant_id,module_id,recorded_at DESC,id);
ALTER TABLE unipathway_module_allocation.activation_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_module_allocation.decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_module_allocation FROM PUBLIC,anon,authenticated;
CREATE FUNCTION unipathway_module_allocation.manager(t uuid,u uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT u IS NOT NULL AND t IS NOT NULL AND public.get_user_tenant_id(u)=t AND EXISTS(
 SELECT 1 FROM public.user_roles r WHERE r.user_id=u AND ((r.role::text='centre_director' AND r.tenant_id=t) OR (r.role::text='superadmin' AND r.tenant_id IS NULL)))
$$;
CREATE FUNCTION unipathway_module_allocation.actor(p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 t:=public.get_user_tenant_id(auth.uid());
 IF NOT coalesce(unipathway_module_allocation.manager(t,auth.uid()),false) THEN RAISE EXCEPTION 'Verified centre director or selected-centre owner required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM unipathway_module_allocation.activation_gate g WHERE g.singleton AND g.reads_enabled AND (NOT p_write OR g.writes_enabled)) THEN RAISE EXCEPTION 'Reviewed allocation is not activated' USING ERRCODE='55000'; END IF;
 RETURN t;
END $$;
CREATE FUNCTION unipathway_module_allocation.scope(m public.modules) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('module_id',m.id,'programme_id',p.id,'module_title',m.title,'module_code',m.code,'programme_title',p.title,'level',p.level,'awarding_body',p.awarding_body)
 FROM public.programmes p WHERE p.id=m.programme_id AND p.tenant_id=m.tenant_id
$$;
CREATE FUNCTION unipathway_module_allocation.current_review(t uuid,u uuid,rid uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.onboarding_teaching_reviews%ROWTYPE; d jsonb; prefix text; snapshot jsonb;
BEGIN
 IF u IS NULL OR rid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles v ON v.user_id=p.user_id AND v.tenant_id=p.tenant_id WHERE p.user_id=u AND p.tenant_id=t AND v.role::text='lecturer') THEN RETURN NULL; END IF;
 SELECT * INTO r FROM public.onboarding_teaching_reviews WHERE id=rid AND tenant_id=t AND lecturer_id=u;
 IF NOT FOUND OR r.decision<>'approved' OR r.reviewed_by=u OR NOT coalesce(unipathway_module_allocation.manager(t,r.reviewed_by),false)
 OR EXISTS(SELECT 1 FROM public.onboarding_teaching_reviews later WHERE later.tenant_id=t AND later.lecturer_id=u AND later.slot=r.slot AND ROW(later.reviewed_at,later.id)>ROW(r.reviewed_at,r.id)) THEN RETURN NULL; END IF;
 SELECT answers INTO d FROM public.onboarding_application_drafts WHERE tenant_id=t AND user_id=u AND kind='lecturer';
 IF NOT FOUND THEN RETURN NULL; END IF;
 prefix:='Competency '||r.slot||' — ';
 snapshot:=jsonb_build_object('subject',coalesce(d->>(prefix||'Subject'),''),'framework',coalesce(d->>(prefix||'Curriculum / awarding body'),''),'level',coalesce(d->>(prefix||'Maximum level / grade'),''),'experience',coalesce(d->>(prefix||'Relevant qualification or experience'),''));
 IF snapshot IS DISTINCT FROM r.declaration OR btrim(snapshot->>'subject')='' OR btrim(snapshot->>'framework')='' OR btrim(snapshot->>'level')='' THEN RETURN NULL; END IF;
 RETURN snapshot;
END $$;
CREATE FUNCTION unipathway_module_allocation.receipt(d unipathway_module_allocation.decisions) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',d.id,'tenant_id',d.tenant_id,'module_id',d.module_id,'previous_lecturer',d.previous_lecturer,
 'lecturer_id',d.lecturer_id,'review_id',d.review_id,'module_scope',d.module_scope,'recorded_by',d.recorded_by,'recorded_at',d.recorded_at)
$$;
CREATE FUNCTION unipathway_module_allocation.read_module(p_module uuid,p_lecturer uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;m public.modules%ROWTYPE;s jsonb;people jsonb;reviews jsonb:='[]'::jsonb;d unipathway_module_allocation.decisions%ROWTYPE;verified boolean;
BEGIN
 t:=unipathway_module_allocation.actor(false);
 SELECT * INTO m FROM public.modules WHERE id=p_module AND tenant_id=t;
 IF NOT FOUND THEN RAISE EXCEPTION 'Module unavailable in this centre' USING ERRCODE='42501'; END IF;
 s:=unipathway_module_allocation.scope(m);
 IF s IS NULL THEN RAISE EXCEPTION 'Programme mapping unavailable'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.name,x.id),'[]'::jsonb) INTO people FROM(
  SELECT p.user_id AS id,coalesce(nullif(btrim(p.full_name),''),'Lecturer account') AS name FROM public.profiles p
  WHERE p.tenant_id=t AND p.user_id<>auth.uid() AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p.user_id AND r.tenant_id=t AND r.role::text='lecturer')
  ORDER BY p.user_id LIMIT 501
 ) x;
 IF jsonb_array_length(people)>500 THEN RAISE EXCEPTION 'Roster exceeds review limit; request a paginated centre report'; END IF;
 IF p_lecturer IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(people) x WHERE x->>'id'=p_lecturer::text) THEN RAISE EXCEPTION 'Lecturer unavailable in this centre'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.slot),'[]'::jsonb) INTO reviews FROM(
   SELECT r.id,r.slot,r.subject,r.framework,r.maximum_level,r.reviewed_at
   FROM public.onboarding_teaching_reviews r WHERE r.tenant_id=t AND r.lecturer_id=p_lecturer
   AND unipathway_module_allocation.current_review(t,p_lecturer,r.id) IS NOT NULL
   ORDER BY r.slot LIMIT 21
  ) x;
  IF jsonb_array_length(reviews)>20 THEN RAISE EXCEPTION 'Ambiguous competency history'; END IF;
 END IF;
 SELECT * INTO d FROM unipathway_module_allocation.decisions WHERE tenant_id=t AND module_id=m.id ORDER BY recorded_at DESC,id DESC LIMIT 1;
 verified:=d.id IS NOT NULL AND d.lecturer_id IS NOT DISTINCT FROM m.lecturer_id AND d.module_scope=s AND
 (m.lecturer_id IS NULL OR unipathway_module_allocation.current_review(t,m.lecturer_id,d.review_id) IS NOT DISTINCT FROM d.declaration AND d.declaration IS NOT NULL);
 RETURN jsonb_build_object('tenant_id',t,'module_id',m.id,'current_lecturer',m.lecturer_id,'updated_at',m.updated_at,'module_scope',s,
 'people',people,'selected_lecturer',p_lecturer,'reviews',reviews,'latest_decision',CASE WHEN d.id IS NULL THEN NULL ELSE unipathway_module_allocation.receipt(d) END,'decision_current',coalesce(verified,false),
 'writes_enabled',(SELECT g.writes_enabled FROM unipathway_module_allocation.activation_gate g WHERE g.singleton));
END $$;
-- The private decision row is the transaction-specific authorisation for a module write.
-- No client-set session variable can bypass it.
CREATE FUNCTION unipathway_module_allocation.guard_module() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM unipathway_module_allocation.activation_gate WHERE singleton AND writes_enabled) THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.lecturer_id IS NOT NULL THEN RAISE EXCEPTION 'Create unassigned module before reviewed allocation' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.tenant_id,NEW.programme_id,NEW.title,NEW.code) IS DISTINCT FROM ROW(OLD.tenant_id,OLD.programme_id,OLD.title,OLD.code) AND (OLD.lecturer_id IS NOT NULL OR NEW.lecturer_id IS NOT NULL) THEN
  RAISE EXCEPTION 'Unassign lecturer before changing the reviewed module scope' USING ERRCODE='42501';
 END IF;
 IF NEW.lecturer_id IS DISTINCT FROM OLD.lecturer_id AND NOT EXISTS(
  SELECT 1 FROM unipathway_module_allocation.decisions a WHERE a.transaction_id=txid_current() AND a.recorded_by=auth.uid()
  AND a.tenant_id=NEW.tenant_id AND a.module_id=NEW.id AND a.previous_lecturer IS NOT DISTINCT FROM OLD.lecturer_id
  AND a.lecturer_id IS NOT DISTINCT FROM NEW.lecturer_id AND a.module_scope=unipathway_module_allocation.scope(NEW)
  AND a.expected_updated_at=OLD.updated_at
 ) THEN RAISE EXCEPTION 'Use the reviewed allocation workflow' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reviewed_module_allocation_guard BEFORE INSERT OR UPDATE OF lecturer_id,tenant_id,programme_id,title,code ON public.modules FOR EACH ROW EXECUTE FUNCTION unipathway_module_allocation.guard_module();

CREATE FUNCTION unipathway_module_allocation.record(p_id uuid,p_module uuid,p_lecturer uuid,p_review uuid,p_expected timestamptz,p_scope jsonb,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;m public.modules%ROWTYPE;d unipathway_module_allocation.decisions%ROWTYPE;s jsonb;decl jsonb;note text;
BEGIN
 t:=unipathway_module_allocation.actor(true);note:=btrim(p_note);
 IF p_id IS NULL OR p_module IS NULL OR p_expected IS NULL OR p_scope IS NULL OR note IS NULL OR length(note) NOT BETWEEN 5 AND 1000
 OR (p_lecturer IS NULL)<>(p_review IS NULL) OR p_lecturer=auth.uid() THEN RAISE EXCEPTION 'Reviewed allocation decision and evidence required'; END IF;
 SELECT * INTO m FROM public.modules WHERE id=p_module AND tenant_id=t FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Module unavailable in this centre' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM unipathway_module_allocation.decisions WHERE id=p_id AND tenant_id=t;
 IF FOUND THEN
  IF ROW(d.module_id,d.lecturer_id,d.review_id,d.expected_updated_at,d.module_scope,d.decision_note,d.recorded_by) IS DISTINCT FROM ROW(p_module,p_lecturer,p_review,p_expected,p_scope,note,auth.uid()) THEN RAISE EXCEPTION 'Existing decision differs; refresh'; END IF;
  RETURN unipathway_module_allocation.receipt(d);
 END IF;
 PERFORM 1 FROM public.programmes p WHERE p.id=m.programme_id AND p.tenant_id=t FOR SHARE;
 s:=unipathway_module_allocation.scope(m);
 IF s IS NULL OR s IS DISTINCT FROM p_scope OR m.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Module changed; reload before recording allocation' USING ERRCODE='40001'; END IF;
 IF p_lecturer IS NOT NULL THEN
  -- Existing competency review RPC locks this same draft before recording decisions.
  PERFORM 1 FROM public.onboarding_application_drafts WHERE tenant_id=t AND user_id=p_lecturer AND kind='lecturer' FOR UPDATE;
  decl:=unipathway_module_allocation.current_review(t,p_lecturer,p_review);
  IF decl IS NULL THEN RAISE EXCEPTION 'Current independent approved competency required' USING ERRCODE='42501'; END IF;
 ELSIF m.lecturer_id IS NULL THEN RAISE EXCEPTION 'Module is already unassigned'; END IF;
 IF m.lecturer_id IS DISTINCT FROM p_lecturer AND EXISTS(
 SELECT 1 FROM public.scheduled_lectures l WHERE l.tenant_id=t AND l.module_id=m.id AND l.is_active AND (l.effective_until IS NULL OR l.effective_until>=(now() AT TIME ZONE 'Asia/Karachi')::date) AND l.lecturer_id IS DISTINCT FROM p_lecturer
 ) THEN RAISE EXCEPTION 'Review and resolve current or future timetable entries before reallocating'; END IF;
 INSERT INTO unipathway_module_allocation.decisions(id,tenant_id,module_id,previous_lecturer,lecturer_id,review_id,module_scope,declaration,expected_updated_at,decision_note,recorded_by,transaction_id)
 VALUES(p_id,t,m.id,m.lecturer_id,p_lecturer,p_review,s,decl,p_expected,note,auth.uid(),txid_current()) RETURNING * INTO d;
 UPDATE public.modules SET lecturer_id=p_lecturer,updated_at=clock_timestamp() WHERE id=m.id AND tenant_id=t;
 RETURN unipathway_module_allocation.receipt(d);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_module_allocation FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_module_allocation.read_module(uuid,uuid),unipathway_module_allocation.record(uuid,uuid,uuid,uuid,timestamptz,jsonb,text) TO authenticated;
CREATE FUNCTION public.get_unipathway_reviewed_allocation(p_module uuid,p_lecturer uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_module_allocation.read_module(p_module,p_lecturer)$$;
CREATE FUNCTION public.record_unipathway_reviewed_allocation(p_id uuid,p_module uuid,p_lecturer uuid,p_review uuid,p_expected timestamptz,p_scope jsonb,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_module_allocation.record(p_id,p_module,p_lecturer,p_review,p_expected,p_scope,p_note)$$;
REVOKE ALL ON FUNCTION public.get_unipathway_reviewed_allocation(uuid,uuid),public.record_unipathway_reviewed_allocation(uuid,uuid,uuid,uuid,timestamptz,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_reviewed_allocation(uuid,uuid),public.record_unipathway_reviewed_allocation(uuid,uuid,uuid,uuid,timestamptz,jsonb,text) TO authenticated;
NOTIFY pgrst,'reload schema';
