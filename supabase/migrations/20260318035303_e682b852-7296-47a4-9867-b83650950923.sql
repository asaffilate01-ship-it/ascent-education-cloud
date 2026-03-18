
-- 1. Drop the overly permissive student policy on transport_vehicles
DROP POLICY IF EXISTS "Students view vehicles basic" ON public.transport_vehicles;

-- 2. Add RLS policies to quiz question views (they are views with security_invoker)
-- Since quiz_questions_safe and quiz_questions_student are views, they inherit RLS from base table.
-- But we need to ensure the base quiz_questions table has proper RLS.
-- Let's verify and add a student-safe policy on quiz_questions via the safe view approach.

-- 3. Fix: generate-certificate needs role check (handled in edge function code)
-- 4. Fix: export-report tenant isolation (handled in edge function code)
-- 5. Fix: aws-lab-manager tenant verification (handled in edge function code)
