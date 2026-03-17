
-- Fix 1: Create a secure view for quiz questions that hides correct_answer from students
CREATE OR REPLACE VIEW public.quiz_questions_safe AS
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

-- Fix 2: Fix quiz_questions RLS - students should see questions for quizzes they're actively taking
DROP POLICY IF EXISTS "Students view questions for published quizzes" ON public.quiz_questions;

CREATE POLICY "Students view questions for published quizzes"
ON public.quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_questions.quiz_id
      AND q.status = 'published'
      AND q.tenant_id = get_user_tenant_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'lecturer')
    OR has_role(auth.uid(), 'centre_director')
    OR has_role(auth.uid(), 'programme_leader')
    OR has_role(auth.uid(), 'iqa_officer')
    OR has_role(auth.uid(), 'student')
  )
);
