
-- Make anon policy more restrictive: only allow cookie_consent type
DROP POLICY IF EXISTS "Anon insert consent" ON public.consent_records;
CREATE POLICY "Anon insert cookie consent"
  ON public.consent_records FOR INSERT
  TO anon
  WITH CHECK (consent_type = 'cookie_consent');
