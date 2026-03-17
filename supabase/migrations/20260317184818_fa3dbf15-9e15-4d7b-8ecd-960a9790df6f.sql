
-- Fix the security definer view warning by using security invoker
DROP VIEW IF EXISTS public.quiz_questions_safe;

CREATE VIEW public.quiz_questions_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  quiz_id,
  question_text,
  question_type,
  options,
  points,
  explanation,
  sort_order,
  created_at,
  CASE 
    WHEN has_role(auth.uid(), 'lecturer') 
      OR has_role(auth.uid(), 'centre_director') 
      OR has_role(auth.uid(), 'programme_leader')
      OR has_role(auth.uid(), 'iqa_officer')
    THEN correct_answer
    ELSE NULL
  END AS correct_answer
FROM public.quiz_questions;
