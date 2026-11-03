-- UniPathway exam-operations forward patch. DO NOT DEPLOY without signed-in two-centre staging review.
-- Separate from historical migrations. NEVER apply to the unrelated DISHBEE project.
BEGIN;
CREATE SCHEMA IF NOT EXISTS unipathway_examops;
REVOKE ALL ON SCHEMA unipathway_examops FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA unipathway_examops TO authenticated;

-- Two independent backend gates; browser flags alone NEVER grant access.
CREATE TABLE unipathway_examops.activation_gate(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 reads_enabled boolean NOT NULL DEFAULT false,
 writes_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO unipathway_examops.activation_gate(singleton) VALUES(true);
ALTER TABLE unipathway_examops.activation_gate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_examops.activation_gate FROM PUBLIC,anon,authenticated;

-- Internal preparation only: neither external registrations nor student identity/seat mappings.
CREATE TABLE unipathway_examops.session_plans(
 tenant_id uuid NOT NULL,
 event_id uuid NOT NULL,
 event_start timestamptz NOT NULL,
 event_end timestamptz NOT NULL,
 event_location text NOT NULL,
 room_capacity integer NOT NULL CHECK(room_capacity BETWEEN 1 AND 2000),
 planned_candidates integer NOT NULL CHECK(planned_candidates BETWEEN 0 AND room_capacity),
 planned_invigilators integer NOT NULL CHECK(planned_invigilators BETWEEN 0 AND 100),
 seating_process_checked boolean NOT NULL DEFAULT false,
 entry_list_process_checked boolean NOT NULL DEFAULT false,
 identity_process_checked boolean NOT NULL DEFAULT false,
 emergency_process_checked boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','internally_approved')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 updated_by uuid NOT NULL,
 submitted_by uuid,
 submitted_at timestamptz,
 approved_by uuid,
 approved_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,event_id)
);
CREATE INDEX examops_status_idx ON unipathway_examops.session_plans(tenant_id,status);
ALTER TABLE unipathway_examops.session_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_examops.session_plans FROM PUBLIC,anon,authenticated;

CREATE TABLE unipathway_examops.command_receipts(
 tenant_id uuid NOT NULL,
 request_id uuid NOT NULL,
 event_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN('save','approve')),
 payload jsonb NOT NULL,
 receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,request_id)
);
ALTER TABLE unipathway_examops.command_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_examops.command_receipts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION unipathway_examops.verified_actor(p_tenant uuid,p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT (SELECT auth.uid()) IS NOT NULL AND p_tenant IS NOT NULL
 AND p_action IN('read','save','approve')
 AND EXISTS(SELECT 1 FROM unipathway_examops.activation_gate g
   WHERE g.singleton AND g.reads_enabled
    AND (p_action='read' OR g.writes_enabled))
 AND EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=p_tenant AND t.status='active')
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=(SELECT auth.uid()) AND p.tenant_id=p_tenant)
 AND EXISTS(SELECT 1 FROM public.user_roles r
   WHERE r.user_id=(SELECT auth.uid()) AND r.tenant_id=p_tenant
    AND ((p_action='read' AND r.role::text IN('exams_officer','centre_director'))
      OR (p_action='save' AND r.role::text='exams_officer')
      OR (p_action='approve' AND r.role::text='centre_director')))
