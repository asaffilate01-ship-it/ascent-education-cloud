-- UniPathway Phase F2. STAGING-ONLY forward patch; never apply to DISHBEE.
-- Depends on independently reviewed Phase F1 exam operations and real, centre-scoped enrollments.
-- DO NOT put this file in historical migrations or enable gates on creation.
BEGIN;
CREATE SCHEMA IF NOT EXISTS unipathway_exam_roster;
REVOKE ALL ON SCHEMA unipathway_exam_roster FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_exam_roster TO authenticated;

CREATE TABLE unipathway_exam_roster.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,
 writes_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_exam_roster.activation_gate(singleton) VALUES(true);
ALTER TABLE unipathway_exam_roster.activation_gate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_exam_roster.activation_gate FROM PUBLIC,anon,authenticated;

CREATE TABLE unipathway_exam_roster.rosters(
 tenant_id uuid NOT NULL,
 event_id uuid NOT NULL,
 programme_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','submitted','internally_approved')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by uuid NOT NULL,
 submitted_by uuid,
 submitted_at timestamptz,
 approved_by uuid,
 approved_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,event_id)
);
CREATE TABLE unipathway_exam_roster.seats(
 tenant_id uuid NOT NULL,
 event_id uuid NOT NULL,
 student_id uuid NOT NULL,
 seat_label text NOT NULL CHECK(seat_label ~ '^[A-Z]{1,2}[0-9]{1,3}$'),
 consent_process_attested boolean NOT NULL CHECK(consent_process_attested),
 assigned_by uuid NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,event_id,student_id),
 UNIQUE(tenant_id,event_id,seat_label),
 FOREIGN KEY(tenant_id,event_id) REFERENCES unipathway_exam_roster.rosters(tenant_id,event_id)
);
CREATE TABLE unipathway_exam_roster.receipts(
 tenant_id uuid NOT NULL,
 request_id uuid NOT NULL,
 event_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 action text NOT NULL,
 payload jsonb NOT NULL,
 receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,request_id)
);
CREATE TABLE unipathway_exam_roster.audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id uuid NOT NULL,
 event_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 action text NOT NULL,
 student_id uuid,
 seat_label text,
 revision integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX exam_roster_audit_centre_event ON unipathway_exam_roster.audit(tenant_id,event_id,created_at);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['rosters','seats','receipts','audit'] LOOP
  EXECUTE format('ALTER TABLE unipathway_exam_roster.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON unipathway_exam_roster.%I FROM PUBLIC,anon,authenticated',t);
 END LOOP;
END $$;

