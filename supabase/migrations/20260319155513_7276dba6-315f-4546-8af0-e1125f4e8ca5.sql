
-- Fix 1: Recreate views with SECURITY INVOKER so caller's RLS is applied
DROP VIEW IF EXISTS public.quiz_questions_safe;
CREATE VIEW public.quiz_questions_safe
WITH (security_invoker = true)
AS
SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, qq.points, qq.sort_order, qq.created_at
FROM quiz_questions qq
JOIN quizzes q ON q.id = qq.quiz_id
WHERE q.tenant_id = get_user_tenant_id(auth.uid());

DROP VIEW IF EXISTS public.quiz_questions_student;
CREATE VIEW public.quiz_questions_student
WITH (security_invoker = true)
AS
SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, qq.points, qq.sort_order, qq.created_at
FROM quiz_questions qq
JOIN quizzes q ON q.id = qq.quiz_id
WHERE q.tenant_id = get_user_tenant_id(auth.uid());

DROP VIEW IF EXISTS public.transport_vehicles_student;
CREATE VIEW public.transport_vehicles_student
WITH (security_invoker = true)
AS
SELECT id, tenant_id, vehicle_number, vehicle_type, capacity, status, created_at
FROM transport_vehicles
WHERE tenant_id = get_user_tenant_id(auth.uid());

-- Fix 2: Tighten INSERT policies on submissions, residential_bookings, quiz_attempts
-- submissions: add tenant_id check
DROP POLICY IF EXISTS "Students insert own submissions" ON public.submissions;
CREATE POLICY "Students insert own submissions"
ON public.submissions FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- residential_bookings: add tenant_id check
DROP POLICY IF EXISTS "Students book residential weeks" ON public.residential_bookings;
CREATE POLICY "Students book residential weeks"
ON public.residential_bookings FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- quiz_attempts: add tenant_id check
DROP POLICY IF EXISTS "Students insert own attempts" ON public.quiz_attempts;
CREATE POLICY "Students insert own attempts"
ON public.quiz_attempts FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));

-- Fix 3: Restrict user_roles self-assign to include tenant_id
DROP POLICY IF EXISTS "Users can self-assign student role" ON public.user_roles;
CREATE POLICY "Users can self-assign student role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'student'
  AND tenant_id = get_user_tenant_id(auth.uid())
);