$fn$;
REVOKE ALL ON FUNCTION unipathway_examops.verified_actor(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_examops.verified_actor(uuid,text) TO authenticated;

-- One strictly allowlisted projection. No candidate list, private staff UUID, ID documents,
-- seating chart, incident narratives, provider credentials or exam result is disclosed.
CREATE OR REPLACE FUNCTION unipathway_examops.read_impl(
 p_tenant uuid,p_offset integer,p_limit integer
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_rows jsonb;
BEGIN
 IF NOT unipathway_examops.verified_actor(p_tenant,'read') THEN
  RAISE EXCEPTION 'Verified exam operations reader required';
 END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_offset>1000 OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN
  RAISE EXCEPTION 'Invalid exam operations page';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO v_rows FROM (
  SELECT tenant_id,event_id,event_start,event_end,event_location,room_capacity,
   planned_candidates,planned_invigilators,seating_process_checked,
   entry_list_process_checked,identity_process_checked,emergency_process_checked,
   status,revision,updated_at
  FROM unipathway_examops.session_plans WHERE tenant_id=p_tenant
  ORDER BY event_id LIMIT p_limit OFFSET p_offset
 ) r;
 RETURN v_rows;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_examops.read_impl(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_examops.read_impl(uuid,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_examops.save_impl(
 p_tenant uuid,p_event uuid,p_capacity integer,p_candidates integer,p_invigilators integer,
 p_seating boolean,p_entries boolean,p_identity boolean,p_emergency boolean,
 p_submit boolean,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid());v_event record;v_row unipathway_examops.session_plans%ROWTYPE;
 v_payload jsonb;v_previous record;v_receipt jsonb;
BEGIN
 IF NOT unipathway_examops.verified_actor(p_tenant,'save') THEN RAISE EXCEPTION 'Verified Exams Officer permission required'; END IF;
 IF p_event IS NULL OR p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
  OR p_capacity IS NULL OR p_capacity<1 OR p_capacity>2000
  OR p_candidates IS NULL OR p_candidates<0 OR p_candidates>p_capacity
  OR p_invigilators IS NULL OR p_invigilators<0 OR p_invigilators>100
  OR p_seating IS NULL OR p_entries IS NULL OR p_identity IS NULL OR p_emergency IS NULL OR p_submit IS NULL
 THEN RAISE EXCEPTION 'Invalid exam plan values';END IF;
 IF p_submit AND (p_candidates<1 OR p_invigilators<1 OR NOT(p_seating AND p_entries AND p_identity AND p_emergency))
 THEN RAISE EXCEPTION 'Submission requires recorded internal readiness checks and invigilation';END IF;
 v_payload:=jsonb_build_object('capacity',p_capacity,'candidates',p_candidates,'invigilators',p_invigilators,
  'seating',p_seating,'entries',p_entries,'identity',p_identity,'emergency',p_emergency,
  'submit',p_submit,'expected_revision',p_expected_revision);
 SELECT actor_id,event_id,action,payload,receipt INTO v_previous
 FROM unipathway_examops.command_receipts WHERE tenant_id=p_tenant AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.actor_id IS DISTINCT FROM v_actor OR v_previous.event_id IS DISTINCT FROM p_event
   OR v_previous.action<>'save' OR v_previous.payload IS DISTINCT FROM v_payload
  THEN RAISE EXCEPTION 'Request identifier does not match the original exam operation';END IF;
  RETURN v_previous.receipt;
 END IF;
 SELECT id,tenant_id,start_date,end_date,location,all_day INTO v_event
 FROM public.academic_events
 WHERE id=p_event AND tenant_id=p_tenant AND event_type='exam';
 IF NOT FOUND OR v_event.all_day OR v_event.end_date IS NULL
  OR v_event.end_date<=v_event.start_date OR length(btrim(coalesce(v_event.location,'')))=0
 THEN RAISE EXCEPTION 'A valid centre exam calendar session with a venue and end time is required';END IF;
 IF p_expected_revision=0 THEN
  INSERT INTO unipathway_examops.session_plans(
   tenant_id,event_id,event_start,event_end,event_location,room_capacity,planned_candidates,
   planned_invigilators,seating_process_checked,entry_list_process_checked,
   identity_process_checked,emergency_process_checked,status,revision,updated_by,
   submitted_by,submitted_at
  ) VALUES (
   p_tenant,p_event,v_event.start_date,v_event.end_date,btrim(v_event.location),p_capacity,p_candidates,
   p_invigilators,p_seating,p_entries,p_identity,p_emergency,
   CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END,1,v_actor,
   CASE WHEN p_submit THEN v_actor ELSE NULL END,
   CASE WHEN p_submit THEN now() ELSE NULL END
  ) ON CONFLICT(tenant_id,event_id) DO NOTHING RETURNING * INTO v_row;
 ELSE
  UPDATE unipathway_examops.session_plans SET
   event_start=v_event.start_date,event_end=v_event.end_date,event_location=btrim(v_event.location),
   room_capacity=p_capacity,planned_candidates=p_candidates,planned_invigilators=p_invigilators,
   seating_process_checked=p_seating,entry_list_process_checked=p_entries,
   identity_process_checked=p_identity,emergency_process_checked=p_emergency,
   status=CASE WHEN p_submit THEN 'submitted' ELSE 'draft' END,
   submitted_by=CASE WHEN p_submit THEN v_actor ELSE NULL END,
   submitted_at=CASE WHEN p_submit THEN now() ELSE NULL END,
   revision=revision+1,updated_by=v_actor,updated_at=now()
  WHERE tenant_id=p_tenant AND event_id=p_event AND revision=p_expected_revision
   AND status IN('draft','submitted')
  RETURNING * INTO v_row;
 END IF;
 IF v_row.event_id IS NULL THEN RAISE EXCEPTION 'Exam plan is stale, already approved or not available';END IF;
 v_receipt:=jsonb_build_object('tenant_id',v_row.tenant_id,'event_id',v_row.event_id,
  'revision',v_row.revision,'status',v_row.status);
 INSERT INTO unipathway_examops.command_receipts(tenant_id,request_id,event_id,actor_id,action,payload,receipt)
 VALUES(p_tenant,p_request_id,p_event,v_actor,'save',v_payload,v_receipt);
 RETURN v_receipt;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_examops.save_impl(uuid,uuid,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_examops.save_impl(uuid,uuid,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION unipathway_examops.approve_impl(
 p_tenant uuid,p_event uuid,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid());v_row unipathway_examops.session_plans%ROWTYPE;
 v_previous record;v_payload jsonb;v_receipt jsonb;
BEGIN
 IF NOT unipathway_examops.verified_actor(p_tenant,'approve') THEN
  RAISE EXCEPTION 'Verified Centre Director permission required';
 END IF;
 IF p_event IS NULL OR p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<1 THEN
  RAISE EXCEPTION 'Invalid exam plan approval request';
 END IF;
 v_payload:=jsonb_build_object('expected_revision',p_expected_revision);
 SELECT actor_id,event_id,action,payload,receipt INTO v_previous
 FROM unipathway_examops.command_receipts WHERE tenant_id=p_tenant AND request_id=p_request_id;
 IF FOUND THEN
  IF v_previous.actor_id IS DISTINCT FROM v_actor OR v_previous.event_id IS DISTINCT FROM p_event
   OR v_previous.action<>'approve' OR v_previous.payload IS DISTINCT FROM v_payload
  THEN RAISE EXCEPTION 'Request identifier used by a different exam operation';END IF;
  RETURN v_previous.receipt;
 END IF;
 UPDATE unipathway_examops.session_plans p
 SET status='internally_approved',approved_by=v_actor,approved_at=now(),
  revision=p.revision+1,updated_at=now()
 WHERE p.tenant_id=p_tenant AND p.event_id=p_event
  AND p.revision=p_expected_revision AND p.status='submitted'
  AND p.submitted_by IS NOT NULL AND p.submitted_by<>v_actor
  AND p.planned_candidates BETWEEN 1 AND p.room_capacity AND p.planned_invigilators>=1
  AND p.seating_process_checked AND p.entry_list_process_checked
  AND p.identity_process_checked AND p.emergency_process_checked
  AND EXISTS(SELECT 1 FROM public.academic_events e
    WHERE e.id=p_event AND e.tenant_id=p_tenant AND e.event_type='exam' AND NOT e.all_day
      AND e.start_date=p.event_start AND e.end_date=p.event_end
      AND btrim(coalesce(e.location,''))=p.event_location)
 RETURNING * INTO v_row;
 IF v_row.event_id IS NULL THEN
  RAISE EXCEPTION 'Exam plan cannot be approved: revision, reviewer separation or calendar changed';
 END IF;
 v_receipt:=jsonb_build_object('tenant_id',v_row.tenant_id,'event_id',v_row.event_id,
  'revision',v_row.revision,'status',v_row.status);
 INSERT INTO unipathway_examops.command_receipts(tenant_id,request_id,event_id,actor_id,action,payload,receipt)
 VALUES(p_tenant,p_request_id,p_event,v_actor,'approve',v_payload,v_receipt);
 RETURN v_receipt;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_examops.approve_impl(uuid,uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_examops.approve_impl(uuid,uuid,integer,uuid) TO authenticated;

-- Public API wrappers are INVOKER: the only privileged access occurs in
-- fixed private functions that independently check auth.uid, centre, role and gates.
CREATE OR REPLACE FUNCTION public.get_unipathway_exam_session_plans(
 p_tenant uuid,p_offset integer DEFAULT 0,p_limit integer DEFAULT 100
) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_examops.read_impl(p_tenant,p_offset,p_limit) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_exam_session_plans(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_exam_session_plans(uuid,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_save_exam_session_plan(
 p_tenant uuid,p_event uuid,p_capacity integer,p_candidates integer,p_invigilators integer,
 p_seating boolean,p_entries boolean,p_identity boolean,p_emergency boolean,
 p_submit boolean,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_examops.save_impl(p_tenant,p_event,p_capacity,p_candidates,p_invigilators,
 p_seating,p_entries,p_identity,p_emergency,p_submit,p_expected_revision,p_request_id) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_save_exam_session_plan(uuid,uuid,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_save_exam_session_plan(uuid,uuid,integer,integer,integer,boolean,boolean,boolean,boolean,boolean,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unipathway_approve_exam_session_plan(
 p_tenant uuid,p_event uuid,p_expected_revision integer,p_request_id uuid
) RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_examops.approve_impl(p_tenant,p_event,p_expected_revision,p_request_id) $fn$;
REVOKE ALL ON FUNCTION public.unipathway_approve_exam_session_plan(uuid,uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unipathway_approve_exam_session_plan(uuid,uuid,integer,uuid) TO authenticated;
COMMIT;
