-- Phase 5: durable abuse protection for UniPathway public education enquiries.
-- Stores an HMAC-like peppered SHA-256 digest of a normalized email, never raw email or IP.
-- One atomic write per accepted CAPTCHA, across all Supabase Edge Function instances.
CREATE TABLE public.unipathway_enquiry_quotas (
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 bucket_start timestamptz NOT NULL,
 hits integer NOT NULL DEFAULT 1 CHECK(hits BETWEEN 1 AND 1000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(digest,bucket_start)
);
CREATE INDEX unipathway_enquiry_quotas_cleanup ON public.unipathway_enquiry_quotas(bucket_start);
ALTER TABLE public.unipathway_enquiry_quotas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.unipathway_enquiry_quotas FROM PUBLIC,anon,authenticated;

-- Can only be called using the Edge Function's server-side service role.
-- No browser / anonymous RPC access, no reads to clients and no PII in the table.
CREATE FUNCTION public.consume_unipathway_enquiry_quota(
 p_digest text, p_limit integer DEFAULT 4
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE count_after integer;
 bucket timestamptz;
BEGIN
 IF p_digest IS NULL OR p_digest !~ '^[a-f0-9]{64}$' OR p_limit NOT BETWEEN 1 AND 20 THEN
  RAISE EXCEPTION 'Invalid quota parameters' USING ERRCODE='22023';
 END IF;
 bucket := to_timestamp(floor(extract(epoch from clock_timestamp())/3600)*3600);
 INSERT INTO public.unipathway_enquiry_quotas(digest,bucket_start,hits)
 VALUES(p_digest,bucket,1)
 ON CONFLICT(digest,bucket_start) DO UPDATE
  SET hits=public.unipathway_enquiry_quotas.hits+1,updated_at=clock_timestamp()
 RETURNING hits INTO count_after;
 RETURN count_after <= p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_unipathway_enquiry_quota(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_unipathway_enquiry_quota(text,integer) TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.unipathway_enquiry_quotas TO service_role;
COMMENT ON TABLE public.unipathway_enquiry_quotas IS
 'Private, non-reversible peppered email digests. Rotate pepper and purge hourly buckets older than a fortnight.';
