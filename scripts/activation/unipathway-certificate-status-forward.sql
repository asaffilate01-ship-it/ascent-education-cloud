-- Reviewed one-time forward candidate for public certificate status verification.
-- This lookup is intentionally public; return only a minimal status, not names or grades.
-- Never enable issuance or create certificate records here.
CREATE SCHEMA unipathway_certificate_status;
REVOKE ALL ON SCHEMA unipathway_certificate_status FROM PUBLIC;
GRANT USAGE ON SCHEMA unipathway_certificate_status TO anon,authenticated;

CREATE FUNCTION unipathway_certificate_status.lookup(p_number text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.certificate_verifications%ROWTYPE; n text; today date; result text;
BEGIN
 n:=upper(btrim(p_number));today:=(now() AT TIME ZONE 'UTC')::date;
 IF n IS NULL OR n!~'^[A-Z0-9][A-Z0-9._/-]{2,79}$' THEN RAISE EXCEPTION 'Enter a valid certificate reference' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.certificate_verifications WHERE certificate_number=n;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('certificate_number',n,'status','not_found','checked_on',today);
 END IF;
 IF c.tenant_id IS NULL OR c.issue_date>today OR (c.expiry_date IS NOT NULL AND c.expiry_date<c.issue_date) THEN result:='review_required';
 ELSIF c.status='revoked' THEN result:='revoked';
 ELSIF c.status='expired' OR (c.expiry_date IS NOT NULL AND c.expiry_date<today) THEN result:='expired';
 ELSIF c.status='valid' THEN result:='valid';
 ELSE result:='review_required';
 END IF;
 RETURN jsonb_build_object('certificate_number',n,'status',result,'checked_on',today);
END $$;
REVOKE ALL ON FUNCTION unipathway_certificate_status.lookup(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION unipathway_certificate_status.lookup(text) TO anon,authenticated;
CREATE FUNCTION public.verify_unipathway_certificate_status(p_number text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT unipathway_certificate_status.lookup(p_number)$$;
REVOKE ALL ON FUNCTION public.verify_unipathway_certificate_status(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_unipathway_certificate_status(text) TO anon,authenticated;

-- Remove the old unrestricted full-row public RPC; retain staff table permissions and existing RLS.
DO $$
BEGIN
 IF to_regprocedure('public.verify_certificate(text)') IS NOT NULL THEN
  EXECUTE 'REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC,anon,authenticated';
 END IF;
END $$;
ALTER TABLE public.certificate_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.certificate_verifications FROM PUBLIC,anon;
NOTIFY pgrst,'reload schema';
