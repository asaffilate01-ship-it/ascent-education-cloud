
-- Must DROP and recreate to remove columns from a view
DROP VIEW IF EXISTS public.quiz_questions_safe;

CREATE VIEW public.quiz_questions_safe
WITH (security_invoker = true)
AS
SELECT id, quiz_id, question_text, question_type, options, points, sort_order, created_at
FROM public.quiz_questions;
