-- Reviewed forward patch. Requires existing active tenants, applications and durable enquiry quota.
-- Do not apply to any unrelated project. No automatic activation or emails.
BEGIN;
CREATE SCHEMA unipathway_messages;
REVOKE ALL ON SCHEMA unipathway_messages FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA unipathway_messages TO service_role;
CREATE TABLE unipathway_messages.intake(
 request_id uuid PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 channel text NOT NULL CHECK(channel IN ('admissions','recruitment')),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND length(payload::text)<=16000),
 application_id uuid REFERENCES public.applications(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 team_email_id text,
 receipt_email_id text,
 CHECK((channel='admissions' AND application_id IS NOT NULL) OR (channel='recruitment' AND application_id IS NULL))
);
ALTER TABLE unipathway_messages.intake ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_messages.intake FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE(team_email_id,receipt_email_id) ON unipathway_messages.intake TO service_role;
CREATE INDEX unipathway_message_retention ON unipathway_messages.intake(created_at);

CREATE FUNCTION public.prepare_unipathway_public_message(p_request uuid,p_channel text,p_payload jsonb,p_email_digest text,p_global_digest text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE v_tenant uuid;v_application uuid;v_row unipathway_messages.intake%ROWTYPE;v_notes text;
BEGIN
 IF p_request IS NULL OR p_channel IS NULL OR p_channel NOT IN ('admissions','recruitment') OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
 OR length(p_payload::text)>16000 OR NOT (p_payload ?& ARRAY['name','email','phone','subject','message'])
 OR length(coalesce(p_payload->>'name','')) NOT BETWEEN 2 AND 200
 OR length(coalesce(p_payload->>'email','')) NOT BETWEEN 3 AND 254
 OR length(coalesce(p_payload->>'message','')) NOT BETWEEN 10 AND 5000
 OR coalesce(p_email_digest,'') !~ '^[a-f0-9]{64}$' OR coalesce(p_global_digest,'') !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'Invalid message request' USING ERRCODE='22023';END IF;
 -- Same request serialisation. The service validates CAPTCHA and payload before entry.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 SELECT id INTO v_tenant FROM public.tenants WHERE slug='unipathway' AND status::text='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'Active admissions centre required' USING ERRCODE='42501';END IF;
 SELECT * INTO v_row FROM unipathway_messages.intake WHERE request_id=p_request;
 IF FOUND THEN
  IF v_row.tenant_id IS DISTINCT FROM v_tenant OR v_row.channel IS DISTINCT FROM p_channel OR v_row.payload IS DISTINCT FROM p_payload
  THEN RAISE EXCEPTION 'Request cannot be reused for different details' USING ERRCODE='22023';END IF;
 ELSE
  -- Durable hourly recipient and global anti-abuse limits. Retries of a stored
  -- command do not consume another quota or create another CRM record.
  IF NOT public.consume_unipathway_enquiry_quota(p_email_digest,4) OR NOT public.consume_unipathway_enquiry_quota(p_global_digest,20)
  THEN RETURN jsonb_build_object('allowed',false);END IF;
  IF p_channel='admissions' THEN
   v_notes:=left('Subject: '||(p_payload->>'subject')||chr(10)||chr(10)||'Applicant message: '||(p_payload->>'message')||chr(10)||chr(10)||'Privacy notice acknowledged: yes',5500);
   INSERT INTO public.applications(tenant_id,student_name,email,phone,source,stage,notes)
   VALUES(v_tenant,p_payload->>'name',p_payload->>'email',nullif(left(p_payload->>'phone',20),''),'contact_form','lead',v_notes)
   RETURNING id INTO v_application;
  END IF;
  INSERT INTO unipathway_messages.intake(request_id,tenant_id,channel,payload,application_id)
  VALUES(p_request,v_tenant,p_channel,p_payload,v_application)
  RETURNING * INTO v_row;
 END IF;
 RETURN jsonb_build_object('allowed',true,'request_id',v_row.request_id,'channel',v_row.channel,'created_at',v_row.created_at,'team_accepted',v_row.team_email_id IS NOT NULL,'receipt_accepted',v_row.receipt_email_id IS NOT NULL);
END;$fn$;
REVOKE ALL ON FUNCTION public.prepare_unipathway_public_message(uuid,text,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_unipathway_public_message(uuid,text,jsonb,text,text) TO service_role;

CREATE FUNCTION public.confirm_unipathway_public_message_mail(p_request uuid,p_kind text,p_email_id text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('team','receipt') OR p_email_id IS NULL OR length(p_email_id) NOT BETWEEN 1 AND 120 THEN RETURN false;END IF;
 IF p_kind='team' THEN
  UPDATE unipathway_messages.intake SET team_email_id=p_email_id WHERE request_id=p_request AND (team_email_id IS NULL OR team_email_id=p_email_id);
 ELSE
  UPDATE unipathway_messages.intake SET receipt_email_id=p_email_id WHERE request_id=p_request AND (receipt_email_id IS NULL OR receipt_email_id=p_email_id);
 END IF;
 RETURN FOUND;
END;$fn$;
REVOKE ALL ON FUNCTION public.confirm_unipathway_public_message_mail(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_unipathway_public_message_mail(uuid,text,text) TO service_role;
COMMIT;
