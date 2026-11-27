-- Reviewed forward patch. Requires the institutional approval/session patch.
-- No production activation, approvals or synthetic data are included.
BEGIN;
ALTER TABLE unipathway_identity.login_events ADD COLUMN centre_id uuid;
ALTER TABLE unipathway_identity.login_events ADD COLUMN email_at_event text;
-- Historical rows without a captured centre are not attributed to a current profile.
CREATE INDEX institutional_login_events_centre_time ON unipathway_identity.login_events(centre_id,occurred_at DESC,id DESC);
CREATE TABLE unipathway_identity.login_audit_activation(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),enabled boolean NOT NULL DEFAULT false);
INSERT INTO unipathway_identity.login_audit_activation(singleton) VALUES(true);
ALTER TABLE unipathway_identity.login_audit_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_identity.login_audit_activation FROM PUBLIC,anon,authenticated,supabase_auth_admin;
CREATE TABLE unipathway_identity.login_audit_reviewers(user_id uuid NOT NULL,centre_id uuid NOT NULL,approval_reference text NOT NULL CHECK(length(btrim(approval_reference)) BETWEEN 1 AND 200),revoked_at timestamptz,PRIMARY KEY(user_id,centre_id));
ALTER TABLE unipathway_identity.login_audit_reviewers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_identity.login_audit_reviewers FROM PUBLIC,anon,authenticated,supabase_auth_admin;
CREATE TABLE unipathway_identity.login_audit_reads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),reviewer_id uuid NOT NULL,centre_id uuid NOT NULL,reviewed_at timestamptz NOT NULL DEFAULT now(),days integer NOT NULL,email_filter_used boolean NOT NULL,rows_returned integer NOT NULL CHECK(rows_returned BETWEEN 0 AND 100));
ALTER TABLE unipathway_identity.login_audit_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON unipathway_identity.login_audit_reads FROM PUBLIC,anon,authenticated,supabase_auth_admin;
CREATE OR REPLACE FUNCTION unipathway_identity.capture_session_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE kind text; v_centre uuid;v_email text;
BEGIN
 SELECT p.tenant_id,a.approved_email INTO v_centre,v_email
 FROM unipathway_identity.approved_accounts a
 JOIN auth.users u ON u.id=a.user_id AND lower(u.email)=a.approved_email
 JOIN public.profiles p ON p.user_id=a.user_id
 WHERE a.user_id=NEW.user_id AND a.revoked_at IS NULL;
 IF NOT FOUND THEN RETURN NEW;END IF;
 IF TG_OP='INSERT' THEN kind:='session_created';
 ELSIF OLD.aal IS DISTINCT FROM NEW.aal THEN kind:='assurance_changed';
 ELSIF OLD.ip IS DISTINCT FROM NEW.ip THEN kind:='network_changed';
 ELSE RETURN NEW;END IF;
 INSERT INTO unipathway_identity.login_events(session_id,user_id,event_kind,ip,user_agent,aal,centre_id,email_at_event)
 VALUES(NEW.id,NEW.user_id,kind,NEW.ip,left(NEW.user_agent,1024),NEW.aal::text,v_centre,v_email);
 RETURN NEW;
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_identity.capture_session_event() FROM PUBLIC,anon,authenticated,supabase_auth_admin;

CREATE FUNCTION unipathway_identity.read_login_audit(p_centre uuid,p_days integer,p_email text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_actor uuid:=(SELECT auth.uid());v_events jsonb;v_truncated boolean;v_now timestamptz:=now();
BEGIN
 IF v_actor IS NULL OR NOT coalesce(unipathway_identity.session_approved(),false)
 OR NOT EXISTS(SELECT 1 FROM unipathway_identity.login_audit_activation WHERE singleton AND enabled)
 OR NOT EXISTS(SELECT 1 FROM unipathway_identity.login_audit_reviewers d
 JOIN public.profiles p ON p.user_id=d.user_id AND p.tenant_id=d.centre_id
 JOIN public.tenants t ON t.id=d.centre_id AND t.status::text='active'
 JOIN public.user_roles r ON r.user_id=d.user_id AND r.tenant_id IS NULL AND r.role::text='superadmin'
 WHERE d.user_id=v_actor AND d.centre_id=p_centre AND d.revoked_at IS NULL)
 THEN RAISE EXCEPTION 'Verified login audit reviewer required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN (7,30,90) OR (p_email IS NOT NULL AND (p_email !~ '^[a-z0-9][a-z0-9._+-]{0,63}@unipathway[.]pk$' OR position('..' in split_part(p_email,'@',1))>0))
 THEN RAISE EXCEPTION 'Invalid audit filter' USING ERRCODE='22023';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.occurred_at DESC,r.id DESC),'[]'::jsonb) INTO v_events
 FROM (SELECT e.id,e.centre_id,e.email_at_event,e.event_kind,e.occurred_at,host(e.ip) AS ip,e.aal
 FROM unipathway_identity.login_events e
 WHERE e.centre_id=p_centre AND e.email_at_event IS NOT NULL
 AND e.occurred_at>=v_now-make_interval(days=>p_days) AND e.occurred_at<=v_now
 AND (p_email IS NULL OR e.email_at_event=p_email)
 ORDER BY e.occurred_at DESC,e.id DESC LIMIT 101) r;
 v_truncated:=jsonb_array_length(v_events)>100;
 IF v_truncated THEN v_events:=v_events-100;END IF;
 INSERT INTO unipathway_identity.login_audit_reads(reviewer_id,centre_id,days,email_filter_used,rows_returned)
 VALUES(v_actor,p_centre,p_days,p_email IS NOT NULL,jsonb_array_length(v_events));
 RETURN jsonb_build_object('centre_id',p_centre,'days',p_days,'email_filter',p_email,'reviewed_at',v_now,'events',v_events,'truncated',v_truncated);
END;$fn$;
REVOKE ALL ON FUNCTION unipathway_identity.read_login_audit(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION unipathway_identity.read_login_audit(uuid,integer,text) TO authenticated;
CREATE FUNCTION public.get_unipathway_login_audit(p_centre uuid,p_days integer,p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$ SELECT unipathway_identity.read_login_audit(p_centre,p_days,p_email) $fn$;
REVOKE ALL ON FUNCTION public.get_unipathway_login_audit(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_unipathway_login_audit(uuid,integer,text) TO authenticated;
COMMIT;
