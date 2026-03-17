
-- =============================================================
-- CRITICAL SECURITY FIX: Cross-tenant escalation via profiles
-- Lock down tenant_id in UPDATE policy to be immutable
-- =============================================================

-- Drop the existing overly permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate: users can update own profile BUT cannot change tenant_id
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND (
  -- tenant_id must remain unchanged (compare with current row)
  tenant_id IS NOT DISTINCT FROM (SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid())
));

-- =============================================================
-- FIX: Quiz answers exposed to students
-- Replace student SELECT policy to exclude correct_answer
-- =============================================================

DROP POLICY IF EXISTS "Students view questions for published quizzes" ON public.quiz_questions;

-- Students must use the quiz_questions_student VIEW (which omits correct_answer)
-- Only staff roles can see the full quiz_questions table
CREATE POLICY "Staff view questions for published quizzes"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND q.tenant_id = get_user_tenant_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'lecturer'::app_role) OR
    has_role(auth.uid(), 'centre_director'::app_role) OR
    has_role(auth.uid(), 'programme_leader'::app_role) OR
    has_role(auth.uid(), 'iqa_officer'::app_role)
  )
);

-- Grant students SELECT on the safe view only (no correct_answer column)
-- They already have access via quiz_questions_student view
-- No direct table access for students anymore

-- =============================================================
-- FIX: Partner universities commission exposure
-- Remove public/anon SELECT, restrict to admin roles
-- =============================================================

DROP POLICY IF EXISTS "Anyone can view active partner universities" ON public.partner_universities;
DROP POLICY IF EXISTS "Anon view active partner universities" ON public.partner_universities;

-- Public users see the safe view (partner_universities_public) instead
CREATE POLICY "Authenticated users view public partner data"
ON public.partner_universities
FOR SELECT
TO authenticated
USING (
  status = 'active' AND (
    -- Only privileged roles see full row (including commission)
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'centre_director'::app_role) OR
    has_role(auth.uid(), 'finance_officer'::app_role) OR
    has_role(auth.uid(), 'agent'::app_role)
  )
);

-- Students/others should use partner_universities_public view
CREATE POLICY "All authenticated view active partners basic info"
ON public.partner_universities
FOR SELECT
TO authenticated
USING (status = 'active');

-- Actually we need column-level security which Postgres doesn't support via RLS
-- So let's drop the broad policy and only keep the privileged one
-- Students will use the partner_universities_public view
DROP POLICY IF EXISTS "All authenticated view active partners basic info" ON public.partner_universities;

-- =============================================================
-- FIX: User presence cross-tenant exposure
-- =============================================================

DROP POLICY IF EXISTS "Anyone authenticated can view presence" ON public.user_presence;

CREATE POLICY "Users view tenant presence"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_presence.user_id
      AND p.tenant_id = get_user_tenant_id(auth.uid())
  )
  OR user_id = auth.uid()
);

-- =============================================================
-- FIX: Tenants table monthly_revenue exposure
-- Only admins should see full tenant data; others use tenants_public view
-- =============================================================

DROP POLICY IF EXISTS "Staff view tenants" ON public.tenants;

CREATE POLICY "Admin staff view full tenant data"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  id = get_user_tenant_id(auth.uid()) AND (
    has_role(auth.uid(), 'superadmin'::app_role) OR
    has_role(auth.uid(), 'centre_director'::app_role) OR
    has_role(auth.uid(), 'finance_officer'::app_role)
  )
);

-- Superadmins can view all tenants
CREATE POLICY "Superadmins view all tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));
