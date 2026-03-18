
-- FIX 1: Recreate quiz views with security_invoker and tenant scoping via quizzes join

DROP VIEW IF EXISTS public.quiz_questions_safe;
CREATE OR REPLACE VIEW public.quiz_questions_safe
WITH (security_invoker = true) AS
SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, qq.points, qq.sort_order, qq.created_at
FROM public.quiz_questions qq
JOIN public.quizzes q ON q.id = qq.quiz_id
WHERE q.tenant_id = get_user_tenant_id(auth.uid());

DROP VIEW IF EXISTS public.quiz_questions_student;
CREATE OR REPLACE VIEW public.quiz_questions_student
WITH (security_invoker = true) AS
SELECT qq.id, qq.quiz_id, qq.question_text, qq.question_type, qq.options, qq.points, qq.sort_order, qq.created_at
FROM public.quiz_questions qq
JOIN public.quizzes q ON q.id = qq.quiz_id
WHERE q.tenant_id = get_user_tenant_id(auth.uid());

-- FIX 2: transport_vehicles_student (no driver PII/GPS)
DROP VIEW IF EXISTS public.transport_vehicles_student;
CREATE OR REPLACE VIEW public.transport_vehicles_student
WITH (security_invoker = true) AS
SELECT id, tenant_id, vehicle_number, vehicle_type, capacity, status, created_at
FROM public.transport_vehicles
WHERE tenant_id = get_user_tenant_id(auth.uid());

-- FIX 3: KYC documents INSERT tenant scoping
DROP POLICY IF EXISTS "Users can upload own documents" ON public.kyc_documents;
CREATE POLICY "Users can upload own documents"
  ON public.kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid())));
