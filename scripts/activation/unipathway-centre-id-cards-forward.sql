-- Controlled forward candidate. Install only after the private evidence policy and enrolment checks are accepted.
-- QR references identify a card to an authorised lecturer; they are not bearer credentials.
CREATE SCHEMA unipathway_centre_cards;
REVOKE ALL ON SCHEMA unipathway_centre_cards FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_centre_cards TO authenticated;
CREATE TABLE unipathway_centre_cards.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,writes_enabled boolean NOT NULL DEFAULT false,
 CHECK(NOT writes_enabled OR reads_enabled)
);
INSERT INTO unipathway_centre_cards.activation_gate DEFAULT VALUES;
CREATE TABLE unipathway_centre_cards.cards(
 id uuid PRIMARY KEY,reference uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),subject_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL CHECK(kind IN ('student','lecturer')),display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 300),
 centre_name text NOT NULL CHECK(length(btrim(centre_name)) BETWEEN 1 AND 300),
 identity_evidence_id uuid NOT NULL REFERENCES public.kyc_documents(id),
 issued_on date NOT NULL,expires_on date NOT NULL,issued_by uuid NOT NULL REFERENCES auth.users(id),
 issue_reference text NOT NULL CHECK(length(btrim(issue_reference)) BETWEEN 5 AND 500),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),revoked_by uuid REFERENCES auth.users(id),revoked_at timestamptz,revocation_note text,
 CHECK(issued_by<>subject_id AND expires_on>=issued_on AND expires_on<=issued_on+366),
 CHECK((revoked_by IS NULL AND revoked_at IS NULL AND revocation_note IS NULL) OR
 (revoked_by IS NOT NULL AND revoked_by<>subject_id AND revoked_at IS NOT NULL AND revocation_note IS NOT NULL AND length(btrim(revocation_note)) BETWEEN 5 AND 500))
);
CREATE INDEX centre_card_subject_lookup ON unipathway_centre_cards.cards(tenant_id,subject_id,kind,issued_at DESC,id);
ALTER TABLE unipathway_centre_cards.activation_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE unipathway_centre_cards.cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA unipathway_centre_cards FROM PUBLIC,anon,authenticated;

CREATE FUNCTION unipathway_centre_cards.actor(p_role text,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;
BEGIN
 IF auth.uid() IS NULL OR p_role IS NULL OR p_role NOT IN ('student','lecturer','centre_director') THEN RAISE EXCEPTION 'Verified centre role required' USING ERRCODE='42501'; END IF;
 t:=public.get_user_tenant_id(auth.uid());
 IF t IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.tenant_id=t AND r.role::text=p_role) THEN RAISE EXCEPTION 'Verified centre membership required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM unipathway_centre_cards.activation_gate g WHERE g.singleton AND g.reads_enabled AND (NOT p_write OR g.writes_enabled)) THEN RAISE EXCEPTION 'Centre cards not activated' USING ERRCODE='55000'; END IF;
 RETURN t;
END $$;
-- Resolve a current, independently verified passport/CNIC evidence record only. Never return evidence contents.
CREATE FUNCTION unipathway_centre_cards.eligible_identity(t uuid,u uuid,k text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE d public.kyc_documents%ROWTYPE;
BEGIN
 IF k IS NULL OR k NOT IN ('student','lecturer') OR NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id AND r.tenant_id=p.tenant_id WHERE p.user_id=u AND p.tenant_id=t AND r.role::text=k) THEN RETURN NULL; END IF;
 IF k='student' AND NOT EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.tenant_id=t AND e.student_id=u AND e.status='active') THEN RETURN NULL; END IF;
 SELECT * INTO d FROM public.kyc_documents WHERE user_id=u AND tenant_id=t AND document_type='passport' ORDER BY created_at DESC,id DESC LIMIT 1;
 IF NOT FOUND OR d.status<>'verified' OR d.verified_by IS NULL OR d.verified_by=u OR d.verified_at IS NULL OR d.verified_at>now()
 OR (d.expiry_date IS NOT NULL AND d.expiry_date<(now() AT TIME ZONE 'Asia/Karachi')::date) THEN RETURN NULL; END IF;
 RETURN d.id;
END $$;
CREATE FUNCTION unipathway_centre_cards.state(c unipathway_centre_cards.cards) RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT CASE WHEN c.revoked_at IS NOT NULL THEN 'revoked'
 WHEN c.expires_on<(now() AT TIME ZONE 'Asia/Karachi')::date THEN 'expired'
 WHEN unipathway_centre_cards.eligible_identity(c.tenant_id,c.subject_id,c.kind) IS DISTINCT FROM c.identity_evidence_id THEN 'eligibility_review'
 ELSE 'active' END
