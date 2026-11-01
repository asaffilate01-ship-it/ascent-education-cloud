-- STAGING-ONLY FORWARD PATCH: private wellbeing intake, no hosted deployment.
-- Verify UniPathway auth.users, profiles, tenants, user_roles, app_role and project.
-- Never execute on the separate Dishbee project or replay historical migrations.
-- Private clinical/counselling case records MUST NOT appear in platform audit exports.
BEGIN;

CREATE TABLE public.unipathway_welfare_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 anonymous boolean NOT NULL,
 category text NOT NULL CHECK(category IN
 ('mental_health','academic','personal','financial','bullying','accessibility','housing','other')),
 urgency text NOT NULL CHECK(urgency IN ('routine','soon')),
 message text NOT NULL CHECK(length(btrim(message)) BETWEEN 10 AND 3000),
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','follow_up','closed')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES auth.users(id),
 CONSTRAINT wellbeing_privacy_identity CHECK (anonymous = (student_id IS NULL))
);
CREATE INDEX wellbeing_queue_idx ON public.unipathway_welfare_requests
 (tenant_id,status,urgency,created_at DESC);
CREATE INDEX wellbeing_self_idx ON public.unipathway_welfare_requests
 (student_id,created_at DESC) WHERE student_id IS NOT NULL;
ALTER TABLE public.unipathway_welfare_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_welfare_requests FROM PUBLIC,anon,authenticated;

CREATE TABLE public.unipathway_welfare_case_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.unipathway_welfare_requests(id) ON DELETE RESTRICT,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 from_status text NOT NULL,
 to_status text NOT NULL,
 internal_note text NOT NULL CHECK(length(btrim(internal_note)) BETWEEN 12 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.unipathway_welfare_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_welfare_case_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.submit_my_unipathway_welfare_request(
 p_category text,p_message text,p_urgency text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=auth.uid(); v_centre uuid; v_id uuid;
BEGIN
 SELECT p.tenant_id INTO v_centre FROM public.profiles p WHERE p.user_id=v_user;
 IF v_user IS NULL OR v_centre IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_user
   AND r.tenant_id=v_centre AND r.role::text='student'
 ) THEN RAISE EXCEPTION 'Current student membership required' USING ERRCODE='42501';END IF;
 IF p_category NOT IN('mental_health','academic','personal','financial','bullying','accessibility','housing','other')
 OR p_urgency NOT IN('routine','soon')
 OR p_message IS NULL OR length(btrim(p_message)) NOT BETWEEN 10 AND 3000
 THEN RAISE EXCEPTION 'Invalid support request' USING ERRCODE='22023';END IF;
 INSERT INTO public.unipathway_welfare_requests
  (tenant_id,student_id,anonymous,category,message,urgency)
 VALUES(v_centre,v_user,false,p_category,btrim(p_message),p_urgency)
 RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'status','new');
END
$fn$;

CREATE OR REPLACE FUNCTION public.my_unipathway_welfare_requests()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=auth.uid();v_centre uuid;v_rows jsonb;
BEGIN
 SELECT p.tenant_id INTO v_centre FROM public.profiles p WHERE p.user_id=v_user;
 IF v_user IS NULL OR v_centre IS NULL OR NOT EXISTS(
 SELECT 1 FROM public.user_roles r WHERE r.user_id=v_user AND
 r.tenant_id=v_centre AND r.role::text='student')
 THEN RAISE EXCEPTION 'Current student membership required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_rows
 FROM (SELECT id,category,status,created_at FROM public.unipathway_welfare_requests
  WHERE student_id=v_user AND tenant_id=v_centre AND anonymous=false
  ORDER BY created_at DESC LIMIT 100) x;
 RETURN v_rows;
END
$fn$;

CREATE OR REPLACE FUNCTION public.get_unipathway_welfare_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=auth.uid();v_centre uuid;v_rows jsonb;
BEGIN
 SELECT p.tenant_id INTO v_centre FROM public.profiles p WHERE p.user_id=v_user;
 IF v_user IS NULL OR v_centre IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_user
  AND r.tenant_id=v_centre AND r.role::text='welfare_officer'
 ) THEN RAISE EXCEPTION 'Verified Welfare Officer role required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_rows
 FROM (SELECT id,category,urgency,status,message,anonymous,student_id,
  created_at,updated_at,reviewed_by,revision
  FROM public.unipathway_welfare_requests
  WHERE tenant_id=v_centre ORDER BY created_at DESC LIMIT 100) x;
 RETURN v_rows;
END
$fn$;

CREATE OR REPLACE FUNCTION public.review_unipathway_welfare_request(
 p_request uuid,p_status text,p_internal_note text,p_expected_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_user uuid:=auth.uid(); v_centre uuid;
 v_row public.unipathway_welfare_requests%ROWTYPE;
BEGIN
 SELECT p.tenant_id INTO v_centre FROM public.profiles p WHERE p.user_id=v_user;
 IF v_user IS NULL OR v_centre IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_user
  AND r.tenant_id=v_centre AND r.role::text='welfare_officer'
 ) THEN RAISE EXCEPTION 'Verified Welfare Officer role required' USING ERRCODE='42501';END IF;
 IF p_status NOT IN('reviewing','follow_up','closed') OR
 p_internal_note IS NULL OR length(btrim(p_internal_note)) NOT BETWEEN 12 AND 2000
 OR p_expected_revision IS NULL OR p_expected_revision<1
 THEN RAISE EXCEPTION 'Invalid welfare review' USING ERRCODE='22023';END IF;
 SELECT * INTO v_row FROM public.unipathway_welfare_requests
 WHERE id=p_request AND tenant_id=v_centre FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Case unavailable' USING ERRCODE='42501';END IF;
 IF v_row.revision<>p_expected_revision
 THEN RAISE EXCEPTION 'Case has changed; reload before review' USING ERRCODE='40001';END IF;
 IF v_row.status='closed' AND p_status<>'closed'
 THEN RAISE EXCEPTION 'Closed case reopening requires separate safeguarding approval' USING ERRCODE='42501';END IF;
 UPDATE public.unipathway_welfare_requests
 SET status=p_status,revision=revision+1,reviewed_by=v_user,updated_at=now()
 WHERE id=p_request AND tenant_id=v_centre;
 INSERT INTO public.unipathway_welfare_case_events
 (request_id,tenant_id,reviewer_id,from_status,to_status,internal_note)
 VALUES(p_request,v_centre,v_user,v_row.status,p_status,btrim(p_internal_note));
 RETURN jsonb_build_object('id',p_request,'status',p_status,'revision',v_row.revision+1);
