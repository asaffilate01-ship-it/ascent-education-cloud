-- UniPathway -> STEMCoach centre link. No auto-SSO or entitlement grant.
-- Insert/verification is a platform-operator action performed only after
-- independent proof that the UniPathway centre and STEMCoach tenant match.
CREATE TABLE IF NOT EXISTS public.stemcoach_centre_links (
  tenant_id uuid PRIMARY KEY,
  stemcoach_slug text NOT NULL
    CHECK (stemcoach_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(stemcoach_slug) BETWEEN 3 AND 40),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','disabled')),
  verified_at timestamptz,
  verification_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT centre_verified_requires_evidence CHECK (
    status <> 'verified' OR (verified_at IS NOT NULL AND nullif(btrim(verification_ref), '') IS NOT NULL)
  )
);
ALTER TABLE public.stemcoach_centre_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stemcoach_centre_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stemcoach_centre_links TO service_role;

-- A verified, currently enrolled student may get ONLY the public institution
-- slug. Neither a URL parameter nor an unverified profile can activate access.
CREATE OR REPLACE FUNCTION public.get_my_stemcoach_centre_link()
RETURNS TABLE(stemcoach_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT link.stemcoach_slug
  FROM public.stemcoach_centre_links link
  JOIN public.profiles profile
    ON profile.tenant_id = link.tenant_id AND profile.user_id = auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND link.status = 'verified'
    AND link.verified_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.student_enrolments enrolled
      WHERE enrolled.tenant_id = link.tenant_id
        AND enrolled.student_id = auth.uid()
        AND enrolled.status = 'active'
    )
  ORDER BY link.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_stemcoach_centre_link() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stemcoach_centre_link() TO authenticated;