-- F2 roles are checked against live database memberships by F1, not JWT user_metadata.
-- Both F1 and F2 backend gates must permit each operation; browser flags are never authority.
CREATE OR REPLACE FUNCTION unipathway_exam_roster.verified_actor(p_tenant uuid,p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT p_action IN('read','bind','assign','remove','submit','approve')
 AND EXISTS(SELECT 1 FROM unipathway_exam_roster.activation_gate g
  WHERE g.singleton AND g.reads_enabled AND (p_action='read' OR g.writes_enabled))
 AND unipathway_examops.verified_actor(p_tenant,
  CASE WHEN p_action='read' THEN 'read'
       WHEN p_action IN('bind','approve') THEN 'approve' ELSE 'save' END)
$fn$;
REVOKE ALL ON FUNCTION unipathway_exam_roster.verified_actor(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_exam_roster.verified_actor(uuid,text) TO authenticated;

-- A valid F1 plan is independently approved, has a current calendar snapshot,
-- and is the only source of room capacity / planned candidate maximum.
CREATE OR REPLACE FUNCTION unipathway_exam_roster.valid_plan(p_tenant uuid,p_event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(
  SELECT 1 FROM unipathway_examops.session_plans p
  JOIN public.academic_events e ON e.id=p.event_id AND e.tenant_id=p.tenant_id
  WHERE p.tenant_id=p_tenant AND p.event_id=p_event AND p.status='internally_approved'
   AND e.event_type='exam' AND NOT e.all_day AND e.end_date IS NOT NULL
   AND e.start_date=p.event_start AND e.end_date=p.event_end
   AND btrim(coalesce(e.location,''))=p.event_location
   AND p.planned_candidates BETWEEN 1 AND p.room_capacity
 )
$fn$;
REVOKE ALL ON FUNCTION unipathway_exam_roster.valid_plan(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_exam_roster.valid_plan(uuid,uuid) TO authenticated;

-- One-event, fixed-field projection. NEVER expose full student UUIDs, names,
-- contact details, identity documents, original consent records or reviewer identities.
CREATE OR REPLACE FUNCTION unipathway_exam_roster.read_impl(p_tenant uuid,p_event uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_plan unipathway_examops.session_plans%ROWTYPE;
 v_roster unipathway_exam_roster.rosters%ROWTYPE; v_seats jsonb;
BEGIN
 IF NOT unipathway_exam_roster.verified_actor(p_tenant,'read') THEN
  RAISE EXCEPTION 'Verified exam roster reader required';
 END IF;
 IF p_event IS NULL OR NOT unipathway_exam_roster.valid_plan(p_tenant,p_event) THEN
  RAISE EXCEPTION 'Approved internal exam plan required';
 END IF;
 SELECT * INTO v_plan FROM unipathway_examops.session_plans
 WHERE tenant_id=p_tenant AND event_id=p_event;
 SELECT * INTO v_roster FROM unipathway_exam_roster.rosters
 WHERE tenant_id=p_tenant AND event_id=p_event;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('tenant_id',p_tenant,'event_id',p_event,
   'programme_id',NULL,'status','unconfigured','revision',0,
   'room_capacity',v_plan.room_capacity,'planned_candidates',v_plan.planned_candidates,
   'seats','[]'::jsonb);
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'seat_label',s.seat_label,
   'student_ref','••••'||right(s.student_id::text,8)
  ) ORDER BY s.seat_label),'[]'::jsonb) INTO v_seats
 FROM unipathway_exam_roster.seats s
 WHERE s.tenant_id=p_tenant AND s.event_id=p_event;
 RETURN jsonb_build_object(
  'tenant_id',p_tenant,'event_id',p_event,'programme_id',v_roster.programme_id,
  'status',v_roster.status,'revision',v_roster.revision,
  'room_capacity',v_plan.room_capacity,'planned_candidates',v_plan.planned_candidates,
  'seats',v_seats
 );
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_exam_roster.read_impl(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_exam_roster.read_impl(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_exam_roster.command_impl(
 p_tenant uuid,p_event uuid,p_action text,p_programme uuid,p_student uuid,
 p_seat text,p_attested boolean,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid());
 v_plan unipathway_examops.session_plans%ROWTYPE;
 v_roster unipathway_exam_roster.rosters%ROWTYPE;
 v_old record;v_deleted record;v_payload jsonb;v_receipt jsonb;v_count integer;
 v_seat text:=upper(btrim(coalesce(p_seat,'')));
BEGIN
 IF NOT unipathway_exam_roster.verified_actor(p_tenant,p_action) THEN
  RAISE EXCEPTION 'Verified exam roster operation and centre membership required';
 END IF;
 IF p_event IS NULL OR p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 THEN
  RAISE EXCEPTION 'Invalid roster request or revision';
 END IF;
 v_payload:=jsonb_build_object('action',p_action,'programme',p_programme,
  'student',p_student,'seat',v_seat,'attested',p_attested,'revision',p_expected_revision);
 SELECT actor_id,event_id,action,payload,receipt INTO v_old
 FROM unipathway_exam_roster.receipts
 WHERE tenant_id=p_tenant AND request_id=p_request_id;
 IF FOUND THEN
  IF v_old.actor_id IS DISTINCT FROM v_actor OR v_old.event_id IS DISTINCT FROM p_event
   OR v_old.action IS DISTINCT FROM p_action OR v_old.payload IS DISTINCT FROM v_payload
  THEN RAISE EXCEPTION 'Request identifier does not match original roster operation';END IF;
  RETURN v_old.receipt;
 END IF;
 -- Serialise all changes to this one approved plan against updates from the F1 workflow.
 SELECT * INTO v_plan FROM unipathway_examops.session_plans
 WHERE tenant_id=p_tenant AND event_id=p_event FOR UPDATE;
 IF NOT FOUND OR NOT unipathway_exam_roster.valid_plan(p_tenant,p_event) THEN
  RAISE EXCEPTION 'An unchanged approved internal exam plan is required';
 END IF;
 SELECT * INTO v_roster FROM unipathway_exam_roster.rosters
 WHERE tenant_id=p_tenant AND event_id=p_event FOR UPDATE;
 IF p_action='bind' THEN
  IF p_programme IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.programmes x
   WHERE x.id=p_programme AND x.tenant_id=p_tenant AND x.status='active'
  ) THEN RAISE EXCEPTION 'An active programme at this centre is required';END IF;
  IF p_expected_revision=0 THEN
   INSERT INTO unipathway_exam_roster.rosters(
    tenant_id,event_id,programme_id,status,revision,updated_by
   ) VALUES(p_tenant,p_event,p_programme,'draft',1,v_actor)
   ON CONFLICT(tenant_id,event_id) DO NOTHING RETURNING * INTO v_roster;
  ELSE
   UPDATE unipathway_exam_roster.rosters SET programme_id=p_programme,
    revision=revision+1,updated_by=v_actor,updated_at=now()
   WHERE tenant_id=p_tenant AND event_id=p_event AND revision=p_expected_revision
    AND status='draft'
    AND NOT EXISTS(SELECT 1 FROM unipathway_exam_roster.seats s
      WHERE s.tenant_id=p_tenant AND s.event_id=p_event)
   RETURNING * INTO v_roster;
  END IF;
 ELSIF p_action IN('assign','remove','submit','approve') THEN
  IF v_roster.event_id IS NULL OR v_roster.revision<>p_expected_revision THEN
   RAISE EXCEPTION 'Roster revision is stale or unconfigured';
  END IF;
  IF p_action IN('assign','remove') THEN
   IF v_roster.status<>'draft' OR v_seat !~ '^[A-Z]{1,2}[0-9]{1,3}$' THEN
    RAISE EXCEPTION 'Only a draft roster and valid seat label may be edited';
   END IF;
   IF p_action='assign' THEN
    IF p_student IS NULL OR p_attested IS DISTINCT FROM true
     OR NOT EXISTS(SELECT 1 FROM public.profiles p
        WHERE p.user_id=p_student AND p.tenant_id=p_tenant)
     OR NOT EXISTS(SELECT 1 FROM public.student_enrolments e
       WHERE e.student_id=p_student AND e.tenant_id=p_tenant
        AND e.programme_id=v_roster.programme_id AND e.status='active')
    THEN RAISE EXCEPTION 'Active same-programme enrolment and recorded process attestation required';END IF;
    SELECT count(*) INTO v_count FROM unipathway_exam_roster.seats
    WHERE tenant_id=p_tenant AND event_id=p_event;
    IF v_count>=v_plan.planned_candidates AND NOT EXISTS(
     SELECT 1 FROM unipathway_exam_roster.seats
      WHERE tenant_id=p_tenant AND event_id=p_event AND student_id=p_student)
    THEN RAISE EXCEPTION 'Internal candidate count has reached the approved limit';END IF;
    INSERT INTO unipathway_exam_roster.seats(
      tenant_id,event_id,student_id,seat_label,consent_process_attested,assigned_by
    ) VALUES(p_tenant,p_event,p_student,v_seat,true,v_actor)
    ON CONFLICT(tenant_id,event_id,student_id) DO UPDATE
     SET seat_label=excluded.seat_label,consent_process_attested=true,
      assigned_by=v_actor,assigned_at=now();
   ELSE
    DELETE FROM unipathway_exam_roster.seats
    WHERE tenant_id=p_tenant AND event_id=p_event AND seat_label=v_seat
    RETURNING student_id INTO v_deleted;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seat assignment was not found in this centre';END IF;
    p_student:=v_deleted.student_id;
   END IF;
   UPDATE unipathway_exam_roster.rosters SET revision=revision+1,
    updated_by=v_actor,updated_at=now()
   WHERE tenant_id=p_tenant AND event_id=p_event RETURNING * INTO v_roster;
  ELSIF p_action IN('submit','approve') THEN
   SELECT count(*) INTO v_count FROM unipathway_exam_roster.seats
   WHERE tenant_id=p_tenant AND event_id=p_event;
   IF v_count<>v_plan.planned_candidates OR v_count<1 OR EXISTS(
    SELECT 1 FROM unipathway_exam_roster.seats s
    WHERE s.tenant_id=p_tenant AND s.event_id=p_event
     AND (NOT EXISTS(SELECT 1 FROM public.profiles p
       WHERE p.user_id=s.student_id AND p.tenant_id=p_tenant)
      OR NOT EXISTS(SELECT 1 FROM public.student_enrolments e
       WHERE e.student_id=s.student_id AND e.tenant_id=p_tenant
        AND e.programme_id=v_roster.programme_id AND e.status='active'))
   ) THEN RAISE EXCEPTION 'Roster must match the approved count and current enrolment';END IF;
   IF p_action='submit' THEN
    UPDATE unipathway_exam_roster.rosters SET
      status='submitted',revision=revision+1,updated_by=v_actor,
      submitted_by=v_actor,submitted_at=now(),updated_at=now()
    WHERE tenant_id=p_tenant AND event_id=p_event AND status='draft'
    RETURNING * INTO v_roster;
   ELSE
    UPDATE unipathway_exam_roster.rosters SET
      status='internally_approved',revision=revision+1,approved_by=v_actor,
      approved_at=now(),updated_at=now()
    WHERE tenant_id=p_tenant AND event_id=p_event AND status='submitted'
     AND submitted_by IS NOT NULL AND submitted_by<>v_actor
    RETURNING * INTO v_roster;
   END IF;
  END IF;
 END IF;
 IF v_roster.event_id IS NULL THEN
  RAISE EXCEPTION 'Roster action rejected: stale state, approval separation or non-empty mapping';
 END IF;
 v_receipt:=jsonb_build_object('tenant_id',p_tenant,'event_id',p_event,
   'revision',v_roster.revision,'status',v_roster.status,'action',p_action);
 INSERT INTO unipathway_exam_roster.receipts(
  tenant_id,request_id,event_id,actor_id,action,payload,receipt
 ) VALUES(p_tenant,p_request_id,p_event,v_actor,p_action,v_payload,v_receipt);
 INSERT INTO unipathway_exam_roster.audit(
  tenant_id,event_id,actor_id,action,student_id,seat_label,revision
 ) VALUES(p_tenant,p_event,v_actor,p_action,p_student,
   CASE WHEN p_action IN('assign','remove') THEN v_seat ELSE NULL END,v_roster.revision);
 RETURN v_receipt;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_exam_roster.command_impl(uuid,uuid,text,uuid,uuid,text,boolean,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_exam_roster.command_impl(uuid,uuid,text,uuid,uuid,text,boolean,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_unipathway_exam_roster(p_tenant uuid,p_event uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_exam_roster.read_impl(p_tenant,p_event) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_exam_roster(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_exam_roster(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mutate_unipathway_exam_roster(
 p_tenant uuid,p_event uuid,p_action text,p_programme uuid,p_student uuid,
 p_seat text,p_attested boolean,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_exam_roster.command_impl(p_tenant,p_event,p_action,
 p_programme,p_student,p_seat,p_attested,p_expected_revision,p_request_id) $fn$;
REVOKE ALL ON FUNCTION public.mutate_unipathway_exam_roster(uuid,uuid,text,uuid,uuid,text,boolean,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mutate_unipathway_exam_roster(uuid,uuid,text,uuid,uuid,text,boolean,integer,uuid) TO authenticated;
COMMIT;