END
$fn$;

-- Private portal replies are available only for linked confidential requests.
-- Anonymous senders have no account association and cannot be contacted.
CREATE TABLE public.unipathway_welfare_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.unipathway_welfare_requests(id) ON DELETE RESTRICT,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 welfare_user_id uuid NOT NULL REFERENCES auth.users(id),
 request_nonce uuid NOT NULL,
 message text NOT NULL CHECK(length(btrim(message)) BETWEEN 15 AND 2500),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_id,request_nonce)
);
ALTER TABLE public.unipathway_welfare_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_welfare_replies FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_unipathway_welfare_request(
 p_request uuid,p_message text,p_nonce uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;
 v_case public.unipathway_welfare_requests%ROWTYPE;v_id uuid;
BEGIN
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 IF v_actor IS NULL OR v_centre IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text='welfare_officer')
 THEN RAISE EXCEPTION 'Welfare role and centre required' USING ERRCODE='42501';END IF;
 IF p_nonce IS NULL OR p_message IS NULL OR length(btrim(p_message)) NOT BETWEEN 15 AND 2500
 THEN RAISE EXCEPTION 'Invalid private response' USING ERRCODE='22023';END IF;
 SELECT * INTO v_case FROM public.unipathway_welfare_requests
 WHERE id=p_request AND tenant_id=v_centre FOR UPDATE;
 IF NOT FOUND OR v_case.anonymous OR v_case.student_id IS NULL OR v_case.status='closed'
 THEN RAISE EXCEPTION 'No contactable active student request exists' USING ERRCODE='42501';END IF;
 INSERT INTO public.unipathway_welfare_replies
 (request_id,tenant_id,welfare_user_id,message,request_nonce)
 VALUES(p_request,v_centre,v_actor,btrim(p_message),p_nonce)
 ON CONFLICT (request_id,request_nonce) DO NOTHING
 RETURNING id INTO v_id;
 IF v_id IS NULL THEN
  SELECT id INTO v_id FROM public.unipathway_welfare_replies
  WHERE request_id=p_request AND request_nonce=p_nonce;
 ELSE
  UPDATE public.unipathway_welfare_requests SET status='follow_up',
   revision=revision+1,reviewed_by=v_actor,updated_at=now()
   WHERE id=p_request AND tenant_id=v_centre;
  INSERT INTO public.unipathway_welfare_case_events
  (request_id,tenant_id,reviewer_id,from_status,to_status,internal_note)
  VALUES(p_request,v_centre,v_actor,v_case.status,'follow_up',
   'Private student portal reply recorded');
 END IF;
 RETURN jsonb_build_object('id',v_id,'requestId',p_request,'status','recorded');
END
$fn$;

CREATE OR REPLACE FUNCTION public.my_unipathway_welfare_replies(p_request uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=auth.uid();v_centre uuid;v_rows jsonb;
BEGIN
 SELECT tenant_id INTO v_centre FROM public.profiles WHERE user_id=v_actor;
 IF v_actor IS NULL OR v_centre IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.user_roles r WHERE r.user_id=v_actor
   AND r.tenant_id=v_centre AND r.role::text='student')
 OR NOT EXISTS(SELECT 1 FROM public.unipathway_welfare_requests w
  WHERE w.id=p_request AND w.tenant_id=v_centre AND w.student_id=v_actor AND NOT w.anonymous)
 THEN RAISE EXCEPTION 'Private student request not available' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at),'[]'::jsonb) INTO v_rows
 FROM (SELECT id,message,created_at FROM public.unipathway_welfare_replies
  WHERE request_id=p_request AND tenant_id=v_centre ORDER BY created_at LIMIT 100) x;
 RETURN v_rows;
END
$fn$;

REVOKE ALL ON FUNCTION public.submit_my_unipathway_welfare_request(text,text,text),
 public.my_unipathway_welfare_requests(),public.get_unipathway_welfare_queue(),
 public.review_unipathway_welfare_request(uuid,text,text,integer),
 public.respond_to_unipathway_welfare_request(uuid,text,uuid),
 public.my_unipathway_welfare_replies(uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_my_unipathway_welfare_request(text,text,text),
 public.my_unipathway_welfare_requests(),public.get_unipathway_welfare_queue(),
 public.review_unipathway_welfare_request(uuid,text,text,integer),
 public.respond_to_unipathway_welfare_request(uuid,text,uuid),
 public.my_unipathway_welfare_replies(uuid)
 TO authenticated;

-- Only the separately authenticated, CAPTCHA-verified Edge service uses the
-- service_role to insert anonymous tickets. There is no anonymous direct
-- PostgREST table grant and no unrestricted public SECURITY DEFINER endpoint.
COMMIT;
