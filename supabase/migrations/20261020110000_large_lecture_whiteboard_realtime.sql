-- UniPathway whiteboards for 100+ student lectures.
-- Staging-only until prior Teams migrations, invitation RLS, performance/security tests.
-- Playback is a durable whiteboard timeline, NOT a Teams audio/video recording.
BEGIN;

ALTER TABLE public.lesson_whiteboards
  ADD COLUMN IF NOT EXISTS current_sequence bigint NOT NULL DEFAULT 0;
ALTER TABLE public.lesson_whiteboards
  ADD CONSTRAINT lesson_whiteboards_positive_sequence CHECK (current_sequence >= 0);

CREATE TABLE IF NOT EXISTS public.lesson_whiteboard_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.lesson_whiteboards(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
  sequence bigint NOT NULL,
  actor_id uuid NOT NULL,
  operation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, sequence)
);
CREATE INDEX IF NOT EXISTS whiteboard_ops_actor_rate_idx
 ON public.lesson_whiteboard_operations(board_id,actor_id,created_at DESC);
CREATE INDEX IF NOT EXISTS whiteboard_ops_timeline_idx
 ON public.lesson_whiteboard_operations(board_id,created_at,sequence);
ALTER TABLE public.lesson_whiteboard_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whiteboard operations invited class read"
 ON public.lesson_whiteboard_operations FOR SELECT TO authenticated
 USING(public.can_join_unipathway_class(session_id)
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id));
-- No direct INSERT/UPDATE/DELETE policy; all mutations go through validated RPC.
REVOKE INSERT, UPDATE, DELETE ON public.lesson_whiteboard_operations FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.lesson_whiteboard_snapshots (
 board_id uuid NOT NULL REFERENCES public.lesson_whiteboards(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 through_sequence bigint NOT NULL CHECK (through_sequence >= 0),
 shapes jsonb NOT NULL,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(board_id,through_sequence)
);
ALTER TABLE public.lesson_whiteboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whiteboard snapshot invited class read"
 ON public.lesson_whiteboard_snapshots FOR SELECT TO authenticated
 USING(public.can_join_unipathway_class(session_id)
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id));
REVOKE INSERT, UPDATE, DELETE ON public.lesson_whiteboard_snapshots FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.lesson_whiteboard_view_receipts (
 board_id uuid NOT NULL REFERENCES public.lesson_whiteboards(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL,
 session_id uuid NOT NULL REFERENCES public.live_class_sessions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 first_opened_at timestamptz NOT NULL DEFAULT now(),
 last_opened_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(board_id,user_id)
);
CREATE INDEX IF NOT EXISTS whiteboard_view_receipt_session_idx
 ON public.lesson_whiteboard_view_receipts(session_id,last_opened_at DESC);
ALTER TABLE public.lesson_whiteboard_view_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whiteboard viewer receipts own or teacher"
 ON public.lesson_whiteboard_view_receipts FOR SELECT TO authenticated
 USING((user_id=auth.uid() OR public.can_manage_unipathway_class(session_id))
  AND tenant_id=(SELECT s.tenant_id FROM public.live_class_sessions s WHERE s.id=session_id));
REVOKE INSERT, UPDATE, DELETE ON public.lesson_whiteboard_view_receipts FROM anon, authenticated;

-- Role validation and board locking are server-side. One operation contains one
-- completed stroke or annotation: users receive one broadcast, not one DB row per point.
CREATE OR REPLACE FUNCTION public.append_unipathway_whiteboard_operation(p_board uuid,p_operation jsonb)
RETURNS TABLE(sequence bigint,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $whiteboard_append$
DECLARE
 b public.lesson_whiteboards%ROWTYPE;
 v_kind text; v_n int; v_sequence bigint; v_timestamp timestamptz:=clock_timestamp();
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.lesson_whiteboards WHERE id=p_board FOR UPDATE;
 IF NOT FOUND OR b.session_id IS NULL THEN RAISE EXCEPTION 'Whiteboard unavailable' USING ERRCODE='42501'; END IF;
 IF NOT public.can_manage_unipathway_class(b.session_id) THEN
  RAISE EXCEPTION 'Class editing permission required' USING ERRCODE='42501';
 END IF;
 IF b.locked_after_class THEN RAISE EXCEPTION 'Whiteboard locked' USING ERRCODE='42501'; END IF;
 IF p_operation IS NULL OR jsonb_typeof(p_operation)<>'object'
    OR octet_length(p_operation::text)>16000 THEN
  RAISE EXCEPTION 'Invalid whiteboard operation';
 END IF;
 v_kind:=p_operation->>'type';
 IF v_kind='stroke' THEN
  IF jsonb_typeof(p_operation->'points')<>'array' THEN RAISE EXCEPTION 'Stroke points required'; END IF;
  v_n:=jsonb_array_length(p_operation->'points');
  IF v_n<2 OR v_n>240 THEN RAISE EXCEPTION 'Stroke must contain 2–240 points'; END IF;
  IF NOT (p_operation->>'color' ~ '^#[0-9a-fA-F]{6}$') THEN RAISE EXCEPTION 'Invalid stroke colour'; END IF;
  IF p_operation->>'width' IS NULL OR (p_operation->>'width')::numeric<1 OR (p_operation->>'width')::numeric>24
    THEN RAISE EXCEPTION 'Invalid stroke width'; END IF;
  IF EXISTS(
   SELECT 1 FROM jsonb_array_elements(p_operation->'points') pt
   WHERE jsonb_typeof(pt)<>'array' OR jsonb_array_length(pt)<>2
    OR jsonb_typeof(pt->0)<>'number' OR jsonb_typeof(pt->1)<>'number'
    OR (pt->>0)::numeric NOT BETWEEN 0 AND 1000
    OR (pt->>1)::numeric NOT BETWEEN 0 AND 563
  ) THEN RAISE EXCEPTION 'Stroke points outside canvas'; END IF;
 ELSIF v_kind='text' THEN
  IF NOT (p_operation->>'color' ~ '^#[0-9a-fA-F]{6}
   OR p_operation->>'x' IS NULL OR p_operation->>'y' IS NULL
   OR (p_operation->>'x')::numeric NOT BETWEEN 0 AND 1000
   OR (p_operation->>'y')::numeric NOT BETWEEN 0 AND 563
  THEN RAISE EXCEPTION 'Invalid text annotation'; END IF;
 ELSIF v_kind='clear' THEN
  NULL;
 ELSE
  RAISE EXCEPTION 'Unsupported whiteboard action';
 END IF;
 -- Defence in depth: cap write bursts even when a teacher client misbehaves.
 IF (SELECT count(*) FROM public.lesson_whiteboard_operations
     WHERE board_id=p_board AND actor_id=auth.uid()
       AND created_at>v_timestamp-interval '1 second')>=6 THEN
  RAISE EXCEPTION 'Too many whiteboard updates: please slow down';
 END IF;
 UPDATE public.lesson_whiteboards SET current_sequence=current_sequence+1,updated_at=v_timestamp
 WHERE id=p_board RETURNING current_sequence INTO v_sequence;
 INSERT INTO public.lesson_whiteboard_operations(board_id,tenant_id,session_id,sequence,actor_id,operation,created_at)
 VALUES(b.id,b.tenant_id,b.session_id,v_sequence,auth.uid(),p_operation,v_timestamp);
 sequence:=v_sequence;created_at:=v_timestamp;RETURN NEXT;
END
$whiteboard_append$;

-- Snapshot every 25-50 operations; late joiners load checkpoint + delta.
-- Timeline rows are retained for the independent board replay.
CREATE OR REPLACE FUNCTION public.save_unipathway_whiteboard_snapshot(
 p_board uuid,p_through_sequence bigint,p_shapes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $whiteboard_snap$
DECLARE b public.lesson_whiteboards%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.lesson_whiteboards WHERE id=p_board FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_unipathway_class(b.session_id)
  THEN RAISE EXCEPTION 'Snapshot access denied' USING ERRCODE='42501'; END IF;
 IF b.locked_after_class OR p_through_sequence>b.current_sequence OR p_through_sequence<0
  THEN RAISE EXCEPTION 'Invalid snapshot sequence'; END IF;
 IF jsonb_typeof(p_shapes)<>'array' OR octet_length(p_shapes::text)>524288
   OR jsonb_array_length(p_shapes)>3000
  THEN RAISE EXCEPTION 'Snapshot too large'; END IF;
 -- Immutable checkpoints, not silent rewrites of revision history.
 INSERT INTO public.lesson_whiteboard_snapshots
  (board_id,tenant_id,session_id,through_sequence,shapes,created_by)
 VALUES(b.id,b.tenant_id,b.session_id,p_through_sequence,p_shapes,auth.uid())
 ON CONFLICT DO NOTHING;
END
$whiteboard_snap$;

-- Whiteboard view is NOT authenticated Microsoft Teams meeting attendance.
-- One row per user, 60-second heartbeat; no per-stroke student writes.
CREATE OR REPLACE FUNCTION public.note_unipathway_whiteboard_view(p_board uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $whiteboard_view$
DECLARE b public.lesson_whiteboards%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.lesson_whiteboards WHERE id=p_board;
 IF NOT FOUND OR NOT public.can_join_unipathway_class(b.session_id)
  THEN RAISE EXCEPTION 'Whiteboard not available' USING ERRCODE='42501'; END IF;
 INSERT INTO public.lesson_whiteboard_view_receipts(board_id,session_id,tenant_id,user_id)
 VALUES(b.id,b.session_id,b.tenant_id,auth.uid())
 ON CONFLICT(board_id,user_id) DO UPDATE SET last_opened_at=now()
 WHERE lesson_whiteboard_view_receipts.last_opened_at<now()-interval '55 seconds';
END
$whiteboard_view$;

-- Bulk onboarding: all and only ACTIVE enrolled learners within the session
-- capacity, in one transaction; existing revoked invites are NOT reactivated.
CREATE OR REPLACE FUNCTION public.invite_enrolled_unipathway_lecture(p_session uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $invite_lecture$
DECLARE s public.live_class_sessions%ROWTYPE; v_added int; v_existing int; v_total int;
BEGIN
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND OR s.module_id IS NULL OR NOT public.can_manage_unipathway_class(s.id)
   THEN RAISE EXCEPTION 'Class invitation permission denied' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO v_existing FROM public.live_class_invitations
  WHERE session_id=s.id AND status IN ('invited','accepted');
 SELECT count(DISTINCT e.student_id) INTO v_total FROM public.modules m
  JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
  WHERE m.id=s.module_id AND m.tenant_id=s.tenant_id AND e.status='active';
 IF v_total > s.capacity THEN
   RAISE EXCEPTION 'Enrolment (%) exceeds planned class capacity (%); change capacity or split the lecture',
   v_total,s.capacity;
 END IF;
 INSERT INTO public.live_class_invitations(tenant_id,session_id,user_id,invited_by,status)
 SELECT DISTINCT s.tenant_id,s.id,e.student_id,auth.uid(),'invited'
 FROM public.modules m JOIN public.student_enrolments e
  ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
 WHERE m.id=s.module_id AND m.tenant_id=s.tenant_id AND e.status='active'
 ON CONFLICT(session_id,user_id) DO NOTHING;
 GET DIAGNOSTICS v_added=ROW_COUNT;
 RETURN v_added;
END
$invite_lecture$;

-- Private channel authorization, no client INSERT/Broadcast permission granted.
-- A presenter can broadcast only through durable server-validated RPC events.
CREATE POLICY "UniPathway private whiteboard receivers" ON realtime.messages
 FOR SELECT TO authenticated USING (
  extension='broadcast'
  AND realtime.topic() LIKE 'unipathway:whiteboard:%'
  AND EXISTS(SELECT 1 FROM public.lesson_whiteboards b
   WHERE realtime.topic()='unipathway:whiteboard:'||b.id::text
     AND public.can_join_unipathway_class(b.session_id))
 );
CREATE OR REPLACE FUNCTION public.publish_unipathway_whiteboard_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $board_broadcast$
BEGIN
 -- Broadcast is a latency optimisation: the canonical operation is already
 -- in Postgres. If Realtime is unavailable, clients recover via delta polling.
 BEGIN
  PERFORM realtime.send(jsonb_build_object(
   'boardId',NEW.board_id,'sequence',NEW.sequence,
   'operation',NEW.operation,'createdAt',NEW.created_at),
   'operation','unipathway:whiteboard:'||NEW.board_id::text,true);
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Whiteboard broadcast unavailable, durable operation still stored';
 END;
 RETURN NEW;
END
$board_broadcast$;
CREATE TRIGGER broadcast_unipathway_whiteboard_operation
 AFTER INSERT ON public.lesson_whiteboard_operations
 FOR EACH ROW EXECUTE FUNCTION public.publish_unipathway_whiteboard_operation();

REVOKE ALL ON FUNCTION public.append_unipathway_whiteboard_operation(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_unipathway_whiteboard_snapshot(uuid,bigint,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.note_unipathway_whiteboard_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_enrolled_unipathway_lecture(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_unipathway_whiteboard_operation(uuid,jsonb),
 public.save_unipathway_whiteboard_snapshot(uuid,bigint,jsonb),
 public.note_unipathway_whiteboard_view(uuid),
 public.invite_enrolled_unipathway_lecture(uuid) TO authenticated;

COMMIT;
) THEN RAISE EXCEPTION 'Invalid text colour'; END IF;
  IF length(coalesce(p_operation->>'text','')) NOT BETWEEN 1 AND 180
   OR p_operation->>'x' IS NULL OR p_operation->>'y' IS NULL
   OR (p_operation->>'x')::numeric NOT BETWEEN 0 AND 1000
   OR (p_operation->>'y')::numeric NOT BETWEEN 0 AND 1000
  THEN RAISE EXCEPTION 'Invalid text annotation'; END IF;
 ELSIF v_kind<>'clear' THEN RAISE EXCEPTION 'Unsupported whiteboard action'; END IF;
 -- Defence in depth: cap write bursts even when a teacher client misbehaves.
 IF (SELECT count(*) FROM public.lesson_whiteboard_operations
     WHERE board_id=p_board AND actor_id=auth.uid()
       AND created_at>v_timestamp-interval '1 second')>=6 THEN
  RAISE EXCEPTION 'Too many whiteboard updates: please slow down';
 END IF;
 UPDATE public.lesson_whiteboards SET current_sequence=current_sequence+1,updated_at=v_timestamp
 WHERE id=p_board RETURNING current_sequence INTO v_sequence;
 INSERT INTO public.lesson_whiteboard_operations(board_id,tenant_id,session_id,sequence,actor_id,operation,created_at)
 VALUES(b.id,b.tenant_id,b.session_id,v_sequence,auth.uid(),p_operation,v_timestamp);
 sequence:=v_sequence;created_at:=v_timestamp;RETURN NEXT;
END
$whiteboard_append$;

-- Snapshot every 25-50 operations; late joiners load checkpoint + delta.
-- Timeline rows are retained for the independent board replay.
CREATE OR REPLACE FUNCTION public.save_unipathway_whiteboard_snapshot(
 p_board uuid,p_through_sequence bigint,p_shapes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $whiteboard_snap$
DECLARE b public.lesson_whiteboards%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.lesson_whiteboards WHERE id=p_board FOR UPDATE;
 IF NOT FOUND OR NOT public.can_manage_unipathway_class(b.session_id)
  THEN RAISE EXCEPTION 'Snapshot access denied' USING ERRCODE='42501'; END IF;
 IF b.locked_after_class OR p_through_sequence>b.current_sequence OR p_through_sequence<0
  THEN RAISE EXCEPTION 'Invalid snapshot sequence'; END IF;
 IF jsonb_typeof(p_shapes)<>'array' OR octet_length(p_shapes::text)>524288
   OR jsonb_array_length(p_shapes)>3000
  THEN RAISE EXCEPTION 'Snapshot too large'; END IF;
 -- Immutable checkpoints, not silent rewrites of revision history.
 INSERT INTO public.lesson_whiteboard_snapshots
  (board_id,tenant_id,session_id,through_sequence,shapes,created_by)
 VALUES(b.id,b.tenant_id,b.session_id,p_through_sequence,p_shapes,auth.uid())
 ON CONFLICT DO NOTHING;
END
$whiteboard_snap$;

-- Whiteboard view is NOT authenticated Microsoft Teams meeting attendance.
-- One row per user, 60-second heartbeat; no per-stroke student writes.
CREATE OR REPLACE FUNCTION public.note_unipathway_whiteboard_view(p_board uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $whiteboard_view$
DECLARE b public.lesson_whiteboards%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.lesson_whiteboards WHERE id=p_board;
 IF NOT FOUND OR NOT public.can_join_unipathway_class(b.session_id)
  THEN RAISE EXCEPTION 'Whiteboard not available' USING ERRCODE='42501'; END IF;
 INSERT INTO public.lesson_whiteboard_view_receipts(board_id,session_id,tenant_id,user_id)
 VALUES(b.id,b.session_id,b.tenant_id,auth.uid())
 ON CONFLICT(board_id,user_id) DO UPDATE SET last_opened_at=now()
 WHERE lesson_whiteboard_view_receipts.last_opened_at<now()-interval '55 seconds';
END
$whiteboard_view$;

-- Bulk onboarding: all and only ACTIVE enrolled learners within the session
-- capacity, in one transaction; existing revoked invites are NOT reactivated.
CREATE OR REPLACE FUNCTION public.invite_enrolled_unipathway_lecture(p_session uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $invite_lecture$
DECLARE s public.live_class_sessions%ROWTYPE; v_added int; v_existing int; v_total int;
BEGIN
 SELECT * INTO s FROM public.live_class_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND OR s.module_id IS NULL OR NOT public.can_manage_unipathway_class(s.id)
   THEN RAISE EXCEPTION 'Class invitation permission denied' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO v_existing FROM public.live_class_invitations
  WHERE session_id=s.id AND status IN ('invited','accepted');
 SELECT count(DISTINCT e.student_id) INTO v_total FROM public.modules m
  JOIN public.student_enrolments e ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
  WHERE m.id=s.module_id AND m.tenant_id=s.tenant_id AND e.status='active';
 IF v_total > s.capacity THEN
   RAISE EXCEPTION 'Enrolment (%) exceeds planned class capacity (%); change capacity or split the lecture',
   v_total,s.capacity;
 END IF;
 INSERT INTO public.live_class_invitations(tenant_id,session_id,user_id,invited_by,status)
 SELECT DISTINCT s.tenant_id,s.id,e.student_id,auth.uid(),'invited'
 FROM public.modules m JOIN public.student_enrolments e
  ON e.programme_id=m.programme_id AND e.tenant_id=m.tenant_id
 WHERE m.id=s.module_id AND m.tenant_id=s.tenant_id AND e.status='active'
 ON CONFLICT(session_id,user_id) DO NOTHING;
 GET DIAGNOSTICS v_added=ROW_COUNT;
 RETURN v_added;
END
$invite_lecture$;

-- Private channel authorization, no client INSERT/Broadcast permission granted.
-- A presenter can broadcast only through durable server-validated RPC events.
CREATE POLICY "UniPathway private whiteboard receivers" ON realtime.messages
 FOR SELECT TO authenticated USING (
  extension='broadcast'
  AND realtime.topic() LIKE 'unipathway:whiteboard:%'
  AND EXISTS(SELECT 1 FROM public.lesson_whiteboards b
   WHERE realtime.topic()='unipathway:whiteboard:'||b.id::text
     AND public.can_join_unipathway_class(b.session_id))
 );
CREATE OR REPLACE FUNCTION public.publish_unipathway_whiteboard_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $board_broadcast$
BEGIN
 -- Broadcast is a latency optimisation: the canonical operation is already
 -- in Postgres. If Realtime is unavailable, clients recover via delta polling.
 BEGIN
  PERFORM realtime.send(jsonb_build_object(
   'boardId',NEW.board_id,'sequence',NEW.sequence,
   'operation',NEW.operation,'createdAt',NEW.created_at),
   'operation','unipathway:whiteboard:'||NEW.board_id::text,true);
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Whiteboard broadcast unavailable, durable operation still stored';
 END;
 RETURN NEW;
END
$board_broadcast$;
CREATE TRIGGER broadcast_unipathway_whiteboard_operation
 AFTER INSERT ON public.lesson_whiteboard_operations
 FOR EACH ROW EXECUTE FUNCTION public.publish_unipathway_whiteboard_operation();

REVOKE ALL ON FUNCTION public.append_unipathway_whiteboard_operation(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_unipathway_whiteboard_snapshot(uuid,bigint,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.note_unipathway_whiteboard_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_enrolled_unipathway_lecture(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_unipathway_whiteboard_operation(uuid,jsonb),
 public.save_unipathway_whiteboard_snapshot(uuid,bigint,jsonb),
 public.note_unipathway_whiteboard_view(uuid),
 public.invite_enrolled_unipathway_lecture(uuid) TO authenticated;

COMMIT;