$$;
CREATE FUNCTION unipathway_centre_cards.view_card(c unipathway_centre_cards.cards) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('id',c.id,'reference',c.reference,'tenant_id',c.tenant_id,'subject_id',c.subject_id,'kind',c.kind,'display_name',c.display_name,
 'centre_name',c.centre_name,'issued_on',c.issued_on,'expires_on',c.expires_on,'status',unipathway_centre_cards.state(c))
$$;
CREATE FUNCTION unipathway_centre_cards.own_card(p_kind text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;c unipathway_centre_cards.cards%ROWTYPE;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('student','lecturer') THEN RAISE EXCEPTION 'Card holder role required' USING ERRCODE='42501'; END IF;
 t:=unipathway_centre_cards.actor(p_kind,false);
 SELECT * INTO c FROM unipathway_centre_cards.cards WHERE tenant_id=t AND subject_id=auth.uid() AND kind=p_kind ORDER BY issued_at DESC,id DESC LIMIT 1;
 RETURN jsonb_build_object('tenant_id',t,'subject_id',auth.uid(),'kind',p_kind,'card',CASE WHEN c.id IS NULL THEN NULL ELSE unipathway_centre_cards.view_card(c) END);
END $$;
CREATE FUNCTION unipathway_centre_cards.roster(p_kind text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid; people jsonb; cards jsonb;
BEGIN
 t:=unipathway_centre_cards.actor('centre_director',false);
 IF p_kind IS NULL OR p_kind NOT IN ('student','lecturer') THEN RAISE EXCEPTION 'Choose a card kind'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.name,x.id),'[]'::jsonb) INTO people FROM (
  SELECT p.user_id AS id,p.full_name AS name FROM public.profiles p WHERE p.tenant_id=t AND p.user_id<>auth.uid() AND length(btrim(p.full_name)) BETWEEN 1 AND 300 AND
  unipathway_centre_cards.eligible_identity(t,p.user_id,p_kind) IS NOT NULL ORDER BY p.full_name,p.user_id LIMIT 501
 ) x;
 SELECT coalesce(jsonb_agg(unipathway_centre_cards.view_card(x) ORDER BY x.display_name,x.id),'[]'::jsonb) INTO cards FROM (
  SELECT DISTINCT ON (c.subject_id) c.* FROM unipathway_centre_cards.cards c WHERE c.tenant_id=t AND c.kind=p_kind ORDER BY c.subject_id,c.issued_at DESC,c.id DESC LIMIT 501
 ) x;
 IF jsonb_array_length(people)>500 OR jsonb_array_length(cards)>500 THEN RAISE EXCEPTION 'Card register exceeds bounded review size; request a paginated centre report'; END IF;
 RETURN jsonb_build_object('tenant_id',t,'kind',p_kind,'people',people,'cards',cards);
END $$;
CREATE FUNCTION unipathway_centre_cards.issue(p_id uuid,p_subject uuid,p_kind text,p_expiry date,p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;c unipathway_centre_cards.cards%ROWTYPE;evidence uuid;label text;centre text;today date;note text;
BEGIN
 t:=unipathway_centre_cards.actor('centre_director',true);today:=(now() AT TIME ZONE 'Asia/Karachi')::date;note:=btrim(p_reference);
 IF p_id IS NULL OR p_subject IS NULL OR p_subject=auth.uid() OR p_kind IS NULL OR p_kind NOT IN ('student','lecturer')
 OR p_expiry IS NULL OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Independent card issue and evidence reference required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('centre-card:'||t::text||':'||p_subject::text||':'||p_kind,0));
 SELECT * INTO c FROM unipathway_centre_cards.cards WHERE id=p_id AND tenant_id=t;
 IF FOUND THEN
  IF ROW(c.subject_id,c.kind,c.expires_on,c.issue_reference,c.issued_by) IS DISTINCT FROM ROW(p_subject,p_kind,p_expiry,note,auth.uid()) THEN RAISE EXCEPTION 'Existing request differs; refresh card register'; END IF;
  RETURN unipathway_centre_cards.view_card(c);
 END IF;
 IF p_expiry<today OR p_expiry>today+366 THEN RAISE EXCEPTION 'Expiry must be within the next 366 days'; END IF;
 evidence:=unipathway_centre_cards.eligible_identity(t,p_subject,p_kind);
 IF evidence IS NULL THEN RAISE EXCEPTION 'Current centre role, identity evidence and active student enrolment required' USING ERRCODE='42501'; END IF;
 SELECT p.full_name INTO label FROM public.profiles p WHERE p.user_id=p_subject AND p.tenant_id=t;
 SELECT n.name INTO centre FROM public.tenants n WHERE n.id=t;
 IF label IS NULL OR centre IS NULL OR length(btrim(label)) NOT BETWEEN 1 AND 300 OR length(btrim(centre)) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Verified holder and centre names required'; END IF;
 IF EXISTS(SELECT 1 FROM unipathway_centre_cards.cards x WHERE x.tenant_id=t AND x.subject_id=p_subject AND x.kind=p_kind AND x.revoked_at IS NULL AND x.expires_on>=today) THEN RAISE EXCEPTION 'An unexpired card exists; revoke it before replacement'; END IF;
 INSERT INTO unipathway_centre_cards.cards(id,tenant_id,subject_id,kind,display_name,centre_name,identity_evidence_id,issued_on,expires_on,issued_by,issue_reference)
 VALUES(p_id,t,p_subject,p_kind,btrim(label),btrim(centre),evidence,today,p_expiry,auth.uid(),note) RETURNING * INTO c;
 RETURN unipathway_centre_cards.view_card(c);
