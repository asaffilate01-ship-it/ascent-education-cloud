
-- Fix 1: Make quiz_questions_safe security invoker so RLS applies
ALTER VIEW public.quiz_questions_safe SET (security_invoker = true);

-- Fix 2: Make quiz_questions_student security invoker so RLS applies  
ALTER VIEW public.quiz_questions_student SET (security_invoker = true);

-- Fix 3: Tighten lab_screen_shares - separate policies for read vs write
DROP POLICY IF EXISTS "Lab participants manage screen shares" ON public.lab_screen_shares;

-- Anyone in tenant can view screen shares
CREATE POLICY "Tenant users view screen shares"
ON public.lab_screen_shares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lab_sessions ls
    WHERE ls.id = lab_screen_shares.lab_session_id
    AND ls.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- Users can only insert their own screen shares
CREATE POLICY "Users insert own screen shares"
ON public.lab_screen_shares
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM lab_sessions ls
    WHERE ls.id = lab_screen_shares.lab_session_id
    AND ls.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- Users can only update their own screen shares
CREATE POLICY "Users update own screen shares"
ON public.lab_screen_shares
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can only delete their own screen shares, or lecturers can delete any in their tenant
CREATE POLICY "Users delete own screen shares"
ON public.lab_screen_shares
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (has_role(auth.uid(), 'lecturer') AND EXISTS (
    SELECT 1 FROM lab_sessions ls
    WHERE ls.id = lab_screen_shares.lab_session_id
    AND ls.tenant_id = get_user_tenant_id(auth.uid())
  ))
);

-- Fix 4: Restrict certificate verification public access to lookup by certificate_number only
DROP POLICY IF EXISTS "Anyone can verify certificates" ON public.certificate_verifications;

CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS SETOF public.certificate_verifications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT * FROM public.certificate_verifications
  WHERE certificate_number = _cert_number
  LIMIT 1;
$$;
