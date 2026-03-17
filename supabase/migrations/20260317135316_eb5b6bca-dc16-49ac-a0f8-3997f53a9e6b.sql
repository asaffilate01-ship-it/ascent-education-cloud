
-- FIX: Hide correct answers from students by using a secure view
DROP POLICY IF EXISTS "Students view questions for published quizzes" ON public.quiz_questions;
CREATE POLICY "Students view questions for published quizzes" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM quizzes q WHERE q.id = quiz_id AND q.status = 'published' AND q.tenant_id = get_user_tenant_id(auth.uid()))
    AND (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader')
      OR EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.quiz_id = quiz_questions.quiz_id AND a.student_id = auth.uid() AND a.completed_at IS NOT NULL)));

-- Create a student-safe view that hides correct_answer during active attempts
CREATE OR REPLACE VIEW public.quiz_questions_student
WITH (security_invoker = true)
AS SELECT id, quiz_id, question_text, question_type, options, points, sort_order, created_at
FROM public.quiz_questions;

-- FIX: Applications - students can only see own apps
DROP POLICY IF EXISTS "Tenant staff can view applications" ON public.applications;
CREATE POLICY "Staff view tenant applications" ON public.applications
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'admissions_admin') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'marketing_officer')))
    OR agent_id = auth.uid()
    OR user_id = auth.uid()
  );

-- FIX: Invoices - students can only see own invoices
DROP POLICY IF EXISTS "Tenant staff can view invoices" ON public.invoices;
CREATE POLICY "Staff view tenant invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'finance_officer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'superadmin')))
    OR student_id = auth.uid()
  );

-- FIX: Attendance - students can only see own records
DROP POLICY IF EXISTS "Tenant staff can view attendance" ON public.attendance_records;
CREATE POLICY "Staff view tenant attendance" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid()) AND (has_role(auth.uid(), 'lecturer') OR has_role(auth.uid(), 'centre_director') OR has_role(auth.uid(), 'programme_leader') OR has_role(auth.uid(), 'superadmin')))
    OR student_id = auth.uid()
  );

-- FIX: Tenants - restrict revenue visibility to superadmins
DROP POLICY IF EXISTS "Authenticated users view active tenants" ON public.tenants;
CREATE POLICY "Staff view tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin')
    OR (status = 'active' AND id = get_user_tenant_id(auth.uid()))
  );