END $$;
CREATE FUNCTION unipathway_centre_cards.revoke(p_id uuid,p_note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;c unipathway_centre_cards.cards%ROWTYPE;note text;
BEGIN
 t:=unipathway_centre_cards.actor('centre_director',true);note:=btrim(p_note);
 IF p_id IS NULL OR note IS NULL OR length(note) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Revocation reason required'; END IF;
 SELECT * INTO c FROM unipathway_centre_cards.cards WHERE tenant_id=t AND id=p_id FOR UPDATE;
 IF NOT FOUND OR c.subject_id=auth.uid() THEN RAISE EXCEPTION 'Independent centre revocation required' USING ERRCODE='42501'; END IF;
 IF c.revoked_at IS NOT NULL THEN
  IF c.revoked_by<>auth.uid() OR c.revocation_note<>note THEN RAISE EXCEPTION 'Card already revoked; refresh'; END IF;
 ELSE
  UPDATE unipathway_centre_cards.cards SET revoked_by=auth.uid(),revoked_at=clock_timestamp(),revocation_note=note WHERE id=c.id RETURNING * INTO c;
 END IF;
 RETURN unipathway_centre_cards.view_card(c);
END $$;
CREATE FUNCTION unipathway_centre_cards.lookup(p_module uuid,p_reference uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t uuid;m public.modules%ROWTYPE;c unipathway_centre_cards.cards%ROWTYPE;matched jsonb;
BEGIN
 t:=unipathway_centre_cards.actor('lecturer',false);
 SELECT * INTO m FROM public.modules WHERE id=p_module AND tenant_id=t AND lecturer_id=auth.uid();
 IF NOT FOUND OR p_reference IS NULL THEN RAISE EXCEPTION 'Assigned module and card reference required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM unipathway_centre_cards.cards WHERE tenant_id=t AND reference=p_reference AND kind='student';
 IF FOUND AND unipathway_centre_cards.state(c)='active' AND EXISTS(SELECT 1 FROM public.student_enrolments e WHERE e.tenant_id=t AND e.student_id=c.subject_id AND e.programme_id=m.programme_id AND e.status='active') THEN
  matched:=jsonb_build_object('student_id',c.subject_id,'name',c.display_name);
 END IF;
 RETURN jsonb_build_object('tenant_id',t,'module_id',p_module,'reference',p_reference,'match',matched);
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA unipathway_centre_cards FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_centre_cards.own_card(text),unipathway_centre_cards.roster(text),unipathway_centre_cards.issue(uuid,uuid,text,date,text),unipathway_centre_cards.revoke(uuid,text),unipathway_centre_cards.lookup(uuid,uuid) TO authenticated;
CREATE FUNCTION public.get_my_unipathway_centre_card(p_kind text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_centre_cards.own_card(p_kind)$$;
CREATE FUNCTION public.get_unipathway_centre_cards(p_kind text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_centre_cards.roster(p_kind)$$;
CREATE FUNCTION public.issue_unipathway_centre_card(p_id uuid,p_subject uuid,p_kind text,p_expiry date,p_reference text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_centre_cards.issue(p_id,p_subject,p_kind,p_expiry,p_reference)$$;
CREATE FUNCTION public.revoke_unipathway_centre_card(p_id uuid,p_note text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_centre_cards.revoke(p_id,p_note)$$;
CREATE FUNCTION public.lookup_unipathway_student_card(p_module uuid,p_reference uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_centre_cards.lookup(p_module,p_reference)$$;
REVOKE ALL ON FUNCTION public.get_my_unipathway_centre_card(text),public.get_unipathway_centre_cards(text),public.issue_unipathway_centre_card(uuid,uuid,text,date,text),public.revoke_unipathway_centre_card(uuid,text),public.lookup_unipathway_student_card(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_unipathway_centre_card(text),public.get_unipathway_centre_cards(text),public.issue_unipathway_centre_card(uuid,uuid,text,date,text),public.revoke_unipathway_centre_card(uuid,text),public.lookup_unipathway_student_card(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
